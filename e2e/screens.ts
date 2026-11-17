// One entry per row of the Screens table in docs/UX_FLOWS.md (check-ux.mjs keeps them equal).
// A built state has `open`, which brings a fresh page to exactly that state with fixed data.
import type { Page } from '@playwright/test';
import { PROTO_SCREENS } from './protoScreens';

export type ScreenState = {
  id: string;
  status: 'built' | 'planned';
  open?: (page: Page) => Promise<void>;
};

export const SCREENS: ScreenState[] = [
  {
    id: 'S0.home',
    status: 'built',
    open: async (page) => {
      await page.goto('/');
      await page.getByRole('heading', { name: 'Location Management' }).waitFor();
    },
  },
  { id: 'S1.empty', status: 'planned' },
  { id: 'S1.invalid', status: 'planned' },
  { id: 'S1.taken', status: 'planned' },
  { id: 'S2.empty', status: 'planned' },
  { id: 'S2.wrong', status: 'planned' },
  { id: 'S3.empty', status: 'planned' },
  { id: 'S3.markers', status: 'planned' },
  { id: 'S3.popup', status: 'planned' },
  { id: 'S3.invalid', status: 'planned' },
  { id: 'S4.idle', status: 'planned' },
  { id: 'S4.chosen', status: 'planned' },
  { id: 'S4.success', status: 'planned' },
  { id: 'S4.error', status: 'planned' },
  ...PROTO_SCREENS,
];
