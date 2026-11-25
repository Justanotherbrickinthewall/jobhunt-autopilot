---
name: profile
description: Works on the candidate's profile with them in chat. /profile reviews or changes a resume variant section by section, adds, retires or re-defaults a variant, and defines faq.md entries one by one. Every locked change to a variant flows to its .tex, an Overleaf compile at two pages and the PDF in its folder. A change to the default variant also flows to the LinkedIn and Naukri profiles, and each run offers a small Naukri refresh when the last one is old enough. Use when the candidate says they want to work on a resume, a variant or the FAQs.
argument-hint: "[what to work on, in the candidate's words]"
allowed-tools: Read, Write, Edit, Grep, Glob, Agent, Bash(node process/engine.ts:*), Bash(git status:*), Bash(git diff:*), Bash(ls:*), Bash(mv:*), Bash(cp:*), Bash(grep:*), Bash(sed -n:*)
---

# /profile

This skill is human in the loop. The candidate drives it, and nothing ships without them. The
usual model is Opus 5.5. `stated` 2026-11-02

## Start of a run

1. Read `CLAUDE.md`.
2. Resolve the profile with `node process/engine.ts profile`. If it exits 2, stop and tell the candidate why.
3. Open this run's folder with `node process/engine.ts outreach open --kind profile`. It prints the
   path, called R below. Log each change you lock or ship with
   `node process/engine.ts --session R outreach log "<text>"`, because `/retro`'s suggestions phase
   reads the folder. Never put a pay figure in a log line.
4. Run `node process/engine.ts validate` and show the candidate every `STALE RESUME` line it prints.
   A stale PDF is rebuilt through "The pipeline" below.
5. Read the `## Resume variants` section of `profile.md`, with the rules above its table. Never
   read `## Private pay`. Use grep for the heading lines, then `sed -n` on the ranges you need.
6. Read `resume/variants-brief.md`, and the caveats in `work-portfolio.md`.
7. Offer the Naukri refresh. Read `Naukri last changed: <YYYY-MM-DD>` under `## Sync surfaces` in
   `profile.md`, and read `budgets.naukri_refresh_days` by running `grep -n naukri_refresh_days` on
   the profile's `inputs.toml`, because that file also holds the pay table. If the date is older than
   that many days, or the line is missing, offer a small Naukri change. A small change bumps the
   profile for recent activity, and that brings recruiter calls. Prepare the exact change as a before-and-after diff, such as one
   reworded summary sentence that changes no fact, and put it on this run's outward list. It goes only
   on the candidate's yes, as "Outward writes" says. `stated` 2026-11-02
8. If the opening phrase names the work, start it. If it doesn't, ask what to work on in one line.
   Offer the options the table gives: a named variant, a new variant, a re-default or the FAQs.

## How the conversation runs

1. Ask in plain numbered questions in chat. Never use AskUserQuestion.
2. Show one section at a time, in its final wording. Lock it only when the candidate says so.
3. The candidate dictates, so read past typos. Expand a terse answer into full wording before
   showing it. Never paste it verbatim into an outside-reader file.
4. Act on each answer at once. Local edits need no "approve?" follow-up.
5. Outward writes are the one exception, as the next section says.

## Outward writes

An outward write is anything that leaves the Mac or changes a site. That covers the Overleaf upload
and compile, the PDF download, and every LinkedIn or Naukri profile edit.

1. Each needs the candidate's yes in this run's chat, for that item.
2. Batch them. Show the list of writes, and one yes covers that shown list.
3. Each write runs in a `general-purpose` subagent on `model: sonnet`, named on the call. It uses
   only the pinned Chrome from `process/local.json`, never the built-in browser.
4. The subagent's prompt quotes the candidate's yes verbatim, and names the items it covers. The
   auto-mode classifier blocks Overleaf uploads and Overwrite clicks as `[External System Writes]`
   unless the prompt carries those words.
5. The subagent never enters a credential. If a site asks for a login, it stops and reports.
6. A blocked call is never repeated. Quote the denial text to the candidate and carry on with the
   rest.
7. This skill never sends a LinkedIn message. Messages belong to `/outreach` and `/retro` only.
8. While `node process/engine.ts outreach cooldown` exits 2, no LinkedIn edit goes out. Tell the
   candidate the time it prints. The Naukri and Overleaf writes carry on. A subagent that meets a
   LinkedIn security check, as `### Browser rules` in R6 of `process/instructions.md` defines it, stops
   and reports it. The parent runs `node process/engine.ts --session R outreach stop --reason "<what
   the page showed>"`. `ours` 2026-11-02

## Changing a variant

A variant lives in `resume/<variant>/`. The `<variant>.md` holds the locked text and its notes. It
is the source of truth, and R11 in `process/instructions.md` says what follows from it.

1. Work in the order the variants brief sets: headline and summary first, then each role from the
   most recent, then skills. A wording change, an addition or a removal can start anywhere.
2. Show the section before and after. Lock it on the candidate's word, then write it to
   `<variant>.md` with its tag.
3. Make the same change in `<variant>.tex` at once. Keep the preamble, header and Education section
   as they are.
4. Check every fact in the change against the other variants and the profile files, as "Facts"
   below says.
5. When the candidate has finished, run the pipeline below.

## The pipeline

A locked change to a variant's `.md` always flows in this order. Never skip a step or reorder them.

1. The `.md` is locked and the `.tex` matches it.
2. Show the outward list: upload this `.tex` to the Overleaf project, compile it, download the PDF.
   Wait for the yes.
3. The subagent opens the Overleaf project by the id in `profile.md`. It uploads the `.tex` through
   the file tree's Upload button under the variant's Overleaf filename, and chooses Overwrite. It
   clicks OK on "Document Updated Externally". R11 in `process/instructions.md` has these mechanics.
4. It right-clicks that file in the file tree and sets it as the main document. It compiles on
   pdfLaTeX, then reports the page count and the error count.
5. The result must be exactly 2 pages with 0 errors. Overleaf sets text longer than local TeX, so
   judge the count on Overleaf only.
6. Over 2 pages means trim with the candidate. Propose cuts, lock them in the `.md` and `.tex`, and
   go back to step 2. A re-upload needs a yes, which can come in the reply that locks the trim.
7. On 2 pages, it clicks Download PDF. The file lands in `~/Downloads`, under the name R11 gives.
   Move it with `mv` into the variant's folder, under the filename the variant table gives.
8. It sets the default variant's Overleaf file back as the main document.
9. If the variant is the default, run "The default variant" below.

## The default variant

The default is the row with `yes` under Default in the variant table. A change to its text, or a
re-default, also changes what recruiters see on LinkedIn and Naukri.

Neither site is a copy of the resume. Its facts, titles and dates must match the default resume, but
each site gets its own wording for its own reader. Never paste resume bullets into either one.
`stated` 2026-10-23

1. Prepare a LinkedIn update. Professionals read LinkedIn, not only recruiters. Its headline and
   About match the default resume. Each role's description is a short story of three to five
   sentences in the first person, moving from the problem to what was built and what changed. Put
   the point in the first sentence, because LinkedIn shows only about two lines before "more" and
   few readers click it. Never open with a label such as "Contract engagement." or a line break.
   The contract status goes in the title, as "(Contract)", or in the Employment type field.
   `stated` 2026-10-24 Use no bullets and at most one figure. Put two or three of the role's key skills in LinkedIn's
   per-role Skills field, not in the text. Searchable keywords live in the headline, the titles
   and the Skills section.
2. Prepare a Naukri update. Recruiters read Naukri and search it by keyword. Its summary,
   designations and key skills match the same resume. Naukri shows each description as one block
   with no line breaks, so write each role as one technical paragraph that names the specific
   tools, methods and figures. It may be denser than LinkedIn, but it must still read as prose.
3. Show both as before-and-after diffs in one batch, and wait for the yes.
4. Apply them through the subagent. LinkedIn follows `### Profile editing` in
   `process/runners/linkedin.md`. Naukri follows the Known quirks in `process/runners/naukri.md`.
5. Naukri is a `/profile` surface as well as the `naukri` hunt lane. Its runner holds the form mechanics in Known
   quirks. If the subagent cannot drive a Naukri field, it holds that edit and reports it. It never
   invents a method.
6. A resume can be attached or uploaded wherever that is possible. The agent uploads it itself, and
   never asks the candidate to. `stated` 2026-11-02 Every variant is in `resume/`, so no run waits for
   a resume. Keep no copy of a variant PDF at the `resume/` level, because the Default column is the
   one pointer to the default resume and a second copy goes stale. `stated` 2026-10-21 Set the
   `On LinkedIn` cell to the date the applier reports.
7. Record what was synced, and when, under `## Sync surfaces` in `profile.md`. A Naukri write also
   sets `Naukri last changed:` there to that day's date.

Simplify and Work at a Startup are also downstream of the resume. They stay with R11, and this
skill only lists their drift in its closing message.

## Adding, retiring or re-defaulting a variant

Each of these edits the variant table in `profile.md` and follows the rules above it.

1. Add: create `resume/<variant>/` with `<variant>.md` and `<variant>.tex`, and add a `planned` row.
   Copy the `.tex` preamble, header and Education section from the default variant. Add an Overleaf
   file for it as an outward write.
2. Go live: a `planned` row turns `live` once its PDF is in its folder and the candidate has
   reviewed it. Flip the Status cell and nothing else.
3. Retire: set Status to `retired after <YYYY-MM-DD>`. Files stay where they are until that date has
   passed. Never move, edit or delete an old variant early, because live applications used it.
4. Re-default: exactly one row has `yes`. Move it in one edit, then run "The default variant".
   The default is found only from the Default column, and its PDF lives in its variant folder. Never remove the PDF in a variant folder that a table row still names.

## Facts

1. Never add a fact that is not in a locked variant `.md`, `work-portfolio.md` or the candidate's own
   words in chat.
2. Tag every fact `stated`, `artefact` or `ours`, with the date. Keep existing tags when you edit.
3. Flag every `ours` fact to the candidate, and never rely on it silently.
4. Never claim work that is not the candidate's. The caveats in `work-portfolio.md` say what is not.
5. Never carry over a claim the variants brief lists as corrected.
6. A fact change in one variant is checked against the other variant `.md` files, `profile.md`,
   `work-portfolio.md`, `faq.md` and `interview-prep/*.json`. List each place it disagrees, and offer
   to make the same change there.
7. When the story changes, R11 says to check `interview-prep/` for staleness and run R13.

## The FAQs

`faq.md` is mostly kept by `/retro`. This skill may review it, point at parts of it, give context
and change entries.

1. Take entries one at a time, in the order the candidate wants.
2. Show the current row, any gap or conflict with the other profile files, and a proposed answer.
3. Write the answer the candidate gives. Keep `faq.md`'s own format: the table row, the tag and the
   date.
4. A row that names an `inputs.toml` key keeps the key. Never write the value in its place.

## Writing

1. Follow R5 in `process/instructions.md` for anything an outside reader sees.
2. Write for senior hiring managers. Keep terms of art, and gain readability by splitting sentences.
3. Use British English.
4. Follow the names and figures rules in `resume/variants-brief.md`.

## Close

Before ending, say what changed, what shipped and what is held. Name each file touched and each
outward write made or held. Then close the run with `node process/engine.ts --session R outreach close`.
No tests run here, under the repo rule.
