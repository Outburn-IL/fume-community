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
  private readonly shutdownHooks = new Set<() => Promise<void>>();
  private shutdownPromise?: Promise<void>;
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
      ...(options.engine?.bindings ? { bindings: options.engine.bindings } : {}),
      ...(options.engine?.builtinBindings ? { builtinBindings: options.engine.builtinBindings } : {}),
      ...(options.engine?.evaluationContextFactory ? { evaluationContextFactory: options.engine.evaluationContextFactory } : {})
    });

    const server = new FumeServer<ConfigType>(engine);

    if (options.appMiddleware) {
      server.registerAppMiddleware(options.appMiddleware);
    }

    // Allow downstream consumers to register routes/middleware BEFORE the built-in router
    // and its trailing 404 handler are mounted.
    try {
      options.configureApp?.(server.app, server);

      const http = createHttpRouter({ openApiSpec: options.openApiSpec });
      server.app.use('/', http.routes);
      server.app.use(http.notFound);

      server.server = server.app.listen(engine.getConfig().SERVER_PORT);
      await new Promise<void>((resolve, reject) => {
        const listener = server.server!;
        const onError = (error: Error) => {
          listener.removeListener('listening', onListening);
          reject(error);
        };
        const onListening = () => {
          listener.removeListener('error', onError);
          resolve();
        };
        listener.once('error', onError);
        listener.once('listening', onListening);
      });
    } catch (error) {
      await server.shutDown().catch(() => undefined);
      throw error;
    }
    withPrefix(engine.getLogger(), '[server]').info(`FUME server is running on port ${engine.getConfig().SERVER_PORT}`);

    return server;
  }

  public registerShutdownHook (hook: () => Promise<void>): void {
    if (this.shutdownPromise) throw new Error('Server shutdown has already started');
    this.shutdownHooks.add(hook);
  }

  public shutDown (): Promise<void> {
    if (this.shutdownPromise) return this.shutdownPromise;
    this.shutdownPromise = Promise.resolve().then(async () => {
      const closing = new Promise<void>((resolve, reject) => {
        if (!this.server?.listening) return resolve();
        this.server.close(error => error ? reject(error) : resolve());
      });
      const hooks = [...this.shutdownHooks].map(hook => {
        try { return Promise.resolve(hook()); } catch (error) { return Promise.reject(error); }
      });
      this.shutdownHooks.clear();
      const results = await Promise.allSettled([closing, ...hooks]);
      const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
      if (failure) throw failure.reason;
    });
    return this.shutdownPromise;
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
