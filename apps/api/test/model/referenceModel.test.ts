import { describe, expect, it } from 'vitest';
import { ReferenceModel } from './referenceModel';

const klcc = { name: 'Suria KLCC', latitude: 3.157324409, longitude: 101.7121981 };

describe('ReferenceModel (the oracle must itself be right)', () => {
  it('keeps each user to their own locations (R5)', () => {
    const m = new ReferenceModel();
    m.register('a@x.com', 'password-a');
    m.register('b@x.com', 'password-b');
    m.addLocation('a@x.com', klcc);
    expect(m.locationsOf('a@x.com')).toEqual([klcc]);
    expect(m.locationsOf('b@x.com')).toEqual([]);
  });

  it('treats emails case-insensitively, like the shared Credentials schema', () => {
    const m = new ReferenceModel();
    expect(m.register('A@x.com', 'password-a').ok).toBe(true);
    expect(m.register('a@x.com', 'other-pass')).toEqual({ ok: false, code: 'EMAIL_TAKEN' });
    expect(m.login('a@X.com', 'password-a').ok).toBe(true);
    expect(m.login('a@x.com', 'wrong-pass')).toEqual({ ok: false, code: 'INVALID_CREDENTIALS' });
  });

  it('adds nothing for a rejected import (D8)', () => {
    const m = new ReferenceModel();
    m.register('a@x.com', 'password-a');
    expect(m.importRows('a@x.com', null).ok).toBe(false);
    expect(m.locationsOf('a@x.com')).toEqual([]);
  });
});
