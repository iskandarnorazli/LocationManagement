// R10-R12 against the real API: the sample ZIP imports, the popup shows for 3 s, the new row is
// highlighted on the upload page (D13), and its link opens the map with the new marker. A ZIP with
// two files shows the error popup and adds nothing.
import { signInAs } from './auth';
import { expect, test } from './test';
import { chooseZip, SAMPLE_ZIP, TWO_FILES_ZIP } from './uploads';

const countOf = async (page: import('@playwright/test').Page) =>
  Number((await page.getByRole('heading', { name: /^Your locations \(\d+\)$/ }).innerText()).match(/\d+/)?.[0]);

test('the sample ZIP imports; after the popup the row is highlighted and the link shows it on the map', async ({ page }) => {
  await page.clock.install();
  await signInAs(page);
  await page.goto('/upload');
  await page.getByRole('heading', { name: /^Your locations \(\d+\)$/ }).waitFor();
  await expect(page.getByText('Loading…')).toHaveCount(0);
  const before = await countOf(page);

  await chooseZip(page, SAMPLE_ZIP);
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  // The popup, not the banner that follows it (both are status regions).
  const popup = page.getByRole('status').filter({ hasText: 'Closes in 3 seconds' });
  await expect(popup).toContainText('1 location added');

  await page.clock.fastForward(3100);
  await page.clock.resume();
  await expect(popup).toHaveCount(0);
  await expect(page.getByRole('heading', { name: `Your locations (${before + 1})` })).toBeVisible();
  await expect(page.locator('li[aria-current="true"]')).toHaveCount(1);
  await expect(page.locator('li[aria-current="true"]')).toContainText('Suria KLCC');

  await page.getByRole('link', { name: 'See them on the map' }).click();
  await page.waitForURL('**/map');
  await expect(page.getByRole('heading', { name: `Your locations (${before + 1})` })).toBeVisible();
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(before + 1);
});

test('a ZIP with two files shows the error popup for 3 s and adds nothing (R12)', async ({ page }) => {
  await page.clock.install();
  await signInAs(page);
  await page.goto('/upload');
  await page.getByRole('heading', { name: /^Your locations \(\d+\)$/ }).waitFor();
  await expect(page.getByText('Loading…')).toHaveCount(0);
  const before = await countOf(page);

  await chooseZip(page, TWO_FILES_ZIP);
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  const popup = page.getByRole('alert').filter({ hasText: 'This one holds 2: a.txt, b.txt.' });
  await expect(popup).toBeVisible();
  await page.clock.fastForward(3100);
  await expect(popup).toHaveCount(0);
  await expect(page.getByRole('heading', { name: `Your locations (${before})` })).toBeVisible();
});
