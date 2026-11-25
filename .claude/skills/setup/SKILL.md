---
name: setup
description: Sets up a new candidate with them in chat, one area at a time. /setup copies the example profile, creates the ledger, pins Chrome, connects Gmail, fills inputs.toml key by key, builds the profile and portfolio in conversation, hands the resumes to /profile, fills the FAQ, offers interview preparation, sets the reply rules and ends by running preflight. Use when the candidate is new here, or wants to redo one area.
argument-hint: "[area to start from, in the candidate's words]"
allowed-tools: Read, Write, Edit, Grep, Glob, Agent, Bash(node process/engine.ts:*), Bash(node process/tools/ea-apply.ts:*), Bash(node process/tools/naukri.ts:*), Bash(node process/tools/hirist.ts:*), Bash(npm install:*), Bash(cp:*), Bash(ls:*), Bash(git status:*), mcp__claude-in-chrome__list_connected_browsers, mcp__claude-in-chrome__select_browser
---

# /setup

This skill is human in the loop. The candidate drives it, and nothing ships without them. The usual
model is Opus 5.5. `stated` 2026-11-02

## Start of a run

1. Read `CLAUDE.md`.
2. Look at what exists before asking anything. Run `ls my-profile process/local.json` and
   `node process/engine.ts profile`. An area that is already done is skipped unless the candidate asks
   to redo it.
3. If the opening phrase names an area, start there. If it doesn't, list the ten areas below in one
   numbered message, mark the finished ones, and begin at the first unfinished one.

## How the conversation runs

1. Ask in plain numbered questions in chat. Never use AskUserQuestion. Take one area at a time and one
   question at a time.
2. The candidate dictates, so read past typos. Expand a terse answer into full wording before it goes
   into a file.
3. Act on each answer at once. A local edit needs no "approve?" question.
4. Write every fact the candidate gives into the profile files unasked. Tag it `stated` with the date.
   Tag an inference `ours` and flag it to them.
5. Never enter a credential and never sign in. If a site or a connector needs a login, say so and wait.
6. Make no commit and no send. Run no test, because this repo has none.
7. Never repeat a figure from `## Private pay` or the `[pay]` table in chat, in a log line or in a
   summary. Write it where it belongs and move on.
8. Every subagent runs on Sonnet or Opus with `model` named, never Fable. Tell it the same rule.

## The areas, in order

### 1. Copy the example and make the ledger

1. If `my-profile/` exists, do not overwrite it. Ask whether to carry on with the profile that is there.
2. Otherwise install the engine's packages, copy the example, check that the profile resolves, and
   create the ledger:

   ```bash
   npm install
   cp -R my-profile.example my-profile
   node process/engine.ts profile
   node process/engine.ts --ledger my-sessions/ledger ledger init
   ```

3. Explain that `ledger init` creates only the ledger and never overwrites. Say that `my-sessions/`
   and `my-applications/` are created at run time. Each `/hunt`, `/outreach`, `/retro` and `/profile`
   run opens its own folder in `my-sessions/`. Each application sent gets a folder in
   `my-applications/`. The dashboard makes `my-notebook/`, and the Learn tab makes `my-learn/` when it
   first saves a graded answer. All five are gitignored, and the candidate makes none by hand.

### 2. Pin Chrome

1. Run `cp process/local.example.json process/local.json`. The file holds `chrome_device_id`, which
   is blank, and `chrome_profile_account`.
2. Ask which Google account the hunt's Chrome profile is signed in to, and write it into
   `chrome_profile_account`.
3. Leave `chrome_device_id` blank for now. Blank is the only state in which `.claude/hooks/chrome-pin.ts`
   lets `list_connected_browsers` run, and this skill is the only place that calls it.
4. Call `list_connected_browsers` and show the result as a numbered list. If it is empty, ask the
   candidate to open Chrome with the Claude in Chrome extension signed in, then call it once more.
5. The candidate picks one. Write its `deviceId` into `chrome_device_id`. From here the hook denies
   `list_connected_browsers` for good.
6. Call `select_browser` once with that id, to prove the pin. R6 in `process/instructions.md` has the
   browser rules every later run follows.

### 2b. Sign in to LinkedIn for the Easy Apply script

1. Run `node process/tools/ea-apply.ts login`. A Chrome window opens on LinkedIn's sign-in page.
2. Ask the candidate to sign in by hand in that window. Never type a credential. The command waits up
   to five minutes and prints `Signed in. The session is saved.`
3. If it prints `Timed out.`, run it again. The candidate repeats this step when a hunt reports that
   the script's profile is signed out.

### 2c. Sign in to Naukri for the Naukri script

1. Run `node process/tools/naukri.ts login`. A Chrome window opens on Naukri's sign-in page.
2. Ask the candidate to sign in by hand in that window and then close it. Never type a credential. The command waits up
   to ten minutes and prints `Window closed. Run sweep to check the session.`
3. If it prints `Timed out.`, run it again. The candidate repeats this step when a hunt reports that
   the Naukri script is signed out.

### 2d. Sign in to Hirist for the Hirist script

1. Run `node process/tools/hirist.ts login`. A Chrome window opens on Hirist's sign-in page.
2. Ask the candidate to sign in by hand in that window and then close it. Never type a credential. The command waits up
   to ten minutes and prints `Window closed. Run apply without --press to check the session.`
3. If it prints `Timed out.`, run it again. The candidate repeats this step when a hunt reports that
   the Hirist script is signed out. Search works signed out, so only Apply needs this session.

### 3. Gmail and Wispr Flow

`/retro` reads Gmail through the engine's `mail` command, which calls Google's Gmail API with a
sign-in the candidate gives once. It sends a plain reply the same way, and a reply with a resume
through the pinned Chrome. `process/runners/gmail.md` has the send mechanics. `stated` 2026-11-22

1. Run `node process/engine.ts mail status`. If it prints the candidate's address, go on to step 4.
2. Otherwise walk the candidate through Google's side, which only they can do. In the Google Cloud
   console they open the Google Auth Platform and, for a personal Gmail address, choose the Personal
   user type. It needs no verification, and its sign-in does not expire after 7 days. Google makes a
   project for it. In that project they turn on the Gmail API, because `mail login` ends in a 403
   without it. Then they create an OAuth client of type Desktop app and download its file.
   `artefact` 2026-11-22 If they decline, say
   that Phase 2 of `/retro` cannot read mail without it, note it, and go on to area 4.
3. Have them set `mailbox` in `process/local.json` to their Gmail address and run
   `node process/engine.ts mail login <client.json>` in a terminal themselves. Never run it for them
   and never open the client file. Run `mail status` again to confirm.
4. Record the Gmail address under `## Accounts` in `profile.md`. Ask them to confirm the pinned Chrome
   is signed in to the same account, because a reply with a resume is sent through it.
5. Ask whether the candidate records interviews in Wispr Flow. If so, have them connect it as a connector
   in Claude's connector settings, and wait. Find the tool names with a ToolSearch for
   `search_meetings get_meeting`. Confirm with the candidate that the account is theirs. Edit the
   `allowed-tools` line of `.claude/skills/interview/SKILL.md` so both entries use the new prefix. If the
   edit is denied, quote the denial text and give the candidate the two exact entries to paste
   themselves. If they decline, say that `/interview` cannot pull a recording without it.

### 4. inputs.toml, key by key

`my-profile/inputs.toml` holds every number, and markdown names the key and never the value. Each
key has a comment above it. Go table by table and find them with `grep -n '^\[' my-profile/inputs.toml`.

1. For each key, read its comment aloud in plain words, show the current value, and ask for the
   candidate's value. Keys the example already fills with a default can be accepted in one batch per
   table, after you read the batch out.
2. Replace `# set me` with nothing once a key is set. Leave an `[outreach]` quote key commented out
   until the candidate gives a figure they are happy to tell a recruiter. An absent quote becomes an
   open question in a draft, never a number.
3. `search.live_sources` is the list of lanes the hunt works. Read the live lanes from R9 in
   `process/instructions.md` and let the candidate choose. `engine.ts preflight` prints the result on
   its `Lanes:` line.
4. Keep the pay figures private. `engine.ts config` never prints the `[pay]` values, and the runners compare a band through `engine.ts pay below`, which prints only `below` or `not below`.

Three assumptions sit in the engine. Name each to the candidate and do not generalise any of them.

1. Rupees. `[pay]` keeps `pay.current_inr_lakh` and `pay.expected_india_inr_lakh` in lakh rupees a
   year, and the runners compare an INR band with them. The abroad floor and the founder ask are in US
   dollars a year. A candidate who is not paid in rupees should hear that plainly, and choose how to
   fill those two keys. Do not rename a key or convert a figure.
2. IST. Every timestamp the engine writes, the Easy Apply window and the hour in a `firing` use a
   fixed UTC+05:30 (`constants.TZ`). Say so, and leave the constant alone.
3. PAN. No run ever enters a government tax or identity number, such as India's PAN, or a full street
   address that is not in the FAQ. Area 7 records the candidate's own list.

### 5. The profile and the portfolio

1. List the sections of `my-profile/profile.md` with `grep -n '^## '`. Work down them in order.
   Each has a guidance line and an example. Ask for the content, write it in the candidate's words,
   and delete the guidance line once the section is filled.
2. `## Identity` comes first, because `engine.ts validate` reads the name, handle and emails from it to
   keep them out of the engine. Do `## Private pay` last, and write only what the candidate says.
3. `## Accounts` lists one line for each source. It holds no credential and no password.
4. Then `my-profile/work-portfolio.md`. Take the projects one at a time under `## Evidence`. Ask for
   the caveats under `## Caveats` outright, meaning any work that was a team's or someone else's,
   because standing rule 2 depends on them. Fill `## Numbers that may be quoted` last, with only the
   figures the candidate confirms.
5. Tag each line with its authority and the date, as `CLAUDE.md` says under Authority tags.

### 6. Overleaf and the resumes

This area sets the ground. `/profile` writes the variants, and R11 in `process/instructions.md` has
the Overleaf mechanics.

1. The candidate creates the Overleaf project and sends its id. Write it under `## Resume` in
   `profile.md`. Never sign in to Overleaf for them.
2. Ask how many fixed variants they want, what each targets, and which one is the default. Fill the
   `## Resume variants` table. Exactly one row says `yes` under Default, or `engine.ts validate` fails.
3. Create `resume/<variant>/` for each row and set it to `planned`. `resume/README.md` explains the
   folder, and the `.md` of a variant is its source of truth.
4. Tell the candidate to run `/profile` next to write each variant, compile it on Overleaf at two
   pages and put the PDF in place. A row turns `live` only after that.

### 7. The FAQ and how answers are written

1. Open `my-profile/faq.md`. Take the starter rows one at a time. Ask, write the answer in full
   sentences and tag it `stated` with the date. A row that needs a number names the `inputs.toml` key
   and never writes the value.
2. Read out the years rule and the gap rules. An unknown question holds the row, the applier files an
   `answer_gap` with the question verbatim, and `/retro` asks the candidate and writes the answer. The
   bank grows from there, so nothing needs to be complete today.
3. Ask for the answers that are never entered whatever the form says. Record the candidate's own list.
   It starts with a government tax or identity number and a full street address.
4. Ask how they want self-identification questions handled, such as gender, race, disability and
   veteran status. Each item is its own question, and "decline to self-identify" is a valid answer.
5. Anything an outside reader sees follows R5 in `process/instructions.md`.

### 8. Interview preparation

1. Ask whether the candidate wants it now. It is optional, and the dashboard's Prep tab reads it.
2. If yes, follow R13. It needs `profile.md`, `work-portfolio.md`, `faq.md` and at least one variant
   `.md`. One Opus agent plans, then Sonnet writers write. End with `npm run typecheck` and ask the
   candidate to open the Prep tab once.
3. If no, say that R11 runs R13 later, when the story or a resume changes and the folder exists.

### 9. Reply rules and how replies are made

1. Explain the flow in four lines. `/retro` reads the Gmail and LinkedIn inboxes. The `inbox-reader`
   agent writes one draft for each job thread, following `my-profile/reply-rules.md`. The candidate
   sees the final text and says send. Claude then sends it, by the engine's `mail send` for a plain email
   and the messenger for the rest. `/outreach` never touches the inbox, and its first messages follow
   the rules not marked `inbox only` plus R14.
2. Open `my-profile/reply-rules.md`. Go through the starter rules one at a time. For each, ask whether
   to keep it, change it or drop it, and write the result in the candidate's words.
3. Ask what the candidate wants on four points: how to answer a pay question, how to treat a
   recruiter who has the facts wrong, how to decline a role, and when to attach a resume.
4. Add new rules at the end. Never renumber. Replace the text of a dropped rule with `retired`. `ours`
   2026-11-02
5. Tag each rule `stated` when the candidate said it and `artefact` when it was read from a message
   they wrote. Ask whether they have a few replies of their own to read.

### 10. Preflight

1. Run `node process/engine.ts --ledger my-sessions/ledger preflight 2>&1`.
2. Report its output as it printed, line by line. A `STOP:` line means a run cannot start. Name the
   area that fixes it and offer to redo that area. A `STOP-APPLY:` line means the hunt can sweep but not
   submit.
3. Say what is left: the first variant through `/profile`, any area the candidate skipped, and the
   first `/hunt`. Start none of them.

## Close

Say which areas finished, which are open, and which files were touched. Name any denied call in its
exact text. This skill never commits.
