// One place that answers: have we already applied to this?
// Every source has its own idea of what a job is, and the same role is routinely posted on two of them.
// So the answer lives in the applied ledger (`constants.APPLIED`) and everything asks this module.
// Three identity keys are checked in this order, and the first hit wins:
//   1. canonical link          exact, after stripping query strings and tracking
//   2. source:job_id           for example waas:91111, linkedin:4400000000
//   3. company_norm|role_norm  catches the same role reached from two sources
// Key 3 is deliberately fuzzy and deliberately last.
//
// Usage (through engine.ts)
//     dedupe check "<company>" "<role>" "<link>"       exit 2 when already spent
//     dedupe record --company C --role R --link L --channel CH [--source S] ...
//     dedupe reserve --id ID --company C --role R --link L --channel CH [--source S]   before the final submit click
//     dedupe unreserve --id ID --reason TEXT                                          the form was never submitted
//     dedupe distinct <job_id_a> <job_id_b> --reason TEXT   key 3 stops matching that pair
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, basename } from 'node:path'
import * as C from '../constants.ts'
import { readDicts, writeDicts, type CsvRow } from '../lib/csv.ts'
import { PY_WS, decodeStrict, isoSeconds, pyRstrip, pyStr, pyStrip, strftime } from '../lib/py.ts'
import { withLock, writeAtomic, type Out } from './io.ts'

// ---------------------------------------------------------------- normalising

const CO_NOISE = new RegExp(
  '\\b(inc|llc|llp|ltd|limited|pvt|private|corp|corporation|co|gmbh|plc|sa|bv|ag|' +
  'technologies|technology|tech|labs|lab|software|solutions|systems|group|holdings|' +
  'india|global|ai|the)\\b', 'giu')

// Grade words (senior, staff, lead, manager, ii, 3 and the like) are not noise: two grades of one role at a company
// are two openings. `stated` 2026-11-02
const ROLE_NOISE = new RegExp(
  '\\b(full[- ]?time|contract|remote|hybrid|onsite|on[- ]?site|' +
  'us|usa|india|emea|apac|latam|anywhere)\\b', 'giu')

// One grade, two spellings: "Sr. Engineer" and "Senior Engineer" are one opening, so they keep one key.
const GRADE_SPELLING: Record<string, string> = { sr: 'senior', jr: 'junior', i: '1', ii: '2', iii: '3', iv: '4' }

const WS_PLUS = new RegExp(`[${PY_WS}]+`, 'gu')

// Input is squashed to [a-z0-9 ] before either pattern runs, so the ASCII \b agrees with Python's.
function squash(s: string | null | undefined): string {
  let t = (s || '').replace(/\([^\n]*?\)/gu, ' ')       // drop parentheticals: "(India/Remote)", "(W22)"
  t = t.toLowerCase().replace(/[^a-z0-9]+/gu, ' ')
  return pyStrip(t.replace(WS_PLUS, ' '))
}

// Strip corporate noise words, but never all the way to the empty string.
//
// "Systems Limited" is entirely noise words. An empty norm would make key 3 inert for that
// employer, and the next company that also normalises to '' would match it and be skipped
// unopened. A false positive here is silent and costs a real application, so fall back to
// the unstripped squash whenever stripping leaves nothing.
export function normaliseCompany(s: string | null | undefined): string {
  const squashed = squash(s)
  const stripped = pyStrip(squashed.replace(CO_NOISE, ' ').replace(WS_PLUS, ' '))
  return stripped || squashed
}

// A Naukri invite from an agency that does not name its client has the company `Client not named (<agency>)`.
// Its norm drops the parenthetical, so every such invite shares it. `stated` 2026-11-02
const HIDDEN_CLIENT = 'client not named'

export function normaliseRole(s: string | null | undefined): string {
  let t = squash(s)
  t = t.replace(ROLE_NOISE, ' ')
  t = t.replace(/\bfde\b/gu, 'forward deployed engineer')   // fde == forward deployed engineer
  t = t.replace(/\b(sr|jr|i|ii|iii|iv)\b/gu, (g) => GRADE_SPELLING[g] ?? g)
  return pyStrip(t.replace(WS_PLUS, ' '))
}

// ------------------------------------------------------------------- identity

// \w and \d in Python's re are Unicode-aware.
const SOURCE_PATTERNS: [string, RegExp][] = [
  // /jobs/view/<id>, /jobs/view/<slug>-<id> and /comm/jobs/view/<id>, with or without a query string
  ['linkedin', /^(?:https?:\/\/)?(?:[\p{L}\p{N}_-]+\.)*linkedin\.com\/(?:comm\/)?jobs\/view\/(?:[^/?#]*-)?(\p{Nd}+)(?=[/?#]|$)/iu],
  ['waas', /workatastartup\.com\/jobs\/(\p{Nd}+)/u],
  ['naukri', /naukri\.com\/job-listings-[^/?#]*?-(\p{Nd}+)/u],
  // A recruiter invite has no job link. Its row link is the inbox URL with the invite key as the fragment, and the
  // fragment stays in the canonical link so each invite keeps its own key. The key is the first 12 hex characters of the
  // SHA-256 of the card's data-inviteid, computed in the page. `stated` 2026-11-02
  ['naukri', /naukri\.com\/mnjuser\/inbox#([0-9a-f]{12})(?![0-9a-f])/u],
]

const CANONICAL: Record<string, string> = {
  linkedin: 'https://www.linkedin.com/jobs/view/{}/',
  waas: 'https://www.workatastartup.com/jobs/{}',
}

// [source, job_id, canonical_link]. source and job_id are null for an unrecognised host.
export function identify(link: string | null | undefined): [string | null, string | null, string] {
  const l = pyStrip(link || '')
  for (const [source, pat] of SOURCE_PATTERNS) {
    const m = pat.exec(l)
    if (m) {
      const jid = m[1]
      return [source, jid, Object.hasOwn(CANONICAL, source) ? CANONICAL[source].replace('{}', jid) : l]
    }
  }
  return [null, null, pyRstrip(l.replace(/[?#][^\n]*$/u, ''), '/')]
}

export function keyFor(link: string, company = '', role = ''): string {
  const [source, , canon] = identify(link)
  return canon || `${source || 'unknown'}:${normaliseCompany(company)}|${normaliseRole(role)}`
}

// --------------------------------------------------------------------- ledger

function read(path: string): CsvRow[] {
  if (!existsSync(path)) return []
  return readDicts(decodeStrict(readFileSync(path))).rows
}

export function load(): CsvRow[] {
  return read(C.APPLIED)
}

// Append one row, writing the header first when the file is new or empty.
export function append(path: string, cols: readonly string[], row: Record<string, unknown>): void {
  const isNew = !existsSync(path) || statSync(path).size === 0
  const full: Record<string, unknown> = {}
  for (const c of cols) full[c] = row[c] ?? ''
  appendFileSync(path, writeDicts(cols, [full], { header: isNew }), 'utf8')
}

// Exclusive lock for the whole read-check-append. Parallel appliers call `record` within
// seconds of each other. Without the lock the last writer wins and an application vanishes.
export function locked<T>(path: string, fn: () => T): T {
  mkdirSync(dirname(path), { recursive: true })
  return withLock(path, fn)
}

// True when the candidate confirmed these two job ids are different openings (either order).
function isDistinct(a: string | null, b: string | null | undefined): boolean {
  if (!a || !b) return false
  return read(C.DISTINCT).some((r) => (r['job_id_a'] === a && r['job_id_b'] === b) || (r['job_id_a'] === b && r['job_id_b'] === a))
}

type Hit = CsvRow & { via?: string }

// [matched_row, which_key] or [null, null].
function match(company: string, role: string, link: string, rows: CsvRow[]): [CsvRow, string] | [null, null] {
  const [source, jid, canon] = identify(link)
  const cn = normaliseCompany(company)
  const rn = normaliseRole(role)
  if (canon) {
    for (const r of rows) if (r['key'] === canon || r['link'] === canon) return [r, 'link']
  }
  if (source && jid) {
    for (const r of rows) if (r['source'] === source && r['job_id'] === jid) return [r, 'source:job_id']
  }
  // Key 3 is the fuzzy one. It never fires on an empty norm on either side, because an empty
  // norm matches every other empty one. It never fires on a hidden client either: the invite key is that opening's key.
  if (cn && rn && cn !== HIDDEN_CLIENT) {
    for (const r of rows) {
      // The role is normalised now, not read from role_norm, so a row written under an older rule compares by the
      // current one. A reservation has no company_norm.
      const rcn = r['company_norm'] || normaliseCompany(r['company'])
      const rrn = normaliseRole(r['role'])
      if (!pyStrip(rcn) || !pyStrip(rrn)) continue
      if (rcn === cn && rrn === rn && !isDistinct(jid, r['job_id'])) return [r, 'company|role']
    }
  }
  return [null, null]
}

// The ledger row that already spent this opening, with a 'via' key, or null.
// `source` and `jobId`, when given, are tried as key 2 before the link is parsed.
export function check(company: string, role: string, link: string,
                      source: string | null = null, jobId: string | null = null): Hit | null {
  const cn = normaliseCompany(company)
  // search.blocked_companies: never applied to under any title. A Hit with via 'blocked', so every caller treats it as spent.
  if (cn && cn !== HIDDEN_CLIENT && C.cfg().blocked_companies.some((b) => normaliseCompany(b) === cn)) {
    return { company, role, link, via: 'blocked' }
  }
  const rows = load()
  if (source && jobId) {
    for (const r of rows) {
      if (r['source'] === source && r['job_id'] === String(jobId)) return { ...r, via: 'source:job_id' }
    }
  }
  const [hit, how] = match(company, role, link, rows)
  return hit ? { ...hit, via: how } : null
}

type Fields = Record<string, string | undefined>

// ---------------------------------------------------------------- reservations
//
// A reservation is a form about to be submitted, written just before the final click. It lives in reserved.csv, so no
// reader of applied.csv counts a form that may not have gone out. `record` promotes it, `unreserve` withdraws it.
// applied.csv's lock guards both files.

function readReserved(): CsvRow[] {
  return read(C.RESERVED)
}

// The open reservation for a prospects row id, or null.
export function reservationFor(id: string): CsvRow | null {
  return readReserved().find((r) => r['id'] === id) ?? null
}

// The open reservation that stands in the way of this opening, by the same three keys `check` uses.
function reservedHit(company: string, role: string, link: string, source: string | null = null, jobId: string | null = null): CsvRow | null {
  const rows = readReserved()
  if (source && jobId) {
    const r = rows.find((x) => x['source'] === source && x['job_id'] === String(jobId))
    if (r) return r
  }
  return match(company, role, link, rows)[0]
}

// Remove the reservations `drop` picks and return how many went. The caller holds the applied lock.
function dropReserved(drop: (r: CsvRow) => boolean): number {
  const rows = readReserved()
  const keep = rows.filter((r) => !drop(r))
  if (keep.length !== rows.length) writeAtomic(C.RESERVED, writeDicts(C.RESERVED_COLS, keep))
  return rows.length - keep.length
}

// Withdraw the reservation of one prospects row, if it has one.
export function unreserveId(id: string): number {
  return locked(C.APPLIED, () => dropReserved((r) => r['id'] === id))
}

// Minutes between the posting time in prospects.csv and now, or '' when the row has no posting time with a clock in it.
function ageMinutes(id: string): string {
  const posted = pyStrip(read(C.PROSPECTS).find((r) => r['id'] === id)?.['posted_at'] ?? '')
  const at = /[T ]\d{2}:\d{2}/u.test(posted) ? Date.parse(posted) : NaN
  const mins = Math.round((Date.now() - at) / 60_000)
  return Number.isFinite(mins) && mins >= 0 ? String(mins) : ''
}

// The session this process works in: JOBHUNT_SESSION, else the newest open hunt, else ''.
function sessionName(): string {
  const d = pyStrip(process.env['JOBHUNT_SESSION'] ?? '') || C.liveRuns([C.SESSION_SUFFIX]).at(-1) || ''
  return d ? basename(d) : ''
}

type Reserved = ['applied', Hit] | ['reserved', CsvRow] | ['ok', string]

function reserveRow(f: Fields): Reserved {
  return locked(C.APPLIED, (): Reserved => {
    const company = f['company'] ?? '', role = f['role'] ?? '', link = f['link'] ?? ''
    const [hit, how] = match(company, role, link, load())
    if (hit) return ['applied', { ...hit, via: how }]
    const held = reservedHit(company, role, link)
    if (held) return ['reserved', held]
    const [s, jid, canon] = identify(link)
    const key = canon || keyFor(link, company, role)
    append(C.RESERVED, C.RESERVED_COLS, {
      key, source: f['source'] || s || '', job_id: jid || '', company, role, link: canon, id: f['id'] ?? '',
      session: sessionName(), date: strftime('%Y-%m-%d'), ts: isoSeconds(), age_minutes: ageMinutes(f['id'] ?? ''),
    })
    return ['ok', key]
  })
}

// [existing_row_or_null, key]. Idempotent: recording an opening twice is a no-op.
function recordRow(f: Fields): [Hit | null, string] {
  return locked(C.APPLIED, (): [Hit | null, string] => {
    const rows = load()
    const [hit, how] = match(f['company'] ?? '', f['role'] ?? '', f['link'] ?? '', rows)
    if (hit) return [{ ...hit, via: how }, hit['key'] ?? '']
    const link = f['link'] ?? ''
    const [s, jid, canon] = identify(link)
    const key = canon || keyFor(link, f['company'] ?? '', f['role'] ?? '')
    const mine = (r: CsvRow): boolean => !!match(f['company'] ?? '', f['role'] ?? '', link, [r])[0]
    const reserved = readReserved().find(mine)
    append(C.APPLIED, C.APPLIED_COLS, {
      key,
      source: f['source'] || s || '',
      job_id: f['job_id'] || jid || '',
      company: f['company'] ?? '', company_norm: normaliseCompany(f['company'] ?? ''),
      role: f['role'] ?? '', role_norm: normaliseRole(f['role'] ?? ''),
      link: canon, channel: f['channel'] ?? '',
      applied_date: f['applied_date'] || strftime('%Y-%m-%d'),
      status: f['status'] || 'applied',
      role_file: f['role_file'] ?? '', notes: f['notes'] ?? '',
      age_minutes: reserved?.['age_minutes'] ?? '',
    })
    if (reserved) dropReserved(mine)
    return [null, key]
  })
}

// Append one application to the applied ledger and return its key.
//
// Fields: source, company, role, link, channel, applied_date, status, role_file, notes, job_id.
// Recording an opening that is already there writes nothing and returns the existing key.
// An open reservation for the opening is promoted: its age_minutes goes into the new row and the reservation is deleted.
export function record(fields: Fields): string {
  return recordRow(fields)[1]
}

// Add `unreserved <date>: <reason>` to the prospects row. prospects.csv belongs to ingest, so this takes ingest's lock
// and writes the way ingest does. A missing file or row changes nothing and returns false.
function noteUnreserved(id: string, reason: string): boolean {
  mkdirSync(C.LEDGER, { recursive: true })
  return withLock(join(C.LEDGER, '.ingest.lock'), () => {
    if (!existsSync(C.PROSPECTS)) return false
    const { cols, rows } = readDicts(decodeStrict(readFileSync(C.PROSPECTS)))
    const r = rows.find((x) => x['id'] === id)
    if (!r) return false
    const cur = pyStrip(r['notes'] || '')
    const text = `unreserved ${strftime('%Y-%m-%d')}: ${reason}`
    r['notes'] = cur ? `${cur} | ${text}` : text
    writeAtomic(C.PROSPECTS, writeDicts(cols, rows, { extras: 'raise' }), C.PROSPECTS + '.ingest-tmp')
    return true
  })
}

const appliedLine = (hit: Hit): string => hit.via === 'blocked'
  ? `BLOCKED company: on search.blocked_companies\n  ${pyStr(hit['company'])} / ${pyStr(hit['role'])}\n`
  : `ALREADY APPLIED  via ${hit.via}  on ${pyStr(hit['applied_date'])} through ${pyStr(hit['channel'])}\n` +
  `  ${pyStr(hit['company'])} / ${pyStr(hit['role'])}\n  ${pyStr(hit['link'])}\n`

const reservedLine = (r: CsvRow): string =>
  `RESERVED  ${pyStr(r['id'])} since ${pyStr(r['ts'])} in ${pyStr(r['session'])}. Check the employer site before any send.\n`

// ------------------------------------------------------------------------ CLI

const MAIN_USAGE = 'usage: engine.ts dedupe [-h] {check,record,distinct,reserve,unreserve} ...\n'
const RESERVE_USAGE = 'usage: engine.ts dedupe reserve [-h] --id ID --company COMPANY --role ROLE\n' +
                      '                                --link LINK [--channel CHANNEL] [--source SOURCE]\n'
const UNRESERVE_USAGE = 'usage: engine.ts dedupe unreserve [-h] --id ID --reason REASON\n'
const DISTINCT_USAGE = 'usage: engine.ts dedupe distinct [-h] --reason REASON job_id_a job_id_b\n'
const CHECK_USAGE = 'usage: engine.ts dedupe check [-h] [--source SOURCE] [--job-id JOB_ID]\n' +
                    '                              company role link\n'
const RECORD_USAGE = 'usage: engine.ts dedupe record [-h] [--source SOURCE] --company COMPANY\n' +
                     '                               --role ROLE --link LINK --channel CHANNEL\n' +
                     '                               [--job-id JOB_ID] [--applied-date APPLIED_DATE]\n' +
                     '                               [--status STATUS] [--role-file ROLE_FILE]\n' +
                     '                               [--notes NOTES]\n'

const MAIN_HELP = MAIN_USAGE + `
One place that answers: have we already applied to this?

Every source has its own idea of what a job is: a LinkedIn job id, a Work at a Startup job id,
an ATS requisition number. None of them agree, and the same role is routinely posted on two of
them at once. So the answer lives in the applied ledger (\`constants.APPLIED\`), and everything
asks this module rather than re-deriving the logic. \`stated\` 2026-09-08

Three identity keys, checked in this order. The first hit wins:

  1. canonical link          exact, after stripping query strings and tracking
  2. source:job_id           for example waas:91111, linkedin:4400000000
  3. company_norm|role_norm  catches the same role reached from two sources

Key 3 is deliberately fuzzy and deliberately last. It stops a LinkedIn Easy Apply and a Work at
a Startup founder message going out for the same opening a day apart.

Usage (through engine.ts)
    dedupe check "<company>" "<role>" "<link>"       exit 2 when already spent
    dedupe record --company C --role R --link L --channel CH [--source S] ...
    dedupe reserve --id ID --company C --role R --link L [--channel CH] [--source S]
    dedupe unreserve --id ID --reason R

A form about to be submitted is reserved first, in reserved.csv. \`check\` and \`reserve\` exit 2 on an open reservation
for the same opening, with a RESERVED line: the earlier run may have sent the form before it stopped, so look at the
employer site before any send. \`record\` turns the reservation into an applied row and deletes it. \`unreserve\` withdraws
it once the employer site shows nothing was sent. \`stated\` 2026-11-02

positional arguments:
  {check,record,distinct,reserve,unreserve}
    check         has this already been applied to, or reserved? exit 2 when it has
    record        write an application into the applied ledger
    distinct      record that two job ids are different openings, so key 3 skips the pair
    reserve       write a reservation just before the final submit click
    unreserve     withdraw a reservation and note the reason on the prospects row

options:
  -h, --help      show this help message and exit
`

const CHECK_HELP = CHECK_USAGE + `
positional arguments:
  company
  role
  link

options:
  -h, --help       show this help message and exit
  --source SOURCE
  --job-id JOB_ID
`

const RECORD_HELP = RECORD_USAGE + `
options:
  -h, --help            show this help message and exit
  --source SOURCE
  --company COMPANY
  --role ROLE
  --link LINK
  --channel CHANNEL
  --job-id JOB_ID
  --applied-date APPLIED_DATE
  --status STATUS
  --role-file ROLE_FILE
  --notes NOTES
`

const RESERVE_HELP = RESERVE_USAGE + `
Writes one row to reserved.csv just before the final submit click, with the age of the posting in minutes when
prospects.csv holds its posted_at. Exits 2 and writes nothing when the opening is already applied or already reserved.
--channel is accepted and not stored.

options:
  -h, --help         show this help message and exit
  --id ID            the prospects row id
  --company COMPANY
  --role ROLE
  --link LINK
  --channel CHANNEL
  --source SOURCE
`

const UNRESERVE_HELP = UNRESERVE_USAGE + `
Deletes the reservation of one prospects row and appends \`unreserved <date>: <reason>\` to that row's notes.
Use it only after the employer site shows the form was not sent.

options:
  -h, --help       show this help message and exit
  --id ID          the prospects row id
  --reason REASON
`

const DISTINCT_HELP = DISTINCT_USAGE + `
Records a pair the candidate confirmed is two openings, although key 3 reads them as one.
Writes distinct.csv in the ledger folder. Key 3 then skips that pair in check and in record.

positional arguments:
  job_id_a
  job_id_b

options:
  -h, --help       show this help message and exit
  --reason REASON
`

export class UsageError extends Error {}
export class Help extends Error {}

const NEGATIVE_NUMBER = /^-\d+$|^-\d*\.\d+$/u

// argparse's test for "this argument string is an option".
function looksLikeOption(a: string): boolean {
  return a.length > 1 && a.startsWith('-') && !NEGATIVE_NUMBER.test(a) && !a.includes(' ')
}

// Parse one subparser's arguments: long options that each take one value, plus positionals.
// Option names may be abbreviated to a unique prefix, as in argparse.
export function parseSub(argv: string[], opts: string[]): { values: Map<string, string>; positional: string[] } {
  const longs = ['--help', ...opts]
  const values = new Map<string, string>()
  const positional: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '-h') throw new Help()
    if (!looksLikeOption(a)) { positional.push(a); continue }
    const eq = a.indexOf('=')
    const name = eq >= 0 ? a.slice(0, eq) : a
    let matches = longs.filter((o) => o === name)
    if (!matches.length && name.startsWith('--')) matches = longs.filter((o) => o.startsWith(name))
    if (matches.length > 1) throw new UsageError(`ambiguous option: ${name} could match ${matches.join(', ')}`)
    if (!matches.length) throw new UsageError(`unrecognized arguments: ${a}`)
    const opt = matches[0]
    if (opt === '--help') throw new Help()
    if (eq >= 0) values.set(opt, a.slice(eq + 1))
    else if (i + 1 < argv.length && !looksLikeOption(argv[i + 1])) values.set(opt, argv[++i])
    else throw new UsageError(`argument ${opt}: expected one argument`)
  }
  return { values, positional }
}

export function main(argv: string[], out: Out = (s) => { process.stdout.write(s) }): number {
  const prog = 'engine.ts dedupe'
  const err = (usage: string, name: string, msg: string): number => {
    process.stderr.write(`${usage}${name}: error: ${msg}\n`)
    return 2
  }
  const cmd = argv[0]
  if (cmd === undefined) return err(MAIN_USAGE, prog, 'the following arguments are required: cmd')
  if (cmd === '-h' || cmd === '--help' || (cmd.length > 2 && cmd.startsWith('--') && '--help'.startsWith(cmd))) {
    out(MAIN_HELP)
    return 0
  }
  if (!['check', 'record', 'distinct', 'reserve', 'unreserve'].includes(cmd)) {
    return looksLikeOption(cmd)
      ? err(MAIN_USAGE, prog, `unrecognized arguments: ${argv.join(' ')}`)
      : err(MAIN_USAGE, prog, `argument cmd: invalid choice: '${cmd}' (choose from check, record, distinct, reserve, unreserve)`)
  }
  const rest = argv.slice(1)

  if (cmd === 'distinct') {
    let p: ReturnType<typeof parseSub>
    try { p = parseSub(rest, ['--reason']) } catch (e) {
      if (e instanceof Help) { out(DISTINCT_HELP); return 0 }
      if (e instanceof UsageError) return err(DISTINCT_USAGE, `${prog} distinct`, e.message)
      throw e
    }
    if (p.positional.length < 2) {
      return err(DISTINCT_USAGE, `${prog} distinct`, `the following arguments are required: ${['job_id_a', 'job_id_b'].slice(p.positional.length).join(', ')}`)
    }
    if (p.positional.length > 2) return err(DISTINCT_USAGE, `${prog} distinct`, `unrecognized arguments: ${p.positional.slice(2).join(' ')}`)
    const reason = p.values.get('--reason')
    if (!reason) return err(DISTINCT_USAGE, `${prog} distinct`, 'the following arguments are required: --reason')
    const [a, b] = p.positional
    locked(C.DISTINCT, () => {
      if (!isDistinct(a, b)) append(C.DISTINCT, C.DISTINCT_COLS, { job_id_a: a, job_id_b: b, date: strftime('%Y-%m-%d'), reason })
    })
    out(`distinct ${a} ${b}\n`)
    return 0
  }

  if (cmd === 'reserve') {
    let p: ReturnType<typeof parseSub>
    try { p = parseSub(rest, ['--id', '--company', '--role', '--link', '--channel', '--source']) } catch (e) {
      if (e instanceof Help) { out(RESERVE_HELP); return 0 }
      if (e instanceof UsageError) return err(RESERVE_USAGE, `${prog} reserve`, e.message)
      throw e
    }
    const order = ['--id', '--company', '--role', '--link'].filter((o) => !p.values.has(o))
    if (order.length) return err(RESERVE_USAGE, `${prog} reserve`, `the following arguments are required: ${order.join(', ')}`)
    if (p.positional.length) return err(RESERVE_USAGE, `${prog} reserve`, `unrecognized arguments: ${p.positional.join(' ')}`)
    const v = (o: string): string => p.values.get(o) ?? ''
    const [kind, x] = reserveRow({ id: v('--id'), company: v('--company'), role: v('--role'), link: v('--link'), source: v('--source') })
    if (kind === 'applied') { out(appliedLine(x)); return 2 }
    if (kind === 'reserved') { out(reservedLine(x)); return 2 }
    out(`reserved ${x}\n`)
    return 0
  }

  if (cmd === 'unreserve') {
    let p: ReturnType<typeof parseSub>
    try { p = parseSub(rest, ['--id', '--reason']) } catch (e) {
      if (e instanceof Help) { out(UNRESERVE_HELP); return 0 }
      if (e instanceof UsageError) return err(UNRESERVE_USAGE, `${prog} unreserve`, e.message)
      throw e
    }
    const order = ['--id', '--reason'].filter((o) => !p.values.has(o))
    if (order.length) return err(UNRESERVE_USAGE, `${prog} unreserve`, `the following arguments are required: ${order.join(', ')}`)
    if (p.positional.length) return err(UNRESERVE_USAGE, `${prog} unreserve`, `unrecognized arguments: ${p.positional.join(' ')}`)
    const id = p.values.get('--id')!
    if (!unreserveId(id)) {
      out(`no open reservation for ${id}, nothing changed\n`)
      return 0
    }
    out(`unreserved ${id}${noteUnreserved(id, p.values.get('--reason')!) ? '' : ' (no prospects row to note)'}\n`)
    return 0
  }

  if (cmd === 'check') {
    let p: ReturnType<typeof parseSub>
    try { p = parseSub(rest, ['--source', '--job-id']) } catch (e) {
      if (e instanceof Help) { out(CHECK_HELP); return 0 }
      if (e instanceof UsageError) return err(CHECK_USAGE, `${prog} check`, e.message)
      throw e
    }
    const names = ['company', 'role', 'link']
    if (p.positional.length < 3) {
      return err(CHECK_USAGE, `${prog} check`, `the following arguments are required: ${names.slice(p.positional.length).join(', ')}`)
    }
    if (p.positional.length > 3) return err(CHECK_USAGE, `${prog} check`, `unrecognized arguments: ${p.positional.slice(3).join(' ')}`)
    const [company, role, link] = p.positional
    const hit = check(company, role, link, p.values.get('--source') ?? null, p.values.get('--job-id') ?? null)
    if (hit) {
      out(appliedLine(hit))
      return 2
    }
    const held = reservedHit(company, role, link, p.values.get('--source') ?? null, p.values.get('--job-id') ?? null)
    if (held) {
      out(reservedLine(held))
      return 2
    }
    out('not applied - clear to proceed\n')
    out(`  company_norm=${pyStr([normaliseCompany(company)]).slice(1, -1)}  role_norm=${pyStr([normaliseRole(role)]).slice(1, -1)}\n`)
    return 0
  }

  // record
  let p: ReturnType<typeof parseSub>
  try {
    p = parseSub(rest, ['--source', '--company', '--role', '--link', '--channel', '--job-id',
                        '--applied-date', '--status', '--role-file', '--notes'])
  } catch (e) {
    if (e instanceof Help) { out(RECORD_HELP); return 0 }
    if (e instanceof UsageError) return err(RECORD_USAGE, `${prog} record`, e.message)
    throw e
  }
  const missing = ['--role', '--company', '--link', '--channel'].filter((o) => !p.values.has(o))
  const order = ['--company', '--role', '--link', '--channel'].filter((o) => missing.includes(o))
  if (order.length) return err(RECORD_USAGE, `${prog} record`, `the following arguments are required: ${order.join(', ')}`)
  if (p.positional.length) return err(RECORD_USAGE, `${prog} record`, `unrecognized arguments: ${p.positional.join(' ')}`)
  const v = (o: string, d = ''): string => p.values.get(o) ?? d
  const [hit, key] = recordRow({
    source: v('--source'), company: v('--company'), role: v('--role'), link: v('--link'), channel: v('--channel'),
    job_id: v('--job-id'), applied_date: v('--applied-date'), status: v('--status', 'applied'),
    role_file: v('--role-file'), notes: v('--notes'),
  })
  if (hit) {
    out(`NOT RECORDED - already present via ${hit.via} (${pyStr(hit['applied_date'])})\n`)
    return 2
  }
  out(`recorded ${key}\n`)
  return 0
}
