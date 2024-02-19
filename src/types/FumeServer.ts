import { Application } from 'express';
import { ILogger } from './Logger';
import { IConfig } from './Config';
import { ICache } from './Cache';
import { IAppCache } from '../helpers/cache/cacheTypes';

export type ICacheClass = new <T>(options: Record<string, any>) => ICache<T>;

export interface IFumeServer {
  registerLogger: (logger: ILogger) => void
  registerCacheClass: (CacheClass: ICacheClass, options: Record<string, any>) => void
  getCache: () => IAppCache
  getExpressApp: () => Application
  warmUp: (serverOptions: IConfig | undefined) => Promise<void>
  shutDown: () => Promise<void>
}
