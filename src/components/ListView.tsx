import { MapPin } from 'lucide-react'
import type { Card } from '../data/types.ts'
import { FitBar, SegTag, StateLabel, Tile, WarnMark } from './Chip.tsx'
import { age, human, laneOf, longDate, shortDate } from './format.ts'
import { defaultDir, reasonOf, type Sort, type SortKey } from './rows.ts'
import { DataTable, type Column } from './ui.tsx'

export interface Group { key: string; cards: Card[] }

interface Props {
  groups: Group[]              // one group with key '' when the list is not grouped
  collapsed: ReadonlySet<string>
  onToggleGroup: (key: string) => void
  sort: Sort
  onSort: (s: Sort) => void
  selectedId: string | null
  openId: string | null
  onOpen: (c: Card) => void
}

// The role leads with its company tile and its lane, as Contacts leads with a person. Location, match, status and dates follow.
const COLUMNS: Column<Card>[] = [
  {
    key: 'role', head: 'Role', className: 'c-role', sortable: true, cell: (c) => {
      const lane = laneOf(c.source, c.channel)
      return (
        <span className="who">
          <Tile name={c.company || '?'} />
          <span className="who-text">
            <span className="who-line">
              <span className="who-name" title={c.role}>{c.role || 'Untitled role'}</span>
              <SegTag tone={lane.tone}>{lane.text}</SegTag>
              <WarnMark warnings={c.warnings} />
            </span>
            <span className="who-sub"><span>{c.company || 'Unknown company'}</span>{c.workMode && <span>{human(c.workMode)}</span>}</span>
          </span>
        </span>
      )
    },
  },
  {
    key: 'location', head: 'Location', className: 'c-location', sortable: true,
    cell: (c) => (c.location ? <span className="loc" title={c.location}><MapPin size={13} aria-hidden="true" /><span>{c.location}</span></span> : <span className="faint">–</span>),
  },
  { key: 'match', head: 'Match', className: 'c-match', sortable: true, cell: (c) => <FitBar value={c.match} /> },
  {
    key: 'column', head: 'Status', className: 'c-status', sortable: true, cell: (c) => {
      const reason = reasonOf(c)
      return <span className="status-cell"><StateLabel value={c.column} />{reason && <span className="reason" title={reason}>{reason}</span>}</span>
    },
  },
  { key: 'appliedDate', head: 'Applied', className: 'c-applied', sortable: true, cell: (c) => <span className="date-cell num" title={c.appliedDate ? longDate(c.appliedDate) : undefined}>{c.appliedDate ? shortDate(c.appliedDate) : <span className="faint">–</span>}</span> },
  { key: 'dateFound', head: 'Found', className: 'c-found', sortable: true, cell: (c) => <span className="date-cell num" title={c.dateFound ? `Found ${longDate(c.dateFound)}` : undefined}>{c.dateFound ? age(c.dateFound) : '–'}</span> },
]

// Under a status group header the status is already named, so the column shows the reason alone.
const REASON: Column<Card> = {
  key: 'column', head: 'Reason', className: 'c-status', sortable: true,
  cell: (c) => { const r = reasonOf(c); return r ? <span className="status-cell"><span className="reason" title={r}>{r}</span></span> : <span className="faint">–</span> },
}

export function ListView(p: Props) {
  const grouped = p.groups.length !== 1 || p.groups[0].key !== ''
  const onSort = (key: string) => {
    const k = key as SortKey
    p.onSort(p.sort.key === k ? { key: k, dir: p.sort.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: defaultDir(k) })
  }
  return (
    <DataTable
      label="Roles"
      className="hunt-list"
      columns={grouped ? COLUMNS.map((c) => (c.key === 'column' ? REASON : c)) : COLUMNS}
      groups={p.groups.map((g) => ({ key: g.key, head: grouped ? <StateLabel value={g.key} /> : undefined, rows: g.cards }))}
      id={(c) => c.id}
      onRow={p.onOpen}
      selected={p.selectedId}
      open={p.openId}
      shut={p.collapsed}
      onGroup={p.onToggleGroup}
      sort={p.sort}
      onSort={onSort}
    />
  )
}
