import type { Card } from '../data/types.ts'
import { INFO, classify } from '../data/holds.ts'

export type SortKey = 'match' | 'company' | 'role' | 'source' | 'channel' | 'column' | 'location' | 'dateFound' | 'appliedDate'
type SortDir = 'asc' | 'desc'
export interface Sort { key: SortKey; dir: SortDir }

export interface Filters {
  q: string
  sources: string[]          // empty means every source
  columns: string[]          // board columns; empty means all
  minMatch: number | null
}

export const NO_FILTERS: Filters = { q: '', sources: [], columns: [], minMatch: null }

export const SORT_LABELS: Record<SortKey, string> = {
  match: 'Match', company: 'Company', role: 'Role', source: 'Source', channel: 'Channel',
  column: 'Status', location: 'Location', dateFound: 'Date found', appliedDate: 'Date applied',
}

// Scores and dates read best highest or newest first; text reads best A to Z.
export const defaultDir = (key: SortKey): SortDir => (key === 'match' || key === 'dateFound' || key === 'appliedDate' ? 'desc' : 'asc')

export const isFiltered = (f: Filters): boolean =>
  f.q.trim() !== '' || f.sources.length > 0 || f.columns.length > 0 || f.minMatch !== null

export function applyFilters(cards: Card[], f: Filters): Card[] {
  const q = f.q.trim().toLowerCase()
  return cards.filter((c) =>
    (!q || c.company.toLowerCase().includes(q) || c.role.toLowerCase().includes(q)) &&
    (f.sources.length === 0 || f.sources.some((s) => s.toLowerCase() === (c.source || 'unknown').toLowerCase())) &&
    (f.columns.length === 0 || f.columns.includes(c.column)) &&
    (f.minMatch === null || (c.match !== null && c.match >= f.minMatch)))
}

// Empty values always sort last, whichever way the sort runs.
export function sortCards(cards: Card[], sort: Sort, order: readonly string[]): Card[] {
  const sign = sort.dir === 'asc' ? 1 : -1
  const val = (c: Card): string | number | null => {
    switch (sort.key) {
      case 'match': return c.match
      case 'column': { const i = order.indexOf(c.column); return i < 0 ? order.length : i }
      default: return c[sort.key].trim().toLowerCase() || null
    }
  }
  return [...cards].sort((a, b) => {
    const x = val(a)
    const y = val(b)
    if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1
    const d = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
    return d * sign || (b.match ?? -1) - (a.match ?? -1) || a.company.localeCompare(b.company)
  })
}

// The one reason a held role shows on its card or row: the first recorded hold, named in plain words. Other roles have none.
export function reasonOf(c: Card): string | null {
  const first = c.holdReasons?.[0]
  return first ? INFO[classify(first, false).kind].label : null
}
