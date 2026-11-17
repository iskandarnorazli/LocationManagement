// The `test` every e2e spec imports (D24): Playwright's, plus a listener that counts the
// browser's register and login requests against D21's budget (auth.ts).
import { test as base } from '@playwright/test';
import { authCallOf, recordAuthCall } from './auth';

export const test = base.extend({
  page: async ({ page }, use) => {
    page.on('request', (req) => {
      const call = authCallOf(req.method(), req.url());
      if (call) recordAuthCall(call);
    });
    await use(page);
  },
});

export { expect } from '@playwright/test';
