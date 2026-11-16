import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';

const ok = { DATABASE_URL: 'postgres://x', JWT_SECRET: 'a'.repeat(32) };

describe('loadConfig (D15)', () => {
  it('fills defaults', () => {
    expect(loadConfig(ok)).toMatchObject({ PORT: 3000, LOG_LEVEL: 'info' });
  });
  it('refuses a JWT_SECRET shorter than 32 characters', () => {
    expect(() => loadConfig({ ...ok, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });
  it('refuses a missing DATABASE_URL', () => {
    expect(() => loadConfig({ JWT_SECRET: ok.JWT_SECRET })).toThrow(/DATABASE_URL/);
  });
});
