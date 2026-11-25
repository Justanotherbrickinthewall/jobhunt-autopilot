# Agent guide

This repo runs one candidate's job search. It harvests roles, scores them, builds each application and sends it once the candidate approves. It was written for Claude Code, and any coding agent can follow it.

## Read CLAUDE.md first

`CLAUDE.md` holds the standing rules. Every agent must follow them. Do not copy them from here. The titles are:

1. Never enter credentials.
2. Never claim work that is not the candidate's.
3. Never apply to the same opening twice.
4. Keep LinkedIn and outreach within the caps in `inputs.toml`.
5. Submit a form only in a run the candidate started, and only when it is clean.
6. Anything an outside reader sees follows the professional register.
7. Use only the pinned Chrome.
8. Private pay figures never leave the profile folder.
9. Send a LinkedIn message only from a draft in an approved run.
10. A hunt or outreach run never reads the mailbox or sends email.

## Where the workflows live

- `process/instructions.md` is the hunt, as numbered steps and reference sections.
- `process/contracts.md` holds the machine contracts.
- `process/runners/` holds one file per site, with its access, harvest and apply steps.
- `.claude/skills/*/SKILL.md` holds one procedure for each slash command.
- `.claude/agents/` holds the role briefs for the sub-agents that the skills dispatch.

The skills are plain markdown procedures. A non-Claude agent can follow them step by step. Where a skill says to dispatch an agent, read that agent's file in `.claude/agents/` and do its work yourself or hand it to a sub-agent.

## Order for a new user

1. `/setup` checks the tools, signs in to the sites, pins Chrome and connects Gmail.
2. `/profile` builds the profile from a resume source and prepares for interviews.
3. `/hunt --dry-run` runs the whole flow on a throwaway ledger and sends nothing.
4. `/hunt` runs the real hunt.

`/outreach --dry-run` works the same way. The dry run section of `process/instructions.md` describes both.

## Commands

- `node process/engine.ts --help` lists every engine command.
- `node process/engine.ts profile` prints the profile folder, or exits 2 with the reason.
- `node process/engine.ts validate` checks the profile and ledger.
- `node process/engine.ts preflight` shows which lanes are live.
- `npm run dev` starts the dashboard on port 7002 and its server on port 7003.
- `npm run typecheck` checks the TypeScript.

## Personal folders

The `my-*` folders hold the candidate's facts, applications, sessions and notes. Never commit them. Never read them unless a skill tells you to. They are gitignored, and so are `process/local.json` and `.claude/settings.local.json`.

## No tests

This repo has no tests by design. Do not add any. The candidate tests the application from its UI.
