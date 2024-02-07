import { v2normalizeKey } from './v2normalizeKey';
import { test } from '@jest/globals';
import cache from '../cache';

describe('v2normalizeKey', () => {
  afterEach(() => {
    cache.v2keyMap = {};
  });

  test('normalizes key', async () => {
    const res = await v2normalizeKey('hello');
    expect(res).toBe('Hello');
  });

  test('stores normalized key', async () => {
    await v2normalizeKey('hello');
    expect(cache.v2keyMap.hello).toBe('Hello');
  });

  test('returns from cache, if exists in cache.v2keyMap', async () => {
    cache.v2keyMap.hello = 'Hello2';
    const res = await v2normalizeKey('hello');
    expect(res).toBe('Hello2');
  });
});
