import { Application } from 'express';
import { ILogger } from './Logger';
import { IConfig } from './Config';
import { ICache } from './Cache';
import { IFhirClient } from './FhirClient';
import { IAppCache, IAppCacheKeys } from '../helpers/cache/cacheTypes';
import { IFhirPackageIndex } from '../helpers/conformance/loadFhirPackageIndex';

export type ICacheClass = new <T>(options: Record<string, any>) => ICache<T>;
export type IAppBinding = any;

export interface IFumeServer {
  registerLogger: (logger: ILogger) => void
  registerFhirClient: (fhitClient: IFhirClient) => void
  getDhirClient: () => IFhirClient
  registerCacheClass: (
    CacheClass: ICacheClass,
    cacheClassOptions: Record<string, any>,
    applyToCaches: IAppCacheKeys[]
  ) => void
  registerBinding: (key: string, binding: IAppBinding) => void
  getCache: () => IAppCache
  getExpressApp: () => Application
  warmUp: (serverOptions: IConfig | undefined) => Promise<void>
  shutDown: () => Promise<void>

  getFhirPackageIndex: () => IFhirPackageIndex
  getFhirPackages: () => any
  transform: (input: any, expression: string) => Promise<any>
}
