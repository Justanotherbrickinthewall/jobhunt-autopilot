---
name: hunt
description: Runs one job hunt from sweep to submit without stopping. /hunt go (or a bare /hunt) follows process/instructions.md steps 0 to 4 on every live lane, submits every clean form and holds the rest for /retro. /hunt --linkedin-ea, /hunt --linkedin-ex, /hunt --naukri, /hunt --hirist or /hunt --remote-boards runs one lane only. /hunt status prints a read-only report. /hunt --dry-run runs the whole flow, with or without a lane flag, and submits nothing.
argument-hint: "[go | --dry-run | --linkedin-ea | --linkedin-ex | --naukri | --hirist | --remote-boards | status]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Agent, Bash(node process/engine.ts:*), Bash(cp -R my-sessions/ledger:*), Bash(node process/tools/ea-apply.ts:*), Bash(node process/tools/naukri.ts:*), Bash(node process/tools/hirist.ts:*), Bash(node process/tools/li-harvest.ts:*), Bash(node process/tools/li-score.ts:*), Bash(git status:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*)
---

# /hunt

The procedure is in `process/instructions.md`. This file only says where to start.

## Before anything else

1. Read `CLAUDE.md`.
2. Resolve the profile with `node process/engine.ts profile`. If it exits 2, stop and tell the candidate why.

## /hunt go, or a bare /hunt

Open `process/instructions.md` and follow steps 0 to 4 in order. Each step names who does the work,
which model it runs on and the exact commands. The reference sections R0 to R15 hold the rules the
steps point to.

Invoking `/hunt` is the candidate's go-ahead to submit every clean form in this run, including the
employer's standard consent box. Log it once in step 1 with `session log "go-ahead: <the message that
started this run, verbatim>"`, as R7 says. Each applier brief carries that line verbatim.

A lane is live when it is in `search.live_sources` in the profile's `inputs.toml` and has a runner
file. Preflight prints the live lanes on its `Lanes:` line. While the LinkedIn security cooldown runs,
it leaves both LinkedIn lanes off that line and names them on a `Paused:` line. The hunt then works
`naukri`, `hirist`, `remote_boards` and `career_page` only, as R9 says. `naukri` is first on the `Lanes:` line when it is live.

## /hunt --linkedin-ea, /hunt --linkedin-ex, /hunt --naukri, /hunt --hirist or /hunt --remote-boards

The flag runs one lane only. `--linkedin-ea` is lane `linkedin-ea`, the Easy Apply roles.
`--linkedin-ex` is lane `linkedin-ex`, the roles that apply through an external link. `--naukri` is
lane `naukri`, the recruiter invites in the Naukri inbox. `--hirist` is lane `hirist`, the roles found
by search on Hirist. `--remote-boards` is lane `remote_boards`, the remote roles read from the public feeds of Remote OK, Himalayas, Remotive and We Work Remotely. Follow the
same steps as a bare `/hunt`, with two changes. Pass `--lanes <lane>` to `session open` in step 1,
and dispatch the sweep agent for that lane only in step 2. If the lane is on neither preflight's
`Lanes:` line nor its `Paused:` line, or `session open` exits 2, stop and tell the candidate which lanes
are live. If the lane is on the `Paused:` line, step 1 files a `blocked` finding and the run closes with
nothing worked. `go` may come with a flag, and changes nothing.

You are the orchestrator. You dispatch the agents each step names and you never do their work. You
open no browser page, because each browser agent pins Chrome itself. The things you run yourself are the Easy Apply script, as step 3c-1 of `process/instructions.md` says, the Naukri script, as step 2 and step 3c-2 say, and the Hirist script, as step 2 and step 3c-3 say. You never stop to ask the
candidate anything. A row that needs them is held, and `/retro` takes it up when they choose. Name
the model on every Agent call, as each step says.

## /hunt --dry-run

`--dry-run` runs steps 0 to 4 on a copy of the ledger and never submits, presses or sends. It combines
with any lane flag, such as `/hunt --dry-run --naukri`. It still takes the session lock and respects
the LinkedIn cooldown. Follow R15 of `process/instructions.md`. The run ends by saying that nothing was
submitted, listing what would have gone out and telling the candidate that `/hunt` without the flag runs
it live. `stated` 2026-11-26

## /hunt status

Run `node process/engine.ts status`, show its output and stop. It changes nothing.

## Arguments

The arguments are `go`, `status`, `--dry-run`, `--linkedin-ea`, `--linkedin-ex`, `--naukri`, `--hirist` and `--remote-boards`. Any other argument
gets a one-line reply naming the eight that exist.
