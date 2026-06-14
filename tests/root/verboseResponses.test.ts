/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { describe, expect, test } from '@jest/globals';
import express from 'express';
import request from 'supertest';

import { createHttpRouter } from '../../src/http';
import type { IAppBinding, IConfig, IFumeEngine } from '../../src/types';
import { getResourceFileContents } from '../utils/getResourceFileContents';

type VerboseReportBody = {
  ok?: boolean;
  status?: number;
  executionId?: string;
  diagnostics?: {
    error?: unknown[];
    warning?: unknown[];
    debug?: unknown[];
  };
};

const expectVerboseReportShape = (body: unknown) => {
  const report = (body ?? {}) as VerboseReportBody;

  expect(report).toBeTruthy();
  expect(typeof report.ok).toBe('boolean');
  expect(typeof report.status).toBe('number');
  expect(typeof report.executionId).toBe('string');
  expect(report.executionId?.length ?? 0).toBeGreaterThan(0);

  expect(report.diagnostics).toBeTruthy();
  expect(Array.isArray(report.diagnostics?.error)).toBe(true);
  expect(Array.isArray(report.diagnostics?.warning)).toBe(true);
  expect(Array.isArray(report.diagnostics?.debug)).toBe(true);
};

describe('verbose=true response wrapper', () => {
  test('success: POST /?verbose=true returns full report with status=200', async () => {
    const mapping = `
      InstanceOf: Patient
      * active = true
    `;

    const res = await request(globalThis.app)
      .post('/?verbose=true')
      .send({
        fume: mapping,
        input: {}
      })
      .expect(200);

    expectVerboseReportShape(res.body);
    expect(res.body.ok).toBe(true);
    expect(res.body.status).toBe(200);
    expect(res.status).toBe(res.body.status);

    expect(res.body.result).toBeTruthy();
    expect(res.body.result.resourceType).toBe('Patient');
    expect(res.body.result.active).toBe(true);
  }, 30000);

  test('handled evaluation error: POST /?verbose=true returns full report with non-2xx status and diagnostics', async () => {
    const fume = getResourceFileContents('mappings', 'flash-patient-with-incorrect-gender.txt');

    const res = await request(globalThis.app)
      .post('/?verbose=true')
      .send({ fume })
      .expect((r) => {
        // In current fumifier behavior, handled failures may be 206 or 422.
        if (![206, 422].includes(r.status)) {
          throw new Error(`Expected HTTP 206 or 422, got ${r.status}`);
        }
      });

    expectVerboseReportShape(res.body);
    expect(res.body.ok).toBe(false);
    expect([206, 422]).toContain(res.body.status);
    expect(res.status).toBe(res.body.status);

    expect(res.body.diagnostics.error.length).toBeGreaterThan(0);
  }, 30000);

  test('verbose responses project diagnostics to the public DiagnosticEntry shape only', async () => {
    const app = express();
    app.use(express.json());

    const bindings: Record<string, IAppBinding> = {};
    const stubConfig: IConfig = {
      SERVER_PORT: 0,
      FHIR_SERVER_BASE: '',
      FHIR_SERVER_TIMEOUT: 30000,
      FHIR_VERSION: '4.0.1',
      FHIR_PACKAGES: '',
      FHIR_SERVER_AUTH_TYPE: 'NONE',
      FHIR_SERVER_UN: '',
      FHIR_SERVER_PW: ''
    };

    const engine: IFumeEngine<IConfig> = {
      registerBinding: (key: string, binding: IAppBinding) => {
        bindings[key] = binding;
      },
      getBindings: () => bindings,
      getConfig: () => stubConfig,
      getLogger: () => ({
        error: () => undefined,
        warn: () => undefined,
        info: () => undefined,
        debug: () => undefined
      }),
      getFhirClient: () => {
        throw new Error('getFhirClient is not used by this test');
      },
      getMappingProvider: () => {
        throw new Error('getMappingProvider is not used by this test');
      },
      convertInputToJson: async (input: unknown) => input,
      transformVerbose: async () => ({
        ok: false,
        status: 206,
        result: null,
        diagnostics: {
          error: [
            {
              code: 'F5203',
              message: 'FHIR client "literal" returned an error: upstream unauthorized',
              position: 12,
              start: 3,
              line: 1,
              instanceOf: 'Patient',
              fhirElement: 'identifier',
              severity: 20,
              level: 'error',
              timestamp: 1700000000000,
              sourceError: {
                config: {
                  auth: { username: 'secret-user', password: 'secret-pass' },
                  headers: { authorization: 'Basic c2VjcmV0' }
                }
              },
              auth: { username: 'secret-user', password: 'secret-pass' },
              username: 'secret-user',
              password: 'secret-pass',
              authorization: 'Basic c2VjcmV0',
              config: { nested: true },
              request: { method: 'GET', url: 'Patient/123' }
            }
          ],
          warning: [],
          debug: []
        },
        executionId: 'exec-http-redaction'
      }),
      transform: async () => {
        throw new Error('transform is not used by this test');
      }
    };

    app.locals.engine = engine;
    app.use(createHttpRouter().routes);

    const res = await request(app)
      .post('/?verbose=true')
      .send({ fume: '$literal("Patient", {})', input: {} })
      .expect(206);

    expectVerboseReportShape(res.body);
    expect(res.body.executionId).toBe('exec-http-redaction');
    expect(res.body.diagnostics.error).toHaveLength(1);
    expect(res.body.diagnostics.error[0]).toEqual({
      code: 'F5203',
      message: 'FHIR client "literal" returned an error: upstream unauthorized',
      position: 12,
      start: 3,
      line: 1,
      fhirParent: 'Patient',
      fhirElement: 'identifier',
      severity: 20,
      level: 'error',
      timestamp: 1700000000000
    });

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('sourceError');
    expect(serialized).not.toContain('"auth":');
    expect(serialized).not.toContain('username');
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('authorization');
    expect(serialized).not.toContain('config');
    expect(serialized).not.toContain('secret-user');
    expect(serialized).not.toContain('secret-pass');
  });
});
