import { expect, test } from '@playwright/test';
import { startFlow } from './flow';

test('F1: create an account within budget', async ({ page }) => {
  const email = `f1-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByRole('heading', { name: 'Create an account' }).waitFor();

  const flow = startFlow(page, 'F1');
  await flow.step('fill email', () => page.getByLabel('Email').fill(email));
  await flow.step('fill password', () => page.getByLabel('Password').fill('password123'));
  await flow.step('submit', () => page.getByRole('button', { name: 'Create account' }).click());

  await page.waitForURL('**/map');
  await expect(page.getByRole('heading', { name: 'Map' })).toBeVisible();
  await flow.done();
});
