// Runs once after every e2e or snapshot run (D24, #86): prints how much of D21's per-IP auth
// budget the run spent, and fails the run when it spent more than the API allows a minute.
import { existsSync, readFileSync } from 'node:fs';
import { AUTH_BUDGET, COUNTER_FILE } from './auth';

export default async function globalTeardown(): Promise<void> {
  const lines = existsSync(COUNTER_FILE) ? readFileSync(COUNTER_FILE, 'utf8').split('\n') : [];
  const register = lines.filter((l) => l === 'register').length;
  const login = lines.filter((l) => l === 'login').length;
  console.log(
    `e2e auth budget (D24): ${register}/${AUTH_BUDGET.register} registrations, ${login}/${AUTH_BUDGET.login} logins`,
  );
  if (register > AUTH_BUDGET.register || login > AUTH_BUDGET.login) {
    throw new Error(
      `e2e spent more auth calls than D21 allows from one IP a minute ` +
        `(${register} registrations, ${login} logins). Sign specs in with signInAs() (e2e/auth.ts).`,
    );
  }
}
