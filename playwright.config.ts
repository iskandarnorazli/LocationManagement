import { defineConfig } from '@playwright/test';

// End-to-end tests drive the whole stack: `docker compose up -d --build` for db and api, and
// the web dev server that Playwright starts below.
export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev -w @lm/web',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
