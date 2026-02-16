/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import type { Logger } from '@outburn/types';
import type { FumifierOptions } from 'fumifier';

import type { IConfig } from './Config';
import type { IAppBinding } from './FumeEngine';

export type FumeEngineCreateOptions<ConfigType extends IConfig = IConfig> = {
  /** Required runtime config (validated & normalized). */
  config: Partial<ConfigType> | ConfigType;

  /** Optional injections (set once). */
  logger?: Logger;
  astCache?: NonNullable<FumifierOptions['astCache']>;

  /** Initial global bindings (set once during create). */
  bindings?: Record<string, IAppBinding>;
};
