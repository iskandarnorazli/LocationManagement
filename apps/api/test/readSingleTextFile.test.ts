import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MAX_ENTRIES,
  MAX_UNCOMPRESSED_BYTES,
  readSingleTextFile,
} from '../src/import/readSingleTextFile';

function fixture(name: string): Buffer {
  return readFileSync(path.resolve(__dirname, 'fixtures/zips', name));
}

describe('readSingleTextFile (D9)', () => {
  it('reads a single .txt file', async () => {
    const res = await readSingleTextFile(fixture('one.zip'));
    expect(res).toEqual({
      ok: true,
      fileName: 'locations.txt',
      text: 'Name, Latitude, Longitude\nSuria KLCC,3.157324409,101.7121981\n',
    });
  });

  it('reads a single .txt inside a folder and ignores directory entries', async () => {
    const res = await readSingleTextFile(fixture('nested.zip'));
    expect(res).toEqual({
      ok: true,
      fileName: 'data/locations.txt',
      text: 'Name, Latitude, Longitude\nSuria KLCC,3.157324409,101.7121981\n',
    });
  });

  it('ignores macOS Finder metadata (__MACOSX/ and .DS_Store)', async () => {
    const res = await readSingleTextFile(fixture('finder.zip'));
    expect(res).toEqual({
      ok: true,
      fileName: 'x.txt',
      text: 'Name, Latitude, Longitude\nSuria KLCC,3.157324409,101.7121981\n',
    });
  });

  it('rejects two .txt files with ZIP_ENTRY_COUNT listing both', async () => {
    const res = await readSingleTextFile(fixture('two-txt.zip'));
    expect(res).toEqual({
      ok: false,
      code: 'ZIP_ENTRY_COUNT',
      files: ['a.txt', 'b.txt'],
    });
  });

  it('rejects one .txt and one .png with ZIP_ENTRY_COUNT', async () => {
    const res = await readSingleTextFile(fixture('txt-and-png.zip'));
    expect(res).toEqual({
      ok: false,
      code: 'ZIP_ENTRY_COUNT',
      files: ['a.txt', 'photo.png'],
    });
  });

  it('rejects an empty ZIP with ZIP_ENTRY_COUNT', async () => {
    const res = await readSingleTextFile(fixture('empty.zip'));
    expect(res).toEqual({
      ok: false,
      code: 'ZIP_ENTRY_COUNT',
      files: [],
    });
  });

  it('rejects a non-.txt file (.csv) with ZIP_NOT_TEXT', async () => {
    const res = await readSingleTextFile(fixture('csv-only.zip'));
    expect(res).toEqual({
      ok: false,
      code: 'ZIP_NOT_TEXT',
      file: 'locations.csv',
    });
  });

  it('rejects invalid UTF-8 with ZIP_NOT_TEXT', async () => {
    const res = await readSingleTextFile(fixture('invalid-utf8.zip'));
    expect(res).toEqual({
      ok: false,
      code: 'ZIP_NOT_TEXT',
      file: 'bad.txt',
    });
  });

  it('rejects a NUL byte with ZIP_NOT_TEXT', async () => {
    const res = await readSingleTextFile(fixture('nul-byte.zip'));
    expect(res).toEqual({
      ok: false,
      code: 'ZIP_NOT_TEXT',
      file: 'nul.txt',
    });
  });

  it('rejects random bytes, truncated ZIP, and encrypted entry with ZIP_INVALID', async () => {
    expect(await readSingleTextFile(Buffer.from('not a zip file'))).toEqual({
      ok: false,
      code: 'ZIP_INVALID',
    });
    expect(await readSingleTextFile(fixture('truncated.zip'))).toEqual({
      ok: false,
      code: 'ZIP_INVALID',
    });
    expect(await readSingleTextFile(fixture('encrypted.zip'))).toEqual({
      ok: false,
      code: 'ZIP_INVALID',
    });
  });

  it('rejects a ZIP bomb over 5 MiB with ZIP_NOT_TEXT without buffering past the limit', async () => {
    const res = await readSingleTextFile(fixture('bomb.zip'));
    expect(res).toEqual({
      ok: false,
      code: 'ZIP_NOT_TEXT',
      file: 'bomb.txt',
    });
    expect(MAX_UNCOMPRESSED_BYTES).toBe(5 * 1024 * 1024);
  });

  it('stops at 10 entries and rejects 11 entries with ZIP_ENTRY_COUNT', async () => {
    const res = await readSingleTextFile(fixture('eleven-entries.zip'));
    expect(res.ok).toBe(false);
    if (!res.ok && res.code === 'ZIP_ENTRY_COUNT') {
      expect(res.files.length).toBeLessThanOrEqual(MAX_ENTRIES);
    } else {
      throw new Error(`Expected ZIP_ENTRY_COUNT, got ${JSON.stringify(res)}`);
    }
  });

  it('rejects a ZIP whose header lies about uncompressedSize (100 declared, 50 MiB actual)', async () => {
    const res = await readSingleTextFile(fixture('lying-header.zip'));
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(['ZIP_INVALID', 'ZIP_NOT_TEXT']).toContain(res.code);
    }
  });
});
