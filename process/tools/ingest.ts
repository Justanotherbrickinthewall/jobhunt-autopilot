// Fold the open session's stage files into the ledger's prospects.csv.
// Agents write one JSON file each under `<session>/.stage/<stage>/`. This module is the only writer of
// prospects.csv for that work, and it never writes `override`. It applies the files one at a time to the rows
// in memory and runs validate.prospects() after each. A bad file moves alone to `.stage/<stage>/rejected/`
// with a `<file>.reason`; the rest move to `done/`. The whole write holds a lock on `LEDGER/.ingest.lock`.
// The hold, release, skip, sent and age rules are in process/contracts.md.
//
//     node process/engine.ts ingest <sweep|extract|triage|apply|all> [--dry-run] [--session DIR]
//     node process/engine.ts ingest hold <id> [<id> ...] --reason R
//     node process/engine.ts ingest release <id> [<id> ...] [--retailor]
//     node process/engine.ts ingest skip <id> [<id> ...] --reason R
//     node process/engine.ts ingest reopen <id> [<id> ...] --reason R
//     node process/engine.ts ingest unblock <id> [<id> ...]
//     node process/engine.ts ingest sent <id> [<id> ...] --reason R
//     node process/engine.ts ingest age [--dry-run]
//     node process/engine.ts ingest response --company C [--role R] [--id ID] --date D --word W
//     node process/engine.ts ledger init
//     node process/engine.ts ledger migrate
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import * as C from '../constants.ts'
import { readDicts, writeDicts, type CsvRow } from '../lib/csv.ts'
import {
  byKey, cut, dateFromIso, decodeStrict, markOrder, pyCopy, pyKeys, PY_WS, PyExc, pyInt, pyJson, pyPath, pyStr, pyStrip, pyTruthy, repr,
  strftime, tupleRepr,
} from '../lib/py.ts'
import { jsonLoads } from '../lib/pyjson.ts'
import { Exit, readText, withLock, writeAtomic, type Out } from './io.ts'
import * as applications from './applications.ts'
import * as dedupe from './dedupe.ts'
import * as prelimMod from './prelim.ts'
import * as session_ from './session.ts'
import * as validate from './validate.ts'

type Row = CsvRow
type Dict = Record<string, unknown>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Counts = Record<string, any>
type Loaded = [string, Dict]

export class IngestError extends Error {
  stage: string
  problems: string[]
  // Nothing was written. `problems` holds one line per cause.
  constructor(stage: string, problems: Iterable<string>) {
    const list = [...problems]
    super(`${stage}: ${list.length} problem(s), nothing written`)
    this.stage = stage
    this.problems = list
  }
}

const WS_RUN = new RegExp(`[${PY_WS}]+`, 'u')

// ------------------------------------------------------------------ ledger init

const LEDGER_CSVS: readonly (readonly [string, readonly string[]])[] = [
  [C.PROSPECTS, C.PROSPECT_COLS],
  [C.APPLIED, C.APPLIED_COLS],
  [C.COMPANY_CAREERS, C.COMPANY_CAREERS_COLS],
  [C.ATS_DOMAINS, C.ATS_DOMAINS_COLS],
  [C.CONTACTED, C.CONTACTED_COLS],
  [C.RESERVED, C.RESERVED_COLS],
  [C.SUGGESTIONS, C.SUGGESTION_COLS],
]

const isDir = (p: string): boolean => { try { return statSync(p).isDirectory() } catch { return false } }

// Create LEDGER, ROLES, ARTIFACTS and header-only CSVs where missing. Returns the paths it created.
export function ledgerInit(): string[] {
  const created: string[] = []
  for (const d of [C.LEDGER, C.ROLES, C.ARTIFACTS]) {
    if (!isDir(d)) {
      mkdirSync(d, { recursive: true })
      created.push(d)
    }
  }
  for (const [path, cols] of LEDGER_CSVS) {
    if (existsSync(path)) continue
    writeFileSync(path, writeDicts(cols, []), 'utf8')       // csv.writer(fh).writerow(cols): header, '\r\n'
    created.push(path)
  }
  return created
}

// `ledger migrate`: adds each column a file lacks, empty, and creates each missing file. A file holding a column the
// engine does not know, or a row longer than its header, is refused before anything is written. A second run changes nothing.
function ledgerMigrate(out: Out): number {
  return locked(() => {
    const plans: [string, string, string[]][] = []
    for (const [path, cols] of LEDGER_CSVS) {
      if (!existsSync(path)) continue
      const { cols: have, rows } = readDicts(readText(path))
      const unknown = have.filter((c) => !cols.includes(c))
      if (unknown.length || rows.some((r) => '__extra__' in r)) {
        const why = unknown.length ? `unknown column ${unknown.join(', ')}` : 'a row longer than its header'
        process.stderr.write(`ledger migrate: ${path} has ${why}. Nothing written.\n`)
        return 2
      }
      const added = cols.filter((c) => !have.includes(c))
      if (added.length) plans.push([path, writeDicts([...have, ...added], rows), added])
    }
    let changed = false
    for (const p of ledgerInit()) { out(`created ${p}\n`); changed = true }
    for (const [path, text, added] of plans) {
      writeAtomic(path, text)
      out(`migrated ${path}: added ${added.join(', ')}\n`)
      changed = true
    }
    if (!changed) out('ledger already up to date, nothing changed\n')
    return 0
  })
}

// ------------------------------------------------------------------ file checks

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v)

// str(x or '') for a parsed JSON value.
const sOr = (v: unknown): string => (pyTruthy(v) ? pyStr(v) : '')
// str(x or '').strip()
const sv = (v: unknown): string => pyStrip(sOr(v))
// A value stored into a CSV cell: `x or ''`, written the way csv writes it.
const cellOf = (v: unknown): string => (pyTruthy(v) ? pyStr(v) : '')

const isDict = (v: unknown): v is Dict => validate.isPlainObject(v)

// The channel of one prospects.csv row, or '' when the file or the row is missing.
function rowChannel(rowId: unknown): string {
  let text: string
  try {
    text = decodeStrict(readFileSync(C.PROSPECTS))
  } catch (e) {
    if (e instanceof PyExc) throw e
    return ''
  }
  for (const r of readDicts(text).rows) {
    if (r['id'] === rowId) return pyStrip(r['channel'] || '')
  }
  return ''
}

function heldReasonsGiven(d: Dict): boolean {
  const reasons = d['reasons']
  const listed = Array.isArray(reasons) && reasons.some((x) => pyStrip(pyStr(x)))
  return listed || !!sv(d['question'])
}

// Return a list of problems with one parsed stage file. Empty means well formed.
export function checkStageData(stage: string, d: unknown): string[] {
  if (!isDict(d)) return ['top level is not a JSON object']
  const errs = C.STAGE_REQUIRED[stage].filter((k) => !Object.hasOwn(d, k)).map((k) => `missing key ${repr(k)}`)
  if (errs.length) return errs
  const c = C.cfg()
  if (stage === 'sweep') {
    const rows = d['rows']
    if (!Array.isArray(rows)) return ["'rows' is not a list"]
    if (!/^\p{Nd}{4}-\p{Nd}{2}-\p{Nd}{2}-\p{Nd}{2}\n?(?![\s\S])/u.test(pyStr(d['firing']))) {
      errs.push("'firing' must look like YYYY-MM-DD-HH")
    }
    rows.forEach((r: unknown, i: number) => {
      if (!isDict(r)) {
        errs.push(`rows[${i}] is not an object`)
        return
      }
      for (const k of C.SWEEP_ROW_REQUIRED) {
        if (!sv(r[k])) errs.push(`rows[${i}] has no ${repr(k)}`)
      }
    })
  } else if (stage === 'extract') {
    if (typeof d['closed'] !== 'boolean') errs.push("'closed' must be true or false")
    if (!pyStrip(pyStr(d['id']))) errs.push("'id' is empty")
  } else if (stage === 'triage') {
    for (const k of [...C.TRIAGE_COMPONENTS, 'match', 'semantic']) {
      if (!isInt(d[k])) errs.push(`${repr(k)} must be an integer`)
    }
    if (!errs.length && C.TRIAGE_COMPONENTS.reduce((a, k) => a + (d[k] as number), 0) !== d['match']) {
      errs.push("components do not sum to 'match'")
    }
    const invite = C.isInviteId(d['id'])                   // every Naukri invite is answered, so no floor refuses one
    const mf = invite ? 0 : c.match_floor
    const sf = invite ? 0 : c.semantic_floor
    const dec = d['decision']
    const match = d['match'] as number
    const semantic = d['semantic'] as number
    if (!(C.DECISIONS as readonly unknown[]).includes(dec)) {
      errs.push(`'decision' must be one of ${tupleRepr(C.DECISIONS)}`)
    } else if (!errs.length && dec === 'scored' && (match < mf || semantic < sf)) {
      errs.push(`'scored' needs match >= ${mf} and semantic >= ${sf}`)
    } else if (!errs.length && dec === 'skipped' && match >= mf && !sv(d['reason']).startsWith(C.HELD_PREFIX)) {
      errs.push(`'skipped' needs match < ${mf}, or a 'reason' starting ${repr(C.HELD_PREFIX)}`)
    } else if (!errs.length && dec === 'wrong_job' && semantic >= sf) {
      errs.push(`'wrong_job' needs semantic < ${sf}`)
    }
    if ((dec === 'skipped' || dec === 'wrong_job' || dec === 'dropped') && !sv(d['reason'])) {
      errs.push(`${repr(dec)} needs a 'reason'`)
    }
    if (!errs.length && dec === 'scored' && !invite) {
      errs.push(...validate.collapseErrors(d, c))           // strictly under a scores.collapse_* floor
      if (semantic < c.semantic_proceed && match < c.semantic_middle_min_match) {
        errs.push(`'scored' in the semantic middle band (semantic under ${c.semantic_proceed}, ` +
                  `match under ${c.semantic_middle_min_match}): write 'skipped' with a reason ` +
                  `starting ${repr(C.HELD_PREFIX)}`)
      }
      if (match < c.ea_match_floor && rowChannel(d['id']) === 'easy_apply') {
        errs.push(`'scored' on an easy_apply row needs match >= ${c.ea_match_floor}: write ` +
                  `'skipped' with the reason ${repr(C.EA_FLOOR_REASON)}`)
      }
      if (match < c.waas_send_match_min && rowChannel(d['id']) === 'waas_message') {
        errs.push(`'scored' on a waas_message row needs match >= ${c.waas_send_match_min}: write ` +
                  `'skipped' with a reason starting ${repr(C.HELD_PREFIX)} (below founder send bar)`)
      }
    }
  } else if (stage === 'apply') {
    const outcome = d['outcome']
    if (!(C.OUTCOMES as readonly unknown[]).includes(outcome)) {
      errs.push(`'outcome' must be one of ${tupleRepr(C.OUTCOMES)}`)
    } else if (outcome === 'applied' && !sv(d['applied_date'])) {
      errs.push("'applied' needs 'applied_date'")
    } else if (outcome === 'blocked_info' && !sv(d['question'])) {
      errs.push("'blocked_info' needs 'question'")
    } else if (outcome === 'held' && !heldReasonsGiven(d)) {
      errs.push("'held' needs a non-empty 'reasons' list or a 'question'")
    } else if (outcome === 'declined' && !sv(d['notes'])) {
      errs.push("'declined' needs 'notes' giving the reason")
    }
  }
  return errs
}

function checkStageFile(stage: string, path: string): string[] {
  let d: unknown
  try {
    d = jsonLoads(readText(path))
  } catch (exc) {                                           // except (ValueError, OSError)
    if (exc instanceof PyExc && (exc.pyName === 'JSONDecodeError' || exc.pyName === 'UnicodeDecodeError')) {
      return [`unreadable JSON: ${exc.message}`]
    }
    if ((exc as NodeJS.ErrnoException).code) return [`unreadable JSON: ${validate.osErrMsg(exc, path)}`]
    throw exc
  }
  return checkStageData(stage, d)
}

// ------------------------------------------------------------------ csv io

export function readCsv(path: string): [string[], Row[]] {
  const { cols, rows } = readDicts(decodeStrict(readFileSync(path)))
  return [cols, rows]
}

export function renderCsv(fields: readonly string[], rows: Row[]): string {
  return writeDicts(fields, rows, { extras: 'raise' })
}

function note(row: Row, text: string): void {
  const cur = pyStrip(row['notes'] || '')
  row['notes'] = cur ? `${cur} | ${text}` : text
}

const today = (): string => strftime('%Y-%m-%d')

// ------------------------------------------------------------------ stages

const canon = (link: string): string => dedupe.identify(link)[2]

// urlparse(url).netloc
function netloc(urlIn: string): string {
  let url = urlIn.replace(/^[\x00-\x20]+/u, '').replace(/[\t\r\n]/gu, '')
  const i = url.indexOf(':')
  if (i > 0 && /^[A-Za-z]$/u.test(url[0]) && /^[A-Za-z0-9+.-]+$/u.test(url.slice(0, i))) url = url.slice(i + 1)
  if (!url.startsWith('//')) return ''
  let end = url.length
  for (const ch of '/?#') {
    const at = url.indexOf(ch, 2)
    if (at >= 0 && at < end) end = at
  }
  const loc = url.slice(2, end)
  if ((loc.includes('[') && !loc.includes(']')) || (loc.includes(']') && !loc.includes('['))) {
    throw new PyExc('ValueError', 'Invalid IPv6 URL')
  }
  return loc
}

// `x.strip()` where x must be a str; anything else is an AttributeError.
function strMethod(v: unknown): string {
  if (typeof v !== 'string') throw new PyExc('AttributeError', `'${typeof v}' object has no attribute 'strip'`)
  return pyStrip(v)
}

const ID_RE = /^(\p{Nd}{4}-\p{Nd}{2}-\p{Nd}{2})-([A-Z]{2})-(\p{Nd}+)\n?(?![\s\S])/u

// A sweep row's posting time as written when it is an ISO date or date-time, else ''. `ours` 2026-11-02
const POSTED_AT = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/u
function postedAt(v: unknown): string {
  const t = typeof v === 'string' ? pyStrip(v) : ''
  return POSTED_AT.test(t) && !Number.isNaN(Date.parse(t.replace(' ', 'T'))) ? t : ''
}

// Fold sweep files into rows. A row whose link fails validate's link check is not an error: it is
// collected in counts['_rejected'] (file path -> rejected rows with a reason) and the rest ingest.
function applySweep(rows: Row[], dataFiles: Loaded[], counts: Counts): string[] {
  const errs: string[] = []
  const rejected: Map<string, Dict[]> = (counts['_rejected'] ??= new Map())
  const badLines: string[] = (counts['_bad_link_lines'] ??= [])
  const fields = [...C.PROSPECT_COLS]
  const seenLinks = new Set<string>(rows.filter((r) => r['link']).map((r) => canon(r['link'] as string)))
  const nextN = new Map<string, number>()
  for (const r of rows) {
    const m = ID_RE.exec(r['id'] as string)
    if (m) {
      const k = `${m[1]}\0${m[2]}`
      nextN.set(k, Math.max(nextN.get(k) ?? 0, pyInt(m[3])))
    }
  }
  for (const [path, d] of dataFiles) {
    const day = cut(pyStr(d['firing']), 10)
    ;(d['rows'] as Dict[]).forEach((sr, i) => {
      const who = validate.sweepWho(basename(path), i, sr)
      const [linkErrs, link] = validate.sweepLinkErrors(sr, who)   // also canonicalises LinkedIn and WaaS links
      if (linkErrs.length) {
        const list = rejected.get(path) ?? []
        rejected.set(path, list)
        list.push(pyCopy(sr, { reject_reason: linkErrs.join('; ') }))
        badLines.push(`BAD LINK  ${who} -> ${cut(sOr(sr['link']), 60)}`)
        counts['bad_link_rejected'] = (counts['bad_link_rejected'] ?? 0) + 1
        return
      }
      const cn = canon(link)
      if (seenLinks.has(cn)) {
        counts['duplicate_link'] = (counts['duplicate_link'] ?? 0) + 1
        return
      }
      if (dedupe.check(sOr(sr['company']), '', link)) {         // identity keys only, never fuzzy: the role is blank. The company is for search.blocked_companies
        counts['already_applied'] = (counts['already_applied'] ?? 0) + 1
        return
      }
      seenLinks.add(cn)
      const src = strMethod(sr['source'])
      const pfx = sr['channel'] === 'outreach' ? C.OUTREACH_PREFIX : (Object.hasOwn(C.PREFIX, src) ? C.PREFIX[src] : undefined)
      if (!pfx) {
        errs.push(`${basename(path)}: no id prefix for source ${repr(src)}`)
        return
      }
      const key = `${day}\0${pfx}`
      const n = (nextN.get(key) ?? 0) + 1
      nextN.set(key, n)
      const [score] = prelimMod.prelim(sr['role'], sr['company'], pyTruthy(sr['location']) ? sr['location'] : '')
      const row: Row = Object.fromEntries(fields.map((f) => [f, '']))
      Object.assign(row, {
        id: `${day}-${pfx}-${String(n).padStart(3, '0')}`, date_found: day, source: src,
        channel: pyStr(sr['channel']), company: pyStr(sr['company']), role: pyStr(sr['role']),
        location: cellOf(sr['location']), work_mode: cellOf(sr['work_mode']),
        batch: cellOf(sr['batch']), salary_band: cellOf(sr['salary_band']),
        salary_period: cellOf(sr['salary_period']),
        prelim: pyStr(score), link, contact: cellOf(sr['contact']),
        status: 'new', notes: cellOf(sr['notes']), posted_at: postedAt(sr['posted_at']),
      })
      if (pyTruthy(sr['drop_reason'])) {
        row['status'] = 'dropped'
        note(row, `hard filter: ${pyStr(sr['drop_reason'])}`)
      }
      rows.push(row)
    })
  }
  return errs
}

const byId = (rows: Row[]): Map<string, Row> => new Map(rows.map((r) => [r['id'] as string, r]))

// '/'.join(map(str, x)) for a list, a str, a dict (its keys) or anything else iterable.
function joinSlash(x: unknown): string {
  let items: unknown[]
  if (typeof x === 'string') items = Array.from(x)
  else if (Array.isArray(x)) items = x
  else if (isDict(x)) items = Object.keys(x)
  else throw new PyExc('TypeError', `'${typeof x === 'number' ? 'int' : 'bool'}' object is not iterable`)
  return items.map((v) => pyStr(v)).join('/')
}

function applyExtract(rows: Row[], dataFiles: Loaded[], _counts: Counts): string[] {
  const errs: string[] = []
  const idx = byId(rows)
  const reentryFrom = C.OVERRIDE_REENTRY['extract']
  for (const [path, d] of dataFiles) {
    const name = basename(path)
    const r = idx.get(d['id'] as string)
    if (r === undefined) {
      errs.push(`${name}: no row with id ${repr(d['id'])}`)
      continue
    }
    const reentry = pyStrip(r['override'] || '') === 'yes' && reentryFrom.has(r['status'] as string)
    if (r['status'] !== 'new' && !reentry) {
      errs.push(`${name}: row ${r['id']} is ${repr(r['status'])}, extract works 'new' rows`)
      continue
    }
    const ch = pyStrip(r['channel'] || '')
    if ((ch === '' || ch === 'unknown') && pyStrip(pyStr(d['channel']))) r['channel'] = pyStr(d['channel'])
    for (const [col, key] of [['work_mode', 'work_mode'], ['location', 'location_wording']]) {
      if (!pyStrip(r[col] || '') && sv(d[key])) r[col] = pyStr(d[key])
    }
    const host = netloc(sOr(d['apply_url']))
    if (r['channel'] === 'external_ats' && host && !pyStrip(r['apply_route'] || '')) r['apply_route'] = host
    const facts = ['remote_scope', 'seniority', 'pay'].filter((k) => pyTruthy(d[k])).map((k) => `${k}=${pyStr(d[k])}`)
    if (pyTruthy(d['stack'])) facts.push('stack=' + joinSlash(d['stack']))
    for (const [k, label] of [['employment_type', 'employment'], ['country', 'country']]) {
      if (sv(d[k])) facts.push(`${label}=${sv(d[k])}`)
    }
    // The people the JD page named, for the roles lane of /outreach. Older extract files have neither key.
    const person = (k: string, label: string): string => {
      const p = d[k]
      if (typeof p !== 'object' || p === null || Array.isArray(p)) return ''
      const o = p as Record<string, unknown>
      const name = typeof o['name'] === 'string' ? pyStrip(o['name']) : ''
      const url = typeof o['url'] === 'string' ? pyStrip(o['url']).replace(/[?#].*$/su, '') : ''
      return name || url ? `${label}: ${[name, url].filter(Boolean).join(' ')}` : ''
    }
    const people = [person('hiring_contact', 'hiring'), person('poster', 'poster')].filter(Boolean).join('; ')
    if (people && !pyStrip(r['contact'] || '')) r['contact'] = people
    if (facts.length) note(r, 'extract: ' + facts.join('; '))
    if (d['closed']) {
      r['status'] = 'skipped'
      note(r, 'posting closed (extract)')
    } else if (pyTruthy(d['hard_fail'])) {
      r['status'] = 'dropped'
      note(r, `hard filter: ${pyStr(d['hard_fail'])}`)
    } else r['status'] = 'extracted'
  }
  return errs
}

function applyTriage(rows: Row[], dataFiles: Loaded[], counts: Counts): string[] {
  const errs: string[] = []
  const idx = byId(rows)
  for (const [path, d] of dataFiles) {
    const name = basename(path)
    const r = idx.get(d['id'] as string)
    if (r === undefined) {
      errs.push(`${name}: no row with id ${repr(d['id'])}`)
      continue
    }
    if (r['status'] === 'scored' && d['decision'] === 'scored') {
      // the resume-tailor's second file for a row already scored: it names the built resume
      const variant = sv(d['resume_variant'])
      if (variant) r['resume_variant'] = variant
      if (pyTruthy(d['resume_file'])) note(r, `resume: ${pyStr(d['resume_file'])}`)
      counts['resume_update'] = (counts['resume_update'] ?? 0) + 1
      continue
    }
    if (r['status'] !== 'extracted') {
      errs.push(`${name}: row ${r['id']} is ${repr(r['status'])}, triage works 'extracted' rows`)
      continue
    }
    for (const k of [...C.TRIAGE_COMPONENTS, 'match', 'semantic']) r[k] = pyStr(d[k])
    r['evidence'] = pyStr(d['evidence'])
    r['status'] = pyStr(d['decision'])
    const reason = sv(d['reason'])
    if (d['decision'] === 'scored') {
      const variant = sv(d['resume_variant'])
      if (variant) r['resume_variant'] = variant
      if (pyTruthy(d['resume_file'])) note(r, `resume: ${pyStr(d['resume_file'])}`)
      if (reason) note(r, `triage: ${reason}`)
    } else note(r, `triage ${pyStr(d['decision'])}: ${reason}`)
  }
  return errs
}

const ATTEMPTS = /attempts=(\p{Nd}+)/gu
const CHANNEL_IS = /CHANNEL IS ([\p{L}\p{N}_]+)/u
const FAILED_OR_HELD: ReadonlySet<string> = new Set([...C.HELD_OUTCOMES, 'failed'])

function applyApply(rows: Row[], dataFiles: Loaded[], counts: Counts): string[] {
  const errs: string[] = []
  const idx = byId(rows)
  const workable = new Set([...C.STAGE_STATUS['apply'], 'queued'])
  for (const [path, d] of dataFiles) {
    const name = basename(path)
    const r = idx.get(d['id'] as string)
    if (r === undefined) {
      errs.push(`${name}: no row with id ${repr(d['id'])}`)
      continue
    }
    if (!workable.has(r['status'] as string)) {
      errs.push(`${name}: row ${r['id']} is ${repr(r['status'])}, apply works 'ready' and 'scored' rows`)
      continue
    }
    const out = d['outcome'] as string
    const notes = sv(d['notes'])
    const closed = pyTruthy(d['closed']) || (
      FAILED_OR_HELD.has(out) &&
      session_.CLOSED_AT_APPLY.test(`${notes} ${sOr(d['question'])} ${session_.heldReasons(d)}`))
    let m: RegExpExecArray | null
    if (out === 'declined') {                               // Not interested on a Naukri invite: answered, never applied to
      if (r['source'] !== C.INVITE_SOURCE) {
        errs.push(`${name}: 'declined' is for ${C.INVITE_SOURCE} invites, and row ${r['id']} is ${repr(r['source'])}`)
        continue
      }
      r['status'] = 'skipped'
      note(r, `${C.DECLINED_PREFIX} ${notes.replace(/^NOT INTERESTED:\s*/iu, '')}`)   // the prefix already says it
      continue
    }
    if (closed && out !== 'applied' && out !== 'already_applied') {
      r['status'] = 'skipped'
      note(r, 'closed at apply')
    } else if (out === 'applied' || out === 'already_applied') {
      const date = sv(d['applied_date']) || today()
      if (!dedupe.check(r['company'] ?? '', r['role'] ?? '', r['link'] ?? '')) {
        // the applier should have recorded it already; do it now
        dedupe.record({
          source: r['source'], company: r['company'], role: r['role'], link: r['link'],
          channel: r['channel'] || 'unknown', applied_date: date, notes: `ingest ${r['id']}`,
        })
      }
      dedupe.unreserveId(r['id'] as string)                 // the form went out, so its reservation is spent
      r['status'] = 'applied'
      r['applied_date'] = date
      if (out === 'already_applied') note(r, 'already applied before this run')
    } else if (C.HELD_OUTCOMES.has(out) && /(^|;\s*)ACCOUNT:/u.test(session_.heldReasons(d))) {
      r['status'] = 'skipped'                               // account wall: skipped, never held (R6, stated 2026-11-20)
      note(r, 'skipped: ' + session_.heldReasons(d))
    } else if (C.HELD_OUTCOMES.has(out)) {                  // not clean: held for /retro with every reason
      r['status'] = 'held'
      note(r, 'held: ' + session_.heldReasons(d))
      note(r, `held_on ${today()}`)
    } else if (out === 'failed' && (m = CHANNEL_IS.exec(notes)) && C.CHANNELS.has(m[1])) {
      r['channel'] = m[1]                                   // wrong route: re-route the row, status unchanged
      counts['rerouted'] = (counts['rerouted'] ?? 0) + 1
    } else {                                                // failed: the next hunt tries again
      const seen = [...(r['notes'] || '').matchAll(ATTEMPTS)].map((x) => pyInt(x[1]))
      note(r, `apply failed attempts=${1 + Math.max(0, ...seen)}`)
    }
    if (notes) note(r, notes)
  }
  return errs
}

const HANDLERS: Record<string, (rows: Row[], files: Loaded[], counts: Counts) => string[]> = {
  sweep: applySweep, extract: applyExtract, triage: applyTriage, apply: applyApply,
}

// ------------------------------------------------------------------ driver

function locked<T>(fn: () => T): T {
  mkdirSync(C.LEDGER, { recursive: true })
  return withLock(join(C.LEDGER, '.ingest.lock'), fn)
}

const stageDir = (session: string, stage: string): string => join(session, C.STAGE_DIR, stage)

function pending(session: string, stage: string): string[] {
  const d = stageDir(session, stage)
  if (!isDir(d)) return []
  return readdirSync(d).filter((n) => n.endsWith('.json')).sort(byKey((n: string) => n)).map((n) => join(d, n))
}

// Run validate.prospects() on the rows in memory. Returns its error lines.
function validateRows(rows: Row[]): string[] {
  return [...validate.prospects(rows)]
}

const stamped = (name: string): string => strftime('%H%M%S-') + name

// Fold `<session>/.stage/<stage>/*.json` into prospects.csv.
//
// Returns [rows_written, new_ids]: rows added or changed, and the ids of the added ones. Throws
// IngestError with nothing changed on a ledger that is already invalid. `out` receives the summary
// lines; undefined is quiet. `sync` false leaves the session's board alone, for a folder that is not a hunt.
export function ingest(stage: string, session: string | null, dryRun = false, out?: Out, sync = true): [number, string[]] {
  if (!(C.STAGES as readonly string[]).includes(stage)) throw new PyExc('ValueError', `unknown stage ${repr(stage)}`)
  if (session === null || !pending(session, stage).length) {
    if (out) out(`${stage}: no pending stage files\n`)
    return [0, []]
  }
  return locked(() => ingestLocked(stage, session, dryRun, out, sync))
}

// Write each file's rejected rows to `<stage dir>/rejected/<file>`, same shape as the sweep file
// with only the rejected rows, each carrying a `reject_reason`.
function writeRejected(session: string, stage: string, loaded: Loaded[], rejected: Map<string, Dict[]>): void {
  if (!rejected.size) return
  const dest = join(stageDir(session, stage), 'rejected')
  mkdirSync(dest, { recursive: true })
  for (const [f, d] of loaded) {
    const bad = rejected.get(f)
    if (!bad || !bad.length) continue
    let target = join(dest, basename(f))
    if (existsSync(target)) target = join(dest, stamped(basename(f)))
    const body: Dict = {}
    const order = pyKeys(d).filter((k) => k !== 'rows')
    for (const k of order) body[k] = d[k]
    body['rows'] = bad
    markOrder(body, [...order, 'rows'])
    writeFileSync(target, pyJson(body, { indent: 1, ensureAscii: false }) + '\n', 'utf8')
  }
}

// Move one stage file to `<stage dir>/rejected/` with `<file>.reason` beside it.
function rejectFile(session: string, stage: string, f: string, reasons: string[], dryRun: boolean): void {
  if (dryRun) return
  const dest = join(stageDir(session, stage), 'rejected')
  mkdirSync(dest, { recursive: true })
  let target = join(dest, basename(f))
  if (existsSync(target)) target = join(dest, stamped(basename(f)))
  renameSync(f, target)
  writeFileSync(target + '.reason', reasons.join('\n') + '\n', 'utf8')
}

function sameRow(a: Row, b: Row): boolean {
  const ka = Object.keys(a)
  if (ka.length !== Object.keys(b).length) return false
  return ka.every((k) => Object.hasOwn(b, k) && a[k] === b[k])
}

function ingestLocked(stage: string, session: string, dryRun: boolean, out?: Out, sync = true): [number, string[]] {
  const print = (s: string): void => { if (out) out(s + '\n') }
  const files = pending(session, stage)
  if (!files.length) return [0, []]
  if (!existsSync(C.PROSPECTS)) ledgerInit()
  const [fields, read] = readCsv(C.PROSPECTS)
  let rows = read
  if (fields.length !== C.PROSPECT_COLS.length || !fields.every((f, i) => f === C.PROSPECT_COLS[i])) {
    throw new IngestError(stage, ['prospects.csv header differs from PROSPECT_COLS'])
  }
  const baseline = validateRows(rows)
  if (baseline.length) {          // the ledger is already wrong: no file can be judged against it
    throw new IngestError(stage, ['prospects.csv fails validation before this ingest', ...baseline])
  }
  const before = new Map<string, Row>(rows.map((r) => [r['id'] as string, { ...r }]))
  const day = today()

  const counts: Counts = {}
  const loaded: Loaded[] = []
  const rejects: [string, string[]][] = []
  for (const f of files) {        // one file at a time: a bad file is rejected alone
    let errs = checkStageFile(stage, f)
    let d: Dict | null = null
    let work: Row[] = []
    let fcounts: Counts = {}
    if (!errs.length) {
      d = jsonLoads(readText(f)) as Dict
      work = rows.map((r) => ({ ...r }))
      fcounts = {}
      errs = HANDLERS[stage](work, [[f, d]], fcounts)
      if (!errs.length) {
        for (const r of work) {   // an override row the stage has worked is reviewed; never touch override
          const old = before.get(r['id'] as string)
          if (old && (r['status'] ?? '') !== (old['status'] ?? '') &&
              pyStrip(r['override'] || '') === 'yes' && !pyStrip(r['reviewed'] || '')) {
            r['reviewed'] = day
          }
        }
        errs = validateRows(work)
      }
    }
    if (errs.length) {
      rejects.push([f, errs])
      rejectFile(session, stage, f, errs, dryRun)
      continue
    }
    rows = work
    loaded.push([f, d as Dict])
    for (const [k, v] of Object.entries(fcounts)) {
      if (k === '_rejected') {
        const m: Map<string, Dict[]> = (counts[k] ??= new Map())
        for (const [pk, pv] of v as Map<string, Dict[]>) m.set(pk, pv)
      } else if (k === '_bad_link_lines') (counts[k] ??= []).push(...(v as string[]))
      else counts[k] = (counts[k] ?? 0) + (v as number)
    }
  }

  const newIds = rows.filter((r) => !before.has(r['id'] as string)).map((r) => r['id'] as string)
  const written = rows.filter((r) => {
    const old = before.get(r['id'] as string)
    return old === undefined || !sameRow(r, old)
  }).length
  const changed = new Map<string, number>()
  for (const r of rows) {
    const old = before.get(r['id'] as string)
    if (old === undefined || (r['status'] ?? '') !== (old['status'] ?? '')) {
      changed.set(r['status'] ?? '', (changed.get(r['status'] ?? '') ?? 0) + 1)
    }
  }

  const rejected: Map<string, Dict[]> = counts['_rejected'] ?? new Map()
  delete counts['_rejected']
  const badLines: string[] = counts['_bad_link_lines'] ?? []
  delete counts['_bad_link_lines']
  let synced = 0
  if (!dryRun && loaded.length) {
    writeAtomic(C.PROSPECTS, renderCsv(fields, rows), C.PROSPECTS + '.ingest-tmp')
    writeRejected(session, stage, loaded, rejected)
    const dest = join(stageDir(session, stage), 'done')
    mkdirSync(dest, { recursive: true })
    for (const [f] of loaded) {
      let target = join(dest, basename(f))
      if (existsSync(target)) target = join(dest, stamped(basename(f)))
      renameSync(f, target)
    }
    if (sync) {
      try {
        synced = session_.syncAfterIngest(stage, rows, newIds, session) || 0
      } catch (exc) {
        if (!(exc instanceof Exit)) print(`  session board not updated: ${(exc as Error).message}`)
      }
    }
  }

  if (out) {
    const tag = dryRun ? ' (dry run, nothing written)' : ''
    print(`${stage}: ${loaded.length} file(s) ingested${tag}; ${newIds.length} new row(s)` +
          (rejects.length ? `; ${rejects.length} file(s) rejected` : '') +
          (synced ? `; ${synced} board row(s) moved` : ''))
    for (const [f, errs] of rejects) {
      print(`REJECTED ${stage}/${basename(f)}: ${errs.slice(0, 3).join('; ')}` +
            (errs.length > 3 ? ` (+${errs.length - 3} more)` : '') +
            (dryRun ? '' : ` -> ${stage}/rejected/`))
    }
    for (const ln of badLines) print(ln)
    for (const [k, v] of Object.entries(counts).sort(byKey(([k]: [string, unknown]) => k))) {
      print(`  ${k === 'resume_update' || k === 'rerouted' ? '' : 'skipped '}${k}: ${pyStr(v)}`)
    }
    if (rejected.size) print(`  rejected rows are in ${join(stageDir(session, stage), 'rejected')}`)
    for (const [st, n] of [...changed.entries()].sort(byKey(([k]: [string, number]) => k))) print(`  -> ${st}: ${n}`)
  }
  return [written, newIds]
}

// Validate the rows in memory, then replace prospects.csv atomically. Caller holds the lock.
function rewriteLocked(fields: readonly string[], rows: Row[], stage: string, dryRun: boolean): void {
  const verrs = validateRows(rows)
  if (verrs.length) throw new IngestError(stage, verrs)
  if (dryRun) return
  writeAtomic(C.PROSPECTS, renderCsv(fields, rows), C.PROSPECTS + '.ingest-tmp')
}

function loadLocked(stage: string): [string[], Row[]] {
  if (!existsSync(C.PROSPECTS)) {
    throw new IngestError(stage, ["prospects.csv does not exist; run 'engine.ts ledger init'"])
  }
  const [fields, rows] = readCsv(C.PROSPECTS)
  if (fields.length !== C.PROSPECT_COLS.length || !fields.every((f, i) => f === C.PROSPECT_COLS[i])) {
    throw new IngestError(stage, ['prospects.csv header differs from PROSPECT_COLS'])
  }
  return [fields, rows]
}

const OPEN_STATUSES: ReadonlySet<string> = new Set(['new', 'extracted', 'ready', 'scored', 'queued', ...C.HELD_STATUSES])

// Apply `change(row, today)` to each named row whose status is in `allowed`. Writes nothing when
// any id is missing or at another status. Then moves the session's board rows to match.
function setStatus(cmd: string, idsIn: string[], allowed: ReadonlySet<string>,
                   change: (r: Row, day: string) => void, session: string | null = null, out?: Out): number {
  const ids = [...new Set(idsIn)]
  let idx: Map<string, Row>
  locked(() => {
    const [fields, rows] = loadLocked(cmd)
    idx = byId(rows)
    const bad = ids.filter((i) => !idx.has(i) || !allowed.has(idx.get(i)!['status'] as string))
      .map((i) => !idx.has(i) ? `${i}: no such row`
        : `${i}: is ${repr(idx.get(i)!['status'])}, ${cmd} works ${[...allowed].sort(byKey((s: string) => s)).join(', ')}`)
    if (bad.length) throw new IngestError(cmd, bad)
    const day = today()
    for (const i of ids) change(idx.get(i)!, day)
    rewriteLocked(fields, rows, cmd, false)
  })
  try {
    session_.syncStatus(ids, session)
  } catch (exc) {
    if (!(exc instanceof Exit) && out) out(`  session board not updated: ${(exc as Error).message}\n`)
  }
  if (out) {
    const sts = [...new Set(ids.map((i) => idx!.get(i)!['status'] as string))].sort(byKey((s: string) => s))
    out(`${cmd}: ${ids.length} row(s) -> ${sts.join(', ')}\n`)
  }
  return ids.length
}

// Set each named open row to held, for /retro to settle.
export function hold(ids: string[], reason: string, session: string | null = null, out?: Out): number {
  return setStatus('hold', ids, new Set([...OPEN_STATUSES].filter((s) => s !== 'held')), (r, day) => {
    r['status'] = 'held'
    note(r, `held: ${reason}`)
    note(r, `held_on ${day}`)       // no colon, so the hold parsers skip it; `ingest age` reads it
  }, session, out)
}

// Set each named held row to ready, or to scored with PENDING_TAILOR so a tailor picks its resume variant again.
export function release(ids: string[], retailor = false, session: string | null = null, out?: Out): number {
  return setStatus('release', ids, C.HELD_STATUSES, (r, day) => {
    if (retailor) {
      r['status'] = 'scored'
      r['resume_variant'] = 'PENDING_TAILOR'
      note(r, `released ${day}, retailor`)
    } else {
      r['status'] = 'ready'
      note(r, `released ${day}`)
    }
  }, session, out)
}

const SKIP_NOTE = 'candidate skip:'

// Set each named open row to skipped on the candidate's word.
export function skip(ids: string[], reason: string, session: string | null = null, out?: Out): number {
  return setStatus('skip', ids, OPEN_STATUSES, (r) => {
    r['status'] = 'skipped'
    note(r, `${SKIP_NOTE} ${reason}`)
  }, session, out)
}

// The statuses a candidate can mark as sent by hand: every row not yet submitted.
const SENDABLE: ReadonlySet<string> = new Set(['held', 'blocked_info', 'ready', 'scored'])
const SENT_NOTE = 'sent by hand'

// Set each named unsubmitted row to applied because the candidate sent the form themselves, as after a captcha.
// It records the opening in the dedupe register first, the same way applyApply does, so it is never sent twice.
export function sent(ids: string[], reason: string, session: string | null = null, out?: Out): number {
  const n = setStatus('sent', ids, SENDABLE, (r, day) => {
    if (!dedupe.check(r['company'] ?? '', r['role'] ?? '', r['link'] ?? '')) {
      dedupe.record({
        source: r['source'], company: r['company'], role: r['role'], link: r['link'],
        channel: r['channel'] || 'unknown', applied_date: day, notes: `${SENT_NOTE} ${r['id']}: ${reason}`,
      })
    }
    dedupe.unreserveId(r['id'] as string)
    r['status'] = 'applied'
    r['applied_date'] = day
    note(r, `${SENT_NOTE} ${day}: ${reason}`)
  }, session, out)
  for (const id of new Set(ids)) {                 // a row sent by hand has no apply stage file, so file it from what the ledger holds
    try {
      applications.fileApplication(id, null, { degraded: true })
    } catch (exc) {
      out?.(`  application folder not filed for ${id}: ${(exc as Error).message}. The send stands; run application backfill.\n`)
    }
  }
  return n
}

// Set each named skipped row back to extracted for a fresh matcher, clearing its scores.
export function reopen(ids: string[], reason: string, session: string | null = null, out?: Out): number {
  return setStatus('reopen', ids, new Set(['skipped', 'applied']), (r, day) => {
    if (r['status'] === 'applied') {   // a false already_applied: allowed only when no ledger key matches
      const hit = dedupe.check(r['company'] ?? '', r['role'] ?? '', r['link'] ?? '')
      if (hit) throw new IngestError('reopen', [`${r['id']}: is 'applied' and applied.csv has it via ${hit.via}`])
      r['status'] = 'ready'
      r['applied_date'] = ''
      note(r, `reopened ${day}: ${reason}`)
      return
    }
    r['status'] = 'extracted'
    for (const k of [...C.TRIAGE_COMPONENTS, 'match', 'semantic']) r[k] = ''
    note(r, `reopened ${day}: ${reason}`)
  }, session, out)
}

// The older name for release.
export function unblock(ids: string[], out?: Out): number {
  return release(ids, false, null, out)
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/u

export interface ResponseFields { company: string; role?: string | null; id?: string | null; date: string; word: string }

// Record that an employer replied to an application. It writes the latest word to `response` and keeps the first reply's date in
// `response_date`, then sets the status in my-applications/index.json. Returns 0, or 2 when the row cannot be told from the
// others: the candidates are printed to stderr and nothing is written.
export function response(f: ResponseFields, out?: Out): number {
  if (!(C.APPLICATION_STATUSES as readonly string[]).includes(f.word)) {
    throw new IngestError('response', [`${repr(f.word)} is not one of ${C.APPLICATION_STATUSES.join(', ')}`])
  }
  if (!ISO_DAY.test(f.date) || Number.isNaN(Date.parse(f.date))) throw new IngestError('response', [`--date ${repr(f.date)} is not a YYYY-MM-DD date`])
  let chosen: string | null = null
  let candidates: Row[] = []
  locked(() => {
    const [fields, rows] = loadLocked('response')
    const applied = rows.filter((r) => r['status'] === 'applied')
    if (f.id) {
      const hit = applied.find((r) => r['id'] === f.id)
      if (!hit) throw new IngestError('response', [`${f.id}: no applied row with that id`])
      candidates = [hit]
    } else {
      const co = dedupe.normaliseCompany(f.company)
      const atCompany = applied.filter((r) => dedupe.normaliseCompany(r['company']) === co)
      const role = f.role ? dedupe.normaliseRole(f.role) : ''
      candidates = role ? atCompany.filter((r) => dedupe.normaliseRole(r['role']) === role) : atCompany
      if (!candidates.length) throw new IngestError('response', [`no applied row for ${repr(f.company)}${f.role ? ` / ${repr(f.role)}` : ''}`])
    }
    if (candidates.length !== 1) return
    const row = candidates[0]
    row['response'] = f.word
    if (!pyStrip(row['response_date'] || '')) row['response_date'] = f.date
    chosen = row['id'] as string
    rewriteLocked(fields, rows, 'response', false)
  })
  if (chosen === null) {
    process.stderr.write(`response: ${candidates.length} applied rows match, pass --role or --id to pick one\n`)
    for (const r of candidates) process.stderr.write(`  ${r['id']}  ${r['company']} / ${r['role']}  (applied ${r['applied_date']})\n`)
    return 2
  }
  const filed = applications.setApplicationStatus(chosen, f.word)
  out?.(`response: ${chosen} -> ${f.word} on ${f.date}${filed ? '' : ' (no application folder yet, so index.json is unchanged)'}\n`)
  return 0
}

const HELD_ON = /held_on (\d{4}-\d{2}-\d{2})/gu
const HELD_REASON = /held: ([^|]+)/gu

// Set every `new` row older than budgets.stale_days to skipped, and every held row older than budgets.held_max_age_days.
// A held row's age runs from its newest `held_on` fragment, else from `date_found`. A held row whose reason holds
// `STOPPED:` stays, because that form may have gone out. Override rows are left alone.
export function age(dryRun = false, out?: Out): number {
  const cfg = C.cfg()
  const now = dateFromIso(today()).getTime()
  const since = (iso: string): number | null => {
    try { return Math.round((now - dateFromIso(cut(pyStrip(iso), 10)).getTime()) / 86_400_000) } catch { return null }
  }
  const aged: string[] = []
  const heldOut: string[] = []
  const stopped: string[] = []
  locked(() => {
    const [fields, rows] = loadLocked('age')
    for (const r of rows) {
      if (pyStrip(r['override'] || '') === 'yes') continue
      if (r['status'] === 'new') {
        if (r['source'] === C.INVITE_SOURCE) continue   // an invite is always answered, so it never ages out unread
        const days = since(r['date_found'] || '')
        if (days !== null && days > cfg.stale_days) {
          r['status'] = 'skipped'
          note(r, C.AGED_NOTE)
          aged.push(r['id'] as string)
        }
      } else if (C.HELD_STATUSES.has(r['status'] as string)) {
        const notes = r['notes'] || ''
        const last = [...notes.matchAll(HELD_REASON)].map((m) => pyStrip(m[1])).pop() ?? ''
        const newest = [...notes.matchAll(HELD_ON)].map((m) => m[1]).sort().pop()
        const days = since(newest ?? r['date_found'] ?? '')
        if (days === null || days <= cfg.held_max_age_days) continue
        if (last.includes('STOPPED:')) { stopped.push(r['id'] as string); continue }
        r['status'] = 'skipped'
        // validate.prospects wants HELD: on a skipped row at or above the match floor, and a hold note is lower-case `held:`
        const text = `${C.HELD_AGED}, ${days} days: ${last || 'no reason recorded'}`
        note(r, notes.includes(C.HELD_PREFIX) ? text : `${C.HELD_PREFIX} ${text}`)
        heldOut.push(r['id'] as string)
      }
    }
    if (aged.length || heldOut.length) rewriteLocked(fields, rows, 'age', dryRun)
  })
  if (out) {
    const tag = dryRun ? ' (dry run, nothing written)' : ''
    out(`age: ${aged.length} new row(s) older than ${cfg.stale_days} days set to skipped${tag}\n`)
    out(`age: ${heldOut.length} held row(s) older than ${cfg.held_max_age_days} days set to skipped${tag}\n`)
    if (stopped.length) out(`age: ${stopped.length} held row(s) kept past that age because a STOPPED reason may mean the form went out\n`)
    if (dryRun) {
      for (const id of aged) out(`  new   ${id}\n`)
      for (const id of heldOut) out(`  held  ${id}\n`)
      for (const id of stopped) out(`  kept  ${id}\n`)
    }
  }
  return aged.length + heldOut.length
}

// ------------------------------------------------------------------ the command line

const INGEST_USAGE = "usage: engine.ts ingest [-h] [--dry-run] [--session SESSION] [--reason REASON]\n                        [--retailor] [--company COMPANY] [--role ROLE] [--id ID] [--date DATE]\n                        [--word WORD]\n                        sweep|extract|triage|apply|all|hold|release|skip|reopen|unblock|age|sent|response [sweep|extract|triage|apply|all|hold|release|skip|reopen|unblock|age|sent|response ...]\n"
const INGEST_HELP = "usage: engine.ts ingest [-h] [--dry-run] [--session SESSION] [--reason REASON]\n                        [--retailor] [--company COMPANY] [--role ROLE] [--id ID] [--date DATE]\n                        [--word WORD]\n                        sweep|extract|triage|apply|all|hold|release|skip|reopen|unblock|age|sent|response [sweep|extract|triage|apply|all|hold|release|skip|reopen|unblock|age|sent|response ...]\n\nFold the open session's stage files into the ledger's prospects.csv.\n\n    node process/engine.ts ingest <sweep|extract|triage|apply|all> [--dry-run] [--session DIR]\n    node process/engine.ts ingest hold <id> [<id> ...] --reason R\n    node process/engine.ts ingest release <id> [<id> ...] [--retailor]\n    node process/engine.ts ingest skip <id> [<id> ...] --reason R\n    node process/engine.ts ingest reopen <id> [<id> ...] --reason R\n    node process/engine.ts ingest unblock <id> [<id> ...]       (the older name for release)\n    node process/engine.ts ingest sent <id> [<id> ...] --reason R\n    node process/engine.ts ingest age [--dry-run]\n    node process/engine.ts ingest response --company C [--role R] [--id ID] --date D --word W\n    node process/engine.ts ledger init\n\nAgents write one JSON file each under `<session>/.stage/<stage>/`. This module is the only writer of\nprospects.csv for that work. It applies the files one at a time to the rows in memory and runs\n`validate.prospects()` after each. A file that is malformed, or that would leave the rows invalid, is\nmoved alone to `<session>/.stage/<stage>/rejected/` with a `<file>.reason` beside it and a `REJECTED`\nline printed. The rest settle: the file is replaced once and they move to `.stage/<stage>/done/`.\nIngestError (exit 1) is kept for a ledger that is already invalid or has the wrong header; then\nnothing changes and every file stays pending.\n\nIt never writes the `override` column. After a real write it calls `syncAfterIngest` in session.ts, which\nmoves the session's board rows to match. The whole write holds a lock on `LEDGER/.ingest.lock`, taken by making the folder `LEDGER/.ingest.lock.d`,\nbecause the hunt loop ingests after every agent returns.\n\n`hold` sets each named open row to `held` with the note `held: <reason>` and a colon-free `held_on <date>` fragment that `age` reads. `release` sets each named\n`held` or `blocked_info` row to `ready`, or with --retailor to `scored` with the variant PENDING_TAILOR\nso a tailor picks the fixed resume variant again. `skip` sets each named open row to `skipped` with the note\n`candidate skip: <reason>`. Each exits 1 naming any id that is missing or at the wrong status, and\nwrites nothing then. Each then moves the open session's board rows to match. These are how /retro and\nthe parent change a row; nobody edits prospects.csv by hand.\n\n`sent` sets each named `held`, `blocked_info`, `ready` or `scored` row to `applied` with today's `applied_date` and the note\n`sent by hand <date>: <reason>`. It first records the opening with `dedupe record` when it is not recorded yet. It is for\na form the candidate submitted themselves, as after a captcha, and it exits 1 and writes nothing for an id at another status. It then files the application folder in degraded mode; a filing failure is printed and does not undo the send.\n\n`reopen` sets each named `skipped` row to `extracted`, empties `match`, `semantic` and the five part scores, and appends\nthe note `reopened <date>: <reason>`. The next hunt's matcher scores it again under the current rubric. It exits 1 and\nwrites nothing for any id that is missing or not `skipped`.\n\n`age` sets every `new` row whose `date_found` is more than `budgets.stale_days` days old to `skipped`, with\nthe note `aged out, never reached`. It also sets every `held` or `blocked_info` row to `skipped` when its newest `held_on` date (else its\n`date_found`) is more than `budgets.held_max_age_days` days old, with the note `held too long, <n> days: <last reason>`, led by `HELD:` when the row has none, because `validate` needs it on a skipped row at the match floor. A row whose\nhold reason holds `STOPPED:` stays, because that form may have gone out. Rows with `override=yes` are left alone. It prints the two\ncounts separately, and `--dry-run` lists the ids of both and writes nothing.\n\n`response` records that an employer replied. It takes --company and --word (one of the application statuses) and --date, and\n--role or --id to pick one row. With no --role it needs exactly one applied row at that company, and otherwise it prints the\ncandidates and exits 2. It writes the word to `response`, keeps the first reply's date in `response_date`, and sets the status\nin my-applications/index.json.\nBoth take the same lock and the same validation as a stage ingest, then replace prospects.csv atomically.\n\n`ledger init` creates the ledger folders and header-only CSVs where they are missing. It never overwrites.\nNode built-ins only.\n\npositional arguments:\n  sweep|extract|triage|apply|all|hold|release|skip|reopen|unblock|age|sent|response\n\noptions:\n  -h, --help            show this help message and exit\n  --dry-run\n  --session SESSION     session folder; default is the open session\n  --reason REASON       hold, skip, reopen and sent: why, in one line\n  --retailor            release: send the row back to re-pick its resume variant\n  --company COMPANY     response: the employer\n  --role ROLE           response: the role, to pick one row at that company\n  --id ID               response: the row id, instead of company and role\n  --date DATE           response: the date of the reply, YYYY-MM-DD\n  --word WORD           response: the new status, one of the application statuses\n"
const LEDGER_USAGE = "usage: engine.ts ledger [-h] {init,migrate}\n"
const LEDGER_HELP = "usage: engine.ts ledger [-h] {init,migrate}\n\nCreate the ledger folders and header-only CSVs where they are missing. Never\noverwrites.\nmigrate adds each column a file lacks, empty, and creates each missing file.\nIt refuses a file holding a column the engine does not know.\n\npositional arguments:\n  {init,migrate}  init: create the ledger; migrate: add the columns and files a newer engine expects\n\noptions:\n  -h, --help  show this help message and exit\n"

class Usage extends Error {}
class Help extends Error {}

const NEGATIVE_NUMBER = /^-\p{Nd}+$|^-\p{Nd}*\.\p{Nd}+$/u
// argparse sees a token starting with '-' as an option unless it is a negative number or has a space.
const isFlag = (t: string): boolean => t.length > 1 && t.startsWith('-') && !NEGATIVE_NUMBER.test(t) && !t.includes(' ')

const TARGETS = 'sweep|extract|triage|apply|all|hold|release|skip|reopen|unblock|age|sent|response'
const LONGS = ['--help', '--dry-run', '--session', '--reason', '--retailor', '--company', '--role', '--id', '--date', '--word']

interface Parsed {
  target: string[]; dryRun: boolean; session: string | null; reason: string | null; retailor: boolean
  fields: Record<string, string>   // response: company, role, id, date, word
}

// argparse for `ingest`: long options by unique prefix, `--opt=value`, and one run of positionals
// (nargs='+'); a second run is an unrecognised argument.
function parseIngest(argv: string[]): Parsed {
  const a: Parsed = { target: [], dryRun: false, session: null, reason: null, retailor: false, fields: {} }
  const extras: string[] = []
  let target: string[] | null = null
  let run: string[] = []
  const flush = (): void => {
    if (run.length) {
      if (target === null) target = run
      else extras.push(...run)
      run = []
    }
  }
  let onlyPos = false
  let i = 0
  while (i < argv.length) {
    const t = argv[i]
    if (onlyPos || !isFlag(t)) { run.push(t); i += 1; continue }
    if (t === '--') { onlyPos = true; i += 1; continue }
    flush()
    if (t === '-h') throw new Help()
    if (!t.startsWith('--')) { extras.push(t); i += 1; continue }
    let name = t
    let inline: string | null = null
    const eq = t.indexOf('=')
    if (eq >= 0) { name = t.slice(0, eq); inline = t.slice(eq + 1) }
    if (!LONGS.includes(name)) {
      const hits = LONGS.filter((l) => l.startsWith(name))
      if (hits.length > 1) throw new Usage(`ambiguous option: ${name} could match ${hits.join(', ')}`)
      if (hits.length === 0) { extras.push(t); i += 1; continue }
      name = hits[0]
    }
    i += 1
    if (name === '--help') throw new Help()
    if (name === '--dry-run' || name === '--retailor') {
      if (inline !== null) throw new Usage(`argument ${name}: ignored explicit argument ${repr(inline)}`)
      if (name === '--dry-run') a.dryRun = true
      else a.retailor = true
      continue
    }
    let value: string
    if (inline !== null) value = inline
    else if (i < argv.length && !isFlag(argv[i])) value = argv[i++]
    else throw new Usage(`argument ${name}: expected one argument`)
    if (name === '--session') a.session = value
    else if (name === '--reason') a.reason = value
    else a.fields[name.slice(2)] = value
  }
  flush()
  if (target === null) throw new Usage(`the following arguments are required: ${TARGETS}`)
  if (extras.length) throw new Usage(`unrecognized arguments: ${extras.join(' ')}`)
  a.target = target
  return a
}

const die = (usage: string, prog: string, msg: string): number => {
  process.stderr.write(`${usage}${prog}: error: ${msg}\n`)
  return 2
}

function problems(exc: IngestError): void {
  process.stderr.write(`${exc.message}\n`)
  for (const p of exc.problems) process.stderr.write('  ' + p + '\n')
}

function ledgerMain(argv: string[], out: Out): number {
  const prog = 'engine.ts ledger'
  const rest = argv.slice(1)
  const loose: string[] = []
  const extras: string[] = []
  for (const t of rest) {
    if (t === '-h' || (t.length > 2 && t.startsWith('--') && '--help'.startsWith(t.split('=')[0]))) {
      out(LEDGER_HELP)
      return 0
    }
    if (isFlag(t)) extras.push(t)
    else loose.push(t)
  }
  if (!loose.length) return die(LEDGER_USAGE, prog, 'the following arguments are required: action')
  if (loose[0] !== 'init' && loose[0] !== 'migrate') return die(LEDGER_USAGE, prog, `argument action: invalid choice: ${repr(loose[0])} (choose from init, migrate)`)
  if (loose.length > 1 || extras.length) {
    return die(LEDGER_USAGE, prog, `unrecognized arguments: ${[...extras, ...loose.slice(1)].join(' ')}`)
  }
  if (loose[0] === 'migrate') return ledgerMigrate(out)
  const created = ledgerInit()
  for (const p of created) out(`created ${p}\n`)
  if (!created.length) out('ledger already initialised, nothing changed\n')
  return 0
}

export function main(argv: string[], out: Out = (s) => { process.stdout.write(s) }): number {
  if (argv.length && argv[0] === 'ledger') return ledgerMain(argv, out)
  const prog = 'engine.ts ingest'
  const err = (msg: string): number => die(INGEST_USAGE, prog, msg)
  let a: Parsed
  try {
    a = parseIngest(argv)
  } catch (e) {
    if (e instanceof Help) { out(INGEST_HELP); return 0 }
    if (e instanceof Usage) return err(e.message)
    throw e
  }

  const cmd = a.target[0]
  if (cmd === 'response') {
    if (a.target.length !== 1) return err('response takes no positional ids, use --id')
    const miss = ['date', 'word'].filter((k) => !pyStrip(a.fields[k] ?? '')).concat(a.fields['company'] || a.fields['id'] ? [] : ['company or id'])
    if (miss.length) return err(`response needs --${miss.join(', --')}`)
    try {
      return response({ company: a.fields['company'] ?? '', role: a.fields['role'], id: a.fields['id'], date: pyStrip(a.fields['date']), word: pyStrip(a.fields['word']) }, out)
    } catch (exc) {
      if (exc instanceof IngestError) { problems(exc); return 1 }
      throw exc
    }
  }
  if (['hold', 'release', 'skip', 'reopen', 'unblock', 'age', 'sent'].includes(cmd)) {
    const ids = a.target.slice(1)
    try {
      if (cmd !== 'age' && !ids.length) return err(`${cmd} needs at least one row id`)
      if ((cmd === 'hold' || cmd === 'skip' || cmd === 'reopen' || cmd === 'sent') && !pyStrip(a.reason || '')) return err(`${cmd} needs --reason`)
      const sess = a.session
      if (cmd === 'hold') hold(ids, pyStrip(a.reason!).split(WS_RUN).join(' '), sess, out)
      else if (cmd === 'skip') skip(ids, pyStrip(a.reason!).split(WS_RUN).join(' '), sess, out)
      else if (cmd === 'reopen') reopen(ids, pyStrip(a.reason!).split(WS_RUN).join(' '), sess, out)
      else if (cmd === 'sent') sent(ids, pyStrip(a.reason!).split(WS_RUN).join(' '), sess, out)
      else if (cmd === 'release' || cmd === 'unblock') release(ids, a.retailor, sess, out)
      else {
        if (a.target.length !== 1) return err('age takes no ids')
        age(a.dryRun, out)
      }
    } catch (exc) {
      if (exc instanceof IngestError) { problems(exc); return 1 }
      throw exc
    }
    return 0
  }

  if (a.target.length !== 1 || ![...C.STAGES, 'all'].includes(cmd as never)) {
    return err('expected one of sweep, extract, triage, apply, all, hold, release, skip, reopen, unblock, age, sent, response')
  }
  const stages: readonly string[] = cmd === 'all' ? C.STAGES : [cmd]

  let session: string | null
  if (a.session) session = pyPath(a.session)
  else {
    try { session = session_.current(false) } catch (e) {
      if (!(e instanceof Exit)) throw e
      session = null
    }
  }
  if (session === null) {
    out('ingest: no open session, nothing to ingest\n')
    return 0
  }

  let rc = 0
  for (const st of stages) {                    // keep going past a failing stage so one bad file holds up nothing else
    try {
      ingest(st, session, a.dryRun, out)
    } catch (exc) {
      if (!(exc instanceof IngestError)) throw exc
      rc = 1
      problems(exc)
    }
  }
  return rc
}
