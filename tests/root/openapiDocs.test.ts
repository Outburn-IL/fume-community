/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { describe, expect, test } from '@jest/globals';
import request from 'supertest';

describe('OpenAPI and docs routes', () => {
  test('GET /openapi.json returns the OpenAPI spec (with injected version)', async () => {
    // Jest runs these integration tests in a CommonJS context (via Babel transform)
    // so using `require()` here avoids relying on `import.meta`.
    const { version } = require('../../package.json') as { version: string };

    const res = await request(globalThis.app)
      .get('/openapi.json')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(res.body).toBeTruthy();
    expect(res.body.openapi).toBe('3.0.3');

    expect(res.body.info).toBeTruthy();
    expect(res.body.info.title).toBe('FUME Community API');
    expect(res.body.info.version).toBe(version);

    // Basic shape sanity checks
    expect(typeof res.body.paths).toBe('object');
    expect(res.body.paths).toBeTruthy();
  });

  test('GET /docs responds with HTML', async () => {
    const first = await request(globalThis.app).get('/docs');

    const res =
      first.status >= 300 && first.status < 400 && typeof first.headers.location === 'string'
        ? await request(globalThis.app).get(first.headers.location)
        : first;

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/i);
    expect(typeof res.text).toBe('string');
    expect(res.text).toMatch(/<!doctype html>|<html/i);
  });
});
