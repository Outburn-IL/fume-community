import { ICache } from '../../types';

export interface ICacheEntry {
  expression: string
  function: (input: any) => Promise<any>
}

export interface IAppCache {
  // TODO: define types for each cache!
  tables: ICache<any>
  // cache for generated StructureDefinition snapshots
  snapshots: ICache<any>
  aliases: ICache<string>
  v2keyMap: ICache<string>
  // previously parsed expressions
  expressions: ICache<any>
  compiledExpressions: ICache<any>
  // user defined functions
  mappings: ICache<any>
  compiledMappings: ICache<ICacheEntry>
  elementDefinition: ICache<any>
  definitions: ICache<any>
}

export type IAppCacheKeys = keyof IAppCache;
