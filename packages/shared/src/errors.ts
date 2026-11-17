import { z } from 'zod';

// The error codes of docs/ERRORS.md. This table and that file change together;
// apps/api/test/errors.test.ts fails when they differ.
export const ERROR_CODES = {
  VALIDATION_FAILED: 400,
  INVALID_JSON: 400,
  UNAUTHENTICATED: 401,
  TOKEN_EXPIRED: 401,
  INVALID_CREDENTIALS: 401,
  NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  PAYLOAD_TOO_LARGE: 413,
  ZIP_INVALID: 422,
  ZIP_ENTRY_COUNT: 422,
  ZIP_NOT_TEXT: 422,
  FILE_EMPTY: 422,
  FILE_ROWS_INVALID: 422,
  RATE_LIMITED: 429,
  UNAVAILABLE: 503,
  INTERNAL: 500,
} as const satisfies Record<string, number>;

export type ErrorCode = keyof typeof ERROR_CODES;

const codes = Object.keys(ERROR_CODES) as [ErrorCode, ...ErrorCode[]];

/** The error envelope of docs/ERRORS.md, as a schema: tests parse every error body with it. */
export const ErrorBody = z
  .object({
    error: z
      .object({
        code: z.enum(codes),
        message: z.string().min(1),
        details: z.unknown().optional(),
        requestId: z.string().min(1),
      })
      .strict(),
  })
  .strict();
export type ErrorBody = z.infer<typeof ErrorBody>;

export function statusOf(code: ErrorCode): number {
  return ERROR_CODES[code];
}
