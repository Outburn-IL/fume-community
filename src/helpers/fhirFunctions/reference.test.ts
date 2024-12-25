/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { test } from '@jest/globals';

import { reference } from './reference';

describe('reference', () => {
  test('returns reference on object with resourceType', async () => {
    expect(reference({ resourceType: 'Patient' })).toEqual('urn:uuid:b22de17e-2144-5f20-9fba-966d21409f94');
  });
  test('returns undefined on undefined', async () => {
    expect(reference(undefined)).toBeUndefined();
  });
});
