/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import type { FumifierCompiled } from 'fumifier';

import type { ICache } from './types';

export interface ICacheEntry {
  function: (input: unknown) => Promise<unknown>;
}

// Maps input codes to arrays of coding objects
export type TranslationTable = Record<string, Array<{ code: string; [key: string]: unknown }>>;

export interface IAppCache {
  tables: ICache<TranslationTable>;
  expressions: ICache<unknown>;
  compiledExpressions: ICache<FumifierCompiled>;
  compiledMappings: ICache<ICacheEntry>;
}

export type IAppCacheKeys = keyof IAppCache;

export class SimpleCache<T> implements ICache<T> {
  private cache: Record<string, T>;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  constructor (private readonly options: Record<string, unknown> = {}) {
    this.cache = {};
  }

  get (key: string) {
    return this.cache[key];
  }

  set (key: string, value: T) {
    this.cache[key] = value;
  }

  remove (key: string) {
    if (this.cache[key] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.cache[key];
    }
  }

  keys () {
    return Object.keys(this.cache);
  }

  reset () {
    this.cache = {};
  }

  populate (dict: Record<string, T>) {
    this.cache = dict || {};
  }

  getDict () {
    return this.cache;
  }
}
