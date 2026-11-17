import { defineConfig } from '@playwright/test';

// Two projects over the same stack (`docker compose up -d --build` for db and api, and the web
// dev server Playwright starts below):
// - e2e: behaviour, including the flow specs that enforce the step budgets of docs/UX_FLOWS.md
// - snapshots: one screenshot per built screen state (e2e/screens.ts) per viewport
export default defineConfig({
  testDir: 'e2e',
  // D24 (#86): one pool user per run, and a check that the run stays inside D21's auth budget.
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'e2e',
      testIgnore: /(snapshots|demo)\.spec\.ts/,
      // With SNAP_DIR set (the UI snapshots workflow), each flow is also recorded as a video:
      // e2e/test.ts saves it to SNAP_DIR/videos/<Flow>.webm, and the workflow makes a GIF of it.
      use: { video: process.env.SNAP_DIR ? { mode: 'on', size: { width: 960, height: 540 } } : 'off' },
    },
    { name: 'snapshots', testMatch: /snapshots\.spec\.ts/ },
    // The README's demo (#13), recorded only by the UI snapshots workflow: `--project=demo`.
    {
      name: 'demo',
      testMatch: /demo\.spec\.ts/,
      use: { video: { mode: 'on', size: { width: 1280, height: 720 } } },
    },
  ],
  webServer: {
    command: 'npm run dev -w @lm/web',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
