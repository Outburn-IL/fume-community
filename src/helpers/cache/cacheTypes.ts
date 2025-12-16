/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { FumifierCompiled } from 'fumifier';

import { ICache } from '../../types';

export interface ICacheEntry {
  function: (input: unknown) => Promise<unknown>
}

// Type for translation tables - maps input codes to arrays of coding objects
export type TranslationTable = Record<string, Array<{ code: string; [key: string]: unknown }>>;

export interface IAppCache {
  // TODO: define types for each cache!
  tables: ICache<TranslationTable>
  // cache for generated StructureDefinition snapshots
  snapshots: ICache<unknown>
  v2keyMap: ICache<string>
  // previously parsed expressions
  expressions: ICache<unknown>
  compiledExpressions: ICache<FumifierCompiled>
  // compiled user mappings as callable functions (keyed by expression)
  compiledMappings: ICache<ICacheEntry>
  elementDefinition: ICache<unknown>
  definitions: ICache<unknown>
}

export type IAppCacheKeys = keyof IAppCache;
