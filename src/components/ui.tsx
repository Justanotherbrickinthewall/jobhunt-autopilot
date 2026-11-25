import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { Splitter } from './Splitter.tsx'
import { isTyping } from '../util.ts'

// The shared pieces of the white work area: the stat strip, the filter row, the table and the empty state.
// docs/dashboard-design.md holds their sizes. Buttons, the segmented control and the tabs are classes in shell.css.

// A line over a soft area, scaled to the largest value. The label says the numbers for a screen reader.
export function Spark({ values, label, className }: { values: number[]; label: string; className?: string }) {
  const max = Math.max(1, ...values)
  const step = 100 / Math.max(1, values.length - 1)
  const pts = values.map((v, i) => `${(i * step).toFixed(2)},${(27 - (v / max) * 24).toFixed(2)}`)
  return (
    <svg className={`spark${className ? ` ${className}` : ''}`} viewBox="0 0 100 28" preserveAspectRatio="none" role="img" aria-label={label}>
      <path className="spark-area" d={`M0,28 L${pts.join(' L')} L100,28 Z`} />
      <path className="spark-line" d={`M${pts.join(' L')}`} />
    </svg>
  )
}

export interface Stat { label: string; value: ReactNode; sub: ReactNode; spark?: { values: number[]; label: string } }

// Four cells flush with the page, with hairlines between them.
export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="stats">
      {stats.map((s) => (
        <div className="stat" key={s.label}>
          <span className="cap">{s.label}</span>
          <span className="stat-num num">{s.value}</span>
          <span className="stat-sub">{s.sub}</span>
          {s.spark && <Spark values={s.spark.values} label={s.spark.label} className="stat-spark" />}
        </div>
      ))}
    </div>
  )
}

// The 50px row over a table: a cap and a count, then the filters, then whatever sits on the right.
export function FilterRow({ cap, count, children, right }: { cap: string; count?: number; children?: ReactNode; right?: ReactNode }) {
  return (
    <div className="filter-row">
      <span className="cap">{cap}</span>
      {count !== undefined && <span className="fr-count num">{count}</span>}
      {children}
      {right && <span className="fr-right">{right}</span>}
    </div>
  )
}

export interface Column<T> {
  key: string
  head: ReactNode
  cell: (row: T) => ReactNode
  className?: string       // also names the <col>, so a container query can hide the whole column
  sortable?: boolean
}
interface RowGroup<T> { key: string; head?: ReactNode; rows: T[] }

interface TableProps<T> {
  label: string
  columns: Column<T>[]
  groups: RowGroup<T>[]
  id: (row: T) => string
  onRow: (row: T) => void
  selected?: string | null
  open?: string | null
  shut?: ReadonlySet<string>
  onGroup?: (key: string) => void
  sort?: { key: string; dir: 'asc' | 'desc' }
  onSort?: (key: string) => void
  className?: string
  focusable?: boolean      // Tab reaches each row and Enter opens it, for tables that have no j and k keys
}

// Flush rows on hairlines under a 34px caps header. Rows carry data-id, which the keyboard and the drawer read.
export function DataTable<T>(p: TableProps<T>) {
  const grouped = p.groups.some((g) => g.head !== undefined)
  return (
    <table className={`table${p.className ? ` ${p.className}` : ''}`} aria-label={p.label}>
      <colgroup>{p.columns.map((c) => <col key={c.key} className={c.className} />)}</colgroup>
      <thead>
        <tr>
          {p.columns.map((c) => {
            const on = p.sort?.key === c.key
            return (
              <th key={c.key} className={c.className} aria-sort={on ? (p.sort?.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                {c.sortable && p.onSort
                  ? <button onClick={() => p.onSort?.(c.key)}>{c.head}{on && <span className={`dir ${p.sort?.dir}`} aria-hidden="true" />}</button>
                  : c.head}
              </th>
            )
          })}
        </tr>
      </thead>
      {p.groups.map((g) => {
        const shut = p.shut?.has(g.key) ?? false
        return (
          <tbody key={g.key || 'all'}>
            {grouped && (
              <tr className="group-row">
                <th colSpan={p.columns.length} scope="rowgroup">
                  <button aria-expanded={!shut} onClick={() => p.onGroup?.(g.key)}>
                    <ChevronRight size={13} className={shut ? 'chev' : 'chev open'} aria-hidden="true" />
                    {g.head}
                    <span className="num fr-count">{g.rows.length}</span>
                  </button>
                </th>
              </tr>
            )}
            {!shut && g.rows.map((r) => {
              const id = p.id(r)
              return (
                <tr key={id} data-id={id} className={`row${p.selected === id ? ' selected' : ''}${p.open === id ? ' open' : ''}`} onClick={() => p.onRow(r)}
                  tabIndex={p.focusable ? 0 : undefined} onKeyDown={p.focusable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.onRow(r) } } : undefined}>
                  {p.columns.map((c) => <td key={c.key} className={c.className}>{c.cell(r)}</td>)}
                </tr>
              )
            })}
          </tbody>
        )
      })}
    </table>
  )
}

// A centred icon tile, a title and one or two lines of copy. Children after the copy are its actions.
export function EmptyState({ icon: Icon, title, children, small }: { icon: LucideIcon; title: ReactNode; children?: ReactNode; small?: boolean }) {
  return (
    <div className={`empty${small ? ' small' : ''}`}>
      <span className="empty-icon" aria-hidden="true"><Icon size={18} /></span>
      <h1>{title}</h1>
      {children}
    </div>
  )
}

interface ListGroup<T> { key: string; head: ReactNode; rows: T[]; count?: ReactNode; note?: string }   // count: the whole group, when rows is a page of it, or any label. note: one muted line under the head

interface ListDetailProps<T> {
  label: string
  groups: ListGroup<T>[]
  id: (row: T) => string
  row: (row: T) => ReactNode
  unread?: (row: T) => boolean
  selected: string | null
  onSelect: (row: T) => void
  foot?: ReactNode          // under the list, such as a Show all button
  top?: ReactNode           // above the rows, such as search and a menu
  aside?: ReactNode         // beside the detail at a pane width of 1100px and up, under it below that
  wrap?: boolean            // row names run to two lines instead of one
  children: ReactNode       // the detail pane
}

// The list and detail split: a list pane of clamp(340px, 24vw, 480px) in the faint tint beside the detail, whose content is one centred group. A group with an empty head shows no header.
// Up and Down, or k and j, move the selection and the focus with it. Enter moves the focus into the detail, so Tab reaches its buttons.
export function ListDetail<T>(p: ListDetailProps<T>) {
  const list = useRef<HTMLDivElement>(null)
  const detail = useRef<HTMLElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const aside = useRef<HTMLElement>(null)
  const flat = p.groups.flatMap((g) => g.rows)
  const at = flat.findIndex((r) => p.id(r) === p.selected)
  const rowEl = (key: string) => list.current?.querySelector<HTMLElement>(`[data-ld="${CSS.escape(key)}"]`)
  useEffect(() => {
    if (p.selected) rowEl(p.selected)?.scrollIntoView({ block: 'nearest' })
    detail.current?.scrollTo?.({ top: 0 })
  }, [p.selected])
  const onKey = (e: KeyboardEvent) => {
    if (!(e.target as HTMLElement).closest('[data-ld]')) return   // search and menus in the top slot keep their own keys
    const down = e.key === 'ArrowDown' || e.key === 'j', up = e.key === 'ArrowUp' || e.key === 'k'
    if ((down || up) && !(e.key.length === 1 && (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)))) {
      e.preventDefault()
      const next = flat[Math.max(0, Math.min(flat.length - 1, at + (down ? 1 : -1)))]
      if (!next) return
      p.onSelect(next)
      rowEl(p.id(next))?.focus()
    } else if (e.key === 'Enter') {
      const key = (e.target as HTMLElement).closest<HTMLElement>('[data-ld]')?.dataset.ld
      const r = flat.find((x) => p.id(x) === key)
      if (!r) return
      e.preventDefault()
      p.onSelect(r)
      detail.current?.focus()
    }
  }
  return (
    <div className={`ld${p.wrap ? ' wrap' : ''}`} ref={root}>
      <div className="ld-list" ref={list} onKeyDown={onKey}>
        {p.top && <div className="ld-top">{p.top}</div>}
        <div role="listbox" aria-label={p.label}>
        {p.groups.map((g) => g.rows.length > 0 && (
          <div className="ld-group" role="group" aria-label={typeof g.head === 'string' ? g.head : undefined} key={g.key}>
            {g.head && <div className="ld-group-head" aria-hidden="true"><span className="cap">{g.head}</span><span className="num">{g.count ?? g.rows.length}</span></div>}
            {g.head && g.note && <div className="ld-group-note" title={g.note}>{g.note}</div>}
            {g.rows.map((r) => {
              const key = p.id(r)
              const on = key === p.selected
              return (
                <button key={key} type="button" role="option" aria-selected={on} data-ld={key} tabIndex={on || (at < 0 && r === flat[0]) ? 0 : -1}
                  className={`ld-row${on ? ' selected' : ''}${p.unread?.(r) ? ' unread' : ''}`} onClick={() => p.onSelect(r)}>
                  {p.row(r)}
                </button>
              )
            })}
          </div>
        ))}
        </div>
        {p.foot && <div className="ld-foot-list">{p.foot}</div>}
      </div>
      {import.meta.env.VITE_PHONE !== '1' && <Splitter className="ld-split" name="list" label="Resize the list" varName="--ld-list-w" root={root} pane={list} min={280} max={560} grow="right" room={() => (root.current?.clientWidth ?? 0) - 480} />}
      <section className="ld-detail" ref={detail} tabIndex={-1} aria-label="Detail">
        <div className={`ld-wrap${p.aside ? ' has-aside' : ''}`} ref={wrap}>
          <div className="ld-main">{p.children}</div>
          {p.aside && import.meta.env.VITE_PHONE !== '1' && <Splitter className="ld-split-aside" name="aside" label="Resize the side column" varName="--ld-aside-w" root={wrap} pane={aside} min={260} max={480} grow="left" factor={2} room={() => (wrap.current?.clientWidth ?? 0) - 48 - 480} />}
          {p.aside && <aside className="ld-aside" ref={aside}>{p.aside}</aside>}
        </div>
      </section>
    </div>
  )
}

// One list row: a lead avatar or tile, the name with a meta on the right, a line, an optional preview and a foot.
export function ListRow({ lead, name, meta, line, preview, foot }: { lead?: ReactNode; name: ReactNode; meta?: ReactNode; line?: ReactNode; preview?: ReactNode; foot?: ReactNode }) {
  return (
    <>
      {lead}
      <span className="lr-text">
        <span className="lr-top"><span className="lr-name">{name}</span><i className="lr-dot" aria-hidden="true" />{meta && <span className="lr-meta">{meta}</span>}</span>
        {line && <span className="lr-line">{line}</span>}
        {preview && <span className="lr-preview">{preview}</span>}
        {foot && <span className="lr-foot">{foot}</span>}
      </span>
    </>
  )
}
