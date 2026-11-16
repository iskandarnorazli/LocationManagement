// Pure: the text of the uploaded file to locations, by D10. No I/O, no clock. Issue #5.
import type { NewLocation } from '@lm/shared';
import { notImplemented } from '../lib/notImplemented';

export const MAX_DATA_LINES = 5000;
export const MAX_REPORTED_ROWS = 20;

export type RowError = { line: number; reason: string };

export type ParseResult =
  | { ok: true; rows: NewLocation[] }
  | { ok: false; code: 'FILE_EMPTY' }
  | { ok: false; code: 'FILE_ROWS_INVALID'; rows: RowError[]; total: number };

export function parseLocations(text: string): ParseResult {
  return notImplemented('#5 parseLocations', { text });
}
