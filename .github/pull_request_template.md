## Goal

Closes #<n> once a reviewer has checked the gate. The owner's goal in one sentence.

## Evidence

Each gate line from the issue, with its command and result.

- [ ] Tests written first, seen failing: <test names>
- [ ] Negative control: <fix reverted> -> <test> fails
- [ ] `npm run ci` -> exit 0
- [ ] Ubuntu and Windows CI green

## Decisions and docs

D or R ids this relies on; docs updated in this PR (`docs/API.md`, `docs/ERRORS.md`, ...).

## UI (delete when nothing on screen changes)

- [ ] The "UI snapshots" comment is on this PR and shows the states this PR touches
- [ ] Flow budgets in `docs/UX_FLOWS.md` still hold (the flow specs pass), or the budget change is explained here
- [ ] Labelled `needs-owner-review`; every owner comment answered with a commit or an issue

