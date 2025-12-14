/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { ICache } from '../../types';
import { ICacheClass } from '../../types/FumeServer';
import { IAppCache, IAppCacheKeys } from './cacheTypes';
import { SimpleCache } from './simpleCache';

/** Global app cache instance */
let appCache: IAppCache | undefined;

const cacheKeys: IAppCacheKeys[] = [
  'tables',
  'aliases',
  'v2keyMap',
  'expressions',
  'compiledExpressions',
  'mappings',
  'compiledMappings',
  'elementDefinition',
  'definitions'
];

export interface InitCacheConfig {
  cacheClass: ICacheClass
  cacheClassOptions: Record<string, unknown>
}

export function initCache (
  options: Partial<Record<IAppCacheKeys, InitCacheConfig>> = {}
): void {
  // use map reduce to create caches with the right types.
  // if options are empty, all will be created SimpleCache.
  // options can override the type of cache and add options to it.
  appCache = cacheKeys.map((key) => {
    const CacheClass = options[key]?.cacheClass || SimpleCache;
    const cacheClassOptions = options[key]?.cacheClassOptions || {};
    return new CacheClass(cacheClassOptions);
  }).reduce((acc, cache, index) => {
    acc[cacheKeys[index]] = cache as ICache<unknown>;
    return acc;
  }, {}) as IAppCache;
}

export function getCache (): IAppCache {
  if (!appCache) {
    throw new Error('Cache not initialized');
  }
  return appCache;
}
