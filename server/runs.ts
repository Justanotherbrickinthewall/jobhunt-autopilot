// GET /api/runs: every hunt and outreach run, read from each run's notes.md and board.csv, plus the run that is open now and the
// LinkedIn cooldown. It reads my-sessions/ and writes nothing. The counts are the ones the engine already keeps in the front-matter.
import { execFile } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import type { ServerResponse } from 'node:http'
import { basename, join } from 'node:path'
import { readDicts } from '../process/lib/csv.ts'
import { sessionStamp } from '../process/lib/sessionName.ts'
import { liveRuns } from '../process/constants.ts'
import { REPO } from '../process/tools/profiles.ts'
import { sendJson } from './util.ts'

const SESSIONS = join(REPO, 'my-sessions')
const LEDGER = join(SESSIONS, 'ledger')

export interface Run {
  name: string
  kind: 'hunt' | 'outreach'
  started: string        // ISO, IST
  updated: string
  phase: string
  goAhead: string
  lanes: string[]        // the lanes a hunt swept; an outreach run that worked two lanes is listed once per lane, with `roles` or `posts`; empty when neither
  found: number          // hunt: roles found. outreach: people drafted
  applied: number        // hunt: roles applied. outreach: messages sent
  held: number           // hunt: held and blocked rows
  replies: number
  ids: string[]          // hunt: the rows on its board
  last: string           // the last log line, without its timestamp
}
export interface OpenRun { name: string; kind: 'hunt' | 'outreach' | 'retro'; started: string; updated: string; applied: number; held: number; last: string }

const read = (path: string): string => { try { return readFileSync(path, 'utf8') } catch { return '' } }

function front(notes: string): Record<string, string> {
  const out: Record<string, string> = {}
  const body = /^---\n([\s\S]*?)\n---/u.exec(notes)?.[1] ?? ''
  for (const line of body.split('\n')) {
    const m = /^(\w+):\s*(.*)$/u.exec(line)
    if (!m) continue
    let v = m[2].trim()
    if (v.startsWith('"')) { try { v = String(JSON.parse(v)) } catch { /* keep the raw text */ } }
    out[m[1]] = v
  }
  return out
}

const list = (v: string | undefined): string[] => (v ?? '').replace(/^\[|\]$/gu, '').split(',').map((s) => s.trim()).filter(Boolean)
const int = (v: string | undefined): number => Number.parseInt(v ?? '', 10) || 0
const lastLog = (notes: string): string => {
  const at = notes.indexOf('\n## Log')
  const line = (at < 0 ? [] : notes.slice(at).split('\n')).filter((l) => l.startsWith('- ')).pop() ?? ''
  return line.replace(/^- \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} IST\s+/u, '')
}

// A source the older hunts logged as plain `linkedin` stands for the two LinkedIn lanes its board rows used.
function lanesOf(swept: string[], board: Record<string, string>[]): string[] {
  const out = new Set<string>()
  for (const s of swept) {
    if (s !== 'linkedin') { out.add(s); continue }
    const li = board.filter((r) => r['source'] === 'linkedin')
    if (li.some((r) => r['channel'] === 'easy_apply') || li.length === 0) out.add('linkedin-ea')
    if (li.some((r) => r['channel'] !== 'easy_apply') || li.length === 0) out.add('linkedin-ex')
  }
  return [...out]
}

function runs(): Run[] {
  const responded = new Set(readDicts(read(join(LEDGER, 'prospects.csv'))).rows.filter((r) => (r['response'] ?? '').trim() !== '').map((r) => r['id'] ?? ''))
  const contacted = readDicts(read(join(LEDGER, 'contacted.csv'))).rows
  const out: Run[] = []
  let names: string[] = []
  try { names = readdirSync(SESSIONS) } catch { /* no my-sessions/ yet: no runs */ }
  for (const name of names) {
    const kind = sessionStamp(name)?.kind
    if (kind !== 'hunt' && kind !== 'outreach') continue
    const notes = read(join(SESSIONS, name, 'notes.md'))
    if (!notes) continue
    const f = front(notes)
    const base = { name, kind, started: f['started'] ?? '', updated: f['updated'] ?? '', phase: f['phase'] ?? '', goAhead: f['go_ahead'] ?? '', last: lastLog(notes) }
    if (kind === 'outreach') {
      // A run before 2 Nov only answered inbox threads, so its `replied` count is the messages it sent.
      const sent = /prospect send: (\d+) sent/u.exec(notes)?.[1]
      const forRoles = int(/prospect send: \d+ sent \((\d+) for roles\)/u.exec(notes)?.[1])
      const named = /  lanes: ([a-z ]+)$/mu.exec(notes)?.[1]?.trim().split(/\s+/u) ?? []
      const worked = named.length ? named : [...(/  roles: \d/u.test(notes) ? ['roles'] : []), ...(/posts: /u.test(notes) ? ['posts'] : [])]
      if (worked.length === 0) {
        out.push({ ...base, kind, lanes: [], found: 0, applied: sent === undefined ? int(f['replied']) : int(sent),
          held: int(f['held']), replies: contacted.filter((r) => r['session'] === name && (r['replied_date'] ?? '') !== '').length, ids: [] })
      }
      for (const lane of worked) {
        const mine = contacted.filter((r) => r['session'] === name && Boolean(r['role_id']) === (lane === 'roles'))
        out.push({ ...base, kind, lanes: [lane], found: int(new RegExp(`${lane}: .*?(\\d+) drafted`, 'u').exec(notes)?.[1]),
          applied: lane === 'roles' ? forRoles : sent === undefined ? int(f['replied']) : int(sent) - forRoles,
          held: mine.filter((r) => (r['pending'] || r['status']) === 'drafted').length, replies: mine.filter((r) => (r['replied_date'] ?? '') !== '').length, ids: [] })
      }
      continue
    }
    const board = readDicts(read(join(SESSIONS, name, 'board.csv'))).rows as Record<string, string>[]
    const ids = board.filter((r) => !/^(?:backlog|seeded): /u.test(r['note'] ?? '')).map((r) => r['id']).filter(Boolean)
    // Until `session sweep` writes sources_swept, an open hunt takes its lanes from its board, backlog included, so its campaign shows Running. A seeded row is a single-row run and names no lane.
    const swept = list(f['sources_swept']).length || base.phase === 'closed' ? list(f['sources_swept']) : [...new Set(board.filter((r) => !/^seeded: /u.test(r['note'] ?? '')).map((r) => r['source'] ?? '').filter(Boolean))]
    out.push({ ...base, kind, lanes: lanesOf(swept, board), found: int(f['roles_harvested']), applied: int(f['applied']),
      held: int(f['held']) + int(f['blocked']), replies: ids.filter((id) => responded.has(id)).length, ids })
  }
  return out.sort((a, b) => Date.parse(b.started) - Date.parse(a.started))
}

// The open run, by the engine's own test: phase is not closed and notes.md changed within live_run_stale_hours.
const mtime = (dir: string): number => { try { return statSync(join(dir, 'notes.md')).mtimeMs } catch { return 0 } }

function open(): OpenRun | null {
  try {
    const dir = liveRuns(['hunt', 'outreach', 'retro']).sort((a, b) => mtime(a) - mtime(b)).at(-1)
    if (!dir) return null
    const notes = read(join(dir, 'notes.md'))
    const f = front(notes)
    const kind = sessionStamp(basename(dir))?.kind as OpenRun['kind']
    return { name: basename(dir), kind, started: f['started'] ?? '', updated: f['updated'] ?? '', applied: int(f['applied']), held: int(f['held']), last: lastLog(notes) }
  } catch { return null }
}

// `outreach cooldown` prints `clear`, or `until <iso>` with exit code 2 while the cooldown runs.
function cooldown(): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(process.execPath, ['process/engine.ts', '--ledger', 'my-sessions/ledger', 'outreach', 'cooldown'], { cwd: REPO, timeout: 30_000 }, (_e, stdout) => {
      resolve(/^until (\S+)/mu.exec(String(stdout))?.[1] ?? null)
    })
  })
}

export async function handleRuns(res: ServerResponse): Promise<void> {
  sendJson(res, 200, { runs: runs(), open: open(), cooldownUntil: await cooldown() })
}
