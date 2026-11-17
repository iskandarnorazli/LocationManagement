// How e2e signs in under D21's per-IP limits (D24, #86). Every request from the test machine
// reaches the API from one address, so the whole run shares one budget: at most 5 registrations
// and 10 logins a minute. The run spends it like this:
// - global-setup.ts registers the pool users (alice, and bob for R5's two-user check) once per
//   run and saves their cookies;
// - specs that need a signed-in user call signInAs(page, user?), which adds that cookie (no call);
// - only the flows that measure auth (F1, F2, F7) and the screens that show auth errors
//   (S1.taken, S2.wrong) send real register or login requests.
// Every auth request that reaches the API is counted (the `test` fixture in test.ts counts browser
// responses that carry the API's X-Request-Id, so stubbed answers cost nothing; apiRegister counts
// API calls), and global-teardown.ts fails the run when a count passes the budget.
// No other e2e file may call /api/auth/ directly; global-setup.ts checks.
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { APIRequestContext, Page } from '@playwright/test';

/** D21: registrations and logins a minute from one IP (apps/api/src/http/limits.ts, LIMITS). */
export const AUTH_BUDGET = { register: 5, login: 10 } as const;
export const POOL_PASSWORD = 'password123';
export const API_URL = 'http://localhost:3000';

export const AUTH_DIR = path.resolve(import.meta.dirname, '..', '.tmp', 'e2e-auth');
export const COUNTER_FILE = path.join(AUTH_DIR, 'auth-calls.log');
export type PoolUser = 'alice' | 'bob';
export const POOL_USERS: PoolUser[] = ['alice', 'bob'];
export const stateFile = (user: PoolUser) => path.join(AUTH_DIR, `pool-${user}.json`);

/** A pool user's email for this run. global-setup.ts sets E2E_RUN; workers inherit it. */
export function poolEmail(user: PoolUser = 'alice'): string {
  const run = process.env.E2E_RUN;
  if (!run) throw new Error('E2E_RUN is not set: run through playwright.config.ts (globalSetup)');
  return `${user}-${run}@example.com`;
}

export type AuthCall = 'register' | 'login';

export function recordAuthCall(kind: AuthCall): void {
  mkdirSync(AUTH_DIR, { recursive: true });
  appendFileSync(COUNTER_FILE, `${kind}\n`);
}

/** The auth call a browser response stands for, if it came from the API (stubs carry no X-Request-Id). */
export function authCallOf(method: string, url: string, fromApi = true): AuthCall | null {
  if (!fromApi) return null;
  if (method !== 'POST') return null;
  const { pathname } = new URL(url);
  if (pathname === '/api/auth/register') return 'register';
  if (pathname === '/api/auth/login') return 'login';
  return null;
}

/** Registers through the API and counts the call. The context keeps the session cookie. */
export async function apiRegister(request: APIRequestContext, email: string): Promise<void> {
  recordAuthCall('register');
  const res = await request.post(`${API_URL}/api/auth/register`, {
    data: { email, password: POOL_PASSWORD },
  });
  if (res.status() !== 201) {
    throw new Error(`register ${email} answered ${res.status()}: ${await res.text()}`);
  }
}

/** Signs the page in as a pool user with the cookie global-setup.ts saved: no request. */
export async function signInAs(page: Page, user: PoolUser = 'alice'): Promise<void> {
  const state = JSON.parse(readFileSync(stateFile(user), 'utf8')) as {
    cookies: Parameters<ReturnType<Page['context']>['addCookies']>[0];
  };
  await page.context().addCookies(state.cookies);
}

/** Answers the next registration with the API's 409 EMAIL_TAKEN, for the S1.taken screenshot. */
export async function stubRegisterTaken(page: Page): Promise<void> {
  await page.route('**/api/auth/register', (route) =>
    route.fulfill({
      status: 409,
      json: {
        error: {
          code: 'EMAIL_TAKEN',
          message: 'An account with this email already exists.',
          requestId: '00000000-0000-4000-8000-000000000409',
        },
      },
    }),
  );
}
