import { test } from '@jest/globals';
import request from 'supertest';

describe('api tests', () => {
  test('get mapping that does not exist/', async () => {
    await request(globalThis.app).get('/Mapping/1').expect(500);
  });
});
