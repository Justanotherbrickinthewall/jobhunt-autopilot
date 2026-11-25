# Runner: LinkedIn external

This runner is for lane `linkedin-ex`. It harvests LinkedIn roles whose Apply button leads to an employer's site. Every row it writes carries `source=linkedin`, with `channel=external_ats`, or `channel=unknown` when the Easy Apply pass failed. The shared LinkedIn mechanics are in `process/runners/linkedin.md`, and this file only says what differs.

## Access

Follow `## Access` in `process/runners/linkedin.md`.

## Harvest

Follow `## Harvest` in `process/runners/linkedin.md`, with these changes.

1. The posting window is `search.linkedin_ex_posted_within` in `my-profile/inputs.toml`. It is the `<window>` in the shared runner.
2. Run the shared runner's `### Classifying Easy Apply cheaply` pass on every keyword. Leave out every id it finds, because those roles belong to lane `linkedin-ea`. Write the rest as `external_ats` with the caveat that section asks for.
3. Name the lane `linkedin-ex` in every `session sweep` call, and in the sweep file names as `<firing>-linkedin-ex-<n>.json`. The file's `source` stays `linkedin`.

## Apply

Follow `process/runners/external-ats.md`. The job page's Apply link is read as `### What the live page still gives` in `process/runners/linkedin.md` says.
