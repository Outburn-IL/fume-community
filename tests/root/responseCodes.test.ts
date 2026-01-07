/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { test } from '@jest/globals';
import request from 'supertest';

describe('root route response code tests', () => {
  test('get /', async () => {
    await request(globalThis.app).get('/').expect(200);
  });

  test('post empty fails with 400 (missing expression)', async () => {
    const res = await request(globalThis.app).post('/').expect(400);
    expect(res.body.__isFumeError).toBe(true);
    expect(res.body.code).toBe('NO_EXPRESSION');
  });
});
