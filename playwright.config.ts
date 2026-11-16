import { defineConfig } from '@playwright/test';

// Two projects over the same stack (`docker compose up -d --build` for db and api, and the web
// dev server Playwright starts below):
// - e2e: behaviour, including the flow specs that enforce the step budgets of docs/UX_FLOWS.md
// - snapshots: one screenshot per built screen state (e2e/screens.ts) per viewport
export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  projects: [
    { name: 'e2e', testIgnore: /snapshots\.spec\.ts/ },
    { name: 'snapshots', testMatch: /snapshots\.spec\.ts/ },
  ],
  webServer: {
    command: 'npm run dev -w @lm/web',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
