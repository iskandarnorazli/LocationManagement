// D5: scrypt with N=16384, r=8, p=1, 16-byte salt, 64-byte key; compared with timingSafeEqual.
// Stored format: scrypt$16384$8$1$<salt base64>$<key base64>. Issue #2.
import { notImplemented } from '../lib/notImplemented';

export async function hashPassword(password: string): Promise<string> {
  return notImplemented('#2 hashPassword', { password });
}

/** False for a wrong password and for a malformed hash; never throws. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  return notImplemented('#2 verifyPassword', { password, stored });
}
