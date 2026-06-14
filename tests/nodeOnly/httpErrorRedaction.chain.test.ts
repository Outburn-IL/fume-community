/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { describe, expect, test } from '@jest/globals';
import express from 'express';
import request from 'supertest';

import { FumeEngine } from '../../src/engine';
import { createHttpRouter } from '../../src/http';
import { FHIR_PACKAGE_CACHE_DIR } from '../config';

describe('HTTP error redaction across local module boundaries', () => {
  test('verbose responses do not expose auth details when $useFhirServer triggers a transport failure', async () => {
    const engine = await FumeEngine.create({
      config: {
        SERVER_PORT: 0,
        FHIR_SERVER_BASE: 'n/a',
        FHIR_SERVER_AUTH_TYPE: 'NONE',
        FHIR_SERVER_UN: '',
        FHIR_SERVER_PW: '',
        FHIR_SERVER_TIMEOUT: 30000,
        MAPPINGS_FOLDER: 'n/a',
        FHIR_PACKAGE_CACHE_DIR,
        FUME_EVAL_THROW_LEVEL: 30,
        FUME_EVAL_LOG_LEVEL: 0,
        FUME_EVAL_DIAG_COLLECT_LEVEL: 70,
        FUME_EVAL_VALIDATION_LEVEL: 30
      }
    });

    const app = express();
    app.locals.engine = engine;
    app.use(express.json());
    app.use(createHttpRouter().routes);

    const expression = "($useFhirServer('http://127.0.0.1:1/fhir', {'authType':'BASIC','username':'secret-user','password':'secret-pass','timeout':100}); $search('Patient', {}).total)";

    const res = await request(app)
      .post('/?verbose=true')
      .send({
        fume: expression,
        input: {}
      })
      .expect((response) => {
        if (![206, 422].includes(response.status)) {
          throw new Error(`Expected HTTP 206 or 422, got ${response.status}`);
        }
      });

    expect(res.body.ok).toBe(false);
    expect(res.body.status).toBe(res.status);
    expect(Array.isArray(res.body.diagnostics?.error)).toBe(true);
    expect(res.body.diagnostics.error.length).toBeGreaterThan(0);

    const allowedKeys = new Set([
      'code',
      'message',
      'position',
      'start',
      'line',
      'fhirParent',
      'fhirElement',
      'severity',
      'level',
      'timestamp'
    ]);

    expect(res.body.diagnostics.error.some((entry: Record<string, unknown>) => entry.code === 'F5203')).toBe(true);

    for (const diagnostic of res.body.diagnostics.error as Array<Record<string, unknown>>) {
      expect(diagnostic).toMatchObject({
        code: 'F5203',
        level: 'error',
        severity: 20
      });
      expect(typeof diagnostic.message).toBe('string');
      expect((diagnostic.message as string)).toContain('FHIR client "search" returned an error:');
      expect(typeof diagnostic.timestamp).toBe('number');
      expect(Object.keys(diagnostic).every((key) => allowedKeys.has(key))).toBe(true);
    }

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('secret-user');
    expect(serialized).not.toContain('secret-pass');
    expect(serialized).not.toContain('Basic ');
    expect(serialized).not.toContain('authorization');
    expect(serialized).not.toContain('sourceError');
    expect(serialized).not.toContain('config');
    expect(serialized).not.toContain('auth');
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('username');
  }, 30000);
});