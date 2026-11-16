import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { ErrorBody, HealthBody } from '@lm/shared';
import { createPool } from '../src/db/pool';
import { expectBody, testApp, testPool } from './helpers';

const pool = testPool();
afterAll(() => pool.end());

describe('health', () => {
  it('live answers 200 without touching the database', async () => {
    const res = await request(testApp(pool)).get('/health/live');
    expect(expectBody(res, 200, HealthBody)).toEqual({ status: 'ok' });
  });

  it('ready answers 200 when Postgres answers', async () => {
    const res = await request(testApp(pool)).get('/health/ready');
    expectBody(res, 200, HealthBody);
  });

  it('ready answers 503 UNAVAILABLE in the error envelope when Postgres does not', async () => {
    const dead = createPool('postgres://nobody:wrong@127.0.0.1:1/none');
    const res = await request(testApp(dead)).get('/health/ready');
    await dead.end();
    const body = expectBody(res, 503, ErrorBody);
    expect(body.error.code).toBe('UNAVAILABLE');
    expect(body.error.requestId).toBe(res.headers['x-request-id']);
  });
});

describe('error envelope', () => {
  it('the request id comes from the injected Ids port (D18), so runs replay', async () => {
    const res = await request(testApp(pool)).get('/nope');
    expect(res.headers['x-request-id']).toBe('00000000-0000-4000-8000-000000000001');
  });

  it('an unknown route is 404 NOT_FOUND', async () => {
    const res = await request(testApp(pool)).get('/nope');
    expect(expectBody(res, 404, ErrorBody).error).toMatchObject({ code: 'NOT_FOUND', message: 'Not found.' });
  });

  it('a body that is not JSON is 400 INVALID_JSON, not a 500', async () => {
    const res = await request(testApp(pool))
      .post('/nope')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(expectBody(res, 400, ErrorBody).error.code).toBe('INVALID_JSON');
  });
});
