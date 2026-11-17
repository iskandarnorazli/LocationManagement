import { poolEmail, POOL_PASSWORD } from '../auth';
import { expect, test } from '../test';
import { startFlow } from './flow';

test('F7: open protected page while signed out, sign in, land on that page', async ({ page }) => {
  const email = poolEmail();

  await page.goto('/upload');
  await page.waitForURL('**/login');
  await page.getByRole('heading', { name: 'Sign in' }).waitFor();

  const flow = startFlow(page, 'F7');
  await flow.step('fill email', () => page.getByLabel('Email').fill(email));
  await flow.step('fill password', () => page.getByLabel('Password').fill(POOL_PASSWORD));
  await flow.step('submit', () => page.getByRole('button', { name: 'Sign in' }).click());

  await page.waitForURL('**/upload');
  await expect(page.getByRole('heading', { name: 'Upload' })).toBeVisible();
  await flow.done();
});
