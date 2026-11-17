# Location Management

A web app where each signed-in user keeps their own locations on an interactive map. Add one with
a form, or many at once by uploading a ZIP that holds one text file of names and coordinates. Every
user sees only their own markers.

![Demo: create an account, add a location, open it, swipe up to the list, upload a ZIP, see the new row on the map, log out](docs/demo.gif)

The demo above is recorded by [e2e/demo.spec.ts](e2e/demo.spec.ts) on every UI change, not by
hand. Full resolution: [docs/demo.webm](docs/demo.webm).

## Try it: one command

Needs [Docker](https://docs.docker.com/get-docker/) (Docker Desktop on Windows or macOS). The same
commands work in PowerShell and in a Unix shell.

```sh
docker compose up -d --build
```

Open **http://localhost:8080**, create an account, and you are on the map. The first build takes a
few minutes; later starts take seconds. Stop with `docker compose down` (add `-v` to delete the
data too).

Three containers start: `db` (PostgreSQL 16), `api` (the Express API, also on port 3000) and `web`
(the built app on port 8080, served by nginx, which forwards `/api` to the API).

## Using it

| Page | What you can do |
|---|---|
| **Create an account** / **Sign in** | Email and a password of 8 to 128 characters. A wrong password, a taken email or too many attempts each get a clear message. |
| **Map** | Your markers on a map of the world. Click a marker to see its name. Add a location with the form at the bottom: a name, a latitude (-90 to 90) and a longitude (-180 to 180). It appears at once, no reload. Swipe the sheet up, or tap its handle, to see the list of your locations. |
| **Upload** | Choose a ZIP and press Upload. A popup confirms for three seconds; then the new rows are highlighted in your list, with a link that opens the map on them. If the ZIP is not acceptable, a popup says why for three seconds and nothing is added. |
| **Sidebar** | Map, Upload, your email, and Log out. On a phone it opens from the menu button. |

| Map, desktop | The list, phone | Upload, after a ZIP |
|---|---|---|
| ![Markers in Kuala Lumpur with the add form at the bottom](docs/screenshots/map-desktop.jpg) | ![The sheet swiped up: the form and the list](docs/screenshots/list-phone.jpg) | ![Three new rows highlighted with a link to the map](docs/screenshots/upload-desktop.jpg) |

| A marker's name | An upload refused |
|---|---|
| ![A popup with the location's name](docs/screenshots/popup-desktop.jpg) | ![The popup naming the two files the ZIP holds](docs/screenshots/upload-error-phone.jpg) |

### What the ZIP may hold

A ready-made file is in [docs/sample/locations.zip](docs/sample/locations.zip) (the brief's
sample, [docs/sample/locations.txt](docs/sample/locations.txt)).

- **One `.txt` file**, and nothing else. Folders, `__MACOSX/` and `.DS_Store` (which macOS adds)
  are ignored; any other second file is refused with the names of the files found.
- **One location per line:** `Name, Latitude, Longitude`. A header line like the sample's is
  allowed, and spaces after commas are fine.
- **All or nothing:** if any line is wrong, nothing is imported, and the popup names the first bad
  line.
- **Limits:** the ZIP at most 1 MiB; the text at most 5 MiB once unpacked, counted on the bytes
  actually read, whatever the ZIP's header claims; at most 5,000 lines.

## Develop

Needs Node.js 26 (see [.nvmrc](.nvmrc)) and Docker for the database.

```sh
npm ci
docker compose up -d db                 # Postgres on localhost:5432 (databases app and app_test)
cp .env.example apps/api/.env           # then set JWT_SECRET to 32 or more random characters
npm run dev -w @lm/api                  # API on http://localhost:3000
npm run dev -w @lm/web                  # web on http://localhost:5173 (proxies /api to the API)
```

## Test

```sh
# Unit and API tests (the API tests use the app_test database and wipe it, never app)
DATABASE_URL=postgres://app:app@localhost:5432/app_test npm run ci              # bash
$env:DATABASE_URL="postgres://app:app@localhost:5432/app_test"; npm run ci      # PowerShell

# End to end, with the whole stack running (docker compose up -d --build)
npx playwright install chromium
npm run e2e
```

`npm run ci` runs lint, the architecture checks, type checks, the unit and API tests and the build.
CI runs it on Ubuntu and Windows, plus the end-to-end suite against the Docker stack. On every
pull request that touches the UI, a workflow posts screenshots of every screen, desktop and phone,
and a video of every user flow.

## How it is built

| Part | Choice |
|---|---|
| Web | React (Vite), TypeScript, Tailwind CSS, react-router, Zustand, react-leaflet |
| API | Node.js 26, Express 5, TypeScript, `pg` with plain SQL migrations |
| Database | PostgreSQL 16 |
| Auth | JWT in an httpOnly, SameSite=Strict cookie; passwords hashed with scrypt |
| Tests | Vitest, supertest on a real Postgres, fast-check, Playwright |

The parts worth a reviewer's time:

- **Privacy by construction.** The user id comes only from the verified token, and every query on
  `locations` takes it as its first argument. A two-user API test, a seeded
  model-based test runs random command sequences for three users against a reference model, and an
  end-to-end test checks that user B never sees user A's markers.
- **Uploads are not trusted.** The ZIP is read in memory, one entry, with every size and count
  bounded by what is actually read. Imports are all or nothing, in one transaction.
- **Rate limits** on login, registration and imports answer `429` with `Retry-After`.
- **Every error** is one JSON envelope with a stable code ([docs/ERRORS.md](docs/ERRORS.md)).
- **Screens with states** (the session, the upload, the location form) are explicit state machines,
  each with a test for every pair of state and event.
- **Every requirement of the brief** names the test that proves it in
  [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md), and CI fails if a named test goes missing.

## Project layout

| Path | What |
|---|---|
| `apps/api` | Express API: `auth/`, `locations/`, `import/` (ZIP reader and text parser), `http/` (errors, limits), SQL migrations |
| `apps/web` | React app: `pages/`, `map/` (map, sheet, form, store), `upload/`, `session/`, `layout/` |
| `packages/shared` | zod schemas and error codes used by both: the API contract in code |
| `e2e` | Playwright: end-to-end specs, user flows with step budgets, screenshots |
| `docs` | Requirements, decisions, API, errors, state machines, UX flows, design |

## Documents

| File | What |
|---|---|
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | The brief as numbered requirements, each with its proof |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Decisions D1-D24, what else was considered, and the limits |
| [docs/API.md](docs/API.md) | Endpoints and schemas |
| [docs/ERRORS.md](docs/ERRORS.md) | The error envelope and codes |
| [docs/STATE_MACHINES.md](docs/STATE_MACHINES.md) | Session, upload and form flows |
| [docs/UX_FLOWS.md](docs/UX_FLOWS.md) | Screens, user flows with step budgets, and how to review the UI |
| [AGENTS.md](AGENTS.md) | Rules for anyone (or any agent) working on an issue |
