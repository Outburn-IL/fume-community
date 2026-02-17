/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import axios from 'axios';
import request from 'supertest';

import { LOCAL_FHIR_API } from '../config';
import { getResourceFileContents } from '../utils/getResourceFileContents';

describe('root route response code tests', () => {
  beforeAll(async () => {
    const testMapping = getResourceFileContents('json', 'test-mapping-route.json');
    const parsedMapping = JSON.parse(testMapping);
    const mappingId = 'TestMappingPostBasic';

    parsedMapping.id = mappingId;
    parsedMapping.url = `http://localdev.fume.health/StructureMap/${mappingId}`;
    if (Array.isArray(parsedMapping.identifier) && parsedMapping.identifier[0]) {
      parsedMapping.identifier[0].value = parsedMapping.url;
    }
    parsedMapping.name = mappingId;
    parsedMapping.title = mappingId;

    await axios.put(`${LOCAL_FHIR_API}/StructureMap/${mappingId}`, parsedMapping);
    await request(globalThis.app).post('/$recache');
  });

  afterAll(async () => {
    const mappingId = 'TestMappingPostBasic';
    await axios.delete(`${LOCAL_FHIR_API}/StructureMap/${mappingId}`);
    await request(globalThis.app).post('/$recache');
  });

  test('get /', async () => {
    await request(globalThis.app).get('/').expect(200);
  });

  test('post empty fails with 400 (missing expression)', async () => {
    const res = await request(globalThis.app).post('/').expect(400);
    expect(res.body.__isFumeError).toBe(true);
    expect(res.body.code).toBe('NO_EXPRESSION');
  });

  test('post empty with verbose=true returns synthetic verbose report (400)', async () => {
    const res = await request(globalThis.app).post('/?verbose=true').expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.status).toBe(400);
    expect(res.body.executionId).toBeTruthy();

    expect(res.body.diagnostics).toBeTruthy();
    expect(Array.isArray(res.body.diagnostics.error)).toBe(true);
    expect(Array.isArray(res.body.diagnostics.warning)).toBe(true);
    expect(Array.isArray(res.body.diagnostics.debug)).toBe(true);

    expect(res.body.diagnostics.error).toHaveLength(1);
    expect(res.body.diagnostics.error[0].code).toBe('NO_EXPRESSION');
    expect(res.body.diagnostics.error[0].level).toBe('error');
  });

  test('GET /recache is not allowed (use POST /$recache)', async () => {
    const res = await request(globalThis.app).get('/recache').expect(405);
    expect(res.body.code).toBe('METHOD_NOT_ALLOWED');
  });

  test('POST /$recache works', async () => {
    await request(globalThis.app).post('/$recache').expect(200);
  });

  test('POST /recache works but is deprecated', async () => {
    const res = await request(globalThis.app).post('/recache').expect(200);
    expect(res.headers.warning).toBeTruthy();
    expect(res.body.deprecated).toBe(true);
  });

  test('unsupported Content-Type returns 415', async () => {
    const res = await request(globalThis.app)
      .post('/Mapping/TestMappingPostBasic')
      .set('Content-Type', 'application/unsupported')
      .send('x')
      .expect(415);

    expect(res.body.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  test('unsupported Content-Type with verbose=true returns synthetic verbose report (415)', async () => {
    const res = await request(globalThis.app)
      .post('/Mapping/TestMappingPostBasic?verbose=true')
      .set('Content-Type', 'application/unsupported')
      .send('x')
      .expect(415);

    expect(res.body.ok).toBe(false);
    expect(res.body.status).toBe(415);
    expect(res.body.executionId).toBeTruthy();
    expect(res.body.diagnostics.error).toHaveLength(1);
    expect(res.body.diagnostics.error[0].code).toBe('UNSUPPORTED_MEDIA_TYPE');
    expect(res.body.diagnostics.warning).toHaveLength(0);
    expect(res.body.diagnostics.debug).toHaveLength(0);
  });

  test('mapping not found with verbose=true returns synthetic verbose report (404)', async () => {
    const res = await request(globalThis.app)
      .post('/Mapping/DefinitelyDoesNotExist/?verbose=true')
      .set('Content-Type', 'application/json')
      .send({ any: 'json' })
      .expect(404);

    expect(res.body.ok).toBe(false);
    expect(res.body.status).toBe(404);
    expect(res.body.executionId).toBeTruthy();
    expect(res.body.diagnostics.error).toHaveLength(1);
    expect(res.body.diagnostics.error[0].code).toBe('MAPPING_NOT_FOUND');
  });
});
