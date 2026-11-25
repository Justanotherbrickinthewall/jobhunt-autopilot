// Answers one question: where is the candidate's profile?
// The engine is person-agnostic. The candidate's own material lives in `my-profile/`, and nothing outside that
// folder names a person. A new candidate copies `my-profile.example/` to `my-profile/`.
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PYFLOAT, pyStr } from '../lib/py.ts'
import { jsonLoads } from '../lib/pyjson.ts'
import { Exit, type Out } from './io.ts'

// process/tools/profiles.ts, so the repository root is two folders up from this file's folder.
export const REPO = join(realpathSync(fileURLToPath(import.meta.url)), '..', '..', '..')
const PROFILE_DIR = join(REPO, 'my-profile')
const PROFILE_NAME = 'my-profile'
const LOCAL_JSON = join(REPO, 'process', 'local.json')

export class ProfileError extends Error {}

const repr = (s: string): string => pyStr([s]).slice(1, -1)

// The one copy of these two checks for validate.ts and status.ts.
export const isFile = (p: string): boolean => { try { return statSync(p).isFile() } catch { return false } }
export const isDir = (p: string): boolean => { try { return statSync(p).isDirectory() } catch { return false } }

// A machine-specific value: process/local.json first, then env JOBHUNT_<KEY_UPPER>.
export function local(key: string, dflt: string | null = null): string | null {
  if (existsSync(LOCAL_JSON)) {
    try {
      const data: unknown = jsonLoads(readFileSync(LOCAL_JSON, 'utf8'))
      if (typeof data !== 'object' || data === null || Array.isArray(data) || PYFLOAT in data) throw new Error('not a dict')
      const val = (data as Record<string, unknown>)[key]
      if (val !== undefined && val !== null && pyStr(val).trim()) return pyStr(val).trim()
    } catch { /* ValueError, OSError, AttributeError */ }
  }
  const env = (process.env['JOBHUNT_' + key.toUpperCase()] ?? '').trim()
  return env || dflt
}

// The five files every profile folder holds, beside resume/. validate.ts checks the example folder against the same list.
export const PROFILE_FILES = ['profile.md', 'work-portfolio.md', 'faq.md', 'inputs.toml', 'reply-rules.md'] as const

// Throws ProfileError when my-profile/ does not exist, or lacks one of PROFILE_FILES.
function check(): void {
  if (!isDir(PROFILE_DIR)) {
    throw new ProfileError('my-profile/ does not exist. Copy my-profile.example/ to my-profile/ ' +
      'and run /setup before running anything.')
  }
  const absent = PROFILE_FILES.filter((f) => !isFile(join(PROFILE_DIR, f)))
  if (absent.length > 0) {
    throw new ProfileError(`my-profile/ is missing ${absent.join(', ')}. Copy ${absent.length === 1 ? 'it' : 'them'} from my-profile.example/ and run /profile.`)
  }
}

// Absolute path inside the profile, or null when my-profile/ is missing.
export function root(...parts: string[]): string | null {
  return isDir(PROFILE_DIR) ? join(PROFILE_DIR, ...parts) : null
}

// The same path relative to the repository root, for printing. Throws ProfileError.
export function rel(...parts: string[]): string {
  check()
  return join(PROFILE_NAME, ...parts)
}

// root(), but a missing profile exits 2 with one plain line.
export function rootOrExit(...parts: string[]): string {
  try { check() } catch (e) {
    if (e instanceof ProfileError) {
      process.stderr.write(`profile: ${e.message}\n`)
      throw new Exit(2)
    }
    throw e
  }
  return join(PROFILE_DIR, ...parts)
}

// The ProfileError message for a missing profile, for callers that print it themselves.
export function missing(): string | null {
  try { check(); return null } catch (e) {
    if (e instanceof ProfileError) return e.message
    throw e
  }
}

// What the matcher reads in place of the two profile files. A heading is kept when it starts with one of these, so
// Private pay and Pay and notice are out by default. The digest is an allow-list, never a deny-list.
const PROFILE_KEEP = ['Targets', 'Career and education', 'Positioning', 'Gaps', 'Engagement structure', 'Reachability', 'Resume variants']
const PORTFOLIO_KEEP = ['Themes to lead with', 'Caveats', 'Proof points', 'Evidence']

// The `## ` sections of a markdown file whose heading starts with one of `keep`, each as its heading and body.
function keptSections(text: string, keep: readonly string[]): string[] {
  const blocks: string[][] = []
  let cur: string[] | null = null
  for (const ln of text.split('\n')) {
    if (ln.startsWith('## ')) {                                        // no fence tracking: an unbalanced fence must not swallow the ## Private pay heading
      const head = ln.slice(3).trim().toLowerCase()
      cur = keep.some((k) => head.startsWith(k.toLowerCase())) ? [] : null
      if (cur) blocks.push(cur)
    }
    cur?.push(ln)
  }
  return blocks.map((b) => b.join('\n').trim())
}

// Print the allow-listed sections of profile.md and work-portfolio.md. Exits 2 without a Caveats section in the
// portfolio, because standing rule 2 depends on it.
function digest(out: Out): number {
  const parts: string[] = []
  for (const [name, keep] of [['profile.md', PROFILE_KEEP], ['work-portfolio.md', PORTFOLIO_KEEP]] as const) {
    const blocks = keptSections(readFileSync(rootOrExit(name), 'utf8'), keep)
    if (name === 'work-portfolio.md' && !blocks.some((b) => b.startsWith('## Caveats'))) {
      process.stderr.write(`profile digest: ${name} has no Caveats section, and standing rule 2 depends on it\n`)
      return 2
    }
    parts.push(`# ${name}, digest\n\n${blocks.join('\n\n')}`)
  }
  out(parts.join('\n\n') + '\n')
  return 0
}

const USAGE = 'usage: engine.ts profile [-h] [--abs] [digest]\n'
const HELP = USAGE + `
Print the profile folder, my-profile. Exits 2 when it is missing.

digest prints the sections of profile.md and work-portfolio.md that the matcher reads, which leaves out Private pay and
Pay and notice. It exits 2 when the portfolio has no Caveats section.

options:
  -h, --help  show this help message and exit
  --abs       print the absolute path
`

const isPrefix = (arg: string, opt: string): boolean => arg.length > 2 && opt.startsWith(arg)

export function main(argv: string[], out: Out = (s) => { process.stdout.write(s) }): number {
  const fail = (msg: string): number => {
    process.stderr.write(USAGE + `engine.ts profile: error: ${msg}\n`)
    return 2
  }
  let abs = false
  const extra: string[] = []
  let rest = false
  for (const a of argv) {
    if (!rest && a === '--') { rest = true; continue }
    if (!rest && a.startsWith('-') && a !== '-') {
      if (a === '-h' || isPrefix(a, '--help')) { out(HELP); return 0 }
      if (isPrefix(a, '--abs')) { abs = true; continue }
      if (a.startsWith('--abs=') || a.startsWith('--help=')) {
        return fail(`argument ${a.startsWith('--abs=') ? '--abs' : '-h/--help'}: ignored explicit argument ${repr(a.slice(a.indexOf('=') + 1))}`)
      }
      extra.push(a)
      continue
    }
    extra.push(a)
  }
  const wantDigest = extra.length === 1 && extra[0] === 'digest' && !abs
  if (extra.length && !wantDigest) return fail(`unrecognized arguments: ${extra.join(' ')}`)
  try {
    if (wantDigest) return digest(out)
    out((abs ? rootOrExit() : rel()) + '\n')
    return 0
  } catch (e) {
    if (e instanceof ProfileError) {
      process.stderr.write(`profile: ${e.message}\n`)
      return 2
    }
    if (e instanceof Exit) return typeof e.code === 'number' ? e.code : 2
    throw e
  }
}
