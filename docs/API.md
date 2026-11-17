# HTTP API

The contract between `apps/web` and `apps/api`. The schemas named here are in
`packages/shared/src/schemas.ts`; this file and those schemas change together. Every error body
is the envelope in [`ERRORS.md`](ERRORS.md). All bodies are JSON except the import upload.

The **credential** in the table is the `session` cookie of decision D6: register and login set
it (`Set-Cookie: session=<jwt>; HttpOnly; SameSite=Strict; Path=/api; Max-Age=3600`), the
browser sends it back, logout clears it (`Max-Age=0`). No response body contains the token. With
curl: `curl -c jar -b jar ...`.

## Endpoints

| Method and path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| `GET /health/live` | none | | `200 {"status":"ok"}` | |
| `GET /health/ready` | none | | `200 {"status":"ok"}` once Postgres answers | `503 UNAVAILABLE` |
| `POST /api/auth/register` | none | `Credentials` | `201 {user}` and a credential (the new user is signed in) | `400 VALIDATION_FAILED`, `409 EMAIL_TAKEN` |
| `POST /api/auth/login` | none | `Credentials` | `200 {user}` and a credential | `400 VALIDATION_FAILED`, `401 INVALID_CREDENTIALS` |
| `POST /api/auth/logout` | credential | | `204`, the cookie is cleared | |
| `GET /api/auth/me` | credential | | `200 {user}` | `401 UNAUTHENTICATED` |
| `GET /api/locations` | credential | | `200 {locations: Location[]}`, oldest first | `401 UNAUTHENTICATED` |
| `POST /api/locations` | credential | `NewLocation` | `201 {location}` | `400 VALIDATION_FAILED`, `401` |
| `POST /api/locations/import` | credential | `multipart/form-data`, field `file`: one `.zip`, at most 1 MiB | `201 {imported: n, locations: Location[]}` (only the new ones) | `400 VALIDATION_FAILED` (no file field), `401`, `413 PAYLOAD_TOO_LARGE`, `422 ZIP_*`, `422 FILE_*` |

Every `/api/*` route that needs a credential answers `401 UNAUTHENTICATED` without one, and
`401 TOKEN_EXPIRED` when it has expired. An unknown route answers `404 NOT_FOUND`.

## Schemas

```ts
Credentials = { email: string /* trimmed, lower-cased, valid email, at most 254 */,
                password: string /* 8 to 128 characters */ }
User        = { id: string /* uuid */, email: string, createdAt: string /* ISO 8601 */ }
NewLocation = { name: string /* trimmed, 1 to 200 */,
                latitude: number /* finite, -90..90 */,
                longitude: number /* finite, -180..180 */ }
Location    = NewLocation & { id: string /* uuid */, createdAt: string }
```

No response ever contains another user's data, a password hash, or `userId` (the caller knows
who they are).

## Examples

<!-- schema: NewLocation -->
```http
POST /api/locations
Content-Type: application/json

{"name":"Suria KLCC","latitude":3.157324409,"longitude":101.7121981}
```

<!-- schema: LocationResponse -->
```http
HTTP/1.1 201 Created
Content-Type: application/json

{"location":{"id":"7c1e9d04-2a4b-4c8d-9e1f-0123456789ab","name":"Suria KLCC","latitude":3.157324409,"longitude":101.7121981,"createdAt":"2026-11-16T09:30:00.000Z"}}
```

A ZIP with two files:

<!-- schema: ErrorBody -->
```http
HTTP/1.1 422 Unprocessable Content
Content-Type: application/json

{"error":{"code":"ZIP_ENTRY_COUNT","message":"The ZIP must contain exactly one text file; it contains 2 files.","details":{"files":["a.txt","b.txt"]},"requestId":"b0f3a1c2-4d5e-4f6a-8b9c-0123456789ab"}}
```
