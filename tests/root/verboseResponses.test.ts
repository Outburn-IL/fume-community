/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { describe, expect, test } from '@jest/globals';
import request from 'supertest';

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
});
