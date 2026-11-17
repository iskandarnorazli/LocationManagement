import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/auth/password';

describe('password hashing (D5)', () => {
  it('round trip', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    await expect(verifyPassword('correct-horse-battery-staple', hash)).resolves.toBe(true);
  });

  it('wrong password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('salted', async () => {
    const a = await hashPassword('same-password');
    const b = await hashPassword('same-password');
    expect(a).not.toBe(b);
  });

  it('hash format', async () => {
    const hash = await hashPassword('format-check');
    const parts = hash.split('$');
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe('scrypt');
    expect(parts[1]).toBe('16384');
    expect(parts[2]).toBe('8');
    expect(parts[3]).toBe('1');
    expect(Buffer.from(parts[4]!, 'base64')).toHaveLength(16);
    expect(Buffer.from(parts[5]!, 'base64')).toHaveLength(64);
  });

  it('malformed', async () => {
    const valid = await hashPassword('valid');
    const parts = valid.split('$');
    const bad = [
      '',
      'not-scrypt',
      'bcrypt$10$abc$def',
      `scrypt$16384$8$1$${parts[4]}`,
      `scrypt$0$8$1$${parts[4]}$${parts[5]}`,
      `scrypt$16384$0$1$${parts[4]}$${parts[5]}`,
      `scrypt$16384$8$0$${parts[4]}$${parts[5]}`,
      `scrypt$NaN$8$1$${parts[4]}$${parts[5]}`,
      `scrypt$16384$8$1$short$${parts[5]}`,
      `scrypt$16384$8$1$${parts[4]}$short`,
      `scrypt$16384$8$1$!!!$${parts[5]}`,
    ];
    for (const stored of bad) {
      await expect(verifyPassword('valid', stored)).resolves.toBe(false);
    }
  });
});
