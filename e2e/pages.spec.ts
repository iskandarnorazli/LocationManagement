// R1: the four pages exist and open at their URLs.
import { signInAs } from './auth';
import { expect, test } from './test';

test('register, login, map and upload pages open at their URLs (R1)', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  await signInAs(page);
  await page.goto('/map');
  await expect(page.getByRole('heading', { name: 'Map' })).toBeAttached();
  await page.goto('/upload');
  await expect(page.getByRole('heading', { name: 'Upload', exact: true })).toBeVisible();
});
