// The README's demo (#13): the whole app in one take. Its own Playwright project (`demo`), run only
// by the UI snapshots workflow with SNAP_DIR set: e2e/test.ts saves the video to
// SNAP_DIR/videos/Demo.webm and the workflow makes Demo.gif and the lighter Demo-readme.gif. Both
// are copied to docs/ when a screen changes. Never edit the recording by hand.
// Budget (D24): one real registration, the new user's; everything else is signed in already.
import { POOL_PASSWORD } from './auth';
import { expect, test } from './test';
import { SAMPLE_ZIP } from './uploads';

// Pauses let a viewer follow the recording; nothing asserts on time.
const beat = (page: import('@playwright/test').Page, ms = 900) => page.waitForTimeout(ms);

test('Demo: register, add a location, open it, see the list, upload a ZIP, log out', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/register');
  await beat(page);
  await page.getByLabel('Email').pressSequentially(`demo-${Date.now()}@example.com`, { delay: 25 });
  await page.getByLabel('Password').pressSequentially(POOL_PASSWORD, { delay: 25 });
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/map');
  await page.getByRole('button', { name: 'Swipe up for your locations (0)' }).waitFor();
  await beat(page);

  await page.getByLabel('Name').pressSequentially('Menara KL', { delay: 40 });
  await page.getByLabel('Latitude').pressSequentially('3.152815', { delay: 40 });
  await page.getByLabel('Longitude').pressSequentially('101.703764', { delay: 40 });
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const marker = page.getByRole('button', { name: 'Menara KL' });
  await marker.waitFor();
  await beat(page);
  await marker.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.leaflet-popup').getByText('Menara KL')).toBeVisible();
  await beat(page, 1200);

  const handle = page.getByRole('button', { name: 'Swipe up for your locations (1)' });
  const box = await handle.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y - 120, { steps: 12 });
    await page.mouse.up();
  }
  await expect(page.getByRole('heading', { name: 'Your locations (1)' })).toBeVisible();
  await beat(page, 1200);

  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Upload' }).click();
  await page.waitForURL('**/upload');
  await beat(page);
  await page.locator('#zip-file').setInputFiles(SAMPLE_ZIP);
  await beat(page, 600);
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Closes in 3 seconds' })).toBeVisible();
  await page.getByRole('link', { name: 'See them on the map' }).waitFor({ timeout: 10_000 });
  await beat(page, 1200);
  await page.getByRole('link', { name: 'See them on the map' }).click();
  await page.waitForURL('**/map');
  await expect(page.getByRole('heading', { name: 'Your locations (2)' })).toBeVisible();
  await beat(page, 1500);

  await page.getByRole('button', { name: 'Log out' }).click();
  await page.waitForURL('**/login');
  await beat(page);
});
