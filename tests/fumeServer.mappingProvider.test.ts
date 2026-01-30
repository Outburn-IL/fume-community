/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { describe, expect, test } from '@jest/globals';

describe('FumeServer mapping provider', () => {
  test('exposes getMappingProvider()', () => {
    const provider = globalThis.fumeServer.getEngine().getMappingProvider();
    expect(provider).toBeTruthy();
  });
});
