/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import type { Application, RequestHandler } from 'express';

import type { IConfig } from './Config';
import type { FumeEngineCreateOptions } from './FumeEngineCreateOptions';
import type { IFumeServer } from './FumeServer';

export type FumeServerCreateOptions<ConfigType extends IConfig = IConfig> = {
  config: Partial<ConfigType> | ConfigType;

  engine?: Omit<FumeEngineCreateOptions<ConfigType>, 'config'>;

  /**
   * Optional hook that runs BEFORE the built-in FUME HTTP router is mounted.
   * Allows downstream routes/middleware to take precedence.
   */
  configureApp?: (app: Application, server: IFumeServer<ConfigType>) => void;

  /** Optional initial app middleware (license gates, auth, etc.). */
  appMiddleware?: RequestHandler;
};
