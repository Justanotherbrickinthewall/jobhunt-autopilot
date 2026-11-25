# Brief: the fixed resume variants

This file is the standing brief that `/profile` reads before it touches a variant. `/profile` fills it with the candidate in chat, one section at a time.

## Why

State why the candidate keeps a fixed set of variants instead of tailoring each application. `/profile` writes that reason here in one or two sentences.

## The variants

List each variant by folder name, with the role family it targets and which one is the default. `/profile` adds a line here whenever a variant is added, retired or re-defaulted.

## Source of truth

Name the file each variant is built from, and the order in which sources win when two disagree. `/profile` records here where a fact is read from, such as the portfolio or the Overleaf project.

## How each session works

Describe how a `/profile` session moves through a variant, section by section. `/profile` writes the order of work and the point at which a change is locked.

## Rules that always apply

This section holds the names and figures rules that `.claude/skills/profile/SKILL.md` line 185 follows. `/profile` writes them here with the candidate, and every later session obeys them.
