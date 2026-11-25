# Interview review design

The candidate pulls one recorded interview from Wispr Flow on request and gets a review of it. The
review appears in chat and on a new Interviews tab. Transcripts and reviews stay out of git.

## The source is the Wispr Flow MCP connector

Wispr Flow's Notetaker records the call. Its read-only MCP server at
`https://api.wisprflow.ai/connect/mcp` serves meetings, transcripts, summaries and notes. It is already
listed as a claude.ai connector and needs the candidate's sign-in once, through `/mcp` in an interactive
`claude` terminal.

The local `flow.sqlite` database is not used. Its layout is undocumented and could change with any
Wispr update.

The first build step confirms the connector's tools and transcript format against one real meeting. It
also confirms whether speaker labels are usable. The rest of this design assumes the transcript names
its speakers. If it doesn't, the skill asks the candidate which speaker they are.

## A new skill does the pull and the review

`/interview` lives in `.claude/skills/interview/SKILL.md` and runs with the candidate present in chat.
It resolves the profile first, as every skill does.

1. It lists recent Wispr meetings with their dates and titles.
2. The candidate names the meeting. The skill pulls only that one.
3. It asks for anything it can't work out: the company, the round and the speaker who is the candidate.
4. It looks for a matching application in `my-applications/index.json`.
5. It writes the transcript, the review and the index row.
6. It reports the review's main points in chat as a short numbered list.

The skill never pulls on its own and never pulls every meeting.

## Each interview gets one gitignored folder

`my-interviews/` is added to `.gitignore`. It holds one folder per interview, named
`YYYY-MM-DD-<company>-<round>`, and one `index.json`.

- `transcript.md` is the transcript with its speaker labels. A local copy means a review can be rerun
  after the meeting is deleted from Wispr.
- `review.md` is the review.
- Each `index.json` row holds `date`, `company`, `role`, `round`, `folder`, `wispr_meeting_id` and
  `application_id`. The last one is null when no application matches.

Pulling a meeting that is already in the index keeps its row and folder. It replaces `transcript.md`
and `review.md`, so a rerun leaves no duplicate.

## The review quotes the candidate and proposes better answers

`review.md` has four sections.

1. Questions asked lists each question the interviewer put, in order.
2. Weak answers quotes the candidate's answer and says what went wrong. It covers rambling, missing the
   question and underselling the work. It then gives a better version, built only from facts in
   `profile.md` and `work-portfolio.md`.
3. Follow-ups owed lists what the candidate promised to send or do.
4. Patterns names any weakness already seen in earlier reviews in `my-interviews/`.

A better answer never claims work that isn't the candidate's, so the caveats in `work-portfolio.md` are
read first. A review never uses the figures under `## Private pay`. A claim about the candidate's
background that rests on inference carries the `ours` tag.

A transcript can hold pay figures if the candidate said them on the call. Those stay in the local
transcript, and the review doesn't repeat them.

## The Interviews tab only reads files

The dashboard gets a sixth tab called Interviews. It is separate from Prep because Prep never shows
evidence and a review has to quote the candidate.

- `src/data/interviews.ts` loads `my-interviews/index.json` and each folder's two files with
  `import.meta.glob`, as the other data modules do.
- `src/components/Interviews.tsx` lists interviews, newest first. Opening one shows `review.md`, with
  `transcript.md` one click away. It uses the existing markdown renderer.
- `src/components/AppHeader.tsx` and `src/App.tsx` add the tab.
- With no interviews yet, the tab says that `/interview` creates them.

The tab has no buttons and writes nothing. Vite already watches the project root, so a new review
reloads the page.

## The skill stays clear of the hunt

`/interview` writes only to `my-interviews/`. It takes no lock and doesn't touch the ledger or the
engine, so it can run during a live hunt. The server's refusal rules don't apply, because the server
isn't involved.

## Failures stop with a plain message

- If the connector needs sign-in, the skill says so and stops.
- If the transcript isn't ready, the skill says so, writes nothing and stops.
- If speaker labels are missing or wrong, the skill asks the candidate which speaker they are. If they
  still can't be separated, it writes the transcript, writes no review and says why.

## The repo's documents change with it

`CLAUDE.md` changes to six tabs and six skills, with a `my-interviews/` entry under Where to look. The
engine names nobody, so the skill and the tab hold no candidate facts.

## Checks are a typecheck and the candidate's own look

This repo has no tests and none are added. The build runs `npm run typecheck`, and the candidate then
checks the tab once. The skill's first real pull checks the connector and the speaker labels.

## Left out of this version

- An automatic pull after an interview.
- Scoring or trend charts.
- Feeding reviews into the Prep questions.
- A link from the Hunt tab to a review.
- A rerun or pull button on the dashboard.

## Open for the candidate

Notetaker records system audio with no visible bot, so the interviewer can't see the recording. Whether
to tell the interviewer is the candidate's decision. The legal position hasn't been checked.
