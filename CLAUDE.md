# Job hunt

This repo runs one candidate's job search from Claude Code on the Mac. It harvests roles, scores
them, builds the application and sends it once the candidate approves.

## Resolve the profile first

```bash
node process/engine.ts profile
```

The command prints the profile folder, `my-profile`. If it exits 2, stop and report
why. A run without the profile has no candidate facts to work from. `/setup` is the one exception,
because it creates the profile. `stated` 2026-11-02

## Where to look

- `process/instructions.md` is the hunt, as numbered steps and reference sections.
- `process/contracts.md` holds the machine contracts: columns, vocabularies, stage JSON and notes.md.
- `process/runners/` holds one file per site with its access, harvest and apply mechanics.
- `process/tools/ea-apply.ts` applies to one Easy Apply row in its own Chrome profile at `.playwright/linkedin`, through Playwright. `/hunt` runs it first for each `linkedin-ea` row, and the applier agent takes the row only when the script hands it back. `node process/tools/ea-apply.ts login` signs the candidate in once, by hand. `stated` 2026-11-25
- `my-profile/` holds six required items: `profile.md`, `work-portfolio.md`, `faq.md`,
  `inputs.toml`, `reply-rules.md` and `resume/`. It may also hold `interview-prep/`, which the
  dashboard's Prep tab reads.
- `my-profile/inputs.toml` holds every number. Markdown names the key and never the value.
- `my-applications/` holds one folder per application sent, with the JD, the resume that went and notes
  for interview prep, and an `index.json`. The tick fills it. It is gitignored.
- `my-interviews/` holds one folder per reviewed interview, with its transcript, analysis and review, and an
  `index.json`. `/interview` fills it. It is gitignored and created at run time.
- `my-sessions/` holds one folder per hunt, outreach, retro or profile run and the ledger in
  `my-sessions/ledger/`. It is gitignored and created at run time.
- `phone/` holds the build, scan and publish scripts for the phone copy. `my-phone/` holds their output and is gitignored.
- `src/` holds the dashboard. `npm run typecheck` checks it and `npm run dev` runs it.
- `server/` holds the dashboard's local server on port 7003. It reads text aloud, keeps the Notebook
  and runs the drawer's fix buttons for held roles. `npm run dev` starts it beside Vite.
- `my-notebook/` holds the Notebook's bookmarks, crib sheets, reading progress, audio cache and the
  rerun queue. Only the server writes it. It is gitignored and created at run time.
- `src/learn/` holds the Learn tab: courses, chapters, widgets and interview banks, with its own router
  under `/learn`. `server/learn/` holds its grader. `stated` 2026-11-05
- `my-learn/` holds the Learn labs, capstone, setup notes, graded attempts and the original repo as a git
  bundle. It is gitignored, and the app works without it. The server creates it on the first graded answer.
  `PORT-NOTES.md` inside it says what moved where. `stated` 2026-11-05
- `node process/engine.ts --help` lists every engine command.
- The lanes are LinkedIn in two, `linkedin-ea` for Easy Apply roles and `linkedin-ex` for roles with an
  external apply link, `naukri` for the recruiter invites in the Naukri inbox, `hirist` for roles found by search on Hirist, `remote_boards` for remote roles read from the public feeds of Remote OK, Himalayas, Remotive and We Work Remotely, and
  `career_page`. `stated` 2026-11-10
  `career_page` has no harvest, so its rows come from `engine.ts outreach jobs`. A lane is live when it is in `search.live_sources` in
  `my-profile/inputs.toml` and has a runner file. `engine.ts preflight` prints the result on its
  `Lanes:` line.

## The dashboard

`npm run dev` starts a local Vite and React dashboard on `http://localhost:7002`, and its server on
port 7003. A left rail holds eight areas, and the app opens on Today. A Claude card at the foot of the rail shows the open run and its last log line, or the last hunt. A card at the top of the rail shows the run's title and counts, and links to Campaigns. Campaigns shows every past and current hunt and outreach run grouped as eight campaigns: the Full hunt, Naukri invites, Hirist, Remote boards, LinkedIn Easy Apply, LinkedIn external, Role contacts and Hiring posts. `stated` 2026-11-10 Each has a Runs, Results and Settings tab. It reads `GET /api/runs`, which only reads `my-sessions/` and asks `outreach cooldown` for the LinkedIn pause. A hunt that swept two or more lanes is the Full hunt, one lane is that lane's campaign, and an outreach run counts under Role contacts for its `roles` lane and under Hiring posts for its `posts` lane, so a run that worked both shows in both. `stated` 2026-11-10 A hunt that swept no lane worked single held roles and belongs to no campaign. Jobs holds three views. Hunt shows the board and each role's scores, JD and
resume. Retro shows what needs the candidate, then the funnel, source yield and keyword gaps. Outreach shows the
people contacted, read from `contacted.csv`, and can send one approved reply per click through a dashboard send run, and shows each person's saved conversation. Interviews shows the reviews and transcripts in
`my-interviews/`, and only reads them. Interview prep shows the candidate's preparation from
`my-profile/interview-prep/`, plus Learn's question bank. Profile shows the profile, work portfolio and screening
answers. Learn is the course app, at `/learn`, with its own router and no navigation of its own. Its bookmarks save
into the Notebook, and its progress keys start with `fde:` and are mirrored with the `hunt-board:` keys. Its server
routes are `/api/learn/grade` and `/api/learn/attempts`. They write only `my-learn/` and `my-notebook/` and need no
hunt lock. Notebook shows the passages the candidate bookmarked, filed in collections, with a crib sheet for each.
`docs/dashboard-design.md` is the design every screen follows, with the tokens and the rules. `stated` 2026-11-05
Today shows the open Retro questions, the conversations that wait for /retro, the last 7 days, the last interview review, prep readiness and the Learn reviews due. It only reads. `stated` 2026-11-07

The dashboard never takes a lock. Its server writes `my-notebook/`, which holds bookmarks, crib
sheets, reading progress, the audio cache and the rerun queue. It also writes in four narrow
ways. Answer appends one row to the answer bank in `my-profile/faq.md`. Rerun, Resume and Start now
each start a background `claude -p` that follows R10's submit path for one row, and that run writes
`my-sessions/` and `my-applications/` through the engine, as any run does. Resume works a `scored` or `ready` row.
Start now works a `new` or `extracted` row and runs the matcher first, because the row has no score
yet. Drop and I sent it change one ledger row through `engine.ts ingest`. Drop needs the
candidate's reason, and the board shows it as Dropped by you. The fourth is the Outreach screen's send, skip and resolve routes: Send starts a dashboard send run for one drafted reply in its own retro folder, and Skip and the resolve route change one contacted row, all through the engine. The server refuses all of these while a
/hunt, /outreach or /retro session is open, a `-retro` run included, so the dashboard stays safe to run
during a live hunt. It also refuses Rerun, Resume and Start now on a LinkedIn row while the security
cooldown runs. A /hunt cannot start while a rerun is working: `session open`, `session resume` and
`session new` exit 2 until the rerun closes its session. It never reads `my-profile/profile.md`. `my-notebook/` is derived from the profile and the applications, and the
engine never reads it as a source of facts. Vite reloads the page when a run writes new files. The
dashboard is not part of the engine, and a hunt never needs it. `stated` 2026-10-23

The Prep tab opens on a room where the candidate picks a section or takes a quick check, then drills one question at a time. The full list is behind All questions. `POST /api/prep/judge` runs `claude -p` on one spoken answer and writes nothing. Readiness is kept in the browser and mirrored to `my-notebook/progress.json`, and it never holds the answer text.

Two rules shape anything added to the dashboard. The board shows one status for each outcome, and the
cause goes inside it as a reason. Before adding a status, a chip or a lane, check whether it is a
reason under a status that exists. The engine may keep finer statuses underneath. The Prep tab stays
calm and nearly monochrome. Labels are muted grey and sit inside the line they label. Coaching goes in
one Tips section, a follow-up opens as one plain paragraph, and Prep never shows evidence. Ask the
candidate before adding colour. `stated` 2026-11-02

The Interviews, Prep and Learn tabs link to each other, and every such link opens in a new tab. An interview's
`analysis.json` holds its question rows and their links, `my-profile/interview-prep/links.json` maps a Prep
question to Learn chapters, and `src/data/links.ts` builds the reverse links on load. Prep shows these as plain
grey lines, which is the one place Prep may name an interview. `stated` 2026-11-05

## The phone copy

`npm run phone:build` builds the Learn and Prep reading app into `my-phone/dist` and runs the scan. It drops every Prep question, card and term that mentions pay, and the scan fails the build if a pay figure or a pay topic gets through. The copy opens on the last screen used, at the paragraph left, and caches itself offline. `npm run phone:publish` pushes `dist` to a public repository under the `[phone]` `github_login` key in `inputs.toml`. It runs only after a scan pass that matches the current hash. `my-phone/pay-allow.txt` is added to only on the candidate's yes. When the scan fails on pay hits, show the hits in chat and wait. On the candidate's yes, run `cut -f1-3 my-phone/pay-hits.txt >> my-phone/pay-allow.txt`. Never add a hit the candidate has not seen in chat. `stated` 2026-11-07, reworded 2026-11-10

The Display menu's Copy progress puts the phone's progress on the clipboard, and a pasted block is merged into the dashboard with `npm run phone:merge -- <file>`, which needs `npm run dev` running. `stated` 2026-11-08

Each phone build publishes the laptop's reading and prep progress from `my-notebook/progress.json`, limited to the synced keys, and the phone merges it on load. `stated` 2026-11-12

## Six skills

Each skill has its detail in one place. This section says what each one is for, in the order a new
candidate meets them.

`/setup` sets up a new candidate in chat, once, one area at a time. It copies `my-profile.example/` to
`my-profile/`, creates the ledger, pins Chrome, signs the candidate in to LinkedIn once in the Easy Apply script's own Chrome profile, connects Gmail, fills `inputs.toml`, builds the profile
and the portfolio, hands the resumes to `/profile`, fills the FAQ, offers interview preparation, sets
the reply rules and ends with `engine.ts preflight`. A new candidate starts with no profile, no
applications, no sessions, no notebook and no interview prep, and none of those is ever handed over.
Its rules are in `.claude/skills/setup/SKILL.md`. `stated` 2026-11-02

`/profile` works on the profile with the candidate in chat. It starts with Overleaf, the prebuilt
resumes, the projects and the FAQ, and later narrows and updates the resume variants. Each locked
change flows to the `.tex`, a two-page Overleaf PDF and, for the default, the LinkedIn and Naukri
profiles. Each run also offers a small Naukri refresh, because a small change bumps the profile for
recent activity and that brings recruiter calls. The candidate runs it every three or four days. Its
rules are in `.claude/skills/profile/SKILL.md`. `stated` 2026-11-02

`/hunt` runs the whole hunt with no one present and never stops to ask. It submits every clean form and
holds the rest for `/retro`. For a `linkedin-ea` row it runs the Easy Apply script first, and it dispatches the applier agent only when the script hands the row back, or when Top choice is allowed for the row. `stated` 2026-11-25 `/hunt --linkedin-ea`, `/hunt --linkedin-ex`, `/hunt --naukri`, `/hunt --hirist` and `/hunt --remote-boards` run one
lane only, and `/hunt status` prints a read-only report. A recruiter's invite on Naukri gets an answer
whatever its score: Apply, or Not interested when the role is plainly wrong. The `naukri` lane runs
first. `stated` 2026-11-02 Speed is the reason for the Easy Apply window: the
sooner an application lands, the higher it sits in the employer's pile. The hunt starts when the
candidate starts it. It is not scheduled. It follows `process/instructions.md`. While the LinkedIn
security cooldown runs, a hunt works neither LinkedIn lane, and `naukri`, `hirist`, `remote_boards` and `career_page` carry on, as R9 says.
A security check that a hunt meets starts that cooldown, whichever command hits it. `stated` 2026-11-02

`/outreach` runs with no one present and asks nothing. It works in lanes, and `prospect.live_lanes` in `inputs.toml` is the switch. The `roles` lane finds one person at each applied or held role whose match is at or above `prospect.roles_match_min`. It tries the hiring manager, then the job's poster, then a recruiter. The `posts` lane searches LinkedIn posts for open roles and judges each one. Each lane drafts first contacts. The run sends them within the `[prospect]` caps and withdraws stale connection requests, all in one run folder. A bare `/outreach` runs every live lane, `roles` first. `/outreach --roles` and `/outreach --posts` run one lane. It never reads the Gmail or LinkedIn inbox and sends no reply. Anything it cannot finish is held for `/retro`. `/outreach status` prints a read-only report that includes the budget. It follows R14 of `process/instructions.md`. `stated` 2026-11-10

`/retro` is the only skill that works with the candidate present, and the candidate runs it when they
choose. Its order is fixed. Phase 1 folds the findings of past hunts and asks about the held items,
and each answer is acted on at once in background subagents. Phase 2 answers the Gmail inbox, and checks the Naukri invite mails for any invite the hunt missed. Phase 3 answers the LinkedIn inbox the same way. Phase 4 gives suggestions, a short list
that is concrete about the profile and the hunting strategy. Each reply is drafted and shown, the
candidate approves it or asks for changes, and it is sent. A resume is attached wherever the site
allows it. It follows R10 of `process/instructions.md`. `stated` 2026-11-02

`/interview` works with the candidate in chat, when they ask. It pulls one recorded interview from the
Wispr Flow connector, saves the transcript and writes a review that quotes their answers and proposes
better ones from their own facts. It then folds those lessons into `my-profile/interview-prep/`, so the
Prep tab holds the corrected answers. It takes no lock, so it can run during a live hunt.
Its rules are in `.claude/skills/interview/SKILL.md`. `stated` 2026-11-05

## Standing rules

These override convenience, and every agent follows them.

1. Never enter credentials. If a login is needed, stop and say so.
2. Never claim work that is not the candidate's. Read the caveats in `work-portfolio.md` first.
3. Never apply to the same opening twice. Run `engine.ts dedupe check` first, and
   `engine.ts dedupe record` in the same step as the send. A different job id with a different title
   is a separate opening, even when the JD is identical, because each new requisition is a new
   position. Submit it, and never hold it as a possible duplicate. `stated` 2026-11-02
4. Keep LinkedIn within the `[linkedin]` top-choice cap in `inputs.toml`. Keep `/outreach` within
   the `[prospect]` caps: `invites_per_day`, `invites_per_week`, `max_pending_invites` and
   `inmail_per_month`. `stated` 2026-10-23
5. A form is submitted only in a run the candidate started, and only when it is clean as
   instructions.md defines it. The candidate starts a run in chat, or with a Rerun, Resume or Start now
   click on the dashboard. That click is the go-ahead for its one row, and the run logs it verbatim with
   the time. Everything else is held for /retro or the dashboard. `stated` 2026-10-24
6. Anything an outside reader sees follows the professional register in instructions.md R5.
7. Use only the pinned Chrome from `process/local.json`. Never use the built-in browser. There are three
   exceptions. `process/tools/ea-apply.ts` drives its own Chrome profile at `.playwright/linkedin` for the
   `linkedin-ea` lane, and `process/tools/naukri.ts` drives its own at `.playwright/naukri` for the `naukri` lane.
   `process/tools/hirist.ts` drives its own at `.playwright/hirist` for the `hirist` lane. `process/tools/li-msg.ts`
   shares `.playwright/linkedin` to send LinkedIn replies and connection requests and to read the LinkedIn inbox.
   `stated` 2026-11-25, Hirist and li-msg 2026-11-26
8. The figures under `## Private pay` in `profile.md` never leave the folder. A `[pay]` value reaches only an application form that asks for it, through `engine.ts pay value`. `engine.ts config` omits the pay figures, and `engine.ts pay below` compares a band without printing them. It compares an hourly band too. `stated` 2026-11-10 `engine.ts pay ask` prints only the one figure meant for a founder. `stated` 2026-11-07
9. A LinkedIn message, InMail or connection request is sent only from a draft in an `/outreach`, `/retro` or dashboard send run. A prospect is the author of a hiring post, or the person `/outreach` found for an applied or held role. A prospect first message, InMail or connection request is sent by `/outreach` in the
   same run, within the `[prospect]` caps and with no approval. A reply, on LinkedIn or by email, is
   sent only after the candidate has seen its final text in a /retro sitting and said send in chat,
   or has seen it on the dashboard's Outreach screen and clicked Send for that one reply.
   The word or the click is logged verbatim with the time. Run `engine.ts outreach check` before each send, and
   `engine.ts outreach record` in the same step as the send. `stated` 2026-11-02, prospect `stated` 2026-11-10
10. /hunt and /outreach never read the mailbox or the LinkedIn inbox, and never send email. A step that
    needs an email writes an `email` finding with full context. /retro raises it, refines it with the
    candidate and sends it, only after they have seen the final text and said send. Once they have, Claude
    sends and the candidate never opens Gmail. A plain email goes through the engine's `mail send`. An email with
    an attachment goes through the messenger in the pinned Chrome, which clicks Send, as R10 says. Both
    routes run the ledger check before the send and the record after it. A dashboard send is a run the
    candidate starts with one click. Every email from it, with or without an attachment, goes through the
    messenger procedure in the pinned Chrome. /retro keeps `mail send` for plain email. `stated` 2026-11-02, route `stated` 2026-11-22

## How every run works

1. A hook or classifier denial is an answer. Never repeat the call, and never reach the same end by
   another route. Pick a method that does not need what was blocked. If none exists, hold the row or
   skip the step, and record the exact denial text in the run summary. `stated` 2026-11-25
2. A subagent's "completed" notice means it has stopped, not that its work is done. If its report says
   it is waiting, message it or finish the step yourself. A subagent runs long commands in the
   foreground and never ends its turn to wait. `stated` 2026-11-25
3. The parent session only talks to the candidate and dispatches. Reads and searches across several
   files go to one subagent that reports conclusions, not file contents. `stated` 2026-11-25
4. A subagent does not read the parent's memory. Its brief names every rule it must follow, including
   the one-resume rule and the pay rule. `stated` 2026-11-25
5. Every Agent call names its model. Use the cheapest model that does the job well. `stated` 2026-11-25
6. A chain of several unattended runs goes in one session on a cheaper model at medium effort. It sends
   one final message and no progress notes. Before relaying its report, compare it with the engine's
   own counts. `stated` 2026-11-25

## Reporting to the candidate

A report in chat is a short numbered list in plain words, one sentence for each item. It holds only
what the candidate must decide or act on. Leave out internal code gaps, file paths and line numbers
unless they ask for them. Put the detail in a file, and keep the chat reply to the list.
`stated` 2026-11-02

## No tests

This repo has no tests, and none may be added. That covers unit, integration, golden-file and
browser tests, test frameworks such as Vitest or pytest, and test-driven development. The
candidate tests the application from its UI. This overrides any skill or global rule that asks
for tests. A typecheck (`npm run typecheck`) is allowed, because it is not a test.

## Authority tags

Facts in the profile files carry a tag. `stated` means the candidate said it. `artefact` means it was
read from a repo, a site or a file. `ours` means it is an inference, so flag it to the candidate and
never rely on it silently. Keep the tags when you edit, and tag anything you add.

## The engine names nobody

Only `my-profile/` may hold a person's facts. Nothing in `process/`, `.claude/` or this file
may name a candidate, an employer of theirs or an account they hold. If engine code needs such a
fact, move it into the profile and read it from there.

## One engine on master, one profile in my-profile/

Master carries the engine and `my-profile.example/`, and names nobody. The candidate's profile is the
one folder `my-profile/`, which is gitignored. A new candidate copies `my-profile.example/` to
`my-profile/`, and the `/setup` skill does it with them.
