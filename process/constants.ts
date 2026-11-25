// The one reader of inputs.toml, and the home of every engine vocabulary and path.
// inputs.toml holds what the candidate changes: targets, search terms, reach, pay, LinkedIn caps, budgets,
// score bars and concurrency. Nothing else in the repository holds those numbers. This module validates the
// file against SCHEMA and hands the values out as a frozen Config.
// The vocabularies (statuses, sources, channels, lanes, column lists) are engine facts, so they live here.
// Import rule: constants imports tools/profiles, and tools import constants.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { parse } from 'smol-toml'
import { byKey, pyFloat, pyJson, pyStr, strftime, TZ_OFFSET_MIN } from './lib/py.ts'
import { SESSION_PARTS } from './lib/sessionName.ts'
import { HELD_STATUSES, LANES, LEGACY_LANES, STATUSES } from './lib/vocab.ts'
import * as profiles from './tools/profiles.ts'
import { Exit, type Out } from './tools/io.ts'

export { HELD_STATUSES, LANES, LEGACY_LANES, STATUSES }

export const local = profiles.local   // re-export: process/local.json, then env JOBHUNT_<KEY>

// ------------------------------------------------------------------ paths

// pathlib spelling: no empty or '.' segments, no trailing slash.
function pathStr(p: string): string {
  const abs = p.startsWith('/')
  const segs = p.split('/').filter((s) => s !== '' && s !== '.')
  return (abs ? '/' : '') + (segs.join('/') || (abs ? '' : '.'))
}
const pj = (...parts: string[]): string => pathStr(parts.join('/'))
function expandUser(p: string): string {
  if (p === '~') return homedir()
  return p.startsWith('~/') ? homedir() + p.slice(1) : p
}
function isDir(p: string): boolean {
  try { return statSync(p).isDirectory() } catch { return false }
}
function isFile(p: string): boolean {
  try { return statSync(p).isFile() } catch { return false }
}

export const REPO = profiles.REPO
export const PROCESS = pj(REPO, 'process')
export const RUNNERS = pj(PROCESS, 'runners')
export const INSTRUCTIONS = pj(PROCESS, 'instructions.md')
export const CONTRACTS = pj(PROCESS, 'contracts.md')
export const LOCAL_JSON = pj(PROCESS, 'local.json')

// JOBHUNT_SESSIONS_ROOT points SESSIONS (and so LEDGER) at another folder. engine.ts sets it from its
// global --session and --ledger flags.
export let SESSIONS = pj(REPO, 'my-sessions')
if ((process.env['JOBHUNT_SESSIONS_ROOT'] ?? '').trim()) {
  SESSIONS = pathStr(expandUser((process.env['JOBHUNT_SESSIONS_ROOT'] as string).trim()))
}
export const LEDGER = pj(SESSIONS, 'ledger')
// One folder per application sent. It sits beside SESSIONS, so a scratch SESSIONS root keeps its own copy.
export let APPLICATIONS = pj(REPO, 'my-applications')
if (SESSIONS !== pj(REPO, 'my-sessions')) APPLICATIONS = pj(SESSIONS, 'my-applications')
export const APPLICATIONS_INDEX = pj(APPLICATIONS, 'index.json')

export const PROSPECTS = pj(LEDGER, 'prospects.csv')
export const APPLIED = pj(LEDGER, 'applied.csv')
// Forms about to be submitted. Kept apart from applied.csv, so no reader counts a form that may not have gone out.
export const RESERVED = pj(LEDGER, 'reserved.csv')
export const SUGGESTIONS = pj(LEDGER, 'suggestions.csv')   // /retro suggestions and their outcomes
export const DISTINCT = pj(LEDGER, 'distinct.csv')   // pairs of job ids the candidate confirmed are different openings
export const CONTACTED = pj(LEDGER, 'contacted.csv')   // the outreach ledger, written by engine.ts outreach
export const COMPANY_CAREERS = pj(LEDGER, 'company-careers.csv')
export const ATS_DOMAINS = pj(LEDGER, 'ats-domains.csv')
export const ROLES = pj(LEDGER, 'roles')
export const JD_SUFFIX = '.jd.md'          // the full JD text of one role is ROLES/<id>.jd.md
export const ARTIFACTS = pj(LEDGER, 'artifacts')

// A session folder holds notes.md and board.csv in view, and the machine state under STAGE_DIR.
export const STAGE_DIR = '.stage'
export const STAGES = ['sweep', 'extract', 'triage', 'apply'] as const

// ------------------------------------------------------------------ session folder names

// One session folder is named <SESSION_NAME_FORMAT>-hunt, for example 13Oct2026-1155-hunt. A second
// session in the same minute takes a serial before the suffix, as 13Oct2026-1155-2-hunt. The name does not
// sort by date as text, so every caller orders sessions through sessionFolders() and sessionWhen().
export const SESSION_NAME_FORMAT = '%d%b%Y-%H%M'   // strftime form of '{day:02d}{mon}{year:04d}-{hour:02d}{minute:02d}'
export const SESSION_SUFFIX = 'hunt'
// An /outreach run works in <SESSION_NAME_FORMAT>-outreach, with its drafts under STAGE_DIR/OUTREACH_STAGE.
export const OUTREACH_SUFFIX = 'outreach'
// The /outreach lanes, in the order a bare run works them. A new lane is a name here, an O1 step in R14 and a runner section.
export const OUTREACH_LANES = ['roles', 'posts'] as const
export const RETRO_SUFFIX = 'retro'
export const PROFILE_SUFFIX = 'profile'
export const OUTREACH_STAGE = 'outreach'
export const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
export const SESSION_NAME_RE = SESSION_PARTS

// The folder name for a session started at `when`. A serial above 1 is added before the suffix.
export function sessionName(when: Date, serial = 1, suffix: string = SESSION_SUFFIX): string {
  const base = strftime(SESSION_NAME_FORMAT, when)
  return `${base}${serial <= 1 ? '' : '-' + serial}-${suffix}`
}

export type SessionWhen = [start: Date, serial: number, kind: string]

// (start, serial, kind) parsed from a session folder name, or null when it is not one.
// A name without a time starts at midnight. `kind` is the suffix, such as hunt or restructure.
export function sessionWhen(name: string): SessionWhen | null {
  const m = SESSION_NAME_RE.exec(String(name))
  if (!m?.groups) return null
  const g = m.groups
  let y: number, mo: number, d: number
  if (g.mon) {
    if (!(MONTH_ABBR as readonly string[]).includes(g.mon)) return null
    y = Number(g.y1)
    mo = MONTH_ABBR.indexOf(g.mon as typeof MONTH_ABBR[number]) + 1
    d = Number(g.d1)
  } else {
    y = Number(g.y2)
    mo = Number(g.m2)
    d = Number(g.d2)
  }
  const hm = g.hm || '0000'
  const h = Number(hm.slice(0, 2))
  const mi = Number(hm.slice(2))
  const t = new Date(0)
  t.setUTCFullYear(y, mo - 1, d)
  if (y < 1 || mo < 1 || mo > 12 || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d || h > 23 || mi > 59) return null
  t.setUTCHours(h, mi, 0, 0)
  return [new Date(t.getTime() - TZ_OFFSET_MIN * 60_000), Number(g.serial || 1), g.kind]
}

// Session folders under `root` (default SESSIONS), oldest first by the date in the name. A folder
// whose name is not a session name, such as ledger/, is skipped. `kind` keeps one suffix (`hunt`),
// `month` ('2026-10') keeps one month, `needNotes` keeps only folders that hold a notes.md.
export function sessionFolders(root: string | null = null, kind: string | null = null,
                               month: string | null = null, needNotes = false): string[] {
  const base = root !== null ? pathStr(root) : SESSIONS
  if (!isDir(base)) return []
  const found: [Date, number, string, string][] = []
  for (const name of readdirSync(base)) {
    const p = pj(base, name)
    const parsed = isDir(p) ? sessionWhen(name) : null
    if (parsed === null || (kind && parsed[2] !== kind)) continue
    if (month && strftime('%Y-%m', parsed[0]) !== month) continue
    if (needNotes && !isFile(pj(p, 'notes.md'))) continue
    found.push([parsed[0], parsed[1], name, p])
  }
  return found.sort(byKey((x) => [x[0].getTime(), x[1], x[2]])).map((x) => x[3])
}

// A run is stale when its notes.md has not changed for budgets.live_run_stale_hours. A missing notes.md counts
// as stale, so an empty folder never blocks a sitting.
export function isStaleRun(dir: string): boolean {
  const mtime = statSync(pj(dir, 'notes.md'), { throwIfNoEntry: false })?.mtimeMs ?? 0
  return Date.now() - mtime > cfg().live_run_stale_hours * 3_600_000
}

// The run folders of these kinds that are open and not stale. `phase: closed` is the closed test, as in server/held.ts.
export function liveRuns(kinds: readonly string[]): string[] {
  return kinds.flatMap((kind) => sessionFolders(null, kind))
    .filter((d) => !isStaleRun(d) && !/^phase:\s*closed\s*$/mu.test(readFileSync(pj(d, 'notes.md'), 'utf8')))
}

// The profile folder (my-profile/), or exit 2 saying it is missing.
let profileDirMemo: string | undefined
export function profileDir(): string {
  return (profileDirMemo ??= profiles.rootOrExit())
}

export function inputsPath(): string {
  return pj(profileDir(), 'inputs.toml')
}

// ------------------------------------------------------------------ inputs.toml

// (section, key, kind). kind: str, int, num (int or float), strs (list of str), bool (true or false).
type Kind = 'str' | 'int' | 'num' | 'strs' | 'bool'
export const SCHEMA: readonly (readonly [string, string, Kind])[] = [
  ['targets', 'primary', 'strs'],
  ['targets', 'secondary', 'strs'],
  ['targets', 'equivalent_titles', 'strs'],
  ['targets', 'employment', 'str'],
  ['search', 'primary', 'strs'],
  ['search', 'rotation', 'strs'],
  ['search', 'linkedin_geo_id', 'str'],
  ['search', 'linkedin_ea_window_min_minutes', 'int'],
  ['search', 'linkedin_ea_window_max_minutes', 'int'],
  ['search', 'linkedin_ex_posted_within', 'str'],
  ['search', 'live_sources', 'strs'],
  ['search', 'blocked_companies', 'strs'],
  ['reach', 'home_tokens', 'strs'],
  ['reach', 'anywhere_tokens', 'strs'],
  ['reach', 'near_tokens', 'strs'],
  ['reach', 'unstated_points', 'int'],
  ['reach', 'waas_foreign_remote_cap', 'int'],
  ['pay', 'current_inr_lakh', 'num'],
  ['pay', 'expected_india_inr_lakh', 'num'],
  ['pay', 'floor_abroad_usd_year', 'int'],
  ['pay', 'waas_ask_usd_year', 'int'],
  ['pay', 'notice_days_max', 'int'],
  ['linkedin', 'top_choice_per_month', 'int'],
  ['linkedin', 'top_choice_min_match', 'int'],
  ['linkedin', 'resume_url', 'str'],
  ['budgets', 'extract', 'int'],
  ['budgets', 'triage', 'int'],
  ['budgets', 'apply', 'int'],
  ['budgets', 'easy_apply_share', 'num'],
  ['budgets', 'external_min', 'int'],
  ['budgets', 'stale_days', 'int'],
  ['budgets', 'held_max_age_days', 'int'],
  ['budgets', 'live_run_stale_hours', 'int'],
  ['budgets', 'ours_review_days', 'int'],
  ['budgets', 'naukri_refresh_days', 'int'],
  ['budgets', 'waas_messages', 'int'],
  ['scores', 'match_floor', 'int'],
  ['scores', 'semantic_floor', 'int'],
  ['scores', 'semantic_proceed', 'int'],
  ['scores', 'semantic_middle_min_match', 'int'],
  ['scores', 'ea_match_floor', 'int'],
  ['scores', 'waas_send_match_min', 'int'],
  ['scores', 'collapse_fd', 'int'],
  ['scores', 'collapse_ai', 'int'],
  ['scores', 'collapse_level', 'int'],
  ['scores', 'collapse_stack', 'int'],
  ['concurrency', 'matching', 'int'],
  ['concurrency', 'tailoring', 'int'],
  ['concurrency', 'applying', 'int'],
  ['concurrency', 'linkedin_readers', 'int'],
  ['concurrency', 'max_attempts', 'int'],
]

const KIND_NAME: Record<Kind, string> = {
  str: 'a string', int: 'an integer', num: 'a number', strs: 'a list of strings', bool: 'true or false',
}

// JS numbers hide the TOML int/float split, so the keys written as float literals are read off the source.
// Returns "section.key" for every single-line `key = <float literal>` under a [section] header.
function floatKeys(text: string): Set<string> {
  const keys = new Set<string>()
  let section = ''
  for (const line of text.split(/\r?\n/u)) {
    const h = /^\s*\[([^\[\]]+)\]\s*(?:#.*)?$/u.exec(line)
    if (h) { section = h[1].trim(); continue }
    const kv = /^\s*([A-Za-z0-9_-]+)\s*=\s*([^#\s]+)\s*(?:#.*)?$/u.exec(line)
    if (!kv) continue
    const v = kv[2]
    if (/^[+-]?(inf|nan)$/u.test(v) || (/^[+-]?\d[\d_]*(\.\d[\d_]*)?([eE][+-]?\d+)?$/u.test(v) && /[.eE]/u.test(v))) {
      keys.add(`${section}.${kv[1]}`)
    }
  }
  return keys
}

let FLOAT_KEYS = new Set<string>()
const isDict = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date)
const reprv = (v: unknown): string => (typeof v === 'string' ? pyStr([v]).slice(1, -1) : pyStr(v))

function kindOk(kind: Kind, v: unknown, isFloat: boolean): boolean {
  if (kind === 'bool') return typeof v === 'boolean'
  if (typeof v === 'boolean') return false
  if (kind === 'str') return typeof v === 'string'
  if (kind === 'int') return (typeof v === 'bigint' || (typeof v === 'number' && Number.isInteger(v))) && !isFloat
  if (kind === 'num') return typeof v === 'number' || typeof v === 'bigint'
  if (kind === 'strs') return Array.isArray(v) && v.every((x) => typeof x === 'string')
  return false
}

function fail(msg: string): never {
  process.stderr.write(`inputs.toml: ${msg}\n`)
  throw new Exit(2)
}

type Data = Record<string, Record<string, unknown>>
let loadMemo: Data | undefined

// The parsed inputs.toml, validated against SCHEMA. Exits 2 naming the first bad key.
export function load(): Data {
  if (loadMemo) return loadMemo
  const path = inputsPath()
  let text: string
  try {
    text = readFileSync(path, 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return fail(`${path} does not exist. Copy my-profile.example/inputs.toml and fill it in.`)
    }
    throw e
  }
  let data: Record<string, unknown>
  try {
    data = parse(text)
  } catch (e) {
    return fail(`${path} is not valid TOML: ${(e as Error).message}`)
  }
  FLOAT_KEYS = floatKeys(text)
  for (const [section, key, kind] of SCHEMA) {
    const table = data[section]
    if (!isDict(table)) fail(`missing section [${section}] (needed for key ${section}.${key})`)
    if (!Object.hasOwn(table, key) && section === 'search' && key === 'blocked_companies') table[key] = []   // optional, so an older profile loads
    if (!Object.hasOwn(table, key)) fail(`missing key ${section}.${key}`)
    if (!kindOk(kind, table[key], FLOAT_KEYS.has(`${section}.${key}`))) {
      fail(`key ${section}.${key} must be ${KIND_NAME[kind]}, found ${reprv(table[key])}`)
    }
  }
  loadMemo = data as Data
  return loadMemo
}

export interface Config {
  readonly targets_primary: readonly string[]
  readonly targets_secondary: readonly string[]
  readonly equivalent_titles: readonly string[]
  readonly employment: string
  readonly search_primary: readonly string[]
  readonly search_rotation: readonly string[]
  readonly linkedin_geo_id: string
  readonly linkedin_ea_window_min_minutes: number
  readonly linkedin_ea_window_max_minutes: number
  readonly linkedin_ex_posted_within: string
  readonly live_sources: readonly string[]
  readonly blocked_companies: readonly string[]
  readonly home_tokens: readonly string[]
  readonly anywhere_tokens: readonly string[]
  readonly near_tokens: readonly string[]
  readonly unstated_points: number
  readonly waas_foreign_remote_cap: number
  readonly pay: Record<string, unknown>
  readonly top_choice_per_month: number
  readonly top_choice_min_match: number
  readonly resume_url: string
  readonly budgets: Record<string, number>
  readonly easy_apply_share: number
  readonly external_min: number
  readonly stale_days: number
  readonly held_max_age_days: number
  readonly live_run_stale_hours: number
  readonly ours_review_days: number
  readonly naukri_refresh_days: number
  readonly waas_messages: number
  readonly match_floor: number
  readonly semantic_floor: number
  readonly semantic_proceed: number
  readonly semantic_middle_min_match: number
  readonly ea_match_floor: number
  readonly waas_send_match_min: number
  readonly collapse: Record<string, number>
  readonly caps: Record<string, number>
  readonly linkedin_readers: number
  readonly max_attempts: number
}

let cfgMemo: Config | undefined

// The validated inputs as a frozen Config.
export function cfg(): Config {
  if (cfgMemo) return cfgMemo
  const d = load()
  const [t, s, r, p, li, b, sc, c] = ['targets', 'search', 'reach', 'pay', 'linkedin', 'budgets',
    'scores', 'concurrency'].map((k) => d[k]) as Record<string, any>[]
  const strs = (x: string[]): readonly string[] => Object.freeze([...x])
  const lower = (x: string[]): readonly string[] => Object.freeze(x.map((y) => y.toLowerCase()))
  cfgMemo = Object.freeze({
    targets_primary: strs(t.primary),
    targets_secondary: strs(t.secondary),
    equivalent_titles: strs(t.equivalent_titles),
    employment: t.employment,
    search_primary: strs(s.primary),
    search_rotation: strs(s.rotation),
    linkedin_geo_id: s.linkedin_geo_id,
    linkedin_ea_window_min_minutes: s.linkedin_ea_window_min_minutes,
    linkedin_ea_window_max_minutes: s.linkedin_ea_window_max_minutes,
    linkedin_ex_posted_within: s.linkedin_ex_posted_within,
    live_sources: inviteFirst(strs(s.live_sources)),
    blocked_companies: strs(s.blocked_companies),
    home_tokens: lower(r.home_tokens),
    anywhere_tokens: lower(r.anywhere_tokens),
    near_tokens: lower(r.near_tokens),
    unstated_points: r.unstated_points,
    waas_foreign_remote_cap: r.waas_foreign_remote_cap,
    pay: { ...p },
    top_choice_per_month: li.top_choice_per_month,
    top_choice_min_match: li.top_choice_min_match,
    resume_url: li.resume_url,
    budgets: { extract: b.extract, triage: b.triage, apply: b.apply },
    easy_apply_share: Number(b.easy_apply_share),
    external_min: b.external_min,
    stale_days: b.stale_days,
    held_max_age_days: b.held_max_age_days,
    live_run_stale_hours: b.live_run_stale_hours,
    ours_review_days: b.ours_review_days,
    naukri_refresh_days: b.naukri_refresh_days,
    waas_messages: b.waas_messages,
    match_floor: sc.match_floor,
    semantic_floor: sc.semantic_floor,
    semantic_proceed: sc.semantic_proceed,
    semantic_middle_min_match: sc.semantic_middle_min_match,
    ea_match_floor: sc.ea_match_floor,
    waas_send_match_min: sc.waas_send_match_min,
    collapse: { fd: sc.collapse_fd, ai: sc.collapse_ai, level: sc.collapse_level, stack: sc.collapse_stack },
    caps: { matching: c.matching, tailoring: c.tailoring, applying: c.applying },
    linkedin_readers: c.linkedin_readers,
    max_attempts: c.max_attempts,
  })
  return cfgMemo
}

// ------------------------------------------------------------------ engine vocabularies

export const TZ = TZ_OFFSET_MIN   // constants.TZ is a fixed UTC+05:30, in minutes
export const IST = TZ

// prospects.csv status. `ready` is a row a retro supplied a missing fact for; apply works it first.
// `held` is a row the applier did not submit because the form was not clean; /retro settles it.
// `blocked_info` is the older name for the same thing. One row may still carry it, and /retro treats
// it as `held`. Nothing new is written with it.
export const SPENT: ReadonlySet<string> = new Set(['applied'])    // an opening that has been used
export const CLOSED: ReadonlySet<string> = new Set(['dropped', 'skipped'])     // out of the running, may have no channel
// Which statuses each stage picks up, and which closed statuses a candidate override re-enters.
export const STAGE_STATUS: Record<string, ReadonlySet<string>> = {
  extract: new Set(['new']), triage: new Set(['extracted']), apply: new Set(['ready', 'scored']),
}
export const OVERRIDE_REENTRY: Record<string, ReadonlySet<string>> = {
  extract: new Set(['dropped', 'skipped', 'wrong_job']),
}

// `source` is where the role was found. `channel` is how it gets applied to. A source is live when its
// lane is in search.live_sources and process/runners/ holds that lane's runner file. `gmail` and the
// `outreach` channel are legacy values that old rows still carry. No step writes them now.
export const SOURCES: ReadonlySet<string> = new Set(['linkedin', 'waas', 'naukri', 'hirist', 'remote_boards', 'gmail', 'career_page', 'wellfound', 'simplify', 'referral'])
export const CHANNELS: ReadonlySet<string> = new Set(['easy_apply', 'external_ats', 'waas_message', 'outreach', 'direct', 'unknown'])
// Row id prefix per source, as in 2026-09-17-LI-002. Older outreach rows used OUTREACH_PREFIX.
export const PREFIX: Record<string, string> = {
  linkedin: 'LI', waas: 'WA', gmail: 'GM', naukri: 'NK', hirist: 'HR', remote_boards: 'RB', career_page: 'CP', wellfound: 'WF', simplify: 'SI', referral: 'RF',
}
export const OUTREACH_PREFIX = 'OR'

// A Naukri invite is a recruiter reaching out first, so the lane answers every one. Its rows are exempt from the
// score floors, they go first in a hunt, and a plainly wrong one is declined with Not interested. `stated` 2026-11-02
export const INVITE_SOURCE = 'naukri'
const INVITE_ID = new RegExp(`^\\d{4}-\\d{2}-\\d{2}-${PREFIX[INVITE_SOURCE]}-\\d+$`, 'u')
export const isInviteId = (id: unknown): boolean => typeof id === 'string' && INVITE_ID.test(id)
const inviteFirst = (lanes: readonly string[]): string[] => [...lanes].sort((a, b) => Number(b === INVITE_SOURCE) - Number(a === INVITE_SOURCE))

// The runner file for each source, under process/runners/. A source is live when it is in
// search.live_sources and its runner file exists. Turning on a dormant source is one edit to
// live_sources; a source new to the engine also needs its name, prefix and runner file here.
// The keys are lanes: a split source has one runner per lane and none of its own.
export const RUNNER_FILE: Record<string, string> = {
  'linkedin-ea': 'linkedin-ea.md', 'linkedin-ex': 'linkedin-ex.md', waas: 'workatastartup.md', naukri: 'naukri.md',
  hirist: 'hirist.md', remote_boards: 'remote-boards.md', simplify: 'simplify.md', career_page: 'company-sites.md',
}

// A lane is what search.live_sources and a /hunt flag name. A split source's easy_apply rows are in its
// first lane and every other row in its second. Rows keep the source, so the ledger and dedupe are unchanged.
// Any other source is a lane of its own.
export const SPLIT_LANES: Record<string, readonly [string, string]> = { linkedin: ['linkedin-ea', 'linkedin-ex'] }

export function laneOf(source: string, channel: string): string {
  const pair = Object.hasOwn(SPLIT_LANES, source) ? SPLIT_LANES[source] : undefined
  return pair ? pair[channel === 'easy_apply' ? 0 : 1] : source
}

// True when `name` is a lane: an unsplit source, or one half of a split one.
export function isLane(name: string): boolean {
  return Object.hasOwn(SPLIT_LANES, name) ? false
    : SOURCES.has(name) || Object.values(SPLIT_LANES).some((pair) => pair.includes(name))
}

// The runner file for lane `source`, or null when the engine names none or it does not exist.
export function runnerPath(source: string): string | null {
  const name = Object.hasOwn(RUNNER_FILE, source) ? RUNNER_FILE[source] : undefined
  return name && statSync(pj(RUNNERS, name), { throwIfNoEntry: false })?.isFile() ? pj(RUNNERS, name) : null
}

// Stage file vocabularies.
export const DECISIONS = ['scored', 'skipped', 'wrong_job', 'dropped'] as const
// `held` needs a non-empty `reasons` list or `question`. `blocked_info` and `stopped_before_submit` are
// legacy outcomes: ingest still reads them, and settles both as `held`.
// `declined` is a Naukri invite answered with Not interested: ingest settles it as `skipped`.
export const OUTCOMES = ['applied', 'held', 'failed', 'already_applied', 'declined', 'blocked_info', 'stopped_before_submit'] as const
export const HELD_OUTCOMES: ReadonlySet<string> = new Set(['held', 'blocked_info', 'stopped_before_submit'])
export const TRIAGE_COMPONENTS = ['fd_30', 'ai_25', 'reach_20', 'level_15', 'stack_10'] as const
export const HELD_PREFIX = 'HELD:'       // a hold for the candidate's review: `skipped` at any match
export const EA_FLOOR_REASON = 'HELD: easy apply floor, outreach works it' // R1 row 9: /outreach roles takes the row, /retro does not list it
export const DECLINED_PREFIX = 'declined (Not interested):' // ingest's note on a Naukri invite the applier answered with Not interested
export const HELD_AGED = 'held too long' // ingest age's note on a held row it retired
export const SWEEP_ROW_REQUIRED = ['source', 'channel', 'company', 'role', 'link'] as const
export const STAGE_REQUIRED: Record<string, readonly string[]> = {
  sweep: ['source', 'firing', 'rows'],
  extract: ['id', 'role_file', 'closed', 'channel'],
  triage: ['id', ...TRIAGE_COMPONENTS, 'match', 'semantic', 'evidence', 'decision'],
  apply: ['id', 'outcome'],
}

// Application folders (my-applications/). The index keys are in write order. `status` starts at
// `applied` and the candidate moves it by hand; the filer never changes it once set.
export const APPLICATION_KEYS = ['id', 'applied_date', 'company', 'role', 'channel', 'source', 'match', 'link', 'apply_url',
  'folder', 'resume', 'resume_tailored', 'status', 'last_update'] as const
export const APPLICATION_STATUSES = ['applied', 'replied', 'interview', 'rejected', 'offer', 'closed'] as const
export const GENERATED_START = '<!-- generated:start -->'
export const GENERATED_END = '<!-- generated:end -->'
export const APPLICATION_FOLDER_MAX = 70

// Session board lanes, in order (LANES, from lib/vocab.ts). The first six are in flight; the last four are
// terminal. `held` is a row at status `held`, which waits for /retro. `blocked` is a row whose agent died
// max_attempts times; its status does not change, so the next hunt tries it again.
export const LANE_RANK: Record<string, number> = Object.fromEntries(LANES.slice(0, 7).map((lane, i) => [lane, i]))
// Where a row returns when its agent dies without writing a stage file.
export const FALLBACK: Record<string, string> = { matching: 'swept', tailoring: 'matched', applying: 'matched' }
// lane -> [agent, model]. Sonnet or Opus only.
export const AGENT: Record<string, readonly [string, string]> = {
  matching: ['matcher', 'sonnet'], tailoring: ['resume-tailor', 'sonnet'], applying: ['applier', 'sonnet'],
}
// lane -> the letter that starts an owner tag, as in m-2026-09-17-LI-002. Older sessions used
// LEGACY_SENDING_TAG for a submit after approval; the filer still accepts it.
export const OWNER_TAGS: Record<string, string> = { matching: 'm', tailoring: 't', applying: 'a' }
export const LEGACY_SENDING_TAG = 'x'
export const LANE_FOR_STATUS: Record<string, string> = {
  new: 'swept', extracted: 'swept', scored: 'matched', ready: 'matched', queued: 'matched',
  applied: 'sent', held: 'held', blocked_info: 'held',
}
// A hunt is running until it closes. Older sessions used three more phases; validate accepts them
// only on a closed session's history, never as the current phase of an open one.
export const PHASES = ['running', 'closed'] as const
export const LEGACY_PHASES: ReadonlySet<string> = new Set(['awaiting_approval', 'sending', 'retro'])

// Column lists. A CSV whose header differs from its list here fails validation.
export const PROSPECT_COLS = ['id', 'date_found', 'source', 'channel', 'company', 'role', 'location', 'work_mode', 'batch',
  'salary_band', 'salary_period', 'prelim', 'match', 'semantic', 'fd_30', 'ai_25', 'reach_20',
  'level_15', 'stack_10', 'evidence', 'link', 'apply_route', 'contact', 'resume_variant',
  'status', 'applied_date', 'message_file', 'response', 'response_date', 'notes', 'override',
  'reviewed', 'posted_at'] as const
export const APPLIED_COLS = ['key', 'source', 'job_id', 'company', 'company_norm', 'role', 'role_norm', 'link', 'channel',
  'applied_date', 'status', 'role_file', 'notes', 'age_minutes'] as const
export const RESERVED_COLS = ['key', 'source', 'job_id', 'company', 'role', 'link', 'id', 'session', 'date', 'ts',
  'age_minutes'] as const
export const DISTINCT_COLS = ['job_id_a', 'job_id_b', 'date', 'reason'] as const
// contacted.csv: one row per person an /outreach run has read, answered or found through a post.
// `post_url` is the post a prospecting run found them by. A row written before the column existed reads
// with it empty. `channel` is `message`, `inmail` or `connect`. `drafted` waits for approval, `sent` went
// out, `declined` was refused in the approval reply, `skipped` was not job-related or over a cap.
// `accepted` and `withdrawn` apply only to `connect` rows. `sent` is sticky, except that a `connect` row
// moves from `sent` to `accepted` or `withdrawn`. `pending` holds a drafted or declined follow-up to a
// sent person, and is empty otherwise. `role_id` is the prospects.csv id of the role a roles lane row is about, and is empty on every other row.
export const CONTACTED_COLS = ['thread_id', 'vanity', 'post_url', 'name', 'company', 'channel', 'status', 'first_date',
  'last_date', 'session', 'notes', 'pending', 'replied_date', 'role_id'] as const
export const CONTACT_STATUSES = ['drafted', 'sent', 'declined', 'skipped', 'accepted', 'withdrawn'] as const
export const CONTACT_CHANNELS = ['message', 'inmail', 'connect', 'email'] as const
export const BOARD_COLS = ['id', 'company', 'role', 'link', 'source', 'channel', 'lane', 'match', 'resume', 'owner',
  'updated', 'note'] as const
export const COMPANY_CAREERS_COLS = ['company', 'careers_root', 'ats_vendor', 'sweepable', 'first_seen', 'from_role_id',
  'notes'] as const
export const ATS_DOMAINS_COLS = ['company', 'apply_domain', 'vendor', 'account_required', 'granted', 'first_seen',
  'roles_waiting', 'notes'] as const
export const SUGGESTION_COLS = ['id', 'fingerprint', 'date', 'kind', 'text', 'state', 'decided_date', 'outcome', 'session'] as const
export const SUGGESTION_STATES = ['open', 'accepted', 'rejected'] as const

// Findings, as written into notes.md under `## Findings`.
export const FINDING_KINDS = ['answer_gap', 'blocked', 'instruction_drift', 'keyword_gap', 'career_page', 'ats_domain',
  'new_source', 'email'] as const
export const FINDING_STATES = ['open', 'folded', 'proposed', 'asked', 'applied', 'declined'] as const
export const FINDING_KEYS = ['kind', 'stage', 'id', 'source', 'date', 'summary', 'evidence', 'proposed'] as const
// Required keys inside `proposed`, by kind.
export const FINDING_PROPOSED: Record<string, readonly string[]> = {
  answer_gap: ['question'],
  blocked: ['reason', 'action_for_candidate'],
  instruction_drift: ['file', 'said', 'found', 'fix'],
  keyword_gap: ['keyword', 'jd_quote'],
  career_page: ['company', 'url', 'ats'],
  ats_domain: ['domain', 'vendor', 'company'],
  new_source: ['name', 'url', 'access', 'evidence_roles'],
  email: ['link', 'reason', 'to', 'subject', 'body', 'attach_resume'],
}

// notes.md front-matter keys, in write order, and its body sections, in order.
// `go_ahead` is the candidate's in-chat message that started this run, verbatim. It is empty until
// the parent logs it, and a resume clears it, so each run needs its own.
export const FRONT_MATTER_KEYS = ['session', 'started', 'updated', 'phase', 'retro_done', 'go_ahead', 'browser',
  'sources_swept', 'sources_failed', 'roles_harvested', 'roles_dropped_at_sweep',
  'roles_matched', 'scored', 'resumes_built', 'applied', 'held', 'blocked', 'held_back',
  'new_keywords', 'new_portals', 'findings_open', 'questions_open', 'proposals_open',
  'background_agents', 'match_peak', 'tailor_peak', 'apply_peak', 'fan_out', 'security_stop'] as const
// Keys only an older notes.md carries. validate accepts them, and the next recount drops them.
export const LEGACY_FRONT_MATTER_KEYS: ReadonlySet<string> = new Set(['ready_to_send', 'approved', 'outreach_sent', 'replies_drafted'])
// The questions section of notes.md. Named here once so no tool spells it out.
export const QUESTIONS_SECTION = 'Questions for the candidate'
export const NOTES_SECTIONS = ['Resume here', 'Sweeps', 'Send list', 'Decisions', 'Flags', 'Findings', 'Keyword gaps',
  'New portals', QUESTIONS_SECTION, 'Proposals', 'Emails', 'Carry forward', 'Instruction gaps', 'Log'] as const
// Sections the engine writes itself. `session note` refuses these; every other heading is open to it.
export const MANAGED_SECTIONS = ['Resume here', 'Send list', 'Findings', 'Log'] as const
// The note an aged-out row carries. `ingest age` writes it on `new` rows older than budgets.stale_days.
export const AGED_NOTE = 'aged out, never reached'

// Scoring weights. The prelim score orders the queue. It never drops a role.
export const PRELIM_WEIGHTS: Record<string, number> = { fd: 40, ai: 30, reach: 20, level: 10 }
export const PRELIM_PENALTIES: Record<string, number> = { aggregator: -8, presales: -10 }
export const MATCH_WEIGHTS: Record<string, number> = { fd_30: 30, ai_25: 25, reach_20: 20, level_15: 15, stack_10: 10 }
export const REACH_POINTS: Record<string, number> = { home: 20, anywhere: 20, near: 14 }   // the unstated score comes from inputs.toml

// ------------------------------------------------------------------ engine.ts config

function paths(): Record<string, string> {
  const out: Record<string, string> = {
    REPO, PROCESS, RUNNERS, INSTRUCTIONS, CONTRACTS, SESSIONS, LEDGER, PROSPECTS, APPLIED,
    COMPANY_CAREERS, ATS_DOMAINS, CONTACTED, ROLES, ARTIFACTS, APPLICATIONS, LOCAL_JSON,
  }
  out.PROFILE = profileDir()
  out.INPUTS = inputsPath()
  return out
}

const USAGE = 'usage: engine.ts config [-h] [--json]\n'
const HELP = USAGE + `
Print the resolved inputs and paths. Exit 2 on a bad inputs.toml.

options:
  -h, --help  show this help message and exit
  --json      print one JSON object

The [pay] figures are never printed, except pay.notice_days_max, which is a day count. engine.ts pay compares a band with them.
`

// A number the TOML source wrote as a float literal prints as a float.
function typed(section: string, key: string, v: unknown): unknown {
  return typeof v === 'number' && FLOAT_KEYS.has(`${section}.${key}`) ? pyFloat(v) : v
}

export function main(argv: string[], out: Out = (s) => { process.stdout.write(s) }): number {
  const fail2 = (msg: string): number => {
    process.stderr.write(USAGE + `engine.ts config: error: ${msg}\n`)
    return 2
  }
  let json = false
  const extra: string[] = []
  let rest = false
  for (const a of argv) {
    if (!rest && a === '--') { rest = true; continue }
    if (!rest && a.startsWith('-') && a !== '-') {
      if (a === '-h' || (a.length > 2 && '--help'.startsWith(a))) { out(HELP); return 0 }
      if (a.length > 2 && '--json'.startsWith(a)) { json = true; continue }
      if (a.startsWith('--json=') || a.startsWith('--help=')) {
        return fail2(`argument ${a.startsWith('--json=') ? '--json' : '-h/--help'}: ignored explicit argument ${reprv(a.slice(a.indexOf('=') + 1))}`)
      }
    }
    extra.push(a)
  }
  if (extra.length) return fail2(`unrecognized arguments: ${extra.join(' ')}`)
  const c = cfg()
  const raw = load()
  const values: Record<string, unknown> = {}   // --json keeps the flat Config field names
  for (const [k, v] of Object.entries(c)) values[k] = v
  values.pay = { notice_days_max: typed('pay', 'notice_days_max', raw.pay.notice_days_max) }   // a day count; the pay figures stay out of an agent's context
  values.easy_apply_share = pyFloat(c.easy_apply_share)
  const p = paths()
  if (json) {
    out(pyJson({ paths: p, inputs: values }, { indent: 2, ensureAscii: false }) + '\n')
    return 0
  }
  out('paths\n')
  for (const [k, v] of Object.entries(p)) out(`  ${k.padEnd(16)} ${v}\n`)
  out('inputs\n')
  for (const [section, key] of SCHEMA) {
    out(`  ${(section + '.' + key).padEnd(34)} ${section === 'pay' && key !== 'notice_days_max' ? '(private, not printed)' : pyStr(typed(section, key, raw[section][key]))}\n`)
  }
  return 0
}
