import { useEffect, useMemo, useState } from 'react'
import { Circle, CircleDashed, Hourglass, type LucideIcon } from 'lucide-react'
import { PageHeader } from './PageHeader.tsx'
import { StateLabel, Tile } from './Chip.tsx'
import { DataTable, FilterRow, Spark, StatStrip, type Column } from './ui.tsx'
import { FunnelSection, KeywordsSection, ScoresSection, SourcesSection } from './Retro.tsx'
import { analytics } from '../data/board.ts'
import { loadContacts, type Contact } from '../data/outreach.ts'
import { repliedCount } from '../data/retro.ts'
import type { Card } from '../data/types.ts'
import { CAMPAIGNS, contactsOf, dayOf, plain, stats, timeOf, type CampaignKey, type Run, type RunsData, type Stat } from '../data/campaigns.ts'
import { pct, type Tone } from './format.ts'
import { addr, go, usePath } from './nav.ts'
import { useCrumbs } from './crumbs.ts'

// Campaigns: each kind of run with its numbers, as a view over the run folders. It only reads. A run starts in chat with the
// command on the Settings tab.
type Tab = 'runs' | 'results' | 'settings'
const TABS: { key: Tab; label: string }[] = [{ key: 'runs', label: 'Runs' }, { key: 'results', label: 'Results' }, { key: 'settings', label: 'Settings' }]
const n = (k: number, one: string, many: string): string => `${k} ${k === 1 ? one : many}`

// A campaign's status in its tone. These are the three statuses campaigns.ts already gives, with no new one.
const STATUS: Record<Stat['status'], { tone: Tone; icon: LucideIcon }> = { Running: { tone: 'blue', icon: CircleDashed }, Paused: { tone: 'amber', icon: Hourglass }, Ready: { tone: 'gray', icon: Circle } }
const StatusWord = ({ status }: { status: Stat['status'] }) => <StateLabel tone={STATUS[status].tone} icon={STATUS[status].icon}>{status}</StateLabel>

const COLS: Column<Stat>[] = [
  {
    key: 'campaign', head: 'Campaign', cell: (s) => (
      <span className="who">
        <Tile name={s.campaign.title} />
        <span className="who-text">
          <span className="who-name">{s.campaign.title}</span>
          <span className="who-sub"><span title={s.reason}>{s.reason}</span></span>
        </span>
      </span>
    ),
  },
  { key: 'status', head: 'Status', className: 'c-status', cell: (s) => <StatusWord status={s.status} /> },
  { key: 'last', head: 'Last run', className: 'c-last', cell: (s) => <span className="num">{s.last ? dayOf(s.last.started) : '–'}</span> },
  { key: 'found', head: 'Found', className: 'c-num right', cell: (s) => <span className="num">{s.found}</span> },
  { key: 'applied', head: 'Applied', className: 'c-num right', cell: (s) => <span className="num">{s.applied}</span> },
  { key: 'replies', head: 'Replies', className: 'c-num right', cell: (s) => <span className="num">{s.replies}</span> },
  { key: 'held', head: 'Held', className: 'c-num right', cell: (s) => <span className="num">{s.held}</span> },
  { key: 'days', head: 'Last 14 days', className: 'c-spark right', cell: (s) => <Spark values={s.days} label={`Runs per day over the last 14 days for ${s.campaign.title}: ${s.days.join(', ')}`} /> },
]

export function Campaigns({ data, down, cards, onConversation }: { data: RunsData | null; down: boolean; cards: readonly Card[]; onConversation?: (ref: string) => void }) {
  const key = usePath()[1]
  const [tab, setTab] = useState<Tab>('runs')
  useEffect(() => setTab('runs'), [key])
  const all = useMemo(() => (data ? stats(data) : []), [data])
  const chosen = all.find((s) => s.campaign.key === key) ?? null
  useCrumbs(chosen ? [{ label: 'Campaigns', go: () => go('/campaigns') }, { label: chosen.campaign.title }] : [{ label: 'Campaigns' }])

  if (!data) {
    return (
      <>
        <PageHeader cap="Campaigns" title={down ? 'Campaigns could not load' : 'Loading campaigns'} sub={down ? 'Campaigns could not be read just now.' : undefined} />
      </>
    )
  }
  if (chosen) return <CampaignPage s={chosen} data={data} cards={cards} tab={tab} onTab={setTab} onConversation={onConversation} />

  const paused = all.filter((s) => s.status === 'Paused').length
  const hunts = all.filter((s) => !s.campaign.people)
  const sum = (f: (s: Stat) => number): number => hunts.reduce((t, s) => t + f(s), 0)
  const found = sum((s) => s.found)
  const applied = sum((s) => s.applied)
  const held = sum((s) => s.held)
  const replies = all.reduce((t, s) => t + s.replies, 0)
  const loose = data.runs.filter((r) => r.kind === 'hunt' && r.lanes.length === 0).length
  return (
    <>
      <PageHeader cap="Campaigns" title={`${n(all.length, 'campaign', 'campaigns')}${paused ? `, ${paused} paused` : ''}`} sub="Each kind of run, with its numbers for the last 14 days." />
      <div className="scroll campaigns-page">
        <StatStrip stats={[
          { label: 'Found', value: found, sub: 'roles in hunts' },
          { label: 'Applied', value: applied, sub: `${pct(applied, found)} of found` },
          { label: 'Replies', value: replies, sub: 'to applications and messages' },
          { label: 'Held', value: held, sub: 'waiting for you or the next hunt' },
        ]} />
        <FilterRow cap="Campaigns" count={all.length} />
        <DataTable label="Campaigns" columns={COLS} groups={[{ key: '', rows: all }]} id={(s) => s.campaign.key} onRow={(s) => go(addr('campaigns', s.campaign.key))} focusable />
        <p className="page-note">
          Role contacts and Hiring posts count people drafted, messages sent and replies from the people messaged.
          {loose > 0 && ` ${n(loose, 'run worked', 'runs worked')} single held roles, so no campaign shows ${loose === 1 ? 'it' : 'them'}.`}
        </p>
      </div>
    </>
  )
}

function CampaignPage({ s, data, cards, tab, onTab, onConversation }: { s: Stat; data: RunsData; cards: readonly Card[]; tab: Tab; onTab: (t: Tab) => void; onConversation?: (ref: string) => void }) {
  const c = s.campaign
  const l = s.last
  return (
    <>
      <PageHeader cap="Campaign" title={c.title} sub={`${s.status}. ${s.status === 'Ready' ? c.blurb : s.reason}`} />
      <div className="scroll campaigns-page">
        <StatStrip stats={[
          { label: c.people ? 'People drafted' : 'Found', value: l?.found ?? 0, sub: l ? `last run, ${dayOf(l.started)}` : 'never run' },
          { label: c.people ? 'Messages sent' : 'Applied', value: l?.applied ?? 0, sub: l ? (c.people ? `${pct(l.applied, l.found)} of drafted` : `${pct(l.applied, l.found)} of found`) : '' },
          { label: 'Held', value: l?.held ?? 0, sub: l && l.held > 0 ? 'waiting for you or the next hunt' : 'nothing waiting' },
          { label: 'Replies', value: l?.replies ?? 0, sub: l ? 'from the last run' : '' },
        ]} />
        <div className="filter-row campaign-tabs">
          <div className="tabs" role="tablist" aria-label="Campaign view">
            {TABS.map((t) => <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => onTab(t.key)}>{t.label}</button>)}
          </div>
        </div>
        {tab === 'runs' && <RunsTable runs={s.runs} openName={data.open?.name ?? null} people={c.people} />}
        {tab === 'results' && <div className="campaign-body"><Results s={s} cards={cards} onConversation={onConversation} /></div>}
        {tab === 'settings' && <div className="campaign-body"><Settings s={s} /></div>}
      </div>
    </>
  )
}

function took(r: Run, open: boolean): string {
  if (open) return 'Running'
  const min = Math.round((Date.parse(r.updated) - Date.parse(r.started)) / 60_000)
  return Number.isFinite(min) ? (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`) : '–'
}

function RunsTable({ runs, openName, people }: { runs: Run[]; openName: string | null; people: boolean }) {
  if (runs.length === 0) return <div className="empty small"><p>This campaign has not run yet.</p></div>
  return (
    <table className="table runs-table" aria-label="Runs">
      <colgroup><col className="c-started" /><col className="c-lanes" /><col className="c-num" /><col className="c-num" /><col className="c-num" /><col className="c-took" /><col /></colgroup>
      <thead>
        <tr><th>Started</th><th>Lanes</th><th className="right">{people ? 'Drafted' : 'Found'}</th><th className="right">{people ? 'Sent' : 'Applied'}</th><th className="right">Held</th><th className="right">Took</th><th>Go-ahead</th></tr>
      </thead>
      <tbody>
        {runs.map((r) => {
          const lanes = r.lanes.map((x) => LANE[x] ?? x).join(', ')
          const go = r.goAhead ? `"${plain(r.goAhead, 60)}"` : ''
          return (
            <tr key={r.name}>
              <td className="num">{dayOf(r.started)}, {timeOf(r.started)}</td>
              <td className="clip" title={lanes}>{lanes}</td>
              <td className="num right">{r.found}</td>
              <td className="num right">{r.applied}</td>
              <td className="num right">{r.held}</td>
              <td className="num right">{took(r, r.name === openName)}</td>
              <td className="clip faint" title={go}>{go}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

const LANE: Record<string, string> = { naukri: 'Naukri', hirist: 'Hirist', remote_boards: 'Remote boards', 'linkedin-ea': 'LinkedIn Easy Apply', 'linkedin-ex': 'LinkedIn external', roles: 'Role contacts', posts: 'Hiring posts' }

// The Retro numbers, cut to the rows this campaign's runs had on their boards. A person is not a role, so Hiring posts gets its own totals.
function Results({ s, cards, onConversation }: { s: Stat; cards: readonly Card[]; onConversation?: (ref: string) => void }) {
  const ids = useMemo(() => new Set(s.runs.flatMap((r) => r.ids)), [s.runs])
  const mine = useMemo(() => cards.filter((c) => ids.has(c.id)), [cards, ids])
  const a = useMemo(() => analytics(mine, true), [mine])
  const contacts = useMemo(loadContacts, [])
  const people = useMemo(() => contactsOf(contacts, s, mine.map((c) => c.company)), [contacts, s, mine])
  if (s.campaign.people) {
    const t = (f: (r: Run) => number): number => s.runs.reduce((k, r) => k + f(r), 0)
    const drafted = t((r) => r.found)
    return (
      <section className="retro-sec">
        <h2>{drafted === 0 ? 'No messages have been drafted yet.' : `${t((r) => r.applied)} of ${drafted} drafted messages were sent, and ${n(t((r) => r.replies), 'person', 'people')} replied.`}</h2>
        <p className="lead">Across {n(s.runs.length, 'run', 'runs')}.</p>
        <Communications people={people} onConversation={onConversation} />
      </section>
    )
  }
  if (a.found === 0) return <><div className="empty small"><p>No roles have been found by this campaign yet.</p></div><Communications people={people} onConversation={onConversation} /></>
  return (
    <section className="retro-numbers">
      <h2>{a.applied} of {a.found} roles found were applied to, {pct(a.applied, a.found)}.</h2>
      <FunnelSection a={a} replied={repliedCount(mine)} />
      <div className="retro-pair">
        <SourcesSection sources={a.sources} total={a.found} />
        <ScoresSection bins={a.matchBins} avg={a.avgMatch} scored={a.scoredCount} />
      </div>
      <KeywordsSection no={a.missingNo} partial={a.missingPartial} found={a.found} />
      <Communications people={people} onConversation={onConversation} />
    </section>
  )
}

// The people this campaign wrote to. A row opens that person's conversation on the Outreach screen. Nothing shows when there is none.
function Communications({ people, onConversation }: { people: Contact[]; onConversation?: (ref: string) => void }) {
  const rows = people.filter((c) => c.ref !== '')
  if (rows.length === 0 || !onConversation) return null
  return (
    <section className="retro-sec">
      <h2>Communications</h2>
      <ul className="comms">
        {rows.map((c) => <li key={c.key}><button className="btn ghost small" onClick={() => onConversation(c.ref)}>{c.name}<span className="faint">{c.status}{c.date ? `, ${dayOf(c.date)}` : ''}</span></button></li>)}
      </ul>
    </section>
  )
}

function Settings({ s }: { s: Stat }) {
  const c = s.campaign
  return (
    <dl>
      <div><dt>Lanes</dt><dd>{c.lanes}</dd></div>
      <div><dt>Start it with</dt><dd><code>{c.command}</code> in chat</dd></div>
      <div><dt>Limits it reads</dt><dd>{c.caps.length === 0 ? 'None' : c.caps.map((k) => <code key={k}>{k}</code>)}</dd></div>
    </dl>
  )
}
