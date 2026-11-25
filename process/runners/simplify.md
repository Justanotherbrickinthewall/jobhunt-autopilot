# Runner: Simplify

<!-- Runner for source `simplify`. Read by sync. Not a skill. -->

## What it is

Simplify is a sync surface. It stores a resume and a structured profile, and its extension autofills applications from them. A stale profile there types itself into every form, so sync keeps it in step with the CV.

## Access

The run uses the candidate's pinned Chrome at `simplify.jobs/profile`. The stored profile's current state is in `my-profile/profile.md` under `## Sync surfaces`.

## Harvest

Not used. The Matches and Jobs tabs have never been swept, and the source check in `process/instructions.md` R9 comes first.

## JD reading

Not used.

## Apply

Not used. The applier never uses Simplify's autofill buttons, as `process/runners/external-ats.md` says.

## Known quirks

- In the resume upload dialog, tick "Parse this resume to update your profile information". Simplify then proposes the whole work history as a reviewable diff.
- Check that diff before saving. It can match an employer to a near-identical wrong company, leave new roles with no company, or duplicate an existing employer. Delete the old duplicate entry afterwards.
- Company and skill fields are typeaheads over a closed list, and typing drops characters. Set the value with a native setter and an `input` event. Then pick from the dropdown, or confirm through the `Add "<name>"` option at the top.
- The native setter does not stick on the experience description, and nothing reports the failure. Click into the textarea, press `cmd+a` and type. Read the card back after the panel closes.
- Skills are normalised on save, so "Large Language Models" becomes LLM. Deleting an experience cannot be undone.

## Open findings

None yet.
