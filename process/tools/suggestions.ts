// The memory of /retro suggestions. A suggestion is one short idea for the profile or the hunting strategy, recorded with
// the outcome the candidate gave it, so a rejected idea does not come back and the count can fall over time.
// suggestions.csv lives in the ledger. Every write takes the ledger lock for that file.
//
//     node process/engine.ts suggestion add --kind profile|strategy|keyword --subject S --text T
//     node process/engine.ts suggestion set S-<n> accepted|rejected --outcome TEXT
//     node process/engine.ts suggestion list [--open]
//     node process/engine.ts suggestion inputs
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import * as C from '../constants.ts'
import { readDicts, writeDicts, type CsvRow } from '../lib/csv.ts'
import { cut, decodeStrict, pyPath, pyStrip, strftime } from '../lib/py.ts'
import { writeAtomic, type Out } from './io.ts'
import * as dedupe from './dedupe.ts'
import * as findings from './findings.ts'
import * as status from './status.ts'

const KINDS = ['profile', 'strategy', 'keyword'] as const
const USAGE = 'usage: engine.ts suggestion [-h] {add,set,list,inputs} ...\n'
const HELP = USAGE + `
The memory of /retro suggestions, in the ledger's suggestions.csv.

    add --kind ${KINDS.join('|')} --subject S --text T
                          record one open suggestion. The fingerprint is the subject in lower case with
                          punctuation dropped. Exits 2, printing the earlier outcome, when that fingerprint
                          was rejected, and prints the id of an open one instead of adding a second
    set S-<n> accepted|rejected --outcome TEXT
                          close one suggestion with what the candidate decided
    list [--open]         every suggestion, or only the open ones
    inputs                what a suggestions phase reads: the runs since the last retro started, reply rates,
                          the top keyword gaps, repeated findings, old ours tags, HELD: skips and past outcomes

options:
  -h, --help  show this help message and exit
`

const rows = (): CsvRow[] => {
  try { return readDicts(decodeStrict(readFileSync(C.SUGGESTIONS))).rows } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw e
  }
}
const get = (r: CsvRow, k: string): string => r[k] ?? ''
const oneLine = (s: string): string => pyStrip(s.replace(/\s+/gu, ' '))

function add(out: Out, v: Map<string, string>): number {
  const kind = v.get('--kind') ?? ''
  const subject = oneLine(v.get('--subject') ?? '')
  const text = oneLine(v.get('--text') ?? '')
  const fp = findings.norm(subject)
  if (!(KINDS as readonly string[]).includes(kind) || !fp || !text) {
    process.stderr.write(`${USAGE}engine.ts suggestion add: error: needs --kind ${KINDS.join('|')}, a --subject with a letter or digit in it, and --text\n`)
    return 2
  }
  return dedupe.locked(C.SUGGESTIONS, () => {
    const all = rows()
    const rejected = all.find((r) => get(r, 'fingerprint') === fp && get(r, 'state') === 'rejected')
    if (rejected) {
      process.stderr.write(`suggestion add: ${get(rejected, 'id')} was rejected on ${get(rejected, 'decided_date')}: ${get(rejected, 'outcome')}\n`)
      return 2
    }
    const open = all.find((r) => get(r, 'fingerprint') === fp && get(r, 'state') === 'open')
    if (open) { out(`${get(open, 'id')} is already open\n`); return 0 }
    const id = `S-${Math.max(0, ...all.map((r) => Number(/^S-(\d+)$/u.exec(get(r, 'id'))?.[1] ?? 0))) + 1}`
    dedupe.append(C.SUGGESTIONS, C.SUGGESTION_COLS, {
      id, fingerprint: fp, date: strftime('%Y-%m-%d'), kind, text, state: 'open', decided_date: '', outcome: '',
      session: basename(process.env['JOBHUNT_SESSION'] ?? ''),
    })
    out(`${id}\n`)
    return 0
  })
}

function set(out: Out, id: string, state: string, outcome: string): number {
  if (!(C.SUGGESTION_STATES as readonly string[]).includes(state) || state === 'open' || !oneLine(outcome)) {
    process.stderr.write(`${USAGE}engine.ts suggestion set: error: needs S-<n>, accepted or rejected, and --outcome\n`)
    return 2
  }
  return dedupe.locked(C.SUGGESTIONS, () => {
    const all = rows()
    const hit = all.find((r) => get(r, 'id') === id)
    if (!hit) { process.stderr.write(`suggestion set: no suggestion ${id}\n`); return 2 }
    Object.assign(hit, { state, decided_date: strftime('%Y-%m-%d'), outcome: oneLine(outcome) })
    writeAtomic(C.SUGGESTIONS, writeDicts(C.SUGGESTION_COLS, all), C.SUGGESTIONS + '.tmp')
    out(`${id} ${state}\n`)
    return 0
  })
}

function list(out: Out, openOnly: boolean): number {
  const shown = rows().filter((r) => !openOnly || get(r, 'state') === 'open')
  for (const r of shown) {
    out(`${get(r, 'id').padEnd(5)} ${get(r, 'state').padEnd(8)} ${get(r, 'date')}  ${get(r, 'kind').padEnd(8)} ${cut(get(r, 'text'), 100)}\n`)
    if (get(r, 'outcome')) out(`      ${get(r, 'decided_date')}: ${cut(get(r, 'outcome'), 100)}\n`)
  }
  out(`${shown.length} suggestion(s)\n`)
  return 0
}

// Points at folders and ledgers. It never copies their contents.
function inputs(out: Out): number {
  const since = findings.lastRetroStart()
  const from = since === null ? '' : strftime('%Y-%m-%d', since)
  out(`Runs since ${since === null ? 'the start (no retro has closed yet)' : `the last retro started on ${from}`}, under ${C.SESSIONS}\n`)
  const runs = [C.SESSION_SUFFIX, C.OUTREACH_SUFFIX, C.PROFILE_SUFFIX]
    .flatMap((kind) => C.sessionFolders(C.SESSIONS, kind, null, true))
    .filter((d) => since === null || C.sessionWhen(basename(pyPath(d)))![0] >= since)
    .sort((a, b) => C.sessionWhen(basename(pyPath(a)))![0].getTime() - C.sessionWhen(basename(pyPath(b)))![0].getTime())
  for (const d of runs) out(`  ${basename(pyPath(d))}\n`)
  if (!runs.length) out('  none\n')
  out('\n')
  status.yieldReport(out)
  out(`\n${findings.keywordLine()}\n`)
  const rep = findings.repeats()
  out(`Repeated findings: ${rep.length}${rep.length ? '. Run engine.ts retro for the lines' : ''}\n`)
  out(`Old ours tags: ${findings.oursOld().length} older than budgets.ours_review_days (engine.ts findings ours-old)\n`)
  out(`Skipped under a HELD: reason since then: ${findings.heldSkipped(since)}\n`)
  const all = rows()
  const decided = all.filter((r) => get(r, 'state') !== 'open')
  out(`\nSuggestions: ${all.length - decided.length} open, ${decided.length} decided. Do not propose a rejected idea again.\n`)
  for (const r of decided.slice(-15)) out(`  ${get(r, 'id')} ${get(r, 'state')} ${get(r, 'kind')}: ${cut(get(r, 'text'), 80)} (${cut(get(r, 'outcome'), 80)})\n`)
  return 0
}

export function main(argv: string[], out: Out = (s) => { process.stdout.write(s) }): number {
  const args = argv[0] === 'suggestion' ? argv.slice(1) : argv
  const cmd = args[0]
  if (cmd === undefined) { process.stderr.write(`${USAGE}engine.ts suggestion: error: the following arguments are required: cmd\n`); return 2 }
  if (cmd === '-h' || cmd === '--help') { out(HELP); return 0 }
  if (!['add', 'set', 'list', 'inputs'].includes(cmd)) {
    process.stderr.write(`${USAGE}engine.ts suggestion: error: argument cmd: invalid choice: '${cmd}' (choose from add, set, list, inputs)\n`)
    return 2
  }
  const open = cmd === 'list' && args.includes('--open')   // a flag, so parseSub, which wants a value, never sees it
  let p: ReturnType<typeof dedupe.parseSub>
  try { p = dedupe.parseSub(args.slice(1).filter((a) => !(open && a === '--open')), cmd === 'add' ? ['--kind', '--subject', '--text'] : cmd === 'set' ? ['--outcome'] : []) } catch (e) {
    if (e instanceof dedupe.Help) { out(HELP); return 0 }
    if (e instanceof dedupe.UsageError) { process.stderr.write(`${USAGE}engine.ts suggestion ${cmd}: error: ${e.message}\n`); return 2 }
    throw e
  }
  const pos = p.positional
  if (pos.length !== (cmd === 'set' ? 2 : 0)) {
    process.stderr.write(`${USAGE}engine.ts suggestion ${cmd}: error: ${pos.length ? `unrecognized arguments: ${pos.join(' ')}` : 'the following arguments are required: id, state'}\n`)
    return 2
  }
  return cmd === 'add' ? add(out, p.values) : cmd === 'set' ? set(out, pos[0], pos[1], p.values.get('--outcome') ?? '')
    : cmd === 'list' ? list(out, open) : inputs(out)
}
