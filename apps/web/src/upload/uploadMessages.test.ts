import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/client';
import { uploadMessage } from './uploadMessages';

const err = (code: ConstructorParameters<typeof ApiError>[1], details?: unknown) =>
  new ApiError(422, code, 'server text', details);

describe('uploadMessage (R12, docs/ERRORS.md)', () => {
  it('names the files when the ZIP holds more than one', () => {
    expect(uploadMessage(err('ZIP_ENTRY_COUNT', { files: ['north.txt', 'south.txt'] }))).toBe(
      'The ZIP must hold exactly one text file. This one holds 2: north.txt, south.txt.',
    );
    expect(uploadMessage(err('ZIP_ENTRY_COUNT', { files: [] }))).toBe(
      'The ZIP must hold exactly one text file. This one holds none.',
    );
  });

  it('names the file that is not text', () => {
    expect(uploadMessage(err('ZIP_NOT_TEXT', { file: 'photo.png' }))).toBe(
      'The file in the ZIP (photo.png) must be a UTF-8 .txt file of at most 5 MiB.',
    );
  });

  it('gives the first bad line and how many more', () => {
    const details = { rows: [{ line: 3, reason: 'latitude must be between -90 and 90' }], total: 4 };
    expect(uploadMessage(err('FILE_ROWS_INVALID', details))).toBe(
      'Line 3: latitude must be between -90 and 90, and 3 more. Nothing was imported.',
    );
    expect(uploadMessage(err('FILE_ROWS_INVALID', { rows: [{ line: 2, reason: 'no name' }], total: 1 }))).toBe(
      'Line 2: no name. Nothing was imported.',
    );
  });

  it('has one plain sentence for every other code', () => {
    expect(uploadMessage(err('ZIP_INVALID'))).toBe('That file is not a ZIP that can be opened.');
    expect(uploadMessage(err('FILE_EMPTY'))).toBe('The text file has no locations in it.');
    expect(uploadMessage(err('PAYLOAD_TOO_LARGE', { limitBytes: 1048576 }))).toBe('The ZIP is larger than 1 MiB.');
    expect(uploadMessage(err('RATE_LIMITED', { retryAfterSeconds: 30 }))).toBe('Too many uploads. Try again in a minute.');
    expect(uploadMessage(new ApiError(0, 'NETWORK', 'x'))).toBe('Network error. Check your connection and try again.');
    expect(uploadMessage(err('INTERNAL'))).toBe('The upload failed. Please try again.');
  });
});
