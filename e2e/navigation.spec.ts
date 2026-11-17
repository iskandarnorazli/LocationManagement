// R2: the sidebar moves between the pages and logs out.
import { signInAs } from './auth';
import { mapReady } from './locations';
import { expect, test } from './test';

test('the sidebar goes between Map and Upload and logs out (R2)', async ({ page }) => {
  await signInAs(page);
  await page.goto('/map');
  await mapReady(page);
  const sidebar = page.getByRole('navigation', { name: 'Primary' });

  await sidebar.getByRole('link', { name: 'Upload' }).click();
  await page.waitForURL('**/upload');
  await expect(page.getByRole('heading', { name: 'Upload', exact: true })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Upload' })).toHaveAttribute('aria-current', 'page');

  await sidebar.getByRole('link', { name: 'Map' }).click();
  await page.waitForURL('**/map');
  await expect(sidebar.getByRole('link', { name: 'Map' })).toHaveAttribute('aria-current', 'page');

  await page.getByRole('button', { name: 'Log out' }).click();
  await page.waitForURL('**/login');
  await page.goto('/map');
  await page.waitForURL('**/login');
});
