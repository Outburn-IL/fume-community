/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import axios from 'axios';
import express from 'express';
import request from 'supertest';

import { LOCAL_FHIR_API } from '../config';
import { getResourceFileContents } from '../utils/getResourceFileContents';

const mappingId = 'testMappingRouteOrdering';
const testTarget = (process.env.FUME_TEST_TARGET ?? 'node').toLowerCase();
const nodeOnlyTest = (testTarget === 'node') ? test : test.skip;

describe('node-only integration: downstream app extension points', () => {
  beforeAll(async () => {
    if (testTarget !== 'node') {
      return;
    }

    if (typeof globalThis.app === 'string') {
      throw new Error('This test requires in-process Express app (not a remote base URL).');
    }

    const raw = getResourceFileContents('json', 'test-mapping-route.json');
    const parsed = JSON.parse(raw);

    // Ensure the mapping has a unique id/url so it doesn't collide with other suites.
    parsed.id = mappingId;
    parsed.url = `http://localdev.fume.health/StructureMap/${mappingId}`;
    if (Array.isArray(parsed.identifier) && parsed.identifier[0]) {
      parsed.identifier[0].value = parsed.url;
    }
    parsed.name = mappingId;
    parsed.title = mappingId;

    await axios.put(`${LOCAL_FHIR_API}/StructureMap/${mappingId}`, parsed);
    await request(globalThis.app).post('/$recache').expect(200);
  });

  afterAll(async () => {
    if (testTarget !== 'node') {
      return;
    }

    if (typeof globalThis.app === 'string') {
      return;
    }

    await axios.delete(`${LOCAL_FHIR_API}/StructureMap/${mappingId}`);
    await request(globalThis.app).post('/$recache').expect(200);
  });

  nodeOnlyTest('PUT /Mapping/{mappingId} can be intercepted by downstream update handler', async () => {
    if (typeof globalThis.app === 'string') {
      throw new Error('This test requires in-process Express app (not a remote base URL).');
    }

    // Build an isolated app to simulate downstream route registration BEFORE default FUME routes.
    const engine = (globalThis.app as any).locals.engine;

    const app = express();
    app.locals.engine = engine;
    app.use(express.urlencoded({ extended: true, limit: '400mb' }));
    app.use(express.json({ limit: '400mb', type: ['application/json', 'application/fhir+json'] }));
    app.use(express.text({
      limit: '400mb',
      type: ['text/plain', 'application/vnd.outburn.fume', 'x-application/hl7-v2+er7', 'text/csv', 'application/xml', 'application/fhir+xml', 'application/xml+fhir']
    }));

    // Downstream update handler (base PUT only)
    app.put('/Mapping/:mappingId', (_req, res) => {
      res.status(204).send();
    });

    const http = (await import('../../src/http')).createHttpRouter();
    app.use('/', http.routes);
    app.use(http.notFound);

    await request(app)
      .put(`/Mapping/${mappingId}`)
      .send({ ignored: true })
      .expect(204);

    // Ensure subroute PUT still reaches mapping transform, not the update handler
    const res2 = await request(app)
      .put(`/Mapping/${mappingId}/should/transform`)
      .send({ given: 'a', family: 'B' })
      .expect(200);

    // Sanity-check transform happened (i.e. the downstream update handler did NOT intercept this route).
    expect(res2.body).toMatchObject({
      resourceType: 'Patient',
      active: true
    });
  });
});
