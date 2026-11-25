// One folder per application sent, so the candidate can open it when a company replies.
// The folder is built from files the hunt already keeps: the prospects row, the extract, triage and apply
// stage JSON, the role file, the session's Send list entry and its log. The full JD text comes from
// `constants.ROLES/<id>.jd.md`. Nothing here changes a ledger or a session. The folder and index keys are in
// section 8 of process/contracts.md.
// `file` is idempotent. It never touches text outside the generated block, never replaces a resume copy already
// in the folder (the copy is the one that was sent), and never changes a `status` the candidate has set.
// `session tick --returned a-<id>` calls `file` for a row whose apply outcome is `applied`.
// Degraded mode files a row with no applied stage file, as one sent by hand or filed late: it takes what the ledger, the role
// file and the other sessions still hold, never invents a file, and says in notes.md what is missing. `backfill` and
// `ingest sent` use it; `file` stays strict.
//
//     node process/engine.ts application file <id> [--session S]
//     node process/engine.ts application list
//     node process/engine.ts application backfill [--dry-run]
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, utimesSync } from 'node:fs'
import { basename, isAbsolute, join } from 'node:path'
import * as C from '../constants.ts'
import { readDicts, type CsvRow } from '../lib/csv.ts'
import {
  byKey, cut, decodeStrict, isoSeconds, PY_WS, pyInt, pyJson, pyLstrip, PyExc, pyPath, pyRstrip, pyStr, pyStrip, pyTruthy,
  repr, PYFLOAT,
} from '../lib/py.ts'
import { jsonLoads } from '../lib/pyjson.ts'
import { identify } from './dedupe.ts'
import { readText, withLock, writeAtomic, type Out } from './io.ts'
import * as S from './session.ts'

type Dict = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
type Row = CsvRow

const WS = `[${PY_WS}]`
const LOCK = '.lock'
const NO_JD = 'The full JD text was not stored for this role and could not be fetched. ' +
  'Paste it here, and `application file` will keep it.'
const WORD = '[\\p{L}\\p{N}_]'
const FOLLOW_UP = new RegExp('regist|portal|create an account|account (is )?(required|needed)|before (an |the )?interview' +
  `|(?<!${WORD})EPCN(?!${WORD})|follow[- ]?up|assessment|test link|background check`, 'iu')
const SENT_FILE_WORDS = ['cover-letter', 'message']

// A filing could not be completed. The message says why, in one line.
export class FilingError extends Error {}

// ------------------------------------------------------------------ small helpers

// x or ''
const orEmpty = (v: unknown): unknown => (pyTruthy(v) ? v : '')
// a or b or c or '': the first truthy value, else ''. A csv cell that is missing is None.
const pick = (...vs: unknown[]): unknown => { for (const v of vs) if (pyTruthy(v)) return v; return '' }
// dict.get(k) on a csv row: a short row holds None for its missing keys.
const rget = (r: Row, k: string): string | null => (r[k] === undefined ? null : r[k]!)
// '%-Ns' pads by code points.
const ljust = (s: string, n: number): string => s + ' '.repeat(Math.max(0, n - Array.from(s).length))
const isFile = (p: string): boolean => { try { return statSync(p).isFile() } catch { return false } }
const isDir = (p: string): boolean => { try { return statSync(p).isDirectory() } catch { return false } }
const pySplit = (s: string): string[] => {
  const t = pyStrip(s)
  return t === '' ? [] : t.split(new RegExp(`${WS}+`, 'u'))
}

// Path.read_text(encoding='utf-8'), with '' for any OSError.
function read(path: string): string {
  try { return readText(path) } catch (e) {
    if (e instanceof PyExc) throw e
    return ''
  }
}

function json(path: string): Dict | null {
  let data: unknown
  try { data = jsonLoads(read(path)) } catch (e) {
    if (e instanceof PyExc) return null
    throw e
  }
  return typeof data === 'object' && data !== null && !Array.isArray(data) && !(PYFLOAT in data) ? data as Dict : null
}

function csv(path: string): Row[] {
  if (!isFile(path)) return []
  return readDicts(decodeStrict(readFileSync(path))).rows
}

function cell(text: unknown): string {
  return pySplit(pyStr(orEmpty(text))).join(' ').replaceAll('|', '\\|')
}

function oneLine(text: unknown): string {
  return pySplit(pyStr(orEmpty(text))).join(' ')
}

export function slug(text: unknown): string {
  const folded = pyStr(orEmpty(text)).normalize('NFKD').replace(/[^\x00-\x7f]/gu, '')
  return pyStrip(folded.toLowerCase().replace(/[^a-z0-9]+/gu, '-'), '-')
}

// Shorten a slug to `limit` characters, at a hyphen when one falls in the last half.
function cutSlug(text: string, limit: number): string {
  if (text.length <= limit) return text
  const head = text.slice(0, limit)
  const at = head.lastIndexOf('-')
  return pyStrip(at >= Math.floor(limit / 2) ? head.slice(0, at) : head, '-')
}

// <date>-<company>-<role>, held under APPLICATION_FOLDER_MAX characters.
export function folderName(appliedDate: string, company: string, role: string): string {
  const room = C.APPLICATION_FOLDER_MAX - Array.from(appliedDate).length - 2
  const c = cutSlug(slug(company), Math.min(22, Math.floor(room / 2))) || 'company'
  const r = cutSlug(slug(role), room - c.length) || 'role'
  return `${appliedDate}-${c}-${r}`
}

function locked<T>(fn: () => T): T {
  mkdirSync(C.APPLICATIONS, { recursive: true })
  return withLock(join(C.APPLICATIONS, LOCK), fn)
}

export function loadIndex(): Dict[] {
  if (!isFile(C.APPLICATIONS_INDEX)) return []
  let data: unknown
  try { data = jsonLoads(read(C.APPLICATIONS_INDEX)) } catch (e) {
    if (e instanceof PyExc) throw new FilingError(`${C.APPLICATIONS_INDEX} is not valid JSON: ${e.message}`)
    throw e
  }
  if (!Array.isArray(data)) throw new FilingError(`${C.APPLICATIONS_INDEX} must hold a JSON array`)
  return data as Dict[]
}

export function saveIndex(entriesIn: Dict[]): void {
  const entries = [...entriesIn].sort(byKey((e: Dict) => [pyStr(orEmpty(e['applied_date'])), pyStr(orEmpty(e['id']))]))
  const ordered = entries.map((e) => Object.fromEntries(C.APPLICATION_KEYS.map((k) => [k, e[k] ?? null])))
  writeAtomic(C.APPLICATIONS_INDEX, pyJson(ordered, { indent: 2, ensureAscii: false }) + '\n')
}

// The ids of the applications that already have a folder.
export function filedIds(): Set<string> {
  return new Set(loadIndex().map((e) => pyStr(e['id'])))
}

// Set one application's status in index.json. Returns false when the index has no entry for it yet.
export function setApplicationStatus(rid: string, word: string): boolean {
  if (!(C.APPLICATION_STATUSES as readonly string[]).includes(word)) throw new FilingError(`${repr(word)} is not an application status`)
  return locked(() => {
    const index = loadIndex()
    const entry = index.find((e) => e['id'] === rid)
    if (entry === undefined) return false
    entry['status'] = word
    entry['last_update'] = isoSeconds()
    saveIndex(index)
    return true
  })
}

// ------------------------------------------------------------------ what the hunt kept

// Every stage JSON for `rid`, pending or settled, oldest first, as (path, data).
export function stageFiles(d: string, stage: string, rid: string): [string, Dict][] {
  const base = join(d, C.STAGE_DIR, stage)
  const found: [string, Dict, number][] = []
  for (const folder of [base, join(base, 'done')]) {
    if (!isDir(folder)) continue
    for (const name of readdirSync(folder)) {
      if (!name.endsWith('.json')) continue
      const f = join(folder, name)
      let mtime: number
      try {
        if (!statSync(f).isFile()) continue
        mtime = statSync(f).mtimeMs
      } catch { continue }
      const data = json(f)
      if (data && pyTruthy(data) && pyStr(data['id']) === rid) found.push([f, data, mtime])
    }
  }
  found.sort(byKey((x: [string, Dict, number]) => [x[2], basename(x[0])]))
  return found.map((x) => [x[0], x[1]])
}

// The session folder that holds the applied stage file for `rid`.
export function findSession(rid: string, arg: string | null = null): string {
  if (arg) {
    const d = S.asSession(arg)
    if (d === null) throw new FilingError(`no session at ${arg}`)
    return d
  }
  const first = S.resolve(null, false)
  for (const d of [...(first ? [first] : []), ...[...S.allSessions()].reverse()]) {
    if (stageFiles(d, 'apply', rid).some((x) => x[1]['outcome'] === 'applied')) return d
  }
  throw new FilingError(`no session has an applied stage file for ${rid}`)
}

// The role file's `## ` sections as {name: [lines]}, blank edges stripped, fences respected.
function roleSections(text: string): Map<string, string[]> {
  const out = new Map<string, string[]>()
  let cur: string | null = null
  let fenced = false
  for (const ln of text.split('\n')) {
    if (pyLstrip(ln).startsWith('```')) fenced = !fenced
    if (!fenced && ln.startsWith('## ')) {
      cur = pyStrip(ln.slice(3))
      out.set(cur, [])
    } else if (cur !== null) out.get(cur)!.push(ln)
  }
  for (const lines of out.values()) {
    while (lines.length && !pyStrip(lines[0])) lines.shift()
    while (lines.length && !pyStrip(lines[lines.length - 1])) lines.pop()
  }
  return out
}

// The body lines of the `## Send list` entry for an application on `rid`.
function sendBody(notes: S.Notes, rid: string): string[] {
  const lines = notes.lines('Send list')
  const entries = S.sendEntries(lines)
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    if (e.id !== rid || e.kind !== 'application') continue
    const end = i + 1 < entries.length ? entries[i + 1].line : lines.length
    const body = lines.slice(e.line + 2, end).map((ln) => (ln.startsWith('\\#') ? ln.slice(1) : ln))
    while (body.length && !pyStrip(body[0])) body.shift()
    while (body.length && !pyStrip(body[body.length - 1])) body.pop()
    return body
  }
  return []
}

function companyWords(company: string): Set<string> {
  const words = new Set((company.toLowerCase().match(/[a-z0-9]+/gu) ?? []).filter((w) => w.length >= 4))
  const caps = (company.match(/[A-Za-z0-9]+/gu) ?? []).filter((w) => w).map((w) => w[0])
  if (caps.length >= 3) words.add(caps.join('').toLowerCase())
  return words
}

// Session log lines that record the go-ahead, an older approval, or a change the candidate made.
function approvalLines(notes: S.Notes, rid: string, company: string): string[] {
  const words = companyWords(company)
  const out: string[] = []
  for (const ln of notes.lines('Log')) {
    const low = ln.toLowerCase()
    const at = low.indexOf('ist  ')
    const body = at < 0 ? low : low.slice(at + 5)
    if (!/approval|candidate|go-ahead/u.test(low) || pyLstrip(low, '- ').startsWith('retro')) continue
    if (low.includes(rid.toLowerCase()) || body.startsWith('approval') || body.startsWith('go-ahead') ||
        [...words].some((w) => new RegExp(`(?<!${WORD})${w}(?!${WORD})`, 'u').test(low))) {
      out.push(pyStrip(pyLstrip(ln, '- ')))
    }
  }
  return out
}

function sentences(text: unknown): string[] {
  const flat = pySplit(pyStr(orEmpty(text))).join(' ')
  return flat.split(new RegExp(`(?<=[.!?])${WS}+`, 'u')).map((s) => pyStrip(s)).filter((s) => s)
}

// (label, sentence) pairs that mention a step still owed, such as a portal registration.
function followUps(sources: [string, unknown][]): [string, string][] {
  const seen = new Set<string>()
  const out: [string, string][] = []
  for (const [label, text] of sources) {
    for (let s of sentences(text)) {
      if (FOLLOW_UP.test(s)) {
        s = s.replace(new RegExp(`^(Note|Notes for the candidate)[.:]${WS}*`, 'u'), '')
        const key = pyStrip(s.toLowerCase().replace(new RegExp(`[^\\p{L}\\p{N}_]+`, 'gu'), ' '))
        if (!seen.has(key)) {
          seen.add(key)
          out.push([label, s])
        }
      }
    }
  }
  return out
}

function urls(lines: string[]): string[] {
  return lines.join('\n').match(new RegExp(`https?://[^${PY_WS})>\\]"]+`, 'gu')) ?? []
}

// ------------------------------------------------------------------ the pieces of one application

interface Gathered {
  session: string | null; apply: Dict; extract: Dict; triage: Dict; prospect: Row; ledger: Row; rolePath: string
  role: Map<string, string[]>; notes: S.Notes | null; send: string[]; jdPath: string
  degraded: boolean; applyFound: boolean
}

const allSessionsNewestFirst = (): string[] => [...S.allSessions()].reverse()

// The newest session that holds any stage file for `rid`, else the newest whose Send list names it, else null.
function locateSession(rid: string): string | null {
  const all = allSessionsNewestFirst()
  for (const d of all) if (['apply', 'triage', 'extract'].some((st) => stageFiles(d, st, rid).length)) return d
  return all.find((d) => sendBody(new S.Notes(d), rid).length) ?? null
}

// Stage files for `rid` from `first`, else from the newest session that has any: a row can be triaged in one hunt and sent in another.
function stageFilesNear(first: string | null, stage: string, rid: string): [string, Dict][] {
  for (const d of [...(first ? [first] : []), ...allSessionsNewestFirst()]) {
    const found = stageFiles(d, stage, rid)
    if (found.length) return found
  }
  return []
}

function sendNear(first: string | null, rid: string): string[] {
  for (const d of [...(first ? [first] : []), ...allSessionsNewestFirst()]) {
    const body = sendBody(new S.Notes(d), rid)
    if (body.length) return body
  }
  return []
}

// Everything the filer needs for `rid`. With `degraded`, a row with no applied stage file is worked from what remains.
function gather(rid: string, sessionArg: string | null = null, degraded = false): Gathered {
  let d: string | null = null
  let apply: Dict | null = null
  try {
    d = findSession(rid, sessionArg)
    const applied = stageFiles(d, 'apply', rid).filter((x) => x[1]['outcome'] === 'applied')
    if (!applied.length) throw new FilingError(`${rid} has no apply stage file with outcome applied in ${S.rel(d)}`)
    apply = applied[applied.length - 1][1]
  } catch (e) {
    if (!degraded || !(e instanceof FilingError)) throw e
    d = sessionArg ? S.asSession(sessionArg) : locateSession(rid)
  }
  const near = (stage: string): [string, Dict][] => (degraded ? stageFilesNear(d, stage, rid) : stageFiles(d!, stage, rid))
  const extractAll = near('extract')
  const triageAll = near('triage').map((x) => x[1]).filter((t) => t['decision'] === 'scored')
  const withResume = triageAll.filter((t) => pyTruthy(t['resume_file']))
  const pick = withResume.length ? withResume : triageAll.length ? triageAll : [{} as Dict]
  const triage = pick[pick.length - 1]
  const prospect = csv(C.PROSPECTS).find((r) => r['id'] === rid)
  if (prospect === undefined) throw new FilingError(`${rid} is not in ${basename(C.PROSPECTS)}`)
  const appliedRows = csv(C.APPLIED)
  let ledger = appliedRows.find((r) => (r['role_file'] ?? '').endsWith(`${rid}.md`))
  if (ledger === undefined && degraded) {          // a row recorded by hand has no role_file: find it by link
    const canon = identify(prospect['link'] ?? '')[2]
    if (canon) ledger = appliedRows.find((r) => r['link'] === canon)
  }
  const rolePath = join(C.ROLES, `${rid}.md`)
  const notes = d ? new S.Notes(d) : null
  return {
    session: d, apply: apply ?? {}, extract: extractAll.length ? extractAll[extractAll.length - 1][1] : {}, triage, prospect,
    ledger: ledger ?? {}, rolePath, role: roleSections(read(rolePath)), notes,
    send: degraded ? sendNear(d, rid) : sendBody(notes!, rid), jdPath: join(C.ROLES, `${rid}${C.JD_SUFFIX}`),
    degraded, applyFound: apply !== null,
  }
}

interface Facts {
  id: string; company: string; role: string; channel: string; source: string | null; link: string
  apply_url: string | null; applied_date: string; location: string; match: number | null; tailored: boolean
}

// int(x) for a value from a csv cell or a stage JSON file. Throws where int() raises.
function pyIntOf(v: unknown): number {
  if (typeof v === 'string') return pyInt(v)
  if (typeof v === 'number') return v
  if (v === true) return 1
  if (v === false) return 0
  if (typeof v === 'object' && v !== null && PYFLOAT in v) {
    const f = (v as { [PYFLOAT]: number })[PYFLOAT]
    if (!Number.isFinite(f)) throw new Error('cannot convert float to integer')
    return Math.trunc(f)
  }
  throw new TypeError(`int() argument must be a string or a real number`)
}

function facts(rid: string, g: Gathered): Facts {
  const p = g.prospect, led = g.ledger, ex = g.extract, ap = g.apply
  const company = pyStr(pick(led['company'], p['company']))
  const role = pyStr(pick(led['role'], p['role']))
  const channel = pyStr(pick(p['channel'], led['channel']))
  const appliedDate = pyStr(pick(ap['applied_date'], p['applied_date'], led['applied_date']))
  if (!appliedDate) throw new FilingError(`${rid} has no applied date`)
  let applyUrl = pyStrip(pyStr(pick(ex['apply_url'], p['apply_route'])))
  if (!applyUrl && (channel === 'external_ats' || channel === 'direct')) {
    for (const ln of g.send) {
      if (new RegExp(`^${WS}*Apply form:`, 'iu').test(ln) && urls([ln]).length) {
        applyUrl = urls([ln])[0]
        break
      }
    }
  }
  applyUrl = pyRstrip(applyUrl, '.,;')
  let applyOut: string | null = applyUrl || null
  if (applyOut && !applyOut.startsWith('http')) applyOut = null
  let where = pyStr(pick(p['location'], ex['location_wording']))
  const mode = pyStr(pick(p['work_mode'], ex['work_mode']))
  if (mode && mode !== 'unstated') where = where ? `${where} (${mode})` : mode
  let match: number | null
  try {
    match = pyIntOf(pyTruthy(p['match']) ? p['match'] : g.triage['match'])
  } catch { match = null }
  const variant = pyStrip(pyStr(pick(g.triage['resume_variant'], p['resume_variant'])))
  return {
    id: rid, company, role, channel, source: Object.hasOwn(p, 'source') ? rget(p, 'source') : '',
    link: pyStr(pick(p['link'], led['link'])), apply_url: applyOut, applied_date: appliedDate,
    // only rows before 21 Oct 2026 carry a built `<id>-<slug>` variant; fixed variants and `standard` are not tailored
    location: where, match, tailored: variant.startsWith(`${rid}-`),
  }
}

// Copy `src` into `folder` unless a file of that name is already there. Returns the file name or null.
// A dry run copies nothing and still names the file.
function copyIn(srcIn: string, folder: string, dryRun = false): string | null {
  let src = pyPath(srcIn)
  if (!isAbsolute(src)) src = join(C.REPO, src)
  if (!isFile(src)) return null
  const dest = join(folder, basename(src))
  if (!dryRun && !existsSync(dest)) {
    copyFileSync(src, dest)
    const st = statSync(src)
    utimesSync(dest, st.atimeMs / 1000, st.mtimeMs / 1000)
  }
  return basename(dest)
}

// The one PDF of a resume variant: a tailored variant sits in the artifacts folder, a fixed one in its profile folder.
function variantPdf(rid: string, variant: string): string | null {
  if (variant.startsWith(`${rid}-`)) {
    const tailored = join(C.ARTIFACTS, `${variant}.pdf`)
    return isFile(tailored) ? tailored : null
  }
  const dir = join(C.profileDir(), 'resume', variant)
  const pdfs = isDir(dir) ? readdirSync(dir).filter((n) => n.endsWith('.pdf')).sort() : []
  return pdfs.length === 1 ? join(dir, pdfs[0]) : null
}

// True when the file was last written no later than the end of `day`. A variant rebuilt since then is not the file that was sent.
function notNewerThan(path: string, day: string): boolean {
  const end = new Date(`${day}T23:59:59`).getTime()
  return Number.isFinite(end) && statSync(path).mtimeMs <= end
}

// Copy the resume and any cover letter or founder message into the folder. Returns [resume, extras, why the resume was not copied].
// In degraded mode the resume comes from the triage file or, failing that, the row's variant, and is copied only when it is
// no newer than the day the application went out. `stated` 2026-11-02 (the rule); the variant lookup is `ours`.
function sentFiles(rid: string, g: Gathered, folder: string, appliedDate: string, dryRun = false): [string | null, string[], string | null] {
  let resume: string | null = null
  let missing: string | null = null
  const rf = g.triage['resume_file']
  if (!g.degraded) {
    if (pyTruthy(rf)) {
      resume = copyIn(rf, folder, dryRun)
      if (resume === null) missing = `The file ${pyStr(rf)} was not found.`
    } else missing = 'The triage file names none.'
  } else {
    const variant = pyStrip(pyStr(pick(g.triage['resume_variant'], g.prospect['resume_variant'])))
    let src = pyTruthy(rf) ? pyPath(pyStr(rf)) : variant ? variantPdf(rid, variant) ?? '' : ''
    if (src && !isAbsolute(src)) src = join(C.REPO, src)
    if (!src || !isFile(src)) missing = variant
      ? `The variant was ${variant}, and no file for it could be found, so the file that was sent is not recoverable.`
      : 'No resume variant is recorded, so the file that was sent is not recoverable.'
    else if (!notNewerThan(src, appliedDate)) missing = `The variant was ${variant || basename(src)}, and it was rebuilt after ${appliedDate}, so the file that was sent is not recoverable.`
    else resume = copyIn(src, folder, dryRun)
  }
  const extras: string[] = []
  if (isDir(C.ARTIFACTS)) {
    const names = readdirSync(C.ARTIFACTS).filter((n) => n.startsWith(`${rid}-`) && n.endsWith('.md') && n.length >= rid.length + 4)
    names.sort(byKey((n: string) => n))
    for (const name of names) {
      if (SENT_FILE_WORDS.some((w) => name.includes(w))) {
        const got = copyIn(join(C.ARTIFACTS, name), folder, dryRun)
        if (got) extras.push(got)
      }
    }
  }
  return [resume, extras, missing]
}

// `full` is the stored JD text, `excerpt` is the passages the matcher quoted in the role file, `none` is the notice.
type JdKind = 'full' | 'excerpt' | 'none'
const EXCERPT_NOTE = 'The full JD text was not kept. These are the passages the matcher quoted from it.'

// Write jd.md and say what it holds. The text comes from roles/<id>.jd.md, then from a jd.md already in the folder
// (the candidate may have pasted the JD there), then from the role file's `## The JD in their words`.
function writeJd(g: Gathered, f: Facts, folder: string, dryRun = false): JdKind {
  let jd = pyStrip(read(g.jdPath).replace(new RegExp(`^${WS}*<!--[\\s\\S]*?-->${WS}*`, 'u'), ''))
  let kind: JdKind = jd ? 'full' : 'none'
  const path = join(folder, 'jd.md')
  if (!jd) {
    const old = read(path)
    const kept = old.includes('## Job description') ? pyStrip(old.slice(old.indexOf('## Job description') + '## Job description'.length)) : ''
    const quoted = pyStrip((g.role.get('The JD in their words') ?? []).join('\n'))
    if (kept && kept !== NO_JD) { jd = kept; kind = kept.startsWith(EXCERPT_NOTE) ? 'excerpt' : 'full' }
    else if (quoted) { jd = `${EXCERPT_NOTE}\n\n${quoted}`; kind = 'excerpt' }
    else jd = NO_JD
  }
  const rows: [string, string][] = [['Company', f.company], ['Role', f.role], ['Location', f.location], ['Link', f.link],
    ['Apply URL', f.apply_url || 'none, applied on LinkedIn']]
  const head = [`# ${oneLine(f.company)} - ${oneLine(f.role)}`, '', '| Field | Value |', '|---|---|']
  head.push(...rows.map(([k, v]) => `| ${k} | ${cell(v)} |`))
  if (!dryRun) writeAtomic(path, head.join('\n') + '\n\n## Job description\n\n' + jd + '\n')
  return kind
}

interface Recovery { recovered: string[]; missing: string[] }

// What a recovery-mode filing found and what it did not.
function recovery(g: Gathered, resume: string | null, jd: JdKind): Recovery {
  const recovered = ['ledger row']
  const missing: string[] = []
  const has = (ok: boolean, what: string): void => { (ok ? recovered : missing).push(what) }
  has(g.applyFound, 'apply record')
  has(Object.keys(g.triage).length > 0, 'triage scores')
  has(jd === 'full', jd === 'excerpt' ? 'full JD (only quoted passages kept)' : 'full JD')
  has(resume !== null, 'resume copy')
  has(g.send.length > 0, 'Send list entry')
  has(g.role.size > 0, 'role file')
  return { recovered, missing }
}

function block(rid: string, g: Gathered, f: Facts, resume: string | null, extras: string[], missing: string | null, jd: JdKind, rec: Recovery): string {
  const p = g.prospect, tri = g.triage, role = g.role, ap = g.apply
  const out: string[] = [C.GENERATED_START,
    `Generated by \`engine.ts application file ${rid}\`. Edits inside this block are overwritten, so write below it.`,
    '']
  if (g.degraded) {
    out.push(`Backfilled on ${isoSeconds().slice(0, 10)}, after the application went out, from the ledger and the files the hunt still holds.`,
      `Recovered: ${rec.recovered.join(', ')}. Missing: ${rec.missing.join(', ') || 'nothing'}.`, '')
  }

  out.push('### Scores', '')
  const get = (k: string): unknown => (Object.hasOwn(tri, k) ? tri[k] : Object.hasOwn(p, k) ? rget(p, k) : '?')
  const parts = Object.entries(C.MATCH_WEIGHTS).map(([k, cap]) => `${k.split('_')[0]} ${pyStr(get(k))}/${cap}`).join(', ')
  out.push(`Match ${f.match !== null ? f.match : '?'} (${parts}). Semantic ${pyStr(get('semantic'))}.`)
  const evidence = pyTruthy(tri['evidence']) ? tri['evidence'] : rget(p, 'evidence')
  if (pyTruthy(evidence)) out.push('', `Semantic evidence: ${pyStr(evidence)}`)

  const reason = oneLine(tri['reason'])
  out.push('', '### Triage reasoning', '', reason || 'The triage file gives no reason.')
  const breakdown = role.get('Score breakdown') ?? []
  if (breakdown.length) out.push('', '#### Scoring detail from the role file', '', ...breakdown)

  out.push('', '### What the JD asks for', '')
  out.push(...(role.get('What they clearly care about')?.length ? role.get('What they clearly care about')! : ['The role file lists none.']))
  out.push('', '### Where the candidate falls short', '')
  out.push(...(role.get('Missing keywords')?.length ? role.get('Missing keywords')! : ['The role file lists no missing keywords.']))
  const proof = role.get('Matching proof points') ?? []
  if (proof.length) out.push('', '### Proof points matched', '', ...proof)

  out.push('', '### Application as submitted', '')
  const hows: Record<string, string> = { easy_apply: 'LinkedIn Easy Apply', external_ats: 'the external form', direct: 'the direct form',
    waas_message: 'a Work at a Startup message' }
  const how = Object.hasOwn(hows, f.channel) ? hows[f.channel] : f.channel || 'unknown'
  out.push(`- Sent through ${how} on ${f.applied_date}.`)
  if (f.apply_url) out.push(`- Form: ${f.apply_url}`)
  if (resume) out.push(`- Resume sent: \`${resume}\` (${f.tailored ? 'tailored for this role' : 'a fixed resume variant'}), copied into this folder.`)
  else out.push(pyStrip(`- Resume sent: not copied. ${missing ?? ''}`))
  for (const name of extras) out.push(`- Also sent: \`${name}\``)
  if (jd === 'none') out.push('- The full JD text was not stored, so jd.md carries a notice in its place.')
  else if (jd === 'excerpt') out.push('- The full JD text was not stored, so jd.md holds the passages the matcher quoted from it.')

  out.push('', '### Form fields and screening answers, from the Send list entry', '')
  out.push(...(g.send.length ? g.send : ['The session has no Send list entry for this application.']))

  const changes: string[] = []
  if (pyTruthy(ap['notes'])) changes.push(`Submit run: ${oneLine(ap['notes'])}`)
  if (g.notes) changes.push(...approvalLines(g.notes, rid, f.company).map((ln) => `Session log: ${ln}`))
  out.push('', '### Changes made after that draft', '')
  out.push(...(changes.length ? changes.map((c) => `- ${c}`) : ['None recorded.']))

  const sources: [string, unknown][] = [['Send list', g.send.join(' ')], ['submit run', ap['notes']]]
  const notesFor = breakdown.filter((ln) => ln.startsWith('Notes for the candidate'))
  sources.push(['role file', notesFor.join(' ')])
  const follow = followUps(sources)
  out.push('', '### Follow-up still owed', '')
  out.push(...(follow.length ? follow.map(([label, s]) => `- ${s} (${label})`) : ['None recorded.']))
  out.push('', C.GENERATED_END)
  return out.join('\n')
}

function writeNotes(folder: string, f: Facts, newBlock: string): void {
  const path = join(folder, 'notes.md')
  const old = read(path)
  let text: string
  if (!old) {
    text = `# ${oneLine(f.company)} - ${oneLine(f.role)}\n\n${newBlock}\n\n## Replies\n\n## Prep roadmap\n`
  } else {
    const a = old.indexOf(C.GENERATED_START)
    const b = old.indexOf(C.GENERATED_END)
    if (a < 0 && b < 0) text = newBlock + '\n\n' + old
    else if (a < 0 || b < a) throw new FilingError(`${path} has a generated marker without its pair; fix the markers by hand`)
    else text = old.slice(0, a) + newBlock + old.slice(b + C.GENERATED_END.length)
  }
  writeAtomic(path, text)
}

// ------------------------------------------------------------------ the public entry points

export interface Filed {
  id: string; folder: string; new: boolean; jd_stored: boolean; resume: string | null
  degraded: boolean; recovered: string[]; missing: string[]
}

// Build or refresh the folder and index entry for one application. `degraded` works a row with no applied stage file from
// what the ledger and the other sessions hold. `dryRun` writes nothing and reports what would be recovered.
export function fileApplication(rid: string, session: string | null = null, mode: { degraded?: boolean; dryRun?: boolean } = {}): Filed {
  const dryRun = !!mode.dryRun
  const g = gather(rid, session, !!mode.degraded)
  const f = facts(rid, g)
  const run = <T>(fn: () => T): T => (dryRun ? fn() : locked(fn))
  return run(() => {
    const index = loadIndex()
    const old = index.find((e) => e['id'] === rid)
    let name: string
    if (old && pyTruthy(old['folder'])) name = old['folder']
    else {
      name = folderName(f.applied_date, f.company, f.role)
      const taken = new Set(index.map((e) => e['folder']))
      const base = name
      let n = 2
      while (taken.has(name)) {
        name = `${base}-${n}`
        n += 1
      }
    }
    const folder = join(C.APPLICATIONS, name)
    if (!dryRun) mkdirSync(folder, { recursive: true })
    const jd = writeJd(g, f, folder, dryRun)
    const [resume, extras, missing] = sentFiles(rid, g, folder, f.applied_date, dryRun)
    const rec = recovery(g, resume, jd)
    if (!dryRun) {
      writeNotes(folder, f, block(rid, g, f, resume, extras, missing, jd, rec))
      const replied = pyStr(g.prospect['response'])             // a reply recorded before the folder existed still shows in its status
      const entry: Dict = {
        id: rid, applied_date: f.applied_date, company: f.company, role: f.role, channel: f.channel, source: f.source,
        match: f.match, link: f.link, apply_url: f.apply_url, folder: name, resume, resume_tailored: f.tailored,
        status: (old && pyTruthy(old['status']) ? old['status'] : null) ||
                ((C.APPLICATION_STATUSES as readonly string[]).includes(replied) ? replied : C.APPLICATION_STATUSES[0]),
        last_update: isoSeconds(),
      }
      saveIndex([...index.filter((e) => e['id'] !== rid), entry])
    }
    return { id: rid, folder: name, new: old === undefined, jd_stored: jd === 'full', resume, degraded: g.degraded, ...rec }
  })
}

// The prospects id of an applied.csv row: from its role file name, else from the one prospects row with its link.
function appliedId(a: Row, prospects: Row[]): string | null {
  const rf = pyStrip(a['role_file'] ?? '')
  if (rf.endsWith('.md')) return basename(rf).slice(0, -3)
  const link = pyStrip(a['link'] ?? '')
  if (!link) return null
  const same = prospects.filter((p) => identify(p['link'] ?? '')[2] === link)
  return (same.find((p) => p['status'] === 'applied') ?? same[0])?.['id'] ?? null
}

// File every applied.csv row whose id is not in the index, in degraded mode. One line per row says what was recovered and
// what is missing. A row that cannot be filed is named and does not stop the rest. Returns 1 when any row could not be filed.
export function backfill(dryRun: boolean, out: Out): number {
  const done = filedIds()
  const prospects = csv(C.PROSPECTS)
  let filed = 0
  let failed = 0
  for (const a of csv(C.APPLIED)) {
    const rid = appliedId(a, prospects)
    const who = `${pyStr(a['company'])} / ${pyStr(a['role'])}`
    if (rid === null) {
      out(`NOT FILED  ${who}: applied.csv names no role file and no prospects row has its link\n`)
      failed += 1
      continue
    }
    if (done.has(rid)) continue
    try {
      const res = fileApplication(rid, null, { degraded: true, dryRun })
      out(`${rid}  ${who}  recovered: ${res.recovered.join(', ')}; missing: ${res.missing.join(', ') || 'nothing'}\n`)
      filed += 1
    } catch (e) {
      if (!(e instanceof FilingError)) throw e
      out(`NOT FILED  ${rid}  ${who}: ${e.message}\n`)
      failed += 1
    }
  }
  out(`backfill: ${filed} application(s) ${dryRun ? 'would be filed (dry run, nothing written)' : 'filed'}, ${failed} not filed\n`)
  return failed ? 1 : 0
}

export function table(entries: Dict[]): string {
  if (!entries.length) return 'no applications filed'
  const head = ['id', 'applied', 'company', 'role', 'channel', 'match', 'resume', 'status']
  const rows: string[][] = [head]
  for (const e of entries) {
    const resume = !pyTruthy(e['resume']) ? 'none' : pyTruthy(e['resume_tailored']) ? 'tailored' : 'standard'
    rows.push([pyStr(e['id']), pyStr(e['applied_date']), cut(oneLine(e['company']), 26), cut(oneLine(e['role']), 40),
      pyStr(e['channel']), e['match'] === null || e['match'] === undefined ? '' : pyStr(e['match']), resume, pyStr(e['status'])])
  }
  const widths = head.map((_, i) => Math.max(...rows.map((r) => Array.from(r[i]).length)))
  return rows.map((r) => pyRstrip(r.map((c, i) => ljust(c, widths[i])).join('  '))).join('\n')
}

// ------------------------------------------------------------------ the command line

const TOP_HELP = "usage: engine.ts application [-h] {file,list,backfill} ...\n\nOne folder per application sent, so the candidate can open it when a company replies.\n\n    my-applications/index.json                    one object per application, oldest first\n    my-applications/<date>-<company>-<role>/\n        jd.md                                     the listing facts and the full JD text\n        <resume file>                             a copy of the resume that was sent\n        <cover letter or founder message>         a copy of each, when one was sent\n        notes.md                                  a generated block, then the candidate's own sections\n\nThe folder is built from files the hunt already keeps: the prospects row, the extract, triage and\napply stage JSON, the role file, the session's Send list entry and its log. The full JD text is read\nfrom `constants.ROLES/<id>.jd.md`, which the matcher writes. Nothing here changes a ledger or a\nsession. `file` is idempotent. A re-run rebuilds jd.md and the generated block in notes.md, copies a\nfile that is not in the folder yet, and updates the index entry. It never touches text outside the\ngenerated block, it never replaces a resume copy already in the folder (the copy is the one that\nwas sent), and it never changes a `status` the candidate has set.\n\n`session tick --returned a-<id>` (or `x-<id>` from an older session) calls `file` for a row whose\napply outcome is `applied`. Section 8 of\nprocess/contracts.md holds the folder and the index keys.\n\nUsage (through engine.ts)\n    application file <id> [--session S]       build or refresh one application's folder and index entry\n    application list                          print the index as a short table\n    application backfill [--dry-run]          file every applied.csv row that has no folder, in degraded mode\n\n`file` needs an applied stage file. `backfill` and `ingest sent` file in degraded mode instead: with no applied stage file they take what the ledger, the\nrole file and the other sessions hold. Degraded mode never invents a file. A JD that was not kept becomes the quoted passages in the role file, or the NO_JD marker. A resume copy is\nmade only when the file is no newer than the end of `applied_date`; otherwise notes.md names the variant and says the file that was sent is\nnot recoverable. notes.md says the folder was backfilled and what is missing. `backfill` prints one line per row on what was recovered and\nwhat is missing.\n\npositional arguments:\n  {file,list,backfill}\n    file       build or refresh the folder and index entry for one applied\n               role\n    list       print the index as a short table\n    backfill   file every applied row that has no folder\n\noptions:\n  -h, --help   show this help message and exit\n"
const FILE_HELP = "usage: engine.ts application file [-h] [--session SESSION] id\n\npositional arguments:\n  id\n\noptions:\n  -h, --help         show this help message and exit\n  --session SESSION  the session folder that sent it; default is found from\n                     the stage files\n"
const LIST_HELP = "usage: engine.ts application list [-h]\n\noptions:\n  -h, --help  show this help message and exit\n"
const BACKFILL_HELP = "usage: engine.ts application backfill [-h] [--dry-run]\n\noptions:\n  -h, --help  show this help message and exit\n  --dry-run   print what would be recovered for each row and write nothing\n"
const usageOf = (help: string): string => help.split('\n\n')[0] + '\n'
const TOP_USAGE = usageOf(TOP_HELP)

class Usage extends Error {
  usage: string
  prog: string
  constructor(usage: string, prog: string, msg: string) { super(msg); this.usage = usage; this.prog = prog }
}
class Help extends Error { text: string; constructor(text: string) { super('help'); this.text = text } }

const NEGATIVE_NUMBER = /^-\p{Nd}+$|^-\p{Nd}*\.\p{Nd}+$/u
// argparse sees a token starting with '-' as an option unless it is a negative number or has a space.
const isFlag = (t: string): boolean => t.length > 1 && t.startsWith('-') && !NEGATIVE_NUMBER.test(t) && !t.includes(' ')

interface Opts { cmd: string; id: string | null; session: string | null; dryRun: boolean }

// The arguments of one subcommand. Returns the tokens it does not recognise.
function parseSub(cmd: string, argv: string[], help: string, a: Opts): string[] {
  const usage = usageOf(help)
  const prog = `engine.ts application ${cmd}`
  const names = cmd === 'file' ? ['--help', '--session'] : cmd === 'backfill' ? ['--help', '--dry-run'] : ['--help']
  const extras: string[] = []
  const positional: string[] = []
  let onlyPos = false
  let i = 0
  while (i < argv.length) {
    const t = argv[i]
    if (onlyPos || !isFlag(t)) { positional.push(t); i += 1; continue }
    if (t === '--') { onlyPos = true; i += 1; continue }
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
    if (name === '--help') {
      if (inline !== null) throw new Usage(usage, prog, `argument -h/--help: ignored explicit argument ${repr(inline)}`)
      throw new Help(help)
    }
    if (name === '--dry-run') {
      if (inline !== null) throw new Usage(usage, prog, `argument --dry-run: ignored explicit argument ${repr(inline)}`)
      a.dryRun = true
      continue
    }
    let value: string
    if (inline !== null) value = inline
    else if (i < argv.length && !isFlag(argv[i])) value = argv[i++]
    else throw new Usage(usage, prog, `argument --session: expected one argument`)
    a.session = value
  }
  if (cmd === 'file') {
    if (!positional.length) throw new Usage(usage, prog, 'the following arguments are required: id')
    a.id = positional[0]
    extras.push(...positional.slice(1))
  } else extras.push(...positional)
  return extras
}

function parseArgs(argv: string[]): Opts {
  const a: Opts = { cmd: '', id: null, session: null, dryRun: false }
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
  if (i >= argv.length) throw new Usage(TOP_USAGE, 'engine.ts application', 'the following arguments are required: cmd')
  const cmd = argv[i]
  if (cmd !== 'file' && cmd !== 'list' && cmd !== 'backfill') {
    throw new Usage(TOP_USAGE, 'engine.ts application', `argument cmd: invalid choice: ${repr(cmd)} (choose from file, list, backfill)`)
  }
  a.cmd = cmd
  extras.push(...parseSub(cmd, argv.slice(i + 1), cmd === 'file' ? FILE_HELP : cmd === 'backfill' ? BACKFILL_HELP : LIST_HELP, a))
  if (extras.length) throw new Usage(TOP_USAGE, 'engine.ts application', `unrecognized arguments: ${extras.join(' ')}`)
  return a
}

export function main(argv: string[], out: Out = (s) => { process.stdout.write(s) }): number {
  let a: Opts
  try {
    a = parseArgs(argv)
  } catch (e) {
    if (e instanceof Help) { out(e.text); return 0 }
    if (e instanceof Usage) {
      process.stderr.write(`${e.usage}${e.prog}: error: ${e.message}\n`)
      return 2
    }
    throw e
  }
  if (a.cmd === 'list') {
    try {
      out(table(loadIndex()) + '\n')
    } catch (e) {
      if (e instanceof FilingError) {
        process.stderr.write(`application: ${e.message}\n`)
        return 1
      }
      throw e
    }
    return 0
  }
  if (a.cmd === 'backfill') {
    try {
      return backfill(a.dryRun, out)
    } catch (e) {
      if (e instanceof FilingError) {
        process.stderr.write(`application: ${e.message}\n`)
        return 1
      }
      throw e
    }
  }
  let res: Filed
  try {
    res = fileApplication(a.id!, a.session || pyStrip(process.env['JOBHUNT_SESSION'] ?? '') || null)
  } catch (e) {
    if (e instanceof FilingError) {
      process.stderr.write(`application: ${e.message}\n`)
      return 1
    }
    throw e
  }
  out(`filed ${res.id} in ${basename(C.APPLICATIONS)}/${res.folder} (${res.new ? 'new' : 'refreshed'})\n`)
  if (!res.jd_stored) out(`  the full JD text is not stored: put it in ${join(C.ROLES, res.id + C.JD_SUFFIX)}\n`)
  return 0
}
