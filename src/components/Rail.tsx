import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Bell, Bookmark, Briefcase, CalendarDays, ClipboardCopy, Crosshair, GraduationCap, Hourglass, Keyboard, Layers, ListChecks,
  MessageCircleQuestionMark, Mic, Monitor, Moon, Search, Send, Sparkles, Sun, UserRound, type LucideIcon,
} from 'lucide-react'
import { Menu } from './Menu.tsx'
import { progressBlock } from '../data/progress-sync.ts'
import { Spark } from './ui.tsx'
import { useTrail } from './crumbs.ts'
import { timeOf, type ClaudeCard } from '../data/campaigns.ts'
import type { AppliedStats } from '../data/retro.ts'

// The eight areas. Adding one means adding an entry here and a branch in App.
export type TabKey = 'today' | 'campaigns' | 'jobs' | 'interviews' | 'prep' | 'profile' | 'learn' | 'notebook'
export type JobsView = 'hunt' | 'retro' | 'outreach'
export const TAB_KEYS: readonly TabKey[] = ['today', 'campaigns', 'jobs', 'interviews', 'prep', 'profile', 'learn', 'notebook']
export const JOBS_VIEWS: { key: JobsView; label: string; hint: string }[] = [
  { key: 'hunt', label: 'Hunt', hint: 'The working view: every role and where it stands' },
  { key: 'retro', label: 'Retro', hint: 'The questions that block roles, then the hunt numbers' },
  { key: 'outreach', label: 'Outreach', hint: 'The people you have contacted and who replied' },
]

type CountKey = 'roles' | 'retro' | 'people' | 'interviews' | 'learn'
interface Place { tab: TabKey; view?: JobsView; label: string; hint: string; icon: LucideIcon; count?: CountKey }
const view = (key: JobsView, icon: LucideIcon, count: CountKey): Place => {
  const v = JOBS_VIEWS.find((j) => j.key === key) as (typeof JOBS_VIEWS)[number]
  return { tab: 'jobs', view: key, label: v.label, hint: v.hint, icon, count }
}
// Two groups. Jobs is the hunt and its runs; Prepare is everything read before an interview.
const GROUPS: { label: string; items: Place[] }[] = [
  { label: 'Jobs', items: [
    { tab: 'today', label: 'Today', hint: 'What needs you today', icon: CalendarDays },
    { tab: 'campaigns', label: 'Campaigns', hint: 'Each kind of run, with its numbers', icon: Layers },
    view('hunt', Briefcase, 'roles'),
    view('retro', MessageCircleQuestionMark, 'retro'),
    view('outreach', Send, 'people'),
  ] },
  { label: 'Prepare', items: [
    { tab: 'interviews', label: 'Interviews', hint: 'Reviews and transcripts of your interviews, from /interview', icon: Mic, count: 'interviews' },
    { tab: 'prep', label: 'Interview prep', hint: 'Interview preparation: questions, answers and a glossary', icon: ListChecks },
    { tab: 'profile', label: 'Profile', hint: 'Your profile, work portfolio and screening answers, to re-read before an interview', icon: UserRound },
    { tab: 'learn', label: 'Learn', hint: 'Courses, chapters, labs and graded interview practice', icon: GraduationCap, count: 'learn' },
    { tab: 'notebook', label: 'Notebook', hint: 'The passages you bookmarked, filed in collections, with a crib sheet for each', icon: Bookmark },
  ] },
]
const isHere = (p: Place, tab: TabKey, jobsView: JobsView): boolean => p.tab === tab && (!p.view || p.view === jobsView)

// The theme follows the system until the reader picks one. index.html applies the saved choice before
// the first paint, and this button keeps the root element in step after a click.
type Theme = 'system' | 'light' | 'dark'
const THEME_KEY = 'hunt-board:theme:v1'
const NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' }
const THEME_ICON: Record<Theme, LucideIcon> = { system: Monitor, light: Sun, dark: Moon }

function loadTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch { return 'system' }
}

function ThemeButton() {
  const [theme, setTheme] = useState(loadTheme)
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme
    try {
      if (theme === 'system') localStorage.removeItem(THEME_KEY)
      else localStorage.setItem(THEME_KEY, theme)
    } catch { /* storage unavailable */ }
  }, [theme])
  const label = `Theme: ${theme}. Switch to ${NEXT[theme]}.`
  const Icon = THEME_ICON[theme]
  return <button className="icon-btn" onClick={() => setTheme(NEXT[theme])} aria-label={label} title={label}><Icon size={16} /></button>
}

export interface Shortcut { keys: string[]; label: string }
export type RunState = 'live' | 'idle' | 'offline'
const RUN_WORD: Record<RunState, string> = { live: 'Live', idle: 'Idle', offline: 'Offline' }

interface TopProps {
  tab: TabKey
  jobsView: JobsView
  run: RunState
  retro: number
  onRetro: () => void
  onSearch: () => void
  shortcuts: Shortcut[]
}

// The 52px bar over every screen: the brand, the group and the page, then the run mark and four buttons. There is no applied meter, because it has no real limit to count against.
export function TopBar({ tab, jobsView, run, retro, onRetro, onSearch, shortcuts }: TopProps) {
  const group = GROUPS.find((g) => g.items.some((p) => isHere(p, tab, jobsView))) ?? GROUPS[0]
  const page = group.items.find((p) => isHere(p, tab, jobsView))
  // A page that sets a trail replaces the page label with it. The area comes first and is never a link.
  const set = useTrail()
  const crumbs = set.length > 0 ? set : page ? [{ label: page.label }] : []
  return (
    <header className="topbar">
      <div className="tb-brand"><Crosshair size={18} aria-hidden="true" />Job hunt</div>
      <nav className="tb-trail" aria-label="Breadcrumb">
        <span className="tb-group"><span className="tb-sq" aria-hidden="true">{group.label[0]}</span>{group.label}</span>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1
          return (
            <Fragment key={i}>
              <span className="tb-sep" aria-hidden="true">{'\u203A'}</span>
              {last || !c.go
                ? <span className={`tb-crumb${last ? ' last' : ''}`} title={c.label} aria-current={last ? 'page' : undefined}>{c.label}</span>
                : <button type="button" className="tb-crumb" title={c.label} onClick={c.go}>{c.label}</button>}
            </Fragment>
          )
        })}
      </nav>
      <span className={`tb-live ${run}`}><i aria-hidden="true" />{RUN_WORD[run]}</span>
      <span className="tb-icons">
        <button className="icon-btn" onClick={onRetro} aria-label={retro > 0 ? `Retro: ${retro} open questions` : 'Retro'} title={retro > 0 ? `${retro} open ${retro === 1 ? 'question' : 'questions'} in Retro` : 'Open Retro'}>
          <Bell size={16} />{retro > 0 && <i className="badge" aria-hidden="true" />}
        </button>
        <button className="icon-btn" onClick={onSearch} aria-label="Search roles" title="Search roles (/)"><Search size={16} /></button>
        <Menu trigger="icon-btn" align="right" title="Keyboard shortcuts" label={<><Keyboard size={16} /><span className="vh">Keyboard shortcuts</span></>}>
          {() => shortcuts.length === 0
            ? <p className="menu-note">No shortcuts on this screen.</p>
            : <dl className="keys">{shortcuts.map((s) => (
              <div key={s.label}><dt>{s.keys.map((k) => <kbd key={k}>{k}</kbd>)}</dt><dd>{s.label}</dd></div>
            ))}</dl>}
        </Menu>
        <Menu trigger="icon-btn" align="right" title="Progress" label={<><ClipboardCopy size={16} /><span className="vh">Progress</span></>}>
          {(close) => <button type="button" className="menu-item" onClick={() => { void navigator.clipboard.writeText(progressBlock()).catch(() => {}); close() }}>Copy progress</button>}
        </Menu>
        <ThemeButton />
      </span>
    </header>
  )
}

interface RailCounts { roles: number; problems: number; retro: number; people: number; waiting: number; interviews: number; learn: number }

interface Props {
  tab: TabKey
  jobsView: JobsView
  onTab: (t: TabKey) => void
  onJobsView: (v: JobsView) => void
  counts: RailCounts
  claude: ClaudeCard
  run: RunState
  cooldownUntil: string | null
  stats: AppliedStats
}

export function Rail({ tab, jobsView, onTab, onJobsView, counts, claude, run, cooldownUntil, stats }: Props) {
  const nav = useRef<HTMLElement>(null)
  // Under 900px the rail is a bar that scrolls sideways, so bring the current item into view when it changes.
  useEffect(() => {
    // scrollTo on the bar itself, not scrollIntoView, which would also move the window to centre the item.
    const bar = nav.current
    const item = bar?.querySelector<HTMLElement>('[aria-current]')
    if (!bar || !item || !window.matchMedia('(max-width: 900px)').matches) return
    const gap = item.getBoundingClientRect().left - bar.getBoundingClientRect().left
    bar.scrollTo({ left: bar.scrollLeft + gap - (bar.clientWidth - item.offsetWidth) / 2 })
  }, [tab, jobsView])

  const plain = (n: number): ReactNode => (n > 0 ? <span className="rail-count num">{n}</span> : null)
  // A count that needs the candidate is a harbor pill. Hunt's red dot means a ledger file failed to read.
  const marks = (p: Place): ReactNode => {
    if (p.tab === 'campaigns') {
      if (run === 'live') return <Send size={13} className="rail-mark live" aria-label="A run is open" />
      return cooldownUntil ? <Hourglass size={13} className="rail-mark warm" aria-label={`LinkedIn paused until ${timeOf(cooldownUntil)}`} /> : null
    }
    switch (p.count) {
      case 'roles': return <>{plain(counts.roles)}{counts.problems > 0 && <span className="rail-alert num" title={`${counts.problems} files could not be read`}><i aria-hidden="true" />{counts.problems}</span>}</>
      case 'retro': return counts.retro > 0 ? <span className="rail-count need num">{counts.retro}</span> : null
      case 'people': return <>{plain(counts.people)}{counts.waiting > 0 && <span className="rail-count need num" title={`${counts.waiting} wait on you`}>{counts.waiting}</span>}</>
      case 'interviews': return plain(counts.interviews)
      case 'learn': return plain(counts.learn)
      default: return null
    }
  }
  const go = (p: Place) => (p.view ? onJobsView(p.view) : onTab(p.tab))
  const decided = stats.applied + stats.held
  const foot = run === 'offline' ? 'Runs unavailable' : claude.title

  return (
    <nav className="rail nav-rail" aria-label="Sections" ref={nav}>
      <button className="rail-card" onClick={() => onTab('campaigns')} title="Open Campaigns">
        <span className="rc-fig"><b className="num">{stats.applied}</b><span>applied, {stats.held} held</span></span>
        <span className="rc-bar" aria-hidden="true"><i style={{ width: `${decided > 0 ? (stats.applied / decided) * 100 : 0}%` }} /></span>
        <Spark values={stats.days} className="rc-spark" label={`Applications per day over the last 14 days: ${stats.days.join(', ')}`} />
        <span className="rc-foot">
          <span className={`run-dot ${run}`} aria-hidden="true" />
          <span className="rc-run">{foot}</span>
          {cooldownUntil && <span className="rc-warm" title="LinkedIn security cooldown"><Hourglass size={12} aria-hidden="true" />{timeOf(cooldownUntil)}</span>}
        </span>
      </button>
      {GROUPS.map((g) => (
        <ul className="rail-list" key={g.label} aria-label={g.label}>
          <li className="rail-label" aria-hidden="true">{g.label}</li>
          {g.items.map((p) => {
            const Icon = p.icon
            return (
              <li key={p.label}>
                <button className="rail-item" aria-current={isHere(p, tab, jobsView) ? 'page' : undefined} title={p.hint} onClick={() => go(p)}>
                  <Icon size={16} aria-hidden="true" />
                  <span className="grow rail-text">{p.label}</span>
                  {marks(p)}
                </button>
              </li>
            )
          })}
        </ul>
      ))}
      <div id="rail-dock" className="rail-dock" />
      <div className="agent">
        <span className="agent-tile" aria-hidden="true"><Sparkles size={15} /><i className={`run-dot ${run}`} /></span>
        <span className="agent-text">
          <b>{run === 'live' ? claude.title : 'Claude'}</b>
          <span>{run === 'offline' ? 'Server not answering' : claude.lines[0]}</span>
        </span>
      </div>
    </nav>
  )
}
