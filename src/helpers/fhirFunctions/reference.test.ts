/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { test } from '@jest/globals';

import { reference } from './reference';

describe('reference', () => {
  test('returns undefined on anything but an object', async () => {
    expect(reference('input')).toEqual(undefined);
    expect(reference(['input'])).toEqual(undefined);
    expect(reference({})).toEqual(undefined);
  });

  test('returns reference on valid object', async () => {
    expect(reference({ hello: 'world' })).toEqual('urn:uuid:2248ee2f-a0aa-5ad9-9178-531f924bf00b');
  });
});
