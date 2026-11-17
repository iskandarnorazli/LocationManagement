// How e2e signs in under D21's per-IP limits (D24, #86). Every request from the test machine
// reaches the API from one address, so the whole run shares one budget: at most 5 registrations
// and 10 logins a minute. The run spends it like this:
// - global-setup.ts registers one pool user per run and saves its cookie;
// - specs that need a signed-in user call signInAs(page), which adds that cookie (no auth call);
// - only the flows that measure auth (F1, F2, F7) and the screens that show auth errors
//   (S1.taken, S2.wrong) send real register or login requests.
// Every auth request is counted (the `test` fixture in test.ts for the browser, apiRegister for
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
export const STATE_FILE = path.join(AUTH_DIR, 'pool-user.json');

/** The run's pool user. global-setup.ts sets E2E_RUN; workers inherit it. */
export function poolEmail(): string {
  const run = process.env.E2E_RUN;
  if (!run) throw new Error('E2E_RUN is not set: run through playwright.config.ts (globalSetup)');
  return `pool-${run}@example.com`;
}

export type AuthCall = 'register' | 'login';

export function recordAuthCall(kind: AuthCall): void {
  mkdirSync(AUTH_DIR, { recursive: true });
  appendFileSync(COUNTER_FILE, `${kind}\n`);
}

export function authCallOf(method: string, url: string): AuthCall | null {
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

/** Signs the page in as the pool user with the cookie global-setup.ts saved: no request. */
export async function signInAs(page: Page): Promise<void> {
  const state = JSON.parse(readFileSync(STATE_FILE, 'utf8')) as {
    cookies: Parameters<ReturnType<Page['context']>['addCookies']>[0];
  };
  await page.context().addCookies(state.cookies);
}
