// Test wiring (D18): a fixed clock and sequential ids, so a failing run replays exactly.
import { UserResponse, type User } from '@lm/shared';
import type { Express } from 'express';
import { pino } from 'pino';
import type { Pool } from 'pg';
import request, { type Response } from 'supertest';
import type { z } from 'zod';
import { expect } from 'vitest';
import { createApp } from '../src/app';
import { createPool } from '../src/db/pool';
import type { Deps } from '../src/deps';
import { fixedClock, sequentialIds } from '../src/ports';

export const TEST_SECRET = 'test-secret-that-is-at-least-32-characters-long';
export const T0 = Date.UTC(2026, 10, 16, 9, 0, 0);

export function testPool(): Pool {
  return createPool(process.env.DATABASE_URL as string);
}

export function testDeps(db: Pool, overrides: Partial<Deps> = {}): Deps {
  return {
    db,
    logger: pino({ level: 'silent' }),
    clock: fixedClock(T0),
    ids: sequentialIds(),
    config: { JWT_SECRET: TEST_SECRET, COOKIE_SECURE: false },
    ...overrides,
  };
}

export function testApp(db: Pool, overrides: Partial<Deps> = {}) {
  return createApp(testDeps(db, overrides));
}

/**
 * Contract check (D20): the response has this status and its body parses with the shared
 * schema the web also uses. Use it for every response a test reads.
 */
export function expectBody<S extends z.ZodType>(res: Response, status: number, schema: S): z.infer<S> {
  expect(res.status, JSON.stringify(res.body)).toBe(status);
  const parsed = schema.safeParse(res.body);
  if (!parsed.success) throw new Error(`Body does not match the contract: ${parsed.error.message}`);
  return parsed.data;
}

/** Deletes every user and location; call in beforeEach of tests that write. */
export async function resetData(db: Pool): Promise<void> {
  await db.query('TRUNCATE locations, users');
}

/** Registers a user via POST /api/auth/register and returns a cookie-keeping agent. */
export async function signUp(
  app: Express,
  email: string,
  password = 'password123',
): Promise<{ agent: ReturnType<typeof request.agent>; user: User }> {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({ email, password });
  const { user } = expectBody(res, 201, UserResponse);
  return { agent, user };
}
