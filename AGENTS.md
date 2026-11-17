# LocationManagement: rules for agents

How to work (goal first, evidence, tests first, the owner decides, handoffs) is the
`iskandar-mode` skill. This file is what is specific to this repository; where the two
disagree, this file wins. `CLAUDE.md` points here.

LocationManagement is a full-stack technical assessment: authenticated users manage their own
locations on a react-leaflet map, by form or by uploading a ZIP with one text file. The brief,
as numbered requirements R1-R20, is [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md); it is the
assessor's requirement, and only the owner changes it.
Decisions are numbered in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md); the HTTP contract is
[`docs/API.md`](docs/API.md); errors are [`docs/ERRORS.md`](docs/ERRORS.md); flows with states
are [`docs/STATE_MACHINES.md`](docs/STATE_MACHINES.md); screens, user flows and their step budgets are
[`docs/UX_FLOWS.md`](docs/UX_FLOWS.md). The plan of record is the GitHub
milestones and [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Layout

| Path | What |
|---|---|
| `apps/api` | Express 5 API, TypeScript, Postgres through `pg` with plain SQL migrations |
| `apps/web` | Vite + React SPA, Tailwind, react-router, Zustand, react-leaflet |
| `packages/shared` | zod schemas and error codes shared by api and web: the contract in code |
| `.agents/state/` | task state (the `task-state` skill); the handoff between agents |

## The skeleton is the contract (D17-D20)

The code's shape already exists: every module, type and signature the issues need is in the
tree, with bodies that call `notImplemented('#<issue> ...')`. An issue fills the bodies its
number names.

- **Do not change a skeleton signature, type, export or file location.** If the body cannot be written behind the signature as it is, stop with `needs-decision` and say what the signature lacks.
- **Do not add a module, folder or second way to do a task** the skeleton already covers (an HTTP client, a database helper, a validation step).
- **Every response a test reads goes through `expectBody(res, status, Schema)`** (`apps/api/test/helpers.ts`) with the strict schema from `@lm/shared`.
- **API tests use `testApp` / `testDeps`**: a fixed clock and sequential ids. A test that needs time to pass calls `clock.advance(ms)`; nothing sleeps.
- **A reducer's test calls `checkMachine`** (`apps/web/src/test/machine.ts`) with a sample of every state kind and event type, then adds the case tests the issue lists.
- The full list of checks is "What enforces it" in `docs/ARCHITECTURE.md`. All run in `npm run ci`.

## Changing behaviour and tests

Before you edit an existing test, a transition table, `docs/STATE_MACHINES.md`,
`docs/UX_FLOWS.md`, `docs/API.md` or `docs/ERRORS.md`, read the `changing-behaviour` skill. Name
the kind of change (new behaviour, refactor, decided change, wrong test); add a state through its
whole chain (chart, table, reducer, `checkMachine` samples, UX rows, screens); and run
`node scripts/check-test-diff.mjs origin/main` before you push. The `Test guard` CI check fails
on anything that can weaken the tests until the owner adds `test-change-approved`. Never add that
label yourself.

## UI work is reviewed from screenshots

Follow the `ui-evidence` skill for any change to what a screen shows, any UI bug and any design
option. In short: states and flows have ids in `docs/UX_FLOWS.md`; built states are captured by
`npm run snapshots`, flows count their steps against the doc's budget in `npm run e2e`; the
"UI snapshots" workflow posts before/after images on the PR; a UI PR carries
`needs-owner-review` and leaves draft only after the owner has commented. Bugs and UX findings
use the Bug and UX feedback forms with a screenshot.

## Which issues

- Work only on issues labelled `ready:antigravity` with no `wip:` label. An empty queue means stop and say so.
- An issue blocked by another (first line "Blocked by #N") waits until #N is closed.
- Never start an issue labelled `outline` or `needs-decision`.
- Building these as their decisions and docs say is open to any agent; *changing* them needs the owner. Stop with `needs-decision` and say which:
  - authentication: password hashing, JWT signing, verification or storage (D5, D6);
  - the user-isolation rule (D7): any query on `locations` without `user_id`;
  - the ZIP and text-file acceptance rules (D9, D10);
  - the error envelope or an error code's meaning (`docs/ERRORS.md`);
  - a change to `docs/API.md` that a client would notice;
  - any decision in `docs/ARCHITECTURE.md`. A test never reverses one.
- A PR that touches authentication, isolation, or the ZIP and text parsers gets a challenger review (pstack's `interrogate`, or Antigravity's challenger role) before it leaves draft. The issue says so in its Gate.

## How an issue is worked

1. Add `wip:antigravity` (or `wip:claude`). Branch from `main`: `issue/<n>-<slug>`.
2. Read the Goal, the Gate and the Stop list. Write the tests first and show them failing.
3. Commit as `Iskandar Norazli <111472977+iskandarnorazli@users.noreply.github.com>`, with no AI or Co-Authored-By lines. The message states the tests added, the commands run with their results, and the negative control: the fix turned off, the new test failing.
4. Push the branch and open a **draft** PR. Never push `main`, never force-push, never merge.
5. Comment on the issue only after both CI jobs have finished. Write the comment to a file and post it with `gh issue comment <n> --body-file <file>`: PowerShell turns backticks in `--body` into escape characters (the 2026-11-17 audit found every gate comment garbled). Each gate line names its command and its result; each CI line names the run URL and its conclusion. "Running" or "triggered" is not evidence. Remove `wip:`, add `needs-review`. Never close an issue; the owner or a reviewer who did not build it does.
6. Stop and leave a comment when the work needs a file the issue does not list, a design decision, or a change to an existing test's expectation (the `changing-behaviour` skill says which changes those are).

## Gate commands

| What | Command |
|---|---|
| Everything CI's test job runs | `npm run ci` (lint, typecheck, unit and API tests, build) |
| API tests (need Postgres, `DATABASE_URL`) | `npm test -w apps/api` |
| Web unit tests | `npm test -w apps/web` |
| End to end (whole stack) | `docker compose up -d --build && npm run e2e` |
| Docs name files that exist | `node scripts/check-docs.mjs` |
| Charts match transition tables | `node scripts/check-state-machines.mjs` |
| Skill mirror in sync | `node scripts/check-skill-mirror.mjs` |
| UX doc matches e2e code | `node scripts/check-ux.mjs` |
| Nothing weakens the tests | `node scripts/check-test-diff.mjs origin/main` |
| Screenshots of every built state | `SNAP_DIR=snapshots npm run snapshots` |

Postgres for local tests: `docker compose up -d db`, then
`DATABASE_URL=postgres://app:app@localhost:5432/app_test`.

## Rules for code

- **Every location query takes a `UserId`.** The repository functions in `apps/api/src/locations/` are the only code that touches the `locations` table, and each one takes the caller's id as its first argument. A handler never reads `user_id` from the request body (D7). Isolation has its own test: two users, and user B sees none of A's rows on every route.
- **Errors go through one envelope.** Throw an `AppError` with a code from `packages/shared/src/errors.ts`; the error middleware turns it into the JSON in `docs/ERRORS.md`. No `res.status(4xx).json(...)` in handlers. An unknown error is a 500 with code `INTERNAL` and no stack in the body.
- **Validate at the edge with the shared zod schema.** The web form and the API use the same schema from `packages/shared`.
- **Flows with states are explicit.** The upload popup and the auth session are state machines (`docs/STATE_MACHINES.md`): a reducer over a union of states, a test per (state, event) pair. No loose booleans like `isLoading && !isError`.
- **Both platforms.** CI runs Windows and Linux. Use `node:path`, no shell-specific npm scripts (no `rm -rf`, no `&&` chains that assume bash, no `VAR=x cmd`; use `cross-env` or a node script).

## Traps

- **react-leaflet's default marker icon is broken under Vite** (the icon URLs are resolved by the bundler). Import the icon images and set `L.Icon.Default` options once in `apps/web/src/map/leafletIcons.ts`.
- **ZIPs made by macOS Finder add `__MACOSX/` entries.** D9 ignores them (and directory entries and `.DS_Store`); every other extra entry is an error.
- **The sample file has a header row and spaces after commas** (`Name, Latitude, Longitude`). The parser rules are D10.
- **Windows runners have no service containers.** CI's Windows job starts the preinstalled PostgreSQL instead (see `.github/workflows/ci.yml`).
- **`workflow_dispatch` only finds workflows on `main`.** A new workflow file runs by dispatch only after it is merged.
- **Stage files by name**, never `git add -A`: `.env` files hold secrets and are git-ignored, keep it that way.
