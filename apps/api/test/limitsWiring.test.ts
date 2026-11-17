import { ErrorBody, ImportResponse, UserResponse } from '@lm/shared';
import { strToU8, zipSync } from 'fflate';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as passwordModule from '../src/auth/password';
import * as readSingleTextFileModule from '../src/import/readSingleTextFile';
import { LIMITS } from '../src/http/limits';
import { fixedClock } from '../src/ports';
import { expectBody, resetData, signUp, T0, testApp, testPool } from './helpers';

const pool = testPool();

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await resetData(pool);
  vi.restoreAllMocks();
});

function makeZipBuffer(text = 'Name,Latitude,Longitude\nKLCC,3.1579,101.7116\n'): Buffer {
  return Buffer.from(zipSync({ 'locations.txt': [strToU8(text), { level: 6 }] }));
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('D21 limits wiring on import, login, and register', () => {
  it('rate-limits the 11th import per user per minute, isolates other users, and resets after 60s', async () => {
    const clock = fixedClock(T0);
    const app = testApp(pool, { clock });
    const userA = await signUp(app, 'import-a@example.com');
    const userB = await signUp(app, 'import-b@example.com');
    const zip = makeZipBuffer();

    for (let i = 0; i < LIMITS.importPerUserPerMinute; i += 1) {
      const res = await userA.agent
        .post('/api/locations/import')
        .attach('file', zip, 'locations.zip');
      expectBody(res, 201, ImportResponse);
    }

    const blocked = await userA.agent
      .post('/api/locations/import')
      .attach('file', zip, 'locations.zip');
    const err = expectBody(blocked, 429, ErrorBody);
    expect(err.error.code).toBe('RATE_LIMITED');
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThanOrEqual(1);

    // Another user is unaffected.
    const otherUserRes = await userB.agent
      .post('/api/locations/import')
      .attach('file', zip, 'locations.zip');
    expectBody(otherUserRes, 201, ImportResponse);

    // After 60_000 ms, userA's window resets and succeeds.
    clock.advance(60_000);
    const afterWindow = await userA.agent
      .post('/api/locations/import')
      .attach('file', zip, 'locations.zip');
    expectBody(afterWindow, 201, ImportResponse);
  });

  it('caps concurrent imports at 4 and admits the next once one finishes', async () => {
    const gates = Array.from({ length: LIMITS.importConcurrency }, () => deferred());
    let entered = 0;
    let allEnteredResolve!: () => void;
    const allEntered = new Promise<void>((r) => {
      allEnteredResolve = r;
    });

    const gatedDb = new Proxy(pool, {
      get(target, prop) {
        if (prop === 'connect') {
          return async () => {
            const gate = gates[entered];
            entered += 1;
            if (entered === LIMITS.importConcurrency) {
              allEnteredResolve();
            }
            if (gate) {
              await gate.promise;
            }
            return target.connect();
          };
        }
        const value = Reflect.get(target, prop, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });

    const app = testApp(pool, { db: gatedDb });
    const { agent } = await signUp(app, 'concurrent@example.com');
    const zip = makeZipBuffer();

    const inFlight = Array.from({ length: LIMITS.importConcurrency }, () =>
      agent
        .post('/api/locations/import')
        .attach('file', zip, 'locations.zip')
        .then((r) => r),
    );

    await allEntered;

    const fifth = await agent
      .post('/api/locations/import')
      .attach('file', zip, 'locations.zip');
    const err = expectBody(fifth, 429, ErrorBody);
    expect(err.error.code).toBe('RATE_LIMITED');
    expect(fifth.headers['retry-after']).toBe('1');

    gates[0]!.resolve();
    expectBody(await inFlight[0]!, 201, ImportResponse);

    const sixth = await agent
      .post('/api/locations/import')
      .attach('file', zip, 'locations.zip');
    expectBody(sixth, 201, ImportResponse);

    for (let i = 1; i < gates.length; i += 1) {
      gates[i]!.resolve();
    }
    const remaining = await Promise.all(inFlight.slice(1));
    for (const res of remaining) {
      expectBody(res, 201, ImportResponse);
    }
  });

  it('rate-limits the 11th login from one IP even with the right password', async () => {
    const clock = fixedClock(T0);
    const app = testApp(pool, { clock });
    const email = 'login-limit@example.com';
    const password = 'password123';
    await signUp(app, email, password);

    for (let i = 0; i < LIMITS.loginPerIpPerMinute; i += 1) {
      const res = await request(app).post('/api/auth/login').send({ email, password });
      expectBody(res, 200, UserResponse);
    }

    const blocked = await request(app).post('/api/auth/login').send({ email, password });
    const err = expectBody(blocked, 429, ErrorBody);
    expect(err.error.code).toBe('RATE_LIMITED');
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThanOrEqual(1);
  });

  it('rate-limits the 6th registration from one IP', async () => {
    const clock = fixedClock(T0);
    const app = testApp(pool, { clock });

    for (let i = 0; i < LIMITS.registerPerIpPerMinute; i += 1) {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: `reg-${i}@example.com`, password: 'password123' });
      expectBody(res, 201, UserResponse);
    }

    const blocked = await request(app)
      .post('/api/auth/register')
      .send({ email: 'reg-blocked@example.com', password: 'password123' });
    const err = expectBody(blocked, 429, ErrorBody);
    expect(err.error.code).toBe('RATE_LIMITED');
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThanOrEqual(1);
  });

  it('runs limits before expensive work on import and login', async () => {
    const clock = fixedClock(T0);
    const app = testApp(pool, { clock });
    const email = 'expensive@example.com';
    const password = 'password123';
    const { agent } = await signUp(app, email, password);
    const zip = makeZipBuffer();

    // Exhaust import rate limit, then spy on readSingleTextFile.
    for (let i = 0; i < LIMITS.importPerUserPerMinute; i += 1) {
      expectBody(
        await agent.post('/api/locations/import').attach('file', zip, 'locations.zip'),
        201,
        ImportResponse,
      );
    }

    const readZipSpy = vi.spyOn(readSingleTextFileModule, 'readSingleTextFile');
    const blockedImport = await agent
      .post('/api/locations/import')
      .attach('file', zip, 'locations.zip');
    expectBody(blockedImport, 429, ErrorBody);
    expect(readZipSpy).not.toHaveBeenCalled();

    // Exhaust login rate limit, then spy on verifyPassword.
    for (let i = 0; i < LIMITS.loginPerIpPerMinute; i += 1) {
      expectBody(
        await request(app).post('/api/auth/login').send({ email, password }),
        200,
        UserResponse,
      );
    }

    const verifySpy = vi.spyOn(passwordModule, 'verifyPassword');
    const blockedLogin = await request(app).post('/api/auth/login').send({ email, password });
    expectBody(blockedLogin, 429, ErrorBody);
    expect(verifySpy).not.toHaveBeenCalled();
  });
});
