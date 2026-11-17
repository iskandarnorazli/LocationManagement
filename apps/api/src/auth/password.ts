// D5: scrypt with N=16384, r=8, p=1, 16-byte salt, 64-byte key; compared with timingSafeEqual.
// Stored format: scrypt$16384$8$1$<salt base64>$<key base64>. Issue #2.
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SALT_BYTES = 16;
const KEY_BYTES = 64;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

function deriveKey(
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey);
    });
  });
}

function parsePositiveInt(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) return null;
  return value;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(password, salt, KEY_BYTES, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

/** False for a wrong password and for a malformed hash; never throws. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const N = parsePositiveInt(parts[1]!);
  const r = parsePositiveInt(parts[2]!);
  const p = parsePositiveInt(parts[3]!);
  if (N === null || r === null || p === null) return false;

  const saltB64 = parts[4]!;
  const keyB64 = parts[5]!;
  if (!BASE64_RE.test(saltB64) || !BASE64_RE.test(keyB64)) return false;

  const salt = Buffer.from(saltB64, 'base64');
  const key = Buffer.from(keyB64, 'base64');
  if (salt.length !== SALT_BYTES || key.length !== KEY_BYTES) return false;

  try {
    const derived = await deriveKey(password, salt, key.length, { N, r, p });
    return derived.length === key.length && timingSafeEqual(derived, key);
  } catch {
    return false;
  }
}
