// Display helpers shared by the views. Nothing here reads data; it only formats what src/data returns.

import { MON } from '../util.ts'

export type Tone = 'gray' | 'slate' | 'blue' | 'cyan' | 'violet' | 'amber' | 'orange' | 'green' | 'teal' | 'red' | 'pink'

// One colour per ledger status, board lane and board column. A status and the lane it pairs with share a colour,
// so All and a session read the same way.
const TONES: Record<string, Tone> = {
  new: 'gray', swept: 'gray',
  extracted: 'blue', matching: 'blue', processing: 'blue',
  ready: 'cyan', matched: 'cyan',
  scored: 'violet', tailoring: 'violet', tailored: 'violet',
  queued: 'amber', applying: 'amber',
  held: 'orange', blocked: 'orange',
  applied: 'green', sent: 'green',
  dropped: 'red',
  // Evidence values in a role's missing keywords.
  no: 'red', partial: 'amber', yes: 'green',
}

export const toneOf = (key: string): Tone => TONES[key] ?? 'gray'

export const human = (key: string): string => key.replaceAll('_', ' ')

// Plain words for the ledger's vocabulary (process/contracts.md: SOURCES, CHANNELS, STATUSES, CONTACT_CHANNELS).
export const LABELS: Readonly<Record<string, string>> = {
  linkedin: 'LinkedIn', naukri: 'Naukri', hirist: 'Hirist', remote_boards: 'Remote boards', career_page: 'Company site', waas: 'Work at a Startup', gmail: 'Gmail',
  wellfound: 'Wellfound', simplify: 'Simplify', referral: 'Referral',
  easy_apply: 'Easy Apply', external_ats: 'Company form', direct: 'Direct', waas_message: 'Work at a Startup message',
  outreach: 'Outreach', unknown: 'Unknown',
  message: 'Message', inmail: 'InMail', connect: 'Connection request', email: 'Email',
  new: 'New', processing: 'Processing', held: 'Held', applied: 'Applied', dropped: 'Dropped', blocked: 'Blocked',
  no: 'No', partial: 'Partial', yes: 'Yes',
}
// The five match components, in plain words. The maximum is shown beside each bar, so the key's suffix is dropped.
export const SCORE_LABELS: Readonly<Record<string, string>> = {
  fd_30: 'Forward deployed fit', ai_25: 'AI work', reach_20: 'Customer reach', level_15: 'Seniority', stack_10: 'Stack',
}
// A word missing from the map falls back to human().
export const label = (key: string): string => LABELS[key] ?? human(key)

// The lane a role came in by, as a segment tag: one tone per live lane, neutral for any other source.
export function laneOf(source: string, channel: string): { text: string; tone: Tone } {
  if (source === 'linkedin') return channel === 'easy_apply' ? { text: 'Easy Apply', tone: 'blue' } : { text: 'LinkedIn external', tone: 'violet' }
  if (source === 'naukri') return { text: 'Naukri', tone: 'amber' }
  if (source === 'hirist') return { text: 'Hirist', tone: 'teal' }
  if (source === 'career_page') return { text: 'Company site', tone: 'green' }
  return { text: source ? label(source) : 'Unknown', tone: 'gray' }
}

// How long ago a YYYY-MM-DD date was, in a short form for a table cell: 'today', '4d', '3w', '5mo'.
export function age(iso: string, now = new Date()): string {
  const t = Date.parse(iso.slice(0, 10))
  if (!Number.isFinite(t)) return ''
  const days = Math.max(0, Math.floor((now.getTime() - t) / 86_400_000))
  return days === 0 ? 'today' : days < 14 ? `${days}d` : days < 60 ? `${Math.floor(days / 7)}w` : `${Math.floor(days / 30)}mo`
}

// The last-hunt sentence for Hunt's sub line and Today. sortKey is a session's `YYYY-MM-DD HH:MM`; the time is not shown.
export function lastHunt(sortKey: string, found: number, applied: number): string {
  const on = `The last hunt, on ${shortDate(sortKey.slice(0, 10))}`
  if (found === 0) return `${on}, found nothing new.`
  return `${on}, found ${found} ${found === 1 ? 'role' : 'roles'} and applied to ${applied}.`
}


function parts(iso: string): [string, string, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/u.exec(iso.trim())
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return null
  return [m[1], MON[Number(m[2]) - 1], Number(m[3])]
}

// '2026-10-12' -> '12 Oct'. Anything unparsable comes back as it was.
export function shortDate(iso: string): string {
  const p = parts(iso)
  return p ? `${p[2]} ${p[1]}` : iso
}

// '2026-10-12' -> '12 Oct 2026'.
export function longDate(iso: string): string {
  const p = parts(iso)
  return p ? `${p[2]} ${p[1]} ${p[0]}` : iso
}

export const pct = (n: number, of: number): string => (of > 0 ? `${Math.round((n / of) * 100)}%` : '–')
