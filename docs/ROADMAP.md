# Roadmap

The plan of record is the GitHub milestones; this file is their order and why. Every issue has
a milestone. Issues are written to the `issue-writing` skill.

| Milestone | What is true at the end | Notes |
|---|---|---|
| M0 Infra | CI green on Ubuntu and Windows with the scaffold; lockfile committed; labels, templates, agent rules in place | This bootstrap |
| M1 Backend | Every endpoint in `API.md` works with the errors in `ERRORS.md`; isolation and import tests green | Needs D6 and D9 decided first |
| M2 Frontend design | Two or three competing prototypes of the map and upload screens compared with the owner; D13 decided; a chosen layout | Owner session: explore the design space before building |
| M3 Frontend build | The four pages, sidebar, protected routes, map, form, upload popups; e2e green | Built against the chosen M2 design |
| M4 Delivery | README with setup and usage, Docker compose for the whole stack, every R row in `REQUIREMENTS.md` names its proof | |

Order inside M1: shared schemas and error codes, then config and the error middleware, then
the database and migrations, then auth, then locations, then the ZIP reader and the text parser
(both pure, so they can go in parallel with auth), then import.
