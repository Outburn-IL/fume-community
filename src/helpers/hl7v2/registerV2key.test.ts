import { registerV2key } from './registerV2key';
import cache from '../cache';

import { test } from '@jest/globals';

describe('registerV2key', () => {
  afterEach(() => {
    cache.v2keyMap = {};
  });

  test('stores V2 key', async () => {
    registerV2key('key1', 'normalized1');
    expect(cache.v2keyMap.key1).toBe('normalized1');
  });

  test('overrides V2 key', async () => {
    registerV2key('key1', 'normalized1');
    registerV2key('key1', 'normalized2');
    expect(cache.v2keyMap.key1).toBe('normalized2');
  });

  test('sets multiple V2 keys', async () => {
    registerV2key('key1', 'normalized1');
    registerV2key('key2', 'normalized2');
    expect(cache.v2keyMap.key1).toBe('normalized1');
    expect(cache.v2keyMap.key2).toBe('normalized2');
  });
});
