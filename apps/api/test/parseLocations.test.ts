import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAX_DATA_LINES, MAX_REPORTED_ROWS, parseLocations } from '../src/import/parseLocations';

const samplePath = path.resolve(__dirname, 'fixtures/sample.txt');

describe('parseLocations (D10)', () => {
  it('parses the brief sample with full precision', () => {
    const text = readFileSync(samplePath, 'utf8');
    expect(parseLocations(text)).toEqual({
      ok: true,
      rows: [
        { name: 'Suria KLCC', latitude: 3.157324409, longitude: 101.7121981 },
        { name: 'Zoo Negara', latitude: 3.2105416, longitude: 101.75920504 },
      ],
    });
  });

  it('splits at the last two commas when name contains commas', () => {
    expect(parseLocations('Kuala Lumpur, City Centre,3.1,101.6')).toEqual({
      ok: true,
      rows: [{ name: 'Kuala Lumpur, City Centre', latitude: 3.1, longitude: 101.6 }],
    });
  });

  it('drops UTF-8 BOM', () => {
    expect(parseLocations('\uFEFFPlace A, 1.5, 2.5')).toEqual({
      ok: true,
      rows: [{ name: 'Place A', latitude: 1.5, longitude: 2.5 }],
    });
  });

  it('handles CRLF and skips blank lines while keeping 1-based line numbers', () => {
    const input = 'Place A, 1, 2\r\n\r\nBadLine\r\nPlace B, 3, 4\r\n';
    const res = parseLocations(input);
    expect(res.ok).toBe(false);
    if (!res.ok && res.code === 'FILE_ROWS_INVALID') {
      expect(res.total).toBe(1);
      expect(res.rows[0]!.line).toBe(3);
    } else {
      throw new Error(`Expected FILE_ROWS_INVALID, got ${JSON.stringify(res)}`);
    }
  });

  it('skips header in any case and spacing', () => {
    expect(parseLocations('  NAME ,  lAtItUdE ,  longitude \nKL, 3.1, 101.6')).toEqual({
      ok: true,
      rows: [{ name: 'KL', latitude: 3.1, longitude: 101.6 }],
    });
  });

  it('rejects scientific notation (1e3), NaN, and empty fields', () => {
    const input = ['A, 1e3, 10', 'B, NaN, 10', 'C, , 10', ', 1, 2'].join('\n');
    const res = parseLocations(input);
    expect(res.ok).toBe(false);
    if (!res.ok && res.code === 'FILE_ROWS_INVALID') {
      expect(res.total).toBe(4);
      expect(res.rows.map((r) => r.line)).toEqual([1, 2, 3, 4]);
    } else {
      throw new Error(`Expected FILE_ROWS_INVALID, got ${JSON.stringify(res)}`);
    }
  });

  it('returns FILE_EMPTY when there are zero data lines', () => {
    expect(parseLocations('')).toEqual({ ok: false, code: 'FILE_EMPTY' });
    expect(parseLocations('  \r\n \n ')).toEqual({ ok: false, code: 'FILE_EMPTY' });
    expect(parseLocations('Name, Latitude, Longitude\n\n')).toEqual({
      ok: false,
      code: 'FILE_EMPTY',
    });
  });

  it('rejects more than 5,000 data lines', () => {
    const lines = Array.from({ length: MAX_DATA_LINES + 1 }, (_, i) => `P${i}, 1, 2`).join('\n');
    const res = parseLocations(lines);
    expect(res.ok).toBe(false);
    if (!res.ok && res.code === 'FILE_ROWS_INVALID') {
      expect(res.total).toBe(1);
      expect(res.rows[0]!.line).toBe(MAX_DATA_LINES + 1);
    } else {
      throw new Error(`Expected FILE_ROWS_INVALID, got ${JSON.stringify(res)}`);
    }
  });

  it('caps reported rows at 20 while reporting total bad lines', () => {
    const lines = Array.from({ length: 25 }, () => 'bad').join('\n');
    const res = parseLocations(lines);
    expect(res.ok).toBe(false);
    if (!res.ok && res.code === 'FILE_ROWS_INVALID') {
      expect(res.rows).toHaveLength(MAX_REPORTED_ROWS);
      expect(res.total).toBe(25);
    } else {
      throw new Error(`Expected FILE_ROWS_INVALID, got ${JSON.stringify(res)}`);
    }
  });

  it('allows duplicate names', () => {
    expect(parseLocations('Cafe, 1, 2\nCafe, 3, 4')).toEqual({
      ok: true,
      rows: [
        { name: 'Cafe', latitude: 1, longitude: 2 },
        { name: 'Cafe', latitude: 3, longitude: 4 },
      ],
    });
  });
});
