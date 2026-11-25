// Integrity checks for the repository layout, the inputs, the ledger and the hunt sessions.
//
// Run as `node process/engine.ts validate [--prospects [PATH]]`. Exit 1 means do not commit.
//
// Each check is a function that returns a list of error strings. Each also takes an optional
// `warns` list and appends warnings to it, so a caller that only wants errors can ignore them.
// runAll() runs every check and returns [errors, warnings].
//
// A fresh clone has no ledger and no session. For applied, prospects and sessions that gives a warning and
// not an error, so a commit still passes. No check compares `override` against git HEAD, because
// prospects.csv is gitignored. ingest stays the only writer of prospects.csv and never writes `override`.
import { opendirSync, readdirSync, readFileSync, realpathSync, statSync, type Dirent } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { basename, isAbsolute, join } from 'node:path'
import * as C from '../constants.ts'
import { readDicts, type CsvRow } from '../lib/csv.ts'
import { byKey, cut, decodeStrict, NEGATIVE_NUMBER, PY_WS, PYFLOAT, PyExc, pyInt, pyLstrip, pyPath, pyStr, pyStrip, pyTruthy, repr, tupleRepr } from '../lib/py.ts'
import { jsonLoads } from '../lib/pyjson.ts'
import { Exit, readText, type Out } from './io.ts'
import * as dedupe from './dedupe.ts'
import * as profiles from './profiles.ts'
import { PROFILE_FILES, isDir, isFile } from './profiles.ts'

const LINKEDIN_VIEW = /^https:\/\/www\.linkedin\.com\/jobs\/view\/\p{Nd}+\/?(?![\s\S])/u
const LINKEDIN_SEARCH = /^https:\/\/www\.linkedin\.com\/jobs\/search\/\?/u
const LINKEDIN_PROFILE = /^https:\/\/www\.linkedin\.com\/in\/[A-Za-z0-9%._-]+\/?(?![\s\S])/u
const WAAS_JOB = /^https:\/\/www\.workatastartup\.com\/jobs\/\p{Nd}+\/?(?![\s\S])/u
const ANY_HTTPS = new RegExp(`^https://[^${PY_WS}<>"]+(?![\\s\\S])`, 'u')

type Warns = string[] | null | undefined
type Check = (warns?: Warns) => string[]

// ---------------------------------------------------------------- Python shims

function excName(e: unknown): string {
  if (e instanceof PyExc) return e.pyName
  if (e instanceof Error) return e.message.startsWith('invalid literal for int()') ? 'ValueError' : e.name
  return 'Exception'
}

export const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(PYFLOAT in v)

// `x in a_frozenset` raises TypeError for a list or a dict.
function inSet(set: ReadonlySet<string>, v: unknown): boolean {
  if (Array.isArray(v)) throw new PyExc('TypeError', "unhashable type: 'list'")
  if (isPlainObject(v)) throw new PyExc('TypeError', "unhashable type: 'dict'")
  return typeof v === 'string' && set.has(v)
}

// str.splitlines()
const LINE_BREAK = /\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/u
function splitlines(s: string): string[] {
  const parts = s.split(LINE_BREAK)
  if (parts.length && parts[parts.length - 1] === '') parts.pop()
  return parts
}

// open(path, newline='', encoding='utf-8').read(): no newline translation. Throws on an unreadable file.
function readRaw(path: string): string {
  return decodeStrict(readFileSync(path))
}

// Path.read_text(encoding='utf-8'): universal newlines. Returns null on OSError; a decode error still throws.
function readTextOrNull(path: string): string | null {
  try { return readText(path) } catch (e) {
    if (e instanceof PyExc) throw e
    return null
  }
}

export function osErrMsg(e: unknown, path: string): string {
  const known: Record<string, string> = {
    ENOENT: '[Errno 2] No such file or directory', EISDIR: '[Errno 21] Is a directory',
    EACCES: '[Errno 13] Permission denied',
  }
  return `${known[(e as NodeJS.ErrnoException).code ?? ''] ?? (e as Error).message}: ${repr(path)}`
}

// os.scandir order, which is the order readdir returns. fs.readdirSync sorts; opendirSync does not.
function scandir(dir: string): Dirent[] | null {
  try {
    const d = opendirSync(dir)
    const out: Dirent[] = []
    try {
      for (let e = d.readSync(); e; e = d.readSync()) out.push(e)
    } finally { d.closeSync() }
    return out
  } catch { return null }
}

// ------------------------------------------------------------ helpers

function w(warns: Warns, msg: string): void {
  if (warns) warns.push(msg)
}

function rel(path: string): string {
  if (path === C.REPO) return '.'
  return path.startsWith(C.REPO + '/') ? path.slice(C.REPO.length + 1) : path
}

// [header, rows] of a CSV. Throws on an unreadable file.
function readCsv(path: string): [string[], CsvRow[]] {
  const { cols, rows } = readDicts(readRaw(path))
  return [cols, rows]
}

// The validated Config, or null when inputs.toml is unusable (inputs() reports why).
function cfg(): C.Config | null {
  try {
    return C.cfg()
  } catch (e) {
    if (e instanceof Exit) return null
    throw e
  }
}

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v)

const get = (r: CsvRow, k: string): string => r[k] || ''
const strip = (r: CsvRow, k: string): string => pyStrip(r[k] || '')
const isDigits = (s: string): boolean => /^\p{Nd}+(?![\s\S])/u.test(s)
const sameCols = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i])

// ------------------------------------------------------------------ layout

// Section A of the restructure plan, committed paths only. my-sessions/ is gitignored.
const COMMITTED: readonly string[] = [
  'CLAUDE.md', '.gitignore', '.claude/settings.json',
  '.claude/agents/sweep-source.md', '.claude/agents/matcher.md', '.claude/agents/resume-tailor.md',
  '.claude/agents/applier.md', '.claude/agents/retro-editor.md',
  '.claude/agents/inbox-reader.md', '.claude/agents/messenger.md', '.claude/agents/post-reader.md',
  '.claude/hooks/session-start.sh', '.claude/hooks/commit-gate.sh', '.claude/hooks/chrome-pin.sh',
  '.claude/hooks/chrome-pin.ts',
  '.claude/skills/hunt/SKILL.md', '.claude/skills/retro/SKILL.md', '.claude/skills/outreach/SKILL.md',
  '.claude/skills/profile/SKILL.md', '.claude/skills/setup/SKILL.md',
  'process/instructions.md', 'process/contracts.md', 'process/engine.ts', 'process/constants.ts',
  'process/local.example.json',
  'process/tools/profiles.ts', 'process/tools/session.ts',
  'process/tools/queue.ts', 'process/tools/ingest.ts', 'process/tools/dedupe.ts',
  'process/tools/prelim.ts', 'process/tools/findings.ts', 'process/tools/validate.ts',
  'process/tools/status.ts', 'process/tools/applications.ts', 'process/tools/outreach.ts', 'process/tools/suggestions.ts',
  'process/lib/py.ts', 'process/lib/pyjson.ts', 'process/lib/csv.ts', 'process/lib/sessionName.ts',
  'process/lib/vocab.ts', 'process/lib/rolesMarkdown.ts', 'process/tools/io.ts',
  'process/runners/linkedin.md', 'process/runners/workatastartup.md', 'process/runners/external-ats.md',
  'process/runners/naukri.md', 'process/runners/simplify.md', 'process/runners/gmail.md',
  'process/runners/company-sites.md',
  'package.json', 'tsconfig.json', 'vite.config.ts', 'index.html',
  'src/main.tsx', 'src/App.tsx',
]

// Tracked files under src/ with a dashboard extension. A walk of the working tree cannot see a deleted
// file, so the list comes from git's index and each path is then checked on disk.
function trackedSources(): string[] {
  const r = spawnSync('git', ['-C', C.REPO, 'ls-files', '-z', '--', 'src'], { encoding: 'utf8', timeout: 30_000 })
  if (r.error || typeof r.stdout !== 'string') return []
  return r.stdout.split('\0').filter((p) => /\.(?:tsx?|css)$/u.test(p))
}

export function layout(_warns?: Warns): string[] {
  const errs: string[] = []
  for (const p of COMMITTED) {
    if (!isFile(join(C.REPO, p))) errs.push(`MISSING FILE  ${p} (named in the target layout)`)
  }
  // The dashboard sources: every tracked .ts, .tsx and .css file under src/ must still exist.
  for (const p of trackedSources()) {
    if (!isFile(join(C.REPO, p))) errs.push(`MISSING FILE  ${p} (tracked dashboard source)`)
  }
  const folders = [join(C.REPO, 'my-profile.example')]
  const active = profiles.root()
  if (active === null) {
    errs.push('NO PROFILE  my-profile/ is missing; run `node process/engine.ts profile` for the reason')
  } else folders.push(active)
  for (const folder of folders) {
    for (const name of PROFILE_FILES) {
      if (!isFile(join(folder, name))) errs.push(`MISSING FILE  ${rel(join(folder, name))}`)
    }
    const resume = join(folder, 'resume')
    if (!isDir(resume)) errs.push(`MISSING FOLDER  ${rel(resume)}`)
    else if (readdirSync(resume).length === 0) errs.push(`EMPTY FOLDER  ${rel(resume)}`)
  }
  return errs
}

// ------------------------------------------------------------------ inputs

export function inputs(_warns?: Warns): string[] {
  // constants.load() writes its reason to stderr and exits 2. Catch the text, as Python's redirect_stderr does.
  let captured = ''
  const real = process.stderr.write
  process.stderr.write = ((chunk: string | Uint8Array): boolean => { captured += String(chunk); return true }) as typeof process.stderr.write
  try {
    C.load()
  } catch (e) {
    if (e instanceof Exit) return ['INPUTS  ' + (pyStrip(captured) || 'inputs.toml did not load')]
    throw e
  } finally {
    process.stderr.write = real
  }
  const errs: string[] = []
  for (const src of C.cfg().live_sources) {          // live means listed and backed by a runner file
    if (!C.isLane(src)) {
      errs.push(`INPUTS  search.live_sources names ${repr(src)}, which is not a lane (constants.SOURCES or SPLIT_LANES)`)
    } else if (C.runnerPath(src) === null) {
      errs.push(`INPUTS  search.live_sources names ${repr(src)}, which has no runner file in process/runners/`)
    }
  }
  return errs
}

// ------------------------------------------------------------------ prospects

function linkErrors(who: string, r: CsvRow, warns?: Warns): [string[], string | null] {
  const link = strip(r, 'link')
  const src = strip(r, 'source')
  const ch = strip(r, 'channel')
  if (!link) return [[`NO LINK  ${who}`], null]
  if (LINKEDIN_VIEW.test(link) || WAAS_JOB.test(link)) return [[], link]
  if (LINKEDIN_SEARCH.test(link)) {
    // A search-results link is not a posting. A skipped row has been triaged, so it is only recorded.
    if (strip(r, 'status') !== 'skipped') {
      w(warns, `SEARCH LINK  ${who}: a search-results link is not a posting; replace it with the job URL`)
    }
    return [[], null]
  }
  if (LINKEDIN_PROFILE.test(link)) {
    if (ch === 'outreach') return [[], link]
    return [[`PROFILE LINK  ${who}: only channel=outreach rows may link to a person`], null]
  }
  if (src === 'linkedin' || src === 'waas') return [[`BAD LINK  ${who} -> ${cut(link, 60)}`], null]
  // A Naukri link without a 12-hex invite key loses its fragment in dedupe, so two such invites would collapse into one.
  if (src === 'naukri' && dedupe.identify(link)[0] !== 'naukri') return [[`BAD LINK  ${who} -> ${cut(link, 60)}`], null]
  if (ANY_HTTPS.test(link)) return [[], link]
  return [[`BAD LINK  ${who} -> ${cut(link, 60)}`], null]
}

// str(x or '').strip() for a parsed JSON value.
const str = (v: unknown): string => pyStrip(pyTruthy(v) ? pyStr(v) : '')

// The link check ingest runs on one sweep row. Returns [errors, link] where link is the form the
// row is stored with: LinkedIn and Work at a Startup links are canonicalised first. A row whose
// errors are not empty is rejected by ingest and flagged here.
export function sweepLinkErrors(sr: Record<string, unknown>, who: string): [string[], string] {
  let link = str(sr['link'])
  const [kind, , canon] = dedupe.identify(link)
  if (kind === 'linkedin' || kind === 'waas') link = canon
  const probe: CsvRow = { link, source: str(sr['source']), channel: str(sr['channel']), status: 'new' }
  return [linkErrors(who, probe)[0], link]
}

export function sweepWho(name: string, i: number, sr: Record<string, unknown>): string {
  const company = pyTruthy(sr['company']) ? pyStr(sr['company']) : '?'
  return `${name} rows[${i}] ${company} / ${cut(pyTruthy(sr['role']) ? pyStr(sr['role']) : '', 40)}`
}

const DROP_ON_PRELIM = new RegExp(
  `prelim[^\\p{L}\\p{N}_]*\\p{Nd}+[${PY_WS}]*(<|below|under)|below (the )?(prelim )?(bar|threshold)`, 'iu')

function prospectRows(rows: CsvRow[], errs: string[], warns: Warns): void {
  const c = cfg()
  const seenIds = new Map<string, string>()
  const seenLinks = new Map<string, string>()
  rows.forEach((r, k) => {
    const i = k + 2
    const who = `${r['id'] || `row ${i}`} ${pyStr(r['company'])} / ${cut(get(r, 'role'), 40)}`
    const rid = strip(r, 'id')
    const st = strip(r, 'status')
    const src = strip(r, 'source')
    const ch = strip(r, 'channel')
    const notes = strip(r, 'notes')

    if (!rid) errs.push(`NO ID  row ${i}`)
    else if (seenIds.has(rid)) errs.push(`DUPLICATE ID  ${who} (also ${seenIds.get(rid)})`)
    seenIds.set(rid, who)

    const [linkErrs, canon] = linkErrors(who, r, warns)
    errs.push(...linkErrs)
    if (canon) {
      if (seenLinks.has(canon)) errs.push(`SAME LINK ON 2 ROWS  ${canon} -> ${seenLinks.get(canon)}`)
      seenLinks.set(canon, who)
    }

    if (!C.STATUSES.has(st)) errs.push(`BAD STATUS  ${who} -> ${repr(st)}`)
    if (!src) errs.push(`NO SOURCE  ${who}`)
    else if (!C.SOURCES.has(src)) {
      errs.push(`BAD SOURCE  ${who} -> ${src} (add it to SOURCES in constants.ts and write its runner)`)
    }
    if (ch && !C.CHANNELS.has(ch)) errs.push(`BAD CHANNEL  ${who} -> ${ch}`)
    if (!ch && !C.CLOSED.has(st)) errs.push(`NO CHANNEL  ${who} (status=${st || 'blank'})`)
    if (!strip(r, 'prelim') && !C.CLOSED.has(st)) errs.push(`NO PRELIM  ${who}`)

    const m = strip(r, 'match')
    const sem = strip(r, 'semantic')
    const mI = isDigits(m) ? pyInt(m) : null
    const semI = isDigits(sem) ? pyInt(sem) : null
    if (m) {
      if (mI === null || !(mI >= 0 && mI <= 100)) errs.push(`BAD MATCH  ${who} -> ${m}`)
      else {
        const parts = C.TRIAGE_COMPONENTS.map((key) => strip(r, key))
        if (!parts.every((p) => isDigits(pyLstrip(p, '-')))) errs.push(`MATCH W/O COMPONENTS  ${who}`)
        else if (parts.reduce((a, p) => a + pyInt(p), 0) !== mI) {
          errs.push(`COMPONENTS != MATCH  ${who} (${parts.join('+')} != ${m})`)
        }
        if (!strip(r, 'evidence')) errs.push(`MATCH W/O EVIDENCE  ${who}`)
      }
    }
    if (sem && (semI === null || !(semI >= 0 && semI <= 100))) errs.push(`BAD SEMANTIC  ${who} -> ${sem}`)

    if (c !== null && src !== C.INVITE_SOURCE) {           // a Naukri invite is answered whatever its score
      if (st === 'scored') {
        if (mI === null || mI < c.match_floor) {
          errs.push(`SCORED BELOW MATCH FLOOR  ${who} (match=${m || 'blank'}, floor=${c.match_floor})`)
        }
        if (semI === null || semI < c.semantic_floor) {
          errs.push(`SCORED BELOW SEMANTIC FLOOR  ${who} (semantic=${sem || 'blank'}, floor=${c.semantic_floor})`)
        }
      } else if (st === 'skipped' && mI !== null && mI >= c.match_floor && !notes.includes(C.HELD_PREFIX) &&
                 !notes.includes('closed at apply') && !notes.includes('posting closed') &&
                 !notes.includes('candidate skip:')) {
        errs.push(`SKIPPED AT OR ABOVE MATCH FLOOR W/O ${C.HELD_PREFIX}  ${who} (match=${mI})`)
      }

      if (['scored', 'ready', 'applied'].includes(st) && mI !== null && semI !== null &&
          semI < c.semantic_proceed && mI < c.semantic_middle_min_match) {
        errs.push(`SCORED IN SEMANTIC MIDDLE BAND W/ MATCH<${c.semantic_middle_min_match}  ${who} ` +
                  `(semantic=${semI}, match=${mI}; the matcher writes skipped with a ${C.HELD_PREFIX} reason)`)
      }
      if (ch === 'waas_message' && ['scored', 'ready', 'applied'].includes(st) && mI !== null &&
          mI < c.waas_send_match_min) {
        errs.push(`WAAS MESSAGE BELOW SEND BAR  ${who} (match=${mI}, bar=${c.waas_send_match_min})`)
      }
    }

    // prelim orders the queue; it never drops. A drop reason must come from a hard filter or a JD read.
    if (st === 'dropped' && DROP_ON_PRELIM.test(notes)) {
      errs.push(`DROPPED ON PRELIM  ${who}: prelim orders the queue and never drops a role. ` +
                'Drop only on a hard filter, or read the JD and record match')
    }
    if (['dropped', 'skipped', 'wrong_job', 'held', 'blocked_info'].includes(st) && !notes) {
      errs.push(`${st.toUpperCase()} W/O REASON  ${who}`)
    }
  })
}

// Errors in a prospects table. `rows` is a list of dicts; null reads the ledger's prospects.csv.
export function prospects(rows: CsvRow[] | null = null, warns?: Warns): string[] {
  const errs: string[] = []
  if (rows === null) {
    if (!isFile(C.PROSPECTS)) {
      w(warns, `no queue yet: ${rel(C.PROSPECTS)} does not exist (a fresh clone has none; run \`engine.ts ledger init\`)`)
      return errs
    }
    const [header, read] = readCsv(C.PROSPECTS)
    if (!sameCols(header, C.PROSPECT_COLS)) {
      return [`PROSPECTS HEADER DRIFT  ${rel(C.PROSPECTS)}: expected ${C.PROSPECT_COLS.join(',')}, found ${header.join(',')}`]
    }
    rows = read
  } else if (rows.length) {
    const keys = Object.keys(rows[0])
    if (keys.includes('__extra__')) {          // Python's DictReader keys the overflow under None
      throw new PyExc('TypeError', "'<' not supported between instances of 'NoneType' and 'str'")
    }
    if (keys.length !== C.PROSPECT_COLS.length || !C.PROSPECT_COLS.every((k) => keys.includes(k))) {
      return [`PROSPECTS HEADER DRIFT  rows carry ${[...keys].sort(byKey((k) => k)).join(',')}`]
    }
  }
  if (!rows.length) w(warns, 'queue is empty (header only). Correct after a reset; otherwise a sweep rewrote it')
  prospectRows(rows, errs, warns)
  return errs
}

// The prospects check on a candidate file, as ingest does before it replaces the real one.
function prospectsFile(path: string): string[] {
  const p = pyPath(path)
  if (!isFile(p)) return [`NO QUEUE FILE  ${p} does not exist. Nothing was validated`]
  const [header, rows] = readCsv(p)
  if (!sameCols(header, C.PROSPECT_COLS)) {
    return [`PROSPECTS HEADER DRIFT  ${p}: expected ${C.PROSPECT_COLS.join(',')}, found ${header.join(',')}`]
  }
  return prospects(rows)
}

// ------------------------------------------------------------------ ledgers

// [rows or null, errors]. A missing file is a warning.
function ledgerCsv(path: string, cols: readonly string[], warns: Warns): [CsvRow[] | null, string[]] {
  if (!isFile(path)) {
    w(warns, `no ${rel(path)} yet (a fresh clone has none; run \`engine.ts ledger init\`)`)
    return [null, []]
  }
  const [header, rows] = readCsv(path)
  if (!sameCols(header, cols)) {
    return [null, [`LEDGER HEADER DRIFT  ${rel(path)}: expected ${cols.join(',')}, found ${header.join(',')}. Run \`engine.ts ledger migrate\` if the engine is newer than the ledger.`]]
  }
  return [rows, []]
}

export function applied(warns?: Warns): string[] {
  const [rows, errs] = ledgerCsv(C.APPLIED, C.APPLIED_COLS, warns)
  if (rows === null) return errs
  const seen = new Map<string, number>()
  rows.forEach((r, k) => {
    const i = k + 2
    const key = strip(r, 'key')
    if (!key) errs.push(`APPLIED BLANK KEY  ${rel(C.APPLIED)}:${i}`)
    else if (seen.has(key)) errs.push(`APPLIED DUPLICATE KEY  ${rel(C.APPLIED)}:${i} -> ${key} (first at line ${seen.get(key)})`)
    if (!seen.has(key)) seen.set(key, i)
  })
  if (!isFile(C.PROSPECTS)) return errs
  try {
    const [, prows] = readCsv(C.PROSPECTS)
    prows.forEach((r, k) => {
      if (!C.SPENT.has(strip(r, 'status'))) return
      if (!dedupe.check(r['company'] ?? '', r['role'] ?? '', r['link'] ?? '', r['source'] || null)) {
        errs.push(`APPLIED BUT NOT IN LEDGER  ${rel(C.PROSPECTS)}:${k + 2} ${pyStr(r['company'])} / ${cut(get(r, 'role'), 40)}`)
      }
    })
  } catch (exc) {                            // dedupe is a sibling; a half-built one must not break this
    if (exc instanceof Exit) throw exc
    w(warns, `applied-versus-prospects check skipped: ${(exc as Error).message}`)
  }
  return errs
}

function vocabErrs(label: string, path: string, i: number, r: CsvRow, col: string, allowed: readonly string[]): string[] {
  const v = strip(r, col).toLowerCase()
  if (v && !allowed.includes(v)) {
    return [`${label} BAD ${col.toUpperCase()}  ${rel(path)}:${i} -> ${repr(v)} (use ${[...allowed].sort(byKey((x) => x)).join('/')})`]
  }
  return []
}

export function careers(warns?: Warns): string[] {
  const [rows, errs] = ledgerCsv(C.COMPANY_CAREERS, C.COMPANY_CAREERS_COLS, warns)
  if (rows === null) return errs
  const seen = new Map<string, number>()
  rows.forEach((r, k) => {
    const i = k + 2
    const company = strip(r, 'company')
    const key = company ? dedupe.normaliseCompany(company) : ''
    if (!key) errs.push(`CAREERS BLANK COMPANY  ${rel(C.COMPANY_CAREERS)}:${i}`)
    else if (seen.has(key)) {
      errs.push(`CAREERS DUPLICATE COMPANY  ${rel(C.COMPANY_CAREERS)}:${i} -> ${company} (first at line ${seen.get(key)})`)
    } else seen.set(key, i)
    errs.push(...vocabErrs('CAREERS', C.COMPANY_CAREERS, i, r, 'sweepable', ['yes', 'no', 'maybe']))
  })
  return errs
}

export function atsDomains(warns?: Warns): string[] {
  const [rows, errs] = ledgerCsv(C.ATS_DOMAINS, C.ATS_DOMAINS_COLS, warns)
  if (rows === null) return errs
  const seen = new Map<string, number>()
  rows.forEach((r, k) => {
    const i = k + 2
    const dom = strip(r, 'apply_domain').toLowerCase()
    const key = dedupe.normaliseCompany(strip(r, 'company')) + '\0' + dom
    if (!dom) errs.push(`ATS-DOMAINS BLANK APPLY_DOMAIN  ${rel(C.ATS_DOMAINS)}:${i}`)
    else if (seen.has(key)) {
      // Several companies share one ATS host (job-boards.greenhouse.io), so the key is company plus domain.
      errs.push(`ATS-DOMAINS DUPLICATE APPLY_DOMAIN  ${rel(C.ATS_DOMAINS)}:${i} -> ${dom} for ${pyStr(r['company'])} (first at line ${seen.get(key)})`)
    } else seen.set(key, i)
    errs.push(...vocabErrs('ATS-DOMAINS', C.ATS_DOMAINS, i, r, 'granted', ['yes', 'no']))
  })
  return errs
}

// ------------------------------------------------------------------ sessions

const FRONT_LINE = new RegExp(`^([A-Za-z_][A-Za-z0-9_]*):[${PY_WS}]*([^\\n]*)(?![\\s\\S])`, 'u')

// Flat front-matter of a notes.md as a map of strings, or null when absent or unterminated.
export function readFront(path: string): Map<string, string> | null {
  const text = readTextOrNull(path)
  if (text === null) return null
  const lines = text.split('\n')
  if (pyStrip(lines[0]) !== '---') return null
  const out = new Map<string, string>()
  for (const ln of lines.slice(1)) {
    if (pyStrip(ln) === '---') return out
    if (!pyStrip(ln) || pyLstrip(ln).startsWith('#')) continue
    const m = FRONT_LINE.exec(ln)
    if (!m) return null
    out.set(m[1], pyStrip(m[2]))
  }
  return null
}

let onlySession: string | null = null          // set by main() from --session or JOBHUNT_SESSION: check that one session

function sessionDirs(): string[] {
  if (onlySession !== null) return [onlySession]
  if (!isDir(C.SESSIONS)) return []
  return C.sessionFolders(null, C.SESSION_SUFFIX)
}

function openSessions(): string[] {
  const out: string[] = []
  for (const d of sessionDirs()) {
    const front = readFront(join(d, 'notes.md'))
    if (front !== null && front.get('phase') !== 'closed') out.push(d)
  }
  return out
}

export function sessions(warns?: Warns): string[] {
  const errs: string[] = []
  const dirs = sessionDirs()
  if (!dirs.length) {
    w(warns, `no hunt sessions yet under ${rel(C.SESSIONS)} (a fresh clone has none)`)
    return errs
  }
  const allowed = new Set<string>([...C.FRONT_MATTER_KEYS, ...C.LEGACY_FRONT_MATTER_KEYS])
  for (const d of dirs) {
    const notes = join(d, 'notes.md')
    const who = rel(notes)
    if (!isFile(notes)) {
      errs.push(`SESSION W/O NOTES  ${rel(d)}`)
      continue
    }
    const front = readFront(notes)
    if (front === null) {
      errs.push(`SESSION FRONT-MATTER MISSING OR UNPARSEABLE  ${who}`)
      continue
    }
    for (const k of front.keys()) {
      if (!allowed.has(k)) errs.push(`SESSION UNKNOWN KEY  ${who} -> ${k}`)
    }
    for (const k of ['session', 'started', 'phase', 'retro_done']) {
      if (!front.has(k)) errs.push(`SESSION MISSING KEY  ${who} -> ${k}`)
    }
    const ph = front.get('phase') ?? ''
    if (C.LEGACY_PHASES.has(ph)) {
      errs.push(`SESSION LEGACY PHASE  ${who} -> ${ph}: close it with \`engine.ts session phase closed\``)
    } else if (ph && !(C.PHASES as readonly string[]).includes(ph)) {
      errs.push(`SESSION BAD PHASE  ${who} -> ${ph}`)
    }
    const name = front.get('session')
    if (name && name !== basename(d)) errs.push(`SESSION NAME MISMATCH  ${who} says ${name}`)
    if (ph === 'closed' && front.get('retro_done') === 'no') {
      w(warns, `closed session ${basename(d)} has retro_done: no`)
    }

    const board = join(d, 'board.csv')
    if (!isFile(board)) errs.push(`SESSION MISSING board.csv  ${rel(d)}`)
    else {
      const [header, rows] = readCsv(board)
      if (!sameCols(header, C.BOARD_COLS)) errs.push(`SESSION BOARD HEADER DRIFT  ${rel(board)}`)
      else {
        const lanes = new Set<string>([...C.LANES, ...(ph === 'closed' ? C.LEGACY_LANES : [])])
        rows.forEach((r, k) => {
          if (!lanes.has(strip(r, 'lane'))) errs.push(`SESSION BAD LANE  ${rel(board)}:${k + 2} -> ${repr(r['lane'])}`)
        })
      }
    }
    const state = join(d, '.state.json')
    if (isFile(state)) {
      try {
        jsonLoads(readText(state))
      } catch (exc) {
        if (!(exc instanceof PyExc)) throw exc
        errs.push(`SESSION BAD .state.json  ${rel(state)}: ${exc.message}`)
      }
    }
  }
  return errs
}

// Lane counts for the fan-out gate: [lane, peak key, front-matter keys whose sum is the rows the lane worked].
const FAN_LANES: readonly (readonly [string, string, readonly string[]])[] = [
  ['match', 'match_peak', ['roles_matched']],
  ['tailor', 'tailor_peak', ['resumes_built']],
  ['apply', 'apply_peak', ['applied', 'held', 'ready_to_send']],
]

function frontInt(front: Map<string, string>, key: string): number {
  const v = pyStrip(pyStrip(front.get(key) ?? ''), '"')
  return /^-?\p{Nd}+(?![\s\S])/u.test(v) ? pyInt(v) : 0
}

function frontText(front: Map<string, string>, key: string): string {
  let v = pyStrip(front.get(key) ?? '')
  if (v.startsWith('"')) {
    try {
      const j = jsonLoads(v)
      v = typeof j === 'string' ? j : pyStr(j)
    } catch (e) {
      if (!(e instanceof PyExc)) throw e
      v = pyStrip(v, '"')
    }
  }
  return pyStrip(v)
}

// A closed session states how many agents ran per phase. Serial is allowed; silent is not.
export function fanOut(_warns?: Warns): string[] {
  const errs: string[] = []
  for (const d of sessionDirs()) {
    const notes = join(d, 'notes.md')
    const front = readFront(notes)
    if (front === null || front.get('phase') !== 'closed') continue
    const who = rel(notes)
    const text = frontText(front, 'fan_out')
    if (!text) {
      errs.push(`FAN-OUT EMPTY  ${who}: close the session with \`session phase closed\`, which writes fan_out`)
      continue
    }
    for (const [lane, peakKey, countKeys] of FAN_LANES) {
      const worked = countKeys.reduce((a, k) => a + frontInt(front, k), 0)
      if (worked >= 2 && frontInt(front, peakKey) <= 1 && !text.includes('serial:')) {
        errs.push(`SERIAL RUN NOT STATED  ${who}: ${lane} lane worked ${worked} rows with a peak of ${frontInt(front, peakKey)} agent(s); ` +
                  'close with `session phase closed --serial "<reason>"`')
      }
    }
  }
  return errs
}

// ------------------------------------------------------------------ stage files

const COLLAPSE_KEY: Record<string, string> = { fd_30: 'fd', ai_25: 'ai', level_15: 'level', stack_10: 'stack' }

type Obj = Record<string, unknown>

// A `scored` triage file whose part sits strictly under its scores.collapse_* floor. The matcher
// writes `skipped` with a HELD: reason for those (R1 decision row 5).
export function collapseErrors(d: Obj, c: C.Config): string[] {
  const errs: string[] = []
  for (const [comp, key] of Object.entries(COLLAPSE_KEY)) {
    const floor = c.collapse[key]
    const v = d[comp]
    if (floor !== undefined && isInt(v) && v < floor) {
      errs.push(`'scored' with ${comp}=${v} under scores.collapse_${key}=${floor}: write 'skipped' with a reason starting ${repr(C.HELD_PREFIX)}`)
    }
  }
  return errs
}

// Problems with one parsed stage file. Empty means it matches the contract.
export function checkStageData(stage: string, data: unknown): string[] {
  if (!isPlainObject(data)) return ['top level is not a JSON object']
  const d = data
  const errs = C.STAGE_REQUIRED[stage].filter((k) => !Object.hasOwn(d, k)).map((k) => `missing key ${repr(k)}`)
  if (errs.length) return errs
  const c = cfg()
  if (stage === 'sweep') {
    const rows = d['rows']
    if (!Array.isArray(rows)) return ["'rows' is not a list"]
    if (!/^\p{Nd}{4}-\p{Nd}{2}-\p{Nd}{2}-\p{Nd}{2}\n?(?![\s\S])/u.test(pyStr(d['firing']))) {
      errs.push("'firing' must look like YYYY-MM-DD-HH")
    }
    if (!inSet(C.SOURCES, d['source'])) errs.push(`'source' ${repr(d['source'])} is not in SOURCES`)
    rows.forEach((r: unknown, i: number) => {
      if (!isPlainObject(r)) {
        errs.push(`rows[${i}] is not an object`)
        return
      }
      for (const k of C.SWEEP_ROW_REQUIRED) {
        if (!str(r[k])) errs.push(`rows[${i}] has no ${repr(k)}`)
      }
      if (pyTruthy(r['channel']) && !inSet(C.CHANNELS, r['channel'])) {
        errs.push(`rows[${i}] channel ${repr(r['channel'])} is not in CHANNELS`)
      }
    })
  } else if (stage === 'extract') {
    if (typeof d['closed'] !== 'boolean') errs.push("'closed' must be true or false")
    if (!pyStrip(pyStr(d['id']))) errs.push("'id' is empty")
    if (!inSet(C.CHANNELS, d['channel'])) errs.push(`'channel' ${repr(d['channel'])} is not in CHANNELS`)
  } else if (stage === 'triage') {
    for (const k of [...C.TRIAGE_COMPONENTS, 'match', 'semantic']) {
      if (!isInt(d[k])) errs.push(`${repr(k)} must be an integer`)
    }
    if (!errs.length) {
      for (const [k, cap] of Object.entries(C.MATCH_WEIGHTS)) {
        const v = d[k] as number
        if (!(v >= 0 && v <= cap)) errs.push(`${repr(k)} must be between 0 and ${cap}`)
      }
      if (C.TRIAGE_COMPONENTS.reduce((a, k) => a + (d[k] as number), 0) !== d['match']) {
        errs.push("components do not sum to 'match'")
      }
    }
    const decision = d['decision']
    if (!(C.DECISIONS as readonly unknown[]).includes(decision)) {
      errs.push(`'decision' must be one of ${tupleRepr(C.DECISIONS)}`)
    } else if (!errs.length && c !== null) {
      const reason = str(d['reason'])
      const match = d['match'] as number
      const semantic = d['semantic'] as number
      const invite = C.isInviteId(d['id'])                 // every Naukri invite is answered, so no floor refuses one
      const mf = invite ? 0 : c.match_floor
      const sf = invite ? 0 : c.semantic_floor
      if (decision === 'scored' && (match < mf || semantic < sf)) {
        errs.push(`'scored' needs match >= ${mf} and semantic >= ${sf}`)
      } else if (decision === 'scored' && !invite && collapseErrors(d, c).length) {
        errs.push(...collapseErrors(d, c))
      } else if (decision === 'skipped' && match >= mf && !reason.startsWith(C.HELD_PREFIX)) {
        errs.push(`'skipped' needs match < ${mf}, or a 'reason' starting ${repr(C.HELD_PREFIX)}`)
      } else if (decision === 'wrong_job' && semantic >= sf) {
        errs.push(`'wrong_job' needs semantic < ${sf}`)
      }
    }
    if ((decision === 'skipped' || decision === 'wrong_job' || decision === 'dropped') && !str(d['reason'])) {
      errs.push(`${repr(decision)} needs a reason`)
    }
  } else if (stage === 'apply') {
    const outcome = d['outcome']
    const reasons = d['reasons']
    if (!(C.OUTCOMES as readonly unknown[]).includes(outcome)) {
      errs.push(`'outcome' must be one of ${tupleRepr(C.OUTCOMES)}`)
    } else if (outcome === 'applied' && !str(d['applied_date'])) {
      errs.push("'applied' needs 'applied_date'")
    } else if (outcome === 'blocked_info' && !str(d['question'])) {
      errs.push("'blocked_info' needs 'question'")
    } else if (outcome === 'held' && !((Array.isArray(reasons) && reasons.some((x: unknown) => pyStrip(pyStr(x)))) ||
                                       str(d['question']))) {
      errs.push("'held' needs a non-empty 'reasons' list or a 'question'")
    } else if (outcome === 'declined' && !str(d['notes'])) {
      errs.push("'declined' needs 'notes' giving the reason")
    }
  }
  return errs
}

export function stageFiles(_warns?: Warns): string[] {
  const errs: string[] = []
  for (const d of openSessions()) {
    for (const stage of C.STAGES) {
      const folder = join(d, C.STAGE_DIR, stage)
      if (!isDir(folder)) continue
      const names = readdirSync(folder).filter((n) => n.endsWith('.json')).sort(byKey((n) => n))
      for (const name of names) {
        const f = join(folder, name)
        let data: unknown
        try {
          let text: string
          try { text = readText(f) } catch (e) {
            if (e instanceof PyExc) throw e
            throw new PyExc('OSError', osErrMsg(e, f))
          }
          data = jsonLoads(text)
        } catch (exc) {
          if (!(exc instanceof PyExc)) throw exc
          errs.push(`BAD STAGE FILE  ${rel(f)}: unreadable JSON: ${exc.message}`)
          continue
        }
        for (const e of checkStageData(stage, data)) errs.push(`BAD STAGE FILE  ${rel(f)}: ${e}`)
        if (stage === 'sweep' && isPlainObject(data) && Array.isArray(data['rows'])) {
          // the check ingest runs: a bad link is rejected there, so flag it here while the file is pending
          data['rows'].forEach((sr: unknown, i: number) => {
            if (isPlainObject(sr)) errs.push(...sweepLinkErrors(sr, sweepWho(name, i, sr))[0])
          })
        }
      }
    }
  }
  return errs
}

// ------------------------------------------------------------------ the engine names nobody

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/gu
// ^ and $ with re.M, spelled out: Python's $ matches only before "\n", JS's also before "\r" and "\u2028".
const IDENTITY = new RegExp(
  `(?<![^\\n])##[${PY_WS}]+Identity[${PY_WS}]*(?=\\n|(?![\\s\\S]))([\\s\\S]*?)(?=(?<![^\\n])##[${PY_WS}]|(?![\\s\\S]))`, 'u')

function identitySection(profileMd: string): string {
  const text = readTextOrNull(profileMd)
  if (text === null) return ''
  const m = IDENTITY.exec(text)
  return m ? m[1] : ''
}

const CELL_SPLIT = new RegExp(`[${PY_WS}]*:[${PY_WS}]*`, 'u')
const STATUS_TAG = new RegExp(`[${PY_WS}]*\`(stated|artefact|ours)\`[^\\n]*(?![\\s\\S])`, 'u')
const WS_RUN = new RegExp(`[${PY_WS}]+`, 'u')

// [label, needle] pairs: the candidate's name, handle and emails.
function identityNeedles(): [string, string][] {
  const out: [string, string][] = []
  const root = profiles.root()
  const section = root ? identitySection(join(root, 'profile.md')) : ''
  for (const line of splitlines(section)) {
    let cells: string[]
    if (pyStrip(line).startsWith('|')) {
      cells = pyStrip(pyStrip(line), '|').split('|').map((c) => pyStrip(pyStrip(c), '`'))
    } else {
      const t = pyLstrip(pyStrip(line), '-* ').replaceAll('**', '')
      const m = CELL_SPLIT.exec(t)
      cells = m ? [t.slice(0, m.index), t.slice(m.index + m[0].length)] : [t]
    }
    if (cells.length < 2) continue
    const label = cells[0].toLowerCase()
    const value = pyStrip(pyStrip(cells[1]).replace(STATUS_TAG, ''))
    if (!value) continue
    if (label === 'name' || label === 'full name') {
      out.push(['first name', value.split(WS_RUN).filter((x) => x)[0]])
      out.push(['name', value])
    } else if (label === 'handle' || label === 'github' || label === 'username') {
      out.push(['handle', pyLstrip(value, '@')])
    } else if (label.includes('linkedin')) {
      const m = /\/in\/([A-Za-z0-9%._-]+)/u.exec(value)
      if (m) out.push(['handle', m[1]])
    }
  }
  for (const m of section.matchAll(EMAIL)) out.push(['email', m[0]])
  for (const key of ['chrome_profile_account', 'mailbox']) {
    const v = profiles.local(key)
    if (v) out.push([key, v])
  }
  const seen = new Set<string>()
  const uniq: [string, string][] = []
  for (const [label, needle] of out) {
    const n = needle.toLowerCase()
    if (Array.from(n).length >= 4 && !seen.has(n)) {
      seen.add(n)
      uniq.push([label, needle])
    }
  }
  return uniq
}

// The subset of `paths` that git ignores (process/local.json and the like hold machine data by design).
function ignored(paths: string[]): Set<string> {
  if (!paths.length) return new Set()
  const r = spawnSync('git', ['-C', C.REPO, 'check-ignore', '--stdin', '-z'],
                      { input: paths.join('\0') + '\0', encoding: 'utf8', timeout: 30_000, maxBuffer: 1 << 30 })
  if (r.error || typeof r.stdout !== 'string') return new Set()
  return new Set(r.stdout.split('\0').filter((x) => x).map(pyPath))
}

const WORD = '[\\p{L}\\p{N}_]'
// Python's \b: a boundary between a word and a non-word character, Unicode-aware.
const BOUNDARY = `(?:(?<=${WORD})(?!${WORD})|(?<!${WORD})(?=${WORD}))`

function needleHits(label: string, needle: string, lines: string[]): number[] {
  const hits: number[] = []
  if (label === 'first name') {
    const esc = needle.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
    const pat = new RegExp(`${BOUNDARY}${esc}${BOUNDARY}`, 'iu')
    lines.forEach((ln, n) => { if (pat.test(ln)) hits.push(n + 1) })
    return hits
  }
  const low = needle.toLowerCase()
  lines.forEach((ln, n) => { if (ln.toLowerCase().includes(low)) hits.push(n + 1) })
  return hits
}

// os.walk(top) in scandir order, pruning `skip`. Appends the files of each directory before descending.
function walk(top: string, skip: ReadonlySet<string>, paths: string[]): void {
  const entries = scandir(top)
  if (entries === null) return
  const dirs: [string, boolean][] = []
  for (const e of entries) {
    const link = e.isSymbolicLink()
    if (link ? isDir(join(top, e.name)) : e.isDirectory()) {
      dirs.push([e.name, link])
      continue
    }
    const path = join(top, e.name)
    if (path === C.LOCAL_JSON || e.name === 'settings.local.json' || e.name.endsWith('.pyc')) continue
    paths.push(path)
  }
  for (const [name, link] of dirs) {
    if (!skip.has(name) && !link) walk(join(top, name), skip, paths)
  }
}

// The engine, the skills and the docs say "the candidate" and "they". A gendered pronoun in a committed file means a
// line was written about one person. This file is skipped for the same reason, and its pattern is spelt so a plain grep for the words finds nothing.
const PRONOUN = /\bh(?:e|is|im|imself)\b/iu
const SELF = join(C.PROCESS, 'tools', 'validate.ts')

export function engineNamesNobody(warns?: Warns): string[] {
  const errs: string[] = []
  const needles = identityNeedles()
  if (!needles.length) {
    w(warns, 'engine-names-nobody check found no identity to look for (profile.md has no ## Identity section); it still checks pronouns')
  }
  const paths: string[] = []
  const skip = new Set(['__pycache__', '.git', 'node_modules'])
  for (const top of [C.PROCESS, join(C.REPO, '.claude'), join(C.REPO, 'src'), join(C.REPO, 'server'), join(C.REPO, 'my-profile.example')]) {
    walk(top, skip, paths)
  }
  for (const name of ['CLAUDE.md', 'README.md', 'index.html']) {
    const path = join(C.REPO, name)
    if (isFile(path)) paths.push(path)
  }
  const skipped = ignored(paths)
  for (const path of paths) {
    if (skipped.has(path)) continue
    let text: string | null
    try { text = readTextOrNull(path) } catch (e) {
      if (e instanceof PyExc) continue          // not UTF-8: a binary file
      throw e
    }
    if (text === null) continue
    const lines = splitlines(text)
    if (path !== SELF) {
      const gendered = lines.flatMap((ln, n) => (PRONOUN.test(ln) ? [n + 1] : []))
      if (gendered.length) {
        errs.push(`GENDERED PRONOUN  ${rel(path)}:${gendered[0]} refers to the candidate by a gendered pronoun${gendered.length > 1 ? ` (${gendered.length} lines)` : ''}; write "the candidate" and "they"`)
      }
    }
    let first = new Set<number>()
    for (const [label, needle] of needles) {
      let hits = needleHits(label, needle, lines)
      if (label === 'first name') first = new Set(hits)
      else if (label === 'name') hits = hits.filter((n) => !first.has(n))
      if (hits.length) {
        errs.push(`ENGINE NAMES SOMEONE  ${rel(path)}:${hits[0]} holds the candidate ${label}${hits.length > 1 ? ` (${hits.length} lines)` : ''}`)
      }
    }
  }
  return errs
}

// ------------------------------------------------------------------ resume variants

// The .md is the source of truth for a variant, the .tex comes from it and the PDF from the .tex. A file older than the one
// it comes from is stale. A copy or a checkout flattens mtimes to within a few ms, so only a gap over 2 s counts.
const STALE_SLACK_MS = 2000

// The rows of the table under `## Resume variants` in profile.md that has a Default column, each keyed by its
// lower-case header cell. Reads that section only. Null when there is no such section or table.
function variantRows(profileMd: string): Record<string, string>[] | null {
  const lines = profileMd.split('\n')
  const start = lines.findIndex((ln) => /^##[ \t]+Resume variants[ \t]*$/u.test(ln))
  if (start < 0) return null
  const end = lines.findIndex((ln, i) => i > start && ln.startsWith('## '))
  let header: string[] | null = null
  let rows: Record<string, string>[] | null = null
  for (const ln of lines.slice(start + 1, end < 0 ? lines.length : end)) {
    if (!pyStrip(ln).startsWith('|')) continue
    const cells = pyStrip(pyStrip(ln), '|').split('|').map((c) => pyStrip(pyStrip(c), '`'))
    if (cells[0].toLowerCase() === 'variant') {
      header = cells.map((c) => c.toLowerCase())
      if (header.includes('default') && rows === null) rows = []
    } else if (header?.includes('default') && !/^[-: ]+$/u.test(cells[0])) {
      rows?.push(Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ''])))
    }
  }
  return rows
}

// For each live variant the PDF is not older than its .tex and the .tex not older than its .md. A stale file warns, because
// a touched file must not stop an AFK hunt or the commit gate. Exactly one row must say yes under Default.
export function variants(warns?: Warns): string[] {
  const root = profiles.root()
  const text = root === null ? null : readTextOrNull(join(root, 'profile.md'))
  if (root === null || text === null) return []   // layout reports the missing profile
  const rows = variantRows(text)
  if (rows === null) return ['VARIANTS  profile.md has no Resume variants table with a Default column']
  const errs: string[] = []
  const defaults = rows.filter((r) => r['default'].toLowerCase() === 'yes').length
  if (defaults !== 1) errs.push(`VARIANTS  ${defaults} rows say yes under Default in Resume variants, and exactly one must`)
  for (const r of rows) {
    if (r['status'] !== 'live') continue
    const files = [r[Object.keys(r).find((h) => h.startsWith('pdf')) ?? ''], r[Object.keys(r).find((h) => h.startsWith('source')) ?? '']]
    files.push((files[1] ?? '').replace(/\.tex$/u, '.md'))
    const [pdf, tex, md] = files.map((f) => ({ f, t: f ? statSync(join(root, 'resume', f), { throwIfNoEntry: false })?.mtimeMs : undefined }))
    for (const x of [pdf, tex, md]) if (x.t === undefined) w(warns, `STALE RESUME ${r['variant']}: resume/${x.f} is missing`)
    for (const [from, to] of [[tex, pdf], [md, tex]]) {
      if (from.t !== undefined && to.t !== undefined && to.t < from.t - STALE_SLACK_MS) {
        w(warns, `STALE RESUME ${r['variant']}: ${to.f} is older than ${from.f}`)
      }
    }
  }
  return errs
}

// ------------------------------------------------------------------ entry points

const CHECKS: readonly (readonly [string, Check])[] = [
  ['layout', layout], ['inputs', inputs], ['prospects', (warns) => prospects(null, warns)], ['applied', applied],
  ['careers', careers], ['ats_domains', atsDomains], ['sessions', sessions], ['fan_out', fanOut],
  ['stage_files', stageFiles], ['engine_names_nobody', engineNamesNobody], ['variants', variants],
]

// Every check. Returns [errors, warnings].
export function runAll(): [string[], string[]] {
  const errs: string[] = []
  const warns: string[] = []
  for (const [name, fn] of CHECKS) {
    try {
      errs.push(...fn(warns))
    } catch (exc) {                        // a crashing check is an error, never a silent pass
      if (exc instanceof Exit) throw exc
      errs.push(`CHECK CRASHED  ${name}: ${excName(exc)}: ${(exc as Error).message}`)
    }
  }
  return [errs, warns]
}

// A session folder from a name or a path, or null when it has no notes.md.
function findSession(arg: string): string | null {
  const p = pyPath(arg === '~' ? homedir() : arg.startsWith('~/') ? homedir() + arg.slice(1) : arg)
  const cands = isAbsolute(p) ? [p] : [join(C.SESSIONS, p), join(C.REPO, p), join(process.cwd(), p)]
  for (const cand of cands) {
    if (isFile(join(cand, 'notes.md'))) return realpathSync(cand)
  }
  return null
}

// ------------------------------------------------------------------ CLI

const USAGE = 'usage: engine.ts validate [-h] [--prospects [PATH]] [--session S]\n'
const HELP = USAGE + `
Run every integrity check, or the prospects check alone. Exit 1 on error. On
success the last line is "ok: <n> checks, 0 errors, <w> warnings".

options:
  -h, --help          show this help message and exit
  --prospects [PATH]  check the prospects table alone; with PATH, check that
                      candidate file instead of the ledger
  --session S         check only this session folder (a name under the
                      sessions root, or a path with a notes.md). Default:
                      JOBHUNT_SESSION when set (engine.ts --session sets it),
                      else every session
`

// argparse's test for "this argument string is an option".
function looksLikeOption(a: string): boolean {
  return a.length > 1 && a.startsWith('-') && !NEGATIVE_NUMBER.test(a) && !a.includes(' ')
}

export function main(argv: string[], out: Out = (s) => { process.stdout.write(s) }): number {
  const usageError = (msg: string): number => {
    process.stderr.write(`${USAGE}engine.ts validate: error: ${msg}\n`)
    return 2
  }
  let prospectsArg: string | true | null = null
  let sessionArg: string | null = null
  const extras: string[] = []
  const longs = ['--help', '--prospects', '--session']
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '-h') { out(HELP); return 0 }
    if (!looksLikeOption(a)) { extras.push(a); continue }
    const eq = a.indexOf('=')
    const name = eq >= 0 ? a.slice(0, eq) : a
    let matches = longs.filter((o) => o === name)
    if (!matches.length && name.startsWith('--')) matches = longs.filter((o) => o.startsWith(name))
    if (matches.length !== 1) { extras.push(a); continue }
    const opt = matches[0]
    if (opt === '--help') { out(HELP); return 0 }
    if (opt === '--prospects') {
      if (eq >= 0) prospectsArg = a.slice(eq + 1)
      else if (i + 1 < argv.length && !looksLikeOption(argv[i + 1])) prospectsArg = argv[++i]
      else prospectsArg = true
    } else if (eq >= 0) sessionArg = a.slice(eq + 1)
    else if (i + 1 < argv.length && !looksLikeOption(argv[i + 1])) sessionArg = argv[++i]
    else return usageError('argument --session: expected one argument')
  }
  if (extras.length) return usageError(`unrecognized arguments: ${extras.join(' ')}`)

  const chosen = sessionArg || pyStrip(process.env['JOBHUNT_SESSION'] ?? '') || null
  if (chosen) {
    onlySession = findSession(chosen)
    if (onlySession === null) {
      out(`ERROR: no session ${repr(chosen)} with a notes.md under ${rel(C.SESSIONS)}\n`)
      out('\n1 errors, 0 warnings\n')
      return 1
    }
  }
  let warns: string[] = []
  let errs: string[]
  let nChecks: number
  if (prospectsArg !== null) {
    errs = prospectsArg !== true ? prospectsFile(prospectsArg) : prospects(null, warns)
    nChecks = 1
  } else {
    [errs, warns] = runAll()
    nChecks = CHECKS.length
  }
  for (const x of warns) out('warn:  ' + x + '\n')
  for (const e of errs) out('ERROR: ' + e + '\n')
  if (errs.length) {
    out(`\n${errs.length} errors, ${warns.length} warnings\n`)
    return 1
  }
  out(`\nok: ${nChecks} checks, 0 errors, ${warns.length} warnings\n`)
  return 0
}
