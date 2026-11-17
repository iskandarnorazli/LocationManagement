// The `test` every e2e spec imports (D24): Playwright's, plus a listener that counts the
// browser's register and login requests against D21's budget (auth.ts). With SNAP_DIR set, a
// flow spec's video (titles start with "F<n>:") is saved to SNAP_DIR/videos/<Flow>.webm.
import path from 'node:path';
import { test as base } from '@playwright/test';
import { authCallOf, recordAuthCall } from './auth';
import { SNAP_DIR, wanted } from './ux';

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    page.on('request', (req) => {
      const call = authCallOf(req.method(), req.url());
      if (call) recordAuthCall(call);
    });
    await use(page);
    const flow = /^(F\d+):/.exec(testInfo.title)?.[1];
    const video = page.video();
    if (SNAP_DIR && flow && wanted(flow) && video) {
      await page.close();
      await video.saveAs(path.join(SNAP_DIR, 'videos', `${flow}.webm`));
    }
  },
});

export { expect } from '@playwright/test';
