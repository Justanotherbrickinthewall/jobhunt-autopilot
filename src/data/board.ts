import { parseCsv } from '../../process/lib/csv.ts'
import { sessionStamp } from '../../process/lib/sessionName.ts'
import { currentStatus } from '../../process/lib/vocab.ts'
import { parseMissingKeywords } from '../../process/lib/rolesMarkdown.ts'
import { MON } from '../util.ts'
import { pdfUrl, readText, textPaths } from './files.ts'
import type { Analytics, Board, Card, SessionInfo, Tally } from './types.ts'
import { HELD, HOLD_LANES, holdReasons } from './holds.ts'
import { dropReason } from './drops.ts'

type Rec = Record<string, string>
interface AppEntry { id: string; folder: string; resume: string; resume_tailored: boolean }

const COMPONENTS: [string, number][] = [['fd_30', 30], ['ai_25', 25], ['reach_20', 20], ['level_15', 15], ['stack_10', 10]]

// The board's five columns, in All and in every hunt. The engine keeps its finer statuses and lanes, and each maps to one column.
const COLUMNS: readonly string[] = ['new', 'processing', 'held', 'applied', 'dropped']
export const COLUMN_OF: Readonly<Record<string, string>> = {
  new: 'new', swept: 'new',
  extracted: 'processing', scored: 'processing', ready: 'processing', queued: 'processing',
  matching: 'processing', matched: 'processing', tailoring: 'processing', tailored: 'processing', applying: 'processing',
  held: 'held', blocked_info: 'held', blocked: 'held',
  applied: 'applied', sent: 'applied',
  skipped: 'dropped', wrong_job: 'dropped', dropped: 'dropped',
}

function records(text: string, label: string, problems: string[]): Rec[] {
  const [head = [], ...rows] = parseCsv(text)
  const out: Rec[] = []
  rows.forEach((r, i) => {
    if (r.length === 1 && r[0] === '') return
    const rec: Rec = {}
    head.forEach((h, j) => { rec[h] = r[j] ?? '' })
    if (r.length !== head.length) {
      const msg = `${label} row ${i + 2}: ${r.length} fields, header has ${head.length}`
      problems.push(msg)
      rec.__warn = msg
    }
    out.push(rec)
  })
  return out
}

function num(v: string | undefined): number | null {
  if (v === undefined || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

interface Hunt { name: string; label: string; sortKey: string; date: string; ids: Set<string> }

// A board is a run only when it has rows and every row's note starts `seeded: `, and `backlog: ` rows don't count toward a hunt's own rows.
function hunts(): Hunt[] {
  const out: Hunt[] = []
  for (const p of textPaths('/my-sessions/', '/board.csv')) {
    const name = p.split('/')[2]
    const s = sessionStamp(name)
    if (!s || s.kind !== 'hunt') continue
    const rows = records(readText(p) ?? '', p, [])
    if (rows.length > 0 && rows.every((r) => (r.note ?? '').startsWith('seeded: '))) continue
    const [y, m, d] = s.date.split('-')
    out.push({ name, label: `${Number(d)} ${MON[Number(m) - 1]} ${y}, ${s.time}`, sortKey: `${s.date} ${s.time}`, date: s.date, ids: new Set(rows.filter((r) => !(r.note ?? '').startsWith('backlog: ')).map((r) => r.id).filter(Boolean)) })
  }
  return out.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0))
}

// A later hunt that works a row as backlog, or finds it again, must not take it from the hunt that found it.
function homes(ledger: Rec[]): Map<string, string> {
  const found = new Map(ledger.map((r) => [r.id, (r.date_found ?? '').slice(0, 10)]))
  const home = new Map<string, string>()
  for (const h of hunts()) for (const id of h.ids) if (!home.has(id) && h.date <= (found.get(id) ?? '')) home.set(id, h.name)
  return home
}

export function listSessions(): SessionInfo[] {
  const home = [...homes(records(readText('/my-sessions/ledger/prospects.csv') ?? '', 'prospects.csv', [])).values()]
  return hunts().reverse().map(({ name, label, sortKey }) => ({ name, label, sortKey, count: home.filter((n) => n === name).length }))
}

// Rows in the ledger, for the All entry in the sidebar. Counts ids the way getBoard('all') does.
export function ledgerCount(): number {
  const text = readText('/my-sessions/ledger/prospects.csv')
  if (!text) return 0
  return new Set(records(text, 'prospects.csv', []).map((r) => r.id).filter(Boolean)).size
}

function loadApplications(problems: string[]): Map<string, AppEntry> {
  const raw = readText('/my-applications/index.json')
  const map = new Map<string, AppEntry>()
  if (!raw) return map
  try {
    for (const e of JSON.parse(raw) as AppEntry[]) map.set(e.id, e)
  } catch (e) {
    problems.push(`my-applications/index.json: ${(e as Error).message}`)
  }
  return map
}

function buildCard(id: string, key: string, led: Rec | undefined, board: Rec | undefined, app: AppEntry | undefined): Card {
  // Field by field: a blank ledger cell must not hide a filled board cell.
  const r: Rec = { ...board }
  for (const [k, v] of Object.entries(led ?? {})) if (v !== '' || r[k] === undefined) r[k] = v
  const warnings: string[] = []
  if (!led) warnings.push('not in the ledger')
  for (const w of [led?.__warn, board?.__warn]) if (w) warnings.push(w)
  const rawJd = (app && readText(`/my-applications/${app.folder}/jd.md`)) ?? readText(`/my-sessions/ledger/roles/${id}.jd.md`)
  const jd = rawJd?.replace(/<!--[\s\S]*?-->\s*/gu, '') ?? rawJd   // the saved JD opens with a source comment, which is not for the reader
  let resume: Card['resume'] = null
  if (app?.resume) {
    const url = pdfUrl(`/my-applications/${app.folder}/${app.resume}`)
    if (url) resume = { url, tailored: Boolean(app.resume_tailored) }
  }
  if (!resume) {
    // The last `resume: <repo path>` note is the file the engine picked: a fixed variant under my-profile/resume/<folder>/,
    // or a built PDF in ledger/artifacts/ on rows before 21 Oct 2026. A row with no note falls back to the built name.
    const path = [...(r.notes ?? '').matchAll(/resume: (\S+)/g)].pop()?.[1]
      ?? (r.resume_variant ? `my-sessions/ledger/artifacts/${r.resume_variant}.pdf` : '')
    const url = path && pdfUrl(`/${path}`)
    if (url) resume = { url, tailored: path.startsWith('my-sessions/'), variant: /^my-profile\/resume\/([^/]+)\//.exec(path)?.[1] }
  }
  const roleMd = readText(`/my-sessions/ledger/roles/${id}.md`)
  return {
    id,
    company: r.company ?? '',
    role: r.role ?? '',
    source: r.source ?? '',
    channel: r.channel ?? '',
    column: COLUMN_OF[key] ?? key,
    ledgerStatus: led?.status ?? null,
    match: num(r.match),
    semantic: num(r.semantic),
    components: COMPONENTS.map(([key, max]) => ({ key, max, value: num(r[key]) })),
    evidence: r.evidence ?? '',
    location: r.location ?? '',
    workMode: r.work_mode ?? '',
    link: r.link ?? '',
    dateFound: r.date_found ?? '',
    appliedDate: r.applied_date ?? '',
    missing: roleMd ? parseMissingKeywords(roleMd) : [],
    jd,
    resume,
    warnings,
    // A row held after this hunt worked it shows its hold, whatever lane this hunt left it in.
    holdReasons: holdReasons(HELD.has(led?.status ?? '') && !HOLD_LANES.has(key) ? 'held' : key, led?.notes ?? '', board?.note ?? '', HELD.has(led?.status ?? '')),
    dropReason: dropReason(led?.status ?? '', led?.notes ?? ''),
    notes: led?.notes ?? '',
  }
}

function tally(names: string[]): Tally[] {
  const m = new Map<string, Tally>()
  for (const n of names) {
    const k = n.toLowerCase()
    const t = m.get(k) ?? { name: n, count: 0 }
    t.count++
    m.set(k, t)
  }
  return [...m.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function analytics(cards: Card[], session: boolean): Analytics {
  const scored = cards.filter((c) => c.match !== null)
  const termsOf = (ev: 'no' | 'partial') =>
    cards.flatMap((c) => {
      const seen = new Map<string, string>()
      for (const k of c.missing) if (k.evidence === ev && !seen.has(k.term.toLowerCase())) seen.set(k.term.toLowerCase(), k.term)
      return [...seen.values()]
    })
  return {
    sources: tally(cards.map((c) => c.source || 'unknown')),
    found: cards.length,
    swept: session ? cards.length : cards.filter((c) => c.column !== 'new').length,
    applied: cards.filter((c) => c.column === 'applied').length,
    avgMatch: scored.length ? Math.round(scored.reduce((s, c) => s + (c.match ?? 0), 0) / scored.length) : null,
    scoredCount: scored.length,
    missingNo: tally(termsOf('no')),
    missingPartial: tally(termsOf('partial')),
    matchBins: Array.from({ length: 10 }, (_, i) =>
      scored.filter((c) => Math.min(9, Math.max(0, Math.floor((c.match ?? 0) / 10))) === i).length),
  }
}

// Every column in the vocabulary shows, even at 0, so the board keeps its shape between views.
// A value outside the vocabulary gets its own column after the known ones.
function columns(cards: Card[], order: readonly string[]): Board['columns'] {
  const keys = [...order, ...new Set(cards.map((c) => c.column).filter((k) => !order.includes(k)))]
  const byMatch = (a: Card, b: Card) => (b.match ?? -1) - (a.match ?? -1)
  return keys.map((key) => ({ key, cards: cards.filter((c) => c.column === key).sort(byMatch) }))
}

function setRow(map: Map<string, Rec>, r: Rec, label: string, problems: string[]): void {
  if (!r.id) problems.push(`${label}: row with an empty id skipped`)
  else if (map.has(r.id)) problems.push(`${label}: duplicate id ${r.id}, the later row wins`)
  if (r.id) map.set(r.id, r)
}

export function getBoard(view: string): Board {
  const problems: string[] = []
  const ledgerText = readText('/my-sessions/ledger/prospects.csv')
  const ledger = new Map<string, Rec>()
  if (ledgerText) for (const r of records(ledgerText, 'prospects.csv', problems)) setRow(ledger, r, 'prospects.csv', problems)
  const apps = loadApplications(problems)
  const session = view !== 'all'
  const home = session ? homes([...ledger.values()]) : null
  // A hunt shows the rows it found in their current column, so a later run never moves a row out of its hunt.
  const cards = [...ledger.values()].filter((r) => !home || home.get(r.id) === view)
    .map((r) => buildCard(r.id, currentStatus(r.status || 'new'), r, undefined, apps.get(r.id)))
  return {
    view,
    columns: columns(cards, COLUMNS),
    analytics: analytics(cards, session),
    problems,
    empty: !ledgerText,
  }
}
