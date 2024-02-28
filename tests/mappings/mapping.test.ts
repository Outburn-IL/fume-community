import { test } from '@jest/globals';
import request from 'supertest';

describe('api tests', () => {
  test('get mapping that does not exist', async () => {
    await request(globalThis.app).get('Mapping/1').expect(404);
  });

  test('get mapping that does exist', async () => {
    const expectedExpression: string = `Instance: $uuid('1')
InstanceOf: Patient
* active = true
* name
  * given = given
  * family = family
`;
    const res = await request(globalThis.app)
      .get('/Mapping/testMappingRoute')
      .expect('Content-Type', 'application/vnd.outburn.fume; charset=utf-8');
    expect(res.text).toBe(expectedExpression);
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
});
