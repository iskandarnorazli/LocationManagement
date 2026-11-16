// docs/ERRORS.md and packages/shared/src/errors.ts describe the same codes with the same status.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ERROR_CODES } from '@lm/shared';
import { describe, expect, it } from 'vitest';
import { toAppError } from '../src/http/errorHandler';

function codesInDoc(): Record<string, number> {
  const doc = readFileSync(path.resolve(process.cwd(), '../../docs/ERRORS.md'), 'utf8');
  const rows = [...doc.matchAll(/^\| `([A-Z_]+)` \| (\d{3}) \|/gm)];
  return Object.fromEntries(rows.map((m) => [m[1], Number(m[2])]));
}

describe('error codes', () => {
  it('ERRORS.md and ERROR_CODES list the same codes and statuses', () => {
    expect(codesInDoc()).toEqual({ ...ERROR_CODES });
  });

  it('an error nobody mapped becomes INTERNAL with a fixed message (no leak)', () => {
    const e = toAppError(new Error('password=hunter2 at db.ts:12'));
    expect(e.code).toBe('INTERNAL');
    expect(e.message).toBe('Something went wrong.');
  });
});
