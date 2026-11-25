// Fold the findings workers leave in a session's notes.md, and report what is still open.
// A finding is one `### F-<n> · <kind> · <stage> · <row id or -> · <state>` entry under `## Findings`. The
// heading token is the state, and the JSON comment under it is the machine copy. The fold rules by kind are
// in the findings section of process/contracts.md. `fold` exits 1 when any finding is malformed, after
// printing its JSON. `list` exits 1 when any row has an error.
// The notes.md edit of one fold happens in a single read-modify-write under the session's `.lock`, so the
// state change and the line it caused never part.
//
//     node process/engine.ts findings fold [--session S]
//     node process/engine.ts findings list [--open] [--kind K] [--top N] [--session S] [--json]
//     node process/engine.ts findings pending          (also `node process/engine.ts retro`)
//     node process/engine.ts findings question-tick [--session S] Q-<n> [--note TEXT]
//     node process/engine.ts findings proposal-set [--session S] PR-<n> applied|declined
//     node process/engine.ts findings age
//     node process/engine.ts findings ours-old
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import * as C from '../constants.ts'
import { readDicts, type CsvRow } from '../lib/csv.ts'
import {
  byKey, cut, daysBetween, decodeStrict, NEGATIVE_NUMBER, pyCopy, PYFLOAT, pyInt, pyJson, PyExc, PY_WS, pyLstrip, pyPath, pyStr,
  pyStrip, pyTruthy, repr, strftime,
} from '../lib/py.ts'
import { jsonLoads } from '../lib/pyjson.ts'
import { Exit, readText, withLock, writeAtomic, type Out } from './io.ts'
import * as dedupe from './dedupe.ts'
import * as profiles from './profiles.ts'
import * as session_ from './session.ts'
import * as validate from './validate.ts'

type Dict = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
type Row = CsvRow

const NOTES = 'notes.md'
const WS = `[${PY_WS}]`
const HEAD = /^### F-(\p{Nd}+) · ([^\n]*)(?![\s\S])/u
const COMMENT = new RegExp(`^<!--${WS}*finding${WS}+(\\{[^\\n]*\\})${WS}*-->${WS}*(?![\\s\\S])`, 'u')
const PLACEHOLDER = new RegExp(`^${WS}*[-*(_]*${WS}*(none|nothing|empty|n/a)${WS}*[)_*.]*${WS}*(?![\\s\\S])`, 'iu')
const SEP = ' · '
const R9_TARGET = 'process/instructions.md R9'

const isDict = (v: unknown): v is Dict =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Map) && !(PYFLOAT in v)

// x or ''
const orEmpty = (v: unknown): unknown => (pyTruthy(v) ? v : '')
// dict.get(k, dflt) on a csv row: a short row holds None for its missing keys.
const rget = (r: Row, k: string, dflt: string | null = null): string | null =>
  Object.hasOwn(r, k) ? (r[k] === undefined ? null : r[k]!) : dflt
// '%-Ns' pads by code points.
const ljust = (s: string, n: number): string => s + ' '.repeat(Math.max(0, n - Array.from(s).length))
const rjust = (s: string, n: number): string => ' '.repeat(Math.max(0, n - Array.from(s).length)) + s

// ------------------------------------------------------------------ sessions

function sessions(): string[] {
  return C.sessionFolders(C.SESSIONS, null, null, true)
}

function readFront(notes: string): Dict {
  return { ...session_.readFront(notes) } as Dict
}

function resolve(arg: string | null = null): string {
  const a = arg || pyStrip(process.env['JOBHUNT_SESSION'] ?? '') || null
  if (a) {
    const d = session_.asSession(a)
    if (d !== null) return d
    throw new Exit(`no session ${repr(a)} with a notes.md under ${C.SESSIONS}`)
  }
  const found = sessions()
  if (!found.length) throw new Exit(`no session with a notes.md under ${C.SESSIONS}`)
  for (const d of [...found].reverse()) if (readFront(join(d, NOTES))['phase'] !== 'closed') return d
  return found[found.length - 1]
}

function locked<T>(session: string, fn: () => T): T {
  return withLock(join(session, '.lock'), fn)
}

function writeAtomicText(path: string, text: string): void {
  writeAtomic(path, text, path + '.tmp')
}

// ------------------------------------------------------------------ notes.md sections

// [(index, name)] for each heading of this level, ignoring anything inside a code fence.
function headings(lines: string[], level = '## '): [number, string][] {
  const out: [number, string][] = []
  let fenced = false
  lines.forEach((ln, i) => {
    if (pyLstrip(ln).startsWith('```')) fenced = !fenced
    else if (!fenced && ln.startsWith(level) && !ln.startsWith(level + '#')) out.push([i, pyStrip(ln.slice(level.length))])
  })
  return out
}

// [heading index, end index] of `## name`, end being the next `## ` heading. null if absent.
function bounds(lines: string[], name: string): [number, number] | null {
  const hs = headings(lines)
  for (let n = 0; n < hs.length; n++) {
    if (hs[n][1].toLowerCase() === name.toLowerCase()) return [hs[n][0], n + 1 < hs.length ? hs[n + 1][0] : lines.length]
  }
  return null
}

function section(lines: string[], name: string): string[] {
  const b = bounds(lines, name)
  return b ? lines.slice(b[0] + 1, b[1]) : []
}

// Add `block` (a list of lines) at the end of `## name`, creating the section before `## Log`.
function append(lines: string[], name: string, block: string[]): string[] {
  let b = bounds(lines, name)
  if (b === null) {
    const log = bounds(lines, 'Log')
    const at = log ? log[0] : lines.length
    lines.splice(at, 0, '## ' + name, '', '')
    b = bounds(lines, name)!
  }
  const [start, end] = b
  let body = lines.slice(start + 1, end).filter((ln) => !PLACEHOLDER.test(ln))
  while (body.length && !pyStrip(body[body.length - 1])) body.pop()
  while (body.length && !pyStrip(body[0])) body.shift()
  const neu = [...(body.length ? ['', ...body] : ['']), ...(body.length && block.length && block[0].startsWith('### ') ? [''] : []), ...block, '']
  lines.splice(start + 1, end - (start + 1), ...neu)
  return lines
}

const clean = (s: unknown): string => pyStrip(pyStr(orEmpty(s)).replace(new RegExp(`${WS}+`, 'gu'), ' ').replaceAll(SEP, ' / '))

export const norm = (s: unknown): string => pyStrip(pyStr(s).toLowerCase().replace(/[^a-z0-9]+/gu, ' '))

// ------------------------------------------------------------------ findings

interface Entry { n: number; id: string; line: number; data: Dict | null; error: string; kind: string; stage: string; row: string; state: string; summary: string }

// Every finding entry in one notes.md body, as dicts. Malformed ones carry a non-empty 'error'.
export function parse(text: string): Entry[] {
  const lines = text.split('\n')
  const b = bounds(lines, 'Findings')
  if (!b) return []
  const [start, end] = b
  const heads: number[] = []
  for (let i = start + 1; i < end; i++) if (HEAD.test(lines[i])) heads.push(i)
  const out: Entry[] = []
  heads.forEach((i, k) => {
    const stop = k + 1 < heads.length ? heads[k + 1] : end
    const m = HEAD.exec(lines[i])!
    const parts = m[2].split(SEP)
    const e: Entry = { n: pyInt(m[1]), id: 'F-' + m[1], line: i, data: null, error: '', kind: '', stage: '', row: '', state: '', summary: '' }
    if (parts.length !== 4) {
      e.error = `heading has ${parts.length + 1} fields, needs 5`
      out.push(e)
      return
    }
    e.kind = pyStrip(parts[0]); e.stage = pyStrip(parts[1]); e.row = pyStrip(parts[2]); e.state = pyStrip(parts[3])
    const body = lines.slice(i + 1, stop).filter((ln) => pyStrip(ln))
    e.summary = body.find((ln) => !COMMENT.test(ln)) ?? ''
    const cmLine = body.find((ln) => COMMENT.test(ln))
    if (cmLine === undefined) e.error = 'no <!-- finding {...} --> comment'
    else {
      try {
        e.data = jsonLoads(COMMENT.exec(cmLine)![1]) as Dict
      } catch (exc) {
        if (exc instanceof PyExc && exc.pyName === 'JSONDecodeError') e.error = `JSON comment unreadable: ${exc.message}`
        else throw exc
      }
    }
    if (!e.error) e.error = check(e)
    out.push(e)
  })
  return out
}

function check(e: Entry): string {
  const d = e.data
  if (!isDict(d)) return 'JSON comment is not an object'
  const missing = C.FINDING_KEYS.filter((k) => !Object.hasOwn(d, k))
  if (missing.length) return `JSON comment lacks ${missing.join(', ')}`
  if (typeof d['kind'] !== 'string' || !(C.FINDING_KINDS as readonly string[]).includes(d['kind'])) {
    return `kind ${repr(d['kind'])} is not one of ${C.FINDING_KINDS.join(', ')}`
  }
  if (!(C.FINDING_STATES as readonly string[]).includes(e.state)) {
    return `state ${repr(e.state)} is not one of ${C.FINDING_STATES.join(', ')}`
  }
  if (!isDict(d['proposed'])) return "'proposed' is not an object"
  const gone = C.FINDING_PROPOSED[d['kind']].filter((k) => !pyStrip(pyStr(orEmpty(d['proposed'][k]))))
  if (gone.length) return `proposed has no ${gone.join(', ')}`
  return ''
}

// Set the state token on one finding's heading, and in its JSON copy if that has a state key.
function retitle(lines: string[], fid: string, state: string): void {
  for (const e of parse(lines.join('\n'))) {
    if (e.id === fid) {
      const head = lines[e.line].split(SEP)
      head[head.length - 1] = state
      lines[e.line] = head.join(SEP)
      for (let j = e.line + 1; j < lines.length; j++) {
        if (HEAD.test(lines[j]) || lines[j].startsWith('## ')) break
        const m = COMMENT.exec(lines[j])
        if (m) {
          const d = jsonLoads(m[1]) as Dict
          if (Object.hasOwn(d, 'state')) {
            d['state'] = state
            lines[j] = `<!-- finding ${pyJson(d, { ensureAscii: false })} -->`
          }
          break
        }
      }
      return
    }
  }
  throw new PyExc('KeyError', `'no finding ${fid}'`)
}

// ------------------------------------------------------------------ the fold

function csvRows(path: string): Row[] {
  let buf: Buffer
  try { buf = readFileSync(path) } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw e
  }
  return readDicts(decodeStrict(buf)).rows
}

// Append `make(d)` rows for the items that are not already in the CSV. Returns [added, skipped].
function foldCsv(path: string, cols: readonly string[], items: Entry[], isDup: (rows: Row[], e: Entry) => boolean,
                 make: (e: Entry) => Dict): [number, number] {
  let added = 0
  let skipped = 0
  dedupe.locked(path, () => {
    const existing = csvRows(path)
    for (const d of items) {
      if (isDup(existing, d)) { skipped += 1; continue }
      const row = make(d)
      dedupe.append(path, cols, row)
      existing.push(row as Row)
      added += 1
    }
  })
  return [added, skipped]
}

function kwLine(kw: string, count: number, quote: string, inPf: string): string {
  return `- ${clean(kw)}${SEP}${count}${SEP}"${clean(quote).replaceAll('"', "'")}"${SEP}in portfolio: ${inPf}`
}

function foldKeywords(lines: string[], items: Entry[]): void {
  let b = bounds(lines, 'Keyword gaps')
  for (const d of items) {
    const p = d.data!['proposed'] as Dict
    const kw = clean(p['keyword'])
    const inPf = pyStrip(pyStr(orEmpty(p['in_portfolio']))).toLowerCase().startsWith('yes') ? 'yes' : 'no'
    let hit: number | null = null
    if (b) {
      const stop = bounds(lines, 'Keyword gaps')![1]
      for (let i = b[0] + 1; i < stop; i++) {
        if (lines[i].startsWith('- ') && norm(lines[i].slice(2).split(SEP)[0]) === norm(kw)) { hit = i; break }
      }
    }
    if (hit === null) {
      append(lines, 'Keyword gaps', [kwLine(kw, 1, p['jd_quote'], inPf)])
    } else {
      const f = lines[hit].slice(2).split(SEP)
      let n: number
      try {
        if (f.length < 2) throw new Error('IndexError')
        n = pyInt(f[1]) + 1
      } catch { n = 2 }
      const rest = f.length > 2 ? f.slice(2).join(SEP) : `"${clean(p['jd_quote'])}"${SEP}in portfolio: ${inPf}`
      lines[hit] = `- ${f[0]}${SEP}${n}${SEP}${rest}`
    }
    b = bounds(lines, 'Keyword gaps')
  }
}

function nextN(lines: string[], sec: string, pattern: RegExp): number {
  const nums: number[] = []
  for (const ln of section(lines, sec)) {
    const m = pattern.exec(ln)
    if (m) nums.push(pyInt(m[1]))
  }
  return Math.max(0, ...nums) + 1
}

interface FoldOut { questions: string[]; proposals: string[]; emails: string[] }

// Apply the notes.md half of the fold to `lines` in place. Returns what the parent should see.
function foldSession(lines: string[], groups: Record<string, Entry[]>): FoldOut {
  const out: FoldOut = { questions: [], proposals: [], emails: [] }
  const states = new Map<string, string>()
  if (groups['keyword_gap'].length) {
    foldKeywords(lines, groups['keyword_gap'])
    for (const d of groups['keyword_gap']) states.set(d.id, 'folded')
  }
  for (const d of groups['new_source']) {
    const p = d.data!['proposed'] as Dict
    const known = norm(section(lines, 'Proposals').join(' '))
    if (!known.includes(norm(p['name']))) {
      const n = nextN(lines, 'Proposals', /^### PR-(\p{Nd}+)/u)
      append(lines, 'Proposals', [
        `### PR-${n}${SEP}${R9_TARGET}${SEP}open`,
        `New source ${clean(p['name'])} found by ${clean(d.data!['source'])} at stage ${pyStr(d.data!['stage'])} (${d.id}).`,
        '```diff',
        `+ - ${clean(p['name'])}${SEP}${clean(p['url'])}${SEP}access: ${clean(p['access'])}${SEP}roles seen: ${clean(p['evidence_roles'])}`,
        '```'])
      out.proposals.push(`PR-${n}: ${clean(p['name'])}`)
    }
    states.set(d.id, 'proposed')
  }
  for (const d of groups['answer_gap']) {
    const q = clean((d.data!['proposed'] as Dict)['question'])
    if (!norm(section(lines, C.QUESTIONS_SECTION).join(' ')).includes(norm(q))) {
      const n = nextN(lines, C.QUESTIONS_SECTION, /Q-(\p{Nd}+)/u)
      append(lines, C.QUESTIONS_SECTION, [`- [ ] Q-${n} ${q} (from ${d.id})`])
      out.questions.push(`Q-${n}: ${q}`)
    }
    states.set(d.id, 'asked')
  }
  for (const d of groups['email']) {
    const p = d.data!['proposed'] as Dict
    if (!section(lines, 'Emails').join('\n').includes(`finding: ${d.id}\n`)) {
      const n = nextN(lines, 'Emails', /^### EM-(\p{Nd}+)/u)
      const row = clean(d.data!['id'])
      append(lines, 'Emails', [
        `### EM-${n}${SEP}${clean(p['to'])}${SEP}open`,
        `- finding: ${d.id}`, `- row: ${row || '-'}`, `- link: ${clean(p['link'])}`, `- reason: ${clean(p['reason'])}`,
        `- subject: ${clean(p['subject'])}`, `- attach_resume: ${clean(p['attach_resume'])}`, '- body:',
        '```text', ...pyStr(p['body']).replace(/\r/gu, '').trim().split('\n'), '```'])
      out.emails.push(`EM-${n}: ${clean(p['to'])}`)
    }
    states.set(d.id, 'asked')
  }
  for (const d of groups['blocked']) {
    const p = d.data!['proposed'] as Dict
    const q = `BLOCKED ${clean(d.data!['id'])}: ${clean(p['reason'])} Action: ${clean(p['action_for_candidate'])}`
    if (!section(lines, C.QUESTIONS_SECTION).some((ln) => ln.endsWith(`(from ${d.id})`))) {
      const n = nextN(lines, C.QUESTIONS_SECTION, /Q-(\p{Nd}+)/u)
      append(lines, C.QUESTIONS_SECTION, [`- [ ] Q-${n} ${q} (from ${d.id})`])
      out.questions.push(`Q-${n}: ${q}`)
    }
    states.set(d.id, 'asked')
  }
  for (const d of [...groups['career_page'], ...groups['ats_domain']]) states.set(d.id, 'folded')
  for (const [fid, st] of states) retitle(lines, fid, st)
  return out
}

// Fold every open finding in one session. Returns a result dict for the parent to read.
export function fold(session: string | null = null): Dict {
  const sdir = resolve(session)
  const notes = join(sdir, NOTES)
  const entries = parse(readText(notes))
  const bad = entries.filter((e) => e.error && e.state === 'open').map((e) => ({ id: e.id, error: e.error }))
  const todo = entries.filter((e) => !e.error && e.state === 'open')
  const groups: Record<string, Entry[]> = {}
  for (const k of C.FINDING_KINDS) groups[k] = todo.filter((e) => e.data!['kind'] === k)
  let dup = 0
  const lower = (v: unknown): string => pyStrip(pyStr(orEmpty(v))).toLowerCase()
  let added = 0
  let added2 = 0
  let skip: number
  if (groups['career_page'].length) {
    [added, skip] = foldCsv(
      C.COMPANY_CAREERS, C.COMPANY_CAREERS_COLS, groups['career_page'],
      (rows, e) => rows.some((r) => norm(rget(r, 'company', '')) === norm((e.data!['proposed'] as Dict)['company'])
        || pyStrip(pyStr(orEmpty(r['careers_root'] ?? null))).replace(/\/+$/u, '').toLowerCase()
          === pyStrip(pyStr((e.data!['proposed'] as Dict)['url'])).replace(/\/+$/u, '').toLowerCase()),
      (e) => ({
        company: (e.data!['proposed'] as Dict)['company'], careers_root: (e.data!['proposed'] as Dict)['url'],
        ats_vendor: (e.data!['proposed'] as Dict)['ats'], sweepable: 'maybe', first_seen: e.data!['date'],
        from_role_id: e.data!['id'], notes: e.data!['summary'],
      }))
    dup += skip
  }
  if (groups['ats_domain'].length) {
    [added2, skip] = foldCsv(
      C.ATS_DOMAINS, C.ATS_DOMAINS_COLS, groups['ats_domain'],
      (rows, e) => rows.some((r) => lower(r['apply_domain'] ?? null) === pyStrip(pyStr((e.data!['proposed'] as Dict)['domain'])).toLowerCase()),
      (e) => ({
        company: (e.data!['proposed'] as Dict)['company'],
        apply_domain: pyStrip(pyStr((e.data!['proposed'] as Dict)['domain'])).toLowerCase(),
        vendor: (e.data!['proposed'] as Dict)['vendor'], account_required: '', granted: 'no',
        first_seen: e.data!['date'], roles_waiting: '1', notes: e.data!['summary'],
      }))
    dup += skip
  }

  const res = locked(sdir, () => {
    const lines = readText(notes).split('\n')
    // Re-read under the lock, so a finding added while the CSVs were written is not lost.
    const fresh = new Map(parse(lines.join('\n')).map((e) => [e.id, e]))
    for (const k of Object.keys(groups)) groups[k] = groups[k].filter((e) => fresh.get(e.id)?.state === 'open')
    const r = foldSession(lines, groups)
    writeAtomicText(notes, lines.join('\n'))
    return r
  })

  const drift = todo.filter((e) => e.data!['kind'] === 'instruction_drift')
    .map((e) => pyCopy(e.data!['proposed'] as Dict, { finding: e.id, id: e.data!['id'], stage: e.data!['stage'] }))
  const folded: Dict = {}
  for (const [k, v] of Object.entries(groups)) if (v.length && k !== 'instruction_drift') folded[k] = v.length
  return {
    session: basename(pyPath(sdir)), folded, skipped_duplicates: dup, drift, questions: res.questions, proposals: res.proposals, emails: res.emails,
    malformed: bad, csv_rows_added: { company_careers: added, ats_domains: added2 },
  }
}

// ------------------------------------------------------------------ settling questions and proposals

// An open question line: `- [ ] Q-<n> <text> (from F-<m>)`.
const OPEN_QUESTION = /^- \[ \] (Q-\p{Nd}+) (.*)$/u
const FROM_TAIL = /\s*\(from F-\p{Nd}+\)$/u
const questionKey = (text: string): string => norm(text.replace(FROM_TAIL, ''))

// Tick every open question in one session that `pick` accepts, under the session lock. A note goes before the
// `(from F-<m>)` tail. Returns the Q-ids ticked.
function tickWhere(sdir: string, pick: (qid: string, text: string) => boolean, note: string): string[] {
  return locked(sdir, () => {
    const notes = join(sdir, NOTES)
    const lines = readText(notes).split('\n')
    const b = bounds(lines, C.QUESTIONS_SECTION)
    const done: string[] = []
    for (let i = b ? b[0] + 1 : 0; b && i < b[1]; i++) {
      const m = OPEN_QUESTION.exec(lines[i])
      if (!m || !pick(m[1], m[2])) continue
      const tail = FROM_TAIL.exec(m[2])?.[0] ?? ''
      const text = m[2].slice(0, m[2].length - tail.length)
      lines[i] = `- [x] ${m[1]} ${text}${note ? ` [note: ${clean(note)}]` : ''}${tail}`
      done.push(m[1])
    }
    if (done.length) writeAtomicText(notes, lines.join('\n'))
    return done
  })
}

// Tick Q-<n> in this session, and any open box with the same text in another session. Returns [session, Q-id] pairs.
export function questionTick(session: string | null, qid: string, note: string): [string, string][] {
  const sdir = resolve(session)
  const own = section(readText(join(sdir, NOTES)).split('\n'), C.QUESTIONS_SECTION)
    .map((ln) => OPEN_QUESTION.exec(ln)).find((m) => m !== null && m[1] === qid)
  if (!own) throw new Exit(`no open question ${qid} in ${basename(pyPath(sdir))}`)
  const key = questionKey(own[2])
  const done: [string, string][] = tickWhere(sdir, (id) => id === qid, note).map((id) => [basename(pyPath(sdir)), id])
  for (const d of sessions()) {
    if (d === sdir) continue
    for (const id of tickWhere(d, (_, text) => questionKey(text) === key, note)) done.push([basename(pyPath(d)), id])
  }
  return done
}

// Set the state token of `### PR-<n> · <file> <section> · <state>` under `## Proposals`.
export function proposalSet(session: string | null, pid: string, state: string): void {
  const sdir = resolve(session)
  locked(sdir, () => {
    const notes = join(sdir, NOTES)
    const lines = readText(notes).split('\n')
    const b = bounds(lines, 'Proposals')
    const at = b ? lines.findIndex((ln, i) => i > b[0] && i < b[1] && ln.startsWith(`### ${pid}${SEP}`)) : -1
    if (at < 0) throw new Exit(`no proposal ${pid} in ${basename(pyPath(sdir))}`)
    const head = lines[at].split(SEP)
    if (head.length < 3) throw new Exit(`${pid} has no state field in its heading`)
    head[head.length - 1] = state
    lines[at] = head.join(SEP)
    writeAtomicText(notes, lines.join('\n'))
  })
}

// Tick the open questions of every session older than budgets.held_max_age_days, with the note `aged out`. A BLOCKED
// question that holds STOPPED: stays, because that form may have gone out. Returns [session, ticked count] pairs.
export function age(): [string, number][] {
  const today = strftime('%Y-%m-%d')
  const out: [string, number][] = []
  for (const d of sessions()) {
    const when = C.sessionWhen(basename(pyPath(d)))
    if (when === null || daysBetween(strftime('%Y-%m-%d', when[0]), today) <= C.cfg().held_max_age_days) continue
    const n = tickWhere(d, (_, text) => !(text.startsWith('BLOCKED') && text.includes('STOPPED:')), 'aged out').length
    if (n) out.push([basename(pyPath(d)), n])
  }
  return out
}

// ------------------------------------------------------------------ recurrence

// kind, stage and the summary in lower case with every word that holds a digit dropped, so ids and counts never split a repeat.
const fingerprint = (e: Entry): string =>
  [e.kind, e.stage, norm(e.summary.split(/\s+/u).filter((w) => !/\p{Nd}/u.test(w)).join(' '))].join('|')

export interface Repeat { count: number; sessions: number; summary: string }

// Findings that turn up in two or more sessions, most frequent first. Keyword gaps are counted by their own line.
export function repeats(): Repeat[] {
  const seen = new Map<string, { count: number; names: Set<string>; summary: string }>()
  for (const d of sessions()) {
    for (const e of parse(readText(join(d, NOTES)))) {
      if (e.error || e.kind === 'keyword_gap') continue
      const f = seen.get(fingerprint(e)) ?? { count: 0, names: new Set<string>(), summary: e.summary }
      f.count += 1
      f.names.add(d)
      seen.set(fingerprint(e), f)
    }
  }
  return [...seen.values()].filter((f) => f.names.size >= 2)
    .map((f) => ({ count: f.count, sessions: f.names.size, summary: f.summary }))
    .sort(byKey((r: Repeat) => [-r.count, r.summary]))
}

// ------------------------------------------------------------------ old `ours` tags

const OURS = /`ours`\s+(\p{Nd}{4}-\p{Nd}{2}-\p{Nd}{2})/gu

function markdownIn(dir: string, recursive: boolean): string[] {
  try {
    return readdirSync(dir, { recursive }).map((f) => join(dir, String(f)))
      .filter((f) => f.endsWith('.md') && statSync(f).isFile()).sort()
  } catch { return [] }
}

// `ours` tags older than budgets.ours_review_days in process/, .claude/agents, .claude/skills and the profile's top-level
// markdown, as file, line and date. Never the line's text, and nothing under `## Private pay`.
export function oursOld(): { file: string; line: number; date: string }[] {
  const today = strftime('%Y-%m-%d')
  const files = [
    ...markdownIn(C.PROCESS, true), ...markdownIn(join(C.REPO, '.claude', 'agents'), true),
    ...markdownIn(join(C.REPO, '.claude', 'skills'), true), ...markdownIn(profiles.root() ?? '', false),
  ]
  const out: { file: string; line: number; date: string }[] = []
  for (const f of files) {
    let private_ = false
    readText(f).split('\n').forEach((ln, i) => {
      if (ln.startsWith('## ')) private_ = ln.slice(3).trim().toLowerCase() === 'private pay'
      if (private_) return
      for (const m of ln.matchAll(OURS)) {
        if (daysBetween(m[1], today) > C.cfg().ours_review_days) out.push({ file: relative(C.REPO, f), line: i + 1, date: m[1] })
      }
    })
  }
  return out
}

// ------------------------------------------------------------------ what is stuck

// The start of the newest closed -retro run, or null before the first. Suggestions and the HELD count read from here.
export function lastRetroStart(): Date | null {
  const closed = C.sessionFolders(C.SESSIONS, C.RETRO_SUFFIX, null, true)
    .filter((d) => readFront(join(d, NOTES))['phase'] === 'closed')
  return closed.length ? C.sessionWhen(basename(pyPath(closed[closed.length - 1])))![0] : null
}

// `skipped` prospects whose note starts a HELD: reason and whose date_found is on or after `since`. date_found is the nearest
// date the ledger keeps, because a skip writes none.
export function heldSkipped(since: Date | null): number {
  const from = since === null ? '' : strftime('%Y-%m-%d', since)
  // A row `ingest age` retired also carries HELD:, but that was a wait that ran out, not a scoring decision.
  return csvRows(C.PROSPECTS).filter((r) => rget(r, 'status') === 'skipped' && (rget(r, 'notes') ?? '').includes(C.HELD_PREFIX)
    && !(rget(r, 'notes') ?? '').includes(C.HELD_AGED) && !(rget(r, 'notes') ?? '').includes(C.EA_FLOOR_REASON) && (rget(r, 'date_found') ?? '') >= from).length
}

const OPEN_STATUS = (status: string): boolean => !['applied', 'skipped', 'wrong_job', 'dropped'].includes(status) && !C.HELD_STATUSES.has(status)

// Everything that stopped without a question or a held row, one line each: board rows in the blocked lane whose prospect is
// still open, files in .stage/*/rejected/, failed sources, runs left open and not touched for budgets.live_run_stale_hours,
// stale resumes, and reservations whose run has closed. It reads hunts that retro_done has not settled, and runs of any kind
// for the open-run check. Then one count line for HELD: skips.
export function stuckItems(): string[] {
  const out: string[] = []
  const status = new Map(csvRows(C.PROSPECTS).map((r) => [rget(r, 'id', '') ?? '', rget(r, 'status', '') ?? '']))
  for (const d of sessions()) {
    const name = basename(pyPath(d))
    const front = readFront(join(d, NOTES))
    if (front['phase'] !== 'closed' && C.isStaleRun(d)) out.push(`Run left open: ${name}, phase ${front['phase'] ?? '-'}`)
    if (pyStr(front['retro_done'] ?? 'no') === 'yes' || !name.endsWith('-' + C.SESSION_SUFFIX)) continue
    const blocked = csvRows(join(d, 'board.csv')).filter((r) => rget(r, 'lane') === 'blocked' && OPEN_STATUS(status.get(rget(r, 'id', '') ?? '') ?? 'new'))
    if (blocked.length) out.push(`Blocked lane: ${blocked.length} row(s) in ${name}: ${cut(blocked.map((r) => rget(r, 'id')).join(', '), 100)}`)
    const rejected = C.STAGES.map((st) => [st, countFiles(join(d, C.STAGE_DIR, st, 'rejected'))] as const).filter(([, n]) => n)
    if (rejected.length) out.push(`Rejected stage files in ${name}: ${rejected.map(([st, n]) => `${st} ${n}`).join(', ')}`)
    const failed = Array.isArray(front['sources_failed']) ? front['sources_failed'] : []
    if (failed.length) out.push(`Sources failed in ${name}: ${failed.join(', ')}`)
  }
  const warns: string[] = []
  validate.variants(warns)
  out.push(...warns.filter((x) => x.startsWith('STALE RESUME')))
  for (const r of csvRows(C.RESERVED)) {
    const run = rget(r, 'session') ?? ''
    const d = run ? session_.asSession(run) : null
    if (d === null) out.push(`Reservation left behind: ${rget(r, 'id') || rget(r, 'key')} (${run ? `run ${run} is gone` : 'no run recorded'})`)
    else if (readFront(join(d, NOTES))['phase'] === 'closed') out.push(`Reservation left behind: ${rget(r, 'id') || rget(r, 'key')} (run ${basename(pyPath(d))} is closed)`)
  }
  const since = lastRetroStart()
  out.push(`Skipped under a HELD: reason since ${since === null ? 'the start' : 'the last retro'}: ${heldSkipped(since)}`)
  return out
}

function countFiles(dir: string): number {
  try { return readdirSync(dir).filter((f) => !f.startsWith('.')).length } catch { return 0 }
}

// ------------------------------------------------------------------ reports

// Findings across sessions as a list of dicts, oldest session first. With kind 'keyword_gap' it returns
// the `## Keyword gaps` lines summed across sessions instead.
export function list(openOnly = false, kind: string | null = null, session: string | null = null): Dict[] {
  const chosen = session ? [resolve(session)] : sessions()
  if (kind === 'keyword_gap') {
    const tot = new Map<string, Dict>()
    for (const d of chosen) {
      const lines = readText(join(d, NOTES)).split('\n')
      for (const ln of section(lines, 'Keyword gaps')) {
        if (!ln.startsWith('- ')) continue
        const f = ln.slice(2).split(SEP).map((x) => pyStrip(x))
        if (!f.length || !f[0]) continue
        let n: number
        try {
          if (f.length < 2) throw new Error('IndexError')
          n = pyInt(f[1])
        } catch { n = 1 }
        const key = norm(f[0])
        let t = tot.get(key)
        if (t === undefined) {
          t = { keyword: f[0], count: 0, sessions: [], in_portfolio: 'no', quote: '' }
          tot.set(key, t)
        }
        t['count'] += n
        t['sessions'].push(basename(pyPath(d)))
        if (f.length > 2 && !t['quote']) t['quote'] = pyStrip(f[2], '"')
        if (f.length > 3 && f[3].endsWith('yes')) t['in_portfolio'] = 'yes'
      }
    }
    return [...tot.values()].sort(byKey((t: Dict) => [-t['count'], (t['keyword'] as string).toLowerCase()]))
  }
  const out: Dict[] = []
  for (const d of chosen) {
    for (const e of parse(readText(join(d, NOTES)))) {
      if (openOnly && e.state !== 'open') continue
      if (kind && e.kind !== kind) continue
      out.push({ session: basename(pyPath(d)), id: e.id, kind: e.kind, stage: e.stage, row: e.row, state: e.state, summary: e.summary, error: e.error })
    }
  }
  return out
}

// The one `engine.ts retro` line for the keyword gaps: sightings, distinct keywords and the top few.
export function keywordLine(): string {
  const rows = list(false, 'keyword_gap')
  const total = rows.reduce((n, r) => n + (r['count'] as number), 0)
  const top = rows.slice(0, 5).map((r) => `${r['keyword']} (${r['count']})`).join(', ')
  return `Keyword gaps: ${total} sighting(s), ${rows.length} distinct${top ? `. Top: ${top}` : ''}`
}

// Sessions that /retro still has work on: retro_done is not yes, or findings, questions or proposals are
// open. Counted from the body, because front-matter counters refresh only on tick.
export function pending(): Dict[] {
  const out: Dict[] = []
  for (const d of sessions()) {
    const text = readText(join(d, NOTES))
    const lines = text.split('\n')
    const front = readFront(join(d, NOTES))
    const fo = parse(text).filter((e) => e.state === 'open').length
    const qo = section(lines, C.QUESTIONS_SECTION).filter((ln) => new RegExp(`^${WS}*- \\[ \\]`, 'u').test(ln)).length
    const po = section(lines, 'Proposals')
      .filter((ln) => /^### PR-\p{Nd}+/u.test(ln) && !['applied', 'declined'].includes(pyStrip(ln.split(SEP).at(-1)!))).length
    const eo = section(lines, 'Emails').filter((ln) => /^### EM-\p{Nd}+ · .* · open$/u.test(ln)).length
    const retro = pyStr(pyTruthy(front['retro_done']) ? front['retro_done'] : 'no') !== 'yes'
    if (retro || fo || qo || po || eo) {
      out.push({ session: basename(pyPath(d)), phase: front['phase'] ?? '', retro_done: !retro, findings_open: fo, questions_open: qo, proposals_open: po, emails_open: eo })
    }
  }
  return out
}

// prospects.csv rows at `held` (or the older `blocked_info`), oldest first, with the last held reason.
export function heldRows(): Dict[] {
  let buf: Buffer
  try { buf = readFileSync(C.PROSPECTS) } catch { return [] }
  const rows = readDicts(decodeStrict(buf)).rows
  const out: Dict[] = []
  for (const r of rows) {
    if (!C.HELD_STATUSES.has(pyStrip(pyStr(orEmpty(rget(r, 'status')))))) continue
    const notes = pyStr(orEmpty(rget(r, 'notes')))
    const why = [...notes.matchAll(/held: ([^|]+)/gu)].map((m) => m[1])
    out.push({
      id: rget(r, 'id', ''), company: rget(r, 'company', ''), role: rget(r, 'role', ''), match: rget(r, 'match', ''),
      status: rget(r, 'status', ''), reason: pyStrip(why.length ? why[why.length - 1] : notes.split(' | ').at(-1)!),
    })
  }
  return out
}

// ------------------------------------------------------------------ command line

const TOP_HELP = "usage: engine.ts findings [-h] {fold,list,pending,question-tick,proposal-set,age,ours-old} ...\n\nFold the findings workers leave in a session's notes.md, and report what is still open.\n\nA finding is one `### F-<n> · <kind> · <stage> · <row id or -> · <state>` entry under\n`## Findings` in a session's notes.md. The heading token is the state. The JSON comment under it\nis the machine copy. The format and the fold rules are in the findings section of contracts.md.\n\n    fold [--session S]              act on every open finding in one session, by kind\n    list [--open] [--kind K] [--top N] [--session S]\n                                    findings across sessions, or in one; --kind keyword_gap sums the\n                                    `## Keyword gaps` lines across sessions instead; --top N keeps the first N rows\n    pending                         sessions with retro_done: no, or open findings, questions\n                                    or proposals, then the held rows, the keyword gap counts, repeated findings\n                                    and what is stuck. `engine.ts retro` runs this one\n    question-tick [--session S] Q-<n> [--note TEXT]\n                                    tick one question, and any open box with the same text in another session\n    proposal-set [--session S] PR-<n> applied|declined\n                                    set the state of one proposal\n    age                             tick open questions in sessions older than budgets.held_max_age_days, with the\n                                    note `aged out`, except BLOCKED questions that hold STOPPED:\n    ours-old                        `ours` tags older than budgets.ours_review_days, as file, line and date\n\n`fold` exits 1 when any finding is malformed, after printing its JSON. `list` exits 1 when any\nrow has an error.\n\n`fold` acts by kind:\n\n    keyword_gap        adds or increments the `## Keyword gaps` line, then folded\n    career_page        appends to constants.COMPANY_CAREERS when new, then folded\n    ats_domain         appends to constants.ATS_DOMAINS when new, then folded\n    new_source         writes a `## Proposals` entry for instructions.md R9, then proposed\n    answer_gap         writes a line under the questions section (constants.QUESTIONS_SECTION), then asked\n    blocked            writes a `BLOCKED` line under the questions section, then asked\n    instruction_drift  stays open and is printed for the parent\n\nThe notes.md edit of one fold happens in a single read-modify-write under the session's `.lock`,\nso the state change and the line it caused never part. Other state changes go through\nsession.finding_set. Stdlib only.\n\npositional arguments:\n  {fold,list,pending,question-tick,proposal-set,age,ours-old}\n    fold               fold the open findings of one session\n    list               findings across sessions\n    pending            sessions with retro work waiting\n    question-tick      tick one question\n    proposal-set       set the state of one proposal\n    age                tick old open questions\n    ours-old           list old `ours` tags\n\noptions:\n  -h, --help           show this help message and exit\n"
const FOLD_HELP = "usage: engine.ts findings fold [-h] [--session SESSION]\n\noptions:\n  -h, --help         show this help message and exit\n  --session SESSION  session folder name or path; default the current one\n"
const LIST_HELP = "usage: engine.ts findings list [-h] [--session SESSION] [--open]\n                               [--kind {answer_gap,blocked,instruction_drift,keyword_gap,career_page,ats_domain,new_source}]\n                               [--top N] [--json]\n\noptions:\n  -h, --help            show this help message and exit\n  --session SESSION     only this session: a folder name or path (default\n                        JOBHUNT_SESSION when set, else every session)\n  --open                only findings in state open\n  --kind {answer_gap,blocked,instruction_drift,keyword_gap,career_page,ats_domain,new_source}\n  --top TOP             keep the first N rows\n  --json\n"
const PENDING_HELP = "usage: engine.ts findings pending [-h]\n\nSessions with retro work waiting: retro_done is not yes, or findings,\nquestions or proposals are open.\n\noptions:\n  -h, --help  show this help message and exit\n"
const TICK_HELP = "usage: engine.ts findings question-tick [-h] [--session SESSION] [--note NOTE] qid\n\nTick one question in a session, and any open box with the same text in another session.\n\noptions:\n  -h, --help         show this help message and exit\n  --session SESSION  session folder name or path; default the current one\n  --note NOTE        text put before the (from F-n) tail\n"
const PROPOSAL_HELP = "usage: engine.ts findings proposal-set [-h] [--session SESSION] pid {applied,declined}\n\nSet the state of one proposal under `## Proposals`.\n\noptions:\n  -h, --help         show this help message and exit\n  --session SESSION  session folder name or path; default the current one\n"
const AGE_HELP = "usage: engine.ts findings age [-h]\n\nTick open questions in sessions older than budgets.held_max_age_days, with the note `aged out`. A BLOCKED\nquestion that holds STOPPED: stays open.\n\noptions:\n  -h, --help  show this help message and exit\n"
const OURS_HELP = "usage: engine.ts findings ours-old [-h]\n\nList `ours` tags older than budgets.ours_review_days in process/, .claude/agents, .claude/skills and the profile's\nmarkdown, as file, line and date. It never prints the line.\n\noptions:\n  -h, --help  show this help message and exit\n"
const RETRO_HELP = "usage: engine.ts retro [-h]\n\nSessions with retro work waiting: retro_done is not yes, or findings,\nquestions or proposals are open.\n\noptions:\n  -h, --help  show this help message and exit\n"
const usageOf = (help: string): string => help.split('\n\n')[0] + '\n'
const TOP_USAGE = usageOf(TOP_HELP)

const CMDS = ['fold', 'list', 'pending', 'question-tick', 'proposal-set', 'age', 'ours-old']

class Usage extends Error {
  usage: string
  prog: string
  constructor(usage: string, prog: string, msg: string) { super(msg); this.usage = usage; this.prog = prog }
}
class Help extends Error { text: string; constructor(text: string) { super('help'); this.text = text } }

// argparse sees a token starting with '-' as an option unless it is a negative number or has a space.
const isFlag = (t: string): boolean => t.length > 1 && t.startsWith('-') && !NEGATIVE_NUMBER.test(t) && !t.includes(' ')

interface Opts { cmd: string; session: string | null; open: boolean; kind: string | null; json: boolean; top: number | null; note: string; args: string[] }

// The options of one subcommand. kind: 'flag' takes no value, 'value' takes one.
function parseSub(cmd: string, argv: string[], help: string, longs: Record<string, 'flag' | 'value'>, a: Opts): string[] {
  const usage = usageOf(help)
  const prog = `engine.ts findings ${cmd}`
  const names = ['--help', ...Object.keys(longs)]
  const extras: string[] = []
  let onlyPos = false
  let i = 0
  while (i < argv.length) {
    const t = argv[i]
    if (onlyPos || !isFlag(t)) { extras.push(t); i += 1; continue }
    if (t === '--') { extras.push(t); onlyPos = true; i += 1; continue }
    if (t === '-h') throw new Help(help)
    if (!t.startsWith('--')) { extras.push(t); i += 1; continue }
    let name = t
    let inline: string | null = null
    const eq = t.indexOf('=')
    if (eq >= 0) { name = t.slice(0, eq); inline = t.slice(eq + 1) }
    if (!names.includes(name)) {
      const hits = names.filter((l) => l.startsWith(name))
      if (hits.length > 1) throw new Usage(usage, prog, `ambiguous option: ${name} could match ${hits.join(', ')}`)
      if (hits.length === 0) { extras.push(t); i += 1; continue }
      name = hits[0]
    }
    i += 1
    if (name === '--help') throw new Help(help)
    if (longs[name] === 'flag') {
      if (inline !== null) throw new Usage(usage, prog, `argument ${name}: ignored explicit argument ${repr(inline)}`)
      if (name === '--open') a.open = true
      else a.json = true
      continue
    }
    let value: string
    if (inline !== null) value = inline
    else if (i < argv.length && !isFlag(argv[i])) value = argv[i++]
    else throw new Usage(usage, prog, `argument ${name}: expected one argument`)
    if (name === '--kind' && !(C.FINDING_KINDS as readonly string[]).includes(value)) {
      throw new Usage(usage, prog, `argument --kind: invalid choice: ${repr(value)} (choose from ${C.FINDING_KINDS.join(', ')})`)
    }
    if (name === '--session') a.session = value
    else if (name === '--note') a.note = value
    else if (name === '--top') {
      if (!/^\p{Nd}+$/u.test(value) || pyInt(value) < 1) throw new Usage(usage, prog, `argument --top: invalid positive int value: ${repr(value)}`)
      a.top = pyInt(value)
    } else a.kind = value
  }
  return extras
}

function parseArgs(argv: string[], viaRetro: boolean): Opts {
  const a: Opts = { cmd: '', session: null, open: false, kind: null, json: false, top: null, note: '', args: [] }
  const extras: string[] = []
  let i = 0
  let onlyPos = false
  for (; i < argv.length; i++) {
    const t = argv[i]
    if (onlyPos || !isFlag(t)) break
    if (t === '--') { onlyPos = true; continue }
    const name = t.split('=')[0]
    if (t === '-h' || (name.length > 2 && '--help'.startsWith(name))) throw new Help(TOP_HELP)
    extras.push(t)
  }
  if (i >= argv.length) throw new Usage(TOP_USAGE, 'engine.ts findings', 'the following arguments are required: cmd')
  const cmd = argv[i]
  if (!CMDS.includes(cmd)) {
    throw new Usage(TOP_USAGE, 'engine.ts findings', `argument cmd: invalid choice: ${repr(cmd)} (choose from ${CMDS.map((c) => repr(c)).join(', ')})`)
  }
  a.cmd = cmd
  const rest = argv.slice(i + 1)
  if (cmd === 'fold') extras.push(...parseSub(cmd, rest, FOLD_HELP, { '--session': 'value' }, a))
  else if (cmd === 'list') {
    extras.push(...parseSub(cmd, rest, LIST_HELP, { '--session': 'value', '--open': 'flag', '--kind': 'value', '--top': 'value', '--json': 'flag' }, a))
  } else if (cmd === 'question-tick') a.args = parseSub(cmd, rest, TICK_HELP, { '--session': 'value', '--note': 'value' }, a)
  else if (cmd === 'proposal-set') a.args = parseSub(cmd, rest, PROPOSAL_HELP, { '--session': 'value' }, a)
  else extras.push(...parseSub(cmd, rest, cmd === 'age' ? AGE_HELP : cmd === 'ours-old' ? OURS_HELP : viaRetro ? RETRO_HELP : PENDING_HELP, {}, a))
  const want = cmd === 'question-tick' ? 1 : cmd === 'proposal-set' ? 2 : 0
  if (a.args.length !== want && want) {
    throw new Usage(usageOf(cmd === 'question-tick' ? TICK_HELP : PROPOSAL_HELP), `engine.ts findings ${cmd}`,
      `the following arguments are required: ${cmd === 'question-tick' ? 'qid' : 'pid, state'}`)
  }
  if (cmd === 'question-tick' && !/^Q-\p{Nd}+$/u.test(a.args[0])) {
    throw new Usage(usageOf(TICK_HELP), 'engine.ts findings question-tick', `qid must look like Q-3, not ${repr(a.args[0])}`)
  }
  if (cmd === 'proposal-set' && (!/^PR-\p{Nd}+$/u.test(a.args[0]) || !['applied', 'declined'].includes(a.args[1]))) {
    throw new Usage(usageOf(PROPOSAL_HELP), 'engine.ts findings proposal-set', 'needs PR-<n> and applied or declined')
  }
  if (extras.length) throw new Usage(TOP_USAGE, 'engine.ts findings', `unrecognized arguments: ${extras.join(' ')}`)
  return a
}

export function main(argv: string[], out: Out = (s) => { process.stdout.write(s) }): number {
  // `engine.ts retro` calls main(['pending', ...]); its usage should read as `engine.ts retro`.
  const viaRetro = process.argv.slice(2, 3).length === 1 && process.argv[2] === 'retro'
  let a: Opts
  try {
    a = parseArgs(argv, viaRetro)
  } catch (e) {
    if (e instanceof Help) { out(e.text); return 0 }
    if (e instanceof Usage) {
      process.stderr.write(`${e.usage}${e.prog}: error: ${e.message}\n`)
      return 2
    }
    throw e
  }

  if (a.cmd === 'fold') {
    const res = fold(a.session)
    for (const m of res['malformed']) process.stderr.write(`MALFORMED FINDING ${m.id}: ${m.error}\n`)
    out(pyJson(res, { indent: 2, ensureAscii: false }) + '\n')
    return res['malformed'].length ? 1 : 0
  }
  if (a.cmd === 'question-tick') {
    for (const [s, q] of questionTick(a.session, a.args[0], a.note)) out(`ticked ${q} in ${s}\n`)
    return 0
  }
  if (a.cmd === 'proposal-set') {
    proposalSet(a.session, a.args[0], a.args[1])
    out(`${a.args[0]} is ${a.args[1]}\n`)
    return 0
  }
  if (a.cmd === 'age') {
    const done = age()
    for (const [s, n] of done) out(`aged out ${n} question(s) in ${s}\n`)
    out(`${done.reduce((n, [, k]) => n + k, 0)} question(s) aged out\n`)
    return 0
  }
  if (a.cmd === 'ours-old') {
    for (const t of oursOld()) out(`${t.file}:${t.line} ${t.date}\n`)
    return 0
  }
  if (a.cmd === 'list') {
    const rows = list(a.open, a.kind, a.session || pyStrip(process.env['JOBHUNT_SESSION'] ?? '') || null).slice(0, a.top ?? undefined)
    if (a.json) out(pyJson(rows, { indent: 2, ensureAscii: false }) + '\n')
    else if (a.kind === 'keyword_gap') {
      for (const r of rows) {
        out(`${rjust(pyStr(r['count']), 3)}  ${ljust(r['keyword'], 32)} in portfolio: ${ljust(r['in_portfolio'], 3)}  ${new Set(r['sessions']).size} session(s)\n`)
      }
      out(`${rows.length} keyword(s)\n`)
    } else {
      for (const r of rows) {
        out(`${r['session']}  ${ljust(r['id'], 6)} ${ljust(r['kind'], 18)} ${ljust(r['stage'], 8)} ${ljust(r['row'], 22)} ${ljust(r['state'], 9)} ${r['summary'] || r['error']}\n`)
      }
      out(`${rows.length} finding(s)\n`)
    }
    return rows.some((r) => r['error']) ? 1 : 0
  }
  const rows = pending()
  for (const r of rows) {
    out(`${r['session']}  phase ${ljust(pyStr(pyTruthy(r['phase']) ? r['phase'] : '-'), 18)} retro_done ${ljust(r['retro_done'] ? 'yes' : 'no', 3)} findings ${r['findings_open']}  questions ${r['questions_open']}  proposals ${r['proposals_open']}  emails ${r['emails_open']}\n`)
  }
  out(`${rows.length} session(s) with retro work\n`)
  const held = heldRows()
  for (const h of held) {
    out(`held  ${ljust(pyStr(h['id']), 22)} match ${ljust(pyStr(pyTruthy(h['match']) ? h['match'] : '-'), 3)} ${ljust(cut(h['company'], 22), 22)} ${cut(h['role'], 40)}  -- ${cut(h['reason'], 120)}\n`)
  }
  out(`${held.length} held row(s): submit (\`ingest release\`), drop (\`ingest skip\`) or fix, then release\n`)
  for (const ln of stuckItems()) out(`stuck  ${ln}\n`)
  for (const r of repeats()) out(`Repeats: ${r.count} times in ${r.sessions} sessions: ${cut(r.summary, 100)}\n`)
  out(keywordLine() + '\n')
  return 0
}
