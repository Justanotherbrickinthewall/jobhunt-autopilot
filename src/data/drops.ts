// The dashboard shows `skipped`, `wrong_job` and `dropped` as one Dropped status; the ledger and the engine keep all three.
import { stripPrivate } from './private.ts'

const DROPPED: ReadonlySet<string> = new Set(['skipped', 'wrong_job', 'dropped'])

export const isDropped = (status: string | null): boolean => status !== null && DROPPED.has(status)
export const shownStatus = (status: string): string => (DROPPED.has(status) ? 'dropped' : status)

export interface DropReason { type: string; text: string }

// Each regex also cuts the fragment's prefix, so what is left is the reason text. Fragments are listed in process/contracts.md.
const CAUSES: [RegExp, string][] = [
  [/^hard filter:\s*/u, 'Failed a hard filter'],
  [/^(?:posting closed(?: \(extract\))?|closed at apply)[:\s]*/u, 'Posting closed'],
  [/^triage skipped:\s*(?:HELD:\s*)?/u, 'Turned down by a rule'],
  [/^triage wrong_job:\s*/u, 'Outside your experience'],
  [/^candidate skip:\s*/u, 'Dropped by you'],
  [/^aged out(?:, never reached)?\s*/u, 'Never started, too old'],
  [/^declined \(Not interested\):\s*/u, 'Answered Not interested'],
]
// Other ways ingest closes a row. The fragment shows as written.
const OTHER = /^triage dropped:/u

// The last cause fragment is the current one, because a reopened row keeps its older notes.
export function dropReason(status: string, notes: string): DropReason | null {
  if (!DROPPED.has(status)) return null
  for (const f of notes.split(' | ').map((n) => n.trim()).reverse()) {
    const cause = CAUSES.find(([re]) => re.test(f))
    if (cause) return { type: cause[1], text: stripPrivate(f.replace(cause[0], '').trim()) }
    if (OTHER.test(f)) return { type: 'Dropped', text: stripPrivate(f) }
  }
  return null
}
