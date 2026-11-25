// The one writer of a hunt session folder. Every agent and the parent write through it.
// `--session DIR` may come before `session`, between `session` and the command, or after the command.
// Without it the open session is used (or JOBHUNT_SESSION). The command list is printed by `session --help`,
// and the notes.md schema is in process/contracts.md.
//
//     node process/engine.ts [--session DIR] session <command> ...
//     node process/engine.ts [--session DIR] finding add --json '<obj>' | finding set F-n <state>
//
// Every write takes an exclusive lock on `<session>/.lock`. Everything here is synchronous.
import { existsSync, mkdirSync, opendirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import * as C from '../constants.ts'
import { readDicts, writeDicts, type CsvRow } from '../lib/csv.ts'
import {
  byKey, decodeStrict, isoSeconds, markOrder, pyKeys, PY_WS, PYFLOAT, PyExc, pyInt, pyJson, pyLstrip, pyRstrip, pyStr, pyStrip, strftime,
} from '../lib/py.ts'
import { jsonLoads } from '../lib/pyjson.ts'
import { Exit, readText, withLock, writeAtomic, type Out } from './io.ts'
import * as applications from './applications.ts'
import * as dedupe from './dedupe.ts'
import * as ingest from './ingest.ts'
import * as queue from './queue.ts'
import { cooldownUntil } from './outreach.ts'

const NOTES = 'notes.md'
const BOARD = 'board.csv'
const STATE = '.state.json'
const LOCK = '.lock'
const SEP = ' · '
const SEND_KINDS = ['application'] as const
const NOTE_SECTIONS = C.NOTES_SECTIONS.filter((s) => !(C.MANAGED_SECTIONS as readonly string[]).includes(s))   // the named ones `note` takes
const COUNTERS = ['roles_harvested', 'roles_dropped_at_sweep', 'roles_matched', 'scored', 'resumes_built',
  'applied', 'held', 'blocked', 'held_back', 'new_keywords', 'new_portals', 'findings_open', 'questions_open', 'proposals_open', 'match_peak',
  'tailor_peak', 'apply_peak']
const WORD = '[\\p{L}\\p{N}_]'
const CHANNEL_IS = new RegExp(`CHANNEL IS (${WORD}+)`, 'u')
const FOUNDER_CHANNEL = 'waas_message'
const FOUNDER_CAP_NOTE = 'founder cap'
const MAX_REROUTES = 2                                                // a row that bounces more than this is a plain failure
const SWEEP_OK = ['ok', 'done', 'finished', 'complete']
export const CLOSED_AT_APPLY = new RegExp('no longer accepting|not accepting applications|no longer available|' +
  '(posting|listing|job|role|position|opening)( is| has been| was)? ' +
  '(closed|expired|removed|filled|taken down)', 'iu')
// `.` without re.S is [^\n]; \s is [PY_WS]; \d is \p{Nd}; \S is [^PY_WS].
const WS = `[${PY_WS}]`
const NWS = `[^${PY_WS}]`
const FINDING_HEAD = /^### F-(\p{Nd}+) · ([^\n]*)(?![\s\S])/u
const FINDING_COMMENT = new RegExp(`^<!--${WS}*finding${WS}+(\\{[^\\n]*\\})${WS}*-->${WS}*(?![\\s\\S])`, 'u')
const SEND_HEAD = /^### (\p{Nd}+)\. ([^\n]*)(?![\s\S])/u
const SEND_COMMENT = new RegExp(`^<!-- id:(${NWS}*) kind:(${NWS}+?)( approved)? -->(?![\\s\\S])`, 'u')   // ` approved`: older sessions
const GO_AHEAD = new RegExp(`^go-ahead:${WS}*([\\s\\S]+)(?![\\s\\S])`, 'iu')
const PROPOSAL_HEAD = new RegExp(`^### PR-\\p{Nd}+ · [^\\n]* · (${NWS}+)${WS}*(?![\\s\\S])`, 'u')

type Front = Record<string, unknown>
type Row = CsvRow
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type State = Record<string, any>
type Dict = Record<string, unknown>

// ------------------------------------------------------------------ Python shims

const repr = (v: unknown): string => pyStr([v]).slice(1, -1)

// s[:n] counts code points; s[-n:] likewise.
const cut = (s: string, n: number): string => Array.from(s).slice(0, n).join('')
const tail = (s: string, n: number): string => { const a = Array.from(s); return a.slice(Math.max(a.length - n, 0)).join('') }

const isFile = (p: string): boolean => { try { return statSync(p).isFile() } catch { return false } }
const isDir = (p: string): boolean => { try { return statSync(p).isDirectory() } catch { return false } }

// str(Path(p)): no empty or '.' segments, no trailing slash.
function pathStr(p: string): string {
  const abs = p.startsWith('/')
  const segs = p.split('/').filter((s) => s !== '' && s !== '.')
  return (abs ? '/' : '') + (segs.join('/') || (abs ? '' : '.'))
}
// str(Path(a) / b)
const pyJoin = (a: string, b: string): string => (b.startsWith('/') ? pathStr(b) : pathStr(a + '/' + b))

// Path.resolve(): absolute, symlinks followed as far as the path exists.
function pyResolve(p: string): string {
  const abs = pyJoin(process.cwd(), p)
  try { return realpathSync(abs) } catch {
    const parent = dirname(abs)
    return parent === abs ? abs : join(pyResolve(parent), basename(abs))
  }
}

function pyTruthy(v: unknown): boolean {
  if (v === null || v === undefined || v === false || v === 0 || v === '') return false
  if (Array.isArray(v)) return v.length > 0
  if (v instanceof Map || v instanceof Set) return v.size > 0
  if (typeof v === 'object') {
    if (PYFLOAT in (v as object)) return (v as { [PYFLOAT]: number })[PYFLOAT] !== 0
    return Object.keys(v as object).length > 0
  }
  return true
}

const isDict = (v: unknown): v is Dict =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(PYFLOAT in v) && !(v instanceof Map)

// `x in a_set` raises TypeError for a list or a dict.
function inSet(set: ReadonlySet<string>, v: unknown): boolean {
  if (Array.isArray(v)) throw new PyExc('TypeError', "unhashable type: 'list'")
  if (isDict(v)) throw new PyExc('TypeError', "unhashable type: 'dict'")
  return typeof v === 'string' && set.has(v)
}

const WS_SPLIT = new RegExp(`${WS}+`, 'u')

// ------------------------------------------------------------------ time and files

const now = (): Date => new Date()
const iso = (): string => isoSeconds(now())
const stamp = (): string => strftime('%Y-%m-%d %H:%M:%S', now())

function locked<T>(d: string, fn: () => T): T {
  return withLock(join(d, LOCK), fn)
}

// open(path, newline='', encoding='utf-8').read(): no newline translation. An OSError gives ''.
function readRaw(path: string): string {
  let buf: Buffer
  try { buf = readFileSync(path) } catch { return '' }
  return decodeStrict(buf)
}

function readRows(path: string): Row[] {
  if (!isFile(path)) return []
  return readDicts(decodeStrict(readFileSync(path))).rows
}

export function writeRows(path: string, cols: readonly string[], rows: Row[]): void {
  writeAtomic(path, writeDicts(cols, rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c] ?? '']))), { extras: 'ignore' }))
}

function oneLine(text: unknown): string {
  return pyStrip(pyStr(text)).split(WS_SPLIT).join(' ')
}

function int(v: unknown, dflt = -1): number {
  try { return pyInt(pyStr(v)) } catch { return dflt }
}

export function rel(d: string): string {
  const r = pyResolve(d)
  if (r === C.REPO) return '.'
  return r.startsWith(C.REPO + '/') ? r.slice(C.REPO.length + 1) : String(d)
}

// ------------------------------------------------------------------ front-matter

const BARE = new RegExp('^[A-Za-z0-9_./@+:-][A-Za-z0-9_./@+: -]*\\n?(?![\\s\\S])', 'u')
const BARE_ITEM = new RegExp('^[A-Za-z0-9_./@+:-]+\\n?(?![\\s\\S])', 'u')
const DIGITS = /^-?\p{Nd}+(?![\s\S])/u

function scalarOut(v: unknown): string {
  if (typeof v === 'boolean') return v ? 'yes' : 'no'
  if (typeof v === 'number' && Number.isInteger(v)) return String(v)
  const s = pyStr(v)
  if (s === '') return ''
  if (BARE.test(s) && !s.endsWith(' ') && !DIGITS.test(s)) return s
  return pyJson(s, { ensureAscii: false })
}

function itemOut(v: unknown): string {
  const s = pyStr(v)
  return BARE_ITEM.test(s) ? s : pyJson(s, { ensureAscii: false })
}

const stripQuotes = (s: string): string => pyStrip(s, '"')

function scalarIn(s0: string): unknown {
  const s = pyStrip(s0)
  if (s.startsWith('"')) {
    try { return jsonLoads(s) } catch { return stripQuotes(s) }
  }
  if (DIGITS.test(s)) return pyInt(s)
  return s
}

function listIn(inner: string): unknown[] {
  const out: unknown[] = []
  let i = 0
  const n = inner.length
  while (i < n) {
    while (i < n && (inner[i] === ' ' || inner[i] === '\t')) i++
    if (i >= n) break
    if (inner[i] === '"') {
      let j = i + 1
      while (j < n && inner[j] !== '"') j += inner[j] === '\\' ? 2 : 1
      const tok = inner.slice(i, j + 1)
      try { out.push(jsonLoads(tok)) } catch { out.push(stripQuotes(tok)) }
      i = inner.indexOf(',', j + 1)
      i = i < 0 ? n : i + 1
    } else {
      let j = inner.indexOf(',', i)
      j = j < 0 ? n : j
      const tok = pyStrip(inner.slice(i, j))
      if (tok) out.push(tok)
      i = j + 1
    }
  }
  return out
}

const newDict = (): Front => Object.create(null) as Front

// (front dict, body text). A text with no front-matter gives ({}, text).
export function parseFront(text: string): [Front, string] {
  const lines = text.split('\n')
  if (!lines.length || pyStrip(lines[0]) !== '---') return [newDict(), text]
  const front = newDict()
  for (let i = 1; i < lines.length; i++) {
    const ln = lines[i]
    if (pyStrip(ln) === '---') return [front, lines.slice(i + 1).join('\n')]
    if (!pyStrip(ln) || pyLstrip(ln).startsWith('#')) continue
    const at = ln.indexOf(':')
    if (at < 0) continue
    const key = ln.slice(0, at)
    const val = pyStrip(ln.slice(at + 1))
    front[pyStrip(key)] = val.startsWith('[') && val.endsWith(']') ? listIn(val.slice(1, -1)) : scalarIn(val)
  }
  return [newDict(), text]                                             // unterminated: no front-matter
}

export function renderFront(d: Front): string {
  const known = C.FRONT_MATTER_KEYS as readonly string[]
  const keys = [...known.filter((k) => k in d), ...Object.keys(d).filter((k) => !known.includes(k))]
  const out = ['---']
  for (const k of keys) {
    const v = d[k]
    out.push(Array.isArray(v) ? `${k}: [${v.map(itemOut).join(', ')}]` : pyRstrip(`${k}: ${scalarOut(v)}`))
  }
  out.push('---')
  return out.join('\n') + '\n'
}

// The flat front-matter of a notes.md as a dict. Integers come back as numbers, lists as lists of
// str, and yes/no as the strings 'yes' and 'no'. A missing file or no front-matter gives {}.
export function readFront(path: string): Front {
  return parseFront(readRaw(path))[0]
}

// ------------------------------------------------------------------ notes.md body

function stripBlank(lines: string[]): string[] {
  const out = [...lines]
  while (out.length && !pyStrip(out[0])) out.shift()
  while (out.length && !pyStrip(out[out.length - 1])) out.pop()
  return out
}

// One notes.md held in memory: front-matter, a preamble and the `## ` sections.
export class Notes {
  path: string
  front: Front
  pre: string[]
  secs: Map<string, string[]>
  order: string[]

  constructor(d: string) {
    this.path = join(d, NOTES)
    let body: string
    ;[this.front, body] = parseFront(readRaw(this.path))
    this.pre = []
    this.secs = new Map()
    this.order = []
    let cur: string | null = null
    let fenced = false
    for (const ln of body.split('\n')) {
      if (pyLstrip(ln).startsWith('```')) fenced = !fenced
      if (!fenced && ln.startsWith('## ')) {
        cur = pyStrip(ln.slice(3))
        if (!this.secs.has(cur)) {
          this.secs.set(cur, [])
          this.order.push(cur)
        }
        continue
      }
      if (cur) this.secs.get(cur)!.push(ln)
      else this.pre.push(ln)
    }
    this.pre = stripBlank(this.pre)
    for (const [k, v] of this.secs) this.secs.set(k, stripBlank(v))
  }

  lines(name: string): string[] {
    if (!this.secs.has(name)) {
      this.secs.set(name, [])
      this.order.push(name)
    }
    return this.secs.get(name)!
  }

  set(name: string, lines: string[]): void {
    this.lines(name)
    this.secs.set(name, stripBlank(lines))
  }

  append(name: string, block: string[]): void {
    const cur = this.lines(name)
    if (cur.length && block.length && block[0].startsWith('### ')) cur.push('')
    cur.push(...block)
  }

  log(text: unknown): void {
    this.lines('Log').push(`- ${stamp()} IST  ${oneLine(text)}`)
  }

  render(): string {
    const known = C.NOTES_SECTIONS.filter((s) => s !== 'Log')
    const all = C.NOTES_SECTIONS as readonly string[]
    const names = [...known, ...this.order.filter((s) => !all.includes(s)), 'Log']
    let out: string[] = []
    if (this.pre.length) out = out.concat(this.pre, [''])
    for (const name of names) {
      const body = this.secs.get(name) ?? []
      out.push(`## ${name}`, '')
      if (body.length) out = out.concat(body, [''])
    }
    return renderFront(this.front) + '\n' + pyRstrip(out.join('\n'), '\n') + '\n'
  }

  save(): void {
    this.front['updated'] = iso()
    writeAtomic(this.path, this.render())
  }
}

// The canonical NOTES_SECTIONS spelling of a section name, matched without case.
function sectionName(name: unknown): string | null {
  const want = pyStrip(pyStr(name)).toLowerCase()
  for (const s of C.NOTES_SECTIONS) if (s.toLowerCase() === want) return s
  return null
}

// ------------------------------------------------------------------ finding a session

// Every hunt session folder with a notes.md, oldest first by the date in its name.
export function allSessions(): string[] {
  return C.sessionFolders(null, C.SESSION_SUFFIX, null, true)
}

function phaseOf(d: string): string {
  return pyStr(readFront(join(d, NOTES))['phase'] ?? '')
}

function findOpen(): string | null {
  for (const d of [...allSessions()].reverse()) if (phaseOf(d) !== 'closed') return d
  return null
}

export function asSession(arg: unknown): string | null {
  let p = pyStr(arg)
  if (p === '~') p = homedir()
  else if (p.startsWith('~/')) p = homedir() + p.slice(1)
  const cands = p.startsWith('/') ? [pathStr(p)] : [pyJoin(C.SESSIONS, p), pyJoin(C.REPO, p), pyJoin(process.cwd(), p)]
  for (const c of cands) if (isFile(join(c, NOTES))) return c
  return null
}

// The session folder named by `arg`, else JOBHUNT_SESSION, else the newest one not closed.
export function resolve(arg?: string | null, required?: true): string
export function resolve(arg: string | null | undefined, required: boolean): string | null
export function resolve(arg: string | null | undefined = null, required = true): string | null {
  const a = arg || pyStrip(process.env['JOBHUNT_SESSION'] ?? '') || null
  const d = a ? asSession(a) : findOpen()
  if (d) return d
  if (required) {
    process.stderr.write(`session: no open session${a ? ' at ' + a : ''}\n`)
    throw new Exit(3)
  }
  return null
}

// Path of the open session: JOBHUNT_SESSION, then the newest session whose phase is not closed.
export function current(required?: true): string
export function current(required: boolean): string | null
export function current(required = true): string | null {
  return resolve(null, required)
}

// ------------------------------------------------------------------ state, board and the queue

export function loadState(d: string): State {
  let s: unknown
  try { s = jsonLoads(readRaw(join(d, STATE)) || '{}') } catch { s = {} }
  if (!isDict(s)) throw new PyExc('AttributeError', "object has no attribute 'setdefault'")
  const st = s as State
  const defaults: [string, () => unknown][] = [['background', () => []], ['background_seen', () => []],
    ['peaks', () => ({})], ['claimed', () => ({})], ['attempts', () => ({})], ['settled', () => []],
    ['no_reclaim', () => []], ['harvested', () => []], ['dropped_at_sweep', () => []], ['decided', () => []],
    ['scored', () => []], ['resumes', () => []], ['applied', () => []], ['sweeps', () => ({})]]
  for (const [k, mk] of defaults) if (!(k in st)) st[k] = mk()
  return st
}

function saveState(d: string, s: State): void {
  writeAtomic(join(d, STATE), pyJson(s, { indent: 1 }) + '\n')
}

function addTo(s: State, key: string, value: string): void {
  if (!s[key].includes(value)) s[key].push(value)
}

function board(d: string): Row[] {
  return readRows(join(d, BOARD))
}

function saveBoard(d: string, rows: Row[]): void {
  writeRows(join(d, BOARD), C.BOARD_COLS, rows)
}

// Every row of the ledger's prospects.csv. A missing ledger gives [].
function prospects(): Row[] {
  return readRows(C.PROSPECTS)
}

export function canon(link: string | undefined): string {
  try {
    return dedupe.identify(link || '')[2]
  } catch {                                                            // dedupe absent or changed: a plain fallback
    return pyRstrip(pyStrip(link || '').replace(/[?#][^\n]*$/u, ''), '/')
  }
}

function findRow(rows: Row[], key: string): Row | null {
  if (key.startsWith('http')) {
    const c = canon(key)
    return rows.find((r) => r['link'] && canon(r['link']) === c) ?? null
  }
  return rows.find((r) => r['id'] === key) ?? null
}

function setRow(rows: Row[], key: string, fields: Record<string, string>): Row {
  let r = findRow(rows, key)
  if (r === null) {
    r = Object.fromEntries(C.BOARD_COLS.map((c) => [c, ''])) as Row
    if (key.startsWith('http')) r['link'] = canon(key)
    else r['id'] = key
    rows.push(r)
  }
  for (const [k, v] of Object.entries(fields)) {
    if (!(C.BOARD_COLS as readonly string[]).includes(k)) throw new Exit(`session: board has no column ${repr(k)}`)
    if (k === 'lane' && !C.LANES.includes(v)) throw new Exit(`session: lane must be one of ${C.LANES.join(', ')}`)
    r[k] = v
  }
  r['updated'] = stamp()
  return r
}

function noteAdd(r: Row, text: string): void {
  r['note'] = pyStrip((r['note'] ?? '') + ' | ' + text, ' |')
}

function laneCounts(rows: Row[]): Map<string, number> {
  const c = new Map<string, number>(C.LANES.map((lane) => [lane, 0]))
  for (const r of rows) {
    const lane = r['lane'] || 'swept'
    c.set(lane, (c.get(lane) ?? 0) + 1)
  }
  return c
}

function inFlightOf(rows: Row[]): string[] {
  return rows.filter((r) => r['lane'] !== undefined && Object.hasOwn(C.FALLBACK, r['lane']) && r['owner']).map((r) => r['owner'] as string)
}

// `lanes` without the LinkedIn lanes while the security cooldown runs. `outreach open` reads the same cooldownUntil(),
// so one test stops every LinkedIn lane: no claim, no seed, and no sweep line in preflight.
export function unpaused(lanes: readonly string[]): string[] {
  return cooldownUntil() ? lanes.filter((l) => !C.SPLIT_LANES['linkedin'].includes(l)) : [...lanes]
}

// The `Paused:` line for the lanes `unpaused` drops from `lanes`, or '' when none is dropped.
export function pausedLine(lanes: readonly string[]): string {
  const kept = unpaused(lanes)
  const gone = lanes.filter((l) => !kept.includes(l))
  return gone.length ? `Paused: ${gone.join(',')} until ${isoSeconds(cooldownUntil() ?? new Date())} (LinkedIn security cooldown), so a hunt works none of them.` : ''
}

// The lanes this run works: those a /hunt flag gave with --lanes, else every lane in search.live_sources, less any paused by the cooldown.
function runLanes(s: State): readonly string[] {
  return unpaused(Array.isArray(s['lanes']) && s['lanes'].length ? s['lanes'] : C.cfg().live_sources)
}

// True when the row's lane is one this run works. A row from any other lane is dormant.
function live(p: Row, lanes: readonly string[]): boolean {
  return lanes.includes(C.laneOf(pyStrip(p['source'] || ''), pyStrip(p['channel'] || '')))
}

// The lanes named that are not live, so `open` and `new` can refuse them.
function notLive(lanes: readonly string[]): string[] {
  return lanes.filter((l) => !C.cfg().live_sources.includes(l) || C.runnerPath(l) === null)
}

function boardRow(r: Row, note: string): Row {
  const st = pyStrip(r['status'] || '')
  const lane = ['new', 'extracted', 'dropped', 'skipped', 'wrong_job'].includes(st) ? 'swept'
    : (Object.hasOwn(C.LANE_FOR_STATUS, st) ? C.LANE_FOR_STATUS[st] : 'matched')
  if (r['id'] === undefined) throw new PyExc('KeyError', "'id'")
  return {
    id: r['id'], company: r['company'] ?? '', role: r['role'] ?? '', link: r['link'] ?? '', source: r['source'] ?? '',
    channel: r['channel'] ?? '', lane, match: r['match'] ?? '', resume: r['resume_variant'] ?? '', owner: '',
    updated: stamp(), note,
  }
}

// A new session starts with the backlog already queued, so lanes fill before any sweep returns.
// Only rows from a lane this run works are seeded. Rows from any other lane stay in prospects.csv untouched.
export function seed(lanes: readonly string[] = C.cfg().live_sources): Row[] {
  let picked: Row[]
  try {
    const b = C.cfg().budgets
    const liveSources = lanes
    picked = [...queue.select('extract', b['extract'], null, null, liveSources),
      ...queue.select('triage', b['triage'], null, null, liveSources),
      ...queue.select('apply', b['apply'], null, null, liveSources)]
  } catch {                                                            // no ledger yet, or queue unavailable
    return []
  }
  const out: Row[] = []
  const seen = new Set<string | undefined>()
  for (const r of picked) {
    if (seen.has(r['id'])) continue
    seen.add(r['id'])
    out.push(boardRow(r, `backlog: ${pyStrip(r['status'] || '')}`))
  }
  return out
}

// ------------------------------------------------------------------ counters and Resume here

// The `## Send list` entries: n, title, id, kind, approved.
export function sendEntries(lines: string[]): { n: number; title: string; id: string; kind: string; approved: boolean; line: number }[] {
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const m = SEND_HEAD.exec(lines[i])
    if (!m || i + 1 >= lines.length) continue
    const c = SEND_COMMENT.exec(lines[i + 1])
    if (c) out.push({ n: pyInt(m[1]), title: m[2], id: c[1], kind: c[2], approved: !!c[3], line: i })
  }
  return out
}

function findingEntries(lines: string[]): { n: number; line: number; state: string }[] {
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const m = FINDING_HEAD.exec(lines[i])
    if (m) {
      const parts = m[2].split(SEP)
      out.push({ n: pyInt(m[1]), line: i, state: parts.length ? pyStrip(parts[parts.length - 1]) : '' })
    }
  }
  return out
}

// Recompute every front-matter counter from board.csv, the Send list, the findings and state.
function recount(notes: Notes, rows: Row[], s: State): void {
  const f = notes.front
  for (const k of C.LEGACY_FRONT_MATTER_KEYS) delete f[k]
  if (!('go_ahead' in f)) f['go_ahead'] = ''
  const keywords = new Set(notes.lines('Keyword gaps').filter((ln) => ln.startsWith('- '))
    .map((ln) => pyStrip(ln.slice(2).split(SEP)[0]).toLowerCase()))
  keywords.delete('')
  const peaks = s['peaks']
  Object.assign(f, {
    roles_harvested: s['harvested'].length,
    roles_dropped_at_sweep: s['dropped_at_sweep'].length,
    roles_matched: s['decided'].length,
    scored: s['scored'].length,
    resumes_built: s['resumes'].length,
    applied: s['applied'].length,
    held: rows.filter((r) => r['lane'] === 'held').length,
    blocked: rows.filter((r) => r['lane'] === 'blocked').length,
    held_back: s['held_back'] ?? 0,
    new_keywords: keywords.size,
    new_portals: notes.lines('New portals').filter((ln) => ln.startsWith('- ')).length,
    findings_open: findingEntries(notes.lines('Findings')).filter((e) => e.state === 'open').length,
    questions_open: notes.lines(C.QUESTIONS_SECTION).filter((ln) => new RegExp(`^${WS}*- \\[ \\]`, 'u').test(ln)).length,
    proposals_open: notes.lines('Proposals').filter((ln) => {
      const m = PROPOSAL_HEAD.exec(ln)
      return m !== null && m[1] !== 'applied' && m[1] !== 'declined'
    }).length,
    background_agents: [...s['background']],
    match_peak: peaks['matching'] ?? 0,
    tailor_peak: peaks['tailoring'] ?? 0,
    apply_peak: peaks['applying'] ?? 0,
  })
}

const NEXT_STEP: Record<string, string> = {
  running: 'Run /hunt again. `engine.ts session open` resets the rows in flight so they are dispatched again.',
  closed: 'Nothing to do. This hunt is closed. Held rows wait for /retro.',
}
const LEGACY_NEXT_STEP = 'This phase is from an older engine. Close it with `engine.ts session phase closed`.'

function resumeHere(notes: Notes, rows: Row[], s: State): string[] {
  const ph = notes.front['phase'] ?? ''
  const lanes = [...laneCounts(rows)].filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ') || 'empty'
  const out = [`Phase ${pyStr(ph)} at ${stamp()} IST. Board: ${lanes}.`]
  const flight = [...inFlightOf(rows), ...s['background']]
  if (flight.length) out.push(`In flight: ${flight.join(', ')}.`)
  const key = typeof ph === 'string' ? ph : ''
  out.push(Object.hasOwn(NEXT_STEP, key) ? NEXT_STEP[key]
    : (C.LEGACY_PHASES.has(key) ? LEGACY_NEXT_STEP : NEXT_STEP['running']))
  return out
}

// Recount, rewrite `## Resume here`, and write notes.md, .state.json and (optionally) board.csv.
function commit(d: string, notes: Notes, rows: Row[], s: State, saveRows = true): void {
  recount(notes, rows, s)
  notes.set('Resume here', resumeHere(notes, rows, s))
  if (saveRows) saveBoard(d, rows)
  saveState(d, s)
  notes.save()
}

// ------------------------------------------------------------------ creating and resuming

// str.splitlines()
const LINE_BREAK = /\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/u
function splitlines(s: string): string[] {
  const parts = s.split(LINE_BREAK)
  if (parts.length && parts[parts.length - 1] === '') parts.pop()
  return parts
}

// os.scandir order, which is the order readdir returns. fs.readdirSync sorts; opendirSync does not.
function scandirNames(dir: string): string[] {
  const out: string[] = []
  const h = opendirSync(dir)
  try {
    for (let e = h.readSync(); e; e = h.readSync()) out.push(e.name)
  } finally { h.closeSync() }
  return out
}

export function newSession(browser: string | null = null, doSeed = true, lanes: readonly string[] = [], goAhead = ''): string {
  const root = C.SESSIONS
  mkdirSync(root, { recursive: true })
  const when = now()
  let n = 1
  let d = pyJoin(root, C.sessionName(when, n))
  while (existsSync(d)) {                                             // two sessions in one minute: the second gets -2
    n += 1
    d = pyJoin(root, C.sessionName(when, n))
  }
  for (const stage of C.STAGES) mkdirSync(join(d, C.STAGE_DIR, stage, 'done'), { recursive: true })
  const dev = browser || C.local('chrome_device_id') || ''
  const front: Front = {
    session: basename(d), started: isoSeconds(when), updated: '', phase: 'running', retro_done: 'no', go_ahead: oneLine(goAhead),
    browser: dev ? `pinned ${dev}` : 'none', sources_swept: [], sources_failed: [],
  }
  for (const k of COUNTERS) front[k] = 0
  front['background_agents'] = []
  front['fan_out'] = ''
  locked(d, () => {
    const notes = new Notes(d)
    notes.front = Object.fromEntries(C.FRONT_MATTER_KEYS.filter((k) => k in front).map((k) => [k, front[k]]))
    notes.pre = [`# Hunt ${strftime('%Y-%m-%d %H:%M', when)} IST`]
    const s = loadState(d)
    s['lanes'] = [...lanes]
    const rows = doSeed ? seed(runLanes(s)) : []
    notes.log(doSeed ? `new session; board seeded with ${rows.length} backlog rows` : 'new session; board not seeded')
    if (oneLine(goAhead)) notes.log(`go-ahead: ${goAhead}`)
    commit(d, notes, rows, s)
  })
  return d
}

// `lanes` replaces the run's lanes on `open`, because each run gives its own flag. `resume` keeps them.
function resetInFlight(d: string, lanes: readonly string[] | null = null): [number, string[]] {
  return locked(d, (): [number, string[]] => {
    const rows = board(d)
    const s = loadState(d)
    const notes = new Notes(d)
    let n = 0
    for (const r of rows) {
      if (r['lane'] !== undefined && Object.hasOwn(C.FALLBACK, r['lane']) && r['owner']) {
        let back = C.FALLBACK[r['lane']]
        if (r['lane'] === 'applying' && s['resumes'].includes(r['id'])) back = 'tailored'
        Object.assign(r, { lane: back, owner: '', updated: stamp() })
        noteAdd(r, 'reset on resume')
        n += 1
      }
    }
    const lost: string[] = [...s['background']]
    s['background'] = []
    notes.front['go_ahead'] = ''                                       // each run gives its own go-ahead
    if (lanes !== null) s['lanes'] = [...lanes]
    notes.log(`resume: ${n} in-flight rows reset; background agents gone: ${lost.join(', ') || 'none'}; go_ahead cleared`)
    commit(d, notes, rows, s)
    return [n, lost]
  })
}

// `started` of the newest closed session that swept a source, or null. A /retro or rerun session sweeps nothing, so it moves no harvest window.
function lastStarted(): string | null {
  const swept = allSessions().filter((d) => phaseOf(d) === 'closed').map((d) => readFront(join(d, NOTES)))
    .filter((f) => ['sources_swept', 'sources_failed'].some((k) => Array.isArray(f[k]) && f[k].length))
  return swept.length ? pyStr(swept[swept.length - 1]['started']) : null
}

// `r<seconds>`: how far back the next Easy Apply sweep reaches. That is the time since the newest closed session that swept
// linkedin-ea started, held between the two window keys. With no such session it is the longest window.
function eaWindow(): string {
  const c = C.cfg()
  const lo = c.linkedin_ea_window_min_minutes * 60
  const hi = c.linkedin_ea_window_max_minutes * 60
  const swept = allSessions().filter((d) => phaseOf(d) === 'closed').map((d) => readFront(join(d, NOTES)))
    .filter((f) => Array.isArray(f['sources_swept']) && f['sources_swept'].includes('linkedin-ea'))
  const at = swept.length ? Date.parse(pyStr(swept[swept.length - 1]['started'])) : NaN
  if (Number.isNaN(at)) return `r${hi}`
  return `r${Math.min(hi, Math.max(lo, Math.floor((Date.now() - at) / 1000)))}`
}

const RETRO_SUBMIT = 'Retro submit'
const CHECK_BEFORE_RESEND = 'Check the employer site or your email before you send it again.'

// Close a run that was left open. A row it had in flight may have been sent, so each one open is held with STOPPED
// and its owner is cleared. Returns the ids held. A row that cannot be held (already applied or closed) is only freed.
export function closeAbandoned(d: string, reason = 'the run stopped before it finished'): string[] {
  const why = oneLine(reason) || 'the run stopped before it finished'
  const text = `STOPPED: ${why}. ${CHECK_BEFORE_RESEND}`
  const late = runIngest(d)                                            // a stage file written before the run died is the truth, so fold it first
  if (late) log(d, `ingest: ${late}`)
  // Only an applier can have sent a form. A matcher or tailor row is freed below, and the next hunt picks it up.
  const owned = locked(d, () => board(d).filter((r) => r['lane'] === 'applying' && r['owner']).map((r) => r['id'] as string))
  const status = new Map<string, string>(prospects().map((r) => [r['id'] as string, r['status'] ?? '']))
  const heldIds: string[] = []
  const skipped: string[] = []
  for (const id of owned) {                                            // outside the session lock: hold syncs the board under it
    const st = status.get(id) ?? ''
    if (st === 'held' || st === 'applied' || C.CLOSED.has(st)) { skipped.push(`${id} (${st || 'no row'})`); continue }
    try {
      ingest.hold([id], text, d)
      heldIds.push(id)
    } catch (exc) {
      skipped.push(`${id} (${oneLine(exc instanceof Exit ? String(exc.code) : (exc as Error).message)})`)
    }
  }
  locked(d, () => {
    const rows = board(d)
    const s = loadState(d)
    const notes = new Notes(d)
    for (const r of rows) {
      if (r['lane'] !== undefined && Object.hasOwn(C.FALLBACK, r['lane']) && r['owner']) {
        Object.assign(r, { lane: C.FALLBACK[r['lane']], owner: '', updated: stamp() })
        noteAdd(r, 'freed: run abandoned')
      }
    }
    s['background'] = []
    notes.log(`abandoned: ${why}; held ${heldIds.join(', ') || 'none'}${skipped.length ? `; not held ${skipped.join(', ')}` : ''}`)
    commit(d, notes, rows, s)
  })
  if (heldIds.length) syncStatus(heldIds, d)                           // owners are clear now, so the board rows follow the hold
  fileApplications(d)
  setPhase(d, 'closed')
  return heldIds
}

// The open session in `d` is a /retro submit run when its go-ahead starts `Retro submit`.
function isRetroSubmit(d: string): boolean {
  return phaseOf(d) !== 'closed' && pyStr(readFront(join(d, NOTES))['go_ahead'] ?? '').startsWith(RETRO_SUBMIT)
}

// ------------------------------------------------------------------ claiming

function over(p: Row): boolean {
  return pyStrip(p['override'] || '') === 'yes' && !pyStrip(p['reviewed'] || '')
}

// True while an agent that works the row before `lane` has not been marked returned. A tailor or
// an applier started on a row whose matcher is still running would read a role file that is not there.
function upstreamInFlight(s: State, rid: string, lane: string): boolean {
  const before = lane === 'tailoring' ? ['matching'] : ['matching', 'tailoring']
  return before.some((x) => s['background'].includes(`${C.OWNER_TAGS[x]}-${rid}`))
}

// An invite is neither an Easy Apply nor an external row, so it takes no part in the external_min and easy_apply_share split.
const isExternal = (r: Row): boolean => r['channel'] !== 'easy_apply' && r['source'] !== C.INVITE_SOURCE

function eligible(_d: string, lane: string, rows: Row[], s: State, prows: Row[], ph: unknown): [Row, Row][] {
  const idx = new Map<string, Row>(prows.map((r) => [r['id'] as string, r]))
  const spent = new Set<string>(s['no_reclaim'])
  const pool: [Row, Row][] = []
  const lanes = runLanes(s)
  for (const r of rows) {
    if (r['owner'] || !r['id'] || spent.has(r['id'])) continue
    const p = idx.get(r['id'])
    if (p === undefined || !live(p, lanes)) continue                   // a dormant lane is never claimed
    const st = pyStrip(p['status'] || '')
    const resume = r['resume'] || ''
    if ((lane === 'tailoring' || lane === 'applying') && ph === 'running' && upstreamInFlight(s, r['id'], lane)) continue
    if (lane === 'matching') {
      if (ph !== 'running' || r['lane'] !== 'swept') continue
      if (st !== 'new' && st !== 'extracted' && !over(p)) continue
    } else if (lane === 'tailoring') {
      if (ph !== 'running' || r['lane'] !== 'matched' || !resume.startsWith('PENDING')) continue
    } else if (lane === 'applying') {
      if (ph !== 'running' || (r['lane'] !== 'matched' && r['lane'] !== 'tailored')) continue
      if (!resume || resume.startsWith('PENDING') || (st !== 'scored' && st !== 'ready')) continue
      if (!pyStrip(p['semantic'] || '')) continue
    }
    pool.push([r, p])
  }
  const c = C.cfg()
  const needExternal = lane === 'applying' && ph === 'running' && (s['claimed']['external'] ?? 0) < c.external_min
  const fresh = new Set<string>(s['harvested'])
  pool.sort(byKey(([r, p]: [Row, Row]) => {
    const external = isExternal(r)
    const backlog = lane === 'matching' && !fresh.has(r['id'] as string)   // rows swept this session go first
    // Easy Apply rows go newest first: by posted_at, then by LinkedIn job id, which rises with time. A blank posted_at goes last.
    const newest = r['channel'] === 'easy_apply' && (lane === 'applying' || lane === 'matching')
    const posted = newest ? Date.parse(pyStrip(p['posted_at'] || '').replace(' ', 'T')) : NaN
    const jobId = newest ? Number(dedupe.identify(p['link'])[1] ?? 0) : 0
    return [Number(!over(p)), Number(p['source'] !== C.INVITE_SOURCE), Number((p['status'] || '') !== 'ready'), Number(!(needExternal && external)), Number(backlog),
      Number(newest && Number.isNaN(posted)), Number.isNaN(posted) ? 0 : -posted, -jobId,
      -int(lane !== 'matching' ? p['match'] : p['prelim']), r['id'] as string]
  }))
  return pool
}

function budgets(): Record<string, number> {
  const b = C.cfg().budgets
  return { matching: b['triage'], applying: b['apply'] }
}

// Rows at status `new` the matching lane may claim in one hunt (they still need extracting).
function extractBudget(): number {
  return C.cfg().budgets['extract']
}

// `Top choice: used` lines in this month's session notes. `preflight` in status.ts reports the same count.
export function topChoiceSpent(): number {
  const month = strftime('%Y-%m', now())
  if (!isDir(C.SESSIONS)) return 0
  let total = 0
  for (const p of C.sessionFolders(null, null, month)) total += readRaw(join(p, NOTES)).split('Top choice: used').length - 1
  return total
}

function triageJson(d: string, rid: string): string | null {
  const folder = join(d, C.STAGE_DIR, 'triage', 'done')
  if (!isDir(folder)) return null
  const files = scandirNames(folder).filter((n) => n.endsWith('.json')).map((n) => join(folder, n))
    .map((f) => [f, statSync(f).mtimeMs] as const).sort((a, b) => a[1] - b[1]).map((x) => x[0])
  const named = files.filter((f) => basename(f).includes(rid))
  for (const f of [...(named.length ? named : files)].reverse()) {
    try {
      const data = jsonLoads(readText(f))
      if (!isDict(data)) continue                                      // AttributeError
      if (pyStr(data['id']) === rid) return rel(f)
    } catch { continue }
  }
  return null
}

function rowBrief(d: string, _r: Row, p: Row, lane: string): Dict {
  const b: Dict = {}
  for (const k of ['id', 'company', 'role', 'link', 'source', 'channel', 'status', 'prelim', 'match', 'semantic',
    'salary_band', 'salary_period', 'resume_variant', 'apply_route', 'override']) b[k] = k in p ? p[k] : ''
  const rf = pyJoin(C.ROLES, `${p['id']}.md`)
  b['role_file'] = rel(rf)
  b['role_file_exists'] = isFile(rf)
  b['notes'] = tail(p['notes'] || '', 600)
  const m = [...(p['notes'] || '').matchAll(new RegExp(`resume: (${NWS}+)`, 'gu'))]
  b['resume_file'] = m.length ? m[m.length - 1][1] : null
  if (lane === 'tailoring' || lane === 'applying') b['triage_json'] = triageJson(d, p['id'] as string)
  if (lane === 'applying') {   // the ledger note outlives the session, and triage_json does not
    const tr = [...(p['notes'] || '').matchAll(/triage: ([^|]*)/gu)]
    b['triage_reason'] = tr.length ? tr[tr.length - 1][1].trim() : null
  }
  return b
}

// Claim up to `limit` rows for `lane`. The applying lane claims nothing without a go-ahead.
function claim(d: string, lane: string, limit: number, rows: Row[], s: State, prows: Row[], doClaim: boolean,
               ph: unknown, goAhead: unknown = ''): Dict[] {
  const c = C.cfg()
  if (lane === 'applying' && !pyStrip(pyStr(goAhead || ''))) return []
  const pool = eligible(d, lane, rows, s, prows, ph)
  const inFlight = rows.filter((r) => r['lane'] === lane && r['owner'])
  const budget = budgets()[lane] as number | undefined
  let room = limit
  if (budget !== undefined && ph === 'running') room = Math.min(room, Math.max(0, budget - (s['claimed'][lane] ?? 0)))
  let picked: [Row, Row][] = []
  let li = inFlight.filter((r) => r['source'] === 'linkedin').length
  const easyCap = Math.trunc(c.budgets['apply'] * c.easy_apply_share)
  const others = pool.some(([r]) => isExternal(r))
  let newUsed: number = s['claimed']['extract'] ?? 0                   // B14: `new` rows claimed for matching so far
  let founderUsed: number = s['claimed'][FOUNDER_CHANNEL] ?? 0         // A-15: founder messages claimed for tailoring
  for (const [r, p] of pool) {
    if (picked.length >= room) break
    if (lane === 'matching' && ph === 'running' && pyStrip(p['status'] || '') === 'new') {
      if (newUsed >= extractBudget()) continue
    }
    if (lane === 'tailoring' && ph === 'running' && r['channel'] === FOUNDER_CHANNEL) {
      if (founderUsed >= c.waas_messages) {
        if (doClaim && !(r['note'] || '').includes(FOUNDER_CAP_NOTE)) noteAdd(r, FOUNDER_CAP_NOTE)
        continue
      }
      founderUsed += 1
    }
    if (lane === 'matching' && r['source'] === 'linkedin') {
      if (li >= c.linkedin_readers) continue
      li += 1
    }
    if (lane === 'matching' && ph === 'running' && pyStrip(p['status'] || '') === 'new') newUsed += 1
    if (lane === 'applying' && ph === 'running' && r['channel'] === 'easy_apply' && others) {
      const used = (s['claimed']['easy_apply'] ?? 0) + picked.filter(([x]) => x['channel'] === 'easy_apply').length
      if (used >= easyCap) continue
    }
    picked.push([r, p])
  }
  if (lane === 'applying' && picked.length > 1) {                     // channels mixed: alternate where the pool allows
    const by = new Map<string | undefined, [Row, Row][]>()
    for (const rp of picked) {
      const k = rp[0]['channel']
      if (!by.has(k)) by.set(k, [])
      by.get(k)!.push(rp)
    }
    const mixed: [Row, Row][] = []
    while ([...by.values()].some((v) => v.length)) {
      for (const ch of [...by.keys()]) {
        if (by.get(ch)!.length) mixed.push(by.get(ch)!.shift()!)
      }
    }
    picked = mixed
  }
  const [agent, model] = C.AGENT[lane]
  const letter = C.OWNER_TAGS[lane]
  const out: Dict[] = []
  for (const [r, p] of picked) {
    const item: Dict = { tag: `${letter}-${r['id']}`, agent, model, lane, row: rowBrief(d, r, p, lane) }
    if (lane === 'applying') {
      item['mode'] = 'submit'
      item['go_ahead'] = pyStr(goAhead)
      item['top_choice'] = (r['channel'] === 'easy_apply' && int(p['match']) >= c.top_choice_min_match
        && topChoiceSpent() < c.top_choice_per_month) ? 'allowed' : 'not allowed'
    }
    if (doClaim) {
      Object.assign(r, { lane, owner: item['tag'] as string, updated: stamp() })
      if (ph === 'running') {
        s['claimed'][lane] = (s['claimed'][lane] ?? 0) + 1
        if (lane === 'applying') {
          const k = r['channel'] === 'easy_apply' ? 'easy_apply' : isExternal(r) ? 'external' : ''
          if (k) s['claimed'][k] = (s['claimed'][k] ?? 0) + 1
        }
        if (lane === 'tailoring' && r['channel'] === FOUNDER_CHANNEL) {
          s['claimed'][FOUNDER_CHANNEL] = (s['claimed'][FOUNDER_CHANNEL] ?? 0) + 1
        }
        if (lane === 'matching' && pyStrip(p['status'] || '') === 'new') s['claimed']['extract'] = (s['claimed']['extract'] ?? 0) + 1
      }
    }
    out.push(item)
  }
  if (doClaim && out.length) {
    const n = rows.filter((r) => r['lane'] === lane && r['owner']).length
    s['peaks'][lane] = Math.max(s['peaks'][lane] ?? 0, n)
  }
  return out
}

// ------------------------------------------------------------------ settling what ingest wrote

const HELD_OR_FAILED: ReadonlySet<string> = new Set([...C.HELD_OUTCOMES, 'failed'])

function settleOne(stage: string, data: Dict, br: Row, r: Row | null, s: State, _ph: unknown): boolean {
  const rid = br['id'] as string
  const was = br['lane']
  const st = r ? r['status'] : ''
  if (stage === 'extract') {
    if (pyTruthy(data['closed']) || pyTruthy(data['hard_fail']) || ['dropped', 'skipped', 'wrong_job'].includes(st as string)) {
      const why = pyTruthy(data['closed']) ? 'posting closed (extract)'
        : (pyTruthy(data['hard_fail']) ? `hard filter: ${pyStr(data['hard_fail'])}` : `extract ${pyStr(st)}`)
      Object.assign(br, { lane: 'dropped', owner: '' })
      noteAdd(br, why)
    } else return false
  } else if (stage === 'triage') {
    const prev = br['resume'] || ''
    const variant = pyStrip(pyStr(pyTruthy(data['resume_variant']) ? data['resume_variant']
      : ((r && r['resume_variant']) || '')))
    if (r !== null) br['match'] = r['match'] || ('match' in data ? pyStr(data['match']) : '')
    if (variant) br['resume'] = variant
    if (data['decision'] === 'scored') {
      if (was === 'swept' || was === 'matching') {
        Object.assign(br, { lane: 'matched', owner: '' })
        addTo(s, 'decided', rid)
        addTo(s, 'scored', rid)
      }
      const fresh = br['resume'] || ''
      if (fresh && !fresh.startsWith('PENDING') && prev.startsWith('PENDING')
          && ['matched', 'tailoring', 'tailored'].includes(br['lane'] as string)) {
        Object.assign(br, { lane: 'tailored', owner: '' })
        addTo(s, 'resumes', rid)
      }
    } else {
      if (was === 'swept' || was === 'matching') addTo(s, 'decided', rid)
      Object.assign(br, { lane: 'dropped', owner: '' })
      noteAdd(br, `triage ${pyStr(data['decision'])}`)
    }
  } else if (stage === 'apply') {
    const out = data['outcome']
    const text = `${pyTruthy(data['notes']) ? pyStr(data['notes']) : ''} ${pyTruthy(data['question']) ? pyStr(data['question']) : ''}`
    const notesText = pyTruthy(data['notes']) ? pyStr(data['notes']) : ''
    const wrong = out === 'failed' ? CHANNEL_IS.exec(notesText) : null
    const newChannel = wrong ? wrong[1] : ''
    if (!('rerouted' in s)) s['rerouted'] = {}
    const rerouted = s['rerouted']
    const wasChannel = br['channel']
    const closed = pyTruthy(data['closed']) || st === 'skipped' || (inSet(HELD_OR_FAILED, out) && CLOSED_AT_APPLY.test(text))
    if (out === 'applied' || out === 'already_applied') {
      Object.assign(br, { lane: 'sent', owner: '' })
      if (out === 'applied') addTo(s, 'applied', rid)
    } else if (out === 'declined') {                                   // a Naukri invite answered with Not interested
      Object.assign(br, { lane: 'dropped', owner: '' })
      noteAdd(br, `skipped: ${cut(notesText, 120)}`)
      addTo(s, 'no_reclaim', rid)
    } else if (closed) {                                               // the listing is gone: never claimed again
      Object.assign(br, { lane: 'dropped', owner: '' })
      noteAdd(br, 'skipped: closed at apply')
      addTo(s, 'no_reclaim', rid)
    } else if (C.CHANNELS.has(newChannel) && newChannel !== br['channel'] && (rerouted[rid] ?? 0) < MAX_REROUTES) {   // EA-7: wrong channel; not a failed attempt
      rerouted[rid] = (rerouted[rid] ?? 0) + 1
      Object.assign(br, { lane: 'matched', owner: '', channel: newChannel })
      noteAdd(br, `rerouted from ${wasChannel || 'unknown'} to ${newChannel}`)
    } else if (inSet(C.HELD_OUTCOMES, out)) {                          // not clean: held for /retro
      Object.assign(br, { lane: 'held', owner: '' })
      noteAdd(br, 'held: ' + cut(heldReasons(data), 160))
      addTo(s, 'no_reclaim', rid)
    } else {                                                           // failed: left for the next hunt
      Object.assign(br, { lane: 'blocked', owner: '' })
      noteAdd(br, `apply failed: ${cut(notesText, 120)}`)
      addTo(s, 'no_reclaim', rid)
    }
  } else return false
  br['updated'] = stamp()
  return true
}

// One line naming every reason an apply JSON gives for holding the form.
export function heldReasons(data: Dict): string {
  const reasons = data['reasons']
  const parts: string[] = Array.isArray(reasons) ? reasons.map((x) => pyStr(x)) : (pyTruthy(reasons) ? [pyStr(reasons)] : [])
  if (pyStrip(pyTruthy(data['question']) ? pyStr(data['question']) : '')) parts.push(pyStr(data['question']))
  if (!parts.length && data['outcome'] === 'stopped_before_submit') parts.push('stopped before submit')
  return oneLine(parts.join('; '))
}

// Move board rows for every stage file in `.stage/<stage>/done/` not yet settled. Returns rows moved.
function settle(d: string, rows: Row[], s: State, prows: Row[], ph: unknown): number {
  const idx = new Map<string, Row>(prows.map((r) => [r['id'] as string, r]))
  const seen = new Set<string>(s['settled'])
  let touched = 0
  for (const stage of ['extract', 'triage', 'apply']) {
    const folder = join(d, C.STAGE_DIR, stage, 'done')
    if (!isDir(folder)) continue
    const files = scandirNames(folder).filter((n) => n.endsWith('.json')).map((n) => ({ n, m: statSync(join(folder, n)).mtimeMs }))
      .sort(byKey((x: { n: string; m: number }) => [x.m, x.n]))
    for (const { n: name } of files) {
      const key = `${stage}/${name}`
      if (seen.has(key)) continue
      seen.add(key)
      s['settled'].push(key)
      let data: unknown
      try { data = jsonLoads(readText(join(folder, name))) } catch { continue }
      if (!isDict(data) || !pyTruthy(data['id'])) continue
      const br = findRow(rows, pyStr(data['id']))
      if (br !== null && settleOne(stage, data, br, idx.get(pyStr(data['id'])) ?? null, s, ph)) touched += 1
    }
  }
  return touched
}

// Move board rows to match what ingest just wrote. `rows` is the whole prospects.csv after the
// write and `newIds` the ids it added. Returns rows touched. No open session: 0.
export function syncAfterIngest(stage: string, rows: Row[], newIds: string[], session: string | null): number {
  const d = session ? asSession(session) : current(false)
  if (!d) return 0
  const idx = new Map<string, Row>(rows.map((r) => [r['id'] as string, r]))
  return locked(d, () => {
    const b = board(d)
    const s = loadState(d)
    const notes = new Notes(d)
    const ph = notes.front['phase'] ?? ''
    let touched = 0
    if (stage === 'sweep') {
      const byLink = new Map<string, Row>(rows.filter((r) => r['link']).map((r) => [canon(r['link']), r]))
      for (const nid of newIds) {
        const r = idx.get(nid)
        if (r === undefined) continue
        addTo(s, 'harvested', nid)
        const lane = r['status'] === 'dropped' ? 'dropped' : 'swept'
        if (lane === 'dropped') addTo(s, 'dropped_at_sweep', nid)
        const key = (r['link'] || '').startsWith('http') ? (r['link'] as string) : nid
        setRow(b, key, {
          id: nid, company: r['company'] ?? '', role: r['role'] ?? '', source: r['source'] ?? '', channel: r['channel'] ?? '',
          lane, owner: '', note: lane === 'dropped' ? tail(r['notes'] || '', 160) : '',
        })
        touched += 1
      }
      for (const br of b) {                                            // a sweeper's provisional row for a role already queued
        if (br['id'] || !br['link']) continue
        const r = byLink.get(canon(br['link']))
        if (r) {
          const st = r['status'] ?? ''
          Object.assign(br, {
            id: r['id'], lane: Object.hasOwn(C.LANE_FOR_STATUS, st) ? C.LANE_FOR_STATUS[st] : 'dropped', owner: '',
            match: r['match'] ?? '', resume: r['resume_variant'] ?? '', updated: stamp(), note: `already in the queue as ${st}`,
          })
          touched += 1
        }
      }
    }
    touched += settle(d, b, s, rows, ph)
    if (touched) notes.log(`ingest ${stage}: ${touched} board rows moved`)
    commit(d, notes, b, s)
    return touched
  })
}

function runIngest(d: string): string {
  const msgs: string[] = []
  for (const stage of C.STAGES) {
    let buf = ''
    const collect: Out = (x) => { buf += x }
    try {
      ingest.ingest(stage, d, false, collect)
    } catch (exc) {
      if (exc instanceof Exit) msgs.push(`${stage}: stopped (${String(exc.code)})`)
      else {
        const e = exc as Error & { problems?: unknown }
        const probs: unknown[] = Array.isArray(e.problems) ? e.problems : []
        msgs.push(`${stage}: ${oneLine(e.message)}` + (probs.length ? ': ' + probs.slice(0, 3).map(oneLine).join('; ') : ''))
      }
    }
    msgs.push(...splitlines(buf).map((ln) => pyStrip(ln)).filter((ln) => ln && !ln.includes('no pending stage files')))
  }
  return msgs.join(' / ')
}

// ------------------------------------------------------------------ the functions behind the commands

function kv(pairs: string[]): Record<string, string> {
  const out: Record<string, string> = Object.create(null)
  for (const p of pairs) {
    const at = p.indexOf('=')
    if (at < 0) throw new Exit(`session: expected key=value, got ${repr(p)}`)
    out[pyStrip(p.slice(0, at))] = p.slice(at + 1)
  }
  return out
}

// Set fields on one row. A lane never moves backwards (matching to swept, say): the old lane and
// owner stay and the rest of the fields apply. `force=yes` lifts that for a deliberate reset.
function boardSet(d: string, key: string, fieldsIn: Record<string, string>): Row {
  const fields: Record<string, string> = { ...fieldsIn }
  const forceRaw = 'force' in fields ? fields['force'] : ''
  delete fields['force']
  const force = ['yes', 'true', '1'].includes(pyStrip(forceRaw).toLowerCase())
  let kept: string | null = null
  const r = locked(d, () => {
    const rows = board(d)
    const s = loadState(d)
    const notes = new Notes(d)
    const old = findRow(rows, key)
    const newLane = fields['lane']
    if (old !== null && !force && newLane !== undefined && Object.hasOwn(C.LANE_RANK, newLane)
        && Object.hasOwn(C.LANE_RANK, old['lane'] || 'swept')
        && C.LANE_RANK[newLane] < C.LANE_RANK[old['lane'] || 'swept']) {
      kept = old['lane'] || 'swept'
      delete fields['lane']
      delete fields['owner']
    }
    const row = setRow(rows, key, fields)
    const lane = fields['lane']
    if (lane !== undefined && Object.hasOwn(C.AGENT, lane) && fields['owner']) {
      const n = rows.filter((x) => x['lane'] === lane && x['owner']).length
      s['peaks'][lane] = Math.max(s['peaks'][lane] ?? 0, n)
    }
    commit(d, notes, rows, s)
    return row
  })
  if (kept) process.stderr.write(`kept lane ${kept}\n`)
  return r
}

// One line under `## Log`. `go-ahead: <message>` also stores the message as go_ahead.
function log(d: string, text: unknown): string {
  const m = GO_AHEAD.exec(pyStrip(pyStr(text)))
  return locked(d, () => {
    const notes = new Notes(d)
    if (m && oneLine(m[1])) {
      if (notes.front['phase'] === 'closed') throw new Exit('session: a closed session takes no go-ahead')
      notes.front['go_ahead'] = oneLine(m[1])
    }
    notes.log(text)
    notes.save()
    return oneLine(text)
  })
}

// Add each named prospects row to the board at the lane its status gives. A row already on the
// board is left alone. Returns the ids added. Exits naming any id that is not in prospects.csv.
export function seedIds(d: string, ids: string[]): string[] {
  const idx = new Map<string, Row>(prospects().map((r) => [r['id'] as string, r]))
  const bad = ids.filter((i) => !idx.has(i))
  if (bad.length) throw new Exit(`session: no prospects row ${bad.join(', ')}`)
  return locked(d, () => {
    const rows = board(d)
    const s = loadState(d)
    const notes = new Notes(d)
    const added: string[] = []
    for (const i of new Set(ids)) {
      if (findRow(rows, i) === null) {
        const p = idx.get(i)!
        rows.push(boardRow(p, `seeded: ${pyStr(p['status'] ?? '')}`))
        added.push(i)
      }
    }
    notes.log(`seeded ${added.join(', ') || 'nothing'}`)
    commit(d, notes, rows, s)
    return added
  })
}

// Move board rows to match a status ingest set by hand (hold, release, skip). No session: 0.
export function syncStatus(ids: string[], session: string | null = null): number {
  const d = session ? asSession(session) : current(false)
  if (!d) return 0
  const idx = new Map<string, Row>(prospects().map((r) => [r['id'] as string, r]))
  return locked(d, () => {
    const rows = board(d)
    const s = loadState(d)
    const notes = new Notes(d)
    let n = 0
    for (const i of ids) {
      const br = findRow(rows, i)
      const r = idx.get(i)
      if (br === null || r === undefined || br['owner']) continue
      const st = r['status'] ?? ''
      const lane = C.CLOSED.has(st) ? 'dropped' : (Object.hasOwn(C.LANE_FOR_STATUS, st) ? C.LANE_FOR_STATUS[st] : br['lane'])
      Object.assign(br, { lane, match: r['match'] ?? '', resume: r['resume_variant'] ?? '', updated: stamp() })
      noteAdd(br, `status ${st}`)
      if (C.HELD_STATUSES.has(st) || C.CLOSED.has(st)) addTo(s, 'no_reclaim', i)
      else if (s['no_reclaim'].includes(i)) s['no_reclaim'].splice(s['no_reclaim'].indexOf(i), 1)
      n += 1
    }
    if (n) notes.log(`board follows status for ${ids.join(', ')}`)
    commit(d, notes, rows, s)
    return n
  })
}

function note(d: string, section: unknown, textIn: unknown): string {
  const heading = pyStrip(pyLstrip(oneLine(section), '#'))
  if (!heading) throw new Exit('session: note needs a section')
  const name = sectionName(heading) ?? heading
  if ((C.MANAGED_SECTIONS as readonly string[]).includes(name)) {
    throw new Exit(`session: ${name} is written by the engine, not by note. note takes ${NOTE_SECTIONS.join(', ')} or any other heading`)
  }
  const text = pyRstrip(pyStr(textIn))
  if (!pyStrip(text)) throw new Exit('session: note needs text')
  let block = text.split('\n')
  if (block.length === 1 && !['- ', '* ', '#', '|', '```', '<!--'].some((x) => pyLstrip(text).startsWith(x))) {
    block = ['- ' + pyStrip(text)]
  }
  locked(d, () => {
    const rows = board(d)
    const s = loadState(d)
    const notes = new Notes(d)
    notes.append(name, block)
    commit(d, notes, rows, s, false)
  })
  return name
}

function sendAdd(d: string, rid: string, kind: string, titleIn: string, body: string): [number, boolean] {
  if (!(SEND_KINDS as readonly string[]).includes(kind)) throw new Exit(`session: --kind must be one of ${SEND_KINDS.join(', ')}`)
  const title = oneLine(titleIn)
  if (!title) throw new Exit('session: send add needs --title')
  const lines = stripBlank(pyStr(body).split('\n')).map((ln) => (pyLstrip(ln).startsWith('#') ? '\\' + ln : ln))
  return locked(d, (): [number, boolean] => {
    const rows = board(d)
    const s = loadState(d)
    const notes = new Notes(d)
    const have = sendEntries(notes.lines('Send list'))
    const dup = have.find((e) => rid && e.id === rid && e.kind === kind)
    if (dup) return [dup.n, false]
    const n = 1 + Math.max(0, ...have.map((e) => e.n))
    notes.append('Send list', [`### ${n}. ${title}`, `<!-- id:${rid} kind:${kind} -->`, '', ...lines])
    notes.log(`send list ${n}: ${kind} ${rid}`)
    commit(d, notes, rows, s, false)
    return [n, true]
  })
}

const SWEEP_SUMS = ['pages', 'kept']                                  // keys a sweep agent adds up across calls
const DIGITS_ONLY = /^\p{Nd}+(?![\s\S])/u

// Fold one `session sweep` call into a source's record. `query` is appended to `queries`
// (a repeated query is listed once), `pages` and `kept` add up, every other key replaces.
function mergeSweep(cur: State, fields: Record<string, string>): void {
  if (typeof cur['query'] === 'string') {                            // a record written before queries was a list
    if (!('queries' in cur)) cur['queries'] = []
    cur['queries'].push(cur['query'])
    delete cur['query']
  }
  for (const [k, v] of Object.entries(fields)) {
    if (k === 'query') {
      if (!('queries' in cur)) cur['queries'] = []
      const qs: string[] = cur['queries']
      if (pyStrip(v) && !qs.includes(pyStrip(v))) qs.push(pyStrip(v))
    } else if (SWEEP_SUMS.includes(k) && DIGITS_ONLY.test(pyLstrip(pyStrip(v), '-'))
               && DIGITS_ONLY.test(pyLstrip(pyStr(k in cur ? cur[k] : 0), '-'))) {
      cur[k] = pyInt(pyStr(k in cur ? cur[k] : 0)) + pyInt(pyStrip(v))
    } else cur[k] = v
  }
}

export function sweepLine(d: string, sourceIn: string, fields: Record<string, string>): string {
  const source = pyStrip(sourceIn)
  return locked(d, () => {
    const rows = board(d)
    const s = loadState(d)
    const notes = new Notes(d)
    if (!(source in s['sweeps'])) s['sweeps'][source] = {}
    const cur: State = s['sweeps'][source]
    mergeSweep(cur, fields)
    const status = pyStrip(pyStr(pyTruthy(cur['status']) ? cur['status'] : (pyTruthy(cur['result']) ? cur['result'] : '')))
    const reason = pyStrip(pyStr(pyTruthy(cur['reason']) ? cur['reason'] : ''))
    const parts: string[] = []
    if (pyTruthy(cur['queries'])) parts.push('queries ' + cur['queries'].map((q: string) => `"${q}"`).join('; '))
    for (const [k, v] of Object.entries(cur)) {
      if (!['status', 'result', 'reason', 'queries'].includes(k)) parts.push(`${k} ${pyStr(v)}`)
    }
    if (status) parts.push(status)
    const line = `- ${source}: ${parts.join(', ')}` + (reason ? ` (${reason})` : '')
    const sec = notes.lines('Sweeps')
    const at = sec.findIndex((ln) => ln.startsWith(`- ${source}:`))
    if (at < 0) sec.push(line)
    else sec[at] = line
    const listOf = (v: unknown): string[] => (Array.isArray(v) ? v as string[] : [])
    let swept = listOf(notes.front['sources_swept']).filter((x) => x !== source)
    let failed = listOf(notes.front['sources_failed']).filter((x) => x !== source)
    if (SWEEP_OK.includes(status.toLowerCase())) {
      swept.push(source)
      notes.log(`sweep ${source} finished`)
    } else if (status) {
      failed.push(source)
      notes.log(pyStrip(`sweep ${source} stopped: ${status} ${reason}`))
    } else {
      swept = listOf(notes.front['sources_swept'])
      failed = listOf(notes.front['sources_failed'])
    }
    notes.front['sources_swept'] = swept
    notes.front['sources_failed'] = failed
    commit(d, notes, rows, s, false)
    return line
  })
}

// `match=<n> tailor=<n> apply=<n>` from the lane peaks, then `; serial: <reason>` when given.
function fanOutText(s: State, serial: string | null = null): string {
  const pk = s['peaks']
  const text = `match=${pk['matching'] ?? 0} tailor=${pk['tailoring'] ?? 0} apply=${pk['applying'] ?? 0}`
  return serial ? `${text}; serial: ${serial}` : text
}

function setPhase(d: string, phase: string, serialIn: string | null = null): string {
  if (!(C.PHASES as readonly string[]).includes(phase)) throw new Exit(`session: phase must be one of ${C.PHASES.join(', ')}`)
  const serial = serialIn ? oneLine(serialIn) : null
  if (serial !== null && phase !== 'closed') throw new Exit('session: --serial goes with `phase closed` only')
  if (serial !== null && !serial) throw new Exit('session: --serial needs a reason')
  locked(d, () => {
    const rows = board(d)
    const s = loadState(d)
    const notes = new Notes(d)
    notes.front['phase'] = phase
    if (phase === 'closed') notes.front['fan_out'] = fanOutText(s, serial)
    notes.log(`phase ${phase}`)
    commit(d, notes, rows, s, false)
  })
  return phase
}

function started(d: string, tags: string[]): void {
  locked(d, () => {
    const rows = board(d)
    const s = loadState(d)
    const notes = new Notes(d)
    for (const t of tags) {
      addTo(s, 'background', t)
      addTo(s, 'background_seen', t)
    }
    notes.log(`dispatched ${tags.join(', ')}`)
    commit(d, notes, rows, s, false)
  })
}

function nextRows(d: string, lane: string, limit: number | null = null, doClaim = false): Dict[] {
  if (!Object.hasOwn(C.AGENT, lane)) throw new Exit(`session: next takes one of ${Object.keys(C.AGENT).join(', ')}`)
  const caps = C.cfg().caps
  return locked(d, () => {
    const rows = board(d)
    const s = loadState(d)
    const notes = new Notes(d)
    const prows = prospects()
    const ph = notes.front['phase'] ?? ''
    const out = claim(d, lane, limit === null ? caps[lane] : limit, rows, s, prows, doClaim, ph, notes.front['go_ahead'] ?? '')
    if (doClaim) {
      if (out.length) notes.log(`claimed for ${lane}: ${out.map((o) => o['tag']).join(', ')}`)
      commit(d, notes, rows, s)
    }
    return out
  })
}

function tick(d: string, returned: string[] = [], doIngest = true): Dict {
  const ingestOut = doIngest ? runIngest(d) : ''
  const c = C.cfg()
  const lanes = ['matching', 'tailoring', 'applying']
  let left = new Map<string, number>()
  let waiting = 0
  let drained = false
  let heldBack = 0
  let held: unknown = 0
  let ph: unknown = ''
  let goAhead = ''
  let inFlight: string[] = []
  let rows: Row[] = []
  let s: State = {}
  const dispatch: Dict[] = []
  const stopped: string[] = []                                         // ids to hold after the lock: ingest.hold takes the session lock itself
  locked(d, () => {
    rows = board(d)
    s = loadState(d)
    const notes = new Notes(d)
    const prows = prospects()
    ph = notes.front['phase'] ?? ''
    settle(d, rows, s, prows, ph)
    for (const tag of returned) {
      if (s['background'].includes(tag)) s['background'].splice(s['background'].indexOf(tag), 1)
      for (const r of rows) {
        if (r['owner'] === tag && r['lane'] !== undefined && Object.hasOwn(C.FALLBACK, r['lane'])) {
          const id = r['id'] as string
          if (dedupe.reservationFor(id) !== null) {                    // the form may have gone out, so the row is held, not retried
            Object.assign(r, { owner: '', updated: stamp() })
            noteAdd(r, `${tag} returned with no stage file; the opening is reserved`)
            addTo(s, 'no_reclaim', id)
            stopped.push(id)
            continue
          }
          const n = s['attempts'][id] = (s['attempts'][id] ?? 0) + 1
          const back = n >= c.max_attempts ? 'blocked' : C.FALLBACK[r['lane']]
          Object.assign(r, { lane: back, owner: '', updated: stamp() })
          noteAdd(r, `${tag} returned with no stage file`)
        }
      }
      for (const r of rows) {                                          // a tag that came back holds nothing, whatever the lane
        if (r['owner'] === tag) Object.assign(r, { owner: '', updated: stamp() })
      }
      notes.log(`returned ${tag}`)
    }
    for (const r of rows) {                                            // a swept row has no owner but a sweeper's tag
      if (r['lane'] === 'swept' && r['owner'] && !s['background'].includes(r['owner'])) Object.assign(r, { owner: '', updated: stamp() })
    }
    goAhead = pyStrip(pyStr(pyTruthy(notes.front['go_ahead']) ? notes.front['go_ahead'] : ''))
    if (ph === 'running') {
      for (const lane of ['applying', 'tailoring', 'matching']) {      // downstream first keeps rows moving
        const free = c.caps[lane] - rows.filter((r) => r['lane'] === lane && r['owner']).length
        if (free > 0) dispatch.push(...claim(d, lane, free, rows, s, prows, true, ph, goAhead))
      }
    }
    // Rows still eligible after this tick's claims. While agents run they wait for a free slot. Once
    // the lanes drain, every one of them is held back by a budget, so `drained` never hides them.
    // Applying rows without a go-ahead are counted apart: they wait for the next hunt, not a budget.
    left = new Map()
    if (ph === 'running') for (const lane of lanes) left.set(lane, eligible(d, lane, rows, s, prows, ph).length)
    waiting = 0
    if (!goAhead) {
      waiting = left.get('applying') ?? 0
      left.delete('applying')
    }
    inFlight = inFlightOf(rows)
    drained = ph === 'running' && !dispatch.length && !inFlight.length && !s['background'].length
    heldBack = drained ? [...left.values()].reduce((a, b) => a + b, 0) : 0
    s['held_back'] = heldBack
    if (ingestOut) notes.log(`ingest: ${ingestOut}`)
    if (dispatch.length) notes.log(`dispatch ${dispatch.map((x) => x['tag']).join(', ')}`)
    if (drained) {
      notes.log(`lanes drained in phase ${pyStr(ph)}; held_back ${heldBack} (${[...left].map(([k, v]) => `${k} ${v}`).join(', ')})`
        + (waiting ? `; ${waiting} rows wait for a go-ahead` : ''))
    }
    commit(d, notes, rows, s)
    held = notes.front['held'] ?? 0
  })
  for (const id of stopped) {
    try {
      ingest.hold([id], `STOPPED: the applier returned with no result after the opening was reserved. ${CHECK_BEFORE_RESEND}`, d)
    } catch (exc) {
      log(d, `could not hold ${id}: ${oneLine((exc as Error).message)}`)
    }
  }
  if (stopped.length) {                                                // the hold moved board rows and counters after the snapshot above
    rows = board(d)
    held = readFront(join(d, NOTES))['held'] ?? 0
  }
  const filed = fileApplications(d)                                    // after the lock: the filer reads notes.md
  const out: Dict = {
    session: rel(d), phase: ph, go_ahead: !!goAhead, ingest: ingestOut,
    lanes: new Map([...laneCounts(rows)].filter(([, v]) => v)), background: s['background'],
    in_flight: inFlight, dispatch, drained, held_back: heldBack, held,
  }
  if (!drained && left.size) out['eligible_left'] = [...left.values()].reduce((a, b) => a + b, 0)
  if (waiting) out['waiting_for_go_ahead'] = waiting
  if (filed.length) out['filed'] = filed
  return out
}

// File every apply stage file in this session whose outcome is `applied` and whose id has no application folder yet.
// A failure never fails the tick: it warns, writes the session log and adds a `blocked` finding for /retro.
// Returns the folders filed, as `<id>: <folder>`.
function fileApplications(d: string): string[] {
  const filed: string[] = []
  const have = applications.filedIds()
  const ids = new Set<string>()
  const base = join(d, C.STAGE_DIR, 'apply')
  for (const folder of [base, join(base, 'done')]) {
    if (!isDir(folder)) continue
    for (const name of scandirNames(folder).filter((n) => n.endsWith('.json')).sort()) {
      let data: unknown
      try { data = jsonLoads(readText(join(folder, name))) } catch { continue }
      if (isDict(data) && data['outcome'] === 'applied' && pyTruthy(data['id'])) ids.add(pyStr(data['id']))
    }
  }
  for (const rid of ids) {
    if (have.has(rid)) continue
    try {
      const res = applications.fileApplication(rid, d)
      filed.push(`${rid}: ${basename(C.APPLICATIONS)}/${res.folder}`)
      log(d, `application filed ${rid} in ${basename(C.APPLICATIONS)}/${res.folder}`)
    } catch (exc) {
      const why = oneLine(exc instanceof Exit ? String(exc.code) : (exc as Error).message)
      const msg = `application filing failed for ${rid}: ${why}`
      // Every tick retries, so one finding stands for the fault, not one per tick.
      if (readText(join(d, NOTES)).includes(msg)) continue
      process.stderr.write(`warning: ${msg}\n`)
      log(d, msg)
      try {
        findingAdd(d, {
          kind: 'blocked', stage: 'apply', id: rid, summary: msg, evidence: why,
          proposed: { reason: `The form for ${rid} went out but its application folder could not be built: ${why}`,
            action_for_candidate: `Run \`node process/engine.ts application file ${rid}\` once the cause is fixed.` },
        })
      } catch { /* the log line above stays */ }
    }
  }
  return filed
}

function retroDone(d: string): void {
  locked(d, () => {
    const rows = board(d)
    const s = loadState(d)
    const notes = new Notes(d)
    notes.front['retro_done'] = 'yes'
    notes.log('retro done')
    commit(d, notes, rows, s, false)
  })
}

// ------------------------------------------------------------------ findings

function clean(v: unknown): string {
  return oneLine(v).replaceAll(SEP.trim(), '/')
}

function checkFinding(obj: unknown): Dict {
  if (!isDict(obj)) throw new Exit('session: a finding is a JSON object')
  const kind = obj['kind']
  if (typeof kind !== 'string' || !(C.FINDING_KINDS as readonly string[]).includes(kind)) {
    throw new Exit(`session: finding kind must be one of ${C.FINDING_KINDS.join(', ')}`)
  }
  const text = (v: unknown): string => (pyTruthy(v) ? pyStr(v) : '')
  for (const k of ['stage', 'summary']) {
    if (!pyStrip(text(obj[k]))) throw new Exit(`session: finding needs ${repr(k)}`)
  }
  const proposed = obj['proposed']
  if (!isDict(proposed)) throw new Exit("session: finding needs 'proposed' as an object")
  const gone = C.FINDING_PROPOSED[kind].filter((k) => !pyStrip(text(proposed[k])))
  if (gone.length) throw new Exit(`session: a ${kind} finding needs proposed.${gone.join(', proposed.')}`)
  const state = pyTruthy(obj['state']) ? obj['state'] : 'open'
  if (typeof state !== 'string' || !(C.FINDING_STATES as readonly string[]).includes(state)) {
    throw new Exit(`session: finding state must be one of ${C.FINDING_STATES.join(', ')}`)
  }
  const data: Dict = {
    kind, stage: pyStrip(pyStr(obj['stage'])), id: pyStrip(text(obj['id'])), source: pyStrip(text(obj['source'])),
    date: pyTruthy(obj['date']) ? pyStr(obj['date']) : strftime('%Y-%m-%d', now()), summary: oneLine(obj['summary']),
    evidence: pyTruthy(obj['evidence']) ? obj['evidence'] : '', proposed,
  }
  const order = Object.keys(data)
  for (const k of pyKeys(obj)) {
    if (!(k in data) && k !== 'state') { data[k] = obj[k]; order.push(k) }
  }
  data['state'] = state
  return markOrder(data, [...order, 'state'])
}

function comment(data: Dict): string {
  const escaped = String.fromCharCode(92) + 'u003e'
  return `<!-- finding ${pyJson(data, { ensureAscii: false }).replaceAll('-->', '--' + escaped)} -->`
}

// Append one finding under `## Findings`. Returns its id, "F-n".
export function findingAdd(session: string | null | undefined, objIn: unknown): string {
  let obj = objIn
  if (typeof obj === 'string') {
    try { obj = jsonLoads(obj) } catch (e) { throw new Exit(`session: finding is not JSON: ${(e as Error).message}`) }
  }
  const data = checkFinding(obj)
  const d = (session ? asSession(session) : null) || current()
  return locked(d, () => {
    const rows = board(d)
    const s = loadState(d)
    const notes = new Notes(d)
    const n = 1 + Math.max(0, ...findingEntries(notes.lines('Findings')).map((e) => e.n))
    const head = [`### F-${n}`, data['kind'], clean(data['stage']), clean(data['id']) || '-', data['state']].join(SEP)
    notes.append('Findings', [head, data['summary'] as string, comment(data)])
    notes.log(`finding F-${n} ${data['kind']} from ${data['stage']}`)
    commit(d, notes, rows, s, false)
    return `F-${n}`
  })
}

// Change one finding's state token and the state in its JSON copy. Returns fid.
export function findingSet(session: string | null | undefined, fid: string, state: string): string {
  if (!(C.FINDING_STATES as readonly string[]).includes(state)) {
    throw new Exit(`session: finding state must be one of ${C.FINDING_STATES.join(', ')}`)
  }
  const m = /^F-(\p{Nd}+)(?![\s\S])/u.exec(pyStrip(pyStr(fid)))
  if (!m) throw new Exit(`session: expected a finding id like F-3, got ${repr(fid)}`)
  const want = pyInt(m[1])
  const d = (session ? asSession(session) : null) || current()
  return locked(d, () => {
    const rows = board(d)
    const s = loadState(d)
    const notes = new Notes(d)
    const sec = notes.lines('Findings')
    const e = findingEntries(sec).find((x) => x.n === want)
    if (e === undefined) throw new Exit(`session: no finding F-${want} in ${rel(d)}`)
    const parts = sec[e.line].split(SEP)
    parts[parts.length - 1] = state
    sec[e.line] = parts.join(SEP)
    for (let j = e.line + 1; j < sec.length; j++) {
      if (FINDING_HEAD.test(sec[j])) break
      const cm = FINDING_COMMENT.exec(sec[j])
      if (cm) {
        try {
          const data = jsonLoads(cm[1]) as Dict
          data['state'] = state
          sec[j] = comment(data)
        } catch { /* ValueError: leave the copy as it is */ }
        break
      }
    }
    // An email finding's EM block follows it: applied is sent, declined stays declined, asked is open.
    const em = notes.lines('Emails')
    const at = em.findIndex((ln, i) => /^- finding: F-\p{Nd}+$/u.test(ln) && ln === `- finding: F-${want}` && /^### EM-/u.test(em[i - 1] ?? ''))
    if (at > 0 && state !== 'open') {
      const parts = em[at - 1].split(SEP)
      parts[parts.length - 1] = state === 'applied' ? 'sent' : state === 'declined' ? 'declined' : 'open'
      em[at - 1] = parts.join(SEP)
    }
    notes.log(`finding F-${want} ${state}`)
    commit(d, notes, rows, s, false)
    return `F-${want}`
  })
}

// ------------------------------------------------------------------ main

function readBody(path: string): string {
  if (path === '-') {
    let raw = ''
    try { raw = decodeStrict(readFileSync(0)) } catch { raw = '' }
    return raw
  }
  try {
    return readText(path)
  } catch (exc) {
    if (exc instanceof PyExc) throw exc
    throw new Exit(`session: cannot read ${path}: ${(exc as Error).message}`)
  }
}

// A small argparse: long options by unique prefix, `--opt=value`, `-h`, and positionals in order.
interface Opt { name: string; dest: string; kind: 'str' | 'bool' | 'int' | 'star'; required?: boolean; choices?: readonly string[]; metavar?: string }
interface Pos { dest: string; nargs: 1 | '+' | '*'; choices?: readonly string[] }
interface Spec { key: string; opts: Opt[]; pos: Pos[] }

class Usage extends Error {}
class Help extends Error {}

const NEGATIVE_NUMBER = /^-\p{Nd}+$|^-\p{Nd}*\.\p{Nd}+$/u
const isFlag = (t: string): boolean => t.length > 1 && t.startsWith('-') && !NEGATIVE_NUMBER.test(t) && !t.includes(' ')

const SPECS: Record<string, Spec> = {
  open: { key: 'open', opts: [{ name: '--browser', dest: 'browser', kind: 'str' }, { name: '--lanes', dest: 'lanes', kind: 'star' }], pos: [] },
  new: { key: 'new', opts: [{ name: '--browser', dest: 'browser', kind: 'str' }, { name: '--no-seed', dest: 'noSeed', kind: 'bool' },
    { name: '--lanes', dest: 'lanes', kind: 'star' }, { name: '--go-ahead', dest: 'goAhead', kind: 'str' }], pos: [] },
  seed: { key: 'seed', opts: [], pos: [{ dest: 'ids', nargs: '+' }] },
  find: { key: 'find', opts: [], pos: [] },
  resume: { key: 'resume', opts: [], pos: [] },
  'last-started': { key: 'last-started', opts: [], pos: [] },
  'ea-window': { key: 'ea-window', opts: [], pos: [] },
  'close-abandoned': { key: 'close-abandoned', opts: [{ name: '--reason', dest: 'reason', kind: 'str', metavar: 'TEXT' }], pos: [{ dest: 'run', nargs: 1 }] },
  board: { key: 'board', opts: [], pos: [{ dest: 'action', nargs: 1, choices: ['set'] }, { dest: 'key', nargs: 1 }, { dest: 'pairs', nargs: '+' }] },
  log: { key: 'log', opts: [], pos: [{ dest: 'text', nargs: '+' }] },
  note: { key: 'note', opts: [], pos: [{ dest: 'section', nargs: 1 }, { dest: 'text', nargs: '+' }] },
  send: {
    key: 'send',
    opts: [{ name: '--id', dest: 'id', kind: 'str' }, { name: '--kind', dest: 'kind', kind: 'str', required: true, choices: SEND_KINDS },
      { name: '--title', dest: 'title', kind: 'str', required: true }, { name: '--body-file', dest: 'bodyFile', kind: 'str', required: true }],
    pos: [{ dest: 'action', nargs: 1, choices: ['add'] }],
  },
  sweep: { key: 'sweep', opts: [], pos: [{ dest: 'source', nargs: 1 }, { dest: 'pairs', nargs: '*' }] },
  phase: { key: 'phase', opts: [{ name: '--serial', dest: 'serial', kind: 'str', metavar: 'REASON' }], pos: [{ dest: 'phase', nargs: 1, choices: C.PHASES }] },
  started: { key: 'started', opts: [], pos: [{ dest: 'tags', nargs: '+' }] },
  next: {
    key: 'next',
    opts: [{ name: '--limit', dest: 'limit', kind: 'int' }, { name: '--claim', dest: 'claim', kind: 'bool' }],
    pos: [{ dest: 'lane', nargs: 1, choices: Object.keys(C.AGENT) }],
  },
  tick: { key: 'tick', opts: [{ name: '--returned', dest: 'returned', kind: 'star' }, { name: '--no-ingest', dest: 'noIngest', kind: 'bool' }], pos: [] },
  'retro-done': { key: 'retro-done', opts: [], pos: [] },
  'finding add': { key: 'finding add', opts: [{ name: '--json', dest: 'json', kind: 'str', required: true }], pos: [] },
  'finding set': {
    key: 'finding set', opts: [],
    pos: [{ dest: 'fid', nargs: 1 }, { dest: 'state', nargs: 1, choices: C.FINDING_STATES }],
  },
}

const choiceList = (xs: readonly string[]): string => xs.map(repr).join(', ')

// Parse one level. `--session` and `-h` are accepted everywhere. Returns the values by dest.
function parseLevel(spec: Spec, argv: string[], session: { value: string | null }): Record<string, unknown> {
  const longs = [...spec.opts.map((o) => o.name), '--session', '--help']
  const got: Record<string, unknown> = {}
  const loose: string[] = []
  const extra: string[] = []
  let i = 0
  let onlyPos = false
  while (i < argv.length) {
    const t = argv[i]
    if (onlyPos || !isFlag(t)) { loose.push(t); i += 1; continue }
    if (t === '--') { onlyPos = true; i += 1; continue }
    if (t === '-h') throw new Help()
    let name = t
    let inline: string | null = null
    if (t.startsWith('--')) {
      const eq = t.indexOf('=')
      if (eq >= 0) { name = t.slice(0, eq); inline = t.slice(eq + 1) }
      if (!longs.includes(name)) {
        const hits = longs.filter((l) => l.startsWith(name))
        if (hits.length > 1) throw new Usage(`ambiguous option: ${name} could match ${hits.join(', ')}`)
        if (hits.length === 0) { extra.push(t); i += 1; continue }
        name = hits[0]
      }
    } else { extra.push(t); i += 1; continue }
    i += 1
    if (name === '--help') throw new Help()
    const opt: Opt = name === '--session' ? { name, dest: 'session', kind: 'str' } : spec.opts.find((o) => o.name === name)!
    if (opt.kind === 'bool') {
      if (inline !== null) throw new Usage(`argument ${name}: ignored explicit argument ${repr(inline)}`)
      got[opt.dest] = true
      continue
    }
    const vals: string[] = []
    if (inline !== null) vals.push(inline)
    else if (opt.kind === 'star') { while (i < argv.length && !isFlag(argv[i])) vals.push(argv[i++]) }
    else {
      if (i >= argv.length || isFlag(argv[i])) throw new Usage(`argument ${name}: expected one argument`)
      vals.push(argv[i++])
    }
    if (opt.kind === 'star') { got[opt.dest] = vals; continue }
    const v = vals[0]
    if (opt.choices && !opt.choices.includes(v)) {
      throw new Usage(`argument ${name}: invalid choice: ${repr(v)} (choose from ${choiceList(opt.choices)})`)
    }
    if (opt.dest === 'session') { session.value = v; continue }
    if (opt.kind === 'int') {
      try { got[opt.dest] = pyInt(v) } catch { throw new Usage(`argument ${name}: invalid int value: ${repr(v)}`) }
    } else got[opt.dest] = v
  }
  const missing = spec.opts.filter((o) => o.required && !(o.dest in got)).map((o) => o.name)
  let at = 0
  const gone: string[] = []
  for (const p of spec.pos) {
    const take = p.nargs === 1 ? loose.slice(at, at + 1) : loose.slice(at)
    if ((p.nargs === 1 || p.nargs === '+') && take.length === 0) { gone.push(p.dest); continue }
    for (const v of take) {
      if (p.choices && !p.choices.includes(v)) {
        throw new Usage(`argument ${p.dest}: invalid choice: ${repr(v)} (choose from ${choiceList(p.choices)})`)
      }
    }
    at += take.length
    got[p.dest] = p.nargs === 1 ? take[0] : take
  }
  if (gone.length || missing.length) throw new Usage(`the following arguments are required: ${[...gone, ...missing].join(', ')}`)
  const rest = [...loose.slice(at), ...extra]
  if (rest.length) throw new Usage(`unrecognized arguments: ${rest.join(' ')}`)
  return got
}

function usageOf(key: string): string {
  const text = HELP[key]
  const at = text.indexOf('\n\n')
  return (at < 0 ? text : text.slice(0, at)) + '\n'
}

export function main(argv: string[], out: Out = (s) => { process.stdout.write(s) }): number {
  const session: { value: string | null } = { value: null }
  let key = ''
  let args: Record<string, unknown> = {}
  try {
    // Main level: --session and -h, then the command.
    let i = 0
    let cmd: string | null = null
    while (i < argv.length) {
      const t = argv[i]
      if (t === '-h' || (t.length > 2 && t.startsWith('--') && '--help'.startsWith(t.split('=')[0]))) throw new Help()
      if (t.startsWith('--session=')) { session.value = t.slice(10); i += 1; continue }
      if (t.length > 3 && t.startsWith('--s') && '--session'.startsWith(t)) {
        if (i + 1 >= argv.length) throw new Usage('argument --session: expected one argument')
        session.value = argv[i + 1]
        i += 2
        continue
      }
      if (isFlag(t)) throw new Usage(`unrecognized arguments: ${t}`)
      cmd = t
      i += 1
      break
    }
    if (cmd === null) throw new Usage('the following arguments are required: cmd')
    if (!(cmd in SPECS) && cmd !== 'finding') {
      const names = [...Object.keys(SPECS).filter((k) => !k.includes(' ')), 'finding']
      throw new Usage(`argument cmd: invalid choice: ${repr(cmd)} (choose from ${choiceList(names)})`)
    }
    let rest = argv.slice(i)
    key = cmd
    if (cmd === 'finding') {
      const sub: Spec = { key: 'finding', opts: [], pos: [{ dest: 'faction', nargs: 1, choices: ['add', 'set'] }] }
      // Find the action: the first token that is not a --session option.
      let j = 0
      while (j < rest.length) {
        if (rest[j] === '--session' || (rest[j].startsWith('--s') && rest[j].length > 3 && '--session'.startsWith(rest[j]))) { j += 2; continue }
        if (rest[j].startsWith('--session=')) { j += 1; continue }
        break
      }
      if (j >= rest.length || isFlag(rest[j])) parseLevel(sub, rest, session)
      const faction = rest[j]
      if (faction !== 'add' && faction !== 'set') throw new Usage(`argument faction: invalid choice: ${repr(faction)} (choose from 'add', 'set')`)
      key = `finding ${faction}`
      rest = [...rest.slice(0, j), ...rest.slice(j + 1)]
    }
    args = parseLevel(SPECS[key], rest, session)
  } catch (e) {
    if (e instanceof Help) {
      out(HELP[key === 'finding add' || key === 'finding set' ? key : key])
      return 0
    }
    if (e instanceof Usage) {
      const k = HELP[key] ? key : ''
      process.stderr.write(`${usageOf(k)}${k ? HELP[k].split(' ').slice(0, 3).join(' ').replace(/^usage: /, '') : 'engine.ts session'}: error: ${e.message}\n`)
      return 2
    }
    throw e
  }
  const arg = session.value
  const str = (k: string): string => args[k] as string
  const list = (k: string): string[] => args[k] as string[]
  const print = (s: string): void => out(s + '\n')

  const lanes = (args['lanes'] as string[] | undefined) ?? []
  if ((key === 'new' || key === 'open') && notLive(lanes).length) {
    process.stderr.write(`STOP: not a live lane: ${notLive(lanes).join(', ')}. Live lanes: ${C.cfg().live_sources.filter((l) => C.runnerPath(l) !== null).join(', ') || 'none'}\n`)
    return 2
  }
  const paused = key === 'new' || key === 'open' ? pausedLine(lanes.length ? lanes : C.cfg().live_sources) : ''
  if (paused) process.stderr.write(paused + '\n')
  if (key === 'new' || key === 'open' || key === 'resume') {
    // A /retro sitting owns the ledger and the browser. Its own submit run may start a folder, and nothing else may.
    const submit = key === 'new' && !!args['noSeed'] && pyStr(args['goAhead'] ?? '').startsWith(RETRO_SUBMIT)
    const retro = submit ? [] : C.liveRuns([C.RETRO_SUFFIX])
    if (retro.length) {
      process.stderr.write(`STOP: a /retro sitting is open in ${rel(retro[retro.length - 1])}. Stop the hunt and report this line to the candidate. Do not close that folder or start another session.\n`)
      return 2
    }
  }
  // Test the folder each command would act on, so a hunt never resumes a rerun's session (go-ahead set by server/held.ts) or starts one beside it.
  if (key === 'new' || key === 'open' || key === 'resume') {
    const busy = key === 'new' ? findOpen() : resolve(arg, false)
    if (busy && phaseOf(busy) !== 'closed' && pyStr(readFront(join(busy, NOTES))['go_ahead'] ?? '').startsWith('Dashboard rerun ')) {
      process.stderr.write(`STOP: a dashboard rerun is working in ${rel(busy)}. Stop the hunt and report this line to the candidate. Do not close that folder or start another session.\n`)
      return 2
    }
  }
  if (key === 'new') {
    print(rel(newSession((args['browser'] as string | undefined) ?? null, !args['noSeed'], lanes, (args['goAhead'] as string | undefined) ?? '')))
    return 0
  }
  if (key === 'open') {
    let d = resolve(arg, false)
    let lost: string[] = []
    let mode = 'resumed'
    while (d && isRetroSubmit(d)) {                                    // a /retro submit run left open is closed, never resumed
      closeAbandoned(d, 'a new hunt opened while this /retro submit run was still open')
      d = arg ? null : resolve(null, false)
    }
    if (d) lost = resetInFlight(d, lanes)[1]
    else { d = newSession((args['browser'] as string | undefined) ?? null, true, lanes); mode = 'new' }
    const front = readFront(join(d, NOTES))
    print(pyJson({ session: rel(d), path: d, mode, phase: front['phase'] ?? '', browser: front['browser'] ?? '', redispatch_background: lost }))
    return 0
  }
  if (key === 'find') {
    const d = resolve(arg, false)
    print(d ? `${rel(d)} ${phaseOf(d)}` : 'none')
    return 0
  }
  if (key === 'resume') {
    const d = resolve(arg, false)
    if (!d) {
      process.stderr.write('session: no open session to resume\n')
      return 3
    }
    resetInFlight(d)
    print(rel(d))
    return 0
  }
  if (key === 'last-started') {
    print(lastStarted() || 'none')
    return 0
  }
  if (key === 'ea-window') {
    print(eaWindow())
    return 0
  }
  if (key === 'close-abandoned') {
    const run = asSession(str('run'))
    if (!run) {
      process.stderr.write(`session: no session at ${str('run')}\n`)
      return 3
    }
    if (phaseOf(run) === 'closed') {
      print(`${rel(run)} is already closed`)
      return 0
    }
    const heldIds = closeAbandoned(run, (args['reason'] as string | undefined) ?? undefined)
    print(`closed ${rel(run)}; held ${heldIds.length}${heldIds.length ? ': ' + heldIds.join(' ') : ''}`)
    return 0
  }
  if (key === 'finding add') {
    const j = str('json')
    const raw = j.startsWith('@') ? readBody(j.slice(1)) : j
    print(findingAdd(arg, raw))
    return 0
  }
  if (key === 'finding set') {
    print(findingSet(arg, str('fid'), str('state')))
    return 0
  }

  const d = resolve(arg)
  if (key === 'board') print(pyJson(boardSet(d, str('key'), kv(list('pairs')))))
  else if (key === 'log') print(`logged: ${log(d, list('text').join(' '))}`)
  else if (key === 'note') print(`noted: ${note(d, str('section'), list('text').join(' '))}`)
  else if (key === 'send') {
    const [n, added] = sendAdd(d, (args['id'] as string | undefined) ?? '', str('kind'), str('title'), readBody(str('bodyFile')))
    print(`send list: entry ${n}` + (added ? '' : ' (already listed)'))
  } else if (key === 'sweep') print(sweepLine(d, str('source'), kv(list('pairs'))))
  else if (key === 'phase') {
    if (args['serial'] !== undefined && args['phase'] !== 'closed') {
      process.stderr.write(`${usageOf('')}engine.ts session: error: --serial goes with \`phase closed\` only\n`)
      return 2
    }
    print(setPhase(d, str('phase'), (args['serial'] as string | undefined) ?? null))
  } else if (key === 'started') started(d, list('tags'))
  else if (key === 'next') print(pyJson(nextRows(d, str('lane'), (args['limit'] as number | undefined) ?? null, !!args['claim']), { indent: 1 }))
  else if (key === 'tick') print(pyJson(tick(d, (args['returned'] as string[] | undefined) ?? [], !args['noIngest']), { indent: 1 }))
  else if (key === 'seed') print(pyJson({ seeded: seedIds(d, list('ids')) }))
  else if (key === 'retro-done') {
    retroDone(d)
    print('retro_done: yes')
  }
  return 0
}

// argparse help text, captured from `node process/engine.ts session <command> --help` with engine.ts changed to engine.ts.
const HELP: Record<string, string> = {
  "": "usage: engine.ts session [-h] [--session SESSION]\n                         {open,new,seed,find,resume,last-started,ea-window,close-abandoned,board,log,note,send,sweep,phase,started,next,tick,retro-done,finding} ...\n\nThe one writer of a hunt session folder. Every agent and the parent write through it.\n\n    node process/engine.ts [--session DIR] session <command> ...\n    node process/engine.ts [--session DIR] finding add --json '<obj>' | finding set F-n <state>\n\n`--session DIR` may come before `session`, between `session` and the command, or after the command.\nWithout it the open session is used (or JOBHUNT_SESSION).\n\nA session is `constants.SESSIONS/<DDMonYYYY-HHMM>-hunt/`, such as `13Oct2026-1155-hunt`. It shows `notes.md` and `board.csv`, and\nkeeps its machine state in `.stage/`, `.state.json` and `.lock`. notes.md is flat front-matter\nfollowed by the body sections in constants.NOTES_SECTIONS order, with `## Log` last. The schema is\nin process/contracts.md.\n\nCommands\n    open [--lanes L ...]          resume the newest open session, else start one. A resume clears\n                                  go_ahead, so the parent logs the go-ahead again. --lanes limits the\n                                  run to those live lanes; without it the run works every live lane\n    new [--browser ID] [--no-seed] [--lanes L ...] [--go-ahead TEXT]   start a session, seed its board from the queue,\n                                  print its path. --no-seed starts an empty board, for a /retro submit run.\n                                  --go-ahead logs the go-ahead as the folder is made. open, resume and new exit 2 while a\n                                  dashboard rerun's session is open, and while a /retro sitting is open. The one exception is\n                                  new --no-seed --go-ahead \"Retro submit ...\", which the sitting's own submit run makes.\n                                  open closes, and does not resume, an open session whose go-ahead starts \"Retro submit \"\n    seed <id> ...                 add named prospects rows to the board at the lane their status gives\n    find                          print the open session's path and phase, or \"none\". Writes nothing\n    resume                        reset rows left in flight by a killed hunt. Exit 3 if none is open\n    last-started                  start time of the newest closed session that swept a source, or \"none\"\n    ea-window                     `r<seconds>`: the time since the newest closed session that swept linkedin-ea started, held\n                                  between search.linkedin_ea_window_min_minutes and ..._max_minutes. The longest window if none\n    close-abandoned <run> [--reason TEXT]   close a run that was left open. Each row it had in flight is held with\n                                  STOPPED, because its form may have gone out, and the phase is set to closed\n    board set <id|link> k=v ...   set board fields on one row; a link that matches no row adds one\n    log <text>                    one timestamped line under `## Log`; prints `logged: <text>`.\n                                  `log \"go-ahead: <message>\"` also sets go_ahead to the message\n    note <section> <text>         add to any section but Resume here, Send list, Findings and Log.\n                                  A heading not in notes.md yet is created before `## Log`\n    send add --id X --kind application --title T --body-file F\n                                  add one numbered entry to `## Send list`, the record of every form\n                                  an applier submitted or held (F may be - for stdin)\n    sweep <source> k=v ...        merge into one source's line under `## Sweeps`. query=Q is appended to\n                                  queries; pages and kept add up; other keys replace. status=ok or a\n                                  failure ends the source\n    phase <phase> [--serial R]    running or closed. `closed` writes `fan_out`; --serial R records why\n                                  a phase ran one agent at a time\n    started <tag> ...             register background agents the loop must wait for\n    next <lane> [--limit N] [--claim]   rows eligible for a lane; --claim moves them in\n    tick [--returned TAG ...] [--no-ingest]   ingest, settle returns, recount, claim the next work.\n                                  A returned tag releases every row it holds. No tailoring or apply\n                                  claim while the row's matcher tag is still in flight. Only rows in\n                                  the run's lanes are claimed. Appliers go out only when go_ahead\n                                  is set. A returned a-<id> with no stage file whose opening is reserved\n                                  is held with STOPPED, not retried. Every apply stage file with outcome `applied` and no\n                                  folder yet is filed into my-applications/\n    retro-done                    set retro_done: yes\n    finding add --json '<obj>'    append one `### F-n` entry under `## Findings`; prints F-n\n    finding set F-n <state>       change one finding's state\n\nEvery write takes an exclusive lock on `<session>/.lock`, taken by making the folder `<session>/.lock.d`. Node built-ins only.\n\npositional arguments:\n  {open,new,seed,find,resume,last-started,ea-window,close-abandoned,board,log,note,send,sweep,phase,started,next,tick,retro-done,finding}\n\noptions:\n  -h, --help            show this help message and exit\n  --session SESSION     session folder; default is the open one\n\n--session DIR works before `session`, before the command or after it: `engine.ts --session DIR session tick`, `engine.ts session --session DIR tick`, `engine.ts session tick --session DIR`.\n",
  "open": "usage: engine.ts session open [-h] [--session SESSION] [--browser BROWSER]\n                              [--lanes [LANES ...]]\n\noptions:\n  -h, --help         show this help message and exit\n  --session SESSION  session folder; default is the open one\n  --browser BROWSER\n  --lanes [LANES ...]  live lanes this run works; default every live lane\n",
  "new": "usage: engine.ts session new [-h] [--session SESSION] [--browser BROWSER]\n                             [--no-seed] [--lanes [LANES ...]] [--go-ahead GO_AHEAD]\n\noptions:\n  -h, --help         show this help message and exit\n  --session SESSION  session folder; default is the open one\n  --browser BROWSER\n  --no-seed\n  --lanes [LANES ...]  live lanes this run works; default every live lane\n  --go-ahead GO_AHEAD  the go-ahead to log as the folder is made\n",
  "seed": "usage: engine.ts session seed [-h] [--session SESSION] ids [ids ...]\n\npositional arguments:\n  ids\n\noptions:\n  -h, --help         show this help message and exit\n  --session SESSION  session folder; default is the open one\n",
  "find": "usage: engine.ts session find [-h] [--session SESSION]\n\noptions:\n  -h, --help         show this help message and exit\n  --session SESSION  session folder; default is the open one\n",
  "resume": "usage: engine.ts session resume [-h] [--session SESSION]\n\noptions:\n  -h, --help         show this help message and exit\n  --session SESSION  session folder; default is the open one\n",
  "last-started": "usage: engine.ts session last-started [-h] [--session SESSION]\n\noptions:\n  -h, --help         show this help message and exit\n  --session SESSION  session folder; default is the open one\n",
  "ea-window": "usage: engine.ts session ea-window [-h] [--session SESSION]\n\nPrints r<seconds>: the time since the newest closed session that swept linkedin-ea started, held between\nsearch.linkedin_ea_window_min_minutes and search.linkedin_ea_window_max_minutes. With no such session it prints the longest window.\n\noptions:\n  -h, --help         show this help message and exit\n  --session SESSION  session folder; default is the open one\n",
  "close-abandoned": "usage: engine.ts session close-abandoned [-h] [--session SESSION]\n                                         [--reason TEXT]\n                                         run\n\nClose a run that was left open. Each row it had in flight is held with\n`STOPPED: <reason>. Check the employer site or your email before you send it again.`, its owners are cleared and the phase is set to closed.\n\npositional arguments:\n  run\n\noptions:\n  -h, --help         show this help message and exit\n  --session SESSION  session folder; default is the open one\n  --reason TEXT      why the run is closed; default is that the run stopped before it finished\n",
  "board": "usage: engine.ts session board [-h] [--session SESSION]\n                               {set} key pairs [pairs ...]\n\npositional arguments:\n  {set}\n  key\n  pairs\n\noptions:\n  -h, --help         show this help message and exit\n  --session SESSION  session folder; default is the open one\n\nA lane never moves backwards (matching to swept): the row keeps its lane and\nowner and `kept lane <lane>` is printed. force=yes lifts that for a reset.\n",
  "log": "usage: engine.ts session log [-h] [--session SESSION] text [text ...]\n\npositional arguments:\n  text\n\noptions:\n  -h, --help         show this help message and exit\n  --session SESSION  session folder; default is the open one\n",
  "note": "usage: engine.ts session note [-h] [--session SESSION] section text [text ...]\n\npositional arguments:\n  section\n  text\n\noptions:\n  -h, --help         show this help message and exit\n  --session SESSION  session folder; default is the open one\n",
  "send": "usage: engine.ts session send [-h] [--session SESSION] [--id ID]\n                              --kind {application} --title TITLE\n                              --body-file BODY_FILE\n                              {add}\n\npositional arguments:\n  {add}\n\noptions:\n  -h, --help            show this help message and exit\n  --session SESSION     session folder; default is the open one\n  --id ID\n  --kind {application}\n  --title TITLE\n  --body-file BODY_FILE\n",
  "sweep": "usage: engine.ts session sweep [-h] [--session SESSION] source [pairs ...]\n\npositional arguments:\n  source\n  pairs\n\noptions:\n  -h, --help         show this help message and exit\n  --session SESSION  session folder; default is the open one\n",
  "phase": "usage: engine.ts session phase [-h] [--session SESSION] [--serial REASON]\n                               {running,closed}\n\npositional arguments:\n  {running,closed}\n\noptions:\n  -h, --help         show this help message and exit\n  --session SESSION  session folder; default is the open one\n  --serial REASON    with `closed` only: why a phase ran one agent at a time;\n                     added to fan_out\n",
  "started": "usage: engine.ts session started [-h] [--session SESSION] tags [tags ...]\n\npositional arguments:\n  tags\n\noptions:\n  -h, --help         show this help message and exit\n  --session SESSION  session folder; default is the open one\n",
  "next": "usage: engine.ts session next [-h] [--session SESSION] [--limit LIMIT]\n                              [--claim]\n                              {matching,tailoring,applying}\n\npositional arguments:\n  {matching,tailoring,applying}\n\noptions:\n  -h, --help            show this help message and exit\n  --session SESSION     session folder; default is the open one\n  --limit LIMIT\n  --claim\n",
  "tick": "usage: engine.ts session tick [-h] [--session SESSION]\n                              [--returned [RETURNED ...]] [--no-ingest]\n\noptions:\n  -h, --help            show this help message and exit\n  --session SESSION     session folder; default is the open one\n  --returned [RETURNED ...]\n  --no-ingest\n",
  "retro-done": "usage: engine.ts session retro-done [-h] [--session SESSION]\n\noptions:\n  -h, --help         show this help message and exit\n  --session SESSION  session folder; default is the open one\n",
  "finding": "usage: engine.ts finding [-h] [--session SESSION] {add,set} ...\n\npositional arguments:\n  {add,set}\n\noptions:\n  -h, --help         show this help message and exit\n  --session SESSION  session folder; default is the open one\n",
  "finding add": "usage: engine.ts finding add [-h] [--session SESSION] --json JSON\n\noptions:\n  -h, --help         show this help message and exit\n  --session SESSION  session folder; default is the open one\n  --json JSON        the finding object, or @file\n",
  "finding set": "usage: engine.ts finding set [-h] [--session SESSION]\n                             fid {open,folded,proposed,asked,applied,declined}\n\npositional arguments:\n  fid\n  {open,folded,proposed,asked,applied,declined}\n\noptions:\n  -h, --help            show this help message and exit\n  --session SESSION     session folder; default is the open one\n",
}
