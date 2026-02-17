/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { describe, expect, test } from '@jest/globals';
import express from 'express';
import request from 'supertest';

import type { OpenApiSpec } from '../../src/types';
import { createHttpRouter } from '../../src/http';

// The /openapi.json route does not access the engine, so a bare Express app is sufficient.
const makeApp = (options?: Parameters<typeof createHttpRouter>[0]) => {
  const app = express();
  const { routes, notFound } = createHttpRouter(options);
  app.use('/', routes);
  app.use(notFound);
  return app;
};

describe('OpenAPI spec override', () => {
  test('static object override completely replaces the base spec', async () => {
    const customSpec: OpenApiSpec = {
      openapi: '3.0.3',
      info: { title: 'Custom API', version: '9.9.9' },
      paths: {
        '/custom': {
          get: { summary: 'Custom endpoint', responses: { '200': { description: 'OK' } } }
        }
      }
    };

    const app = makeApp({ openApiSpec: customSpec });

    const res = await request(app).get('/openapi.json').expect(200);

    expect(res.body.info.title).toBe('Custom API');
    expect(res.body.info.version).toBe('9.9.9');
    // The replacement path must be present
    expect(res.body.paths).toHaveProperty('/custom');
    // Default FUME paths must not be present
    expect(res.body.paths).not.toHaveProperty('/');
  });

  test('factory function can add a /test/override path to the base spec', async () => {
    const app = makeApp({
      openApiSpec: (base) => ({
        ...base,
        paths: {
          ...((base.paths as Record<string, unknown>) ?? {}),
          '/test/override': {
            get: {
              summary: 'Test override endpoint',
              responses: { '200': { description: 'OK' } }
            }
          }
        }
      })
    });

    const res = await request(app).get('/openapi.json').expect(200);

    // New path must be present
    expect(res.body.paths).toHaveProperty('/test/override');
    // Original base paths must still be present
    expect(res.body.paths).toHaveProperty('/');
    // Base metadata must be unchanged
    expect(res.body.info.title).toBe('FUME Community API');
  });

  test('factory receives the base spec with the runtime-injected version', async () => {
    const { version } = require('../../package.json') as { version: string };

    let capturedBase: OpenApiSpec | undefined;

    const app = makeApp({
      openApiSpec: (base) => {
        capturedBase = base;
        return {
          ...base,
          info: { ...(base.info as Record<string, unknown>), title: 'Modified Title' }
        };
      }
    });

    const res = await request(app).get('/openapi.json').expect(200);

    // Factory must have received the default spec with the runtime-injected version
    expect((capturedBase?.info as Record<string, unknown>)?.title).toBe('FUME Community API');
    expect((capturedBase?.info as Record<string, unknown>)?.version).toBe(version);
    // Factory's modification must be reflected in the served spec
    expect(res.body.info.title).toBe('Modified Title');
    expect(res.body.info.version).toBe(version);
  });
});
