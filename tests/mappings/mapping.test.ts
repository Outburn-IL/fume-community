/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { test } from '@jest/globals';
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
    const parsed = JSON.parse(testMapping);
    await axios.put(`${LOCAL_FHIR_API}/StructureMap/testMappingRoute`, parsed);
    const mapping = await axios.get(`${LOCAL_FHIR_API}/StructureMap/testMappingRoute`);
    expect(mapping.status).toBe(200);
    await request(globalThis.app).get('/recache');
  });

  afterAll(async () => {
    await axios.delete(`${LOCAL_FHIR_API}/StructureMap/testMappingRoute`);
    await request(globalThis.app).get('/recache');
  });

  test('get mapping that does not exist', async () => {
    await request(globalThis.app).get('/Mapping/11925e4e-6ac0-4a38-a817-9a1524c9e1aa').expect(404);
  });

  test('get mapping that does exist', async () => {
    const res = await request(globalThis.app).get('/Mapping/testMappingRoute')
      .expect('Content-Type', 'application/vnd.outburn.fume; charset=utf-8');

    expect(res.text).toBe(patientExpression);
    ;
  });

  test('execute existing mapping', async () => {
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
});
