// Pure: the text of the uploaded file to locations, by D10. No I/O, no clock. Issue #5.
import type { NewLocation } from '@lm/shared';

export const MAX_DATA_LINES = 5000;
export const MAX_REPORTED_ROWS = 20;

export type RowError = { line: number; reason: string };

export type ParseResult =
  | { ok: true; rows: NewLocation[] }
  | { ok: false; code: 'FILE_EMPTY' }
  | { ok: false; code: 'FILE_ROWS_INVALID'; rows: RowError[]; total: number };

const DECIMAL_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

function splitLastTwoCommas(line: string): [string, string, string] | null {
  const secondComma = line.lastIndexOf(',');
  if (secondComma <= 0) return null;
  const firstComma = line.lastIndexOf(',', secondComma - 1);
  if (firstComma === -1) return null;
  return [
    line.slice(0, firstComma).trim(),
    line.slice(firstComma + 1, secondComma).trim(),
    line.slice(secondComma + 1).trim(),
  ];
}

function isHeader(fields: [string, string, string]): boolean {
  return (
    fields[0].toLowerCase() === 'name' &&
    fields[1].toLowerCase() === 'latitude' &&
    fields[2].toLowerCase() === 'longitude'
  );
}

function parseCoordinate(raw: string, min: number, max: number, label: string): number | string {
  if (raw.length === 0 || !DECIMAL_RE.test(raw)) {
    return `${label} must be a decimal number`;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    return `${label} must be between ${min} and ${max}`;
  }
  return value === 0 ? 0 : value;
}

export function parseLocations(text: string): ParseResult {
  const clean = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const rawLines = clean.split(/\r?\n/);

  const rows: NewLocation[] = [];
  const errors: RowError[] = [];
  let totalErrors = 0;
  let seenFirstNonBlank = false;
  let dataLines = 0;

  const recordError = (line: number, reason: string) => {
    totalErrors += 1;
    if (errors.length < MAX_REPORTED_ROWS) {
      errors.push({ line, reason });
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i]!;
    if (raw.trim().length === 0) continue;

    const lineNumber = i + 1;
    const fields = splitLastTwoCommas(raw);

    if (!seenFirstNonBlank) {
      seenFirstNonBlank = true;
      if (fields && isHeader(fields)) continue;
    }

    dataLines += 1;
    if (dataLines > MAX_DATA_LINES) {
      recordError(lineNumber, `Too many data lines (max ${MAX_DATA_LINES})`);
      continue;
    }

    if (!fields) {
      recordError(lineNumber, 'Expected name, latitude, longitude');
      continue;
    }

    const [name, latRaw, lonRaw] = fields;
    if (name.length < 1 || name.length > 200) {
      recordError(lineNumber, 'Name must be 1 to 200 characters');
      continue;
    }

    const lat = parseCoordinate(latRaw, -90, 90, 'Latitude');
    if (typeof lat === 'string') {
      recordError(lineNumber, lat);
      continue;
    }

    const lon = parseCoordinate(lonRaw, -180, 180, 'Longitude');
    if (typeof lon === 'string') {
      recordError(lineNumber, lon);
      continue;
    }

    rows.push({ name, latitude: lat, longitude: lon });
  }

  if (dataLines === 0) {
    return { ok: false, code: 'FILE_EMPTY' };
  }
  if (totalErrors > 0) {
    return { ok: false, code: 'FILE_ROWS_INVALID', rows: errors, total: totalErrors };
  }
  return { ok: true, rows };
}
