---
name: outreach
description: Writes first contacts on LinkedIn, in lanes. The roles lane finds one person at each applied or held role above the bar. The posts lane searches LinkedIn posts for open roles and judges each one. /outreach runs every live lane, roles first. /outreach --roles or /outreach --posts runs one. It drafts, sends within the prospect caps and withdraws stale connection requests, in one run. It is AFK, asks nothing and never sends email. It does not touch the inbox, because /retro reads, drafts and sends every reply. /outreach status prints a read-only report.
argument-hint: "[--roles | --posts | status]"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Agent, Bash(node process/engine.ts:*), Bash(git status:*)
---

# /outreach

The procedure is R14 in `process/instructions.md`. This file only says where to start.

## Before anything else

1. Read `CLAUDE.md`.
2. Resolve the profile with `node process/engine.ts profile`. If it exits 2, stop and tell the candidate why.

## /outreach

Open `process/instructions.md` and follow R14 in order. `/outreach` always runs steps O0, O1a for `roles`,
O1b for `posts`, O1c and O3, in one run folder. Each step names who does the work, which model it runs on
and the exact commands. `stated` 2026-11-10

Invoking `/outreach` is the go-ahead for finding a person for each due role, searching the posts, and drafting and sending the drafts in O1c. The run
never asks the candidate anything. It never reads the mailbox or sends email, and a post's email
address becomes an `email` finding that `/retro` settles. The inbox belongs to `/retro`, which reads
every thread, drafts the replies and sends each one after the candidate says send. If `outreach open`
refuses, because a security cooldown is running, report its `STOP:` line in
chat and stop, because no run folder exists. An open retro run only prints a `WARN:` line, so the run
goes on and the parent logs that line. `stated` 2026-11-25 The run ends with `outreach close`. Report its line, the
`prospect send` line and any `STOPPED` line. `stated` 2026-11-02

You are the orchestrator. You dispatch the agents each step names and you never do their work. The
post-reader runs O1a in roles mode and O1b in posts mode, and the messenger runs O1c.

If `outreach lanes` exits 2, or the flag's lane is not live, the skill reports in one line and stops, as O0 step 2 says. You open no browser page, and you never send a
message or an invitation yourself. Name the model on every Agent call, as each step says. File every
stop as `### When a step stops` in R14 says.

## /outreach status

Read-only. Change nothing and dispatch no agent. Print prospect counts, the budget and the cooldown,
and nothing about the inbox.

1. Find the newest `my-sessions/*-outreach/notes.md` with Glob. If Glob finds none, print that no
   outreach run folder exists and carry on to step 3. Otherwise read its front-matter with Read.
2. Print the `phase` field. If `phase` is `closed`, print the four counts `replied`, `held`,
   `declined` and `skipped`, and the last `outreach closed:` line under `## Log`, which also holds the
   `accepted` and `withdrawn` counts. If `phase` is `running`, say the counts arrive at close, and
   print no counts. The counts are written only by `outreach close`.
3. Run `node process/engine.ts --ledger my-sessions/ledger outreach lanes 2>&1` and print the lanes on one line. Then run `outreach roles` the same way and print only its first line, the `roles due` count. If either exits 2, print its reason and carry on.
4. Run `node process/engine.ts --ledger my-sessions/ledger outreach budget 2>&1` and print its lines.
   If it exits 2, print its reason and carry on.
5. Run `node process/engine.ts --ledger my-sessions/ledger outreach cooldown 2>&1` and print its line.
   It prints `clear`, or `until <time>` and exits 2 while the cooldown runs. Exit 2 is the answer, not
   an error.

## Arguments

`status`, `--roles` and `--posts` are the arguments. A bare `/outreach` runs every live lane, `roles` first. Any other argument gets a one-line reply naming the three, and the run does not start. `stated` 2026-11-10
