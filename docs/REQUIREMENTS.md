# Requirements

The assessment brief, restated as numbered requirements so that issues, tests and the README
can cite them. The owner holds the original PDF; this file was checked against it clause by
clause on 2026-11-17, and every clause of the brief is a row here. The brief's objective: a
web application where authenticated users manage and visualize their own locations, added by
hand or by file upload, on an interactive map. Only the owner changes this file. Each row
names the issue that delivers it and the test that proves it; `(todo)` means not yet filed or
not yet written.

## Pages and navigation

| Id | Requirement | Issue | Proof |
|---|---|---|---|
| R1 | Four pages: register, login, map, file upload | #71, #72, #73, #74 | e2e `pages.spec.ts` |
| R2 | Sidebar navigation between pages, with a logout action | #71 | e2e `navigation.spec.ts`, `e2e/flows/F6.spec.ts`; web `AppShell.test.tsx` |

## Authentication and privacy

| Id | Requirement | Issue | Proof |
|---|---|---|---|
| R3 | JWT-based authentication | #2, #3 | api `auth.test.ts` |
| R4 | Map and upload pages are protected; an unauthenticated visitor is redirected to login | #3, #8, #34 | web `RequireAuth.test.tsx`, `AppRoutes.test.tsx`; e2e `e2e/flows/F7.spec.ts`, `navigation.spec.ts` |
| R5 | Locations belong to one user: user B never sees user A's markers | #4, #7, #15 | api `isolation.test.ts`, `api.model.test.ts`; e2e `isolation.spec.ts` |

## Interactive map

| Id | Requirement | Issue | Proof |
|---|---|---|---|
| R6 | The map uses react-leaflet | #73 | `apps/web/package.json`, `apps/web/src/map/LocationsMap.tsx` |
| R7 | A form takes a location name, latitude and longitude | #10, #73 | web `locationFormMachine.test.ts`, `useLocationForm.test.ts`, `MapPage.test.tsx` |
| R8 | On submit, the new location appears as a clickable marker without a page reload | #4, #10, #73 | e2e `map.spec.ts`, `e2e/flows/F3.spec.ts` |
| R9 | Clicking a marker shows the location's name | #73 | e2e `map.spec.ts`, `e2e/flows/F4.spec.ts` |

## File upload

| Id | Requirement | Issue | Proof |
|---|---|---|---|
| R10 | Upload one ZIP file holding exactly one text file of names and coordinates | #6, #7, #74 | api `readSingleTextFile.test.ts`, `import.test.ts`; e2e `upload.spec.ts`, `e2e/flows/F5.spec.ts` |
| R11 | After a successful upload, a confirmation popup shows for three seconds, then every location in the file is added to the map | #7, #9, #74 | web `uploadMachine.test.ts`, `useUploadFlow.test.tsx`, `UploadPage.test.tsx`; e2e `upload.spec.ts` |
| R12 | If the ZIP holds anything other than a single text file, an error popup shows for three seconds | #6, #9, #74 | api `readSingleTextFile.test.ts`, `import.test.ts`; web `uploadMessages.test.ts`, `UploadPage.test.tsx`; e2e `upload.spec.ts` |
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
| R19 | A comprehensive README with clear setup and usage instructions | `README.md` (#13), with the demo recorded by `e2e/demo.spec.ts` |
| R20 | Bonus: a Dockerized backend | `apps/api/Dockerfile`, `apps/web/Dockerfile`, `docker-compose.yml`; the whole stack is one `docker compose up` (#13), checked by e2e `delivery.spec.ts` |
