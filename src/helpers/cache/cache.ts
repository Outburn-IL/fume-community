/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import { ICacheClass } from '../../types/FumeServer';
import { IAppCache, ICacheEntry } from './cacheTypes';
import { SimpleCache } from './simpleCache';

let appCache: IAppCache | undefined;

export function initCache (
  CacheClass: ICacheClass = SimpleCache,
  options: Record<string, any> = {}
): void {
  appCache = {
    tables: new CacheClass<any>(options),
    snapshots: new CacheClass<any>(options),
    aliases: new CacheClass<string>(options),
    v2keyMap: new CacheClass<string>(options),
    expressions: new CacheClass<any>(options),
    compiledExpressions: new CacheClass<any>(options),
    mappings: new CacheClass<any>(options),
    compiledMappings: new CacheClass<ICacheEntry>(options),
    elementDefinition: new CacheClass<any>(options),
    definitions: new CacheClass<any>(options),
    compiledDefinitions: new CacheClass<any>(options)
  };
}

export function getCache (): IAppCache {
  if (!appCache) {
    throw new Error('Cache not initialized');
  }
  return appCache;
}
