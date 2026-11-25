import type { RefObject } from 'react'
import { CalendarDays, CircleDashed, Columns3, Gauge, Rows3, Search, SlidersHorizontal, Signal, X } from 'lucide-react'
import type { SessionInfo, Tally } from '../data/types.ts'
import { StateLabel } from './Chip.tsx'
import { label } from './format.ts'
import { Menu } from './Menu.tsx'
import { FilterRow } from './ui.tsx'
import { NO_FILTERS, SORT_LABELS, defaultDir, type Filters, type Sort, type SortKey } from './rows.ts'

export type Mode = 'list' | 'board'

const MIN_MATCH = [null, 40, 50, 60, 70, 80] as const
// The sorts that match what the list shows.
const SORT_KEYS: SortKey[] = ['match', 'company', 'role', 'column', 'dateFound', 'appliedDate']

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
const Check = ({ on }: { on: boolean }) => <span className="check" aria-hidden="true">{on ? '✓' : ''}</span>
// One chosen value names itself on the chip; several show a count.
const chosen = (base: string, picked: string[], name: (v: string) => string): string =>
  picked.length === 0 ? base : picked.length === 1 ? name(picked[0]) : `${picked.length} ${base.toLowerCase()}`

interface FilterProps {
  shown: number
  filters: Filters
  onFilters: (f: Filters) => void
  hunts: SessionInfo[]
  allCount: number
  hunt: string
  onHunt: (h: string) => void
  sources: Tally[]
  columns: { key: string; count: number }[]
  searchRef: RefObject<HTMLInputElement | null>
}

// The 50px row over the roles: the count, one dashed chip per filter, Clear when any is set, and search on the right.
export function HuntFilters(p: FilterProps) {
  const f = p.filters
  const any = p.hunt !== 'all' || f.sources.length + f.columns.length > 0 || f.minMatch !== null
  const huntName = p.hunts.find((h) => h.name === p.hunt)?.label ?? 'Hunt'
  const search = (
    <label className="search">
      <Search size={13} aria-hidden="true" />
      <input
        ref={p.searchRef}
        type="search"
        placeholder="Search company or role"
        aria-label="Search company or role"
        value={f.q}
        onChange={(e) => p.onFilters({ ...f, q: e.target.value })}
        onKeyDown={(e) => {
          if (e.key !== 'Escape') return
          e.stopPropagation()
          if (f.q) p.onFilters({ ...f, q: '' })
          else e.currentTarget.blur()
        }}
      />
      <kbd>/</kbd>
    </label>
  )
  return (
    <FilterRow cap="Roles" count={p.shown} right={search}>
      <Menu trigger="fchip" active={p.hunt !== 'all'} label={<><CalendarDays size={12} aria-hidden="true" />{p.hunt === 'all' ? 'Every hunt' : huntName}</>}>
        {(close) => [{ name: 'all', label: 'Every hunt', count: p.allCount }, ...p.hunts].map((h) => (
          <button key={h.name} role="menuitemradio" aria-checked={p.hunt === h.name} className="menu-item" title={h.name} onClick={() => { p.onHunt(h.name); close() }}>
            <Check on={p.hunt === h.name} />
            <span className="grow">{h.label}</span>
            <span className="muted num">{h.count}</span>
          </button>
        ))}
      </Menu>
      <Menu trigger="fchip" active={f.sources.length > 0} label={<><Signal size={12} aria-hidden="true" />{chosen('Sources', f.sources, label)}</>}>
        {() => p.sources.map((s) => (
          <label key={s.name} className="menu-item">
            <input type="checkbox" checked={f.sources.includes(s.name)} onChange={() => p.onFilters({ ...f, sources: toggle(f.sources, s.name) })} />
            <span className="grow">{label(s.name)}</span>
            <span className="muted num">{s.count}</span>
          </label>
        ))}
      </Menu>
      <Menu trigger="fchip" active={f.columns.length > 0} label={<><CircleDashed size={12} aria-hidden="true" />{chosen('Statuses', f.columns, label)}</>}>
        {() => p.columns.map((c) => (
          <label key={c.key} className="menu-item">
            <input type="checkbox" checked={f.columns.includes(c.key)} onChange={() => p.onFilters({ ...f, columns: toggle(f.columns, c.key) })} />
            <span className="grow"><StateLabel value={c.key} /></span>
            <span className="muted num">{c.count}</span>
          </label>
        ))}
      </Menu>
      <Menu trigger="fchip" active={f.minMatch !== null} label={<><Gauge size={12} aria-hidden="true" />{f.minMatch === null ? 'Any match' : `Match ${f.minMatch}+`}</>}>
        {(close) => MIN_MATCH.map((m) => (
          <button key={m ?? 'any'} role="menuitemradio" aria-checked={f.minMatch === m} className="menu-item" onClick={() => { p.onFilters({ ...f, minMatch: m }); close() }}>
            <Check on={f.minMatch === m} />
            <span className="grow">{m === null ? 'Any score' : `${m} or more`}</span>
          </button>
        ))}
      </Menu>
      {any && <button className="btn ghost small" onClick={() => { p.onFilters({ ...NO_FILTERS, q: f.q }); p.onHunt('all') }}><X size={12} aria-hidden="true" />Clear</button>}
    </FilterRow>
  )
}

interface ActionProps {
  mode: Mode
  onMode: (m: Mode) => void
  sort: Sort
  onSort: (s: Sort) => void
  grouped: boolean
  onGrouped: (g: boolean) => void
  showDropped: boolean
  onShowDropped: (v: boolean) => void
}

// The page bar's actions on Hunt: the List and Board switch, then Display for grouping, dropped roles and the sort.
export function HuntActions(p: ActionProps) {
  return (<>
    <div className="seg mode" role="group" aria-label="View">
      {(['list', 'board'] as const).map((m) => (
        <button key={m} aria-pressed={p.mode === m} onClick={() => p.onMode(m)}>
          {m === 'list' ? <Rows3 size={13} aria-hidden="true" /> : <Columns3 size={13} aria-hidden="true" />}{m === 'list' ? 'List' : 'Board'}
        </button>
      ))}
    </div>
    <Menu align="right" label={<><SlidersHorizontal size={13} aria-hidden="true" />Display</>}>
      {(close) => (<>
        <div className="menu-mode">
          <p className="menu-head">View</p>
          {(['list', 'board'] as const).map((m) => (
            <button key={m} role="menuitemradio" aria-checked={p.mode === m} className="menu-item" onClick={() => { p.onMode(m); close() }}>
              <Check on={p.mode === m} />
              <span className="grow">{m === 'list' ? 'List' : 'Board'}</span>
            </button>
          ))}
          <div className="menu-sep" />
        </div>
        {p.mode === 'list' && (<>
          <p className="menu-head">Grouping</p>
          <label className="menu-item">
            <input type="checkbox" checked={p.grouped} onChange={() => p.onGrouped(!p.grouped)} />
            <span className="grow">Group by status</span>
          </label>
          <div className="menu-sep" />
        </>)}
        <label className="menu-item">
          <input type="checkbox" checked={p.showDropped} onChange={() => p.onShowDropped(!p.showDropped)} />
          <span className="grow">Show dropped</span>
        </label>
        <div className="menu-sep" />
        <p className="menu-head">Sort by</p>
        {SORT_KEYS.map((k) => (
          <button key={k} role="menuitemradio" aria-checked={p.sort.key === k} className="menu-item" onClick={() => { p.onSort({ key: k, dir: defaultDir(k) }); close() }}>
            <Check on={p.sort.key === k} />
            <span className="grow">{SORT_LABELS[k]}</span>
          </button>
        ))}
        <div className="menu-sep" />
        {(['asc', 'desc'] as const).map((d) => (
          <button key={d} role="menuitemradio" aria-checked={p.sort.dir === d} className="menu-item" onClick={() => { p.onSort({ ...p.sort, dir: d }); close() }}>
            <Check on={p.sort.dir === d} />
            <span className="grow">{d === 'asc' ? 'Ascending' : 'Descending'}</span>
          </button>
        ))}
      </>)}
    </Menu>
  </>)
}
