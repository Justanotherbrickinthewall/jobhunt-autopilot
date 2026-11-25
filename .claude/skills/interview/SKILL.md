---
name: interview
description: Pulls one recorded interview from the Wispr Flow connector with the candidate in chat, saves its transcript and writes a review of how they answered. The review quotes their answers and proposes better ones from their own facts, and the Interviews tab shows it. Use when the candidate says they want to pull, review or go over an interview.
argument-hint: "[which interview, in the candidate's words]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(node process/engine.ts profile), Bash(grep:*), Bash(sed -n:*), Bash(mkdir:*), Bash(npm run typecheck), Agent, mcp__395111e9-c942-4cf6-b3eb-5561968ca8e1__search_meetings, mcp__395111e9-c942-4cf6-b3eb-5561968ca8e1__get_meeting
---

# /interview

The candidate drives this skill in chat. It writes to `my-interviews/` and folds what it learned into
`interview-prep/` in the profile. It takes no lock and touches neither the ledger nor the engine, so it
can run during a live hunt. `stated` 2026-11-05

Every Agent call names its model, the cheapest that does the job well. `stated` 2026-11-25

## Start of a run

1. Resolve the profile with `node process/engine.ts profile`. If it exits 2, stop and tell the
   candidate why.
2. List recent meetings through the Wispr Flow connector, with their dates and titles. If the
   connector needs a sign-in, tell the candidate to run `/mcp` in an interactive `claude` terminal, and
   stop.
3. The candidate names the meeting. Pull that one only, and never pull every meeting.
4. If the transcript isn't ready, say so, write nothing and stop.

## What to ask

Ask in plain numbered questions, and only for what the meeting doesn't show.

1. Which company and round was this?
2. Which speaker is the candidate? Ask this when the labels don't make it plain.

Wispr's labels can slip on a single recording, and it misspells names. Keep its labels as they came in
`transcript.md`, and separate the speakers by what they said. Say in the review that this was needed.
If the speakers still can't be separated, write `transcript.md`, write no review and say why.

## Files

Find the application in `my-applications/index.json` by company and role. Its `id` becomes
`application_id`. Use null when none matches.

The folder is `my-interviews/YYYY-MM-DD-<company>-<round>`, in lower case with hyphens. It holds
`transcript.md`, which keeps the speaker labels, `analysis.json` and `review.md`.

`my-interviews/index.json` is an array with one object per interview:

```json
{
  "date": "YYYY-MM-DD",
  "company": "",
  "role": "",
  "round": "",
  "folder": "",
  "wispr_meeting_id": "",
  "application_id": null
}
```

Read the file before writing it. If it exists and doesn't parse, stop and tell the candidate, so that
no earlier row is lost. If `wispr_meeting_id` is already in the index, keep that row and folder, and
replace the three files.

## The review

Before writing, read `work-portfolio.md`, its caveats first, and every earlier `review.md` in
`my-interviews/`. Read `profile.md` with grep for its heading lines and `sed -n` on the ranges you need.
Never read `## Private pay`.

`analysis.json` holds one row for every question the interviewer put, in order. The dashboard computes the
score from these verdicts, so never write a score into any file.

```json
{ "questions": [ {
  "id": "q1",
  "question": "",
  "scored": true,
  "answer": "the candidate's own words",
  "verdict": "strong | adequate | weak | wrong",
  "why": "",
  "better": "",
  "gap": "knowledge | delivery | fact | null",
  "missing": "",
  "prepIds": [],
  "learn": []
} ] }
```

1. A verdict judges the answer against the transcript. Strong is optimum. Adequate did the job but could be
   sharper. Weak missed the question, undersold the work or rambled. Wrong is factually wrong or a false claim.
2. Logistics such as notice period, pay, relocation and joining date get `scored: false`.
3. `gap` says what fixes the answer. `knowledge` needs a chapter id in `learn`, `delivery` needs a question id
   in `prepIds`, and `fact` needs the fact to confirm in `missing`. A strong row has a null gap.
4. Add `prepIds` to every row a Prep question covers, strong rows included, because the Prep tab builds its
   "Asked in" links from them. Prep ids are in `my-profile/interview-prep/`, and chapter ids are in
   `src/learn/content/courses.ts`. Check that every id exists.
5. `why`, `better` and `missing` are plain text with no markdown.

`analysis.json` also holds `next`, which says what comes after this call. The Next steps tab shows it.

```json
"next": {
  "said": "what the interviewer said happens next, in two or three sentences",
  "rounds": [ { "round": "", "format": "", "with": "", "when": "", "prep": "" } ],
  "owed": [ "what the candidate must send or do, and by when" ],
  "ask": [ "what the call left unsettled, to ask the recruiter" ]
}
```

1. `rounds` lists each round still ahead, in order. `format` is how it runs, such as a live coding pair or a
   system design whiteboard. `with` is who takes it, and `when` is the date or window said on the call.
2. `prep` says how to get ready for that round, from what the interviewer said it covers and from this
   call's weak rows. Name the Prep sections and Learn chapters to work through.
3. Leave a field empty when the call didn't say it, and put the gap in `ask` instead. Never guess a date.
4. Convert a relative date such as "next week" to a real date from the interview date.
5. Every value is plain text with no markdown, and no value names a pay figure.

`review.md` has a short opening that gives the verdict on the call, then these three headings, in this order:

1. `## What to fix across the call` holds what belongs to no single question. Leave it out if nothing does.
2. `## Follow-ups owed` lists what the candidate promised to send or do.
3. `## Patterns` names each weakness already seen in an earlier review, and which interviews showed it.
   With no earlier review, it says so.

Rules for both files:

- Build a better answer only from facts in `profile.md` and `work-portfolio.md`. Never claim work that
  isn't the candidate's.
- If a better answer needs a fact the files don't hold, say what's missing. Don't invent it.
- Mark any claim about the candidate's background that rests on inference with the `ours` tag.
- Never repeat a pay figure, even one said on the call. It stays in `transcript.md`.

## Fold into the prep

A review isn't finished until the prep reflects it, so the candidate rehearses the corrected answer. Skip
this step only when `interview-prep/` doesn't exist, and say so.

Dispatch one Sonnet writer with the review and the rules of R13 in `process/instructions.md`, which
bind it. It patches only the items concerned and never regenerates a file.

1. A question the prep already holds gets the better answer in `answer`, the failure in `trap` and any
   interviewer push in `followUps`. Merge with what's there.
2. A question the prep lacks becomes a new item with `provenance: "new"` and the round in `sourceRef`.
3. A fact the files lack goes in `noEvidence` or `checks`, and a career fact the candidate stated on the
   call goes into `work-portfolio.md` with the `stated` tag.
4. A review shows what gets asked and where answers fail. It is never a source of career facts, and prep
   text doesn't name the interview. Numbers still come only from the quotable table.
5. Give a new item its Learn chapters in `links.json`, and add its id to the matching rows in `analysis.json`.
6. Set `updated` in `meta.json` to today, run `npm run typecheck`, and grep for the private figure as R13
   step 4 says.

## End of a run

Report in chat as a short numbered list, one sentence per item, of what the candidate should change.
Name the follow-ups owed. Say the full review is on the Interviews tab, and that the corrected answers
are on the Prep tab.
