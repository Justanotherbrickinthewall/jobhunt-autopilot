---
name: setup
description: Sets up a new candidate's machine with them in chat, one area at a time. /setup checks Node, Chrome and the packages, tests that Claude runs from the terminal, copies the example profile, creates the ledger and the run-time folders, pins Chrome, signs in to each job site and checks the session, signs in to Overleaf, connects Gmail, records how interviews come in and ends by running preflight. It builds no profile, because /profile does that next. Use when the candidate is new here, or wants to redo one area.
argument-hint: "[area to start from, in the candidate's words]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(node --version:*), Bash(node process/engine.ts:*), Bash(node process/tools/ea-apply.ts:*), Bash(node process/tools/naukri.ts:*), Bash(node process/tools/hirist.ts:*), Bash(node process/tools/li-msg.ts:*), Bash(node process/tools/li-harvest.ts:*), Bash(claude -p:*), Bash(npm install:*), Bash(cp:*), Bash(mkdir:*), Bash(rm -r my-sessions/setup-check:*), Bash(ls:*), Bash(git status:*), mcp__claude-in-chrome__list_connected_browsers, mcp__claude-in-chrome__select_browser, mcp__claude-in-chrome__tabs_context_mcp, mcp__claude-in-chrome__tabs_create_mcp, mcp__claude-in-chrome__navigate, mcp__claude-in-chrome__get_page_text
---

# /setup

This skill is human in the loop. The candidate drives it, and nothing ships without them. It is
technical only. It builds no profile, and `/profile` does that next. The usual model is Opus 5.5.
`stated` 2026-11-26

## Start of a run

1. Read `CLAUDE.md`.
2. Look at what exists before asking anything. Run `ls my-profile process/local.json` and
   `node process/engine.ts profile`. An area that is already done is skipped unless the candidate asks
   to redo it.
3. If the opening phrase names an area, start there. If it doesn't, list the nine areas below in one
   numbered message, mark the finished ones, and begin at the first unfinished one.

## How the conversation runs

1. Ask in plain numbered questions in chat. Never use AskUserQuestion. Take one area at a time and one
   question at a time.
2. The candidate dictates, so read past typos. Expand a terse answer into full wording before it goes
   into a file.
3. Act on each answer at once. A local edit needs no "approve?" question.
4. Never enter a credential and never sign in. If a site or a connector needs a login, say so and wait.
   The candidate types every password and approves every sign-in themselves.
5. Make no commit and no send. Run no test, because this repo has none.
6. Every check in this skill is read-only. It applies, sends and changes nothing on a site.
7. Never repeat a figure from `## Private pay` or the `[pay]` table in chat, in a log line or in a
   summary.
8. Every subagent runs on Sonnet or Opus with `model` named, never Fable. Tell it the same rule.

## The areas, in order

The areas are: 1 Prerequisites, 2 Claude from the terminal, 3 Folders, 4 Pin Chrome, 5 Site sign-ins,
6 Overleaf, 7 Gmail, 8 Interview source, 9 Preflight.

### 1. Prerequisites

1. Run `node --version`. It must print v25 or later. If it does not, tell the candidate to install the
   current Node from nodejs.org, open a new terminal and start `/setup` again.
2. Run `ls "/Applications/Google Chrome.app"`. If it is missing, tell the candidate to install Google
   Chrome from google.com/chrome and start this area again.
3. Run `ls node_modules/playwright-core`. If it is missing, run `npm install`, then check again.
4. Say that the scripts drive the Chrome that is installed. They use `channel: 'chrome'`, so no
   `npx playwright install` is needed.
5. On any failure, give the one exact fix in one plain step, wait, and run the check again.

### 2. Claude from the terminal

Several parts of this repo run `claude -p` themselves: the dashboard's Rerun, Resume and Start now
buttons, the Prep judge, and the `li-score.ts` script. They need a Claude Code sign-in that works
outside this chat.

1. Run `claude -p "reply with ok"` with the Bash tool's own timeout of 60000 ms. macOS has no `timeout` command.
2. If it prints a reply, say so in one line and go on.
3. If it fails or asks to sign in, hand-hold the candidate. They open their own terminal and run `claude`
   once. They complete the browser sign-in there. Never type a credential for them.
4. Run the check again once they say it is done. Repeat until it prints a reply, or until they choose
   to skip. If they skip, say which buttons and scripts will fail.

### 3. Folders

1. If `my-profile/` exists, do not overwrite it. Ask whether to carry on with the profile that is there.
2. Otherwise copy the example and check that the profile resolves:

   ```bash
   cp -R my-profile.example my-profile
   node process/engine.ts profile
   ```

3. Create the ledger. It never overwrites:

   ```bash
   node process/engine.ts --ledger my-sessions/ledger ledger init
   ```

4. Create the empty run-time folders, so the candidate can see where things will go:

   ```bash
   mkdir -p my-applications my-sessions my-interviews my-notebook my-learn
   ```

5. Say what each one holds, in one line each. `my-applications/` gets a folder for each application
   sent. `my-sessions/` gets a folder for each `/hunt`, `/outreach`, `/retro` and `/profile` run, and the
   ledger. `my-interviews/` gets each reviewed interview. `my-notebook/` holds the dashboard's bookmarks and
   progress. `my-learn/` holds graded Learn answers. All five are gitignored.

### 4. Pin Chrome

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

### 5. Site sign-ins

Take one site at a time. Ask first whether the candidate uses the site. If they say skip, leave that lane
out of `search.live_sources` in `inputs.toml` and go to the next site. Each sign-in is followed by a
read-only check, reported in one plain line.

#### 5a. LinkedIn

1. Run `node process/tools/ea-apply.ts login`. A Chrome window opens on LinkedIn's sign-in page.
2. Ask the candidate to sign in by hand in that window. Never type a credential. The command waits up
   to five minutes and prints `Signed in. The session is saved.`
3. If it prints `Timed out.`, run it again. The candidate repeats this step when a hunt reports that
   the script's profile is signed out.
4. Check the session. Run `mkdir -p my-sessions/setup-check` and then
   `node process/tools/li-msg.ts inbox --run my-sessions/setup-check`. It only reads the inbox into files.
   Exit 5 means signed out, so go back to step 1. A `LM-INBOX fallback` line is not a session failure. Report
   the reason it names. Say `LinkedIn: session works` or `LinkedIn: signed out`.

#### 5b. Naukri

1. Run `node process/tools/naukri.ts login`. A Chrome window opens on Naukri's sign-in page.
2. Ask the candidate to sign in by hand in that window and then close it. Never type a credential. The command waits up
   to ten minutes and prints `Window closed. Run sweep to check the session.`
3. If it prints `Timed out.`, run it again. The candidate repeats this step when a hunt reports that
   the Naukri script is signed out.
4. Check the session with `node process/tools/naukri.ts sweep --out my-sessions/setup-check/naukri`. The sweep
   only reads the invite inbox. Report its status line in one plain line, such as `Naukri: session works`.

#### 5c. Hirist

1. Run `node process/tools/hirist.ts login`. A Chrome window opens on Hirist's sign-in page.
2. Ask the candidate to sign in by hand in that window and then close it. Never type a credential. The command waits up
   to ten minutes and prints `Window closed. Run apply without --press to check the session.`
3. If it prints `Timed out.`, run it again. The candidate repeats this step when a hunt reports that
   the Hirist script is signed out. Search works signed out, so only Apply needs this session.
4. Hirist's own session check is `apply <row-id> --out <dir>` without `--press`, and it needs a role row that
   does not exist yet. So run `node process/tools/hirist.ts sweep --out my-sessions/setup-check/hirist`, which
   proves the script and Chrome work, and say plainly that the Apply session is proved on the first
   `/hunt --dry-run`.

#### 5d. LinkedIn job harvest and remote boards

1. These two need no sign-in. LinkedIn's job search runs on public pages, and the remote boards read public feeds.
2. Run `node process/tools/li-harvest.ts sweep --lane linkedin-ea --out my-sessions/setup-check/harvest`. It is
   read-only. Exit 4 means LinkedIn put up a wall. Report it and carry on. 0 cards is expected here, because
   `/profile` fills the search terms later.
3. Run `node process/engine.ts boards sweep --dry-run`. It prints the rows and writes nothing. It prints "boards.terms is empty" before `/profile` fills the terms, and that is expected.
4. Report each in one plain line.

### 6. Overleaf

1. The candidate opens the pinned Chrome and signs in to Overleaf themselves. Never type the password.
   Overleaf's sign-in may use Google or an email link, and either is theirs to do.
2. When they say they are in, open `https://www.overleaf.com/project` in the pinned Chrome with `navigate`
   and read the page with `get_page_text`. A project list means the session works. A sign-in page means it
   does not, so ask them to finish and look again.
3. Report it in one plain line. Record nothing else here. The project id is `/profile`'s job.

### 7. Gmail

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
   that Phase 2 of `/retro` cannot read mail without it, note it, and go on to area 8.
3. Have them set `mailbox` in `process/local.json` to their Gmail address and run
   `node process/engine.ts mail login <client.json>` in a terminal themselves. Never run it for them
   and never open the client file. Run `mail status` again to confirm.
4. Ask them to confirm the pinned Chrome is signed in to the same account, because a reply with a
   resume is sent through it. `/profile` records the address under `## Accounts` in `profile.md`.

### 8. Interview source

`/interview` needs a recorded interview. Ask how those will come in. There are three answers.

1. A connector. Wispr Flow or another meeting-notes tool, added in Claude's connector settings. The
   candidate adds it and signs in themselves. Ask its name.
2. Paste. The candidate pastes a transcript into chat each time.
3. A file. The candidate gives the path of a transcript file each time.

Record the answer in `my-profile/inputs.toml` under an `[interview]` table. Add the table if it is
missing. `stated` 2026-11-26

```toml
[interview]
source = "connector"   # "connector", "paste" or "file"
connector = "<its name>"   # only for a connector
```

Never edit the interview skill's `allowed-tools`. If the candidate declines every answer, set `source = "paste"`
and say that `/interview` then takes a pasted transcript.

### 9. Preflight

1. Run `node process/engine.ts --ledger my-sessions/ledger preflight 2>&1`.
2. Report its output as it printed, line by line. A `STOP:` line means a run cannot start. Name the
   area that fixes it and offer to redo that area. A `STOP-APPLY:` line means the hunt can sweep but not
   submit. A `STOP:` line about the empty profile is expected, because `/profile` fills it next.
3. Remove `my-sessions/setup-check/`, which only held the check output.
4. Tell the candidate in one short message that setup is done and the next step is `/profile`. Say that
   nothing else is started.

## Close

Say which areas finished, which are open, and which files were touched. Name any denied call in its
exact text. This skill never commits.
