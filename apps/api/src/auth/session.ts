// D6: an HS256 JWT with sub = user id, iat and exp = iat + 3600 s, read from Clock (never the
// system time), carried in the session cookie. Issue #3.
import { SignJWT, errors, jwtVerify } from 'jose';
import type { Clock } from '../ports';
import { asUserId, type UserId } from './userId';

export const SESSION_COOKIE = 'session';
export const SESSION_SECONDS = 3600;

export type VerifyResult =
  | { ok: true; userId: UserId }
  | { ok: false; reason: 'missing' | 'invalid' | 'expired' };

const encoder = new TextEncoder();

export async function signSession(userId: UserId, clock: Clock, secret: string): Promise<string> {
  const iat = Math.floor(clock.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt(iat)
    .setExpirationTime(iat + SESSION_SECONDS)
    .sign(encoder.encode(secret));
}

export async function verifySession(
  token: string | undefined,
  clock: Clock,
  secret: string,
): Promise<VerifyResult> {
  if (!token) return { ok: false, reason: 'missing' };
  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret), {
      algorithms: ['HS256'],
      currentDate: new Date(clock.now()),
    });
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      return { ok: false, reason: 'invalid' };
    }
    return { ok: true, userId: asUserId(payload.sub) };
  } catch (err) {
    if (err instanceof errors.JWTExpired) {
      return { ok: false, reason: 'expired' };
    }
    return { ok: false, reason: 'invalid' };
  }
}

/** The Set-Cookie value for a new session or, with token null, for logout (Max-Age=0). */
export function sessionCookie(token: string | null, secure: boolean): string {
  const parts =
    token === null
      ? [`${SESSION_COOKIE}=`, 'HttpOnly', 'SameSite=Strict', 'Path=/api', 'Max-Age=0']
      : [
          `${SESSION_COOKIE}=${token}`,
          'HttpOnly',
          'SameSite=Strict',
          'Path=/api',
          `Max-Age=${SESSION_SECONDS}`,
        ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}
