// D21: hard limits on how much any client can make the server do. Times come from the Clock
// port (D18), so tests move time with fixedClock().advance(). Issue #36 fills the bodies.
import type { Request, RequestHandler } from 'express';
import type { Clock } from '../ports';
import { AppError } from './AppError';

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
  let active = 0;

  return (_req, res, next) => {
    if (active >= max) {
      res.setHeader('Retry-After', '1');
      throw new AppError('RATE_LIMITED', 'Too many concurrent requests.', { retryAfterSeconds: 1 });
    }

    active += 1;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      active -= 1;
    };

    res.once('finish', release);
    res.once('close', release);
    next();
  };
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
  const buckets = new Map<string, { count: number; resetAt: number }>();
  let nextSweepAt = clock.now() + opts.windowMs;

  return (req, res, next) => {
    const bucketKey = opts.key(req);
    if (bucketKey === null) {
      next();
      return;
    }

    const now = clock.now();
    if (now >= nextSweepAt) {
      for (const [k, entry] of buckets) {
        if (entry.resetAt <= now) {
          buckets.delete(k);
        }
      }
      nextSweepAt = now + opts.windowMs;
    }

    const existing = buckets.get(bucketKey);
    if (!existing || existing.resetAt <= now) {
      buckets.set(bucketKey, { count: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }

    if (existing.count >= opts.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      throw new AppError('RATE_LIMITED', 'Too many requests. Please try again later.', {
        retryAfterSeconds,
      });
    }

    existing.count += 1;
    next();
  };
}
