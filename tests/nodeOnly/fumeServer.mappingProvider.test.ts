/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { describe, expect, test } from '@jest/globals';

const testTarget = (process.env.FUME_TEST_TARGET ?? 'node').toLowerCase();
const nodeOnlyTest = (testTarget === 'node') ? test : test.skip;

describe('node-only integration: FumeServer mapping provider', () => {
  nodeOnlyTest('exposes getMappingProvider()', () => {
    if (!globalThis.fumeServer) {
      throw new Error('Expected in-process FumeServer to be initialized in node test target.');
    }

    const provider = globalThis.fumeServer.getEngine().getMappingProvider();
    expect(provider).toBeTruthy();
  });
});
