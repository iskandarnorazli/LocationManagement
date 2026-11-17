# Errors

One envelope for every error the API returns, one table of codes, and what the web shows for
each. Codes are in `packages/shared/src/errors.ts` (`ERROR_CODES`); this table and that file
change together, and `apps/api/test/errors.test.ts` fails when a code here is missing there or
the other way round.

## The envelope

```ts
type ErrorBody = {
  error: {
    code: ErrorCode;        // stable, SCREAMING_SNAKE; clients switch on this, never on message
    message: string;        // one sentence for a person; may change wording
    details?: unknown;      // per code, below
    requestId: string;      // also in the X-Request-Id header and the log line
  };
};
```

## How errors are made

- A handler or service throws `new AppError(code, message, details?)`. The HTTP status comes from the code's row below, never from the thrower.
- The error middleware (`apps/api/src/http/errorHandler.ts`) is the only place that writes an error response. It also maps errors it did not throw: a zod error to `VALIDATION_FAILED`, a body-parser JSON error to `INVALID_JSON`, a multer size error to `PAYLOAD_TOO_LARGE`, a Postgres unique violation on `users.email` to `EMAIL_TAKEN`.
- Anything else is `500 INTERNAL`. The log line has the stack; the response has only the code, a fixed message and the request id.
- A 4xx is logged at `info`, a 5xx at `error`.

## Codes

| Code | Status | When | `details` | Web shows |
|---|---|---|---|---|
| `VALIDATION_FAILED` | 400 | A body or field fails its schema | `[{ path: string, message: string }]` | The message next to each field |
| `INVALID_JSON` | 400 | The body is not JSON | none | "Something went wrong. Try again." |
| `UNAUTHENTICATED` | 401 | No credential, or it does not verify | none | Redirect to login |
| `TOKEN_EXPIRED` | 401 | The credential verified but has expired | none | Redirect to login, "Your session expired." |
| `INVALID_CREDENTIALS` | 401 | Login with an unknown email or a wrong password (the same code for both) | none | "Email or password is incorrect." |
| `NOT_FOUND` | 404 | No such route, or a row that is not the caller's (D7) | none | "Not found." |
| `EMAIL_TAKEN` | 409 | Register with an email that has an account | none | "An account with this email already exists." |
| `PAYLOAD_TOO_LARGE` | 413 | Upload over 1 MiB | `{ limitBytes }` | Error popup, 3 s |
| `ZIP_INVALID` | 422 | Not a ZIP, corrupt, or encrypted | none | Error popup, 3 s |
| `ZIP_ENTRY_COUNT` | 422 | Not exactly one file after D9's rule | `{ files: string[] }` | Error popup, 3 s |
| `ZIP_NOT_TEXT` | 422 | The one file is not `.txt`, not UTF-8, holds a NUL byte, or is over 5 MiB unpacked | `{ file: string }` | Error popup, 3 s |
| `FILE_EMPTY` | 422 | The text file has no data lines | none | Error popup, 3 s |
| `FILE_ROWS_INVALID` | 422 | One or more lines break D10 | `{ rows: [{ line: number, reason: string }], total: number }` (first 20) | Error popup, 3 s, with the first bad line |
| `RATE_LIMITED` | 429 | Too many requests: an import while 4 are running, more than 10 imports a minute for one user, or more than 10 logins / 5 registrations a minute from one IP (D21). The response also has `Retry-After` | `{ retryAfterSeconds }` | Auth forms: "Too many attempts. Try again in a minute." Upload: error popup, 3 s |
| `UNAVAILABLE` | 503 | `/health/ready` cannot reach Postgres | none | n/a |
| `INTERNAL` | 500 | Anything not above | none | "Something went wrong. Try again." |

## What the web does with errors

`apps/web/src/api/client.ts` is the only code that calls `fetch`. It parses the envelope into
`ApiError { status, code, message, details }`, and a network failure or a non-JSON body becomes
`ApiError` with code `NETWORK`. Components switch on `code`. A 401 from any call clears the
session store and sends the user to `/login`.
