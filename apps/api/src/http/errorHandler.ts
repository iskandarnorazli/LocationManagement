// The only code that writes an error response (docs/ERRORS.md, "How errors are made").
import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ErrorBody } from '@lm/shared';
import { ZodError } from 'zod';
import { AppError } from './AppError';

export const notFound: RequestHandler = () => {
  throw new AppError('NOT_FOUND', 'Not found.');
};

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return new AppError('VALIDATION_FAILED', 'The request is not valid.', details);
  }
  if (isBodyParserSyntaxError(err)) return new AppError('INVALID_JSON', 'The body is not valid JSON.');
  return new AppError('INTERNAL', 'Something went wrong.');
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const appError = toAppError(err);
  const requestId = String(req.id ?? '');
  if (appError.status >= 500) req.log.error({ err }, 'request failed');
  else req.log.info({ code: appError.code }, 'request rejected');

  const body: ErrorBody = {
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details === undefined ? {} : { details: appError.details }),
      requestId,
    },
  };
  res.status(appError.status).json(body);
};

function isBodyParserSyntaxError(err: unknown): boolean {
  return err instanceof SyntaxError && (err as { type?: unknown }).type === 'entity.parse.failed';
}
