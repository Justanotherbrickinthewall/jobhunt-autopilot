// The one entry point. Every hook, agent and document runs `node process/engine.ts <subcommand>`.
//
//     node process/engine.ts [--session S] [--ledger L] <subcommand> [args]
//
// Each subcommand routes to `main(argv, out)` in one module under process/tools/ (or to constants.ts for
// `config`). A module is imported only when its subcommand is called.
//
// Two global flags come before the subcommand. engine.ts strips them, then sets the environment
// before it imports constants or any tool, so every tool sees the same session and ledger.
//
//     --session S   S is a session folder (relative to the repo root, or absolute) that holds notes.md.
//                   Sets JOBHUNT_SESSION to S. Unless --ledger is also given, it sets
//                   JOBHUNT_SESSIONS_ROOT to S's parent, so the ledger is <parent>/ledger.
//     --ledger L    L is a ledger folder whose last component is `ledger`. Sets JOBHUNT_SESSIONS_ROOT
//                   to L's parent. `ledger init` may create L; any other subcommand needs it to exist.
//
// If both are given, S's parent must be L's parent. A bad value exits 2 with a message.
import { realpathSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Exit, stdout, type Out } from './tools/io.ts'
import { pyStr } from './lib/py.ts'

const PROCESS = dirname(realpathSync(fileURLToPath(import.meta.url)))
const REPO = dirname(PROCESS)

interface Route { module: string; prefix: string[] }

// subcommand -> module path and the argv prefix put before the caller's arguments.
// Each module exports main(argv, out) => number.
const ROUTES: Record<string, Route> = {
  profile: { module: './tools/profiles.ts', prefix: [] },
  config: { module: './constants.ts', prefix: [] },
  pay: { module: './tools/pay.ts', prefix: [] },
  boards: { module: './tools/boards.ts', prefix: [] },
  queue: { module: './tools/queue.ts', prefix: [] },
  dedupe: { module: './tools/dedupe.ts', prefix: [] },
  prelim: { module: './tools/prelim.ts', prefix: [] },
  validate: { module: './tools/validate.ts', prefix: [] },
  session: { module: './tools/session.ts', prefix: [] },
  finding: { module: './tools/session.ts', prefix: ['finding'] },
  ledger: { module: './tools/ingest.ts', prefix: ['ledger'] },
  preflight: { module: './tools/status.ts', prefix: ['preflight'] },
  status: { module: './tools/status.ts', prefix: ['report'] },
  yield: { module: './tools/status.ts', prefix: ['yield'] },
  ingest: { module: './tools/ingest.ts', prefix: [] },
  findings: { module: './tools/findings.ts', prefix: [] },
  retro: { module: './tools/findings.ts', prefix: ['pending'] },
  application: { module: './tools/applications.ts', prefix: [] },
  outreach: { module: './tools/outreach.ts', prefix: [] },
  suggestion: { module: './tools/suggestions.ts', prefix: ['suggestion'] },
  mail: { module: './tools/mail.ts', prefix: [] },
}

// Every subcommand engine.ts lists, with its one-line help, in engine.ts's order.
const HELP_LINES: [string, string][] = [
  ['profile', 'print the profile folder (my-profile), or profile digest for the sections the matcher reads'],
  ['config', 'print the resolved inputs and paths'],
  ['pay', 'pay below abroad|india|hourly <top> prints below or not below against the floor or the expected figure; pay ask prints the founder ask; pay value <key> prints one figure a form asks for'],
  ['boards', 'boards sweep [--dry-run] fetches the four remote board feeds, filters them and writes one sweep file for the remote_boards lane; --dry-run prints the rows and writes nothing'],
  ['ledger', 'ledger init or migrate: create the ledger, or add the columns and files a newer engine expects'],
  ['preflight', 'check profile, browser, queue and open session before a run'],
  ['status', 'read-only report: counts, queue, follow-ups, source yield'],
  ['yield', 'reply rate by match band, lane, outreach channel and application age'],
  ['session', 'open, new, resume, tick, seed, find, board, log, note, send, sweep, phase, ea-window, close-abandoned and retro-done'],
  ['finding', 'finding add or finding set, under the session lock'],
  ['queue', 'rows waiting for extract, triage or apply, in order'],
  ['ingest', 'stage files into prospects.csv (sweep|extract|triage|apply|all), hold, release, skip, reopen, unblock, sent, age, response'],
  ['dedupe', 'dedupe check, reserve, unreserve, record or distinct, against the applied ledger'],
  ['prelim', 'score one card as JSON'],
  ['findings', 'findings fold, list, pending, question-tick, proposal-set, age and ours-old'],
  ['retro', 'sessions with retro work waiting'],
  ['application', 'application file <id>, list and backfill: one folder per application sent'],
  ['outreach', 'the contacted ledger and the /outreach run: check, record, drafted, inputs, prospect-inputs, queries, budget, tags, open, stop, cooldown, recent-sent, replied, unsent, list, approve, log, tag, jobs, close, lanes, roles'],
  ['suggestion', 'suggestion add, set, list or inputs: the memory of /retro suggestions'],
  ['mail', 'the candidate\'s Gmail through Google\'s API: login, status, search, thread, attachment, and send for one approved email item'],
  ['validate', 'run every check, or --prospects alone; exit 1 on error'],
]

// Tools whose main() has no argparse of its own, so --help is answered here.
const OWN_HELP: Record<string, string> = {
  prelim: "usage: engine.ts prelim '<json row with role, company, location>'\n",
}

function usage(write: (s: string) => void): void {
  write('usage: engine.ts [--session S] [--ledger L] <subcommand> [args]\n\n')
  write('global flags (before the subcommand):\n')
  write('  --session S  session folder holding notes.md, relative to the repo root or absolute\n')
  write('  --ledger L   ledger folder, whose last component is "ledger"; `ledger init` may create it\n\n')
  write('subcommands:\n')
  for (const [name, text] of HELP_LINES) write(`  ${name.padEnd(12)} ${text}\n`)
  write('\nRun `engine.ts <subcommand> --help` for the arguments of one subcommand.\n')
}

const toStdout: (s: string) => void = (s) => { process.stdout.write(s) }
const toStderr: (s: string) => void = (s) => { process.stderr.write(s) }

function fail(msg: string): number {
  process.stderr.write(`engine.ts: ${msg}\n`)
  return 2
}

// Path.resolve(): absolute, normalised, symlinks followed as far as the path exists.
function pyResolve(p: string): string {
  const abs = resolve(p)
  try { return realpathSync(abs) } catch {
    const parent = dirname(abs)
    return parent === abs ? abs : join(pyResolve(parent), basename(abs))
  }
}

function abs(value: string): string {
  const expanded = value === '~' ? homedir() : value.startsWith('~/') ? homedir() + value.slice(1) : value
  return pyResolve(isAbsolute(expanded) ? expanded : join(REPO, expanded))
}

function isFile(p: string): boolean {
  try { return statSync(p).isFile() } catch { return false }
}
function isDir(p: string): boolean {
  try { return statSync(p).isDirectory() } catch { return false }
}

// Strip --session and --ledger from the front of argv. Returns [rest, session, ledger], each a raw
// string or null. Throws Error with a message when a flag has no value.
function globalFlags(argv: string[]): [string[], string | null, string | null] {
  let session: string | null = null
  let ledger: string | null = null
  while (argv.length && (argv[0] === '--session' || argv[0] === '--ledger' ||
         argv[0].startsWith('--session=') || argv[0].startsWith('--ledger='))) {
    let flag = argv[0]
    let value: string
    if (flag.includes('=')) {
      const i = flag.indexOf('=')
      value = flag.slice(i + 1)
      flag = flag.slice(0, i)
      argv = argv.slice(1)
    } else if (argv.length > 1) {
      value = argv[1]
      argv = argv.slice(2)
    } else throw new Error(`${flag} needs a folder`)
    if (!value) throw new Error(`${flag} needs a folder`)
    if (flag === '--session') session = value
    else ledger = value
  }
  return [argv, session, ledger]
}

// Set JOBHUNT_SESSION and JOBHUNT_SESSIONS_ROOT from the flags. Returns an error message or null.
function applyFlags(argv: string[], session: string | null, ledger: string | null): string | null {
  const s = session ? abs(session) : null
  const l = ledger ? abs(ledger) : null
  if (s !== null && !isFile(join(s, 'notes.md'))) return `--session ${session}: no notes.md in ${s}`
  if (l !== null) {
    if (basename(l) !== 'ledger') return `--ledger ${ledger}: the last folder must be named "ledger"`
    if (s !== null && dirname(s) !== dirname(l)) return `--session and --ledger disagree: ${s} is not beside ${l}`
    const creating = argv[0] === 'ledger' && argv.slice(1).includes('init')
    if (!isDir(l) && !creating) {
      return `--ledger ${ledger}: ${l} does not exist (run "engine.ts --ledger ${ledger} ledger init")`
    }
  }
  if (s !== null) process.env['JOBHUNT_SESSION'] = s
  const root = l !== null ? dirname(l) : s !== null ? dirname(s) : null
  if (root !== null) process.env['JOBHUNT_SESSIONS_ROOT'] = root
  return null
}

async function run(argvIn: string[]): Promise<number> {
  let argv = [...argvIn]
  let session: string | null
  let ledger: string | null
  try {
    [argv, session, ledger] = globalFlags(argv)
  } catch (e) {
    return fail((e as Error).message)
  }
  const isHelp = (a: string): boolean => a === '-h' || a === '--help' || a === 'help'
  if ((session || ledger) && argv.length && !isHelp(argv[0])) {
    const err = applyFlags(argv, session, ledger)
    if (err) return fail(err)
  }
  if (!argv.length || isHelp(argv[0])) {
    usage(argv.length ? toStdout : toStderr)
    return argv.length ? 0 : 2
  }
  const name = argv[0]
  const rest = argv.slice(1)
  if (!HELP_LINES.some(([n]) => n === name)) {
    process.stderr.write(`engine.ts: unknown subcommand ${pyStr([name]).slice(1, -1)}\n\n`)
    usage(toStderr)
    return 2
  }
  if (Object.hasOwn(OWN_HELP, name) && (rest[0] === '-h' || rest[0] === '--help') && rest.length >= 1) {
    process.stdout.write(OWN_HELP[name])
    return 0
  }
  const route = ROUTES[name]
  const mod = await import(route.module) as { main: (argv: string[], out?: Out) => number | void | Promise<number | void> }
  const rc = await mod.main([...route.prefix, ...rest], stdout)
  return typeof rc === 'number' ? rc : 0
}

try {
  process.exitCode = await run(process.argv.slice(2))
} catch (e) {
  if (e instanceof Exit) {
    if (typeof e.code === 'string') { process.stderr.write(e.code + '\n'); process.exitCode = 1 } else process.exitCode = e.code
  } else throw e
}
