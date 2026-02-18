/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import type { Application, RequestHandler } from 'express';
import { OpenAPIV3 } from 'openapi-types';

import type { IConfig } from './Config';
import type { FumeEngineCreateOptions } from './FumeEngineCreateOptions';
import type { IFumeServer } from './FumeServer';

export type OpenApiSpec = OpenAPIV3.Document;
export type OpenApiSpecFactory = (base: OpenApiSpec) => OpenApiSpec;

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

  /**
   * Override or extend the OpenAPI spec served at GET /api-docs/swagger.json and used by /api-docs.
   * Can be a static object or a factory function that takes the default spec as input
   * and returns a modified version.
   * Useful for adding custom endpoints, metadata, or modifying the spec
   * without changing the source YAML file.
   */
  openApiSpec?: OpenApiSpec | OpenApiSpecFactory;
};
