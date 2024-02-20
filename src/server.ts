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
import type { IFumeServer, ILogger, IConfig, ICacheClass, IAppBinding } from './types';
import { getCache, initCache, SimpleCache } from './helpers/cache';

export class FumeServer implements IFumeServer {
  private readonly app: express.Application;
  private server: Server | undefined;
  private cacheClass: ICacheClass = SimpleCache;
  private cacheClassOptions: Record<string, any> = {};
  private logger = getLogger();

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

  public async warmUp (serverOptions: IConfig | undefined = undefined): Promise<void> {
    const options: IConfig = serverOptions ?? defaultConfig;
    this.logger.info('FUME initializing...');
    config.setServerConfig(options);
    const serverConfig: IConfig = config.getServerConfig();
    const { SERVER_PORT, FHIR_SERVER_BASE, FHIR_VERSION, EXCLUDE_FHIR_PACKAGES, FHIR_PACKAGES, SEARCH_BUNDLE_PAGE_SIZE, FHIR_SERVER_TIMEOUT, SERVER_STATELESS } = serverConfig;
    this.logger.info(serverConfig);

    // initialize caches
    initCache(this.cacheClass, this.cacheClassOptions);
    this.logger.info('Caches initialized');

    this.logger.info(`Default FHIR version is set to ${FHIR_VERSION}`);
    // translate fhir version to package id
    const fhirVersionCorePackageId = fhirCorePackages[FHIR_VERSION];
    // load package or throw error
    if (fhirVersionCorePackageId) {
      const loadRes = await conformance.loadPackage(fhirVersionCorePackageId);
      if (loadRes && loadRes?.errors?.length > 0) {
        throw new Error(`Errors loading package for FHIR version ${FHIR_VERSION}: ${loadRes.errors.join(', ')}`);
      }
    } else {
      throw new Error(`FHIR version ${FHIR_VERSION} is unsupported/invalid!`);
    };
    // load additional packages, if defined
    if (FHIR_PACKAGES.trim() !== '') {
      await conformance.loadPackages(FHIR_PACKAGES.split(','), FHIR_PACKAGES.split(','), EXCLUDE_FHIR_PACKAGES.split(','));
    };

    // load index of all packages found in global fhir cache (on disk)
    await conformance.loadFhirPackageIndex();
    // if fhir server defined, load mappings and aliases from it
    if (SERVER_STATELESS) {
      this.logger.info('Running in stateless mode');
    } else {
      this.logger.info(`Bundle search size: ${SEARCH_BUNDLE_PAGE_SIZE}`);
      this.logger.info(`FHIR Server Timeout: ${FHIR_SERVER_TIMEOUT}`);
      this.logger.info(`Loading FUME resources from FHIR server ${FHIR_SERVER_BASE} into cache...`);
      client.init();
      conformance.recacheFromServer().then(_result => {
        this.logger.info('Successfully loaded cache');
      }).catch(_notFound => {
        this.logger.info('Error loading cache');
      });
    };

    this.server = this.app.listen(SERVER_PORT);
    this.logger.info(`FUME server is running on port ${SERVER_PORT}`);
  }

  /**
     * @returns express application
     */
  public getExpressApp () {
    return this.app;
  }

  /**
     * Register a logger to replace the default logger
     * @param logger
     */
  public registerLogger (logger: ILogger) {
    this.logger = logger;
    setLogger(logger);
  };

  /**
   * Register a class to replace the default cache class
   * Cache itself is initialized during warm up
   * @param CacheClass
   * @param options
   */
  public registerCacheClass (CacheClass: ICacheClass, options: Record<string, IAppBinding>) {
    this.cacheClass = CacheClass;
    this.cacheClassOptions = options;
  };

  /**
   *
   * @returns cache
   */
  public getCache () {
    return getCache();
  }

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
  public registerBinding (key: string, binding: IAppBinding) {
    config.setBinding(key, binding);
  }
}
