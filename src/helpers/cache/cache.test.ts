import { test } from '@jest/globals';

import { getCache, initCache } from './cache';
import { SimpleCache } from './simpleCache';

class TestCache extends SimpleCache<any> {}

describe('SimpleCache', () => {
  test('getCache fails if not init', async () => {
    expect(() => {
      getCache();
    }).toThrow();
  });

  test('initCache with default class', async () => {
    initCache();
    expect(() => {
      getCache();
    }).not.toThrow();
  });

  test('initCache with override class', async () => {
    initCache({
      aliases: {
        cacheClass: TestCache,
        cacheClassOptions: {}
      }
    });
    const { aliases, mappings } = getCache();
    expect(aliases).toBeInstanceOf(TestCache);
    expect(mappings).toBeInstanceOf(SimpleCache);
  });
});
