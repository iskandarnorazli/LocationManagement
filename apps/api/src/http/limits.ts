// D21: hard limits on how much any client can make the server do. Times come from the Clock
// port (D18), so tests move time with fixedClock().advance(). Issue #36 fills the bodies.
import type { Request, RequestHandler } from 'express';
import type { Clock } from '../ports';
import { notImplemented } from '../lib/notImplemented';

export const LIMITS = {
  importConcurrency: 4,
  importPerUserPerMinute: 10,
  loginPerIpPerMinute: 10,
  registerPerIpPerMinute: 5,
} as const;

/**
 * Admits at most `max` requests at once; the next gets 429 RATE_LIMITED. A slot is released
 * once per request, when the response finishes or the connection closes, even if the handler
 * throws.
 */
export function concurrencyLimit(max: number): RequestHandler {
  return (req, res, next) => notImplemented('#36 concurrencyLimit', { max, req, res, next });
}

export type RateLimitOptions = {
  windowMs: number;
  max: number;
  /** The bucket for this request (user id, IP); null skips limiting. */
  key: (req: Request) => string | null;
};

/**
 * Fixed windows of `windowMs` from the first request of each key; the `max + 1`th request in a
 * window gets 429 RATE_LIMITED with Retry-After set to the seconds left. Ended windows are
 * dropped, so memory stays bounded.
 */
export function rateLimit(opts: RateLimitOptions, clock: Clock): RequestHandler {
  return (req, res, next) => notImplemented('#36 rateLimit', { opts, clock, req, res, next });
}
