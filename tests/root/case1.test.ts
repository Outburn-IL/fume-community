/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { expect, test } from '@jest/globals';
import request from 'supertest';

import { mockInput } from '../utils/mockInput';

test('Case 1 - Boolean false disappear from FLASH outputs', async () => {
  const mapping = `
            InstanceOf: Patient
            * active = false
        `;
  const requestBody = {
    input: mockInput,
    fume: mapping
  };

  const res = await request(globalThis.app).post('/').send(requestBody);
  expect(res.body).toStrictEqual({
    resourceType: 'Patient',
    active: false
  });
});
