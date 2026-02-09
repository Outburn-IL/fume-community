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
});
