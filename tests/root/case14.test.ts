/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { test } from '@jest/globals';
import request from 'supertest';

import { mockInput } from '../utils/mockInput';

test('Case 14 - Assignment into slices with max cardinality of 1 fails to bring fixed values', async () => {
  const mapping = `
            InstanceOf: il-core-patient
            * identifier[il-id].value = '123'
        `;
  const requestBody = {
    input: mockInput,
    fume: mapping
  };

  const res = await request(globalThis.app).post('/').send(requestBody);
  expect(res.body).toStrictEqual({
    resourceType: 'Patient',
    meta: {
      profile: [
        'http://fhir.health.gov.il/StructureDefinition/il-core-patient'
      ]
    },
    identifier: [
      {
        system: 'http://fhir.health.gov.il/identifier/il-national-id',
        value: '123'
      }
    ]
  });
});
