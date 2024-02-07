import express, { RequestHandler } from 'express';
import cors from 'cors';
import defaultConfig from './serverConfig';
import { fhirCorePackages } from './constants';
import config from './config';
import routes from './routes';
import { getLogger, setLogger } from './helpers/logger';
import conformance from './helpers/conformance';
import client from './helpers/client';

import type { Server } from 'http';
import type { IFumeServer, ILogger, ICache } from './types';

export class FumeServer implements IFumeServer {
  private readonly app: express.Application;
  private server: Server | undefined;

  constructor () {
    this.app = express();
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    this.app.use(express.json({ limit: '50mb', type: ['application/json', 'application/fhir+json'] }));
    this.app.use(express.text({ limit: '50mb', type: ['text/plain', 'application/vnd.outburn.fume', 'x-application/hl7-v2+er7', 'text/csv'] }));
    this.app.use(cors());
    this.app.use('/', routes);
  }

  public async shutDown (): Promise<void> {
    if (this.server) {
      this.server.close(() => {
        console.log('server closed');
        process.exit(0);
      });
    }
  }

  public async warmUp (serverOptions: any = undefined): Promise<void> {
    const options = serverOptions || defaultConfig;

    const logger = getLogger();

    logger.info(options);
    logger.info('FUME initializing...');

    // override default fhir version if provided
    if (typeof options?.fhirVersion === 'string') {
      config.setFhirVersion(options.fhirVersion);
    };

    logger.info(`Default FHIR version is set to ${config.getFhirVersion()}`);
    // translate fhir version to package id
    const fhirVersionCorePackageId = fhirCorePackages[config.getFhirVersion()];
    // load package or throw error
    if (fhirVersionCorePackageId !== undefined && fhirVersionCorePackageId !== null) {
      const loadRes = await conformance.loadPackage(fhirVersionCorePackageId);
      if (loadRes?.errors?.length > 0) {
        throw new Error(`Errors loading package for FHIR version ${config.getFhirVersion()}: ${loadRes.errors.join(', ')}`);
      }
    } else {
      throw new Error(`FHIR version ${config.getFhirVersion()} is unsupported/invalid!`);
    };
    // load additional packages, if defined
    if (typeof options?.fhirPackages !== 'undefined' && options?.fhirPackages !== '') {
      await conformance.loadPackage(options.fhirPackages);
    };

    // load index of all packages found in global fhir cache (on disk)
    await conformance.loadFhirCacheIndex();
    // if fhir server defined, load mappings and aliases from it
    if (options?.fhirServer !== undefined && options?.fhirServer !== null && typeof options.fhirServer === 'string' && options.fhirServer !== '') {
      config.setFhirServerBase(options.fhirServer);
      if (options?.searchBundleSize !== undefined && typeof options?.searchBundleSize === 'number') {
        logger.info(`Setting bundle search size: ${JSON.stringify(options.searchBundleSize)}`);
        config.setSearchBundleSize(options.searchBundleSize);
      };
      if (options?.fhirServerTimeout !== undefined && options?.fhirServerTimeout !== null && typeof options.fhirServerTimeout === 'number') {
        config.setFhirServerTimeout(options.fhirServerTimeout);
        logger.info({ fhirServerTimeout: config.getFhirServerTimeout() });
      };
      logger.info(`Loading FUME resources from FHIR server ${config.getFhirServerBase()} into cache...`);
      client.init();
      conformance.recacheFromServer().then(_result => {
        logger.info('Successfully loaded cache');
      }).catch(_notFound => {
        logger.info('Error loading cache');
      });
    } else {
      logger.info('Running in stateless mode');
      config.setFhirServerBase('');
    };

    this.server = this.app.listen(options.SERVER_PORT);
    logger.info(`FUME server is running on port ${options.SERVER_PORT}`);
  }

  /**
     * @returns express application
     */
  public getApp () {
    return this.app;
  }

  /**
     * Register a logger to replace the default logger
     * @param logger
     */
  public registerLogger (logger: ILogger) {
    setLogger(logger);
  };

  /**
     *
     * @param cache
     */
  public registerCache (cache: ICache) {
    throw new Error('Method not implemented.');
  };

  /**
     *
     * @param route - express path
     * @param handler - express request handler
     */
  public registerRoute (route: string, handler: RequestHandler) {
    this.app.use(route, handler);
  }

  /**
     *
     * @param key
     * @param binding
     */
  public registerBinding (key: string, binding: any) {
    config.setBinding(key, binding);
  }
}
