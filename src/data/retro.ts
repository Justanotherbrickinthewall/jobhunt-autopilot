// The Retro tab's question list, derived from the cards the board already built. Pure: no fetch and no store.
// The one other read is the bundled ledger, for the Replied step of the funnel.
// Unresolved holds come from the rows held now. Resolved ones come from the earlier `held:` fragments of rows that are
// no longer held, plus open holds whose every row has a run queued or running.
import { parseCsv } from '../../process/lib/csv.ts'
import { readText } from './files.ts'
import { HELD, INFO, classify, holdReasons, hostIn, maskEmail, type Hold, type HoldKind } from './holds.ts'
import type { Job } from './heldApi.ts'
import type { Card } from './types.ts'

export type RetroRow = { card: Card; hold: Hold; more: string[]; at: string } // at: the YYYY-MM-DD the hold was settled, '' when open or undated
export type RetroItem = { key: string; kind: HoldKind; title: string; ask: string; rows: RetroRow[] } // ask: the agent's text for a question, '' for any other kind

export const isActive = (j: Job | undefined): j is Job & { state: 'queued' | 'running' } => j?.state === 'queued' || j?.state === 'running'

// The holds whose page the candidate must open before a rerun settles them: goAhead in server/held.ts reads store.opened for these.
const WALLS: ReadonlySet<HoldKind> = new Set(['account', 'signin', 'domain', 'checkpoint'])
const OQ = /\bOQ-\d+\b/u
const SETTLED_ON = /^(?:released|sent by hand) (\d{4}-\d{2}-\d{2})/u

const asked = (h: Hold): string => h.text.replace(/^question:\s*/iu, '').trim()
const norm = (s: string): string => s.toLowerCase().replace(/\s+/gu, ' ').replace(/[\s.?!:;,]+$/u, '')

// A question's key comes from the row's anchor question, so the fragments of one panel share a card: the first clear
// question, else the first question. Every held row's link is a LinkedIn page, so a wall that names no host keeps a card of its own.
const CLEAR = /^(?:what|how|do|does|did|are|is|can|could|will|would|have|has|which|why|when|where|who|please|if|should)\b.*\?$/iu
const isClear = (h: Hold): boolean => CLEAR.test(asked(h)) && asked(h).length <= 160
function questionsOf(h: Hold, c: Card): Hold[] {
  const qs = (c.holdReasons ?? []).map((r) => classify(r, false)).filter((x) => x.kind === 'question')
  return qs.some((x) => x.raw === h.raw) ? qs : [h]
}
const anchor = (h: Hold, c: Card): Hold => { const qs = questionsOf(h, c); return qs.find(isClear) ?? qs[0] }
// The question the answer form shows: the anchor if clear, else the last fragment that ends in a question mark.
const askOf = (h: Hold, c: Card): string => {
  const a = anchor(h, c)
  return maskEmail(asked(isClear(a) ? a : questionsOf(h, c).findLast((x) => asked(x).endsWith('?')) ?? a))
}
function keyOf(h: Hold, c: Card): string {
  if (h.kind === 'account' || h.kind === 'domain') return `${h.kind}:${hostIn(h.text) ?? c.id}`
  if (h.kind === 'question') { const a = anchor(h, c); return `question:${OQ.exec(a.text)?.[0] ?? norm(asked(a))}` }
  return `${h.kind}:${c.id}`
}

type Plain = Exclude<HoldKind, 'account' | 'signin' | 'domain' | 'question'>
const TITLE: Record<Plain, string> = {
  captcha: 'Solve a captcha and send the form yourself.',
  checkpoint: 'Clear the LinkedIn security check.',
  staffing: 'Say whether to apply through a staffing agency.',
  consent: 'Say whether to accept an extra consent box.',
  duplicate: 'Pick one of two listings for the same opening.',
  resume: 'Settle a resume claim the portfolio does not back.',
  blocked: 'Approve a step the agent was not allowed to take.',
  failed: 'Decide whether to try a failed run again.',
  stopped: 'Check whether a stopped run sent the form.',
}

// A question the agent wrote as a clear question keeps its words. Any other agent text goes to the body, under a template title.
function titleOf(h: Hold, c: Card): string {
  const host = hostIn(h.text) ?? 'the employer site'
  const k = h.kind
  switch (k) {
    case 'account': return `Make an account at ${host}.`
    case 'signin': return `Sign in again at ${host}.`
    case 'domain': return `Allow Claude in Chrome on ${host}.`
    case 'question': { const a = anchor(h, c); return isClear(a) ? maskEmail(asked(a)) : `${c.company || 'An employer'} needs your answer.` }
    default: return TITLE[k]
  }
}

// The earlier `held:` fragments of a row, each dated by the first release or hand send after it.
// shortcut: a drop writes no date, so its hold falls back to the applied date or '' and sorts last; date drops if that matters.
function pastHolds(c: Card): { hold: Hold; at: string }[] {
  const frags = c.notes.split(' | ').map((f) => f.trim())
  return frags.flatMap((f, i) => {
    if (!f.startsWith('held:')) return []
    const at = frags.slice(i + 1).map((g) => SETTLED_ON.exec(g)?.[1]).find(Boolean) ?? c.appliedDate.slice(0, 10)
    return (holdReasons('held', f, '') ?? []).map((r) => ({ hold: classify(r, false), at }))
  })
}

function add(items: Map<string, RetroItem>, c: Card, hold: Hold, at: string): void {
  const key = keyOf(hold, c)
  const item: RetroItem = items.get(key) ?? { key, kind: hold.kind, title: titleOf(hold, c), ask: hold.kind === 'question' ? askOf(hold, c) : '', rows: [] }
  const row = item.rows.find((r) => r.card.id === c.id)
  if (!row) item.rows.push({ card: c, hold, more: [], at })
  else row.more.push(hold.raw)
  // A fallback title names a company, so once the item spans several employers it says how many instead.
  if (hold.kind === 'question' && item.title.endsWith(' needs your answer.')) {
    const n = new Set(item.rows.map((r) => r.card.company)).size
    if (n > 1) item.title = `${n} employers need your answer.`
  }
  items.set(key, item)
}

// Open items come from the rows held now. An open item whose every row has a run queued or running counts as acted on
// and joins the past holds in Resolved. A row held again after its run is open again, because this is rebuilt from the files.
export function buildRetro(cards: Card[], jobs: ReadonlyMap<string, Job>): { open: RetroItem[]; resolved: RetroItem[] } {
  const now = new Map<string, RetroItem>()
  const past = new Map<string, RetroItem>()
  // shortcut: a held row with no recorded reason gets no card; the Hunt drawer still shows it.
  for (const c of cards) {
    if (HELD.has(c.ledgerStatus ?? '')) for (const r of c.holdReasons ?? []) add(now, c, classify(r, false), '')
    else for (const p of pastHolds(c)) add(past, c, p.hold, p.at)
  }
  const running = (it: RetroItem) => it.rows.some((r) => isActive(jobs.get(r.card.id)))
  const acted = (it: RetroItem) => it.rows.every((r) => isActive(jobs.get(r.card.id)))
  const best = (it: RetroItem) => Math.max(-1, ...it.rows.map((r) => r.card.match ?? -1))
  const latest = (it: RetroItem) => it.rows.reduce((m, r) => (r.at > m ? r.at : m), '')
  const resolved = new Map([...now].filter(([, it]) => acted(it)))
  for (const [key, it] of past) {
    const same = resolved.get(key)
    if (!same) resolved.set(key, it)
    else for (const r of it.rows) if (!same.rows.some((s) => s.card.id === r.card.id)) same.rows.push(r)
  }
  // Two open items with one title get their first role's title added, so the candidate can tell them apart.
  const open = [...now.values()].filter((it) => !acted(it))
  const dup = new Set(open.map((it) => it.title).filter((t, i, all) => all.indexOf(t) !== i))
  for (const it of open) if (dup.has(it.title) && it.rows[0].card.role) it.title = `${it.title.replace(/\.$/u, '')} (${it.rows[0].card.role}).`
  return {
    open: open.sort((x, y) => y.rows.length - x.rows.length || best(y) - best(x)),
    resolved: [...resolved.values()].sort((x, y) => Number(running(y)) - Number(running(x)) || latest(y).localeCompare(latest(x))),
  }
}

// A rerun holds the row again for any other hold it cannot settle: a wall whose page is not opened yet, another
// question, or a kind only the drawer fixes. A staffing, consent or blocked hold is settled by the click itself,
// so the candidate must see it in the drawer first. A group action leaves such a row out.
export function othersBlock(item: RetroItem, c: Card, opened: readonly HoldKind[]): boolean {
  return (c.holdReasons ?? []).map((r) => classify(r, false))
    .some((h) => keyOf(h, c) !== item.key && !(WALLS.has(h.kind) && opened.includes(h.kind)))
}

// The applied roles whose ledger row has a `response`, which `engine.ts ingest response` writes.
// `since` is a YYYY-MM-DD date; the ledger's response_date is ISO too, so the two compare as text.
export function repliedCount(cards: readonly Card[], since?: string): number {
  const [head = [], ...rows] = parseCsv(readText('/my-sessions/ledger/prospects.csv') ?? '')
  const id = head.indexOf('id')
  const response = head.indexOf('response')
  const at = head.indexOf('response_date')
  if (id < 0 || response < 0) return 0
  const applied = new Set(cards.filter((c) => c.column === 'applied').map((c) => c.id))
  return rows.filter((r) => applied.has(r[id] ?? '') && (r[response] ?? '').trim() !== '' && (!since || (r[at] ?? '').slice(0, 10) >= since)).length
}

// One count for the rail and the Retro title, so the two cannot differ.
export const unresolvedCount = (cards: Card[], jobs: ReadonlyMap<string, Job>): number => buildRetro(cards, jobs).open.length

const ymd = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export interface AppliedStats { applied: number; week: number; days: number[]; held: number }

// Applications from the ledger rows, in local dates, so Today, the rail card and Hunt agree. `days` is the last 14, oldest first.
export function appliedStats(cards: readonly Card[], now = Date.now()): AppliedStats {
  const from = ymd(new Date(now - 6 * 86_400_000))
  const applied = cards.filter((c) => c.column === 'applied')
  const perDay = new Map<string, number>()
  for (const c of applied) { const d = c.appliedDate.slice(0, 10); perDay.set(d, (perDay.get(d) ?? 0) + 1) }
  return {
    applied: applied.length,
    week: applied.filter((c) => c.appliedDate.slice(0, 10) >= from).length,
    days: Array.from({ length: 14 }, (_, i) => perDay.get(ymd(new Date(now - (13 - i) * 86_400_000))) ?? 0),
    held: cards.filter((c) => c.column === 'held').length,
  }
}
