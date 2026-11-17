// One entry per row of the Screens table in docs/UX_FLOWS.md (check-ux.mjs keeps them equal).
// A built state has `open`, which brings a fresh page to exactly that state with fixed data.
import type { Page } from '@playwright/test';
import { poolEmail, POOL_PASSWORD, signInAs } from './auth';

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
  { id: 'S3.empty', status: 'planned' },
  { id: 'S3.markers', status: 'planned' },
  { id: 'S3.popup', status: 'planned' },
  { id: 'S3.invalid', status: 'planned' },
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
  { id: 'S3.sheetOpen', status: 'planned' },
  { id: 'S3.focus', status: 'planned' },
  { id: 'S4.idle', status: 'planned' },
  { id: 'S4.chosen', status: 'planned' },
  { id: 'S4.success', status: 'planned' },
  { id: 'S4.error', status: 'planned' },
  { id: 'S4.afterStay', status: 'planned' },
];
