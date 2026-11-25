// Preflight and the read-only status report.
// preflight prints the facts a run needs before it touches anything, and a STOP: line for each hard failure.
// report is a read-only summary of the queue. Neither writes a file or runs an agent.
//
//     node process/engine.ts preflight       # exit 2 when a STOP: line was printed
//     node process/engine.ts status          # always exit 0 unless the profile cannot resolve
//     node process/engine.ts yield           # reply rates by match band, lane, outreach channel and application age
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import * as C from '../constants.ts'
import { readDicts } from '../lib/csv.ts'
import {
  byKey, cut, daysBetween, decodeStrict, PyExc, pyPath, pyStr, pyStrip, roundHalfEven, strftime,
} from '../lib/py.ts'
import { Exit, type Out } from './io.ts'
import * as profiles from './profiles.ts'
import * as session_ from './session.ts'
import * as findings from './findings.ts'

type Row = Record<string, string>

const FOLLOW_UP_DAYS = 10
const RANKED_SHOWN = 15
const SHORTLISTED: ReadonlySet<string> = new Set(['scored', 'ready', 'queued', 'held', 'applied'])

// str.splitlines() boundaries
const LINE_BREAK = new RegExp('\\r\\n|[\\n\\r\\x0b\\x0c\\x1c-\\x1e\\x85\\u2028\\u2029]', 'u')
// '%-Ns' and '%Ns' pad by code points.
const ljust = (s: string, n: number): string => s + ' '.repeat(Math.max(0, n - Array.from(s).length))
const rjust = (s: string, n: number): string => ' '.repeat(Math.max(0, n - Array.from(s).length)) + s

// ------------------------------------------------------------------ helpers

const ERRNO: Record<string, [number, string]> = {
  EISDIR: [21, 'Is a directory'], EACCES: [13, 'Permission denied'], EPERM: [1, 'Operation not permitted'],
  ENOTDIR: [20, 'Not a directory'],
}

// (rows, note). rows is null when the file is missing or unreadable, with a note saying so.
function readCsv(path: string): [Row[] | null, string] {
  let buf: Buffer
  try { buf = readFileSync(path) } catch (e) {
    const code = (e as NodeJS.ErrnoException).code ?? ''
    if (code === 'ENOENT') {
      return [null, `${path} does not exist yet. That is normal on a fresh clone; run "engine.ts ledger init".`]
    }
    const [n, text] = ERRNO[code] ?? [5, 'Input/output error']
    return [null, `could not read ${path}: [Errno ${n}] ${text}: ${pyStr([path]).slice(1, -1)}`]
  }
  const { cols, rows } = readDicts(decodeStrict(buf))
  const out: Row[] = []
  for (const r of rows) {
    const d: Row = {}
    for (const [k, v] of Object.entries(r)) {
      if (k === '__extra__' && !cols.includes(k)) continue
      if (k) d[pyStrip(k)] = pyStrip(v ?? '')
    }
    out.push(d)
  }
  return [out, '']
}

// int(float(value)), or `dflt` on ValueError or TypeError.
function toInt(value: string | undefined, dflt = -1): number {
  if (value === undefined) return dflt
  const s = pyStrip(value)
  if (/^[+-]?(?:inf|infinity)$/iu.test(s)) throw new PyExc('OverflowError', 'cannot convert float infinity to integer')
  const digits = '\\d+(?:_\\d+)*'
  const ok = new RegExp(`^[+-]?(?:${digits}(?:\\.(?:${digits})?)?|\\.${digits})(?:[eE][+-]?${digits})?$`, 'u')
  if (!ok.test(s)) return dflt
  const n = Math.trunc(Number(s.replaceAll('_', '')))
  if (!Number.isFinite(n)) throw new PyExc('OverflowError', 'cannot convert float infinity to integer')
  return n
}

// Path of the open session, or null. session.current is used when it exists.
export function openSession(): string | null {
  const found = session_.current(false)
  return found === null ? null : pyPath(found)
}

function uncommitted(): number | null {
  const r = spawnSync('git', ['status', '--porcelain'], { cwd: C.REPO, encoding: 'utf8', timeout: 30_000 })
  if (r.error || r.status !== 0) return null
  return r.stdout.split(LINE_BREAK).filter((ln) => pyStrip(ln) !== '').length
}

// ------------------------------------------------------------------ preflight

// Print the run's starting facts. Returns 2 when a STOP: line was printed, else 0.
export function preflight(out: Out): number {
  const gone = profiles.missing()
  if (gone !== null) {
    out(`STOP: profile unresolved - ${gone}\n`)
    return 2
  }
  out(`Profile: ${profiles.rel()}\n`)

  let cfg: C.Config
  try { cfg = C.cfg() } catch (e) {
    if (!(e instanceof Exit)) throw e
    out('STOP: inputs.toml is missing or invalid (see the line above). Run "engine.ts config".\n')
    return 2
  }

  const dev = profiles.local('chrome_device_id')
  if (dev) out(`Chrome deviceId: ${dev}\n`)
  else out('STOP-APPLY: process/local.json has no chrome_device_id\n')
  // A source is live when search.live_sources names it and its runner file exists.
  const live = cfg.live_sources.filter((src) => C.runnerPath(src) !== null)
  out(`Lanes: sweep=${session_.unpaused(live).join(',') || 'none'}\n`)
  const paused = session_.pausedLine(live)
  if (paused) out(`${paused}\n`)
  let stop = false
  for (const src of cfg.live_sources) {
    if (C.runnerPath(src) === null) {
      out(`STOP: search.live_sources names ${src}, which has no runner file in process/runners/\n`)
      stop = true
    }
  }

  const [rows, note] = readCsv(C.PROSPECTS)
  if (rows === null) out(`Queue: ${note}\n`)
  else {
    const counts = new Map<string, number>()
    for (const r of rows) {
      const s = r['status'] || '(blank)'
      counts.set(s, (counts.get(s) ?? 0) + 1)
    }
    const spread = [...counts.keys()].sort(byKey((k) => k)).map((k) => `${k} ${counts.get(k)}`).join(', ') || 'empty'
    out(`Queue: ${spread}\n`)
    const pending = rows.filter((r) => (r['override'] ?? '').toLowerCase() === 'yes' && !r['reviewed']).length
    out(`Override pending: ${pending}\n`)
  }

  const session = openSession()
  if (session === null) out('Open session: none\n')
  else {
    out(`Open session: ${session}\n`)
    const stageRoot = join(session, C.STAGE_DIR)
    const pend = C.STAGES.map((s) => {
      let n = 0
      try { n = readdirSync(join(stageRoot, s)).filter((f) => f.endsWith('.json')).length } catch { /* no folder */ }
      return `${s} ${n}`
    })
    out('Pending stage files (not yet ingested): ' + pend.join(', ') + '\n')
  }

  const used = session_.topChoiceSpent()
  out(`Top choice spent this month: ${used} of ${cfg.top_choice_per_month}\n`)

  const dirty = uncommitted()
  out(`Uncommitted paths: ${dirty === null ? 'unknown' : dirty}\n`)
  return stop ? 2 : 0
}

// ------------------------------------------------------------------ report

function pyErrName(e: unknown): string {
  if (e instanceof PyExc) return e.pyName
  const code = (e as NodeJS.ErrnoException).code
  if (code === 'ENOENT') return 'FileNotFoundError'
  if (code === 'EISDIR') return 'IsADirectoryError'
  if (code === 'EACCES') return 'PermissionError'
  return e instanceof Error ? e.constructor.name : 'Exception'
}

// Lines describing retro work pending. Never throws.
function retroPending(): string[] {
  let result: Record<string, unknown>[]
  try { result = findings.pending() } catch (e) {
    if (e instanceof Exit) return ['retro pending: findings tool exited early']
    return [`retro pending: findings tool failed (${pyErrName(e)}: ${(e as Error).message})`]
  }
  return result.map((item) => `retro pending: ${pyStr(item)}`).length
    ? result.map((item) => `retro pending: ${pyStr(item)}`)
    : ['retro pending: nothing']
}

function cfgStaleDays(): number {
  return C.cfg().stale_days
}

// A read-only summary. Returns 0 unless the profile cannot resolve.
export function report(out: Out): number {
  const gone = profiles.missing()
  if (gone !== null) {
    process.stderr.write(`profile: ${gone}\n`)
    return 2
  }
  try { C.cfg() } catch (e) {   // validates inputs.toml
    if (e instanceof Exit) return 2
    throw e
  }
  out(`Profile: ${profiles.rel()}\n`)

  let [rows, note] = readCsv(C.PROSPECTS)
  if (rows === null) {
    out(note + '\n')
    rows = []
  }

  out('\nCounts by status\n')
  const counts = new Map<string, number>()
  for (const r of rows) {
    const s = r['status'] || '(blank)'
    counts.set(s, (counts.get(s) ?? 0) + 1)
  }
  if (counts.size) {
    for (const k of [...counts.keys()].sort(byKey((x) => x))) out(`  ${ljust(k, 14)} ${counts.get(k)}\n`)
  } else out('  no rows\n')

  out('\nQueue, ranked by match (scored or ready, not yet applied)\n')
  const queue = rows.filter((r) => C.STAGE_STATUS['apply'].has(r['status'] ?? ''))
  const keyed = queue.map((r) => [-toInt(r['match']), r['id'] ?? '', r] as const)
  queue.splice(0, queue.length, ...keyed.sort(byKey((t) => [t[0], t[1]])).map((t) => t[2]))
  if (!queue.length) out('  empty\n')
  for (const r of queue.slice(0, RANKED_SHOWN)) {
    out(`  ${rjust(r['match'] || '-', 3)}  ${ljust(r['status'] ?? '', 6)} ${ljust(cut(r['company'] ?? '', 22), 22)} ` +
      `${cut(r['role'] ?? '', 48)}  [${r['source'] ?? ''}/${r['channel'] ?? ''}]\n`)
  }
  if (queue.length > RANKED_SHOWN) out(`  ... and ${queue.length - RANKED_SHOWN} more\n`)

  out(`\nFollow-ups (applied more than ${FOLLOW_UP_DAYS} days ago, no response)\n`)
  const today = strftime('%Y-%m-%d')
  const due: [number, Row][] = []
  for (const r of rows) {
    if (r['status'] !== 'applied' || r['response']) continue
    const m = /^\p{Nd}{4}-\p{Nd}{2}-\p{Nd}{2}/u.exec(r['applied_date'] ?? '')
    if (!m) continue
    const age = daysBetween(m[0], today)
    if (age > FOLLOW_UP_DAYS) due.push([age, r])
  }
  due.sort(byKey((t) => -t[0]))
  if (!due.length) out('  none\n')
  for (const [age, r] of due) {
    out(`  ${rjust(String(age), 3)}d  ${ljust(cut(r['company'] ?? '', 22), 22)} ${cut(r['role'] ?? '', 48)}  (${r['id'] ?? ''})\n`)
  }

  const stale = cfgStaleDays()
  out(`\nStale new rows (older than ${stale} days; "engine.ts ingest age" sets them to skipped)\n`)
  const old: [number, Row][] = []
  for (const r of rows) {
    if (r['status'] !== 'new') continue
    let age: number
    try { age = daysBetween(r['date_found'] ?? '', today) } catch (e) {
      if (e instanceof PyExc || !(e instanceof Error)) throw e
      continue   // ValueError
    }
    if (age > stale) old.push([age, r])
  }
  old.sort(byKey((t) => -t[0]))
  if (!old.length) out('  none\n')
  for (const [, r] of old) {
    const keep = (r['override'] ?? '').toLowerCase() === 'yes' ? '  kept: override' : ''
    out(`  ${ljust(r['id'] ?? '', 18)} ${ljust(cut(r['company'] ?? '', 22), 22)} ${ljust(cut(r['role'] ?? '', 48), 48)} ` +
      `${r['date_found'] ?? ''}${keep}\n`)
  }

  out('\nSource yield (rows returned vs rows shortlisted)\n')
  const bySrc = new Map<string, [number, number]>()
  for (const r of rows) {
    const s = r['source'] || '(blank)'
    const [tot, kept] = bySrc.get(s) ?? [0, 0]
    bySrc.set(s, [tot + 1, kept + (SHORTLISTED.has(r['status'] ?? '') ? 1 : 0)])
  }
  if (!bySrc.size) out('  no data\n')
  for (const s of [...bySrc.keys()].sort(byKey((x) => x))) {
    const [tot, kept] = bySrc.get(s)!
    out(`  ${ljust(s, 12)} returned ${rjust(String(tot), 4)}  shortlisted ${rjust(String(kept), 4)}  ` +
      `(${tot ? roundHalfEven(100 * kept / tot) : 0}%)\n`)
  }

  out('\nRetro work pending\n')
  const lines = retroPending()
  for (const ln of lines.length ? lines : ['  nothing']) out((ln.startsWith('  ') ? ln : '  ' + ln) + '\n')
  return 0
}


// ------------------------------------------------------------------ yield

// Age buckets of an application, in minutes from the posting to the send. Blank ages go in `unknown`.
const AGE_BUCKETS: readonly [string, number, number][] = [
  ['0-30', 0, 30], ['30-60', 30, 60], ['60-120', 60, 120], ['120-240', 120, 240], ['240+', 240, Infinity],
]

// One table of `applied` against `replied`, rows in the order given.
function yieldTable(out: Out, title: string, tally: Map<string, [number, number]>, order: readonly string[]): void {
  out(`\n${title}\n`)
  const keys = [...order.filter((k) => tally.has(k)), ...[...tally.keys()].filter((k) => !order.includes(k)).sort()]
  if (!keys.length) out('  no data\n')
  for (const k of keys) {
    const [sent, replied] = tally.get(k)!
    out(`  ${ljust(k, 12)} ${rjust(String(sent), 4)} sent  ${rjust(String(replied), 4)} replied  ${rjust(String(sent ? roundHalfEven(100 * replied / sent) : 0), 3)}%\n`)
  }
}

function bump(tally: Map<string, [number, number]>, key: string, replied: boolean): void {
  const [n, r] = tally.get(key) ?? [0, 0]
  tally.set(key, [n + 1, r + (replied ? 1 : 0)])
}

// Reply rate over the applied ledger, joined to prospects.csv by link for the match and the response, and over contacted.csv
// for outreach. A reply is a non-empty `response` on the prospect row, or a `replied_date` on the contact row.
export function yieldReport(out: Out): number {
  const [applied, aNote] = readCsv(C.APPLIED)
  const [prospects, pNote] = readCsv(C.PROSPECTS)
  const [contacted, cNote] = readCsv(C.CONTACTED)
  for (const note of [aNote, pNote, cNote]) if (note) out(note + '\n')
  const byLink = new Map<string, Row>()
  for (const r of prospects ?? []) if (r['link'] && !byLink.has(r['link'])) byLink.set(r['link'], r)
  const band = new Map<string, [number, number]>()
  const lane = new Map<string, [number, number]>()
  const ageT = new Map<string, [number, number]>()
  for (const a of applied ?? []) {
    const p = byLink.get(a['link'] ?? '') ?? {}
    const replied = !!(p['response'] ?? '')
    const match = toInt(p['match'])
    bump(band, match < 0 ? 'unknown' : `${Math.floor(match / 10) * 10}-${Math.floor(match / 10) * 10 + 9}`, replied)
    bump(lane, C.laneOf(a['source'] ?? '', a['channel'] ?? ''), replied)
    const age = a['age_minutes'] ? toInt(a['age_minutes']) : -1
    bump(ageT, age < 0 ? 'unknown' : AGE_BUCKETS.find(([, lo, hi]) => age >= lo && age < hi)![0], replied)
  }
  const channel = new Map<string, [number, number]>()
  for (const c of contacted ?? []) if (c['status'] === 'sent' || c['status'] === 'accepted') bump(channel, c['channel'] || 'unknown', !!c['replied_date'])
  out(`Reply rate. ${applied?.length ?? 0} application(s) in the applied ledger, ${contacted?.length ?? 0} contact row(s).\n`)
  yieldTable(out, 'Applications by match band', band, [...band.keys()].filter((k) => k !== 'unknown').sort().reverse().concat('unknown'))
  yieldTable(out, 'Applications by lane', lane, [])
  yieldTable(out, 'Applications by age at apply, minutes', ageT, [...AGE_BUCKETS.map((b) => b[0]), 'unknown'])
  yieldTable(out, 'Outreach by channel, rows sent or accepted', channel, C.CONTACT_CHANNELS)
  return 0
}

// ------------------------------------------------------------------ cli

const PRE_USAGE = 'usage: engine.ts preflight [-h]\n'
const PRE_HELP = PRE_USAGE + '\nCheck profile, browser, queue and open session before a run. Exit 2 when a\nSTOP: line is printed.\n\noptions:\n  -h, --help  show this help message and exit\n'
const YIELD_USAGE = 'usage: engine.ts yield [-h]\n'
const YIELD_HELP = YIELD_USAGE + '\nReply rate of the applied ledger by match band, lane and age at apply, and of contacted.csv by channel. Read-only.\n\noptions:\n  -h, --help  show this help message and exit\n'
const REP_USAGE = 'usage: engine.ts status [-h]\n'
const REP_HELP = REP_USAGE + '\nRead-only report: counts, queue, follow-ups, stale new rows, source yield.\n\noptions:\n  -h, --help  show this help message and exit\n'

export function main(argv: string[], out: Out = (s) => { process.stdout.write(s) }): number {
  const isFirst = argv.length > 0 && (argv[0] === 'preflight' || argv[0] === 'report' || argv[0] === 'yield')
  const what = isFirst ? argv[0] : 'report'
  const rest = isFirst ? argv.slice(1) : argv
  const pre = what === 'preflight'
  const yld = what === 'yield'
  const extra: string[] = []
  let dashes = false
  for (const a of rest) {
    if (!dashes && a === '--') { dashes = true; continue }
    if (!dashes && a.startsWith('-') && a !== '-' && (a === '-h' || (a.length > 2 && '--help'.startsWith(a)))) {
      out(pre ? PRE_HELP : yld ? YIELD_HELP : REP_HELP)
      return 0
    }
    extra.push(a)
  }
  if (extra.length) {
    process.stderr.write((pre ? PRE_USAGE : yld ? YIELD_USAGE : REP_USAGE) + `engine.ts ${pre ? 'preflight' : yld ? 'yield' : 'status'}: error: unrecognized arguments: ${extra.join(' ')}\n`)
    return 2
  }
  return pre ? preflight(out) : yld ? yieldReport(out) : report(out)
}
