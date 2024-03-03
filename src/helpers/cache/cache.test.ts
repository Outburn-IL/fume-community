import { test } from '@jest/globals';

import { getCache, initCache } from './cache';

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
});
