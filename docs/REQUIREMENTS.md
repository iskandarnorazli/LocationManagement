# Requirements

The assessment brief, restated as numbered requirements so that issues, tests and the README
can cite them. The owner holds the original PDF. Only the owner changes this file. Each row
names the issue that delivers it and the test that proves it; `(todo)` means not yet filed or
not yet written.

## Pages and navigation

| Id | Requirement | Issue | Proof |
|---|---|---|---|
| R1 | Four pages: register, login, map, file upload | #12 | e2e `pages.spec.ts` |
| R2 | Sidebar navigation between pages, with a logout action | #12 | e2e `navigation.spec.ts` |

## Authentication and privacy

| Id | Requirement | Issue | Proof |
|---|---|---|---|
| R3 | JWT-based authentication | #2, #3 | api `auth.test.ts` |
| R4 | Map and upload pages are protected; an unauthenticated visitor is redirected to login | #3, #8 | web `RequireAuth.test.tsx`, e2e |
| R5 | Locations belong to one user: user B never sees user A's markers | #4, #7 | api `isolation.test.ts`, e2e |

## Interactive map

| Id | Requirement | Issue | Proof |
|---|---|---|---|
| R6 | The map uses react-leaflet | #12 | `apps/web/package.json` |
| R7 | A form takes a location name, latitude and longitude | #10, #12 | web `LocationForm.test.tsx` |
| R8 | On submit, the new location appears as a clickable marker without a page reload | #4, #10, #12 | e2e `map.spec.ts` |
| R9 | Clicking a marker shows the location's name | #12 | e2e `map.spec.ts` |

## File upload

| Id | Requirement | Issue | Proof |
|---|---|---|---|
| R10 | Upload one ZIP file holding exactly one text file of names and coordinates | #6, #7 | api `zip.test.ts` |
| R11 | After a successful upload, a confirmation popup shows for three seconds, then every location in the file is added to the map | #7, #9 | web `uploadMachine.test.ts`, e2e `upload.spec.ts` |
| R12 | If the ZIP holds anything other than a single text file, an error popup shows for three seconds | #6, #9 | api `zip.test.ts`, e2e `upload.spec.ts` |
| R13 | The text file is comma-separated `Name, Latitude, Longitude`, as in the sample below | #5 | api `parseLocations.test.ts` |

The sample from the brief, kept as the first fixture (`apps/api/test/fixtures/sample.txt`):

```text
Name, Latitude, Longitude
Suria KLCC,3.157324409,101.7121981
Zoo Negara,3.21054160,101.75920504
```

## Technical constraints

| Id | Requirement | Where it is met |
|---|---|---|
| R14 | Frontend: React or Next.js, with Bootstrap or Tailwind | D1: Vite + React, Tailwind |
| R15 | Backend: Node.js and Express | D1: Express 5 |
| R16 | Database: PostgreSQL or MySQL | D1: PostgreSQL 16 |
| R17 | Language: JavaScript or TypeScript; state management optional (Redux, Zustand, ...) | D1: TypeScript, Zustand |

## Deliverables

| Id | Requirement | Where it is met |
|---|---|---|
| R18 | Complete source in a GitHub repository | this repository |
| R19 | A README with clear setup and usage instructions | `README.md` |
| R20 | Bonus: a Dockerized backend | `apps/api/Dockerfile`, `docker-compose.yml` |
