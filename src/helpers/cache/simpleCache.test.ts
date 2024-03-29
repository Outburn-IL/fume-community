/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { test } from '@jest/globals';

import { SimpleCache } from './simpleCache';

describe('SimpleCache', () => {
  test('set \\ get works', async () => {
    const cache = new SimpleCache();
    cache.set('key', 'value');
    const res = cache.get('key');
    expect(res).toEqual('value');
  });

  test('set overrides existing value', async () => {
    const cache = new SimpleCache();
    cache.set('key', 'value');
    cache.set('key', 'value2');
    const res = cache.get('key');
    expect(res).toEqual('value2');
  });

  test('get works value when not cached', async () => {
    const cache = new SimpleCache();
    const res = cache.get('key');
    expect(res).toEqual(undefined);
  });

  test('keys returns all current keys', async () => {
    const cache = new SimpleCache();
    cache.set('key', 'value');
    cache.set('key2', 'value2');
    const res = cache.keys();
    expect(res).toEqual(['key', 'key2']);
  });

  test('keys returns of empty cache', async () => {
    const cache = new SimpleCache();
    const res = cache.keys();
    expect(res).toEqual([]);
  });

  test('reset to clear cache', async () => {
    const cache = new SimpleCache();
    cache.set('key', 'value');
    cache.set('key2', 'value2');
    cache.reset();
    const res = cache.get('key');
    const res2 = cache.get('key2');
    expect(res).toEqual(undefined);
    expect(res2).toEqual(undefined);
  });

  test('getDict to return underlaying data', async () => {
    const cache = new SimpleCache();
    cache.set('key', 'value');
    cache.set('key2', 'value2');
    const res = cache.getDict();
    expect(res).toEqual({ key: 'value', key2: 'value2' });
  });

  test('populate overrides cache', async () => {
    const cache = new SimpleCache();
    cache.set('key', 'value');
    cache.set('key2', 'value2');

    const newCache = {
      key: 'apple',
      key3: 'banana'
    };
    cache.populate(newCache);
    const res = cache.getDict();
    expect(res).toEqual({ key: 'apple', key3: 'banana' });
  });

  test('populate with undefined clears cache', async () => {
    const cache = new SimpleCache();
    cache.set('key', 'value');
    cache.set('key2', 'value2');

    cache.populate(undefined as any);
    const res = cache.getDict();
    expect(res).toEqual({});
  });
});
