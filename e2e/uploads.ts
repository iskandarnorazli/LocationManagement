// The ZIPs the upload screens and specs send, and a stub for the import answer.
import path from 'node:path';
import type { Page } from '@playwright/test';
import { KL_IMPORTED } from './locations';

const ZIPS = path.resolve(import.meta.dirname, '../apps/api/test/fixtures/zips');
/** One text file with one row (Suria KLCC): the brief's sample format. */
export const SAMPLE_ZIP = path.join(ZIPS, 'one.zip');
/** Two text files: rejected with ZIP_ENTRY_COUNT (R12). */
export const TWO_FILES_ZIP = path.join(ZIPS, 'two-txt.zip');

/** Answers POST /api/locations/import with three fixed rows, for screenshots. */
export async function stubImportOk(page: Page): Promise<void> {
  await page.route('**/api/locations/import', (route) =>
    route.fulfill({ status: 201, json: { imported: KL_IMPORTED.length, locations: KL_IMPORTED } }),
  );
}

export async function chooseZip(page: Page, file: string): Promise<void> {
  await page.locator('#zip-file').setInputFiles(file);
}
