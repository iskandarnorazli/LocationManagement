// Fixed map data for screenshots and F4 (UX_FLOWS: "fixed data"). The pool user's real list grows
// during a run (D24), so states that need an exact list stub GET /api/locations instead.
import type { Page } from '@playwright/test';

type Loc = { id: string; name: string; latitude: number; longitude: number; createdAt: string };
const at = '2026-11-17T09:30:00.000Z';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const KL_SAVED: Loc[] = [
  { id: id(1), name: 'Suria KLCC', latitude: 3.157324409, longitude: 101.7121981, createdAt: at },
  { id: id(2), name: 'Merdeka 118', latitude: 3.1415, longitude: 101.7003, createdAt: at },
  { id: id(3), name: 'Batu Caves', latitude: 3.2379, longitude: 101.684, createdAt: at },
];
export const KL_IMPORTED: Loc[] = [
  { id: id(4), name: 'Petaling Street', latitude: 3.1435, longitude: 101.6976, createdAt: at },
  { id: id(5), name: 'Thean Hou Temple', latitude: 3.1218, longitude: 101.6868, createdAt: at },
  { id: id(6), name: 'KL Bird Park', latitude: 3.1427, longitude: 101.6884, createdAt: at },
];

/** Answers GET /api/locations with `locations`; every other request goes to the API. */
export async function stubLocations(page: Page, locations: Loc[]): Promise<void> {
  await page.route('**/api/locations', (route) =>
    route.request().method() === 'GET' ? route.fulfill({ json: { locations } }) : route.fallback(),
  );
}

/** Waits until the map has loaded the list (the sheet's count shows) and tiles have settled. */
export async function mapReady(page: Page, count?: number): Promise<void> {
  const label = count === undefined ? /Swipe up for your locations \(\d+\)/ : `Swipe up for your locations (${count})`;
  await page.getByRole('button', { name: label }).waitFor();
  await tilesLoaded(page);
}

/** Waits (at most 10 s) until no map tile is still loading, so screenshots show the map. */
export async function tilesLoaded(page: Page): Promise<void> {
  await page
    .waitForFunction(
      () =>
        document.querySelectorAll('.leaflet-tile').length > 0 &&
        document.querySelectorAll('.leaflet-tile:not(.leaflet-tile-loaded)').length === 0,
      undefined,
      { timeout: 10_000 },
    )
    .catch(() => undefined);
}
