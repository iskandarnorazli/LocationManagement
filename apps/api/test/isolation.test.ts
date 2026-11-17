import { LocationResponse, LocationsResponse } from '@lm/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { expectBody, resetData, signUp, testApp, testPool } from './helpers';

const pool = testPool();

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await resetData(pool);
});

describe('locations user isolation (D7)', () => {
  it('isolates locations between user A and user B', async () => {
    const app = testApp(pool);
    const userA = await signUp(app, 'a@example.com');
    const userB = await signUp(app, 'b@example.com');

    const aIds: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const res = await userA.agent
        .post('/api/locations')
        .send({ name: `A-${i}`, latitude: i, longitude: i });
      aIds.push(expectBody(res, 201, LocationResponse).location.id);
    }

    const bIds: string[] = [];
    for (let i = 1; i <= 2; i++) {
      const res = await userB.agent
        .post('/api/locations')
        .send({ name: `B-${i}`, latitude: -i, longitude: -i });
      bIds.push(expectBody(res, 201, LocationResponse).location.id);
    }

    const listA = expectBody(await userA.agent.get('/api/locations'), 200, LocationsResponse);
    const listB = expectBody(await userB.agent.get('/api/locations'), 200, LocationsResponse);

    expect(listA.locations.map((l) => l.id)).toEqual(aIds);
    expect(listB.locations.map((l) => l.id)).toEqual(bIds);
  });

  it('ignores any userId in request body and assigns the row to the caller', async () => {
    const app = testApp(pool);
    const userA = await signUp(app, 'caller@example.com');
    const userB = await signUp(app, 'other@example.com');

    const created = await userA.agent.post('/api/locations').send({
      name: 'Spoof attempt',
      latitude: 3.1,
      longitude: 101.6,
      userId: userB.user.id,
    });
    const createdLoc = expectBody(created, 201, LocationResponse).location;

    const listA = expectBody(await userA.agent.get('/api/locations'), 200, LocationsResponse);
    const listB = expectBody(await userB.agent.get('/api/locations'), 200, LocationsResponse);

    expect(listA.locations.map((l) => l.id)).toEqual([createdLoc.id]);
    expect(listB.locations).toEqual([]);
  });
});
