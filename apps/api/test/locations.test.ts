import { ErrorBody, LocationResponse, LocationsResponse } from '@lm/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { expectBody, resetData, signUp, testApp, testPool } from './helpers';

const pool = testPool();

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await resetData(pool);
});

describe('locations endpoints (R5, R7, R8, D11)', () => {
  it('requires authentication on GET and POST /api/locations', async () => {
    const app = testApp(pool);
    const getRes = await request(app).get('/api/locations');
    expect(expectBody(getRes, 401, ErrorBody).error.code).toBe('UNAUTHENTICATED');

    const postRes = await request(app)
      .post('/api/locations')
      .send({ name: 'Suria KLCC', latitude: 3.157324409, longitude: 101.7121981 });
    expect(expectBody(postRes, 401, ErrorBody).error.code).toBe('UNAUTHENTICATED');
  });

  it('creates a location with full 9-decimal precision (D11) and lists oldest first', async () => {
    const app = testApp(pool);
    const { agent } = await signUp(app, 'alice@example.com');

    const first = await agent
      .post('/api/locations')
      .send({ name: 'Suria KLCC', latitude: 3.157324409, longitude: 101.7121981 });
    const firstBody = expectBody(first, 201, LocationResponse);
    expect(firstBody.location.latitude).toBe(3.157324409);
    expect(firstBody.location.longitude).toBe(101.7121981);

    const second = await agent
      .post('/api/locations')
      .send({ name: 'Zoo Negara', latitude: 3.2105416, longitude: 101.75920504 });
    const secondBody = expectBody(second, 201, LocationResponse);

    const list = await agent.get('/api/locations');
    const listBody = expectBody(list, 200, LocationsResponse);
    expect(listBody.locations.map((l) => l.id)).toEqual([
      firstBody.location.id,
      secondBody.location.id,
    ]);
  });

  it('rejects invalid bodies with 400 VALIDATION_FAILED and field paths in details', async () => {
    const app = testApp(pool);
    const { agent } = await signUp(app, 'val@example.com');

    const badLat = await agent
      .post('/api/locations')
      .send({ name: 'Bad Lat', latitude: 91, longitude: 101 });
    const badLatErr = expectBody(badLat, 400, ErrorBody);
    expect(badLatErr.error.code).toBe('VALIDATION_FAILED');
    expect(badLatErr.error.details).toEqual([
      expect.objectContaining({ path: 'latitude' }),
    ]);

    const badName = await agent
      .post('/api/locations')
      .send({ name: '   ', latitude: 3.1, longitude: 101 });
    const badNameErr = expectBody(badName, 400, ErrorBody);
    expect(badNameErr.error.code).toBe('VALIDATION_FAILED');
    expect(badNameErr.error.details).toEqual([
      expect.objectContaining({ path: 'name' }),
    ]);
  });
});
