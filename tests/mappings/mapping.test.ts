/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import axios from 'axios';
import request from 'supertest';

import { LOCAL_FHIR_API } from '../config';
import { getResourceFileContents } from '../utils/getResourceFileContents';

const patientExpression: string = `Instance: $uuid('1')
InstanceOf: Patient
* active = true
* name
  * given = given
  * family = family
`;

describe('api tests', () => {
  beforeAll(async () => {
    const testMapping = getResourceFileContents('json', 'test-mapping-route.json');
    const mappingAsFunction = getResourceFileContents('json', 'mapping-as-function.json');
    const parsedtestMapping = JSON.parse(testMapping);
    const parsedmappingAsFunction = JSON.parse(mappingAsFunction);

    const httpInvocationMappingId = 'testMappingHttpInvocation';
    const parsedHttpInvocationMapping = JSON.parse(testMapping);
    parsedHttpInvocationMapping.id = httpInvocationMappingId;
    parsedHttpInvocationMapping.url = `http://localdev.fume.health/StructureMap/${httpInvocationMappingId}`;
    parsedHttpInvocationMapping.identifier[0].value = parsedHttpInvocationMapping.url;
    parsedHttpInvocationMapping.name = httpInvocationMappingId;
    parsedHttpInvocationMapping.title = httpInvocationMappingId;
    parsedHttpInvocationMapping.group[0].rule[0].extension[0].valueExpression.expression = '$fumeHttpInvocation';

    await axios.put(`${LOCAL_FHIR_API}/StructureMap/testMappingRoute`, parsedtestMapping);
    await axios.put(`${LOCAL_FHIR_API}/StructureMap/testMappingAsFunction`, parsedmappingAsFunction);
    await axios.put(`${LOCAL_FHIR_API}/StructureMap/${httpInvocationMappingId}`, parsedHttpInvocationMapping);
    // "'testing binding of $a: ' + $a"
    const mapping1 = await axios.get(`${LOCAL_FHIR_API}/StructureMap/testMappingRoute`);
    const mapping2 = await axios.get(`${LOCAL_FHIR_API}/StructureMap/testMappingAsFunction`);
    const mapping3 = await axios.get(`${LOCAL_FHIR_API}/StructureMap/${httpInvocationMappingId}`);
    expect(mapping1.status).toBe(200);
    expect(mapping2.status).toBe(200);
    expect(mapping3.status).toBe(200);
    await request(globalThis.app).post('/$recache');
  });

  afterAll(async () => {
    await axios.delete(`${LOCAL_FHIR_API}/StructureMap/testMappingRoute`);
    await axios.delete(`${LOCAL_FHIR_API}/StructureMap/testMappingAsFunction`);
    await axios.delete(`${LOCAL_FHIR_API}/StructureMap/testMappingHttpInvocation`);
    await request(globalThis.app).post('/$recache');
  });

  test('get mapping that does not exist', async () => {
    await request(globalThis.app).get('/Mapping/11925e4e-6ac0-4a38-a817-9a1524c9e1aa').expect(404);
  });

  test('get mapping that does exist', async () => {
    const res = await request(globalThis.app).get('/Mapping/testMappingRoute')
      .expect('Content-Type', 'application/vnd.outburn.fume; charset=utf-8');

    expect(res.text).toBe(patientExpression);
  });

  test('execute existing test mapping', async () => {
    const res = await request(globalThis.app).post('/Mapping/testMappingRoute').send({
      given: 'a', family: 'B'
    });
    expect(res.body).toStrictEqual({
      resourceType: 'Patient',
      id: '356a192b-7913-504c-9457-4d18c28d46e6',
      active: true,
      name: [
        {
          given: [
            'a'
          ],
          family: 'B'
        }
      ]
    });
  });

  test('execute existing test mapping as function', async () => {
    const res = await request(globalThis.app).post('/').send({
      input: {
        given: 'a', family: 'B'
      },
      contentType: 'application/json',
      fume: '$testMappingRoute($)'
    });
    expect(res.body).toStrictEqual({
      resourceType: 'Patient',
      id: '356a192b-7913-504c-9457-4d18c28d46e6',
      active: true,
      name: [
        {
          given: [
            'a'
          ],
          family: 'B'
        }
      ]
    });
  });

  test('execute mapping as function and pass bindings', async () => {
    const res = await request(globalThis.app).post('/').send({
      input: {},
      contentType: 'application/json',
      fume: '$testMappingAsFunction({}, { "a": "a" })'
    });
    expect(res.body).toBe('testing binding of $a: a');
  });

  test('execute existing mapping with CSV input', async () => {
    const res = await request(globalThis.app)
      .post('/Mapping/testMappingRoute')
      .set('Content-Type', 'text/csv')
      .send('given,family\r\na,B');
    expect(res.body).toStrictEqual({
      resourceType: 'Patient',
      id: '356a192b-7913-504c-9457-4d18c28d46e6',
      active: true,
      name: [
        {
          given: [
            'a'
          ],
          family: 'B'
        }
      ]
    });
  });

  test('execute existing mapping with XML input', async () => {
    const res = await request(globalThis.app)
      .post('/Mapping/testMappingRoute')
      .set('Content-Type', 'application/xml')
      .send('<root><given>a</given><family value="B" /></root>');
    expect(res.body).toStrictEqual({
      resourceType: 'Patient',
      id: '356a192b-7913-504c-9457-4d18c28d46e6',
      active: true,
      name: [
        {
          given: [
            'a'
          ],
          family: 'B'
        }
      ]
    });
  });

  test('POST /Mapping/{mappingId} exposes $fumeHttpInvocation', async () => {
    const res = await request(globalThis.app)
      .post('/Mapping/testMappingHttpInvocation')
      .set('Authorization', 'Bearer super-secret')
      .send({ any: 'payload' })
      .expect(200);

    expect(res.body).toMatchObject({
      mappingId: 'testMappingHttpInvocation',
      method: 'POST'
    });
    expect(Array.isArray(res.body.subroute)).toBe(true);
    expect(res.body.subroute).toStrictEqual([]);
    expect(res.body.subpath).toBe('');
    expect(res.body.headers).toBeTruthy();
    // must not expose secrets
    expect(res.body.headers.authorization).toBe('[REDACTED]');
  });

  test('POST /Mapping/{mappingId}/... transforms and exposes subroute + query', async () => {
    const res = await request(globalThis.app)
      .post('/Mapping/testMappingHttpInvocation/foo/bar/123?x=1&y=two')
      .set('Authorization', 'Bearer super-secret')
      .send({ any: 'payload' })
      .expect(200);

    expect(res.body).toMatchObject({
      mappingId: 'testMappingHttpInvocation',
      method: 'POST',
      subroute: ['foo', 'bar', '123'],
      subpath: 'foo/bar/123',
      query: { x: '1', y: 'two' }
    });
    expect(res.body.headers.authorization).toBe('[REDACTED]');
  });

  test('PUT /Mapping/{mappingId}/... transforms (PUT is for update only when no subroute)', async () => {
    const res = await request(globalThis.app)
      .put('/Mapping/testMappingHttpInvocation/a/b')
      .send({ any: 'payload' })
      .expect(200);

    expect(res.body).toMatchObject({
      mappingId: 'testMappingHttpInvocation',
      method: 'PUT',
      subroute: ['a', 'b'],
      subpath: 'a/b'
    });
  });

  test('mapping-as-function does NOT expose $fumeHttpInvocation (undefined -> null)', async () => {
    const res = await request(globalThis.app)
      .post('/')
      .send({
        input: {},
        contentType: 'application/json',
        fume: '$testMappingHttpInvocation($)'
      })
      .expect(200);

    // Express 5 may serialize undefined as an empty response body.
    expect(res.body === null || res.text === '' || res.text === 'null').toBe(true);
  });
});
