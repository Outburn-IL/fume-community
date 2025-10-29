/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import cors from 'cors';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import express from 'express';
import type { Server } from 'http';

import config from './config';
import { fumeFhirPackageId } from './constants';
import { getCache, IAppCacheKeys, initCache, InitCacheConfig } from './helpers/cache';
import * as conformance from './helpers/conformance';
import { FhirClient, setFhirClient } from './helpers/fhirServer';
import { transform } from './helpers/jsonataFunctions';
import { getLogger, setLogger } from './helpers/logger';
import { notFound, routes } from './routes';
import defaultConfig from './serverConfig';
import type {
  IAppBinding,
  ICacheClass,
  IConfig,
  IFhirClient,
  IFumeServer,
  ILogger
} from './types';

export class FumeServer<ConfigType extends IConfig> implements IFumeServer<ConfigType> {
  private readonly app: express.Application;
  private server?: Server;
  /**
   * FHIR client instance
   * Used to communicate with FHIR server
   * Can be overriden by calling
   */
  private fhirClient?: IFhirClient;
  /**
   * Cache configuration
   * Allows to register custom cache classes and options
   */
  private cacheConfig: Partial<Record<IAppCacheKeys, InitCacheConfig>> = {};
  private logger = getLogger();

  // default app middleware does nothing - just calls next
  private appMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    next();
  };

  constructor () {
    this.app = express();
    this.app.use(express.urlencoded({ extended: true, limit: '400mb' }));
    this.app.use(express.json({ limit: '400mb', type: ['application/json', 'application/fhir+json'] }));
    this.app.use(express.text({ limit: '400mb', type: ['text/plain', 'application/vnd.outburn.fume', 'x-application/hl7-v2+er7', 'text/csv', 'application/xml'] }));
    this.app.use(cors());
  }

  public async shutDown (): Promise<void> {
    if (this.server) {
      this.server.close(() => {
        console.log('server closed');
        process.exit(0);
      });
    }
  }

  /**
   * Start the server
   * Any extensions to the server should be done before calling this method
   * i.e. registering alternative logger, cache class, fhir client and express routes.
   * @param serverOptions
   */
  public async warmUp (serverOptions?: ConfigType | undefined): Promise<void> {
    const options = serverOptions ?? defaultConfig;
    this.logger.info('FUME initializing...');
    config.setServerConfig(options);
    const serverConfig: IConfig = config.getServerConfig();
    const { SERVER_PORT, FHIR_SERVER_BASE, FHIR_VERSION, FHIR_PACKAGES, SEARCH_BUNDLE_PAGE_SIZE, FHIR_SERVER_TIMEOUT, SERVER_STATELESS } = serverConfig;
    this.logger.info(serverConfig);

    // initialize caches
    initCache(this.cacheConfig);
    this.logger.info('Caches initialized');

    this.logger.info(`Default FHIR version is set to ${FHIR_VERSION}`);
    // translate fhir version to package id
    const fhirVersionCorePackageId = config.getFhirCorePackage();
    // download package or throw error
    if (fhirVersionCorePackageId) {
      const loadRes = await conformance.downloadPackages([fhirVersionCorePackageId]);
      if (!loadRes) {
        throw new Error(`Errors loading package for FHIR version ${FHIR_VERSION}`);
      }
    } else {
      throw new Error(`FHIR version ${FHIR_VERSION} is unsupported/invalid!`);
    };
    // load packages
    const packageList: string[] = [fumeFhirPackageId, ...(FHIR_PACKAGES ? FHIR_PACKAGES.split(',') : [])];
    await conformance.downloadPackages(packageList);

    // load index of all packages found in global fhir cache (on disk)
    await conformance.loadFhirPackageIndex();
    // if fhir server defined, load mappings and aliases from it
    if (SERVER_STATELESS) {
      this.logger.info('Running in stateless mode');
    } else {
      this.logger.info(`Bundle search size: ${SEARCH_BUNDLE_PAGE_SIZE}`);
      this.logger.info(`FHIR Server Timeout: ${FHIR_SERVER_TIMEOUT}`);
      this.logger.info(`Loading FUME resources from FHIR server ${FHIR_SERVER_BASE} into cache...`);

      if (!this.fhirClient) {
        this.registerFhirClient(new FhirClient());
      }

      const recacheResult = await conformance.recacheFromServer();
      if (recacheResult) {
        this.logger.info('Successfully loaded cache');
      }
    };

    // mount middleware on application level
    // all requests will pass through this function
    this.app.use(this.appMiddleware);

    // mount routes handler
    // if the middleware calls next(), the request handling will proceed here
    this.app.use('/', routes);

    // catch any routes that are not found
    // This allows consumers to extend the server with their own routes
    // and still have a default 404 handler
    this.app.use(notFound);

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
   * Register application level middleware to intercept all requests
   * @param middleware
   */
  public registerAppMiddleware (middleware: RequestHandler) {
    this.appMiddleware = middleware;
    this.logger.info('Registered application middleware...');
  };

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
  public registerCacheClass (
    CacheClass: ICacheClass,
    cacheClassOptions: Record<string, IAppBinding>,
    applyToCaches: IAppCacheKeys[]
  ) {
    if (applyToCaches.length > 0) {
      applyToCaches.forEach(cacheKey => {
        this.cacheConfig[cacheKey] = { cacheClass: CacheClass, cacheClassOptions };
      });
    } else {
      this.logger.warn('No cache keys provided to apply cache class to');
    }
  };

  /**
   * Pass a FHIR client instance to be used by the server
   * @param fhirClient
   */
  public registerFhirClient (fhirClient: IFhirClient) {
    this.fhirClient = fhirClient;
    setFhirClient(fhirClient);
  }

  /**
   * @returns fhir client
   */
  public getFhirClient () {
    if (!this.fhirClient) {
      throw new Error('FHIR client not registered');
    }
    return this.fhirClient;
  }

  /**
   *
   * @returns cache
   */
  public getCache () {
    return getCache();
  }

  /**
   *
   * @returns config
   */
  public getConfig () {
    return config.getServerConfig() as ConfigType;
  }

  /**
     * Register additional bindings for `transform` function
     * @param key
     * @param binding
     */
  public registerBinding (key: string, binding: IAppBinding) {
    config.setBinding(key, binding);
  }

  /**
   *
   * @returns fhir package index
   */
  public getFhirPackageIndex () {
    return conformance.getFhirPackageIndex();
  }

  /**
   *
   * @returns fhir packages for the version set in config
   */
  public getFhirPackages () {
    const fhirVersionMinor = config.getFhirVersionMinor();
    const packages = conformance.getFhirPackageIndex();
    return packages[fhirVersionMinor];
  }

  /**
   * Calls transform with any additional bindings passed using `registerBinding`
   * @param input
   * @param expression
   * @returns
   */
  public async transform (input: any, expression: string, bindings: Record<string, IAppBinding> = {}) {
    return await transform(input, expression, { ...config.getBindings(), ...bindings });
  }
}
