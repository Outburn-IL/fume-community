/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import cors from 'cors';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import express from 'express';
import type { Server } from 'http';

import { FumeEngine } from './engine';
import { createHttpRouter } from './http';
import defaultConfig from './serverConfig';
import type {
  IConfig,
  IFumeEngine,
  IFumeServer} from './types';

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
    const requestBodyLimit = defaultConfig.SERVER_REQUEST_BODY_LIMIT;
    this.app.use(express.urlencoded({ extended: true, limit: requestBodyLimit }));
    this.app.use(express.json({ limit: requestBodyLimit, type: ['application/json', 'application/fhir+json', 'application/json+fhir', 'text/json'] }));
    this.app.use(express.text({ limit: requestBodyLimit, type: ['text/plain', 'application/vnd.outburn.fume', 'x-application/hl7-v2+er7', 'text/csv', 'application/xml', 'application/fhir+xml', 'application/xml+fhir'] }));
    this.app.use(cors());

    // Mount a stable wrapper so any middleware registered via registerAppMiddleware
    // will run for ALL routes (including those registered by downstream consumers).
    this.app.use((req: Request, res: Response, next: NextFunction) => this.appMiddleware(req, res, next));
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
    * i.e. configuring the engine (logger/cache/bindings) and adding express routes.
   * @param serverOptions
   */
  public async warmUp (serverOptions?: ConfigType | undefined): Promise<void> {
    const options = (serverOptions ?? defaultConfig) as ConfigType;
    await this.engine.warmUp(options);
    const { SERVER_PORT } = this.engine.getConfig();

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
   * Access the underlying, transport-agnostic engine.
   * Downstream projects should use this instead of server-level proxy methods.
   */
  public getEngine (): IFumeEngine<ConfigType> {
    return this.engine;
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
}
