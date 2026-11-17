import { expect, test } from '@playwright/test';
import { startFlow } from './flow';

test('F2: sign in within budget', async ({ page }) => {
  const email = `f2-${Date.now()}@example.com`;
  await page.request.post('/api/auth/register', {
    data: { email, password: 'password123' },
  });
  await page.context().clearCookies();

  await page.goto('/login');
  await page.getByRole('heading', { name: 'Sign in' }).waitFor();

  const flow = startFlow(page, 'F2');
  await flow.step('fill email', () => page.getByLabel('Email').fill(email));
  await flow.step('fill password', () => page.getByLabel('Password').fill('password123'));
  await flow.step('submit', () => page.getByRole('button', { name: 'Sign in' }).click());

  await page.waitForURL('**/map');
  await expect(page.getByRole('heading', { name: 'Map' })).toBeVisible();
  await flow.done();
});
