/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { describe, expect,test } from '@jest/globals';

import { FumeConfigSchema } from '../src/serverConfig';

describe('FumeConfigSchema', () => {
  test('Check schema defaults', async () => {
    const config = FumeConfigSchema.parse({});
    expect(config).toStrictEqual({
      FHIR_PACKAGES: '',
      FHIR_SERVER_AUTH_TYPE: 'NONE',
      FHIR_SERVER_BASE: '',
      FHIR_SERVER_PW: '',
      FHIR_SERVER_TIMEOUT: 30000,
      FHIR_SERVER_UN: '',
      FHIR_VERSION: '4.0.1',
      FUME_COMPILED_EXPR_CACHE_MAX_ENTRIES: 1000,
      SERVER_PORT: 42420,
      SERVER_REQUEST_BODY_LIMIT: '400mb'
    });
  });
});
