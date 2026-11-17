// #13: the one-command stack. `docker compose up -d --build` serves the built web on :8080, and
// its nginx forwards /api and /health to the API container.
import { expect, test } from './test';

const WEB = 'http://localhost:8080';

test('the web container serves the app and forwards /api and /health to the API', async ({ request }) => {
  const home = await request.get(`${WEB}/`);
  expect(home.status()).toBe(200);
  expect(await home.text()).toContain('<div id="root">');

  const route = await request.get(`${WEB}/upload`);
  expect(route.status()).toBe(200);
  expect(await route.text()).toContain('<div id="root">');

  const ready = await request.get(`${WEB}/health/ready`);
  expect(ready.status()).toBe(200);

  const signedOut = await request.get(`${WEB}/api/locations`);
  expect(signedOut.status()).toBe(401);
  expect(((await signedOut.json()) as { error: { code: string } }).error.code).toBe('UNAUTHENTICATED');
});

test('the built app runs: a visitor to :8080 lands on Sign in', async ({ page }) => {
  await page.goto(`${WEB}/`);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});
