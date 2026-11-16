// The only code in apps/web/src that calls fetch (lint, docs/ERRORS.md). Issue #8.
import type { ErrorCode } from '@lm/shared';
import type { z } from 'zod';
import { notImplemented } from '../lib/notImplemented';

/** Every failed call: an API error envelope, or NETWORK for no answer / a body that is not JSON. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode | 'NETWORK';
  readonly details: unknown;

  constructor(status: number, code: ErrorCode | 'NETWORK', message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Calls /api + path with credentials, parses a 2xx body with `schema`, and throws ApiError
 * otherwise. A 401 also calls the onUnauthorized hook (the session store sends ANY_401).
 */
export async function api<S extends z.ZodType>(
  path: string,
  init: RequestInit & { schema: S },
): Promise<z.infer<S>> {
  return notImplemented('#8 api', { path, init });
}
