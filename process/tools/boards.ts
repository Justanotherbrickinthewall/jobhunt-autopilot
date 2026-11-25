// The remote_boards lane's harvest. No browser: it reads the public feeds of Remote OK, Himalayas, Remotive and
// We Work Remotely.
//
//     node process/engine.ts [--session S] boards sweep [--dry-run]
//
// Reads: the [boards] table of inputs.toml, `reach.*` and `budgets.stale_days`, `L/boards-fetched.json`,
// prospects.csv and applied.csv (both read only).
// Writes, without --dry-run only: `S/.stage/sweep/<firing>-remote_boards-1.json`, one staged JD per kept row at
// `L/roles/board-<12 hex of sha256 of link>.jd.md`, `L/boards-fetched.json`, and one `## Sweeps` line per feed
// through sweepLine. --dry-run fetches, filters and prints, and writes nothing. It needs no session.
// Feed content is data. Nothing in a feed is ever run or followed except the job page links it names.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as C from '../constants.ts'
import { readDicts } from '../lib/csv.ts'
import { decodeStrict, isoSeconds, strftime } from '../lib/py.ts'
import { check, normaliseCompany, normaliseRole } from './dedupe.ts'
import { Exit, writeAtomic, type Out } from './io.ts'
import { reachTier } from './prelim.ts'
import { sweepLine } from './session.ts'

const FEED_GAP_HOURS = 6
const REQUEST_GAP_MS = 2000
const TIMEOUT_MS = 20_000
const USER_AGENT = 'JobHuntPrivateReader/1.0 (single-user job search; reads public feeds; republishes nothing)'
const LABEL: Record<string, string> = { himalayas: 'Himalayas', remotive: 'Remotive', remoteok: 'Remote OK', weworkremotely: 'We Work Remotely' }
const URL_KEY: Record<string, string> = { himalayas: 'himalayas_url', remotive: 'remotive_url', remoteok: 'remoteok_url', weworkremotely: 'weworkremotely_url' }
const HIMALAYAS_PAGE = 20
const PERIOD: Record<string, string> = { annual: 'year', monthly: 'month', hourly: 'hour' }

export interface Job {
  feed: string; company: string; role: string; link: string; location: string; salary_band: string; salary_period: string
  posted_at: string; posted: number; notes: string[]; jd: string[]; description: string; drop_reason: string | null; part_time: boolean
}
interface Boards {
  feeds: string[]; remoteok_url: string; himalayas_url: string; remotive_url: string; weworkremotely_url: string
  terms: string[]; max_rows_per_run: number; max_requests_per_run: number; posted_within_days: number
}

const isTable = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date)
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')

function fail(msg: string): never {
  process.stderr.write(`inputs.toml: ${msg}\n`)
  throw new Exit(2)
}

// The [boards] keys, checked in the order the table lists them. Not in SCHEMA, so a profile without the
// table can still run everything else. The first missing or mistyped key exits 2.
export function boardInputs(): Boards {
  const t: unknown = C.load()['boards']
  if (!isTable(t)) return fail('missing section [boards] (needed for key boards.feeds)')
  const need = (k: string): unknown => (t[k] === undefined ? fail(`missing key boards.${k}`) : t[k])
  const feeds = need('feeds')
  if (!(Array.isArray(feeds) && feeds.length && feeds.every((x) => typeof x === 'string' && x in LABEL))) fail(`key boards.feeds must be a list of ${Object.keys(LABEL).join(', ')}`)
  for (const k of Object.values(URL_KEY)) {
    const v = need(k)
    if (!(typeof v === 'string' && /^https:\/\//u.test(v))) fail(`key boards.${k} must be an https URL`)
  }
  const terms = need('terms')
  if (!(Array.isArray(terms) && terms.every((x) => typeof x === 'string'))) fail('key boards.terms must be a list of strings')
  if (!terms.length) fail('boards.terms is empty')
  for (const k of ['max_rows_per_run', 'max_requests_per_run', 'posted_within_days']) {
    const v = need(k)
    if (!(typeof v === 'number' && Number.isInteger(v) && v >= 1)) fail(`key boards.${k} must be an integer of 1 or more`)
  }
  return t as unknown as Boards
}

// ---------------------------------------------------------------- text

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
function decodeEntities(s: string): string {
  return s.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/giu, (m, d: string, h: string, n: string) => {
    if (d || h) { try { return String.fromCodePoint(d ? Number(d) : parseInt(h, 16)) } catch { return m } }
    return ENT[n.toLowerCase()] ?? m
  })
}
function fixMojibake(s: string): string {
  if (!/[âÃ][\u0080-¿]/u.test(s)) return s            // utf-8 read as latin-1, as Remote OK sends it
  const fixed = Buffer.from(s, 'latin1').toString('utf8')
  return fixed.includes('�') ? s : fixed
}
// shortcut: regex tag strip, not an HTML parser; upgrade if a JD reads garbled
function htmlToText(html: string): string {
  let s = html.replace(/<(script|style)[\s\S]*?<\/\1>/giu, '').replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr)\s*\/?>/giu, '\n').replace(/<li[^>]*>/giu, '- ').replace(/<[^>]+>/gu, '')
  s = decodeEntities(s)
  s = fixMojibake(s)
  return s.replace(/[ \t ]+/gu, ' ').replace(/ ?\n ?/gu, '\n').replace(/\n{3,}/gu, '\n\n').trim()
}

// ---------------------------------------------------------------- one job

function ist(d: Date): string { return Number.isNaN(d.getTime()) ? '' : isoSeconds(d).slice(0, 16) }
function boardLink(raw: string): string {
  try { const u = new URL(raw); u.search = ''; u.hash = ''; return u.toString() } catch { return raw }
}
const TZ_ONLY = /time\s?zones?|^(utc|gmt)\b|\b(utc|gmt)[+-]/iu
const ANYWHERE = /worldwide|anywhere|global/iu

// A reason to drop from a location value alone: it names places and none is reachable. Time zones are ignored.
function scopeReason(location: string): string | null {
  const places = location.split(',').map((p) => p.trim()).filter((p) => p && !TZ_ONLY.test(p))
  if (!places.length || places.some((p) => ANYWHERE.test(p) || reachTier(p) !== 'unstated')) return null
  return `remote but scoped to ${location}`
}

function job(feed: string, f: Omit<Partial<Job>, 'posted'> & { company: string; role: string; link: string; posted: Date }): Job {
  return {
    feed, location: '', salary_band: '', salary_period: '', notes: [], jd: [], description: '', drop_reason: null, part_time: false,
    ...f, link: boardLink(f.link), posted: f.posted.getTime(), posted_at: ist(f.posted),
  }
}
const notes = (feed: string, extra: [string, string][]): string[] => [`feed: ${LABEL[feed]}`, ...extra.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`)]

function himalayasRow(j: Record<string, unknown>): Job | null {
  const company = str(j['companyName']); const role = str(j['title']); const link = str(j['guid'])
  if (!company || !role || !link || typeof j['pubDate'] !== 'number') return null
  const locs = Array.isArray(j['locationRestrictions']) ? (j['locationRestrictions'] as unknown[]).map(str).filter(Boolean) : []
  const zones = Array.isArray(j['timezoneRestrictions']) ? (j['timezoneRestrictions'] as unknown[]).map(str) : []
  const period = PERIOD[str(j['salaryPeriod'])]
  const hasPay = typeof j['minSalary'] === 'number' && typeof j['maxSalary'] === 'number' && str(j['currency']) && period
  const band = hasPay ? `${str(j['currency'])} ${j['minSalary']}-${j['maxSalary']}` : ''
  const type = str(j['employmentType'])
  return job('himalayas', {
    company, role, link, posted: new Date((j['pubDate'] as number) * 1000), location: locs.join(', ') || 'Worldwide',
    salary_band: band, salary_period: band ? period : '', part_time: type === 'Part Time', description: str(j['description']),
    notes: notes('himalayas', [['employment', type], ['timezones', zones.length && zones.length < 30 ? zones.join(' ') : '']]),
    jd: [`Employment: ${type}`, `Time zones: ${zones.length && zones.length < 30 ? zones.join(' ') : ''}`, `Salary: ${band ? `${band} a ${period}` : ''}`],
  })
}
function remoteokRow(j: Record<string, unknown>): Job | null {
  const company = fixMojibake(str(j['company'])); const role = fixMojibake(str(j['position'])); const link = str(j['url'])
  if (!company || !role || !link) return null
  const lo = Number(j['salary_min']); const hi = Number(j['salary_max'])
  const usable = lo >= 1000 && hi >= 1000 && lo <= 1_000_000 && hi <= 1_000_000   // 0 is none; the feed has no currency or period
  const band = usable ? `USD ${lo}-${hi}` : ''
  return job('remoteok', {
    company, role, link, posted: new Date(typeof j['epoch'] === 'number' ? j['epoch'] * 1000 : str(j['date'])), location: str(j['location']),
    salary_band: band, salary_period: band ? 'year' : '', description: str(j['description']), notes: notes('remoteok', []),
    jd: [`Salary: ${band ? `${band} a year` : ''}`],
  })
}
function remotiveRow(j: Record<string, unknown>): Job | null {
  const company = str(j['company_name']); const role = str(j['title']); const link = str(j['url'])
  if (!company || !role || !link) return null
  const type = str(j['job_type']); const pay = str(j['salary'])
  return job('remotive', {
    company, role, link, posted: new Date(str(j['publication_date']) + 'Z'), location: str(j['candidate_required_location']),
    part_time: type === 'part_time', description: str(j['description']),
    notes: notes('remotive', [['employment', type], ['salary', pay]]), jd: [`Employment: ${type}`, `Salary: ${pay}`],
  })
}
const tag = (item: string, name: string): string => {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'u').exec(item)
  return m ? m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/u, '$1').trim() : ''
}
function wwrRow(item: string): Job | null {
  const title = decodeEntities(tag(item, 'title')); const link = tag(item, 'link') || tag(item, 'guid')
  const at = title.indexOf(': ')
  if (at < 1 || !link) return null
  const type = decodeEntities(tag(item, 'type'))
  return job('weworkremotely', {
    company: title.slice(0, at).trim(), role: title.slice(at + 2).trim(), link, posted: new Date(tag(item, 'pubDate')),
    location: decodeEntities(tag(item, 'region')), part_time: /part/iu.test(type), description: tag(item, 'description'),
    notes: notes('weworkremotely', [['employment', type]]), jd: [`Employment: ${type}`],
  })
}

// Rows of one parsed feed body. Throws on a body that is not the feed's shape.
export function parseFeed(feed: string, body: string): { jobs: Job[]; raw: number } {
  if (feed === 'weworkremotely') {
    const items = body.match(/<item>[\s\S]*?<\/item>/gu) ?? []
    if (!items.length) throw new Error('no items in the feed')
    return { jobs: items.map(wwrRow).filter((j): j is Job => !!j), raw: items.length }
  }
  const d: unknown = JSON.parse(body)
  const list: unknown = feed === 'remoteok' ? d : isTable(d) ? d['jobs'] : undefined
  if (!Array.isArray(list)) throw new Error('no job list in the response')
  const map = feed === 'himalayas' ? himalayasRow : feed === 'remotive' ? remotiveRow : remoteokRow
  return { jobs: list.filter(isTable).map(map).filter((j): j is Job => !!j), raw: list.length }
}

// ---------------------------------------------------------------- fetch

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
let requests = 0
async function get(url: string): Promise<string> {
  if (requests) await sleep(REQUEST_GAP_MS)
  requests++
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json, application/rss+xml, application/xml;q=0.9' }, signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

interface Result { feed: string; jobs: Job[]; pages: number; error?: string }

async function harvest(feed: string, b: Boards, within: (j: Job) => boolean): Promise<Result> {
  const res: Result = { feed, jobs: [], pages: 0 }
  const budget = (): boolean => requests < b.max_requests_per_run
  try {
    if (feed !== 'himalayas') {
      if (budget()) { res.jobs = parseFeed(feed, await get(b[URL_KEY[feed] as keyof Boards] as string)).jobs; res.pages = 1 }
      return res
    }
    for (const term of b.terms) {
      for (let page = 1; page <= 2 && budget(); page++) {
        const url = b.himalayas_url.replace('{q}', encodeURIComponent(term)).replace('{page}', String(page))
        const got = parseFeed(feed, await get(url))
        res.pages++
        res.jobs.push(...got.jobs)
        if (got.raw < HIMALAYAS_PAGE || !got.jobs.every(within)) break      // an empty or short page ends the term
      }
    }
  } catch (e) {
    res.error = e instanceof Error ? (e.name === 'TimeoutError' ? 'timeout' : e.message) : String(e)
  }
  return res
}

// ---------------------------------------------------------------- the sweep

const sha12 = (s: string): string => createHash('sha256').update(s).digest('hex').slice(0, 12)
const keyOf = (c: string, r: string): string => `${normaliseCompany(c)}|${normaliseRole(r)}`
const today = (): string => strftime('%Y-%m-%d')

function jdText(j: Job): string {
  const head = [`Board: ${LABEL[j.feed]}`, `Location: ${j.location}`, ...j.jd].filter((l) => !/:\s*$/u.test(l))
  return [`<!-- source: ${j.link}, read ${today()} -->`, ...head, '', htmlToText(j.description)].join('\n') + '\n'
}

export async function sweep(dry: boolean, out: Out): Promise<number> {
  const b = boardInputs()
  const session = process.env['JOBHUNT_SESSION']?.trim() ?? ''
  if (!dry && !session) { process.stderr.write('engine.ts boards sweep: error: needs --session S, or --dry-run\n'); return 2 }
  const stamp = join(C.LEDGER, 'boards-fetched.json')
  let fetched: Record<string, string> = {}
  try { const d: unknown = JSON.parse(readFileSync(stamp, 'utf8')); if (isTable(d)) fetched = d as Record<string, string> } catch { /* none yet */ }
  const cutoff = Date.now() - b.posted_within_days * 86_400_000
  const within = (j: Job): boolean => j.posted >= cutoff
  const terms = b.terms.map((t) => t.toLowerCase().split(/\s+/u).filter(Boolean))
  const results: Result[] = []
  for (const feed of b.feeds) {
    const age = (Date.now() - Date.parse(fetched[feed] ?? '')) / 3_600_000
    if (age < FEED_GAP_HOURS) { out(`FEED SKIPPED ${feed}: fetched ${Math.floor(age)} h ago\n`); continue }
    const r = await harvest(feed, b, within)
    if (r.error) out(`FEED FAILED ${feed}: ${r.error}\n`)
    results.push(r)
  }
  // Filters, in feed order, so the copy of a cross-board duplicate that stays is the one the table lists first.
  const seen = new Map<string, Job>()
  const stale = Date.now() - C.cfg().stale_days * 86_400_000
  const known = new Set<string>()
  if (existsSync(C.PROSPECTS)) {
    for (const r of readDicts(decodeStrict(readFileSync(C.PROSPECTS))).rows) {
      if (Date.parse(r['date_found'] ?? '') >= stale && r['company'] && r['role']) known.add(keyOf(r['company'], r['role']))
    }
  }
  let dupes = 0
  for (const r of results) {
    r.jobs = r.jobs.filter((j) => {
      if (!within(j)) return false
      const role = j.role.toLowerCase()
      if (!terms.some((t) => t.every((w) => role.includes(w)))) return false
      const k = keyOf(j.company, j.role)
      const first = seen.get(k)
      if (first) { first.notes.push(`also on ${LABEL[j.feed]} ${j.link}`); dupes++; return false }
      if (known.has(k) || check(j.company, j.role, j.link)) { dupes++; return false }
      seen.set(k, j)
      return true
    })
  }
  const kept = results.flatMap((r) => r.jobs).sort((a, c) => c.posted - a.posted).slice(0, b.max_rows_per_run)
  for (const j of kept) {
    // Remote OK's location field is unreliable and never drops a row. Every other feed is read as structured.
    j.drop_reason = j.part_time ? 'part-time' : j.feed === 'remoteok' ? null : scopeReason(j.location)
  }
  const live = kept.filter((j) => !j.drop_reason)
  const dropped = kept.length - live.length
  const failedFeeds = results.filter((r) => r.error).length
  const summary = `remote_boards: fetched ${requests} requests, ${live.length} kept, ${dropped} dropped, ${dupes} duplicates, ${failedFeeds} feeds failed\n`
  if (dry) {
    for (const j of kept) out(`${LABEL[j.feed]}  ${j.posted_at}  ${j.company}  ${j.role}  ${j.location || '-'}  ${j.drop_reason ?? '-'}\n`)
    out(summary)
    return 0
  }
  const d = session
  const firing = strftime('%Y-%m-%d-%H')
  const dir = join(d, C.STAGE_DIR, 'sweep')
  mkdirSync(dir, { recursive: true })
  mkdirSync(C.ROLES, { recursive: true })
  for (const j of live) {
    const path = join(C.ROLES, `board-${sha12(j.link)}.jd.md`)
    if (!existsSync(path)) writeAtomic(path, jdText(j))
  }
  const rows = kept.map((j) => ({
    source: 'remote_boards', channel: 'external_ats', work_mode: 'remote', batch: LABEL[j.feed], company: j.company, role: j.role, link: j.link,
    location: j.location, salary_band: j.salary_band, salary_period: j.salary_period, posted_at: j.posted_at, notes: j.notes.join('; '), drop_reason: j.drop_reason,
  }))
  const queries = results.filter((r) => !r.error || r.jobs.length).flatMap((r) => r.feed === 'himalayas' ? b.terms.map((t) => `himalayas:${t}`) : [r.feed])
  writeAtomic(join(dir, `${firing}-remote_boards-1.json`), JSON.stringify({ source: 'remote_boards', firing, queries, rows }, null, 1) + '\n')
  const answered = results.filter((r) => !r.error)
  for (const r of answered) fetched[r.feed] = isoSeconds()
  if (answered.length) writeAtomic(stamp, JSON.stringify(fetched, null, 1) + '\n')
  for (const r of answered) sweepLine(d, 'remote_boards', { query: r.feed, pages: String(r.pages), kept: String(kept.filter((j) => j.feed === r.feed).length) })
  if (results.length && !answered.length) sweepLine(d, 'remote_boards', { status: 'failed', reason: results.map((r) => `${r.feed}: ${r.error}`).join('; ').slice(0, 200) })
  else sweepLine(d, 'remote_boards', { status: 'ok' })
  out(summary)
  return 0
}

export async function main(argv: string[], out: Out = (s) => { process.stdout.write(s) }): Promise<number> {
  const usage = 'usage: engine.ts [--session S] boards sweep [--dry-run]\n'
  if (argv.includes('-h') || argv.includes('--help')) { out(usage); return 0 }
  const flags = argv.slice(1)
  if (argv[0] !== 'sweep' || flags.some((f) => f !== '--dry-run')) { process.stderr.write(`${usage}engine.ts boards: error: expected "sweep [--dry-run]"\n`); return 2 }
  return sweep(flags.length > 0, out)
}
