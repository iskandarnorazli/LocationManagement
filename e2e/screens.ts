// One entry per row of the Screens table in docs/UX_FLOWS.md (check-ux.mjs keeps them equal).
// A built state has `open`, which brings a fresh page to exactly that state with fixed data.
import type { Page } from '@playwright/test';
import { poolEmail, POOL_PASSWORD, signInAs } from './auth';
import { KL_IMPORTED, KL_SAVED, mapReady, stubLocations } from './locations';
import { chooseZip, SAMPLE_ZIP, stubImportOk, TWO_FILES_ZIP } from './uploads';

export type ScreenState = {
  id: string;
  status: 'built' | 'planned';
  open?: (page: Page) => Promise<void>;
};

export const SCREENS: ScreenState[] = [
  {
    id: 'S1.empty',
    status: 'built',
    open: async (page) => {
      await page.goto('/register');
      await page.getByRole('heading', { name: 'Create an account' }).waitFor();
    },
  },
  {
    id: 'S1.invalid',
    status: 'built',
    open: async (page) => {
      await page.goto('/register');
      await page.getByLabel('Email').fill('not-an-email');
      await page.getByLabel('Password').fill('short');
      await page.getByRole('button', { name: 'Create account' }).click();
      await page.locator('#email-error').waitFor();
    },
  },
  {
    id: 'S1.taken',
    status: 'built',
    open: async (page) => {
      // The pool user's email is already taken (D24): no extra registration.
      await page.goto('/register');
      await page.getByLabel('Email').fill(poolEmail());
      await page.getByLabel('Password').fill(POOL_PASSWORD);
      await page.getByRole('button', { name: 'Create account' }).click();
      await page.getByRole('alert').waitFor();
    },
  },
  {
    id: 'S2.empty',
    status: 'built',
    open: async (page) => {
      await page.goto('/login');
      await page.getByRole('heading', { name: 'Sign in' }).waitFor();
    },
  },
  {
    id: 'S2.wrong',
    status: 'built',
    open: async (page) => {
      await page.goto('/login');
      await page.getByLabel('Email').fill('nobody@example.com');
      await page.getByLabel('Password').fill('password123');
      await page.getByRole('button', { name: 'Sign in' }).click();
      await page.getByRole('alert').waitFor();
    },
  },
  {
    id: 'S3.empty',
    status: 'built',
    open: async (page) => {
      await signInAs(page);
      await stubLocations(page, []);
      await page.goto('/map');
      await mapReady(page, 0);
    },
  },
  {
    id: 'S3.markers',
    status: 'built',
    open: async (page) => {
      await signInAs(page);
      await stubLocations(page, KL_SAVED);
      await page.goto('/map');
      await mapReady(page, 3);
    },
  },
  {
    id: 'S3.popup',
    status: 'built',
    open: async (page) => {
      await signInAs(page);
      await stubLocations(page, KL_SAVED);
      await page.goto('/map');
      await mapReady(page, 3);
      await page.getByRole('button', { name: 'Suria KLCC' }).click();
      await page.locator('.leaflet-popup').getByText('Suria KLCC').waitFor();
    },
  },
  {
    id: 'S3.invalid',
    status: 'built',
    open: async (page) => {
      await signInAs(page);
      await stubLocations(page, KL_SAVED);
      await page.goto('/map');
      await mapReady(page, 3);
      await page.getByLabel('Name').fill('Menara KL');
      await page.getByLabel('Latitude').fill('91');
      await page.getByLabel('Longitude').fill('101.7038');
      await page.getByRole('button', { name: 'Add', exact: true }).click();
      await page.locator('#location-latitude-error').waitFor();
    },
  },
  {
    id: 'S3.nav',
    status: 'built',
    open: async (page) => {
      await signInAs(page);
      await page.goto('/map');
      await page.getByRole('heading', { name: 'Map' }).waitFor();
      const menuButton = page.getByRole('button', { name: 'Open menu' });
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.getByRole('dialog').waitFor();
      }
    },
  },
  {
    id: 'S3.sheetOpen',
    status: 'built',
    open: async (page) => {
      await signInAs(page);
      await stubLocations(page, KL_SAVED);
      await page.goto('/map');
      await mapReady(page, 3);
      await page.getByRole('button', { name: 'Swipe up for your locations (3)' }).click();
      await page.getByRole('heading', { name: 'Your locations (3)' }).waitFor();
    },
  },
  {
    id: 'S3.focus',
    status: 'built',
    open: async (page) => {
      await signInAs(page);
      await stubLocations(page, [...KL_SAVED, ...KL_IMPORTED]);
      await page.goto('/map');
      await mapReady(page, 6);
      // As the upload page's link does (D13): navigate with router state { focusIds }.
      const focusIds = KL_IMPORTED.map((l) => l.id);
      await page.evaluate((ids) => {
        window.history.pushState({ usr: { focusIds: ids }, key: 'focus', idx: 1 }, '', '/map');
        window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
      }, focusIds);
      await page.getByRole('heading', { name: 'Your locations (6)' }).waitFor();
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
    },
  },
  {
    id: 'S4.idle',
    status: 'built',
    open: async (page) => {
      await signInAs(page);
      await stubLocations(page, KL_SAVED);
      await page.goto('/upload');
      await page.getByRole('heading', { name: 'Your locations (3)' }).waitFor();
    },
  },
  {
    id: 'S4.chosen',
    status: 'built',
    open: async (page) => {
      await signInAs(page);
      await stubLocations(page, KL_SAVED);
      await page.goto('/upload');
      await page.getByRole('heading', { name: 'Your locations (3)' }).waitFor();
      await chooseZip(page, SAMPLE_ZIP);
      await page.getByText('one.zip', { exact: true }).waitFor();
    },
  },
  {
    id: 'S4.success',
    status: 'built',
    open: async (page) => {
      await page.clock.install();
      await stubImportOk(page);
      await signInAs(page);
      await stubLocations(page, KL_SAVED);
      await page.goto('/upload');
      await page.getByRole('heading', { name: 'Your locations (3)' }).waitFor();
      await chooseZip(page, SAMPLE_ZIP);
      await page.getByRole('button', { name: 'Upload', exact: true }).click();
      await page.getByRole('status').filter({ hasText: '3 locations added' }).waitFor();
    },
  },
  {
    id: 'S4.error',
    status: 'built',
    open: async (page) => {
      await page.clock.install();
      await signInAs(page);
      await stubLocations(page, KL_SAVED);
      await page.goto('/upload');
      await page.getByRole('heading', { name: 'Your locations (3)' }).waitFor();
      await chooseZip(page, TWO_FILES_ZIP);
      await page.getByRole('button', { name: 'Upload', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'exactly one text file' }).waitFor();
    },
  },
  {
    id: 'S4.afterStay',
    status: 'built',
    open: async (page) => {
      await page.clock.install();
      await stubImportOk(page);
      await signInAs(page);
      await stubLocations(page, KL_SAVED);
      await page.goto('/upload');
      await page.getByRole('heading', { name: 'Your locations (3)' }).waitFor();
      await chooseZip(page, SAMPLE_ZIP);
      await page.getByRole('button', { name: 'Upload', exact: true }).click();
      await page.getByRole('status').filter({ hasText: '3 locations added' }).waitFor();
      await page.clock.fastForward(3100);
      await page.getByRole('link', { name: 'See them on the map' }).waitFor();
      await page.getByRole('heading', { name: `Your locations (${KL_SAVED.length + KL_IMPORTED.length})` }).waitFor();
    },
  },
];
