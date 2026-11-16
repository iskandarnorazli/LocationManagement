# Location Management

A full-stack web app where each signed-in user keeps their own locations on an interactive map.
Add them one at a time with a form, or many at once by uploading a ZIP that holds one text file.

> Status: infrastructure only. The features are being built through the issues in
> [M1 Backend](docs/ROADMAP.md) and later milestones. This README gains its usage section when
> M3 lands.

## Stack

| Part | Choice |
|---|---|
| Web | React (Vite), TypeScript, Tailwind CSS, react-router, Zustand, react-leaflet |
| API | Node.js 22, Express 5, TypeScript |
| Database | PostgreSQL 16 |
| Auth | JWT |
| Tests | Vitest, supertest, Playwright |

## Run it locally

Needs Node.js 22 and Docker. On Windows, use PowerShell; every command below works there too.

```sh
npm ci
docker compose up -d db            # Postgres on localhost:5432, databases app and app_test
cp .env.example apps/api/.env      # then edit JWT_SECRET
npm run dev -w @lm/api             # API on http://localhost:3000
npm run dev -w @lm/web             # web on http://localhost:5173 (proxies /api to the API)
```

Or the API and database together in Docker: `docker compose up -d --build`.

## Test

```sh
# Postgres from docker compose; the tests wipe app_test, never app.
DATABASE_URL=postgres://app:app@localhost:5432/app_test npm run ci   # bash
$env:DATABASE_URL="postgres://app:app@localhost:5432/app_test"; npm run ci   # PowerShell
npx playwright install chromium && npm run e2e                     # with the stack running
```

## Documents

| File | What |
|---|---|
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | The brief as numbered requirements, each with its proof |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Decisions D1-D16 and what else was considered |
| [docs/API.md](docs/API.md) | Endpoints and schemas |
| [docs/ERRORS.md](docs/ERRORS.md) | The error envelope and codes |
| [docs/STATE_MACHINES.md](docs/STATE_MACHINES.md) | Session, upload and form flows |
| [docs/UX_FLOWS.md](docs/UX_FLOWS.md) | Screens, user flows with step budgets, and how to review the UI |
| [AGENTS.md](AGENTS.md) | Rules for anyone (or any agent) working on an issue |
