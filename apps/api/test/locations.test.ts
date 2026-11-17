import { ErrorBody, LocationResponse, LocationsResponse } from '@lm/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { expectBody, resetData, signUp, T0, testApp, testPool } from './helpers';

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

  it('lists locations in insertion order even when ids are descending (D22)', async () => {
    let next = 99;
    const descendingIds = {
      uuid: () => {
        const n = String(next--).padStart(12, '0');
        return `00000000-0000-4000-8000-${n}`;
      },
    };
    const app = testApp(pool, { ids: descendingIds });
    const { agent } = await signUp(app, 'seq@example.com');

    const names = ['First', 'Second', 'Third'];
    for (const name of names) {
      const res = await agent
        .post('/api/locations')
        .send({ name, latitude: 3.1, longitude: 101.6 });
      expectBody(res, 201, LocationResponse);
    }

    // Force identical created_at (as in a single transaction or same clock tick) so id tie-breaking is exercised.
    await pool.query('UPDATE locations SET created_at = $1', [new Date(T0)]);

    const list = await agent.get('/api/locations');
    const body = expectBody(list, 200, LocationsResponse);
    expect(body.locations.map((l) => l.name)).toEqual(names);
  });
});
