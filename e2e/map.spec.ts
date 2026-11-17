// R8: a location added with the form appears as a marker without a page reload (real API).
import { signInAs } from './auth';
import { mapReady } from './locations';
import { expect, test } from './test';

test('a new location appears as a clickable marker without reloading the page (R8, R9)', async ({ page }) => {
  const name = `R8 ${Date.now()}`;
  await signInAs(page);
  await page.goto('/map');
  await mapReady(page);
  const before = await page.locator('.leaflet-marker-icon').count();
  await page.evaluate(() => {
    (window as unknown as { __sameDocument: boolean }).__sameDocument = true;
  });

  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Latitude').fill('3.1478');
  await page.getByLabel('Longitude').fill('101.6953');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  const marker = page.getByRole('button', { name });
  await expect(marker).toBeAttached();
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(before + 1);
  expect(await page.evaluate(() => (window as unknown as { __sameDocument?: boolean }).__sameDocument)).toBe(true);

  await marker.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.leaflet-popup').getByText(name)).toBeVisible();
  await expect(page.getByLabel('Name')).toHaveValue('');
});
