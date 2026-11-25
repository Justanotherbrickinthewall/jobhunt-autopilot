// Print the rows a stage should work, in order, as a JSON list. Writes nothing.
// Order: override=yes with `reviewed` empty first, then Naukri invites, then `ready` rows (apply only), then `prelim` descending.
// `prelim` orders the queue and never drops a row. The default limit is `budgets.<stage>` in inputs.toml.
//
//     node process/engine.ts queue <extract|triage|apply> [--id ID] [--limit N] [--channel C]
import { existsSync, readFileSync } from 'node:fs'
import * as constants from '../constants.ts'
import { OVERRIDE_REENTRY, STAGE_STATUS, cfg, laneOf } from '../constants.ts'
import { readDicts, type CsvRow } from '../lib/csv.ts'
import { byKey, decodeStrict, pyInt, pyJson, pyStr, pyStrip } from '../lib/py.ts'
import type { Out } from './io.ts'

const USAGE = 'usage: engine.ts queue [-h] [--id IDS] [--limit LIMIT] [--channel CHANNEL]\n' +
              '                       {apply,extract,triage}\n'

const HELP = USAGE + `
Print the rows a stage should work, in order, as a JSON list. Writes nothing.

    node process/engine.ts queue <extract|triage|apply> [--id ID] [--limit N] [--channel C]

Order: override=yes with \`reviewed\` empty first, then Naukri invites, then \`ready\` rows (apply only),
then \`prelim\` descending. \`prelim\` orders the queue and never drops a row.

  extract  status=new, minus channel=outreach (a legacy channel no step works)
  triage   status=extracted
  apply    status=ready or scored, minus channel=outreach. When external rows are in the pool,
           Easy Apply takes at most \`budgets.easy_apply_share\` of the limit and leaves room for
           \`budgets.external_min\` external rows. A Naukri invite counts as neither

The default limit is \`budgets.<stage>\` in inputs.toml. \`--id\` may repeat.

positional arguments:
  {apply,extract,triage}

options:
  -h, --help            show this help message and exit
  --id IDS              work only this row id; may repeat
  --limit LIMIT         default is budgets.<stage> in inputs.toml
  --channel CHANNEL
`

export function budget(stage: string): number {
  return cfg().budgets[stage]
}

function prelimOf(r: CsvRow): number {
  try { return pyInt(r['prelim'] || '') } catch { return -1 }
}

export function isOverride(r: CsvRow): boolean {
  return pyStrip(r['override'] || '') === 'yes' && !pyStrip(r['reviewed'] || '')
}

// The role file for a row: LEDGER/roles/<id>.md. The file may not exist yet.
export function roleFile(rowId: string): string {
  return `${constants.ROLES}/${rowId}.md`
}

function readProspects(): CsvRow[] {
  if (!existsSync(constants.PROSPECTS)) return []
  return readDicts(decodeStrict(readFileSync(constants.PROSPECTS))).rows
}

function pickApply(pool: CsvRow[], limit: number): CsvRow[] {
  const c = cfg()
  const isEasy = (r: CsvRow): boolean => pyStrip(r['channel'] || '') === 'easy_apply'
  const isExternal = (r: CsvRow): boolean => !isEasy(r) && pyStrip(r['source'] || '') !== constants.INVITE_SOURCE   // an invite is neither lane
  if (!pool.some(isExternal)) return pool.slice(0, limit)
  const external = pool.filter(isExternal).length
  const easyCap = Math.min(Math.floor(limit * c.easy_apply_share), Math.max(limit - Math.min(c.external_min, external), 0))
  let easy = 0
  const picked: CsvRow[] = []
  for (const r of pool) {
    if (picked.length >= limit) break
    if (isEasy(r)) {
      if (easy >= easyCap) continue
      easy += 1
    }
    picked.push(r)
  }
  return picked
}

// The rows `stage` should work, in order, as full prospects.csv row dicts. `sources`, when given,
// keeps only rows whose source is in it, before the limit applies.
export function select(stage: string, limit: number | null = null, ids: string | readonly string[] | null = null,
                       channel: string | null = null, lanes: Iterable<string> | null = null): CsvRow[] {
  if (!Object.hasOwn(STAGE_STATUS, stage)) {
    throw new Error(`unknown stage ${pyStr([stage]).slice(1, -1)}; expected one of ${pyStr(Object.keys(STAGE_STATUS).sort())}`)
  }
  const idList = typeof ids === 'string' ? [ids] : ids
  const wantedIds = idList && idList.length ? new Set(idList) : null
  const lim = limit === null ? budget(stage) : limit
  const laneSet = lanes === null ? null : new Set(lanes)
  const pool: CsvRow[] = []
  for (const r of readProspects()) {
    const st = pyStrip(r['status'] || '')
    const ch = pyStrip(r['channel'] || '')
    if (!(STAGE_STATUS[stage].has(st) || (isOverride(r) && (OVERRIDE_REENTRY[stage]?.has(st) ?? false)))) continue
    if ((stage === 'extract' || stage === 'apply') && ch === 'outreach') continue
    if (wantedIds && !wantedIds.has(r['id'] as string)) continue
    if (channel && ch !== channel) continue
    if (laneSet !== null && !laneSet.has(laneOf(pyStrip(r['source'] || ''), ch))) continue
    pool.push(r)
  }
  pool.sort(byKey((r: CsvRow) => [!isOverride(r),
                                  pyStrip(r['source'] || '') !== constants.INVITE_SOURCE,   // the invite lane goes first
                                  !(stage === 'apply' && pyStrip(r['status'] || '') === 'ready'),
                                  -prelimOf(r), r['id'] as string]))
  return stage === 'apply' ? pickApply(pool, lim) : pool.slice(0, lim)
}

function rel(p: string): string {
  return p.startsWith(constants.REPO + '/') ? p.slice(constants.REPO.length + 1) : p
}

const STAGES = ['apply', 'extract', 'triage']
const NEGATIVE_NUMBER = /^-\d+$|^-\d*\.\d+$/u

// argparse's test for "this argument string is an option".
function looksLikeOption(a: string): boolean {
  return a.length > 1 && a.startsWith('-') && !NEGATIVE_NUMBER.test(a) && !a.includes(' ')
}

class UsageError extends Error {}

export function main(argv: string[], out: Out = (s) => { process.stdout.write(s) }): number {
  const longs = ['--help', '--id', '--limit', '--channel']
  const ids: string[] = []
  let limit: number | null = null
  let channel: string | null = null
  const positional: string[] = []
  try {
    for (let i = 0; i < argv.length; i++) {
      const a = argv[i]
      if (a === '-h') { out(HELP); return 0 }
      if (!looksLikeOption(a)) { positional.push(a); continue }
      const eq = a.indexOf('=')
      const name = eq >= 0 ? a.slice(0, eq) : a
      let matches = longs.filter((o) => o === name)
      if (!matches.length && name.startsWith('--')) matches = longs.filter((o) => o.startsWith(name))
      if (matches.length > 1) throw new UsageError(`ambiguous option: ${name} could match ${matches.join(', ')}`)
      if (!matches.length) throw new UsageError(`unrecognized arguments: ${a}`)
      const opt = matches[0]
      if (opt === '--help') { out(HELP); return 0 }
      let value: string
      if (eq >= 0) value = a.slice(eq + 1)
      else if (i + 1 < argv.length && !looksLikeOption(argv[i + 1])) value = argv[++i]
      else throw new UsageError(`argument ${opt}: expected one argument`)
      if (opt === '--id') ids.push(value)
      else if (opt === '--channel') channel = value
      else {
        try { limit = pyInt(value) } catch {
          throw new UsageError(`argument --limit: invalid int value: ${pyStr([value]).slice(1, -1)}`)
        }
      }
    }
    if (!positional.length) {
      throw new UsageError('the following arguments are required: stage\n' +
        'queue needs a stage: `engine.ts queue extract|triage|apply`. It prints rows, in order, ' +
        "with each row's role_file path; it creates no file and changes nothing")
    }
    if (!STAGES.includes(positional[0])) {
      throw new UsageError(`argument stage: invalid choice: '${positional[0]}' (choose from ${STAGES.join(', ')})`)
    }
    if (positional.length > 1) throw new UsageError(`unrecognized arguments: ${positional.slice(1).join(' ')}`)
  } catch (e) {
    if (!(e instanceof UsageError)) throw e
    process.stderr.write(`${USAGE}engine.ts queue: error: ${e.message}\n`)
    return 2
  }

  const rows: Record<string, unknown>[] = []
  for (const r of select(positional[0], limit, ids, channel)) {
    let prelim: number | null
    try { prelim = pyInt(r['prelim'] ?? '') } catch { prelim = null }
    const rf = roleFile(r['id'] as string)
    rows.push({ id: r['id'], company: r['company'], role: r['role'], link: r['link'],
                channel: r['channel'] ?? '', status: r['status'], prelim,
                role_file: rel(rf), role_file_exists: existsSync(rf),
                resume_variant: r['resume_variant'] ?? '' })
  }
  out(pyJson(rows, { indent: 1 }))
  out('\n')
  return 0
}
