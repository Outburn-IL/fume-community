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
      FUME_EVAL_DIAG_COLLECT_LEVEL: 70,
      FUME_EVAL_LOG_LEVEL: 40,
      FUME_EVAL_THROW_LEVEL: 30,
      FUME_EVAL_VALIDATION_LEVEL: 30,
      FUME_COMPILED_EXPR_CACHE_MAX_ENTRIES: 1000,
      SERVER_PORT: 42420,
      SERVER_REQUEST_BODY_LIMIT: '400mb'
    });
  });

  test('Treat empty FHIR_PACKAGE_CACHE_DIR as unset', async () => {
    const config = FumeConfigSchema.parse({
      FHIR_PACKAGE_CACHE_DIR: ''
    });
    expect(config.FHIR_PACKAGE_CACHE_DIR).toBeUndefined();
  });
});
