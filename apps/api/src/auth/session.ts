// D6: an HS256 JWT with sub = user id, iat and exp = iat + 3600 s, read from Clock (never the
// system time), carried in the session cookie. Issue #3.
import type { Clock } from '../ports';
import { notImplemented } from '../lib/notImplemented';
import type { UserId } from './userId';

export const SESSION_COOKIE = 'session';
export const SESSION_SECONDS = 3600;

export type VerifyResult =
  | { ok: true; userId: UserId }
  | { ok: false; reason: 'missing' | 'invalid' | 'expired' };

export async function signSession(userId: UserId, clock: Clock, secret: string): Promise<string> {
  return notImplemented('#3 signSession', { userId, clock, secret });
}

export async function verifySession(
  token: string | undefined,
  clock: Clock,
  secret: string,
): Promise<VerifyResult> {
  return notImplemented('#3 verifySession', { token, clock, secret });
}

/** The Set-Cookie value for a new session or, with token null, for logout (Max-Age=0). */
export function sessionCookie(token: string | null, secure: boolean): string {
  return notImplemented('#3 sessionCookie', { token, secure });
}
