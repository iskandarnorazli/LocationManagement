// Turns the session cookie into req.userId, or throws UNAUTHENTICATED / TOKEN_EXPIRED. Issue #3.
import type { RequestHandler } from 'express';
import type { Deps } from '../deps';
import { notImplemented } from '../lib/notImplemented';
import type { UserId } from './userId';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by requireAuth; read with userIdOf(req). */
      userId?: UserId;
    }
  }
}

export function requireAuth(deps: Deps): RequestHandler {
  return (req) => notImplemented('#3 requireAuth', { deps, req });
}

/** The caller's id inside a handler behind requireAuth. Throws if the middleware did not run. */
export function userIdOf(req: { userId?: UserId }): UserId {
  if (!req.userId) throw new Error('userIdOf called on a route without requireAuth');
  return req.userId;
}
