---
name: retro
description: Runs when the candidate chooses, never inside a hunt. /retro is the only command that asks the candidate anything. It settles what is held, answers the Gmail inbox and then the LinkedIn inbox, and ends with suggestions. It gathers everything first and sends all its questions in one numbered message. It has one form and takes no argument.
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Agent, Bash(node process/engine.ts:*), Bash(git status:*), Bash(git log:*), Bash(ls:*)
---

# /retro

The whole procedure is section R10 of `process/instructions.md`. This file only says where to start.

1. Read `CLAUDE.md`.
2. Run `node process/engine.ts profile`. If it exits 2, stop and tell the candidate why.
3. Follow R10 from "Start". It has the fixed order of a sitting and every rule the sitting follows.

A hunt never runs `/retro`. The candidate runs it when they choose.
