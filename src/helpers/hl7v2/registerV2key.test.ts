/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { test } from '@jest/globals';

import { ICache } from '../../types';
import { getCache, initCache } from '../cache';
import { registerV2key } from './registerV2key';

describe('registerV2key', () => {
  let v2keyMap: ICache<any>;

  beforeEach(() => {
    initCache();
    v2keyMap = getCache().v2keyMap;
  });

  test('stores V2 key', async () => {
    registerV2key('key1', 'normalized1');
    expect(v2keyMap.get('key1')).toBe('normalized1');
  });

  test('overrides V2 key', async () => {
    registerV2key('key1', 'normalized1');
    registerV2key('key1', 'normalized2');
    expect(v2keyMap.get('key1')).toBe('normalized2');
  });

  test('sets multiple V2 keys', async () => {
    registerV2key('key1', 'normalized1');
    registerV2key('key2', 'normalized2');
    expect(v2keyMap.get('key1')).toBe('normalized1');
    expect(v2keyMap.get('key2')).toBe('normalized2');
  });
});
