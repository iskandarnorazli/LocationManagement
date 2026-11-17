import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parseLocations } from '../src/import/parseLocations';

const SEED = 20261117;

const validNameArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .map((s) => s.replace(/[\r\n\uFEFF]/g, 'x').trim())
  .filter((s) => s.length >= 1 && s.length <= 200);

const coordArb = (min: number, max: number) =>
  fc
    .integer({ min: min * 1_000_000, max: max * 1_000_000 })
    .map((n) => (n === 0 ? 0 : n / 1_000_000));

const validLocationArb = fc.record({
  name: validNameArb,
  latitude: coordArb(-90, 90),
  longitude: coordArb(-180, 180),
});

describe('parseLocations properties (D10)', () => {
  it('round-trips any non-empty list of valid locations (including names with commas)', () => {
    fc.assert(
      fc.property(fc.array(validLocationArb, { minLength: 1, maxLength: 30 }), (locations) => {
        const text = locations
          .map((loc) => `${loc.name},${loc.latitude},${loc.longitude}`)
          .join('\n');
        const res = parseLocations(text);
        expect(res).toEqual({ ok: true, rows: locations });
      }),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('rejects any input containing a line with latitude outside [-90, 90] and reports its line number', () => {
    const outOfRangeLatArb = fc.oneof(
      fc.double({ min: 90.0001, max: 1000, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: -1000, max: -90.0001, noNaN: true, noDefaultInfinity: true }),
    );

    fc.assert(
      fc.property(
        fc.array(validLocationArb, { minLength: 0, maxLength: 10 }),
        fc.array(validLocationArb, { minLength: 0, maxLength: 10 }),
        outOfRangeLatArb,
        (before, after, badLat) => {
          const badLineNumber = before.length + 1;
          const badLatFixed = badLat.toFixed(6);
          const lines = [
            ...before.map((loc) => `${loc.name},${loc.latitude},${loc.longitude}`),
            `BadPlace,${badLatFixed},10`,
            ...after.map((loc) => `${loc.name},${loc.latitude},${loc.longitude}`),
          ];
          const res = parseLocations(lines.join('\n'));
          expect(res.ok).toBe(false);
          if (!res.ok && res.code === 'FILE_ROWS_INVALID') {
            expect(res.rows.some((r) => r.line === badLineNumber)).toBe(true);
          } else {
            throw new Error(`Expected FILE_ROWS_INVALID, got ${JSON.stringify(res)}`);
          }
        },
      ),
      { seed: SEED, numRuns: 100 },
    );
  });
});
