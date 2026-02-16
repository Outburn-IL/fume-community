/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { describe, expect, test } from '@jest/globals';

import { FumeEngine } from '../../src/engine';
import { FHIR_PACKAGE_CACHE_DIR } from '../config';

describe('evaluation threshold overrides (per call bindings precedence)', () => {
  test('extraBindings.throwLevel overrides global FUME_EVAL_THROW_LEVEL (without mutating engine bindings)', async () => {
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

    // With global throwLevel=33, sev=32 counts as throwable => ok=false/status=206.
    const reportGlobal = await engine.transformVerbose({}, expression);
    expect(reportGlobal.ok).toBe(false);
    expect(reportGlobal.status).toBe(206);

    // With per-call throwLevel override=30, sev=32 is no longer throwable => ok=true/status=200.
    const reportOverride = await engine.transformVerbose({}, expression, { throwLevel: 30 });
    expect(reportOverride.ok).toBe(true);
    expect(reportOverride.status).toBe(200);

    // Ensure the override does not leak into engine global bindings.
    expect((engine.getBindings() as Record<string, unknown>).throwLevel).toBe(33);
  });
});
