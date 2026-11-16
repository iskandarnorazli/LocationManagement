import { describe, expect, it } from 'vitest';
import { NewLocation } from '../src/schemas';

describe('NewLocation', () => {
  it('accepts the first row of the sample file (R13)', () => {
    expect(NewLocation.parse({ name: ' Suria KLCC ', latitude: 3.157324409, longitude: 101.7121981 })).toEqual({
      name: 'Suria KLCC',
      latitude: 3.157324409,
      longitude: 101.7121981,
    });
  });

  it.each([
    ['latitude above 90', { name: 'x', latitude: 90.0001, longitude: 0 }],
    ['longitude below -180', { name: 'x', latitude: 0, longitude: -180.0001 }],
    ['blank name', { name: '   ', latitude: 0, longitude: 0 }],
    ['NaN latitude', { name: 'x', latitude: Number.NaN, longitude: 0 }],
  ])('rejects %s', (_label, input) => {
    expect(NewLocation.safeParse(input).success).toBe(false);
  });
});
