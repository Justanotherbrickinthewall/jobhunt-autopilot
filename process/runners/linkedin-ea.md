# Runner: LinkedIn Easy Apply

This runner is for lane `linkedin-ea`. It harvests LinkedIn roles that take Easy Apply. Every row it writes carries `source=linkedin` and `channel=easy_apply`. The shared LinkedIn mechanics are in `process/runners/linkedin.md`, and this file only says what differs.

## Access

Follow `## Access` in `process/runners/linkedin.md`.

## Harvest

Follow `## Harvest` in `process/runners/linkedin.md`, with these changes.

1. The posting window is the output of `node process/engine.ts session ea-window`. It is the `<window>` in the shared runner. Skip the shared runner's more-than-24-hours rule.
2. Add `&f_AL=true` to every search URL. LinkedIn then returns Easy Apply roles only, so every kept row is `easy_apply`. Skip the shared runner's `### Classifying Easy Apply cheaply`.
3. Name the lane `linkedin-ea` in every `session sweep` call, and in the sweep file names as `<firing>-linkedin-ea-<n>.json`. The file's `source` stays `linkedin`.

## Apply

Follow `### Easy Apply` in `process/runners/linkedin.md`.
