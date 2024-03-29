/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { test } from '@jest/globals';

import { FumeConfigSchema } from './serverConfigSchema';

describe('FumeConfigSchema', () => {
  test('Check schema defaults', async () => {
    const config = FumeConfigSchema.parse({});
    expect(config).toStrictEqual({
      EXCLUDE_FHIR_PACKAGES: '',
      FHIR_PACKAGES: '',
      FHIR_SERVER_AUTH_TYPE: 'NONE',
      FHIR_SERVER_BASE: 'http://hapi-fhir.outburn.co.il/fhir',
      FHIR_SERVER_PW: '',
      FHIR_SERVER_TIMEOUT: 30000,
      FHIR_SERVER_UN: '',
      FHIR_VERSION: '4.0.1',
      SEARCH_BUNDLE_PAGE_SIZE: 20,
      SERVER_PORT: 42420,
      SERVER_STATELESS: false
    });
  });
});
