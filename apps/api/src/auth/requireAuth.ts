// Turns the session cookie into req.userId, or throws UNAUTHENTICATED / TOKEN_EXPIRED. Issue #3.
import type { RequestHandler } from 'express';
import type { Deps } from '../deps';
import { AppError } from '../http/AppError';
import { SESSION_COOKIE, verifySession } from './session';
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

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  const prefix = `${name}=`;
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length);
    }
  }
  return undefined;
}

export function requireAuth(deps: Deps): RequestHandler {
  return async (req, _res, next) => {
    const token = readCookie(req.headers.cookie, SESSION_COOKIE);
    const result = await verifySession(token, deps.clock, deps.config.JWT_SECRET);
    if (!result.ok) {
      if (result.reason === 'expired') {
        throw new AppError('TOKEN_EXPIRED', 'Your session has expired.');
      }
      throw new AppError('UNAUTHENTICATED', 'Authentication is required.');
    }
    req.userId = result.userId;
    next();
  };
}

/** The caller's id inside a handler behind requireAuth. Throws if the middleware did not run. */
export function userIdOf(req: { userId?: UserId }): UserId {
  if (!req.userId) throw new Error('userIdOf called on a route without requireAuth');
  return req.userId;
}
