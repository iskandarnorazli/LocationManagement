import { statusOf, type ErrorCode } from '@lm/shared';

// Thrown by handlers and services; turned into the envelope by errorHandler.ts (docs/ERRORS.md).
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = statusOf(code);
    this.details = details;
  }
}
