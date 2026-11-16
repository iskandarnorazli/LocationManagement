import { expect, test } from '@playwright/test';

test('the web app loads and the API behind its proxy is ready', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Location Management' })).toBeVisible();
  const ready = await request.get('http://localhost:3000/health/ready');
  expect(ready.status()).toBe(200);
});
