import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createPool } from '../src/db/pool';
import { testApp, testPool } from './helpers';

const pool = testPool();
afterAll(() => pool.end());

describe('health', () => {
  it('live answers 200 without touching the database', async () => {
    const res = await request(testApp(pool)).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('ready answers 200 when Postgres answers', async () => {
    const res = await request(testApp(pool)).get('/health/ready');
    expect(res.status).toBe(200);
  });

  it('ready answers 503 UNAVAILABLE in the error envelope when Postgres does not', async () => {
    const dead = createPool('postgres://nobody:wrong@127.0.0.1:1/none');
    const res = await request(testApp(dead)).get('/health/ready');
    await dead.end();
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('UNAVAILABLE');
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
  });
});

describe('error envelope', () => {
  it('an unknown route is 404 NOT_FOUND', async () => {
    const res = await request(testApp(pool)).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: { code: 'NOT_FOUND', message: 'Not found.' } });
  });

  it('a body that is not JSON is 400 INVALID_JSON, not a 500', async () => {
    const res = await request(testApp(pool))
      .post('/nope')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});
