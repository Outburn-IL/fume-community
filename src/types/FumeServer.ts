/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { Application } from 'express';

import { IAppCache, IAppCacheKeys } from '../helpers/cache/cacheTypes';
import { Logger } from '.';
import { ICache } from './Cache';
import { IFhirClient } from './FhirClient';

export type ICacheClass = new <T>(options: Record<string, unknown>) => ICache<T>;
export type IAppBinding = unknown;

export interface IFumeServer<ConfigType> {
  registerLogger: (logger: Logger) => void
  registerFhirClient: (fhirClient: IFhirClient) => void
  getFhirClient: () => IFhirClient
  registerCacheClass: (
    CacheClass: ICacheClass,
    cacheClassOptions: Record<string, unknown>,
    applyToCaches: IAppCacheKeys[]
  ) => void
  registerBinding: (key: string, binding: IAppBinding) => void
  getCache: () => IAppCache
  getConfig: () => ConfigType
  getExpressApp: () => Application
  warmUp: (serverOptions: ConfigType | undefined) => Promise<void>
  shutDown: () => Promise<void>
  transform: (input: unknown, expression: string, extraBindings?: Record<string, IAppBinding>) => Promise<unknown>
}
