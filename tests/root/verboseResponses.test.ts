/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { describe, expect, test } from '@jest/globals';
import express from 'express';
import request from 'supertest';

import { createHttpRouter } from '../../src/http';
import type { IFumeEngine } from '../../src/types/FumeEngine';
import { getResourceFileContents } from '../utils/getResourceFileContents';

const expectVerboseReportShape = (body: any) => {
  expect(body).toBeTruthy();
  expect(typeof body.ok).toBe('boolean');
  expect(typeof body.status).toBe('number');
  expect(typeof body.executionId).toBe('string');
  expect(body.executionId.length).toBeGreaterThan(0);

  expect(body.diagnostics).toBeTruthy();
  expect(Array.isArray(body.diagnostics.error)).toBe(true);
  expect(Array.isArray(body.diagnostics.warning)).toBe(true);
  expect(Array.isArray(body.diagnostics.debug)).toBe(true);
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
  });

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
  });

  test('verbose responses project diagnostics to the public DiagnosticEntry shape only', async () => {
    const app = express();
    app.use(express.json());

    const engine = {
      getBindings: () => ({}),
      getConfig: () => ({}),
      getLogger: () => ({
        error: () => undefined,
        warn: () => undefined,
        info: () => undefined,
        debug: () => undefined
      }),
      getFhirClient: () => undefined,
      getMappingProvider: () => ({
        getUserMapping: () => undefined,
        getUserMappingKeys: () => []
      }),
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
              fhirParent: 'Patient',
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
      })
    } satisfies Partial<IFumeEngine> as IFumeEngine;

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
