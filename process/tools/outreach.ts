// The contacted ledger and the /outreach run folder. Only /outreach and its two agents call this module.
//
// contacted.csv (`constants.CONTACTED`) holds one row per person whose LinkedIn message an outreach run
// has read or answered, or whose post a prospecting run kept. It answers one question before every send:
// has this person had our message? Five keys find a row, tried in this order, and the first hit wins:
//   1. thread_id       the LinkedIn messaging thread id, exact
//   2. post_url        the post the person was found by, in the form normalisePost gives
//   3. vanity          the /in/<vanity> handle, lower-cased
//   4. name|company    the name and the company, normalised, both non-empty on both sides
//   5. role_id         the prospects.csv id of a role, exact, and only on a row that names no person
// A row recorded without a thread id, such as a seeded one, takes the thread id the first time a
// thread matches it by a later key. `record` never adds a row that has none of the five keys.
// A `sent` row is sticky: no later `record` moves its status back. A drafted or declined follow-up to a
// sent person goes in the `pending` column, and `record --status sent` clears it, as `--status skipped` does
// for a pending `drafted`. The one exception is a `connect` row, which moves from `sent` to `accepted` or
// `withdrawn`. An `accepted` row takes replies as a `sent` row does and stays `accepted`. Those two are
// final: no later `record` replaces them, and `withdrawn` takes no reply.
//
// Usage (through engine.ts)
//     outreach check  [--thread T] [--post P] [--vanity V] [--name N] [--company C] [--role R]   exit 2 when status is sent or accepted
//     outreach record [--thread T] [--post P] [--vanity V] [--name N] [--company C] [--role R] --status S
//                     [--channel CH] [--date D] [--notes X] [--by-candidate]   status sent needs --session R, or --by-candidate
//     outreach drafted                    rows at status drafted, and sent rows with pending drafted, with post and session
//     outreach inputs                     the [outreach] keys in inputs.toml; an absent quote is an open question
//     outreach prospect-inputs            the [prospect] keys in inputs.toml
//     outreach queries                    the post search URLs, pass first before pass all
//     outreach lanes                      the live /outreach lanes from prospect.live_lanes, in run order
//     outreach roles                      the applied or held roles the roles lane has not worked yet; reads only
//     outreach budget                     invitations and InMails left, and requests due for withdrawal
//     outreach tags                       unknown tags across every outreach run, with post counts
//     outreach open [--kind retro|profile]   start a run folder and print its path; no kind is an outreach run
//     outreach stop --reason X            log a LinkedIn security stop and a blocked finding (needs --session)
//     outreach cooldown                   print clear, or until <iso> and exit 2 inside prospect.security_cooldown_hours
//     outreach recent-sent                sent or accepted threads inside outreach.recheck_sent_days, for the inbox read to re-open
//     outreach replied --thread T --date D [--vanity V] [--name N --company C]   set replied_date on the row
//     outreach unsent                     approved items the contacted ledger does not show as sent (needs --session)
//     outreach list                       number the drafts for approval            (needs --session)
//     outreach approve --body-file F      read an approval reply                    (needs --session)
//     outreach log <text>                 one line under ## Log                     (needs --session)
//     outreach tag --tag T --post P       note an unknown tag on a kept post        (needs --session)
//     outreach jobs                       ingest the run's .stage/jobs.json as sweep rows, each under its own source (needs --session)
//     outreach close                      count the run and close it                (needs --session)
// --session names an outreach, retro, profile or hunt run folder (a hunt is named only for `stop`).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, relative, resolve } from 'node:path'
import * as C from '../constants.ts'
import { readDicts, writeDicts, type CsvRow } from '../lib/csv.ts'
import { decodeStrict, isoSeconds, pyStrip, strftime } from '../lib/py.ts'
import { Help, UsageError, locked, normaliseCompany, parseSub } from './dedupe.ts'
import { ingest, IngestError } from './ingest.ts'
import { Exit, withLock, writeAtomic, type Out } from './io.ts'
import { findingAdd, readFront } from './session.ts'

const NOTES = 'notes.md'
const APPROVAL_JSON = 'approval.json'   // written by list: the numbered items
const APPROVED_JSON = 'approved.json'   // written by approve: what to send, hold and decline
const TAGS_JSON = 'tags.json'           // written by tag: [{tag, post_url}] for unknown tags on kept posts
const JOBS_JSON = 'jobs.json'           // written by the post-reader under .stage: sweep rows for the hunt
const FIRING = /^\d{4}-\d{2}-\d{2}-\d{2}$/u   // the form ingest requires of a sweep file's firing

// ------------------------------------------------------------------ the contacted ledger

export interface Who { thread: string; post: string; vanity: string; name: string; company: string; role?: string }

export function normaliseVanity(v: string | undefined): string {
  let t = pyStrip(v ?? '').toLowerCase()
  const m = /\/in\/([^/?#\s]+)/u.exec(t)
  if (m) t = m[1]
  return t.replace(/^\/+|\/+$/gu, '')
}

export function normaliseName(s: string | undefined): string {
  return pyStrip((s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' '))
}

// A post URL in one form. A URL with an activity id becomes its feed URL, so the /posts/ and
// /feed/update/ forms of one post match. Any other URL loses its query and fragment.
export function normalisePost(u: string | undefined): string {
  const t = pyStrip(u ?? '')
  const m = /activity[:-](\d+)/u.exec(t)
  return m ? `https://www.linkedin.com/feed/update/urn:li:activity:${m[1]}/` : t.replace(/[?#].*$/su, '')
}
export const POST_URL = /^https?:\/\/([\w-]+\.)?linkedin\.com\/\S+$/iu
const TAG = /^#[^\s#]+$/u

const oneLine = (s: string): string => pyStrip(s.replace(/\s+/gu, ' '))
const addNote = (old: string | undefined, line: string): string => (old ? `${old} | ${line}` : line)

export function hasKey(who: Who): boolean {
  return !!(pyStrip(who.thread) || normalisePost(who.post) || normaliseVanity(who.vanity) ||
            (normaliseName(who.name) && normaliseCompany(who.company)) || pyStrip(who.role ?? ''))
}

export function load(): CsvRow[] {
  if (!existsSync(C.CONTACTED)) return []
  return readDicts(decodeStrict(readFileSync(C.CONTACTED))).rows
}

function save(rows: CsvRow[]): void {
  const full = rows.map((r) => Object.fromEntries(C.CONTACTED_COLS.map((c) => [c, r[c] ?? ''])))
  writeAtomic(C.CONTACTED, writeDicts(C.CONTACTED_COLS, full))
}

// [row, which key] for the first row that matches `who`, or [null, null].
export function match(who: Who, rows: CsvRow[]): [CsvRow, string] | [null, null] {
  const t = pyStrip(who.thread)
  if (t) for (const r of rows) if (r['thread_id'] === t) return [r, 'thread']
  const p = normalisePost(who.post)
  if (p) for (const r of rows) if (normalisePost(r['post_url']) === p) return [r, 'post']
  const v = normaliseVanity(who.vanity)
  if (v) for (const r of rows) if (normaliseVanity(r['vanity']) === v) return [r, 'vanity']
  const n = normaliseName(who.name)
  const c = normaliseCompany(who.company)
  if (n && c) {
    for (const r of rows) {
      const rn = normaliseName(r['name'])
      const rc = normaliseCompany(r['company'] ?? '')
      if (rn && rc && rn === n && rc === c) return [r, 'name|company']
    }
  }
  const role = pyStrip(who.role ?? '')
  // A role key finds only a row that names no person: the no contact row the roles lane leaves for a role nobody could be found for.
  if (role) for (const r of rows) if (r['role_id'] === role && !normaliseVanity(r['vanity']) && !pyStrip(r['name'] ?? '')) return [r, 'role']
  return [null, null]
}

// The kinds of run folder this module works in: /outreach, /retro and /profile.
const RUN_KINDS: readonly string[] = [C.OUTREACH_SUFFIX, C.RETRO_SUFFIX, C.PROFILE_SUFFIX]
// A hunt takes a security stop and nothing else, so only `stop` and the cooldown read it.
const STOP_KINDS: readonly string[] = [...RUN_KINDS, C.SESSION_SUFFIX]
const kindOf = (run: string): string => C.sessionWhen(basename(run))?.[2] ?? ''

// The folder of the run of these kinds that --session names, or null when it names none.
function runFolder(kinds = RUN_KINDS): string | null {
  const s = pyStrip(process.env['JOBHUNT_SESSION'] ?? '')
  return s && kinds.includes(kindOf(s)) ? s : null
}

export interface Recorded { row: CsvRow; created: boolean; via: string | null }

export class RecordError extends Error {}

const ANSWERED = new Set(['accepted', 'withdrawn'])   // what a sent connection request can become
const REPLIES = new Set(['drafted', 'sent', 'skipped'])   // what an accepted row takes, and stays accepted
// A row whose message or invitation went out and stands: a later message to it is a follow-up.
const wentOut = (r: CsvRow): boolean => r['status'] === 'sent' || r['status'] === 'accepted'

// Upsert one row under the ledger lock. A status of sent is sticky: on a sent row, drafted and declined
// set `pending` and leave status and last_date alone, skipped clears a pending `drafted` and changes neither
// status nor session, and sent clears `pending` and moves last_date, except on a connect or inmail row, whose
// first send date stays. A sent connect row may move to accepted
// or withdrawn; its last_date keeps the send date, which `budget` counts, and the notes keep the new date.
// An accepted row takes drafted, sent and skipped like a sent row, except that sent leaves last_date alone
// and puts its date in the notes. It takes nothing else, and a withdrawn row takes nothing, or `budget`
// would stop counting its invitation. On any other row the status and last_date move to the new values and
// `pending` stays empty.
// An empty column on the row is filled from `who`; a different thread id replaces the old one,
// and the old one is kept in the notes. `channel` sets the channel of a new row, default message, and of
// a row not yet sent; empty leaves it alone.
export function record(who: Who, status: string, date: string, notes: string, channel = ''): Recorded {
  const run = runFolder()
  const session = run ? basename(run) : ''
  return locked(C.CONTACTED, (): Recorded => {
    const rows = load()
    const [hit, via] = match(who, rows)
    if (ANSWERED.has(status) && !(hit && hit['channel'] === 'connect' && (hit['status'] === 'sent' || hit['status'] === status))) {
      throw new RecordError(`${status} applies only to a connect row at status sent, and ` +
        (hit ? `the matching row is a ${hit['channel'] || 'message'} row at ${hit['status']}` : 'no row matches'))
    }
    if (hit && ANSWERED.has(hit['status'] ?? '') && hit['status'] !== status && !(hit['status'] === 'accepted' && REPLIES.has(status))) {
      throw new RecordError(`the matching row is ${hit['status']}, which is final, so ${status} cannot replace it`)
    }
    // A reply to a row that stays as it is: a follow-up to a sent row, or any reply to an accepted one.
    const keeps = !!hit && (hit['status'] === 'sent' ? status !== 'sent' : hit['status'] === 'accepted' && status !== 'accepted')
    const line = notes ? `${date} ${status}: ${oneLine(notes)}`
      : ANSWERED.has(status) || (hit?.['status'] === 'accepted' && status === 'sent') ? `${date} ${status}` : ''
    if (hit) {
      const t = pyStrip(who.thread)
      if (t && hit['thread_id'] && hit['thread_id'] !== t) hit['notes'] = addNote(hit['notes'], `${date} thread was ${hit['thread_id']}`)
      if (t) hit['thread_id'] = t
      const fill: [string, string][] = [['vanity', normaliseVanity(who.vanity)], ['post_url', normalisePost(who.post)],
        ['name', pyStrip(who.name)], ['company', pyStrip(who.company)], ['role_id', pyStrip(who.role ?? '')]]
      for (const [col, value] of fill) if (value && !pyStrip(hit[col] ?? '')) hit[col] = value
      if (channel && !INVITED.has(hit['status'] ?? '')) hit['channel'] = channel
      if (hit['status'] === 'sent' && ANSWERED.has(status)) {
        hit['status'] = status
        hit['pending'] = ''
      } else if (keeps) {
        if (status === 'drafted' || status === 'declined') hit['pending'] = status
        else if (status === 'sent' || hit['pending'] === 'drafted') hit['pending'] = ''   // sent: replied; skipped: the draft is dropped
      } else if (hit['status'] !== status || !ANSWERED.has(status)) {
        // A repeat send to a connect or inmail row keeps its first date, so budget does not count it twice.
        const repeat = hit['status'] === 'sent' && status === 'sent' && (hit['channel'] === 'connect' || hit['channel'] === 'inmail')
        hit['status'] = status
        if (!repeat) hit['last_date'] = date
        hit['pending'] = ''
      }
      if (session && !(keeps && status === 'skipped')) hit['session'] = session
      if (line) hit['notes'] = addNote(hit['notes'], line)
      save(rows)
      return { row: hit, created: false, via }
    }
    const row: CsvRow = {
      thread_id: pyStrip(who.thread), vanity: normaliseVanity(who.vanity), post_url: normalisePost(who.post),
      name: pyStrip(who.name), company: pyStrip(who.company), channel: channel || 'message', status,
      first_date: date, last_date: date, session, notes: line, pending: '', role_id: pyStrip(who.role ?? ''),
    }
    rows.push(row)
    save(rows)
    return { row, created: true, via: null }
  })
}

// What the row stands at now: the pending follow-up when there is one, else the status.
export const stateOf = (r: CsvRow): string => r['pending'] || r['status'] || ''

// A draft or item is a prospect one when it names a post or a role.
const isProspect = (x: { post_url?: string; role_id?: string }): boolean => !!(x.post_url || x.role_id)

const keyOf = (r: CsvRow): string =>
  r['thread_id'] ? `thread:${r['thread_id']}`
    : r['vanity'] ? `vanity:${r['vanity']}`
      : r['post_url'] ? `post:${r['post_url']}`
        : r['role_id'] && !r['name'] ? `role:${r['role_id']}`
          : `person:${normaliseName(r['name'])}|${normaliseCompany(r['company'] ?? '')}`

// ------------------------------------------------------------------ inputs.toml [outreach]

export interface OutreachInputs {
  quote_contract_usd_hour: number | null   // null: the candidate has not given it
  quote_fulltime_annual: string | null     // null: the candidate has not given it
  max_replies_per_run: number
  recheck_sent_days: number
}

const isTable = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date)

function inputsFail(msg: string): never {
  process.stderr.write(`inputs.toml: ${msg}\n`)
  throw new Exit(2)
}

// The [outreach] keys. Both quotes are optional, and an absent one is an open question for the
// candidate. max_replies_per_run and recheck_sent_days are required.
export function outreachInputs(): OutreachInputs {
  const t: unknown = C.load()['outreach']
  if (!isTable(t)) return inputsFail('missing section [outreach] (needed for key outreach.max_replies_per_run)')
  const hour = t['quote_contract_usd_hour']
  if (hour !== undefined && !(typeof hour === 'number' && hour > 0)) inputsFail('key outreach.quote_contract_usd_hour must be a number above 0')
  const annual = t['quote_fulltime_annual']
  if (annual !== undefined && !(typeof annual === 'string' && pyStrip(annual))) inputsFail('key outreach.quote_fulltime_annual must be a non-empty string, such as "USD 60000"')
  const cap = t['max_replies_per_run']
  if (cap === undefined) inputsFail('missing key outreach.max_replies_per_run')
  if (!(typeof cap === 'number' && Number.isInteger(cap) && cap >= 1)) inputsFail('key outreach.max_replies_per_run must be an integer of 1 or more')
  const days = t['recheck_sent_days']
  if (days === undefined) inputsFail('missing key outreach.recheck_sent_days')
  if (!(typeof days === 'number' && Number.isInteger(days) && days >= 1)) inputsFail('key outreach.recheck_sent_days must be an integer of 1 or more')
  return {
    quote_contract_usd_hour: typeof hour === 'number' ? hour : null,
    quote_fulltime_annual: typeof annual === 'string' ? pyStrip(annual) : null,
    max_replies_per_run: cap as number,
    recheck_sent_days: days as number,
  }
}

// ------------------------------------------------------------------ inputs.toml [prospect]

export interface ProspectInputs {
  hiring_tags: string[]; role_tags: string[]; place_tags: string[]; ignored_tags: string[]
  posted_within: string; max_search_pages: number; invites_per_day: number; invites_per_week: number
  withdraw_after_days: number; max_pending_invites: number; inmail_per_month: number; note_max_chars: number
  security_cooldown_hours: number; max_sends_per_run: number
}

const TAG_LISTS = ['hiring_tags', 'role_tags', 'place_tags', 'ignored_tags'] as const
const POSTED_WITHIN = ['past-24h', 'past-week', 'past-month']
const PROSPECT_COUNTS = ['max_search_pages', 'invites_per_day', 'invites_per_week', 'withdraw_after_days',
  'max_pending_invites', 'inmail_per_month', 'note_max_chars', 'security_cooldown_hours', 'max_sends_per_run'] as const
const ZERO_TURNS_OFF = new Set(['invites_per_day', 'invites_per_week', 'inmail_per_month'])   // 0 stops that channel

// The [prospect] keys, checked in the order the table lists them. It is not in SCHEMA, so a profile
// without it can still run the inbox. The first missing or mistyped key exits 2.
export function prospectInputs(): ProspectInputs {
  const t: unknown = C.load()['prospect']
  if (!isTable(t)) return inputsFail('missing section [prospect] (needed for key prospect.hiring_tags)')
  const need = (k: string): unknown => (t[k] === undefined ? inputsFail(`missing key prospect.${k}`) : t[k])
  for (const k of TAG_LISTS) {
    const v = need(k)
    if (!(Array.isArray(v) && v.every((x) => typeof x === 'string' && TAG.test(x)))) inputsFail(`key prospect.${k} must be a list of tags, each like "#hiring"`)
  }
  if (!POSTED_WITHIN.includes(need('posted_within') as string)) inputsFail(`key prospect.posted_within must be one of ${POSTED_WITHIN.join(', ')}`)
  for (const k of PROSPECT_COUNTS) {
    const v = need(k)
    const min = ZERO_TURNS_OFF.has(k) ? 0 : 1
    if (!(typeof v === 'number' && Number.isInteger(v) && v >= min)) inputsFail(`key prospect.${k} must be an integer of ${min} or more`)
  }
  return t as unknown as ProspectInputs
}

export interface LaneInputs { live_lanes: string[]; roles_match_min: number; roles_per_run: number; people_searches_per_run: number }

// The keys of the /outreach lanes, checked in this order. Apart from prospectInputs, so the posts lane does not depend on them.
export function laneInputs(): LaneInputs {
  const t: unknown = C.load()['prospect']
  if (!isTable(t)) return inputsFail('missing section [prospect] (needed for key prospect.live_lanes)')
  const need = (k: string): unknown => (t[k] === undefined ? inputsFail(`missing key prospect.${k}`) : t[k])
  const lanes = need('live_lanes')
  if (!(Array.isArray(lanes) && lanes.every((x) => typeof x === 'string' && (C.OUTREACH_LANES as readonly string[]).includes(x)))) {
    inputsFail(`key prospect.live_lanes must be a list of lanes from ${C.OUTREACH_LANES.join(', ')}`)
  }
  const m = need('roles_match_min')
  if (!(typeof m === 'number' && Number.isInteger(m) && m >= 0 && m <= 100)) inputsFail('key prospect.roles_match_min must be an integer from 0 to 100')
  for (const k of ['roles_per_run', 'people_searches_per_run']) {
    const v = need(k)
    if (!(typeof v === 'number' && Number.isInteger(v) && v >= 1)) inputsFail(`key prospect.${k} must be an integer of 1 or more`)
  }
  return t as unknown as LaneInputs
}

// Applied or held roles at or above the bar that no contacted row has worked, with the marks that put a role first.
export function dueRoles(li: LaneInputs, prospects: CsvRow[], contacted: CsvRow[]): { row: CsvRow; first: string[] }[] {
  // A role is worked once a contacted row carries its id, except a skipped row that is not a no contact row: that role comes back.
  const worked = new Set(contacted.filter((r) => r['role_id'] && (r['status'] !== 'skipped' || /\bno contact:/u.test(r['notes'] ?? ''))).map((r) => r['role_id']))
  const out: { row: CsvRow; first: string[] }[] = []
  for (const row of prospects) {
    const status = row['status'] ?? ''
    const match = row['match'] ?? ''
    if (!(C.SPENT.has(status) || C.HELD_STATUSES.has(status) || (status === 'skipped' && (row['notes'] ?? '').includes(C.EA_FLOOR_REASON))) || match === '' || !(Number(match) >= li.roles_match_min) || worked.has(row['id'])) continue
    const ext = /extract: [^|]*/u.exec(row['notes'] ?? '')?.[0] ?? ''
    const location = row['location'] ?? ''
    const first: string[] = []
    if ((row['work_mode'] ?? '').toLowerCase() === 'remote' || /remote_scope=(?:anywhere|country:)/u.test(ext) || /\bremote\b/iu.test(location)) first.push('remote')
    if (/\bemployment=(?:contract|temporary)/iu.test(ext) ||
        [row['role'], row['salary_band'], row['salary_period']].some((x) => /\b(?:contract(?:or)?|hourly|freelance)\b|\/\s*h(?:ou)?r\b/iu.test(x ?? ''))) first.push('contract')
    out.push({ row, first })
  }
  const n = (r: CsvRow, k: string): string => r[k] ?? ''
  return out.sort((a, b) => b.first.length - a.first.length || Number(b.row['match']) - Number(a.row['match']) ||
    n(b.row, 'date_found').localeCompare(n(a.row, 'date_found')) || n(b.row, 'id').localeCompare(n(a.row, 'id')))
}

// Lower-cased tag -> the list that holds it.
function knownTags(p: ProspectInputs): Map<string, string> {
  return new Map(TAG_LISTS.flatMap((k) => p[k].map((tag): [string, string] => [tag.toLowerCase(), k])))
}

// [pass, url] for every post search, pass first before pass all. If LinkedIn ignores AND and OR with
// hashtags, this is the one function to change, to one query per role and hiring tag pair.
export function queries(p: ProspectInputs): [string, string][] {
  const out: [string, string][] = []
  for (const pass of ['first', 'all']) {
    for (const role of p.role_tags) {
      const kw = p.hiring_tags.length ? `${role} AND (${p.hiring_tags.join(' OR ')})` : role
      const url = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(kw)}` +
        `&sortBy=%22date_posted%22&datePosted=%22${p.posted_within}%22`
      out.push([pass, pass === 'first' ? `${url}&postedBy=%5B%22first%22%5D` : url])
    }
  }
  return out
}

export interface Budget { today: number; week: number; pending: number; inmail: number; due: CsvRow[] }

const INVITED = new Set(['sent', ...ANSWERED])   // a connect row whose request went out
// The IST date `n` days before now. IST has no daylight saving, so whole days are exact.
const daysAgo = (n: number): string => strftime('%Y-%m-%d', new Date(Date.now() - n * 86_400_000))

// What this lane has spent, from contacted.csv. A connect row's last_date is its send date. The week is
// the 7 days to today. A request is due for withdrawal when it is still sent after withdraw_after_days.
export function budget(p: ProspectInputs, rows: CsvRow[] = load()): Budget {
  const today = daysAgo(0)
  const invites = rows.filter((r) => r['channel'] === 'connect' && INVITED.has(r['status'] ?? ''))
  const pending = invites.filter((r) => r['status'] === 'sent')
  return {
    today: invites.filter((r) => r['last_date'] === today).length,
    week: invites.filter((r) => (r['last_date'] ?? '') >= daysAgo(6)).length,
    pending: pending.length,
    inmail: rows.filter((r) => r['channel'] === 'inmail' && r['status'] === 'sent' && (r['last_date'] ?? '').startsWith(today.slice(0, 7))).length,
    due: pending.filter((r) => (r['last_date'] ?? '') <= daysAgo(p.withdraw_after_days)),
  }
}

// Why one more item on `channel` breaks the budget, or '' when it fits. `extra` counts items approved
// but not yet recorded as sent.
function overBudget(channel: string, b: Budget, p: ProspectInputs, extra: number): string {
  const caps: [string, number, number][] = channel === 'inmail' ? [['inmail this month', b.inmail, p.inmail_per_month]]
    : [['invites today', b.today, p.invites_per_day], ['invites this week', b.week, p.invites_per_week],
       ['pending', b.pending, p.max_pending_invites]]
  const hit = caps.find(([, used, cap]) => used + extra >= cap)
  return hit ? `over budget: ${hit[0]} ${hit[1] + extra}/${hit[2]}` : ''
}

// ------------------------------------------------------------------ the security cooldown

const STOP_KEY = 'security_stop'

// When the cooldown after the newest security stop ends, or null when none is running. Any outreach, retro,
// profile or hunt run records a stop as `security_stop: <iso>` in its front-matter, because LinkedIn's check
// covers the whole account.
export function cooldownUntil(): Date | null {
  const hours = prospectInputs().security_cooldown_hours
  let last = 0
  for (const kind of STOP_KINDS) {
    for (const dir of C.sessionFolders(null, kind)) {
      const at = Date.parse(String(readFront(join(dir, NOTES))[STOP_KEY] ?? ''))   // NaN for a missing or unreadable time
      if (at > last) last = at
    }
  }
  const until = last + hours * 3_600_000
  return until > Date.now() ? new Date(until) : null
}

// Log a LinkedIn security stop in the run, and add a blocked finding for /retro. Returns the finding id.
export function stopRun(run: string, reason: string): string {
  const why = oneLine(reason)
  editNotes(run, { [STOP_KEY]: isoSeconds() }, 'Log', [`- ${logStamp()}  security stop: ${why}`])
  const hours = prospectInputs().security_cooldown_hours
  return findingAdd(run, {
    kind: 'blocked', stage: kindOf(run), summary: `LinkedIn security check stopped the run: ${why}`, evidence: why,
    proposed: {
      reason: `LinkedIn showed a security check: ${why}`,
      action_for_candidate: `Clear the check in the pinned Chrome yourself. /outreach and the LinkedIn lanes of /hunt stay closed for ${hours} hours after the stop.`,
    },
  })
}

// ------------------------------------------------------------------ the run folder

const display = (p: string): string => {
  const r = relative(C.REPO, p)
  return r && !r.startsWith('..') && !r.startsWith('/') ? r : p
}
const logStamp = (t: Date = new Date()): string => `${strftime('%Y-%m-%d %H:%M:%S', t)} IST`
const stageDir = (run: string): string => join(run, C.STAGE_DIR, C.OUTREACH_STAGE)

const RUN_HEADING: Record<string, string> = { [C.OUTREACH_SUFFIX]: 'Outreach', [C.RETRO_SUFFIX]: 'Retro', [C.PROFILE_SUFFIX]: 'Profile' }

// Create <SESSIONS>/<DDMonYYYY-HHMM>-<suffix>/ with its notes.md and stage folder. Returns the folder.
export function openRun(suffix: string = C.OUTREACH_SUFFIX, now: Date = new Date()): string {
  mkdirSync(C.SESSIONS, { recursive: true })
  let serial = 1
  let name = C.sessionName(now, serial, suffix)
  while (existsSync(join(C.SESSIONS, name))) name = C.sessionName(now, ++serial, suffix)
  const dir = join(C.SESSIONS, name)
  mkdirSync(stageDir(dir), { recursive: true })
  const stamp = isoSeconds(now)
  writeFileSync(join(dir, NOTES), [
    '---', `session: ${name}`, `started: ${stamp}`, `updated: ${stamp}`, 'phase: running', 'retro_done: yes',
    'replied: 0', 'held: 0', 'declined: 0', 'skipped: 0', '---', '',
    `# ${RUN_HEADING[suffix]} ${strftime('%Y-%m-%d %H:%M', now)} IST`, '', '## Approval', '', '## Log', '',
    `- ${logStamp(now)}  ${suffix} started`, '',
  ].join('\n'), 'utf8')
  return dir
}

// Under the run's lock: set front-matter keys, adding any that notes.md does not hold yet, then append `lines`
// to the end of `## <section>`. `updated` is always set.
function editNotes(run: string, front: Record<string, string>, section: string, lines: string[]): void {
  withLock(join(run, '.lock'), () => {
    const path = join(run, NOTES)
    const all = readFileSync(path, 'utf8').replace(/\r\n?/gu, '\n').split('\n')
    const end = all[0] === '---' ? all.indexOf('---', 1) : -1
    const want: Record<string, string> = { updated: isoSeconds(), ...front }
    const seen = new Set<string>()
    for (let i = 1; i < end; i++) {
      const key = all[i].split(':')[0]
      if (Object.hasOwn(want, key)) { all[i] = `${key}: ${want[key]}`; seen.add(key) }
    }
    if (end > 0) all.splice(end, 0, ...Object.keys(want).filter((k) => !seen.has(k)).map((k) => `${k}: ${want[k]}`))
    const h = all.indexOf(`## ${section}`)
    if (h < 0) throw new Exit(`outreach: ${path} has no ## ${section}`)
    let next = all.findIndex((ln, i) => i > h && ln.startsWith('## '))
    if (next < 0) next = all.length
    let at = next
    while (at > h + 1 && pyStrip(all[at - 1]) === '') at--
    all.splice(at, 0, ...(at === h + 1 && lines[0] !== '' ? ['', ...lines] : lines))
    writeAtomic(path, all.join('\n'))
  })
}

// ------------------------------------------------------------------ drafts

export interface Draft {
  file: string                       // the file name under <run>/.stage/outreach/
  front: Record<string, string>
  reply: string[]                    // the lines of ## Reply, blank lines at both ends removed
  questions: Map<string, string>     // Q1 -> the question
  inferred: string[]                 // the claims in ## Claims that carry the ours tag
  held: string[]                     // the held claims in ## Claims, each as "<claim> (<reason>)"
  errors: string[]
}

const SLOT = /^\[(Q\d+)\]$/u
const QUESTION = /^-\s*(Q\d+):\s*(\S.*)$/u
const CLAIM_OURS = /^-\s*(\S.*):[^:]*,\s*ours\b[^,]*$/u   // "- <claim>: <source file>, ours"
const CLAIM_HELD = /^-\s*held:\s*(\S.*):[^:]*,\s*([^,]+)$/u   // "- held: <claim>: <source file>, <reason>"

function trimBlank(lines: string[]): string[] {
  let a = 0
  let b = lines.length
  while (a < b && !pyStrip(lines[a])) a++
  while (b > a && !pyStrip(lines[b - 1])) b--
  return lines.slice(a, b)
}

// ------------------------------------------------------------------ the draft lint
// The checks a draft passes before anyone sees it. An error names the category and never the text it matched.

const PROSPECT_LINT: [RegExp, string][] = [
  [/\b\d+\b/u, 'a standalone number'],
  [/https?:\/\/|www\./iu, 'a URL'],
  [/[^\s@]+@[^\s@]+\.[^\s@]+/u, 'an email address'],
  [/[\u2013\u2014]/u, 'an em or en dash'],
  [/\b(?:lakhs?|lacs?|lpa|crores?|usd|inr)\b|[$\u20B9]/iu, 'a pay word'],
]
const ONE_RESUME = /\b(?:my version|the version|tailored|variant)\b/iu   // the candidate has one resume to the outside world
const noCommas = (s: string): string => s.replace(/(\d),(?=\d)/gu, '$1')

// Every run of three or more digits in ## Private pay of profile.md and in the [pay] table, read once and never printed.
// A year from 1990 to 2039 is left out, because a draft names years and a figure that looks like one is rare.
// A figure of one or two digits, with its decimal and its whole part, goes in too: lintDraft counts it only beside a pay word.
// The outreach.quote_* figures are left out, because a reply may state them.
let payMemo: Set<string> | undefined
function payTokens(): Set<string> {
  if (payMemo) return payMemo
  const toks = new Set<string>()
  const eat = (v: unknown): void => {
    if (typeof v === 'number' || typeof v === 'string') {
      const s = noCommas(String(v)).replace(/\b\d{4}-\d{2}-\d{2}\b/gu, ' ')   // an authority tag's date is not pay
      for (const m of s.matchAll(/\d{3,}/gu)) if (!/^(?:199\d|20[0-3]\d)$/u.test(m[0])) toks.add(m[0])
      for (const m of s.matchAll(/(?<![\d.])\d{1,2}(?:\.\d+)?(?!\d)/gu)) { toks.add(String(Number(m[0]))); toks.add(m[0].split('.')[0]) }
    } else if (Array.isArray(v)) v.forEach(eat)
    else if (isTable(v)) Object.values(v).forEach(eat)
  }
  eat({ ...(C.load()['pay'] as object), notice_days_max: undefined })   // a notice period is not pay
  const prof = join(C.profileDir(), 'profile.md')
  if (existsSync(prof)) {
    const lines = readFileSync(prof, 'utf8').replace(/\r\n?/gu, '\n').split('\n')
    const at = lines.findIndex((ln) => /^##\s+Private pay\s*$/iu.test(ln))
    if (at >= 0) {
      const next = lines.findIndex((ln, i) => i > at && ln.startsWith('## '))
      eat(lines.slice(at + 1, next < 0 ? lines.length : next).join('\n'))
    }
  }
  const quotes = C.load()['outreach']
  if (isTable(quotes)) {
    for (const q of [quotes['quote_contract_usd_hour'], quotes['quote_fulltime_annual']]) {
      for (const m of noCommas(String(q ?? '')).matchAll(/\d+(?:\.\d+)?/gu)) toks.delete(String(Number(m[0])))
    }
  }
  return (payMemo = toks)
}

// A figure of one or two digits that sits beside a currency sign, a currency word or a pay unit, such as "$50", "INR 28", "28 lakh" or "39/hr".
// A range such as "28 to 30 lakh" gives both ends. A bare small number ("60 days") is not pay.
const FIG = String.raw`\d{1,2}(?:\.\d+)?(?:\s*(?:-|\u2013|\u2014|to|or)\s*\d{1,2}(?:\.\d+)?)?`
const SHORT_PAY = new RegExp(String.raw`(?:[$\u20B9]|\b(?:usd|inr|rs\.?))\s*(${FIG})\b|\b(${FIG})\s*(?:lakhs?|lacs?|lpa|l|crores?|cr|k|usd|inr|(?:an|per|/)\s*(?:hr|hour))\b`, 'giu')

// Push the lint errors for one draft. `text` is the subject and the reply. `claims` counts the claim lines.
function lintDraft(d: Draft, prospect: boolean, claims: number): void {
  const text = [d.front['subject'] ?? '', ...d.reply].join('\n')
  if (prospect) {
    for (const [re, what] of PROSPECT_LINT) if (re.test(text)) d.errors.push(`a prospect message holds ${what}`)
    if (!claims) d.errors.push('## Claims has no claim line')
  }
  const pay = payTokens()
  const flat = noCommas(text)
  const short = [...flat.matchAll(SHORT_PAY)].flatMap((m) => (m[1] ?? m[2]).match(/\d+(?:\.\d+)?/gu) ?? []).map((t) => String(Number(t)))
  const thousands = [...flat.matchAll(/\b(\d{1,3}(?:\.\d+)?)\s*(?:k|thousand)\b/giu)].map((m) => String(Math.round(Number(m[1]) * 1000)))   // "90k" is 90000
  const lakhs = (flat.match(/\d{6,}/gu) ?? []).map((t) => String(Number(t) / 100000))   // "28,00,000" is 28 lakh
  if ([...(flat.match(/\d{3,}/gu) ?? []), ...short, ...thousands, ...lakhs].some((t) => pay.has(t))) d.errors.push('the text holds a figure from the private pay')
  if (ONE_RESUME.test(text)) d.errors.push('the text names a resume version')
}

// One draft file, with every way it breaks the shape in contracts.md listed in `errors`.
export function readDraft(path: string): Draft {
  const lines = readFileSync(path, 'utf8').replace(/\r\n?/gu, '\n').split('\n')
  const d: Draft = { file: basename(path), front: {}, reply: [], questions: new Map(), inferred: [], held: [], errors: [] }
  const end = lines[0] === '---' ? lines.indexOf('---', 1) : -1
  if (end < 0) { d.errors.push('no front-matter'); return d }
  for (const ln of lines.slice(1, end)) {
    const at = ln.indexOf(':')
    if (at > 0) d.front[pyStrip(ln.slice(0, at))] = pyStrip(ln.slice(at + 1))
  }
  // A prospect draft names its post or its role instead of a thread, and must say how it goes out.
  const prospect = !!d.front['post_url'] || !!d.front['role_id']
  for (const k of [prospect ? 'channel' : 'thread_id', 'name', 'company', 'asked']) if (!d.front[k]) d.errors.push(`front-matter has no ${k}`)
  const channel = d.front['channel'] || 'message'
  if (!(C.CONTACT_CHANNELS as readonly string[]).includes(channel)) d.errors.push(`channel ${channel} is not one of ${C.CONTACT_CHANNELS.join(', ')}`)
  const subject = [...(d.front['subject'] ?? '')].length
  if (channel === 'inmail' && !subject) d.errors.push('an inmail draft has no subject')
  if (channel === 'inmail' && subject > 200) d.errors.push(`the subject is ${subject} characters, over 200`)
  if (channel === 'email') {
    if (!d.front['to']) d.errors.push('an email draft has no to')
    if (!subject) d.errors.push('an email draft has no subject')
    if (!/^(?:gmail|email):\S/u.test(d.front['thread_id'] ?? '')) d.errors.push('an email draft needs thread_id as gmail:<threadId> or email:<address>')
  }
  const attach = d.front['attach']
  if (attach) {
    const dir = join(C.profileDir(), 'resume')
    const file = resolve(dir, attach)
    if (relative(dir, file).startsWith('..') || !existsSync(file)) d.errors.push(`attach ${attach} is not a file under resume/`)
  }
  const sections = new Map<string, string[]>()
  let cur: string[] | null = null
  for (const ln of lines.slice(end + 1)) {
    if (ln.startsWith('## ')) { cur = []; sections.set(pyStrip(ln.slice(3)), cur) } else if (cur) cur.push(ln)
  }
  d.reply = trimBlank(sections.get('Reply') ?? [])
  if (!d.reply.length) d.errors.push('## Reply is empty')
  if (channel === 'connect') {
    const size = [...d.reply.join('\n')].length
    const max = prospectInputs().note_max_chars
    if (size > max) d.errors.push(`the note is ${size} characters, over prospect.note_max_chars ${max}`)
  }
  for (const ln of sections.get('Open questions') ?? []) {
    const t = pyStrip(ln)
    const m = QUESTION.exec(t)
    if (m) d.questions.set(m[1], pyStrip(m[2]))
    else if (t && t.toLowerCase() !== 'none') d.errors.push(`open question not in "- Q<n>: <question>" form: ${t}`)
  }
  const slots = new Set<string>()
  for (const ln of d.reply) { const m = SLOT.exec(pyStrip(ln)); if (m) slots.add(m[1]) }
  for (const q of d.questions.keys()) if (!slots.has(q)) d.errors.push(`${q} has no [${q}] line in ## Reply`)
  for (const s of slots) if (!d.questions.has(s)) d.errors.push(`[${s}] in ## Reply has no question`)
  if (!sections.has('Claims')) d.errors.push('no ## Claims section')
  let claims = 0
  for (const ln of sections.get('Claims') ?? []) {
    const t = pyStrip(ln)
    if (/^-\s*\S/u.test(t) && !/^-\s*none\s*$/iu.test(t)) claims++
    const h = CLAIM_HELD.exec(t)
    if (h) { d.held.push(`${pyStrip(h[1])} (${pyStrip(h[2])})`); continue }
    const m = CLAIM_OURS.exec(t)
    if (m) d.inferred.push(pyStrip(m[1]))
  }
  lintDraft(d, prospect, claims)
  return d
}

// channel, post_url, vanity and subject let the messenger send an item that has no thread. `n` is stable:
// listRun keeps the number a file had in an earlier list and never reuses one. `to` is an email draft's
// recipient. `attach` is the draft's attach key, a path under P/resume/.
export interface Item {
  n: number; file: string; thread_id: string; vanity: string; post_url: string; role_id: string; channel: string; subject: string
  name: string; company: string; to: string; attach: string; questions: string[]
}

function itemText(n: number, d: Draft): string {
  const f = d.front
  const lines = [`${n}. ${[f['name'], f['title']].filter((x) => x).join(', ')} at ${f['company']}`, `   Asked: ${f['asked']}`]
  if (f['post_url'] || f['role_id']) lines.push(`   Channel: ${f['channel']}`, f['post_url'] ? `   Post: ${f['post_url']}` : `   Role: ${f['role_id']}`)
  else if (f['channel'] === 'email') lines.push(`   Channel: email`, `   To: ${f['to']}`)
  if (f['subject']) lines.push(`   Subject: ${f['subject']}`)
  if (f['attach']) lines.push(`   Attach: ${basename(f['attach'])}`)
  lines.push('   Draft:')
  for (const ln of d.reply) lines.push(pyStrip(ln) ? `     ${ln}` : '')
  if (d.questions.size) {
    lines.push('   Open questions:')
    for (const [q, text] of d.questions) lines.push(`     ${n}.${q.slice(1)} [${q}]: ${text}`)
  }
  if (d.inferred.length) lines.push(`   Inferred: ${d.inferred.join('; ')}`)
  if (d.held.length) lines.push(`   Left out: ${d.held.join('; ')}`)
  return lines.join('\n') + '\n'
}

const FOOTER = 'Reply `send all`, `send 1,3`, `all except 2` or `none`.\n' +
  'Answer an open question on its own line as `2: <text>`, or as `2.1: <text>` when the item has more than one.\n' +
  'The answer replaces its [Q] line in the reply word for word. `2: drop` removes that line instead.\n' +
  'A sent item with a question left unanswered is held for the next run.\n'

// The approved.json of a run, or an empty one. Every n in `send` and `held` has been given out.
function approvedOf(dir: string): { send: Sent[]; held: { n: number }[] } {
  const f = join(dir, APPROVED_JSON)
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) as { send: Sent[]; held: { n: number }[] } : { send: [], held: [] }
}

// Number the run's valid drafts and write approval.json. Returns the text to post in chat. A file keeps the
// number an earlier list gave it, and a new file takes the highest number ever given plus one, so a number
// never means two drafts. At most max_replies_per_run LinkedIn inbox drafts are listed; a prospect or email
// draft never counts against that cap, because /outreach sends the first and the Gmail phase the second.
export function listRun(run: string): string {
  const cap = outreachInputs().max_replies_per_run
  const dir = stageDir(run)
  const apath = join(dir, APPROVAL_JSON)
  const earlier = existsSync(apath) ? (JSON.parse(readFileSync(apath, 'utf8')) as { items: Item[] }).items : []
  const given = new Map(earlier.map((i) => [i.file, i.n]))
  const ap = approvedOf(dir)
  let top = Math.max(0, ...earlier.map((i) => i.n), ...ap.send.map((s) => s.n), ...ap.held.map((h) => h.n))
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : []
  const listed: [Item, string][] = []
  let text = ''
  let over = 0
  // Files that already have a number come first, so a new file cannot push one out of the cap.
  for (const f of [...files.filter((x) => given.has(x)), ...files.filter((x) => !given.has(x))]) {
    const d = readDraft(join(dir, f))
    if (d.errors.length) { text += `MALFORMED ${f}: ${d.errors.join('; ')}\n`; continue }
    const channel = d.front['channel'] || 'message'
    if (!d.front['post_url'] && !d.front['role_id'] && channel !== 'email' && listed.filter(([i]) => !isProspect(i) && i.channel !== 'email').length >= cap) { over++; continue }
    const n = given.get(f) ?? ++top
    listed.push([{ n, file: f, thread_id: d.front['thread_id'] ?? '', vanity: d.front['vanity'] ?? '',
                   post_url: normalisePost(d.front['post_url']), role_id: d.front['role_id'] ?? '', channel,
                   subject: d.front['subject'] ?? '', name: d.front['name'], company: d.front['company'],
                   to: d.front['to'] ?? '', attach: d.front['attach'] ?? '', questions: [...d.questions.keys()] }, itemText(n, d)])
  }
  listed.sort((a, b) => a[0].n - b[0].n)
  const items = listed.map(([i]) => i)
  writeAtomic(apath, JSON.stringify({ session: basename(run), items }, null, 2) + '\n')
  if (!items.length) return text + 'no drafts to approve\n'
  text += listed.map(([, b]) => b).join('\n')
  if (over) text += `\n${over} more drafted past outreach.max_replies_per_run. They stay drafted for the next run.\n`
  return text + '\n' + FOOTER
}

// ------------------------------------------------------------------ the approval reply

export class ApprovalError extends Error {}

export interface Approval { chosen: Set<number>; answers: Map<string, string> }   // answers: "<n>.<k>" -> text

const ANSWER = /^(\d+)(?:\.(\d+))?\s*:\s*(\S[\s\S]*)$/u

// The item numbers in `text`. Each must be on the list: the numbers are stable, so they need not run 1 to n.
function numbers(text: string, all: Set<number>): Set<number> {
  const out = new Set<number>()
  for (const part of text.replace(/\band\b/gu, ' ').split(/[\s,]+/u).filter((p) => p)) {
    const r = /^(\d+)(?:-(\d+))?$/u.exec(part)
    if (!r) throw new ApprovalError(`cannot read "${part}" as an item number or a range`)
    const a = Number(r[1])
    const b = r[2] ? Number(r[2]) : a
    if (a > b) throw new ApprovalError(`item ${part} is a range that runs backwards`)
    for (let n = a; n <= b; n++) {
      if (!all.has(n)) throw new ApprovalError(`item ${n} is not on the list (items: ${[...all].join(',') || 'none'})`)
      out.add(n)
    }
  }
  return out
}

function decide(text: string, all: Set<number>): Set<number> {
  const t = pyStrip(text.toLowerCase().replace(/[.!]+$/u, '')).replace(/^send\s+/u, '')
  if (t === 'none' || t === 'nothing') return new Set()
  if (t === 'all') return all
  const ex = /^all\s+(?:except|but)\s+(.+)$/u.exec(t)
  if (ex) {
    const drop = numbers(ex[1], all)
    return new Set([...all].filter((n) => !drop.has(n)))
  }
  return numbers(t, all)
}

// The old approval grammar, plus inline answers. Line breaks split the reply into parts; an answer runs to the end of its line, semicolons included. A part
// that starts `<n>:` or `<n>.<k>:` answers a question. Exactly one other part is the decision.
export function parseApproval(reply: string, items: Item[]): Approval {
  const answers = new Map<string, string>()
  const decisions: string[] = []
  for (const part of reply.split('\n').map((s) => pyStrip(s)).filter((s) => s)) {
    const m = ANSWER.exec(part)
    if (!m) { decisions.push(part); continue }
    const n = Number(m[1])
    const item = items.find((it) => it.n === n)
    if (!item) throw new ApprovalError(`an answer names item ${n}, which is not on the list`)
    let k = m[2] ? Number(m[2]) : 0
    if (!k) {
      if (item.questions.length !== 1) {
        throw new ApprovalError(`item ${n} has ${item.questions.length} open questions, so answer each as ${n}.<k>: <text>`)
      }
      k = Number(item.questions[0].slice(1))
    }
    if (!item.questions.includes(`Q${k}`)) throw new ApprovalError(`item ${n} has no question Q${k}`)
    answers.set(`${n}.${k}`, pyStrip(m[3]))
  }
  if (decisions.length !== 1) {
    throw new ApprovalError(decisions.length ? `more than one decision: ${decisions.join(' / ')}`
      : 'no decision: reply send all, send 1,3, all except 2 or none')
  }
  return { chosen: decide(decisions[0], new Set(items.map((it) => it.n))), answers }
}

const isDrop = (a: string): boolean => a.toLowerCase() === 'drop'

// The reply with every [Q] line replaced by its answer, or removed for `drop`. Null when a slot has no answer.
export function finalText(d: Draft, n: number, answers: Map<string, string>): string | null {
  const out: string[] = []
  for (const ln of d.reply) {
    const s = SLOT.exec(pyStrip(ln))
    if (!s) { out.push(ln); continue }
    const a = answers.get(`${n}.${s[1].slice(1)}`)
    if (a === undefined) return null
    if (!isDrop(a)) out.push(a)
  }
  const left = /\[Q\d+\]/u.exec(out.join('\n'))
  if (left) throw new ApprovalError(`item ${n} still has the slot ${left[0]} in its text after the answers; answer it or fix the draft. Nothing was written`)
  const single = out.filter((ln, i) => !(pyStrip(ln) === '' && i > 0 && pyStrip(out[i - 1]) === ''))
  return trimBlank(single).join('\n') + '\n'
}

type Keys = Pick<Item, 'thread_id' | 'post_url' | 'role_id' | 'vanity' | 'name' | 'company'>
const whoOf = (it: Keys): Who => ({ thread: it.thread_id, post: it.post_url, vanity: it.vanity, name: it.name, company: it.company, role: it.role_id ?? '' })
const sameItem = (a: Keys, b: Keys): boolean => (a.thread_id || a.post_url || a.vanity) === (b.thread_id || b.post_url || b.vanity)

// `attach` is the repo-relative path of the file to attach, or empty. `to` is an email draft's recipient.
interface Sent {
  n: number; thread_id: string; vanity: string; post_url: string; role_id: string; channel: string; subject: string
  name: string; company: string; to: string; attach: string; text_file: string
}

const sendLine = (s: Sent): string =>
  `  ${s.n}  ${s.thread_id ? `thread ${s.thread_id}` : `${s.channel} to ${s.vanity || s.name}`}  text ${s.text_file}${s.attach ? `  attach ${s.attach}` : ''}${s.role_id ? `  role ${s.role_id}` : ''}\n`

// A contacted person who must not get a prospect message: they declined, or the person was skipped or withdrawn.
const NO_PROSPECT = new Set(['declined', 'skipped', 'withdrawn'])

// Log the reply verbatim, then settle each chosen item: send (final text written) or held (a question
// unanswered). Items the decision does not choose are left alone. /retro calls this once per approval of inbox replies, and /outreach calls it once for the prospect drafts. Returns the printed summary. Throws ApprovalError, after
// logging the reply, when the reply cannot be read; nothing is recorded then.
export function approveRun(run: string, reply: string): string {
  const dir = stageDir(run)
  const apath = join(dir, APPROVAL_JSON)
  if (!existsSync(apath)) throw new ApprovalError('no approval list in this run; run outreach list first')
  const verbatim = reply.replace(/\r\n?/gu, '\n').replace(/\n+$/u, '').split('\n').map((ln) => '    ' + ln)
  editNotes(run, {}, 'Approval', ['', `### ${logStamp()}`, '', ...verbatim])
  const items = (JSON.parse(readFileSync(apath, 'utf8')) as { items: Item[] }).items
  let a: Approval
  try { a = parseApproval(reply, items) } catch (e) {
    if (e instanceof ApprovalError) editNotes(run, {}, 'Log', [`- ${logStamp()}  approval not understood: ${e.message}`])
    throw e
  }
  try {
    for (const it of items) {
      if (!a.chosen.has(it.n)) continue
      const d = readDraft(join(dir, it.file))
      if (!d.errors.length) finalText(d, it.n, a.answers)
    }
  } catch (e) {
    if (e instanceof ApprovalError) editNotes(run, {}, 'Log', [`- ${logStamp()}  approval refused: ${e.message}`])
    throw e
  }
  // Later calls add to the same run. An item already approved in this run, or whose person is already sent with no follow-up pending, is refused.
  const prior = approvedOf(dir).send
  const rows = load()
  for (const it of items) {
    if (!a.chosen.has(it.n)) continue
    const [hit] = match(whoOf(it), rows)
    const why = prior.some((s) => sameItem(s, it)) ? 'already approved in this run'
      : hit && wentOut(hit) && hit['pending'] !== 'drafted' ? 'already sent' : ''
    if (why) {
      const msg = `item ${it.n} is ${why}`
      editNotes(run, {}, 'Log', [`- ${logStamp()}  approval refused: ${msg}`])
      throw new ApprovalError(`${msg}. Nothing was written`)
    }
  }
  const send: Sent[] = []
  const held: { n: number; thread_id: string; missing: string[]; over?: string }[] = []
  const answers: { n: number; q: string; question: string; answer: string }[] = []
  // Connect and inmail items spend the prospect budget, and every prospect item counts against
  // prospect.max_sends_per_run. Items approved earlier in this run and not yet recorded as sent count against
  // the budget too, and every one counts against the cap. [prospect] is read only when such an item is chosen.
  let spend: { b: Budget; p: ProspectInputs; extra: Record<string, number> } | null = null
  const spendOf = (): NonNullable<typeof spend> => {
    if (spend) return spend
    const extra: Record<string, number> = { connect: 0, inmail: 0 }
    for (const s of prior) {
      const [h] = match(whoOf(s), rows)
      if (Object.hasOwn(extra, s.channel) && !(h && INVITED.has(h['status'] ?? ''))) extra[s.channel]++
    }
    const p = prospectInputs()
    return (spend = { b: budget(p, rows), p, extra })
  }
  mkdirSync(join(dir, 'send'), { recursive: true })
  let prospectSent = 0   // prospect items this call has cleared for sending
  for (const it of items) {
    const d = readDraft(join(dir, it.file))
    for (const q of it.questions) {
      const ans = a.answers.get(`${it.n}.${q.slice(1)}`)
      if (ans !== undefined && !isDrop(ans)) answers.push({ n: it.n, q, question: d.questions.get(q) ?? '', answer: ans })
    }
    if (!a.chosen.has(it.n)) continue   // an unchosen item stays as it is; inbox items are settled later in /retro
    const text = d.errors.length ? null : finalText(d, it.n, a.answers)
    if (text === null) {
      const missing = d.errors.length ? d.errors : it.questions.filter((q) => !a.answers.has(`${it.n}.${q.slice(1)}`))
      held.push({ n: it.n, thread_id: it.thread_id, missing })
      continue
    }
    const channel = it.channel || 'message'
    // LinkedIn's check covers the account, so a stop earlier in this run holds every LinkedIn item still to go.
    if (channel !== 'email' && cooldownUntil()) {
      held.push({ n: it.n, thread_id: it.thread_id, missing: [], over: 'the security cooldown is running' })
      continue
    }
    const spends = channel === 'connect' || channel === 'inmail'   // email and message spend no prospect budget
    if (isProspect(it) || spends) {
      const sp = spendOf()
      const [hit] = match(whoOf(it), rows)
      const over = isProspect(it) && hit && NO_PROSPECT.has(hit['status'] ?? '') ? `the person is ${hit['status']} in contacted.csv`
        : isProspect(it) && prior.filter((s) => isProspect(s)).length + prospectSent >= sp.p.max_sends_per_run ? 'over the per-run send cap'
          : spends ? overBudget(channel, sp.b, sp.p, sp.extra[channel]) : ''
      if (over) { held.push({ n: it.n, thread_id: it.thread_id, missing: [], over }); continue }
      if (spends) sp.extra[channel]++
      if (isProspect(it)) prospectSent++
    }
    const file = join(dir, 'send', `${it.n}.txt`)
    writeFileSync(file, text, 'utf8')
    send.push({ n: it.n, thread_id: it.thread_id, vanity: it.vanity, post_url: it.post_url ?? '', role_id: it.role_id ?? '', channel,
                subject: it.subject ?? '', name: it.name, company: it.company, to: it.to ?? '',
                attach: it.attach ? display(join(C.profileDir(), 'resume', it.attach)) : '', text_file: display(file) })
  }
  writeAtomic(join(dir, APPROVED_JSON), JSON.stringify({ session: basename(run), send: [...prior, ...send], held, answers }, null, 2) + '\n')
  const nums = (xs: { n: number }[]): string => xs.map((x) => x.n).join(',') || '-'
  editNotes(run, {}, 'Log', [`- ${logStamp()}  approval: send ${nums(send)}, held ${nums(held)}`])
  let out = `send      ${nums(send)}\n`
  for (const s of send) out += sendLine(s)
  out += `held      ${nums(held)}\n`
  for (const h of held) out += `  ${h.n}  ${h.over ?? `missing ${h.missing.join(', ')}`}\n`
  out += `answers   ${answers.map((x) => `${x.n}.${x.q.slice(1)}`).join(',') || '-'}\n`
  out += `written   ${display(join(dir, APPROVED_JSON))}\n`
  return out
}

// Count this run's rows in contacted.csv, write the counts and phase closed, and return the closing
// line. A retro run also gets a second line counting its drafts: ready (no [Q] line) and blocked (any [Q] line).
// An outreach or profile run holds prospect rows only, and /retro no longer settles them, so it gets the counts alone.
export function closeRun(run: string): string {
  const mine = load().filter((r) => r['session'] === basename(run))
  const count = (s: string): number => mine.filter((r) => stateOf(r) === s).length
  const c = { replied: count('sent'), held: count('drafted'), declined: count('declined'), skipped: count('skipped') }
  const line = `outreach closed: replied ${c.replied}, held ${c.held}, declined ${c.declined}, skipped ${c.skipped}` +
    `, accepted ${count('accepted')}, withdrawn ${count('withdrawn')}`
  editNotes(run, { phase: 'closed', replied: String(c.replied), held: String(c.held), declined: String(c.declined),
                   skipped: String(c.skipped) }, 'Log', [`- ${logStamp()}  ${line}`])
  if (kindOf(run) !== C.RETRO_SUFFIX) return line
  const dir = stageDir(run)
  // A draft whose person has already been sent to, and has no follow-up pending, is settled and not counted.
  const rows = load()
  const settled = (d: Draft): boolean => {
    const [h] = match({ thread: d.front['thread_id'] ?? '', post: normalisePost(d.front['post_url']), vanity: d.front['vanity'] ?? '',
                        name: d.front['name'] ?? '', company: d.front['company'] ?? '' }, rows)
    return !!h && wentOut(h) && h['pending'] !== 'drafted'
  }
  const ds = (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')) : []).map((f) => readDraft(join(dir, f))).filter((d) => !settled(d))
  const blocked = ds.filter((d) => d.errors.length || d.questions.size).length
  return `${line}\n${ds.length - blocked} ready, ${blocked} blocked. Settle them in /retro.`
}

// ------------------------------------------------------------------ threads to re-read, replies and unsent items

// The sent or accepted rows with a thread id whose last_date is inside the last `days` days. The inbox read
// re-opens them, because a reply read on a phone is no longer unread.
export function recentSent(days: number, rows: CsvRow[] = load()): CsvRow[] {
  const from = daysAgo(days)
  return rows.filter((r) => wentOut(r) && r['thread_id'] && (r['last_date'] ?? '') >= from)
}

// Set replied_date on the row `who` matches, unless it is set. Throws RecordError when no row matches.
export function markReplied(who: Who, date: string): string {
  return locked(C.CONTACTED, () => {
    const rows = load()
    const [hit] = match(who, rows)
    if (!hit) throw new RecordError('no row matches')
    if (hit['replied_date']) return `already replied ${hit['replied_date']}  ${keyOf(hit)}\n`
    hit['replied_date'] = date
    save(rows)
    return `recorded reply ${date}  ${keyOf(hit)}\n`
  })
}

// The approved items of the run that the ledger does not show as sent. A sent row with a drafted follow-up
// pending counts as unsent, as approve treats it.
export function unsentOf(run: string): Sent[] {
  const rows = load()
  return approvedOf(stageDir(run)).send.filter((s) => {
    const [h] = match(whoOf(s), rows)
    return !(h && wentOut(h) && h['pending'] !== 'drafted')
  })
}

// ------------------------------------------------------------------ tags and jobs from kept posts

interface TagSeen { tag: string; post_url: string }

// Copy the run's .stage/jobs.json into .stage/sweep/ as one sweep file for each source its rows name, and
// ingest them, so the hunt picks the roles up with the usual dedupe and link canonicalisation. jobs.json
// is a list of sweep rows, or an object whose `rows` is one. A row with no known source gets source
// linkedin written into it, because ingest reads the row's own source. A linkedin row with no channel gets
// `unknown`: a post never shows whether the job takes Easy Apply, and laneOf puts `unknown` in lane
// linkedin-ex. The file's `firing` is kept when it has a valid one. The run is not a hunt, so ingest leaves
// its board alone. A rerun is safe: rows already in the queue are skipped as duplicates.
function ingestJobs(run: string, out: Out): number {
  const src = join(run, C.STAGE_DIR, JOBS_JSON)
  if (!existsSync(src)) { out(`no ${display(src)}\n`); return 0 }
  const d: unknown = JSON.parse(readFileSync(src, 'utf8'))
  const rows: unknown = Array.isArray(d) ? d : isTable(d) ? d['rows'] : undefined
  if (!Array.isArray(rows)) {
    process.stderr.write(`outreach jobs: ${display(src)} is neither a list of sweep rows nor an object with rows\n`)
    return 2
  }
  if (!rows.length) { out('jobs: no rows\n'); return 0 }
  const given = isTable(d) ? d['firing'] : undefined
  const firing = typeof given === 'string' && FIRING.test(given) ? given : strftime('%Y-%m-%d-%H')
  const dir = join(run, C.STAGE_DIR, 'sweep')
  mkdirSync(dir, { recursive: true })
  const bySource = new Map<string, unknown[]>()
  for (const r of rows) {
    const s = isTable(r) && typeof r['source'] === 'string' && C.SOURCES.has(r['source']) ? r['source'] : 'linkedin'
    const row = isTable(r) ? { ...r, source: s, ...(s === 'linkedin' && !r['channel'] ? { channel: 'unknown' } : {}) } : r
    bySource.set(s, [...(bySource.get(s) ?? []), row])
  }
  for (const [source, group] of bySource) {
    let n = 1
    while (existsSync(join(dir, `${firing}-${source}-${n}.json`))) n++
    writeFileSync(join(dir, `${firing}-${source}-${n}.json`), JSON.stringify({ source, firing, rows: group }, null, 1) + '\n', 'utf8')
  }
  try { ingest('sweep', run, false, out, false) } catch (e) {
    if (!(e instanceof IngestError)) throw e
    process.stderr.write(`${e.message}\n${e.problems.map((x) => `  ${x}\n`).join('')}`)
    return 1
  }
  return 0
}

// ------------------------------------------------------------------------ CLI

const KEYS = '[--thread THREAD] [--post POST] [--vanity VANITY] [--name NAME] [--company COMPANY] [--role ROLE]'
const KEY_OPTS = ['--thread', '--post', '--vanity', '--name', '--company', '--role']
const SUBS: Record<string, { usage: string; opts: string[]; text: string }> = {
  check: {
    usage: `usage: engine.ts outreach check [-h] ${KEYS}\n`, opts: KEY_OPTS,
    text: 'Exit 2 when the matching row is at status sent or accepted, and say whether a follow-up is pending. Give at least one key: --thread, --post, --vanity, --role, or --name with --company.',
  },
  record: {
    usage: `usage: engine.ts [--session R] outreach record [-h] ${KEYS}\n                               --status {${C.CONTACT_STATUSES.join(',')}}\n                               [--channel {${C.CONTACT_CHANNELS.join(',')}}] [--date YYYY-MM-DD] [--notes NOTES] [--by-candidate]\n`,
    opts: [...KEY_OPTS, '--status', '--channel', '--date', '--notes'],
    text: 'Upsert one row in contacted.csv. --date defaults to today and sets last_date, and first_date on a new row. --channel sets the channel of a new row, default message, or of a row not yet sent. A sent row stays sent: drafted and declined set its pending column, sent clears it, and skipped clears a pending drafted. A sent connect row may move to accepted or withdrawn, and keeps its send date in last_date. An accepted row takes drafted, sent and skipped like a sent row and stays accepted, and sent leaves its last_date alone. Any other status on an accepted row, or any on a withdrawn one, exits 2. Status sent needs the global --session flag naming a run whose approved.json has a send item for this person, and exits 2 without it. --by-candidate replaces that check for a message the candidate typed themselves, which no run sent, and adds the note "sent by the candidate". A repeat send to a connect or inmail row keeps its first last_date.',
  },
  drafted: { usage: 'usage: engine.ts outreach drafted [-h]\n', opts: [], text: 'Print every row at status drafted and every sent row with pending drafted.' },
  inputs: { usage: 'usage: engine.ts outreach inputs [-h]\n', opts: [], text: 'Print the [outreach] keys. An absent quote prints as an open question.' },
  'prospect-inputs': { usage: 'usage: engine.ts outreach prospect-inputs [-h]\n', opts: [], text: 'Print the [prospect] keys. Exit 2 naming the first missing or mistyped key.' },
  queries: { usage: 'usage: engine.ts outreach queries [-h]\n', opts: [], text: 'Print one line per post search: the pass, first or all, then the URL. Every first line comes before every all line.' },
  budget: { usage: 'usage: engine.ts outreach budget [-h]\n', opts: [], text: 'Print invitations sent today and this week, pending requests and InMails this month against [prospect], then each request due for withdrawal.' },
  tags: { usage: 'usage: engine.ts outreach tags [-h]\n', opts: [], text: 'List every tag in the outreach runs\' tags.json that is in none of the four [prospect] lists, with how many kept posts carried it.' },
  open: {
    usage: 'usage: engine.ts outreach open [-h] [--kind {retro,profile}]\n', opts: ['--kind'],
    text: 'Create <sessions>/<DDMonYYYY-HHMM>-<kind>/ and print its path. With no --kind it is an outreach run, which exits 2 with a STOP: line only during the security cooldown, and prints a WARN: line for an open retro run. --kind retro prints the same cooldown line but opens (or continues the retro run already open), and prints a WARN: line for each open hunt or outreach run. --kind profile has no such check.',
  },
  stop: {
    usage: 'usage: engine.ts --session R outreach stop [-h] --reason REASON\n', opts: ['--reason'],
    text: 'Log a LinkedIn security stop in R: security_stop in the front-matter, a line under ## Log and a blocked finding for /retro. outreach open and the LinkedIn lanes of a hunt then wait prospect.security_cooldown_hours. R may be a hunt run.',
  },
  cooldown: { usage: 'usage: engine.ts outreach cooldown [-h]\n', opts: [], text: 'Print clear, or until <iso> and exit 2 while the cooldown after the newest security stop in an outreach, retro, profile or hunt run is running.' },
  'recent-sent': { usage: 'usage: engine.ts outreach recent-sent [-h]\n', opts: [], text: 'Print the sent or accepted rows that have a thread id and a last_date inside outreach.recheck_sent_days. The inbox read re-opens these threads to find replies.' },
  replied: {
    usage: 'usage: engine.ts outreach replied [-h] [--thread THREAD] [--vanity VANITY] [--name NAME] [--company COMPANY] --date YYYY-MM-DD\n',
    opts: ['--thread', '--vanity', '--name', '--company', '--date'],
    text: 'Set replied_date on the matching row, unless it is set. Exit 2 when no row matches.',
  },
  unsent: { usage: 'usage: engine.ts --session R outreach unsent [-h]\n', opts: [], text: 'List the items in R/approved.json whose contacted row is not at status sent or accepted. This is the queue for the next messenger, and the recovery after a stop.' },
  list: { usage: 'usage: engine.ts --session S outreach list [-h]\n', opts: [], text: 'Number the drafts in S/.stage/outreach/ and write approval.json. A draft keeps its number from earlier lists, and a new one takes the next number. At most outreach.max_replies_per_run LinkedIn inbox drafts are listed; prospect and email drafts are not capped.' },
  approve: {
    usage: 'usage: engine.ts --session S outreach approve [-h] --body-file BODY_FILE\n', opts: ['--body-file'],
    text: 'Log the approval reply verbatim, then write approved.json and the final texts for the chosen items. /retro calls it for inbox replies and /outreach for prospect drafts. Later calls add items; one already approved or sent is refused. At most prospect.max_sends_per_run prospect items are approved in a run, and a prospect item whose person is declined, skipped or withdrawn is held. BODY_FILE may be - for stdin.',
  },
  log: { usage: 'usage: engine.ts --session S outreach log [-h] text [text ...]\n', opts: [], text: 'Add one timestamped line under ## Log.' },
  tag: {
    usage: 'usage: engine.ts --session S outreach tag [-h] --tag TAG --post POST\n', opts: ['--tag', '--post'],
    text: 'Add TAG on the kept post POST to S/tags.json. A tag already in a [prospect] list, in any case, is ignored.',
  },
  jobs: { usage: 'usage: engine.ts --session S outreach jobs [-h]\n', opts: [], text: 'Ingest the sweep rows in S/.stage/jobs.json into prospects.csv, through ingest sweep. Each row goes in under its own source. A row with no known source becomes source linkedin, and a linkedin row with no channel gets channel unknown, which is lane linkedin-ex.' },
  close: { usage: 'usage: engine.ts --session S outreach close [-h]\n', opts: [], text: 'Count the run in contacted.csv and set phase closed.' },
  lanes: { usage: 'usage: engine.ts outreach lanes [-h]\n', opts: [], text: 'Print the live /outreach lanes from prospect.live_lanes, one per line, in the order a bare /outreach works them. Exit 2 naming the first missing or mistyped key.' },
  roles: { usage: 'usage: engine.ts outreach roles [-h]\n', opts: [], text: 'List the applied or held roles at or above prospect.roles_match_min that no contacted row has worked. Remote and contract roles come first, then by match, then newest. Prints at most prospect.roles_per_run. Reads only.' },
}

const MAIN_USAGE = `usage: engine.ts outreach [-h] {${Object.keys(SUBS).join(',')}} ...\n`
const MAIN_HELP = MAIN_USAGE + `
The contacted ledger and the /outreach, /retro and /profile run folders. process/instructions.md R14 is the procedure.

contacted.csv keys a row by thread_id, then post_url, then vanity, then name|company, then role_id on a row that names no person. check exits 2 when the row is
at status sent or accepted, whatever its pending follow-up. record upserts one row; a sent row never moves back, except a
connect row to accepted or withdrawn, and those two never change. stop, unsent, list, approve, log, tag, jobs and close need the global --session flag
naming an outreach, retro or profile run folder, or a hunt for stop.

positional arguments:
${Object.entries(SUBS).map(([k, s]) => `    ${k.padEnd(15)} ${s.text}`).join('\n')}

options:
  -h, --help  show this help message and exit
`

export function main(argv: string[], out: Out = (s) => { process.stdout.write(s) }): number {
  const prog = 'engine.ts outreach'
  const err = (usage: string, name: string, msg: string): number => {
    process.stderr.write(`${usage}${name}: error: ${msg}\n`)
    return 2
  }
  const cmd = argv[0]
  if (cmd === undefined) return err(MAIN_USAGE, prog, 'the following arguments are required: cmd')
  if (cmd === '-h' || cmd === '--help') { out(MAIN_HELP); return 0 }
  if (!Object.hasOwn(SUBS, cmd)) {
    return err(MAIN_USAGE, prog, `argument cmd: invalid choice: '${cmd}' (choose from ${Object.keys(SUBS).join(', ')})`)
  }
  const sub = SUBS[cmd]
  let p: ReturnType<typeof parseSub>
  // --by-candidate is the one flag with no value, so parseSub never sees it.
  const byCandidate = cmd === 'record' && argv.includes('--by-candidate')
  try { p = parseSub(byCandidate ? argv.slice(1).filter((a) => a !== '--by-candidate') : argv.slice(1), sub.opts) } catch (e) {
    if (e instanceof Help) { out(sub.usage + '\n' + sub.text + '\n'); return 0 }
    if (e instanceof UsageError) return err(sub.usage, `${prog} ${cmd}`, e.message)
    throw e
  }
  const fail = (msg: string): number => err(sub.usage, `${prog} ${cmd}`, msg)
  if (cmd !== 'log' && p.positional.length) return fail(`unrecognized arguments: ${p.positional.join(' ')}`)
  const v = (o: string): string => p.values.get(o) ?? ''
  const who: Who = { thread: v('--thread'), post: v('--post'), vanity: v('--vanity'), name: v('--name'), company: v('--company'), role: v('--role') }
  if (who.post && !POST_URL.test(pyStrip(who.post))) return fail(`argument --post: '${who.post}' is not a LinkedIn URL`)

  if (cmd === 'check') {
    if (!hasKey(who)) return fail('give --thread, --post, --vanity, --role, or --name with --company')
    const [hit, via] = match(who, load())
    if (!hit) { out('not contacted - clear to draft\n'); return 0 }
    const sent = wentOut(hit)
    out(`${sent ? 'ALREADY SENT' : 'CONTACTED'}  via ${via}  status ${hit['status']}  last ${hit['last_date']}  ` +
        `session ${hit['session'] || '-'}  follow-up ${hit['pending'] ? 'pending ' + hit['pending'] : 'none'}\n  ${hit['name']} / ${hit['company']}  ${keyOf(hit)}\n` +
        (hit['notes'] ? `  notes: ${hit['notes']}\n` : ''))
    return sent ? 2 : 0
  }
  if (cmd === 'record') {
    const status = v('--status')
    if (!status) return fail('the following arguments are required: --status')
    if (!(C.CONTACT_STATUSES as readonly string[]).includes(status)) {
      return fail(`argument --status: invalid choice: '${status}' (choose from ${C.CONTACT_STATUSES.join(', ')})`)
    }
    const channel = v('--channel')
    if (channel && !(C.CONTACT_CHANNELS as readonly string[]).includes(channel)) {
      return fail(`argument --channel: invalid choice: '${channel}' (choose from ${C.CONTACT_CHANNELS.join(', ')})`)
    }
    const date = v('--date') || strftime('%Y-%m-%d')
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) return fail(`argument --date: '${date}' is not YYYY-MM-DD`)
    if (!hasKey(who)) return fail('give --thread, --post, --vanity, --role, or --name with --company')
    let notes = v('--notes')
    if (status === 'sent') {
      if (byCandidate) notes = notes ? `sent by the candidate; ${notes}` : 'sent by the candidate'
      else {
        const run = runFolder()
        if (run === null) return fail('status sent needs the global --session flag naming the run that approved the send, or --by-candidate for a message the candidate typed themselves')
        const approved = approvedOf(stageDir(run)).send.map((x): CsvRow => ({ thread_id: x.thread_id, post_url: x.post_url, role_id: x.role_id ?? '', vanity: x.vanity, name: x.name, company: x.company }))
        if (match(who, approved)[0] === null) return fail(`${display(run)} has no approved send item for this person, so it cannot be recorded sent`)
      }
    }
    let r: Recorded
    try { r = record(who, status, date, notes, channel) } catch (e) {
      if (e instanceof RecordError) return fail(e.message)
      throw e
    }
    out(`recorded ${keyOf(r.row)}  ${status}  ${r.created ? 'new' : `updated via ${r.via}`}\n`)
    return 0
  }
  if (cmd === 'drafted') {
    const rows = load().filter((r) => stateOf(r) === 'drafted')
    if (!rows.length) { out('no drafted rows\n'); return 0 }
    for (const r of rows) {
      out(`${keyOf(r)}${r['pending'] ? '  (follow-up)' : ''}  name ${r['name'] || '-'}  company ${r['company'] || '-'}  vanity ${r['vanity'] || '-'}  last ${r['last_date']}` +
          `${r['post_url'] ? `  post ${r['post_url']}` : ''}${r['role_id'] ? `  role ${r['role_id']}` : ''}${r['session'] ? `  session ${r['session']}` : ''}\n`)
    }
    return 0
  }
  if (cmd === 'inputs') {
    const i = outreachInputs()
    const open = 'OPEN QUESTION: not given by the candidate'
    out(`outreach.quote_contract_usd_hour  ${i.quote_contract_usd_hour ?? open}\n`)
    out(`outreach.quote_fulltime_annual    ${i.quote_fulltime_annual ?? open}\n`)
    out(`outreach.max_replies_per_run      ${i.max_replies_per_run}\n`)
    return 0
  }
  if (cmd === 'prospect-inputs') {
    const p = prospectInputs()
    for (const [k, val] of Object.entries(p)) out(`prospect.${k.padEnd(20)} ${Array.isArray(val) ? val.join(' ') || '-' : String(val)}\n`)
    return 0
  }
  if (cmd === 'lanes') {
    const live = laneInputs().live_lanes
    const run = C.OUTREACH_LANES.filter((l) => live.includes(l))
    out(run.length ? run.join('\n') + '\n' : 'no live lanes\n')
    return 0
  }
  if (cmd === 'roles') {
    const li = laneInputs()
    const prospects = existsSync(C.PROSPECTS) ? readDicts(decodeStrict(readFileSync(C.PROSPECTS))).rows : []
    const due = dueRoles(li, prospects, load())
    const shown = due.slice(0, li.roles_per_run)
    out(`roles due ${due.length}, listing ${shown.length} (prospect.roles_match_min ${li.roles_match_min}, prospect.roles_per_run ${li.roles_per_run})\n`)
    for (const { row: r, first } of shown) {
      out(`id ${r['id']}  match ${r['match']}  status ${r['status'] === 'applied' ? 'applied' : r['status'] === 'skipped' ? 'skipped' : 'held'}  first ${first.join(',') || '-'}  company ${r['company']}  role ${r['role']}  link ${r['link']}  contact ${r['contact'] || '-'}\n`)
    }
    return 0
  }
  if (cmd === 'queries') {
    for (const [pass, url] of queries(prospectInputs())) out(`${pass.padEnd(5)} ${url}\n`)
    return 0
  }
  if (cmd === 'budget') {
    const p = prospectInputs()
    const b = budget(p)
    out(`invites today      ${b.today}/${p.invites_per_day}\n`)
    out(`invites this week  ${b.week}/${p.invites_per_week}\n`)
    out(`pending            ${b.pending}/${p.max_pending_invites}\n`)
    out(`inmail this month  ${b.inmail}/${p.inmail_per_month}\n`)
    if (!b.due.length) out('withdraw due       none\n')
    for (const r of b.due) out(`withdraw due       ${r['vanity'] || '-'} ${r['post_url'] || '-'} ${r['last_date']}\n`)
    return 0
  }
  if (cmd === 'tags') {
    const known = knownTags(prospectInputs())
    const seen = new Map<string, { tag: string; posts: Set<string> }>()
    for (const dir of C.sessionFolders(null, C.OUTREACH_SUFFIX)) {
      const f = join(dir, TAGS_JSON)
      if (!existsSync(f)) continue
      for (const t of JSON.parse(readFileSync(f, 'utf8')) as TagSeen[]) {
        const k = t.tag.toLowerCase()
        if (known.has(k)) continue
        const e = seen.get(k) ?? { tag: t.tag, posts: new Set<string>() }
        e.posts.add(t.post_url)
        seen.set(k, e)
      }
    }
    if (!seen.size) { out('no unknown tags\n'); return 0 }
    const list = [...seen.values()].sort((a, b) => b.posts.size - a.posts.size || a.tag.localeCompare(b.tag))
    for (const e of list) out(`${e.tag.padEnd(30)} ${e.posts.size}\n`)
    return 0
  }
  if (cmd === 'open') {
    const kind = v('--kind')
    if (kind && kind !== C.RETRO_SUFFIX && kind !== C.PROFILE_SUFFIX) return fail(`argument --kind: invalid choice: '${kind}' (choose from ${C.RETRO_SUFFIX}, ${C.PROFILE_SUFFIX})`)
    const names = (dirs: string[]): string => dirs.map((d) => basename(d)).join(', ')
    const stops: string[] = []
    const warns: string[] = []
    if (kind !== C.PROFILE_SUFFIX) {
      const until = cooldownUntil()
      if (until) stops.push(`STOP: LinkedIn showed a security check. /outreach stays closed until ${isoSeconds(until)}.`)
    }
    if (!kind) {
      const retro = C.liveRuns([C.RETRO_SUFFIX])
      if (retro.length) warns.push(`WARN: the retro run ${names(retro)} is open and may be driving the pinned Chrome.`)
    }
    if (kind === C.RETRO_SUFFIX) {
      const live = C.liveRuns([C.SESSION_SUFFIX, C.OUTREACH_SUFFIX])
      if (live.length) warns.push(`WARN: ${names(live)} is open and may be driving the pinned Chrome.`)
    }
    for (const line of [...stops, ...warns]) process.stderr.write(line + '\n')
    if (stops.length && !kind) return 2
    // A sitting that crashed leaves its retro run open, and a second run would leave the first blocking hunts until it goes stale.
    const reuse = kind === C.RETRO_SUFFIX ? C.liveRuns([C.RETRO_SUFFIX]).at(-1) : undefined
    if (reuse && readFileSync(join(reuse, 'notes.md'), 'utf8').includes('approval: Dashboard send ')) {
      process.stderr.write(`STOP: the retro run ${basename(reuse)} is a dashboard send in progress. Try again when it ends.\n`)
      return 2
    }
    if (reuse) process.stderr.write(`NOTE: the retro run ${basename(reuse)} is already open, so this sitting continues it.\n`)
    out(`${display(reuse ?? openRun(kind || C.OUTREACH_SUFFIX))}\n`)
    return 0
  }
  if (cmd === 'cooldown') {
    const until = cooldownUntil()
    out(until ? `until ${isoSeconds(until)}\n` : 'clear\n')
    return until ? 2 : 0
  }
  if (cmd === 'recent-sent') {
    const rows = recentSent(outreachInputs().recheck_sent_days)
    if (!rows.length) { out('no recent sent threads\n'); return 0 }
    for (const r of rows) {
      out(`${keyOf(r)}  ${r['channel'] || 'message'}  ${r['status']}  name ${r['name'] || '-'}  company ${r['company'] || '-'}  last ${r['last_date']}` +
          `${r['replied_date'] ? `  replied ${r['replied_date']}` : ''}\n`)
    }
    return 0
  }
  if (cmd === 'replied') {
    const date = v('--date')
    if (!date) return fail('the following arguments are required: --date')
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) return fail(`argument --date: '${date}' is not YYYY-MM-DD`)
    if (!hasKey(who)) return fail('give --thread, --vanity, or --name with --company')
    try { out(markReplied(who, date)) } catch (e) {
      if (e instanceof RecordError) return fail(e.message)
      throw e
    }
    return 0
  }

  const run = runFolder(cmd === 'stop' ? STOP_KINDS : RUN_KINDS)
  if (run === null) return fail('needs the global --session flag naming an outreach, retro or profile run, or a hunt for stop, as in engine.ts --session my-sessions/<run> outreach ' + cmd)
  if (cmd === 'stop') {
    const reason = oneLine(v('--reason'))
    if (!reason) return fail('the following arguments are required: --reason')
    out(`security stop logged in ${display(run)} as ${stopRun(run, reason)}. /outreach stays closed until ${isoSeconds(cooldownUntil() ?? new Date())}\n`)
    return 0
  }
  if (cmd === 'unsent') {
    const left = unsentOf(run)
    if (!left.length) { out('no unsent items\n'); return 0 }
    out(`unsent    ${left.map((x) => x.n).join(',')}\n${left.map(sendLine).join('')}`)
    return 0
  }
  if (cmd === 'list') { out(listRun(run)); return 0 }
  if (cmd === 'approve') {
    const body = v('--body-file')
    if (!body) return fail('the following arguments are required: --body-file')
    const reply = body === '-' ? decodeStrict(readFileSync(0)) : readFileSync(body, 'utf8')
    try { out(approveRun(run, reply)) } catch (e) {
      if (!(e instanceof ApprovalError)) throw e
      process.stderr.write(`outreach approve: ${e.message}. Nothing was recorded.\n`)
      return 2
    }
    return 0
  }
  if (cmd === 'log') {
    if (!p.positional.length) return fail('the following arguments are required: text')
    const text = oneLine(p.positional.join(' '))
    editNotes(run, {}, 'Log', [`- ${logStamp()}  ${text}`])
    out(`logged: ${text}\n`)
    return 0
  }
  if (cmd === 'tag') {
    const tag = pyStrip(v('--tag'))
    if (!TAG.test(tag)) return fail(`argument --tag: '${tag}' is not one tag such as #hiring`)
    if (!who.post) return fail('the following arguments are required: --post')
    const list = knownTags(prospectInputs()).get(tag.toLowerCase())
    if (list) { out(`known ${tag}: in prospect.${list}\n`); return 0 }
    const post = normalisePost(who.post)
    const added = withLock(join(run, '.lock'), (): boolean => {
      const f = join(run, TAGS_JSON)
      const all: TagSeen[] = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) as TagSeen[] : []
      if (all.some((t) => t.post_url === post && t.tag.toLowerCase() === tag.toLowerCase())) return false
      all.push({ tag, post_url: post })
      writeAtomic(f, JSON.stringify(all, null, 1) + '\n')
      return true
    })
    out(`${added ? 'recorded' : 'already recorded'} ${tag} on ${post}\n`)
    return 0
  }
  if (cmd === 'jobs') return ingestJobs(run, out)
  out(closeRun(run) + '\n')
  return 0
}
