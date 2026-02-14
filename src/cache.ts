/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { LRUCache as LRUCacheImpl } from 'lru-cache';

import type { ICache } from './types';

export class SimpleCache<T> implements ICache<T> {
  private cache: Record<string, T>;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  constructor (private readonly options: Record<string, unknown> = {}) {
    this.cache = {};
  }

  get (key: string): T | undefined {
    return this.cache[key];
  }

  set (key: string, value: T) {
    this.cache[key] = value;
  }

  remove (key: string) {
    if (this.cache[key] !== undefined) {
      delete this.cache[key];
    }
  }

  keys () {
    return Object.keys(this.cache);
  }

  reset () {
    this.cache = {};
  }

  populate (dict?: Record<string, T>) {
    this.cache = dict ?? {};
  }

  getDict () {
    return this.cache;
  }
}

export class LRUCache<T extends NonNullable<unknown>> implements ICache<T> {
  private readonly cache: LRUCacheImpl<string, T, unknown>;

  constructor (options: { maxEntries?: number } = {}) {
    const maxEntries = typeof options.maxEntries === 'number' && options.maxEntries > 0
      ? Math.floor(options.maxEntries)
      : 1000;

    this.cache = new LRUCacheImpl<string, T, unknown>({
      max: maxEntries,
      allowStale: false
    });
  }

  get (key: string): T | undefined {
    return this.cache.get(key);
  }

  set (key: string, value: T) {
    this.cache.set(key, value);
  }

  remove (key: string) {
    this.cache.delete(key);
  }

  keys () {
    return Array.from(this.cache.keys());
  }

  reset () {
    this.cache.clear();
  }

  populate (dict: Record<string, T>) {
    this.reset();
    for (const [key, value] of Object.entries(dict)) {
      this.set(key, value);
    }
  }

  getDict () {
    const result: Record<string, T> = {};
    for (const [key, value] of this.cache.entries()) {
      result[key] = value;
    }
    return result;
  }
}
