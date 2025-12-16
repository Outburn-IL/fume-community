/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { test } from '@jest/globals';

import { getCache, initCache } from '../../../src/helpers/cache/cache';
import { SimpleCache } from '../../../src/helpers/cache/simpleCache';

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
});
