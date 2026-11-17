import { ErrorBody, UserResponse } from '@lm/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as passwordModule from '../src/auth/password';
import { asUserId } from '../src/auth/userId';
import { signSession } from '../src/auth/session';
import { fixedClock } from '../src/ports';
import { expectBody, resetData, T0, TEST_SECRET, testApp, testDeps, testPool } from './helpers';

const pool = testPool();

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await resetData(pool);
});

function getSetCookie(res: request.Response): string {
  const header = res.headers['set-cookie'];
  expect(header).toBeDefined();
  const list = Array.isArray(header) ? header : [String(header)];
  expect(list.length).toBeGreaterThanOrEqual(1);
  return list[0]!;
}

describe('auth endpoints and session cookie (D6)', () => {
  it('registers a user, sets httpOnly cookie, and returns UserResponse', async () => {
    const app = testApp(pool);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: '  Alice@Example.com ', password: 'password123' });

    const body = expectBody(res, 201, UserResponse);
    expect(body.user.email).toBe('alice@example.com');

    const cookie = getSetCookie(res);
    expect(cookie).toMatch(/^session=[^;]+/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/api');
    expect(cookie).toContain('Max-Age=3600');
    expect(cookie).not.toContain('Secure');
  });

  it('sets Secure on cookie exactly when COOKIE_SECURE=true', async () => {
    const app = testApp(pool, { config: { JWT_SECRET: TEST_SECRET, COOKIE_SECURE: true } });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'secure@example.com', password: 'password123' });

    expectBody(res, 201, UserResponse);
    expect(getSetCookie(res)).toContain('Secure');
  });

  it('rejects invalid register input with 400 VALIDATION_FAILED', async () => {
    const app = testApp(pool);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'short' });

    const err = expectBody(res, 400, ErrorBody);
    expect(err.error.code).toBe('VALIDATION_FAILED');
  });

  it('rejects duplicate email case-insensitively with 409 EMAIL_TAKEN', async () => {
    const app = testApp(pool);
    const first = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@x.com', password: 'password123' });
    expectBody(first, 201, UserResponse);

    const second = await request(app)
      .post('/api/auth/register')
      .send({ email: 'A@x.com', password: 'password123' });
    const err = expectBody(second, 409, ErrorBody);
    expect(err.error.code).toBe('EMAIL_TAKEN');
  });

  it('logs in, reads /me, and logs out via cookie-keeping agent', async () => {
    const app = testApp(pool);
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bob@example.com', password: 'password123' });
    expectBody(reg, 201, UserResponse);

    const agent = request.agent(app);
    const login = await agent
      .post('/api/auth/login')
      .send({ email: ' BOB@Example.com ', password: 'password123' });
    const loginBody = expectBody(login, 200, UserResponse);
    expect(loginBody.user.email).toBe('bob@example.com');

    const me = await agent.get('/api/auth/me');
    const meBody = expectBody(me, 200, UserResponse);
    expect(meBody.user.id).toBe(loginBody.user.id);

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(204);
    expect(logout.text).toBe('');
    expect(getSetCookie(logout)).toContain('Max-Age=0');

    const afterLogout = await agent.get('/api/auth/me');
    const err = expectBody(afterLogout, 401, ErrorBody);
    expect(err.error.code).toBe('UNAUTHENTICATED');
  });

  it('no token in bodies across all four endpoints', async () => {
    const app = testApp(pool);
    const agent = request.agent(app);

    const reg = await agent
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'password123' });
    expectBody(reg, 201, UserResponse);
    expect(JSON.stringify(reg.body)).not.toMatch(/token|passwordHash/i);

    const login = await agent
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'password123' });
    expectBody(login, 200, UserResponse);
    expect(JSON.stringify(login.body)).not.toMatch(/token|passwordHash/i);

    const me = await agent.get('/api/auth/me');
    expectBody(me, 200, UserResponse);
    expect(JSON.stringify(me.body)).not.toMatch(/token|passwordHash/i);

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(204);
    expect(logout.text).toBe('');
  });

  it('returns the same INVALID_CREDENTIALS for unknown email and wrong password', async () => {
    const app = testApp(pool);
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'known@example.com', password: 'password123' });

    const unknownRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@example.com', password: 'password123' });
    const unknownErr = expectBody(unknownRes, 401, ErrorBody);

    const wrongPwRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'known@example.com', password: 'wrong-password' });
    const wrongPwErr = expectBody(wrongPwRes, 401, ErrorBody);

    expect(unknownErr.error.code).toBe('INVALID_CREDENTIALS');
    expect(wrongPwErr.error.code).toBe('INVALID_CREDENTIALS');
    expect(wrongPwErr.error.message).toBe(unknownErr.error.message);
  });

  it('rejects invalid login input with 400 VALIDATION_FAILED', async () => {
    const app = testApp(pool);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bad', password: '123' });
    const err = expectBody(res, 400, ErrorBody);
    expect(err.error.code).toBe('VALIDATION_FAILED');
  });

  it('returns 401 UNAUTHENTICATED when cookie is missing or signed with another secret', async () => {
    const app = testApp(pool);
    const missing = await request(app).get('/api/auth/me');
    expect(expectBody(missing, 401, ErrorBody).error.code).toBe('UNAUTHENTICATED');

    const logoutMissing = await request(app).post('/api/auth/logout');
    expect(expectBody(logoutMissing, 401, ErrorBody).error.code).toBe('UNAUTHENTICATED');

    const wrongToken = await signSession(
      asUserId('00000000-0000-0000-0000-000000000001'),
      fixedClock(T0),
      'another-secret-that-is-at-least-32-chars',
    );
    const wrongSecretRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `session=${wrongToken}`);
    expect(expectBody(wrongSecretRes, 401, ErrorBody).error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 401 TOKEN_EXPIRED when the token has expired via fixed clock', async () => {
    const clock = fixedClock(T0);
    const deps = testDeps(pool, { clock });
    const app = testApp(pool, deps);

    const agent = request.agent(app);
    const reg = await agent
      .post('/api/auth/register')
      .send({ email: 'exp@example.com', password: 'password123' });
    expectBody(reg, 201, UserResponse);

    clock.advance(3601_000);

    const me = await agent.get('/api/auth/me');
    const err = expectBody(me, 401, ErrorBody);
    expect(err.error.code).toBe('TOKEN_EXPIRED');
  });

  it('login with an unknown email still runs verifyPassword once', async () => {
    const app = testApp(pool);
    const spy = vi.spyOn(passwordModule, 'verifyPassword');
    try {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' });

      const err = expectBody(res, 401, ErrorBody);
      expect(err.error.code).toBe('INVALID_CREDENTIALS');
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });
});
