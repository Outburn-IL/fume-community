/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { describe, expect, test } from '@jest/globals';

import { FumeEngine } from '../../src/engine';
import { FHIR_PACKAGE_CACHE_DIR } from '../config';

describe('evaluation threshold defaults (global config)', () => {
  test('FUME_EVAL_THROW_LEVEL affects evaluateVerbose ok/status', async () => {
    const engine = new FumeEngine();

    await engine.warmUp({
      SERVER_PORT: 0,
      SERVER_REQUEST_BODY_LIMIT: '400mb',

      // Keep mapping sources disabled; we only need the global FHIR context initialized.
      FHIR_SERVER_BASE: 'n/a',
      FHIR_SERVER_AUTH_TYPE: 'NONE',
      FHIR_SERVER_UN: '',
      FHIR_SERVER_PW: '',
      FHIR_SERVER_TIMEOUT: 30000,

      MAPPINGS_FOLDER: 'n/a',

      FHIR_VERSION: '4.0.1',
      FHIR_PACKAGES: 'il.core.fhir.r4@0.14.2,fume.outburn.r4@0.1.1,il.tasmc.fhir.r4@0.1.1',
      FHIR_PACKAGE_CACHE_DIR,

      // Make a warning (F5320 => severity 32) become a "throwable" in evaluateVerbose status computation.
      FUME_EVAL_THROW_LEVEL: 33,

      // Avoid noisy warn() logs during tests.
      FUME_EVAL_LOG_LEVEL: 0,
      FUME_EVAL_DIAG_COLLECT_LEVEL: 70,
      FUME_EVAL_VALIDATION_LEVEL: 30
    });

    expect((engine.getBindings() as Record<string, unknown>).throwLevel).toBe(33);

    const expression = '{"x": 1, "w": $warn("hello") }';
    const report = await engine.transformVerbose({}, expression);

    expect(report.ok).toBe(false);
    expect(report.status).toBe(206);
    expect(report.diagnostics.warning[0]?.code).toBe('F5320');
  });
});
