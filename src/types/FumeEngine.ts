/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import type { FhirClient } from '@outburn/fhir-client';
import type { FumeMappingProvider } from '@outburn/fume-mapping-provider';
import type { Logger } from '@outburn/types';

import type { IAppCache, IAppCacheKeys } from '../cache';
import type { ICache } from './Cache';
import type { IConfig } from './Config';

export type ICacheClass = new <T>(options: Record<string, unknown>) => ICache<T>;
export type IAppBinding = unknown;

/**
 * Transport-agnostic engine interface.
 * Implemented by {@link FumeEngine}.
 */
export interface IFumeEngine<ConfigType extends IConfig = IConfig> {
  registerLogger: (logger: Logger) => void;

  registerCacheClass: (
    CacheClass: ICacheClass,
    cacheClassOptions: Record<string, unknown>,
    applyToCaches: IAppCacheKeys[]
  ) => void;

  registerBinding: (key: string, binding: IAppBinding) => void;
  getBindings: () => Record<string, IAppBinding>;

  setConfig: (config: Partial<ConfigType>) => void;
  getConfig: () => ConfigType;

  warmUp: (options?: ConfigType) => Promise<void>;

  getCache: () => IAppCache;
  getFhirClient: () => FhirClient;
  getMappingProvider: () => FumeMappingProvider;

  convertInputToJson: (input: unknown, contentType?: string) => Promise<unknown>;
  transform: (input: unknown, expression: string, extraBindings?: Record<string, IAppBinding>) => Promise<unknown>;
}
