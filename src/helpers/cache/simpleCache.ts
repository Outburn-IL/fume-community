/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { ICache } from '../../types';

export class SimpleCache<T> implements ICache<T> {
  private cache: Record<string, any>;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  constructor (private readonly options: Record<string, any> = {}) {
    this.cache = {};
  }

  get (key: string) {
    return this.cache[key];
  }

  set (key: string, value: any) {
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
