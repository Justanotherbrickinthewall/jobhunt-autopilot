import { useEffect, useMemo, useState } from 'react'
import { BookOpen, GraduationCap, Inbox, ListChecks, MessageCircleQuestionMark, Mic, Reply, type LucideIcon } from 'lucide-react'
import { PageHeader } from './PageHeader.tsx'
import { Avatar, Chip, FitBar, StateLabel, Tile } from './Chip.tsx'
import { DataTable, FilterRow, StatStrip, type Column, type Stat } from './ui.tsx'
import { getBoard } from '../data/board.ts'
import { INFO, type HoldKind } from '../data/holds.ts'
import { appliedStats, buildRetro, repliedCount, type RetroItem } from '../data/retro.ts'
import { groupByWait, loadContacts, parse, type Contact } from '../data/outreach.ts'
import { loadInterviews } from '../data/interviews.ts'
import { loadPrepSources } from '../data/prep.ts'
import { drillable } from '../data/prepRecall.ts'
import { sectionConfidence } from '../data/prepConfidence.ts'
import { getLastPosition } from '../learn/engine/progress.ts'
import { goLearn } from '../reading/router.ts'
import { age, label, lastHunt, longDate, shortDate, type Tone } from './format.ts'
import type { Card, SessionInfo } from '../data/types.ts'
import type { Job } from '../data/heldApi.ts'
import type { TabKey } from './Rail.tsx'

// The home page: the stat strip, then a table for each thing that waits, each row linking to the area where the work is done.
// It only reads. Every number comes from the function the linked area uses, so Today and that area agree.
const n = (k: number, one: string, many: string): string => `${k} ${k === 1 ? one : many}`
const MAX_ROWS = 5
// The employers an item blocks, so a title like "Approve a step the agent was not allowed to take." says whose.
const companiesOf = (rows: readonly { card: Card }[]): string => {
  const names = [...new Set(rows.map((r) => r.card.company).filter(Boolean))]
  return names.length === 0 ? '' : `${names.slice(0, 2).join(', ')}${names.length > 2 ? ` and ${names.length - 2} more` : ''}`
}

interface Props {
  sessions: SessionInfo[]
  cards: Card[]                       // every row, as Retro reads them
  jobs: ReadonlyMap<string, Job>
  retroCount: number
  learnDue: number
  onTab: (t: TabKey) => void
  onRetro: (key?: string) => void     // opens Jobs, then Retro, with that question expanded
  onOutreach: () => void
}

interface PrepRow { key: string; icon: LucideIcon; title: string; sub: string; next: string; go: () => void }

// Kinds are reasons under one status. Amber waits on the candidate, red is blocked or not allowed, the rest stay muted.
export const KIND_TONE: Partial<Record<HoldKind, Tone>> = {
  account: 'amber', signin: 'amber', captcha: 'amber', checkpoint: 'amber', question: 'amber',
  blocked: 'red', domain: 'red', failed: 'red',
}
export const waitingFor = (it: RetroItem): string => {
  const first = it.rows.map((r) => r.card.dateFound.slice(0, 10)).filter(Boolean).sort()[0]
  return first ? age(first) : ''
}
const sinceOf = (c: Contact): string => (c.company && !/^(not stated|unknown)\b/iu.test(c.company.trim()) ? c.company : [label(c.channel), shortDate(c.date)].filter(Boolean).join(' · '))

const QUESTION_COLS: Column<RetroItem>[] = [
  {
    key: 'question', head: 'Question', cell: (it) => (
      <span className="who">
        <Tile name={it.rows[0]?.card.company || it.title} />
        <span className="who-text">
          <span className="who-name" title={it.title}>{it.title}</span>
          {(companiesOf(it.rows) || it.rows.length > 1) && <span className="who-sub"><span>{[companiesOf(it.rows), it.rows.length > 1 ? `Blocks ${it.rows.length} roles` : ''].filter(Boolean).join(' · ')}</span></span>}
        </span>
      </span>
    ),
  },
  {
    key: 'role', head: 'Role', className: 'c-role', cell: (it) => {
      const c = it.rows[0]?.card
      return c ? <span className="role-cell"><span className="role-title" title={c.role}>{c.role}</span><FitBar value={c.match} /></span> : null
    },
  },
  { key: 'kind', head: 'Kind', className: 'c-kind', cell: (it) => <Chip tone={KIND_TONE[it.kind] ?? 'gray'}>{INFO[it.kind].label}</Chip> },
  { key: 'waiting', head: 'Waiting', className: 'c-n right', cell: (it) => <span className="num faint" title="Since the oldest blocked role was found">{waitingFor(it)}</span> },
]

const PERSON_COLS: Column<Contact>[] = [
  {
    key: 'person', head: 'Person', cell: (c) => (
      <span className="who">
        <Avatar name={c.name} />
        <span className="who-text">
          <span className="who-name">{c.name}</span>
          <span className="who-sub"><span>{sinceOf(c)}</span></span>
        </span>
      </span>
    ),
  },
  { key: 'latest', head: 'Latest', className: 'c-latest', cell: (c) => { const n = c.notes.length ? parse(c.notes[c.notes.length - 1]).text : ''; return n ? <span className="latest" title={n}>{n}</span> : null } },
  { key: 'channel', head: 'Channel', className: 'c-kind', cell: (c) => <Chip>{label(c.channel)}</Chip> },
  { key: 'status', head: 'Status', className: 'c-state', cell: (c) => <StateLabel tone={c.replied ? 'violet' : 'amber'} icon={c.replied ? Reply : Inbox}>{c.status}</StateLabel> },
  { key: 'last', head: 'Last touch', className: 'c-n right', cell: (c) => <span className="num faint" title={longDate(c.date)}>{age(c.date)}</span> },
]

const PREP_COLS: Column<PrepRow>[] = [
  {
    key: 'area', head: 'Area', cell: (r) => (
      <span className="who">
        <Tile name={r.key} icon={r.icon} />
        <span className="who-text">
          <span className="who-name">{r.title}</span>
          <span className="who-sub"><span>{r.sub}</span></span>
        </span>
      </span>
    ),
  },
  { key: 'next', head: 'Next step', className: 'c-next right', cell: (r) => <span className="go">{r.next}</span> },
]

export function Today({ sessions, cards, jobs, retroCount, learnDue, onTab, onRetro, onOutreach }: Props) {
  const open = useMemo(() => buildRetro(cards, jobs).open, [cards, jobs])
  const waitingRows = useMemo(() => groupByWait(loadContacts()).you, [])
  const waiting = waitingRows.length
  const blocked = useMemo(() => new Set(open.flatMap((it) => it.rows.map((r) => r.card.id))).size, [open])
  const latest = sessions[0]
  const hunt = useMemo(() => (latest ? lastHunt(latest.sortKey, getBoard(latest.name).analytics.found, getBoard(latest.name).analytics.applied) : ''), [latest])
  // The applied counts read the ledger rows (via cards) so they match Hunt and Retro, not the hunts' own tallies.
  const applied = useMemo(() => appliedStats(cards), [cards])
  const replied = useMemo(() => repliedCount(cards), [cards])

  const review = useMemo(() => loadInterviews().interviews[0] ?? null, [])
  const prep = useMemo(() => {
    const content = loadPrepSources()[0]?.content
    return content && content.tabs.length > 0 ? sectionConfidence(content.tabs.flatMap(drillable)) : null
  }, [])
  const last = getLastPosition()
  const lastId = last?.chapterId
  // Loaded on demand so Learn's chapter content stays out of the main bundle. Until it arrives the Learn row does not show.
  const [courses, setCourses] = useState<typeof import('../learn/content/courses.ts') | null>(null)
  useEffect(() => {
    if (!lastId) return
    let live = true
    void import('../learn/content/courses.ts').then((m) => { if (live) setCourses(m) })
    return () => { live = false }
  }, [lastId])
  const chapter = last && courses ? courses.getChapter(last.chapterId) : undefined
  const course = chapter && courses ? courses.getCourse(chapter.course)?.title ?? '' : ''
  const place = chapter && courses ? courses.chaptersFor(chapter.course).findIndex((c) => c.id === chapter.id) + 1 || chapter.number : 0

  const parts = [
    retroCount > 0 ? n(retroCount, 'question', 'questions') : '',
    waiting > 0 ? n(waiting, 'conversation', 'conversations') : '',
  ].filter(Boolean)
  const title = parts.length === 0 ? 'Nothing needs you today' : `${parts.join(' and ')} ${retroCount + waiting === 1 ? 'needs' : 'need'} you`

  const stats: Stat[] = [
    { label: 'Applied', value: applied.applied, sub: `${applied.week} in the last 7 days`, spark: { values: applied.days, label: `Applications per day over the last 14 days: ${applied.days.join(', ')}` } },
    { label: 'Held', value: applied.held, sub: blocked === 0 ? 'None wait on your answer' : `${blocked} ${blocked === 1 ? 'waits' : 'wait'} on your answer` },
    { label: 'Replies', value: replied, sub: waiting === 0 ? 'None wait on you' : `${waiting} ${waiting === 1 ? 'waits' : 'wait'} on you` },
    ...(prep ? [{ label: 'Prep confidence', value: `${prep.pct}%`, sub: `${prep.tried} of ${prep.total} tried` }] : []),
  ]

  const prepRows: PrepRow[] = []
  if (review) {
    prepRows.push({
      key: 'interview', icon: Mic,
      title: review.company ? `The ${review.company} interview` : 'The last interview',
      sub: `${review.analysis?.score != null ? `Scored ${review.analysis.score.toFixed(1)} out of 10` : 'Reviewed'} on ${shortDate(review.date)}`,
      next: 'Open the review', go: () => { location.hash = `#interviews/${encodeURIComponent(review.folder)}` },
    })
  }
  if (prep) prepRows.push({ key: 'prep', icon: ListChecks, title: 'Interview prep', sub: 'Check what you remember', next: 'Take the quick check', go: () => onTab('prep') })
  if (learnDue > 0) prepRows.push({ key: 'review', icon: GraduationCap, title: 'Learn reviews', sub: `${n(learnDue, 'card is', 'cards are')} due`, next: 'Review them', go: () => goLearn('/learn/review') })
  if (chapter && last) {
    const at = last.blockId ?? last.sectionId
    prepRows.push({ key: 'chapter', icon: BookOpen, title: chapter.title, sub: `You last read ${course ? `${course}, ` : ''}chapter ${place}`, next: 'Continue', go: () => goLearn(`/learn/chapter/${chapter.id}${at ? `#${at}` : ''}`) })
  }

  return (
    <>
      <PageHeader cap="Today" title={title} sub={hunt || undefined}>
        {retroCount > 0 && <button className="btn" onClick={() => onRetro()}><MessageCircleQuestionMark size={14} aria-hidden="true" />Open Retro</button>}
      </PageHeader>
      <div className="scroll today-page">
        <StatStrip stats={stats} />
        {open.length > 0 && (
          <section aria-label="Questions">
            <FilterRow cap="Questions" count={open.length}
              right={open.length > MAX_ROWS ? <button className="btn ghost small" onClick={() => onRetro()}>All {open.length} in Retro</button> : <span className="faint">{n(blocked, 'role is', 'roles are')} blocked</span>} />
            <DataTable label="Questions that block roles" columns={QUESTION_COLS} groups={[{ key: '', rows: open.slice(0, MAX_ROWS) }]} id={(it) => it.key} onRow={(it) => onRetro(it.key)} focusable />
          </section>
        )}
        {waiting > 0 && (
          <section aria-label="Conversations">
            <FilterRow cap="Conversations" count={waiting}
              right={waiting > MAX_ROWS ? <button className="btn ghost small" onClick={onOutreach}>All {waiting} in Outreach</button> : undefined} />
            <DataTable label="Conversations that wait on you" columns={PERSON_COLS} groups={[{ key: '', rows: waitingRows.slice(0, MAX_ROWS) }]} id={(c) => c.key} onRow={onOutreach} focusable />
          </section>
        )}
        {prepRows.length > 0 && (
          <section aria-label="Prepare">
            <FilterRow cap="Prepare" />
            <DataTable label="Preparation" columns={PREP_COLS} groups={[{ key: '', rows: prepRows }]} id={(r) => r.key} onRow={(r) => r.go()} focusable />
          </section>
        )}
      </div>
    </>
  )
}
