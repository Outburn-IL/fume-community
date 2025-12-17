/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { FhirClient } from '@outburn/fhir-client';
import cors from 'cors';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import express from 'express';
import type { Server } from 'http';

import type { IAppCacheKeys } from './cache';
import { FumeEngine } from './engine';
import { createHttpRouter } from './http';
import defaultConfig from './serverConfig';
import type {
  IAppBinding,
  ICacheClass,
  IConfig,
  IFumeServer,
  Logger} from './types';

export class FumeServer<ConfigType extends IConfig> implements IFumeServer<ConfigType> {
  private readonly app: express.Application;
  private server?: Server;
  private readonly engine: FumeEngine<ConfigType>;

  // default app middleware does nothing - just calls next
  private appMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    next();
  };

  constructor () {
    this.engine = new FumeEngine<ConfigType>();
    this.app = express();
    // Make engine available to route handlers (no module-level state)
    this.app.locals.engine = this.engine;
    this.app.use(express.urlencoded({ extended: true, limit: '400mb' }));
    this.app.use(express.json({ limit: '400mb', type: ['application/json', 'application/fhir+json'] }));
    this.app.use(express.text({ limit: '400mb', type: ['text/plain', 'application/vnd.outburn.fume', 'x-application/hl7-v2+er7', 'text/csv', 'application/xml'] }));
    this.app.use(cors());
  }

  public async shutDown (): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server?.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
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
    const options = (serverOptions ?? defaultConfig) as ConfigType;
    await this.engine.warmUp(options);
    const { SERVER_PORT } = this.engine.getConfig();

    // mount middleware on application level
    // all requests will pass through this function
    this.app.use(this.appMiddleware);

    // mount routes handler
    const http = createHttpRouter();
    this.app.use('/', http.routes);

    // catch any routes that are not found
    // This allows consumers to extend the server with their own routes
    // and still have a default 404 handler
    this.app.use(http.notFound);

    this.server = this.app.listen(SERVER_PORT);
    this.engine.getLogger().info(`FUME server is running on port ${SERVER_PORT}`);
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
    this.engine.getLogger().info('Registered application middleware...');
  }

  /**
   * Register a logger to replace the default logger
   * @param logger
   */
  public registerLogger (logger: Logger) {
    this.engine.registerLogger(logger);
  }

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
    this.engine.registerCacheClass(CacheClass, cacheClassOptions, applyToCaches);
  }

  /**
   * Pass a FHIR client instance to be used by the server
   * @param fhirClient
   */
  public registerFhirClient (fhirClient: FhirClient) {
    this.engine.registerFhirClient(fhirClient);
  }

  /**
   * @returns fhir client
   */
  public getFhirClient () {
    return this.engine.getFhirClient();
  }

  /**
   *
   * @returns cache
   */
  public getCache () {
    return this.engine.getCache();
  }

  /**
   *
   * @returns config
   */
  public getConfig () {
    return this.engine.getConfig();
  }

  /**
     * Register additional bindings for `transform` function
     * @param key
     * @param binding
     */
  public registerBinding (key: string, binding: IAppBinding) {
    this.engine.registerBinding(key, binding);
  }

  /**
   * Calls transform with any additional bindings passed using `registerBinding`
   * @param input
   * @param expression
   * @returns
   */
  public async transform (input: unknown, expression: string, bindings: Record<string, IAppBinding> = {}) {
    return await this.engine.transform(input, expression, bindings);
  }
}
