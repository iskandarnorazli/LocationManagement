// The `test` every e2e spec imports (D24): Playwright's, plus a listener that counts the
// browser's register and login requests that reach the API against D21's budget (auth.ts). With
// SNAP_DIR set, the video of a flow spec ("F<n>: ...") or of the demo ("Demo: ...") is saved to
// SNAP_DIR/videos/<F<n>|Demo>.webm.
import path from 'node:path';
import { test as base } from '@playwright/test';
import { authCallOf, recordAuthCall } from './auth';
import { SNAP_DIR, wanted } from './ux';

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    page.on('response', (res) => {
      const req = res.request();
      const call = authCallOf(req.method(), req.url(), res.headers()['x-request-id'] !== undefined);
      if (call) recordAuthCall(call);
    });
    await use(page);
    const flow = /^(F\d+|Demo):/.exec(testInfo.title)?.[1];
    const video = page.video();
    if (SNAP_DIR && flow && wanted(flow) && video) {
      // Let the recording catch the flow's end state before it stops (only when recording).
      await page.waitForTimeout(700);
      await page.close();
      await video.saveAs(path.join(SNAP_DIR, 'videos', `${flow}.webm`));
    }
  },
});

export { expect } from '@playwright/test';
