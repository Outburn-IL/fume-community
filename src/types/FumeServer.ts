/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import type { Application, RequestHandler } from 'express';

import type { IConfig } from './Config';
import type { IFumeEngine } from './FumeEngine';

/**
 * HTTP/Express wrapper around a {@link IFumeEngine}.
 *
 * The server should not expose engine capabilities directly; downstream consumers
 * can access the engine via {@link getEngine}.
 */
export interface IFumeServer<ConfigType extends IConfig = IConfig> {
  getExpressApp: () => Application;
  getEngine: () => IFumeEngine<ConfigType>;
  registerAppMiddleware: (middleware: RequestHandler) => void;
  registerBinding: (key: string, binding: unknown) => void;
  shutDown: () => Promise<void>;
}
