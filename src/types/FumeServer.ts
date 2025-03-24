/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { Application } from 'express';

import { IAppCache, IAppCacheKeys } from '../helpers/cache/cacheTypes';
import { IFhirPackageIndex } from '../helpers/conformance';
import { ICache } from './Cache';
import { IFhirClient } from './FhirClient';
import { ILogger } from './Logger';

export type ICacheClass = new <T>(options: Record<string, any>) => ICache<T>;
export type IAppBinding = any;

export interface IFumeServer<ConfigType> {
  registerLogger: (logger: ILogger) => void
  registerFhirClient: (fhirClient: IFhirClient) => void
  getFhirClient: () => IFhirClient
  registerCacheClass: (
    CacheClass: ICacheClass,
    cacheClassOptions: Record<string, any>,
    applyToCaches: IAppCacheKeys[]
  ) => void
  registerBinding: (key: string, binding: IAppBinding) => void
  getCache: () => IAppCache
  getConfig: () => ConfigType
  getExpressApp: () => Application
  warmUp: (serverOptions: ConfigType | undefined) => Promise<void>
  shutDown: () => Promise<void>

  getFhirPackageIndex: () => IFhirPackageIndex
  getFhirPackages: () => any
  transform: (input: any, expression: string, extraBindings?: Record<string, IAppBinding>) => Promise<any>
}
