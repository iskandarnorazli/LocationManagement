import { expect, test } from '@playwright/test';
import { startFlow } from './flow';

test('F6: sign out within budget', async ({ page }) => {
  const email = `f6-${Date.now()}@example.com`;
  await page.request.post('/api/auth/register', {
    data: { email, password: 'password123' },
  });

  await page.goto('/map');
  await page.getByRole('heading', { name: 'Map' }).waitFor();

  const flow = startFlow(page, 'F6');
  await flow.step('log out', () => page.getByRole('button', { name: 'Log out' }).click());

  await page.waitForURL('**/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await flow.done();
});
