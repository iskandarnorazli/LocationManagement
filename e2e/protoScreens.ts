// Screenshots of the three layout prototypes for #11 (branch proto/lm-layouts, never merged).
// Ids are <state>.<layout>, so the snapshot comment lists A, B and C of each state together.
import type { Page } from '@playwright/test';

const STATES = ['markers', 'sheetOpen', 'popup', 'invalid', 'nav', 'afterMap', 'upload', 'success', 'error', 'afterStay'];
// A, B and C were compared on the first two commits of PR #67; D is the owner's pick.
const LAYOUTS = ['D'];

async function open(page: Page, layout: string, state: string) {
  await page.goto(`/proto/${layout.toLowerCase()}/${state}`);
  await page.locator('nav[aria-label="Main"]').first().waitFor({ state: 'attached' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(300);
}

export const PROTO_SCREENS = STATES.flatMap((state) =>
  LAYOUTS.map((layout) => ({
    id: `${state}.${layout}`,
    status: 'built' as const,
    open: (page: Page) => open(page, layout, state),
  })),
);
