// The uploaded ZIP to the text of its one .txt file, by D9. Issue #6.
import { notImplemented } from '../lib/notImplemented';

export const MAX_ENTRIES = 10;
export const MAX_UNCOMPRESSED_BYTES = 5 * 1024 * 1024;
export const IGNORED_ENTRY = /(^|\/)(__MACOSX\/|\.DS_Store$)/;

export type ZipResult =
  | { ok: true; fileName: string; text: string }
  | { ok: false; code: 'ZIP_INVALID' }
  | { ok: false; code: 'ZIP_ENTRY_COUNT'; files: string[] }
  | { ok: false; code: 'ZIP_NOT_TEXT'; file: string };

export async function readSingleTextFile(zip: Buffer): Promise<ZipResult> {
  return notImplemented('#6 readSingleTextFile', { zip });
}
