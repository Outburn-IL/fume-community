/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import type { Logger } from '@outburn/types';
import type { EvaluationScope, FumifierOptions } from 'fumifier';

import type { IConfig } from './Config';
import type { IAppBinding } from './FumeEngine';

export type EngineEvaluationContext = EvaluationScope;
export type EngineEvaluationContexts = {
  default: EngineEvaluationContext;
  scopes: ReadonlyMap<string, EngineEvaluationContext>;
};
export type EvaluationContextFactory = (base: {
  builtins: EngineEvaluationContext;
  user: EngineEvaluationContext;
}) => EngineEvaluationContexts;
export type EngineEvaluationOptions = {
  scopeId?: string;
  /** Server-owned HTTP threshold overlay, applied to every scope in the snapshot. */
  http?: boolean;
};

export type FumeEngineCreateOptions<ConfigType extends IConfig = IConfig> = {
  /** Required runtime config (validated & normalized). */
  config: Partial<ConfigType> | ConfigType;

  /** Optional injections (set once). */
  logger?: Logger;
  astCache?: NonNullable<FumifierOptions['astCache']>;

  /** Initial global bindings (set once during create). */
  bindings?: Record<string, IAppBinding>;
  /** Internal/deployment services available when constructing clean scopes. */
  builtinBindings?: Record<string, IAppBinding>;
  /** Synchronous factory receiving fresh, shallow-frozen provider/user and built-in snapshots. */
  evaluationContextFactory?: EvaluationContextFactory;
};
