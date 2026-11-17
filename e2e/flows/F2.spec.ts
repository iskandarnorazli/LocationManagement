import { poolEmail, POOL_PASSWORD } from '../auth';
import { expect, test } from '../test';
import { startFlow } from './flow';

test('F2: sign in within budget', async ({ page }) => {
  const email = poolEmail();

  await page.goto('/login');
  await page.getByRole('heading', { name: 'Sign in' }).waitFor();

  const flow = startFlow(page, 'F2');
  await flow.step('fill email', () => page.getByLabel('Email').fill(email));
  await flow.step('fill password', () => page.getByLabel('Password').fill(POOL_PASSWORD));
  await flow.step('submit', () => page.getByRole('button', { name: 'Sign in' }).click());

  await page.waitForURL('**/map');
  await expect(page.getByRole('heading', { name: 'Map' })).toBeVisible();
  await flow.done();
});
