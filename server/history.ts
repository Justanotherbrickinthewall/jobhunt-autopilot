// Only fixed labels leave this module, so no ledger note text reaches the drawer.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { readDicts } from '../process/lib/csv.ts'
import { sessionStamp } from '../process/lib/sessionName.ts'
import { REPO } from '../process/tools/profiles.ts'
import { INFO, classify } from '../src/data/holds.ts'
import type { HistoryEvent } from '../src/data/heldApi.ts'

const SESSIONS = join(REPO, 'my-sessions')
const DROPS: Record<string, string> = { skipped: 'Turned down by a rule', wrong_job: 'Outside your experience', dropped: '' }
const APPLIED = new Set(['applied', 'already_applied'])
const HELD_OUT = new Set(['held', 'blocked_info', 'stopped_before_submit'])

const pad = (n: number): string => String(n).padStart(2, '0')
const clock = (ms: number): string => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// A stage file holds no time, so its mtime dates it. The engine's tick settles them in the same order.
function done(session: string, stage: string, id: string): { at: string; d: Record<string, unknown> }[] {
  const dir = join(SESSIONS, session, '.stage', stage, 'done')
  let names: string[]
  try { names = readdirSync(dir).filter((n) => n === `${id}.json` || (/^\d{6}-/u.test(n) && n.slice(7) === `${id}.json`)) } catch { return [] }
  return names.flatMap((n) => {
    try { return [{ ms: statSync(join(dir, n)).mtimeMs, d: JSON.parse(readFileSync(join(dir, n), 'utf8')) as Record<string, unknown> }] } catch { return [] }
  }).sort((a, b) => a.ms - b.ms).map(({ ms, d }) => ({ at: clock(ms), d }))
}

export function rowHistory(id: string, led: Record<string, string> | null): HistoryEvent[] {
  const notes = (led?.['notes'] ?? '').split(' | ').map((f) => f.trim())
  const released = new Set(notes.flatMap((f) => /^released (\d{4}-\d{2}-\d{2})/u.exec(f)?.[1] ?? []))
  const out: HistoryEvent[] = []
  if (led?.['date_found']) out.push({ at: led['date_found'].slice(0, 10), label: 'identified', text: '' })
  let names: string[] = []
  try { names = readdirSync(SESSIONS).filter((n) => sessionStamp(n)?.kind === 'hunt') } catch { /* no sessions yet */ }
  const runDays = new Set<string>()
  for (const name of names) {
    const s = sessionStamp(name)!
    let seeded = false
    try { seeded = readDicts(readFileSync(join(SESSIONS, name, 'board.csv'), 'utf8')).rows.some((r) => r['id'] === id && (r['note'] ?? '').startsWith('seeded: ')) } catch { /* no board */ }
    // A /retro submit or a dashboard rerun seeds the row it releases, so its start is the unblock time.
    if (seeded && released.has(s.date)) { out.push({ at: `${s.date} ${s.time}`, label: 'unblocked', text: '' }); runDays.add(s.date) }
    for (const { at, d } of done(name, 'extract', id)) {
      if (d['closed'] === true) out.push({ at, label: 'dropped', text: 'Posting closed' })
      else if (d['hard_fail']) out.push({ at, label: 'dropped', text: 'Failed a hard filter' })
    }
    // The tailor writes a second triage file for the row, so only the matcher's first one counts.
    const t = done(name, 'triage', id)[0]
    const decision = String(t?.d['decision'] ?? '')
    if (t && decision === 'scored') out.push({ at: t.at, label: 'processed', text: '' })
    else if (t && Object.hasOwn(DROPS, decision)) out.push({ at: t.at, label: 'dropped', text: DROPS[decision] })
    for (const { at, d } of done(name, 'apply', id)) {
      const outcome = String(d['outcome'] ?? '')
      if (APPLIED.has(outcome)) out.push({ at, label: 'applied', text: '' })
      else if (outcome === 'declined') out.push({ at, label: 'dropped', text: 'Answered Not interested' })
      else if (HELD_OUT.has(outcome) && d['closed'] === true) out.push({ at, label: 'dropped', text: 'Posting closed' })
      else if (HELD_OUT.has(outcome)) {
        const raw = [...(Array.isArray(d['reasons']) ? d['reasons'] : []), ...(d['question'] ? [d['question']] : [])].map(String)
        out.push({ at, label: 'held', text: [...new Set(raw.map((r) => INFO[classify(r, false).kind].label))].join(', ') })
      }
    }
  }
  // A release with no run that day still happened, but only its date is recorded.
  for (const day of released) if (!runDays.has(day)) out.push({ at: day, label: 'unblocked', text: '' })
  if (!out.some((e) => e.label === 'applied')) {
    const hand = notes.map((f) => /^sent by hand (\d{4}-\d{2}-\d{2})/u.exec(f)?.[1]).findLast(Boolean)
    const day = hand ?? led?.['applied_date']?.slice(0, 10)
    if (day) out.push({ at: day, label: 'applied', text: hand ? 'Sent by you' : '' })
  }
  // shortcut: a date with no time sorts first in its day, except an unblock after that day's last Held and a late applied date, which sort last. Exact only for timed events.
  const lastHeld = (day: string): string | undefined => out.filter((e) => e.label === 'held' && e.at.startsWith(`${day} `)).map((e) => e.at).sort().at(-1)
  const key = (e: HistoryEvent): string => (e.at.length > 10 ? e.at
    : e.label === 'unblocked' && lastHeld(e.at) ? `${lastHeld(e.at)}~` : `${e.at}${e.label === 'applied' ? '~' : ' '}`)
  return out.sort((a, b) => key(a).localeCompare(key(b)))
}
