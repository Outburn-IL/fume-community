import express from 'express';
import cors from 'cors';
import defaultConfig from './serverConfig';
import config from './config';
import routes from './routes';
import { getLogger, setLogger } from './helpers/logger';
import conformance from './helpers/conformance';
import { transform } from './helpers/jsonataFunctions';

import type { Server } from 'http';
import type {
  IFumeServer,
  ILogger,
  IConfig,
  ICacheClass,
  IAppBinding,
  IFhirClient
} from './types';
import { getCache, IAppCacheKeys, initCache, InitCacheConfig } from './helpers/cache';
import { FhirClient, setFhirClient } from './helpers/fhirServer';

export class FumeServer implements IFumeServer {
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
    initCache(this.cacheConfig);
    this.logger.info('Caches initialized');

    this.logger.info(`Default FHIR version is set to ${FHIR_VERSION}`);
    // translate fhir version to package id
    const fhirVersionCorePackageId = config.getFhirCorePackage();
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

      if (!this.fhirClient) {
        this.registerFhirClient(new FhirClient());
      }

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
  public async transform (input: any, expression: string) {
    return await transform(input, expression, config.getBindings());
  }
}
