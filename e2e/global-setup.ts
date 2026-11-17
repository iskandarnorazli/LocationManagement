// Runs once before every e2e or snapshot run (D24, #86).
// 1. Refuses specs that would bypass the auth budget: a direct call to /api/auth/, or a `test`
//    imported straight from @playwright/test (whose page has no counting listener).
// 2. Resets the auth-call counter.
// 3. Registers the run's pool user through the API and saves its cookie for signInAs().
import { readdirSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { request } from '@playwright/test';
import { apiRegister, AUTH_DIR, poolEmail, STATE_FILE } from './auth';

const E2E_DIR = import.meta.dirname;
const ALLOWED_AUTH_CALLERS = new Set(['auth.ts', 'global-setup.ts']);
const ALLOWED_RAW_TEST = new Set(['test.ts', 'global-setup.ts', 'global-teardown.ts']);

function* tsFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* tsFiles(full);
    else if (entry.name.endsWith('.ts')) yield full;
  }
}

function checkSpecs(): void {
  const problems: string[] = [];
  for (const file of tsFiles(E2E_DIR)) {
    const name = path.basename(file);
    const rel = path.relative(E2E_DIR, file);
    const text = readFileSync(file, 'utf8');
    if (!ALLOWED_AUTH_CALLERS.has(name) && text.includes('/api/auth/')) {
      problems.push(`${rel}: calls /api/auth/ directly; use signInAs() or apiRegister() from auth.ts`);
    }
    if (!ALLOWED_RAW_TEST.has(name) && /import\s*\{[^}]*\btest\b[^}]*\}\s*from\s*'@playwright\/test'/.test(text)) {
      problems.push(`${rel}: imports test from @playwright/test; import it from ./test (or ../test)`);
    }
  }
  if (problems.length) {
    throw new Error(`e2e auth budget (D24):\n${problems.join('\n')}`);
  }
}

export default async function globalSetup(): Promise<void> {
  checkSpecs();
  rmSync(AUTH_DIR, { recursive: true, force: true });
  mkdirSync(AUTH_DIR, { recursive: true });
  process.env.E2E_RUN = String(Date.now());

  const ctx = await request.newContext();
  try {
    await apiRegister(ctx, poolEmail());
    await ctx.storageState({ path: STATE_FILE });
  } finally {
    await ctx.dispose();
  }
}
