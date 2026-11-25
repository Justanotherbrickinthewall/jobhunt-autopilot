# Jobhunt autopilot

Jobhunt autopilot runs one person's job search from Claude Code on a Mac. It finds roles, scores them against your profile, fills each application form and submits the clean ones while you are away. It then sits with you to answer recruiters, review your interviews and prepare you for the next one.

You bring your own facts. The repository holds the engine and an empty example profile, and it names nobody.

## Read this before you run it

1. It drives your own signed-in Chrome. LinkedIn, Naukri and most job sites restrict automated use in their terms. An account can be limited or closed. The engine keeps daily and weekly caps and stops on a security check, but the risk is yours.
2. LinkedIn Easy Apply forms are filled by a script, `process/tools/ea-apply.ts`. It runs a headless browser on a LinkedIn session saved in `.playwright/`. That is plain automation, and LinkedIn can detect it.
3. It submits real applications and sends real messages in your name. Read `CLAUDE.md` before the first run. It holds the ten standing rules every agent follows.
4. It runs on macOS only. It has been used by one candidate, mostly on roles in India and remote roles. Other markets are unproven.
5. It has no automated tests. The owner tests it from the dashboard. `npm run typecheck` and `node process/engine.ts validate` are the only checks.

## You start in three steps

Claude Code is Anthropic's coding assistant that runs in your terminal. Install it from https://docs.claude.com/en/docs/claude-code, then run `claude` once in Terminal and sign in. A skill is one of the slash commands below, such as `/setup`. You type it into Claude Code.

Node runs the engine. Install it from https://nodejs.org, then check that `node --version` prints v25 or later.

Claude in Chrome is Anthropic's browser extension. Install it from the Chrome Web Store and sign in. `/setup` then pins the one Chrome it may use, so the engine never drives another browser.

You need Node 25 or later, Claude Code, and Google Chrome in `/Applications` with the Claude in Chrome extension signed in to the accounts your search uses. Reading Gmail needs your own Google Cloud project and OAuth client, and `/setup` walks you through making one. Claude Code asks you to trust the project's hooks on first open. `/setup` also asks you to sign in to LinkedIn and Naukri once in the scripts' own browser.

```bash
git clone <the URL from the green Code button on this repository's GitHub page>
```

```bash
cd jobhunt-autopilot && claude
```

Then type `/setup` in Claude Code.

`/setup` does the technical work in chat, one area at a time. It checks Node, Chrome and the packages, and makes sure `claude -p` works from your terminal. It creates your folders and the ledger, and pins your Chrome. It asks you to sign in to LinkedIn, Naukri, Hirist and Overleaf, and checks each one works. It connects Gmail and asks how your interview recordings will come in. It ends with a preflight check that says which sources are live.

Claude never enters a password. Where a login is needed it stops and asks you to sign in.

## After setup, four steps take you live

1. `/profile` builds your profile. It asks for a resume source first: a LinkedIn link, an Overleaf project or a resume file. It asks you only about the gaps, then builds your interview preparation.
2. `/hunt --dry-run` runs the whole hunt on a throwaway copy of the ledger. It submits and sends nothing, and shows you what it would have done. The LinkedIn, Naukri and Hirist scripts cannot submit in a dry run. On other employer sites an agent fills the form and is told to stop before the final click, so watch the first dry run.
3. `/hunt` runs the real hunt. It submits every clean form and holds the rest, and asks you nothing while it runs.
4. `/retro` settles the held roles and answers your inboxes. You approve each reply.

## When something goes wrong

| Problem | Fix |
|---|---|
| `claude -p` says you are not signed in | Run `claude` in a terminal, sign in, then run `/setup` again. |
| Chrome is not in `/Applications` | Install Google Chrome there, then re-run the Chrome step of `/setup`. |
| A site sign-in has expired | Re-run that site's step of `/setup`. |
| Gmail is not connected | Re-run the Gmail step of `/setup`, which runs `node process/engine.ts mail login`. |
| The LinkedIn security cooldown is running | Wait for it to end. The hunt skips both LinkedIn lanes and works the others. |
| `node process/engine.ts profile` exits 2 | Run `/setup` if `my-profile/` is missing, or `/profile` if it is incomplete. The message names the gap. |

## Six skills run the search

| Skill | You are present | What it does |
|---|---|---|
| `/setup` | Yes | Does the technical setup, once: tools, sign-ins, folders, Gmail and the interview source. |
| `/profile` | Yes | Builds your profile from a resume source, then your interview preparation. Later it works on your resume variants and keeps LinkedIn and Naukri in line with the default resume. |
| `/hunt` | No | Harvests roles, scores them, picks the resume, fills the forms and submits the clean ones. Everything else is held. |
| `/outreach` | No | Finds one person at each role worth a message, and the authors of hiring posts, and sends a first contact within your caps. |
| `/retro` | Yes | Settles the held roles with you, then answers your Gmail and LinkedIn inboxes one reply at a time. |
| `/interview` | Yes | Takes one interview transcript from a connector such as Wispr Flow, a paste or a file. It reviews how you answered and folds the lessons into your preparation. |

`/hunt` works six sources: LinkedIn Easy Apply, LinkedIn roles with an external link, Naukri recruiter invites, Hirist, four remote job boards and company career pages. `/hunt --naukri`, `/hunt --hirist` and the other flags run one source. `/hunt status` and `/outreach status` only report. `/hunt --dry-run` and `/outreach --dry-run` rehearse a run and never submit or send.

## The dashboard shows the whole search

```bash
npm run dev
```

This opens a local dashboard at `http://localhost:7002`. It has eight areas.

1. Today lists what is waiting for you.
2. Jobs holds the board, the retro view and the people you contacted.
3. Interviews shows each interview review and its transcript.
4. Interview prep drills you one question at a time and judges a spoken answer.
5. Profile shows your profile, portfolio and screening answers.
6. Learn is a course app with 12 courses and 30 interview question banks on AI engineering.
7. Notebook keeps the passages you bookmarked.
8. Campaigns shows every past run and its results.

The Learn courses refer to hands-on labs. The lab kit is not in this repository yet, so the lab steps will not run as written.

## The rules it works by

These are the ideas the engine is built on. `CLAUDE.md` and `process/instructions.md` state them in full.

1. One engine, one profile. Only `my-profile/` holds a person's facts. Nothing in the engine names a candidate, an employer or an account.
2. Unattended runs never ask. `/hunt` and `/outreach` decide, log the decision and carry on. What they cannot finish is held for `/retro`.
3. A form is submitted only when it is clean. A form with a question the profile cannot answer is held with its reasons, never guessed.
4. Nothing is sent as a reply until you have read its final text and said send.
5. The engine never claims work that is not yours. Every fact in the profile carries a tag that says whether you stated it, it was read from a file, or it is an inference.
6. Pay figures never leave the profile folder, except into a form field that asks for one.
7. The same opening is never applied to twice. A ledger check runs before every submission and every message.
8. Every number lives in `my-profile/inputs.toml`. The instructions name the key and never the value.
9. The dashboard shows one status for each outcome, and the cause sits inside it as a reason.

## Your facts stay on your machine

These folders are gitignored. They are created as you use the tool, and they are never pushed with the engine.

| Folder | Holds |
|---|---|
| `my-profile/` | Your profile, portfolio, resumes, screening answers, reply rules and every number. |
| `my-applications/` | One folder for each application sent, with the job description and the resume that went. |
| `my-sessions/` | One folder for each run, and the ledger of roles and contacts. |
| `my-interviews/` | Your interview transcripts and reviews. |
| `my-notebook/` | Bookmarks, reading progress and the audio cache. |
| `my-learn/` | Your graded answers and lab work. |
| `my-phone/` | The built phone copy. |

`process/local.json`, `.claude/settings.local.json` and `.playwright/` are also ignored. The last one holds a signed-in browser session, so never share it.

### Back up your facts to your own private repository

Create an empty private repository on GitHub, then run these once and whenever you like.

```bash
npm run my:init -- https://github.com/<you>/<your-private-repo>.git
```

```bash
npm run my:save
```

This keeps a second git directory, `.my-data.git`, that tracks only the personal folders. The engine's repository ignores those folders, so the two cannot mix. `my:init` refuses a repository that is not private.

## Fork it to contribute, use the template to keep it private

1. To send changes back, fork the repository and open a pull request.
2. To run your own copy in private, choose "Use this template" on GitHub and create a private repository. GitHub does not let you make a fork of a public repository private.
3. Either way, your facts stay in the gitignored folders. Engine changes go to your copy. Personal data goes to your private data repository, or nowhere.
4. Before you push an engine change, check that it names nobody. Run `git diff` and look for your name, your employers and your accounts.

## A phone copy for reading at night

`npm run phone:build` builds the Learn courses and your interview preparation into a small offline web app. `npm run phone:publish` pushes it to a public GitHub Pages repository named `night-reading` under the login in the `[phone]` section of `inputs.toml`.

That repository is public. The build drops every preparation item that mentions pay, and a scan fails the build if a pay figure gets through. Your preparation answers can still name your employers and clients, so read what you publish. Skip this feature if that worries you.

## Where to look next

1. `CLAUDE.md` holds the standing rules and a map of the repository. `AGENTS.md` gives the same orientation to Codex and other agents.
2. `process/instructions.md` is the hunt as numbered steps.
3. `process/contracts.md` holds the file formats.
4. `process/runners/` holds one file for each job site.
5. `node process/engine.ts --help` lists every engine command.
6. `docs/dashboard-design.md` is the design every screen follows.

## Licence

MIT. See `LICENSE`.
