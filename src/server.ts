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
import { defaultConfig } from './serverConfig';
import type {
  FumeServerCreateOptions,
  IConfig,
  IFumeEngine,
  IFumeServer} from './types';
import { withPrefix } from './utils/logging';

export class FumeServer<ConfigType extends IConfig> implements IFumeServer<ConfigType> {
  private readonly app: express.Application;
  private server?: Server;
  private readonly engine: FumeEngine<ConfigType>;
  private bodyParserCache?: {
    limit: string;
    urlencoded: RequestHandler;
    json: RequestHandler;
    text: RequestHandler;
  };

  // default app middleware does nothing - just calls next
  private appMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    next();
  };

  private constructor (engine: FumeEngine<ConfigType>) {
    this.engine = engine;
    this.app = express();
    // Make engine available to route handlers (no module-level state)
    this.app.locals.engine = this.engine;

    // Body parsing must be registered BEFORE downstream consumers add routes,
    // otherwise those routes won't receive parsed bodies.
    // We resolve the limit dynamically from the warmed config so consumers can
    // override it via config passed to warmUp().
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const defaultLimit = defaultConfig.FUME_REQUEST_BODY_LIMIT ?? '400mb';
      const effectiveLimit = this.engine.getConfig().FUME_REQUEST_BODY_LIMIT ?? defaultLimit;
      if (!this.bodyParserCache || this.bodyParserCache.limit !== effectiveLimit) {
        this.bodyParserCache = {
          limit: effectiveLimit,
          urlencoded: express.urlencoded({ extended: true, limit: effectiveLimit }),
          json: express.json({ limit: effectiveLimit, type: ['application/json', 'application/fhir+json', 'application/json+fhir', 'text/json'] }),
          text: express.text({ limit: effectiveLimit, type: ['text/plain', 'application/vnd.outburn.fume', 'x-application/hl7-v2+er7', 'text/csv', 'application/xml', 'application/fhir+xml', 'application/xml+fhir'] })
        };
      }

      const bodyParsers = this.bodyParserCache;
      if (!bodyParsers) {
        next();
        return;
      }

      // Each parser is type-gated; chaining is safe and ensures the right
      // parser runs based on Content-Type.
      bodyParsers.urlencoded(req, res, (err) => {
        if (err) return next(err);
        bodyParsers.json(req, res, (err2) => {
          if (err2) return next(err2);
          bodyParsers.text(req, res, next);
        });
      });
    });

    this.app.use(cors());

    // Mount a stable wrapper so any middleware registered via registerAppMiddleware
    // will run for ALL routes (including those registered by downstream consumers).
    this.app.use((req: Request, res: Response, next: NextFunction) => this.appMiddleware(req, res, next));
  }

  public static async create <ConfigType extends IConfig = IConfig> (
    options: FumeServerCreateOptions<ConfigType>
  ): Promise<FumeServer<ConfigType>> {
    const engine = await FumeEngine.create<ConfigType>({
      config: options.config,
      ...(options.engine?.logger ? { logger: options.engine.logger } : {}),
      ...(options.engine?.astCache ? { astCache: options.engine.astCache } : {}),
      ...(options.engine?.bindings ? { bindings: options.engine.bindings } : {})
    });

    const server = new FumeServer<ConfigType>(engine);

    if (options.appMiddleware) {
      server.registerAppMiddleware(options.appMiddleware);
    }

    // Allow downstream consumers to register routes/middleware BEFORE the built-in router
    // and its trailing 404 handler are mounted.
    options.configureApp?.(server.app, server);

    const { SERVER_PORT } = engine.getConfig();

    // mount routes handler
    const http = createHttpRouter({ openApiSpec: options.openApiSpec });
    server.app.use('/', http.routes);

    // catch any routes that are not found
    // This allows consumers to extend the server with their own routes
    // and still have a default 404 handler
    server.app.use(http.notFound);

    server.server = server.app.listen(SERVER_PORT);
    withPrefix(engine.getLogger(), '[server]').info(`FUME server is running on port ${SERVER_PORT}`);

    return server;
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

  public registerBinding (key: string, binding: unknown): void {
    this.engine.registerBinding(key, binding);
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
    withPrefix(this.engine.getLogger(), '[server]').info('Registered application middleware...');
  }
}
