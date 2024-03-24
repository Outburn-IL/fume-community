import { test } from '@jest/globals';

import { ICache } from '../../types';
import { getCache, initCache } from '../cache';
import { v2normalizeKey } from './v2normalizeKey';

describe('v2normalizeKey', () => {
  let v2keyMap: ICache<any>;

  beforeEach(() => {
    initCache();
    v2keyMap = getCache().v2keyMap;
  });

  test('normalizes key', async () => {
    const res = v2normalizeKey('hello');
    expect(res).toBe('Hello');
  });

  test('stores normalized key', async () => {
    v2normalizeKey('hello');
    expect(v2keyMap.get('hello')).toBe('Hello');
  });

  test('returns from cache, if exists in cache.v2keyMap', async () => {
    v2keyMap.set('hello', 'Hello2');
    const res = v2normalizeKey('hello');
    expect(res).toBe('Hello2');
  });
});
