// The Outreach screen's rows, read from my-sessions/ledger/contacted.csv and the legacy outreach.csv. The screen reads these
// files and writes none: a reply is sent, skipped or resolved through the server's /api/outbox routes.
// Either file may be missing on a fresh install, and then there is nothing to show.
import { parseCsv } from '../../process/lib/csv.ts'
import { readText } from './files.ts'
import { maskEmail, maskPay } from './holds.ts'
import type { ConvEvent } from './heldApi.ts'
import { shortDate } from '../components/format.ts'

export type Wait = 'you' | 'them' | 'closed'
export interface Contact {
  key: string
  name: string
  company: string
  channel: string
  status: string       // one word for the row, such as "Draft waiting" or "Replied"
  date: string         // last_date, YYYY-MM-DD
  replied: boolean
  contacted: boolean   // a message or invitation went out
  wait: Wait
  notes: string[]      // the dated lines of the notes cell
  noteDates: string[]  // YYYY-MM-DD for each note, parallel to notes; '' when the note has no dated prefix
  ref: string          // the server's key for the row: thread id, vanity, post url or name|company. '' for a legacy row
  session: string      // the run folder named in the ledger row
  fromPost: boolean    // the row came from a hiring post
  fromRole: boolean    // the row came from the roles lane
}

// Who the next move belongs to. The source is CONTACT_STATUSES in process/contracts.md, section contacted.csv:
// a `drafted` row, or a `sent` or `accepted` row whose `pending` is `drafted`, waits for the candidate's approval, in /retro or on the dashboard.
// `sent` and `accepted` otherwise wait on the other person. `declined`, `skipped` and `withdrawn` are closed.
function waitOf(status: string, pending: string): Wait {
  if (status === 'drafted' || pending === 'drafted') return 'you'
  if (status === 'sent' || status === 'accepted') return 'them'
  return 'closed'
}

const WORD: Record<string, string> = {
  drafted: 'Draft waiting', sent: 'Sent', accepted: 'Accepted', withdrawn: 'Withdrawn', declined: 'Declined by you', skipped: 'Skipped',
}

// A notes fragment is `YYYY-MM-DD status: text`, and an older one repeats that prefix. The screen shows `2 Nov, sent: text`
// with no ids, links, resume names or email addresses.
const FRAG = /^(\d{4}-\d{2}-\d{2})\s+(\w+):\s*((?:\d{4}-\d{2}-\d{2}\s+\w+:\s*)*)/u
// The resume names are internal; the candidate shows one resume to the outside world.
// Folder names under my-profile/resume/, read at build time. (?!) matches nothing when the folder is absent.
// Lazy and ?url, because only the keys are used: no resume is loaded or bundled.
const VARIANTS = Object.keys(import.meta.glob('/my-profile/resume/*/*.md', { query: '?url', import: 'default' })).map((p) => p.split('/').at(-2))
const VARIANT = `(?:${VARIANTS.join('|') || '(?!)'})`
export function plainNote(raw: string): string {
  const m = FRAG.exec(raw)
  const body = (m ? raw.slice(m[0].length) : raw)
    .replace(/,?\s*Gmail message id \S+/giu, '')
    .replace(/\s+from F-\d+ of \S+/gu, '')
    .replace(new RegExp(`\\s*\\(${VARIANT}\\)`, 'giu'), '')
    .replace(new RegExp(`\\b${VARIANT} (?=resume)`, 'giu'), '')
    .replace(/\bhttps?:\/\/\S+/giu, 'a link')
    .replace(/\b(\d{4}-\d{2}-\d{2})\b/gu, (d) => shortDate(d))
  const text = maskEmail(body).replace(/\s+/gu, ' ').trim()
  return m ? `${shortDate(m[1])}, ${m[2] === 'drafted' ? 'draft' : m[2]}: ${text}` : text
}

function table(text: string | null): Record<string, string>[] {
  const [head = [], ...rows] = parseCsv(text ?? '')
  return rows.filter((r) => !(r.length === 1 && r[0] === '')).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])))
}

const norm = (s: string): string => s.toLowerCase().replace(/\s+/gu, ' ').trim()

export function loadContacts(): Contact[] {
  const out: Contact[] = table(readText('/my-sessions/ledger/contacted.csv')).filter((r) => r.name || r.vanity || r.thread_id || r.post_url).map((r, i) => {
    const wait = waitOf(r.status, r.pending)
    const replied = r.replied_date !== ''
    const sentOut = r.status === 'sent' || r.status === 'accepted' || r.status === 'withdrawn'
    const frags = r.notes ? r.notes.split(' | ').filter((n) => !/\bthread was \S+/u.test(n)).map((n) => ({ date: FRAG.exec(n.trim())?.[1] ?? '', note: plainNote(n.trim()) })).filter((f) => f.note) : []
    const status = r.pending === 'drafted' ? 'Follow-up drafted' : replied && wait === 'them' ? 'Replied' : r.status === 'sent' && r.channel === 'connect' ? 'Invitation pending' : WORD[r.status] ?? r.status
    return {
      key: `c${i}`, name: !r.name && !r.vanity ? 'Unnamed' : /^(?:ceo|founder|hr|recruiter)$/iu.test(r.name) ? `${r.name} (name not recorded)` : r.name || r.vanity, company: r.company, channel: r.channel, status,
      date: r.last_date, replied, contacted: sentOut, wait,
      notes: frags.map((f) => f.note), noteDates: frags.map((f) => f.date),
      ref: r.thread_id || r.vanity || r.post_url || `${r.name}|${r.company}`, session: r.session ?? '', fromPost: Boolean(r.post_url), fromRole: Boolean(r.role_id),
    }
  })
  // The legacy log from the retired hunt lane. A person already in contacted.csv is not counted twice.
  const seen = new Set(out.map((c) => `${norm(c.name)}|${norm(c.company)}`))
  table(readText('/my-sessions/ledger/outreach.csv')).forEach((r, i) => {
    const id = `${norm(r.person)}|${norm(r.company)}`
    if (!r.person || seen.has(id) || !r.sent) return
    const replied = r.reply !== ''
    out.push({
      key: `o${i}`, name: r.person, company: r.company, channel: r.channel, status: replied ? 'Replied' : 'Sent', date: r.date,
      replied, contacted: true, wait: 'them', notes: r.notes ? [plainNote(r.notes)] : [], noteDates: r.notes ? [''] : [], ref: '', session: '', fromPost: false, fromRole: false,
    })
  })
  return out
}

// The week's invitations against the weekly cap, or null when inputs.toml has no cap to read.
export function inviteWeek(contacts: readonly Contact[], today = new Date()): { used: number; cap: number } | null {
  const m = /^\s*invites_per_week\s*=\s*(\d+)/mu.exec(readText('/my-profile/inputs.toml') ?? '')
  if (!m) return null
  const from = new Date(today.getTime() - 6 * 86_400_000).toISOString().slice(0, 10)
  const used = contacts.filter((c) => c.channel === 'connect' && c.contacted && c.date >= from).length
  return { used, cap: Number(m[1]) }
}

// Contacts grouped by whose move it is, newest first. Outreach and Today both read this, so their counts agree.
export function groupByWait(contacts: readonly Contact[]): Record<Wait, Contact[]> {
  const out: Record<Wait, Contact[]> = { you: [], them: [], closed: [] }
  // A conversation the other side replied to is the candidate's move, so it sits under 'you'.
  for (const c of contacts) out[c.wait === 'them' && c.replied ? 'you' : c.wait].push(c)
  for (const k of Object.keys(out) as Wait[]) out[k].sort((a, b) => b.date.localeCompare(a.date))
  return out
}

// A notes line is `2 Nov, sent: text`. A line without that prefix is all text.
const NOTE = /^(\d{1,2} [A-Z][a-z]{2}), (\w+): ([\s\S]*)$/u
export function parse(note: string): { date: string; kind: string; text: string } {
  const m = NOTE.exec(note)
  return m ? { date: m[1], kind: m[2], text: m[3] } : { date: '', kind: '', text: note }
}

// A summary has a heading from its note kind, and a direction only where the kind tells it ('' otherwise).
export type TimelineEntry = Omit<ConvEvent, 'kind' | 'dir'> & { kind: ConvEvent['kind'] | 'summary'; dir: ConvEvent['dir'] | ''; head?: string }

const HEAD: Record<string, string> = { sent: 'Sent', accepted: 'Accepted', replied: 'Replied', declined: 'Declined by you', skipped: 'Skipped', withdrawn: 'Withdrawn' }

// The saved messages and the ledger's notes as one list, oldest first, undated last. A note stands for a message that was not saved,
// so a `sent` note is dropped when a saved outgoing message has its date. Pay lines in a note are hidden.
export function timeline(c: Contact, events: readonly ConvEvent[]): TimelineEntry[] {
  const out: TimelineEntry[] = [...events]
  c.notes.forEach((n, i) => {
    const m = parse(n)
    const at = c.noteDates[i] ?? ''
    if (m.kind === 'drafted' || m.kind === 'draft') return   // the draft that waits is shown on its own
    if (m.kind === 'sent' && at && events.some((e) => e.dir === 'out' && e.at.slice(0, 10) === at)) return
    const dir = m.kind === 'sent' ? 'out' : m.kind === 'accepted' || m.kind === 'replied' ? 'in' : ''
    out.push({ at, dir, head: HEAD[m.kind] ?? (m.kind ? m.kind[0].toUpperCase() + m.kind.slice(1) : 'Note'), channel: c.channel, kind: 'summary', text: maskPay(m.text), note: 'Summary. The message itself was not saved.' })
  })
  return out.map((e, i) => ({ e, i })).sort((a, b) => (a.e.at === '' ? 1 : 0) - (b.e.at === '' ? 1 : 0) || a.e.at.localeCompare(b.e.at) || a.i - b.i).map((x) => x.e)
}
