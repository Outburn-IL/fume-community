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
      .post('/Mapping/test-mapping-post-basic')
      .set('Content-Type', 'application/unsupported')
      .send('x')
      .expect(415);

    expect(res.body.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });
});
