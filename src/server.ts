/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import cors from 'cors';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import express from 'express';
import type { Server } from 'http';

import config from './config';
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
    const { SERVER_PORT, FHIR_SERVER_BASE, FHIR_VERSION, SEARCH_BUNDLE_PAGE_SIZE, FHIR_SERVER_TIMEOUT, SERVER_STATELESS, FHIR_PACKAGE_CACHE_DIR, FHIR_PACKAGE_REGISTRY_URL, FHIR_PACKAGE_REGISTRY_TOKEN } = serverConfig;
    this.logger.info(serverConfig);

    // initialize caches
    initCache(this.cacheConfig);
    this.logger.info('Caches initialized');

    // initialize global FHIR context for fumifier
    await this.initializeGlobalFhirContext();
    this.logger.info('Global FHIR context initialized');

    this.logger.info(`Default FHIR version is set to ${FHIR_VERSION}`);
    if (FHIR_PACKAGE_CACHE_DIR) {
      this.logger.info(`FHIR package cache directory set to ${FHIR_PACKAGE_CACHE_DIR}`);
    }
    if (FHIR_PACKAGE_REGISTRY_URL) {
      this.logger.info(`FHIR package registry URL set to ${FHIR_PACKAGE_REGISTRY_URL}`);
      if (FHIR_PACKAGE_REGISTRY_TOKEN) {
        this.logger.info('FHIR package registry token is set');
      }
    }

    // if fhir server defined, load mappings and aliases from it
    if (SERVER_STATELESS) {
      this.logger.info('Running in stateless mode');
    } else {
      this.logger.info(`Search Bundle page size: ${SEARCH_BUNDLE_PAGE_SIZE}`);
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
   * Calls transform with any additional bindings passed using `registerBinding`
   * @param input
   * @param expression
   * @returns
   */
  public async transform (input: any, expression: string, bindings: Record<string, IAppBinding> = {}) {
    return await transform(input, expression, { ...config.getBindings(), ...bindings });
  }

  /**
   * Initialize global FHIR context with navigator and normalized packages
   * This should be called during warmup to set up fumifier context
   * @private
   */
  private async initializeGlobalFhirContext () {
    const { FhirStructureNavigator } = await import('@outburn/structure-navigator');
    const { FhirSnapshotGenerator } = await import('fhir-snapshot-generator');

    const serverConfig = config.getServerConfig();
    const { FHIR_VERSION, FHIR_PACKAGES, FHIR_PACKAGE_CACHE_DIR, FHIR_PACKAGE_REGISTRY_URL, FHIR_PACKAGE_REGISTRY_TOKEN /*, FHIR_PACKAGE_REGISTRY_ALLOW_HTTP */ } = serverConfig;

    // Parse FHIR_PACKAGES string into array
    const packageList: string[] = FHIR_PACKAGES ? FHIR_PACKAGES.split(',').map(pkg => pkg.trim()) : [];

    this.logger.info({
      packageContext: packageList,
      fhirVersion: FHIR_VERSION,
      cachePath: FHIR_PACKAGE_CACHE_DIR,
      registryUrl: FHIR_PACKAGE_REGISTRY_URL
    });

    const generator = await FhirSnapshotGenerator.create({
      context: packageList,
      cachePath: FHIR_PACKAGE_CACHE_DIR || '',
      fhirVersion: FHIR_VERSION as any,
      cacheMode: 'lazy',
      // logger: this.logger,
      registryUrl: FHIR_PACKAGE_REGISTRY_URL,
      registryToken: FHIR_PACKAGE_REGISTRY_TOKEN
    });

    const navigator = new FhirStructureNavigator(generator, this.logger);

    // Get normalized packages from the generator
    const normalizedPackageIds = generator.getFpe().getNormalizedRootPackages();
    const normalizedPackages = normalizedPackageIds.map(pkg => `${pkg.id}@${pkg.version}`);

    // Initialize the global config
    await config.initializeGlobalFhirContext(navigator, generator, normalizedPackages);
  }
}
