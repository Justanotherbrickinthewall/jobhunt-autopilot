# Runner: Company sites

## What it is

This runner is a planned stub. It would sweep employers' own careers pages for roles that never reach a job board. It has never run. `my-sessions/ledger/company-careers.csv` seeds it, with one row per employer. Its columns are `COMPANY_CAREERS_COLS` in `process/constants.ts`. Every `career_page` finding adds a row through `/retro`, and a root already present is skipped.

## Access

Greenhouse, Lever and Ashby boards are public, so a sweep should need no login. This is untested.

## Harvest

Not built. The intended sweep takes the rows of `my-sessions/ledger/company-careers.csv` where `sweepable` is `yes`. It lists each root's open roles through its vendor's board, using the URL tells in `process/runners/external-ats.md`. After `node process/engine.ts dedupe check`, it writes each role to the session's `.stage/sweep/` with `source` `career_page` and `channel` `direct`.

## JD reading

It has no recipe of its own. The matcher reads the description on the employer's board page.

## Apply

A `direct` row is applied to on the employer's own site, using the mechanics in `process/runners/external-ats.md`.

## Known quirks

None yet.

## Open findings

None yet.
