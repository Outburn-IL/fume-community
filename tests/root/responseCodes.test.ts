
import { test } from '@jest/globals';
import request from 'supertest';

describe('root route response code tests', () => {
  test('get /', async () => {
    await request(globalThis.app).get('/').expect(200);
  });

  test('post empty fails with 422', async () => {
    await request(globalThis.app).post('/').expect(422);
  });
});
