// The only code in apps/web/src that calls fetch (lint, docs/ERRORS.md). Issue #8.
import { ErrorBody, type ErrorCode } from '@lm/shared';
import type { z } from 'zod';

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

let onUnauthorizedHook: (() => void) | null = null;

export function setOnUnauthorized(hook: (() => void) | null): void {
  onUnauthorizedHook = hook;
}

/**
 * Calls /api + path with credentials, parses a 2xx body with `schema`, and throws ApiError
 * otherwise. A 401 also calls the onUnauthorized hook (the session store sends ANY_401).
 */
export async function api<S extends z.ZodType>(
  path: string,
  init: RequestInit & { schema: S },
): Promise<z.infer<S>> {
  const { schema, headers, ...rest } = init;
  const reqHeaders = new Headers(headers);
  if (typeof rest.body === 'string' && !reqHeaders.has('Content-Type')) {
    reqHeaders.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...rest,
      headers: reqHeaders,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Network error. Please try again.');
  }

  if (res.status === 204) {
    const parsed = schema.safeParse(undefined);
    if (!parsed.success) {
      throw new ApiError(res.status, 'NETWORK', 'Unexpected response shape.');
    }
    return parsed.data;
  }

  let json: unknown;
  try {
    const text = await res.text();
    json = JSON.parse(text);
  } catch {
    throw new ApiError(res.status, 'NETWORK', 'Invalid response from server.');
  }

  if (!res.ok) {
    if (res.status === 401) {
      onUnauthorizedHook?.();
    }
    const parsedErr = ErrorBody.safeParse(json);
    if (parsedErr.success) {
      const { code, message, details } = parsedErr.data.error;
      throw new ApiError(res.status, code, message, details);
    }
    throw new ApiError(res.status, 'NETWORK', 'Unexpected error response.');
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError(res.status, 'NETWORK', 'Invalid response shape.');
  }
  return parsed.data;
}
