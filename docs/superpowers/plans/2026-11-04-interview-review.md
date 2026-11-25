# Interview review implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pull one Wispr Flow interview on request, review it, and show the review on a new Interviews tab.

**Architecture:** A `/interview` skill reads the Wispr Flow connector and writes files to a gitignored `my-interviews/`. The dashboard reads those files through Vite globs, as its other tabs do. The engine, the ledger and the server don't change.

**Tech stack:** Claude Code skill, Wispr Flow MCP connector, React, TypeScript, Vite and `marked`.

**Spec:** `docs/superpowers/specs/2026-11-04-interview-review-design.md`

## Global constraints

- This repo has no tests and none may be added. `npm run typecheck` is the only automated check.
- Don't verify the tab in a browser preview. After the typecheck, the candidate checks it once.
- Nothing in `.claude/`, `src/` or `CLAUDE.md` may name a candidate, an employer of theirs or an account they hold.
- A review never uses the figures under `## Private pay`.
- Don't commit. `CLAUDE.md` and `process/instructions.md` already hold the candidate's uncommitted changes, so commits wait for the candidate's word.

---

### Task 1: The Interviews tab

**Files:**
- Modify: `.gitignore`
- Modify: `src/data/files.ts:3-12`
- Create: `src/data/interviews.ts`
- Create: `src/components/Interviews.tsx`
- Modify: `src/components/AppHeader.tsx:4-11`
- Modify: `src/App.tsx`
- Modify: `src/styles.css` (append)

**Interfaces:**
- Consumes: `readText(path)` from `src/data/files.ts`, and `Blocks`, `lex` and `RenderCtx` from `src/reading/render.tsx`.
- Produces: the file contract that Task 2's skill writes. That is `my-interviews/index.json`, an array of objects with `date`, `company`, `role`, `round`, `folder`, `wispr_meeting_id` and `application_id` (string or null), and `my-interviews/<folder>/review.md` and `transcript.md`.

- [ ] **Step 1: Ignore the folder.** In `.gitignore`, replace this block:

```
my-applications/
my-notebook/
my-profile/
```

with:

```
my-applications/
my-interviews/
my-notebook/
my-profile/
```

- [ ] **Step 2: Add the globs.** In `src/data/files.ts`, replace `'/my-applications/*/jd.md',` with:

```ts
    '/my-applications/*/jd.md',
    '/my-interviews/index.json',
    '/my-interviews/*/review.md',
    '/my-interviews/*/transcript.md',
```

- [ ] **Step 3: Create `src/data/interviews.ts`.**

```ts
import { readText } from './files.ts'

// One row of my-interviews/index.json, which the /interview skill writes.
type IndexRow = {
  date: string
  company: string
  role: string
  round: string
  folder: string
  wispr_meeting_id: string
  application_id: string | null
}

export type Interview = IndexRow & { review: string | null; transcript: string | null }

export function loadInterviews(): { interviews: Interview[]; problem: string | null } {
  const raw = readText('/my-interviews/index.json')
  if (!raw) return { interviews: [], problem: null }
  try {
    const rows = JSON.parse(raw) as IndexRow[]
    const interviews = rows.map((r) => ({
      ...r,
      review: readText(`/my-interviews/${r.folder}/review.md`),
      transcript: readText(`/my-interviews/${r.folder}/transcript.md`),
    }))
    return { interviews: interviews.sort((a, b) => b.date.localeCompare(a.date)), problem: null }
  } catch (e) {
    return { interviews: [], problem: `my-interviews/index.json: ${(e as Error).message}` }
  }
}
```

- [ ] **Step 4: Create `src/components/Interviews.tsx`.**

```tsx
import { useMemo, useState } from 'react'
import { loadInterviews, type Interview } from '../data/interviews.ts'
import { Blocks, lex, type RenderCtx } from '../reading/render.tsx'

type View = 'review' | 'transcript'
const VIEWS: { key: View; label: string }[] = [
  { key: 'review', label: 'Review' },
  { key: 'transcript', label: 'Transcript' },
]

const title = (i: Interview) => [i.company, i.role, i.round].filter(Boolean).join(' · ')

function Detail({ interview, onBack }: { interview: Interview; onBack: () => void }) {
  const [view, setView] = useState<View>('review')
  const source = view === 'review' ? interview.review : interview.transcript
  const ctx: RenderCtx = { speak: false, crumb: `Interviews > ${title(interview)}`, kind: 'interview', link: () => '#interviews' }
  return (
    <>
      <nav className="ptabs" role="tablist" aria-label="Interview files">
        {VIEWS.map((v) => (
          <button key={v.key} role="tab" aria-selected={v.key === view} onClick={() => setView(v.key)}>{v.label}</button>
        ))}
      </nav>
      <div className="scroll">
        <div className="pf-col rd-page iv-page">
          <button className="iv-back" onClick={onBack}>All interviews</button>
          <h1>{title(interview)}</h1>
          <p className="iv-date">{interview.date}</p>
          {source
            ? <Blocks key={view} tokens={lex(source, view === 'transcript')} ctx={ctx} idBase={`iv-${interview.folder}-${view}`} />
            : <p>There's no {view} file in this interview's folder.</p>}
        </div>
      </div>
    </>
  )
}

// The Interviews tab: reviews and transcripts from my-interviews/, which /interview writes. It only reads.
export function Interviews() {
  const { interviews, problem } = useMemo(loadInterviews, [])
  const [folder, setFolder] = useState<string | null>(null)
  const open = interviews.find((i) => i.folder === folder)
  if (open) return <Detail interview={open} onBack={() => setFolder(null)} />
  if (problem) return <div className="empty"><h1>The interview index can't be read</h1><p>{problem}</p></div>
  if (interviews.length === 0) return <div className="empty"><h1>No interviews yet</h1><p>Run <code>/interview</code> to pull one from Wispr Flow.</p></div>
  return (
    <div className="scroll">
      <ul className="iv-list">
        {interviews.map((i) => (
          <li key={i.folder}>
            <button onClick={() => setFolder(i.folder)}>
              <span className="iv-date">{i.date}</span>
              <span>{title(i)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 5: Register the tab.** In `src/components/AppHeader.tsx`, change the type on line 4 to:

```ts
export type TabKey = 'hunt' | 'retro' | 'prep' | 'interviews' | 'profile' | 'notebook'
```

Then add this entry after the `prep` entry in `APP_TABS`:

```ts
  { key: 'interviews', label: 'Interviews', hint: 'Reviews and transcripts of your interviews, from /interview' },
```

- [ ] **Step 6: Wire it into `src/App.tsx`.** Add the import after the `Prep` import:

```ts
import { Interviews } from './components/Interviews.tsx'
```

Add this constant after `const prep = prefs.tab === 'prep'`:

```ts
  const interviews = prefs.tab === 'interviews'
```

Add this branch after the `Prep` branch of the `<main>` conditional:

```tsx
        ) : interviews ? (
          <TabBoundary label="Interviews" key="interviews"><Interviews /></TabBoundary>
```

- [ ] **Step 7: Append the styles to `src/styles.css`.**

```css
/* Interviews tab */
.iv-list { list-style: none; max-width: 720px; margin: 0 auto; padding: var(--s4); }
.iv-list button { display: flex; gap: var(--s4); width: 100%; padding: var(--s2) 0; border: 0; border-bottom: 1px solid var(--border); background: none; color: var(--text); font: inherit; text-align: left; cursor: pointer; }
.iv-list button:hover { background: var(--surface-2); }
.iv-date { color: var(--text-2); white-space: nowrap; }
.iv-page { padding: var(--s4); }
.iv-back { padding: 0; border: 0; background: none; color: var(--text-2); font: inherit; cursor: pointer; }
.iv-back:hover { color: var(--text); }
```

- [ ] **Step 8: Run the typecheck.**

Run: `npm run typecheck`
Expected: exit 0 with no errors. A `Record<TabKey, ...>` that TypeScript flags elsewhere gets an `interviews` entry.

### Task 2: The `/interview` skill and the repo's documents

**Files:**
- Create: `.claude/skills/interview/SKILL.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: the file contract in Task 1, and `node process/engine.ts profile`.
- Produces: the `/interview` command.

- [ ] **Step 1: Create `.claude/skills/interview/SKILL.md`.**

````markdown
---
name: interview
description: Pulls one recorded interview from the Wispr Flow connector with the candidate in chat, saves its transcript and writes a review of how they answered. The review quotes their answers and proposes better ones from their own facts, and the Interviews tab shows it. Use when the candidate says they want to pull, review or go over an interview.
argument-hint: "[which interview, in the candidate's words]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(node process/engine.ts profile), Bash(grep:*), Bash(sed -n:*), Bash(mkdir:*)
---

# /interview

The candidate drives this skill in chat. It writes only to `my-interviews/`. It takes no lock and
touches neither the ledger nor the engine, so it can run during a live hunt. `stated` 2026-11-04

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

If the speakers still can't be separated, write `transcript.md`, write no review and say why.

## Files

Find the application in `my-applications/index.json` by company and role. Its `id` becomes
`application_id`. Use null when none matches.

The folder is `my-interviews/YYYY-MM-DD-<company>-<round>`, in lower case with hyphens. It holds
`transcript.md`, which keeps the speaker labels, and `review.md`.

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
replace the two files.

## The review

Before writing, read `work-portfolio.md`, its caveats first, and every earlier `review.md` in
`my-interviews/`. Read `profile.md` with grep for its heading lines and `sed -n` on the ranges you need.
Never read `## Private pay`.

`review.md` has these four headings, in this order:

1. `## Questions asked` lists each question the interviewer put, in order.
2. `## Weak answers` has one `###` heading per question. Under it, quote the candidate's answer as a
   blockquote. Say what went wrong: rambling, missing the question or underselling the work. Then give
   a better version.
3. `## Follow-ups owed` lists what the candidate promised to send or do.
4. `## Patterns` names each weakness already seen in an earlier review, and which interviews showed it.
   With no earlier review, it says so.

Rules for the review:

- Build a better answer only from facts in `profile.md` and `work-portfolio.md`. Never claim work that
  isn't the candidate's.
- If a better answer needs a fact the files don't hold, say what's missing. Don't invent it.
- Mark any claim about the candidate's background that rests on inference with the `ours` tag.
- Never repeat a pay figure, even one said on the call. It stays in `transcript.md`.

## End of a run

Report in chat as a short numbered list, one sentence per item, of what the candidate should change.
Name the follow-ups owed. Say the full review is on the Interviews tab.
````

- [ ] **Step 2: Update `CLAUDE.md`.** Add this entry after the `my-applications/` entry under Where to look:

```markdown
- `my-interviews/` holds one folder per reviewed interview, with its transcript and review, and an
  `index.json`. `/interview` fills it. It is gitignored and created at run time.
```

Change `It has five tabs.` to `It has six tabs.`

Change `Prep shows the candidate's interview preparation from `my-profile/interview-prep/`.` by adding this sentence after it:

```markdown
Interviews shows the reviews and transcripts in `my-interviews/`, and only reads them.
```

Change `## Five skills` to `## Six skills`.

Add this paragraph after the `/retro` paragraph in that section:

```markdown
`/interview` works with the candidate in chat, when they ask. It pulls one recorded interview from the
Wispr Flow connector, saves the transcript and writes a review that quotes their answers and proposes
better ones from their own facts. It writes only to `my-interviews/`, so it can run during a live hunt.
Its rules are in `.claude/skills/interview/SKILL.md`. `stated` 2026-11-04
```

Keep the candidate's existing uncommitted edits to this file as they are.

### Task 3: The first real pull

The candidate must have signed in first through `/mcp` in an interactive `claude` terminal. A session started before that sign-in may not have the connector's tools, so run this in a new session.

**Files:**
- Modify if needed: `.claude/skills/interview/SKILL.md`

**Interfaces:**
- Consumes: the skill from Task 2 and the tab from Task 1.
- Produces: one real interview in `my-interviews/`.

- [ ] **Step 1: Confirm the connector.** Run `claude mcp list`.
Expected: the Wispr Flow line no longer says `Needs authentication`.

- [ ] **Step 2: Run `/interview` on a meeting the candidate names.** Confirm that the transcript text comes back and which tools returned it.

- [ ] **Step 3: Check the speaker labels.** Compare three answers in the transcript with the candidate's memory of the call. If the labels misattribute speech, record that as a limit in the skill's `What to ask` section and tell the candidate.

- [ ] **Step 4: Pre-approve the read-only tools.** Add the connector's list and transcript tool names, as Step 2 showed them, to `allowed-tools` in the skill.

- [ ] **Step 5: Ask the candidate to check the tab once.** They open `npm run dev`, go to the Interviews tab, open the interview and switch between Review and Transcript.

- [ ] **Step 6: Report what's uncommitted and ask whether to commit.** The new files are the spec, this plan, the skill, `src/data/interviews.ts` and `src/components/Interviews.tsx`.
