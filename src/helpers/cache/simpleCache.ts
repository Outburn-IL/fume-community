import { ICache } from '../../types';

export class SimpleCache<T> implements ICache<T> {
  private cache: Record<string, any>;

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

  keys () {
    return Object.keys(this.cache);
  }

  reset () {
    this.cache = {};
  }

  populate (dict: Record<string, T>) {
    this.cache = dict;
  }

  getDict () {
    return this.cache;
  }
}
