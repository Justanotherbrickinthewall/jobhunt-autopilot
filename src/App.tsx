import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { getBoard, ledgerCount, listSessions } from './data/board.ts'
import type { Card } from './data/types.ts'
import { HuntActions, HuntFilters, type Mode } from './components/Toolbar.tsx'
import { ProblemsBanner } from './components/ProblemsBanner.tsx'
import { PageHeader } from './components/PageHeader.tsx'
import { Retro } from './components/Retro.tsx'
import { Prep } from './components/Prep.tsx'
import { Interviews } from './components/Interviews.tsx'
import { Profile } from './components/Profile.tsx'
import { Notebook } from './components/Notebook.tsx'
import { Rail, TopBar, JOBS_VIEWS, TAB_KEYS, type JobsView, type RunState, type Shortcut, type TabKey } from './components/Rail.tsx'
import { Outreach } from './components/Outreach.tsx'
import { Today } from './components/Today.tsx'
import { Campaigns } from './components/Campaigns.tsx'
import { claudeCard, useRuns } from './data/campaigns.ts'
import { dueCount, dueCountExact } from './learn/engine/review.ts'
import { useHeldRun } from './data/useHeldRun.ts'
import { appliedStats, unresolvedCount } from './data/retro.ts'
import { groupByWait, loadContacts } from './data/outreach.ts'
import { loadInterviews } from './data/interviews.ts'
import { lastHunt } from './components/format.ts'
import { ListView, type Group } from './components/ListView.tsx'
import { BoardView } from './components/BoardView.tsx'
import { Drawer } from './components/Drawer.tsx'
import { TabBoundary } from './components/TabBoundary.tsx'
const Learn = lazy(() => import('./learn/Learn.tsx'))
import { ReadAlongPill } from './reading/ReadAlong.tsx'
import { useHashTarget } from './reading/router.ts'
import { addr, go, usePath } from './components/nav.ts'
import { isTyping, toggleSet, toTop } from './util.ts'
import { NO_FILTERS, applyFilters, isFiltered, sortCards, type Filters, type Sort } from './components/rows.ts'

// One address per area. The Jobs views get their own: /hunt, /retro and /outreach.
const pathOf = (tab: TabKey, view: JobsView): string => `/${tab === 'jobs' ? view : tab}`
function placeOf(seg: string | undefined): { tab: TabKey; jobsView?: JobsView } | null {
  if (JOBS_VIEWS.some((j) => j.key === seg)) return { tab: 'jobs', jobsView: seg as JobsView }
  return TAB_KEYS.includes(seg as TabKey) && seg !== 'jobs' ? { tab: seg as TabKey } : null
}

// View preferences live in this browser only. Storage can be missing or blocked, so every access is guarded.
// v3 holds six areas, with Hunt and Retro folded into Jobs as a view. v2 saved them as tabs of their own.
interface Prefs { tab: TabKey; jobsView: JobsView; mode: Mode; grouped: boolean; showDropped: boolean }
const PREFS_KEY = 'hunt-board:prefs:v3'
const OLD_PREFS_KEY = 'hunt-board:prefs:v2'
const DEFAULT_PREFS: Prefs = { tab: 'today', jobsView: 'hunt', mode: 'board', grouped: false, showDropped: false }
const read = (key: string): Record<string, unknown> | null => {
  const raw: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
  return typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : null
}
// A stored value is kept only when it is one the app still knows.
function loadPrefs(): Prefs {
  try {
    const v3 = read(PREFS_KEY)
    const p = v3 ?? read(OLD_PREFS_KEY) ?? {}
    const old = v3 === null && (p.tab === 'hunt' || p.tab === 'retro')
    return {
      tab: old ? 'jobs' : TAB_KEYS.includes(p.tab as TabKey) ? (p.tab as TabKey) : DEFAULT_PREFS.tab,
      jobsView: old ? (p.tab as JobsView) : JOBS_VIEWS.some((j) => j.key === p.jobsView) ? (p.jobsView as JobsView) : DEFAULT_PREFS.jobsView,
      // With no saved choice a phone starts on the list, because the board needs a sideways scroll.
      mode: p.mode === 'list' || p.mode === 'board' ? p.mode : window.matchMedia('(max-width: 900px)').matches ? 'list' : DEFAULT_PREFS.mode,
      grouped: typeof p.grouped === 'boolean' ? p.grouped : DEFAULT_PREFS.grouped,
      showDropped: typeof p.showDropped === 'boolean' ? p.showDropped : DEFAULT_PREFS.showDropped,
    }
  } catch { return DEFAULT_PREFS }
}

const HUNT_KEYS: Shortcut[] = [
  { keys: ['j', 'k'], label: 'Move' },
  { keys: ['Enter'], label: 'Open' },
  { keys: ['Esc'], label: 'Close' },
  { keys: ['/'], label: 'Search' },
]

export function App() {
  const sessions = useMemo(listSessions, [])
  const allCount = useMemo(ledgerCount, [])
  const [huntSel, setHuntSel] = useState('all')
  const board = useMemo(() => getBoard(huntSel), [huntSel])
  // Retro runs across every hunt, so it reads the All view whatever the hunt filter picked for Hunt.
  const allBoard = useMemo(() => (huntSel === 'all' ? board : getBoard('all')), [huntSel, board])
  const session = huntSel !== 'all'

  // Rail counts. Retro's comes from the same data and function as the Retro screen's own number.
  const held = useHeldRun()
  const runs = useRuns()
  const card = useMemo(() => claudeCard(runs.data), [runs.data])
  const run: RunState = runs.data?.open ? 'live' : runs.down && !runs.data ? 'offline' : 'idle'
  const people = useMemo(() => { const c = loadContacts(); return { all: c.length, waiting: groupByWait(c).you.length } }, [])
  const interviewCount = useMemo(() => loadInterviews().interviews.length, [])
  // A bare / opens the last area used.
  const [prefs, setPrefs] = useState(loadPrefs)
  const [retroFocus, setRetroFocus] = useState<string | null>(null)
  const [outreachFocus, setOutreachFocus] = useState<string | null>(null)
  // The address decides the area (src/components/nav.ts). Learn keeps its own router below /learn. prefs only remembers the last area, for a bare /.
  const segs = usePath()
  // The interview question bank lives in Interview prep, but old /learn/interview links still resolve to it.
  const legacyBank = segs[0] === 'learn' && segs[1] === 'interview'
  const here = legacyBank ? { tab: 'prep' as TabKey } : placeOf(segs[0])
  const tab: TabKey = here?.tab ?? prefs.tab
  const jobsView: JobsView = here?.jobsView ?? prefs.jobsView
  useEffect(() => {
    if (legacyBank) { const q = new URLSearchParams(location.search).get('q'); go(q ? addr('prep', 'bank', q) : addr('prep', 'bank'), { replace: true }) }
    else if (!here) go(pathOf(prefs.tab, prefs.jobsView), { replace: true })
    else setPrefs((p) => (p.tab === here.tab && (!here.jobsView || p.jobsView === here.jobsView) ? p : { ...p, tab: here.tab, jobsView: here.jobsView ?? p.jobsView }))
  }, [legacyBank, here?.tab, here?.jobsView])
  useEffect(() => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)) } catch { /* storage unavailable */ } }, [prefs])
  const setPref = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setPrefs((p) => ({ ...p, [k]: v }))

  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [sort, setSort] = useState<Sort>({ key: 'match', dir: 'desc' })
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const order = useMemo(() => board.columns.map((c) => c.key), [board])
  const allCards = useMemo(() => board.columns.flatMap((c) => c.cards), [board])
  const retroCards = useMemo(() => allBoard.columns.flatMap((c) => c.cards), [allBoard])
  // Dropped roles stay out of both views unless Display shows them or the Status filter asks for them.
  const showDropped = prefs.showDropped || filters.columns.includes('dropped')
  const shown = useMemo(
    () => sortCards(applyFilters(allCards, filters).filter((c) => showDropped || c.column !== 'dropped'), sort, order),
    [allCards, filters, sort, order, showDropped],
  )
  const columns = useMemo(() => order.map((key) => ({ key, cards: shown.filter((c) => c.column === key) })), [order, shown])
  const groups: Group[] = useMemo(
    () => (prefs.grouped ? columns.filter((g) => g.cards.length > 0) : [{ key: '', cards: shown }]),
    [prefs.grouped, columns, shown],
  )
  // The order j and k walk: the rows as drawn in the list, or column by column on the board.
  const nav = useMemo(
    () => (prefs.mode === 'board' ? columns.flatMap((c) => c.cards) : groups.flatMap((g) => (collapsed.has(g.key) ? [] : g.cards))),
    [prefs.mode, columns, groups, collapsed],
  )
  const byId = useMemo(() => new Map(allCards.map((c) => [c.id, c])), [allCards])
  const retroById = useMemo(() => new Map(retroCards.map((c) => [c.id, c])), [retroCards])
  const retroCount = useMemo(() => unresolvedCount(retroCards, held.jobs), [retroCards, held.jobs])
  const applied = useMemo(() => appliedStats(retroCards), [retroCards])
  // The cheap deck count shows until Learn has been open once. From then on the exact count, which matches the Review page, replaces it.
  const [exactDue, setExactDue] = useState<number | null>(null)
  const seenLearn = useRef(false)
  // The Hunt title counts the roles held now, in every hunt. The sub line describes the latest hunt from its own board.
  const heldCount = allBoard.columns.find((c) => c.key === 'held')?.cards.length ?? 0
  const heldTitle = heldCount === 0 ? 'Nothing needs you' : `${heldCount} ${heldCount === 1 ? 'role needs' : 'roles need'} you`
  const latest = useMemo(() => (sessions[0] ? { sortKey: sessions[0].sortKey, a: getBoard(sessions[0].name).analytics } : null), [sessions])
  const lastLine = latest ? lastHunt(latest.sortKey, latest.a.found, latest.a.applied) : ''
  const huntSub = [retroCount > 0 ? `Retro has ${retroCount} open ${retroCount === 1 ? 'question' : 'questions'}.` : '', lastLine].filter(Boolean).join(' ') || undefined
  const learnDue = exactDue ?? dueCount()
  const retro = tab === 'jobs' && jobsView === 'retro'
  // The drawer opens over Hunt for a card on the board, and over Retro for any row.
  const drawerIds = retro ? retroById : byId
  const openCard = openId ? drawerIds.get(openId) ?? null : null
  // A link to a role not on the board must not leave the drawer marked open.
  useEffect(() => { if (openId && !drawerIds.has(openId)) setOpenId(null) }, [openId, drawerIds])

  const changeHunt = (v: string) => {
    setHuntSel(v)
    setSelectedId(null)
    setOpenId(null)
    setCollapsed(new Set())
  }
  const open = (c: Card) => { setSelectedId(c.id); setOpenId(c.id) }

  // Closing the drawer while focus is inside it would strand focus on an inert element, so hand it back
  // to the selected card or row.
  const closeDrawer = () => {
    const inside = (document.activeElement as HTMLElement | null)?.closest?.('.drawer')
    setOpenId(null)
    const sel = live.current.selectedId
    if (inside && sel) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-id="${CSS.escape(sel)}"]`)?.focus({ preventScroll: true }))
  }
  // On a phone the drawer covers the page, so Back closes it. It takes one history entry while open.
  const drawerOpen = Boolean(openId)
  useEffect(() => {
    if (!drawerOpen || !window.matchMedia('(max-width: 900px)').matches) return
    history.pushState({ drawer: true }, '')
    const pop = () => setOpenId(null)
    window.addEventListener('popstate', pop)
    return () => { window.removeEventListener('popstate', pop); if (history.state?.drawer) history.back() }
  }, [drawerOpen])
  // The window scrolls under 900px, so every change of area or Jobs view starts at the top.
  useEffect(toTop, [tab, jobsView])
  const closeRef = useRef(closeDrawer)
  closeRef.current = closeDrawer


  useEffect(() => {
    if (tab === 'learn') seenLearn.current = true
    if (seenLearn.current) void dueCountExact().then(setExactDue, () => undefined)
  }, [tab])
  const today = tab === 'today'
  const campaigns = tab === 'campaigns'
  const hunt = tab === 'jobs' && jobsView === 'hunt'
  const prep = tab === 'prep'
  const interviews = tab === 'interviews'
  const profile = tab === 'profile'
  const notebook = tab === 'notebook'
  const learn = tab === 'learn'
  const live = useRef({ nav, selectedId, openId, hunt })
  live.current = { nav, selectedId, openId, hunt }
  // Leaving by a tab or a Learn link with the drawer open strands its history entry. Back then lands on it with nothing open, so step over it.
  useEffect(() => {
    const skip = () => { if (history.state?.drawer && !live.current.openId) history.back() }
    window.addEventListener('popstate', skip)
    return () => window.removeEventListener('popstate', skip)
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement
      const typing = isTyping(t)
      // Off the Hunt tab only Escape works, to close the drawer over Retro.
      if (!live.current.hunt) { if (e.key === 'Escape' && !typing && live.current.openId) { e.preventDefault(); closeRef.current() } return }
      if (e.key === '/' && !typing) { e.preventDefault(); searchRef.current?.focus(); return }
      if (typing) return
      const { nav: list, selectedId: sel, openId: opened } = live.current
      if (e.key === 'Escape') { if (opened) { e.preventDefault(); closeRef.current() } return }
      if (e.key === 'Enter') {
        // Enter opens the focused card or row, and makes it the selection. With no card focused it opens
        // the selected role. Other buttons, links and summaries keep their own Enter behaviour.
        const focusedId = t.closest?.<HTMLElement>('[data-id]')?.dataset.id
        if (focusedId && list.some((c) => c.id === focusedId)) { e.preventDefault(); setSelectedId(focusedId); setOpenId(focusedId); return }
        if (t.closest?.('button, a, summary')) return
        if (sel && list.some((c) => c.id === sel)) { e.preventDefault(); setOpenId(sel) }
        return
      }
      const step = e.key === 'j' || e.key === 'ArrowDown' ? 1 : e.key === 'k' || e.key === 'ArrowUp' ? -1 : 0
      if (!step || list.length === 0) return
      e.preventDefault()
      const i = list.findIndex((c) => c.id === sel)
      const next = list[i < 0 ? 0 : Math.min(list.length - 1, Math.max(0, i + step))]
      setSelectedId(next.id)
      if (opened) setOpenId(next.id)
      // Focus follows the selection, so a later Enter or click cannot act on a stale focused control.
      const el = document.querySelector<HTMLElement>(`[data-id="${CSS.escape(next.id)}"]`)
      if (el?.tagName === 'BUTTON') el.focus({ preventScroll: true })
      else if ((document.activeElement as HTMLElement | null)?.closest?.('button, a, summary')) (document.activeElement as HTMLElement).blur()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!selectedId) return
    document.querySelector(`[data-id="${CSS.escape(selectedId)}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [selectedId, prefs.mode])

  const changeTab = (t: TabKey) => {
    if (t !== tab) setOpenId(null)
    go(pathOf(t, jobsView))
  }
  const changeJobsView = (v: JobsView) => {
    setRetroFocus(null)
    setOutreachFocus(null)
    if (!(tab === 'jobs' && jobsView === v)) setOpenId(null)
    go(pathOf('jobs', v))
  }

  // A followed link switches the tab. A role outside the current hunt opens from All roles.
  const target = useHashTarget()
  useEffect(() => {
    if (!target) return
    if (target.tab === 'hunt' || target.tab === 'retro') {
      // Retro covers every row, so the hunt filter stays as it is there.
      if (target.tab === 'hunt' && target.role && huntSel !== 'all' && !byId.has(target.role)) changeHunt('all')
      go(pathOf('jobs', target.tab as JobsView))
      if (target.role) { setSelectedId(target.role); setOpenId(target.role) }
    } else if (tab !== target.tab) changeTab(target.tab)   // in its own area the page opens the link itself
  }, [target])
  const toggleGroup = (k: string) => setCollapsed((s) => toggleSet(s, k))

  // A click outside the drawer closes it. The listener goes on after a tick, so the click that opened the drawer misses it.
  const drawerShown = Boolean(openCard) && (hunt || retro)
  useEffect(() => {
    if (!drawerShown) return
    const onClick = (e: MouseEvent) => {
      const t = e.target
      if (!(t instanceof Element) || !t.isConnected || !window.getSelection()?.isCollapsed) return
      if (t.closest('.drawer, .rd-pill, [data-id]')) return   // [data-id] is a card or row: it switches the drawer instead
      closeRef.current()
    }
    const timer = setTimeout(() => document.addEventListener('click', onClick), 0)
    return () => { clearTimeout(timer); document.removeEventListener('click', onClick) }
  }, [drawerShown])

  return (
    <div className={`app${openCard ? ' drawer-open' : ''}`}>
      <TopBar tab={tab} jobsView={jobsView} run={run} retro={retroCount} shortcuts={hunt ? HUNT_KEYS : []}
        onRetro={() => changeJobsView('retro')} onSearch={() => { changeJobsView('hunt'); setTimeout(() => searchRef.current?.focus(), 0) }} />
      <Rail tab={tab} jobsView={jobsView} onTab={changeTab} onJobsView={changeJobsView} claude={card} run={run} cooldownUntil={runs.data?.cooldownUntil ?? null} stats={applied}
        counts={{ roles: retroCards.filter((c) => c.column !== 'dropped').length, problems: allBoard.problems.length, retro: retroCount, people: people.all, waiting: people.waiting, interviews: interviewCount, learn: learnDue }} />
      <main className="main">
        {learn ? (
          <TabBoundary label="Learn" key="learn"><Suspense fallback={<div className="scroll"><div className="empty">Loading Learn…</div></div>}><Learn /></Suspense></TabBoundary>
        ) : today ? (
          <TabBoundary label="Today" key="today">
            <Today sessions={sessions} cards={retroCards} jobs={held.jobs} retroCount={retroCount} learnDue={learnDue} onTab={changeTab}
              onRetro={(key) => { changeJobsView('retro'); setRetroFocus(key ?? null) }} onOutreach={() => changeJobsView('outreach')} />
          </TabBoundary>
        ) : campaigns ? (
          <TabBoundary label="Campaigns" key="campaigns"><Campaigns data={runs.data} down={runs.down} cards={retroCards} onConversation={(ref) => { changeJobsView('outreach'); setOutreachFocus(ref) }} /></TabBoundary>
        ) : prep ? (
          <TabBoundary label="Prep" key="prep"><Prep target={target} /></TabBoundary>
        ) : interviews ? (
          <TabBoundary label="Interviews" key="interviews"><Interviews target={target} /></TabBoundary>
        ) : profile ? (
          <TabBoundary label="Profile" key="profile"><Profile target={target} /></TabBoundary>
        ) : notebook ? (
          <TabBoundary label="Notebook" key="notebook"><Notebook target={target} /></TabBoundary>
        ) : jobsView === 'outreach' ? (
          <TabBoundary label="Outreach" key="outreach"><Outreach focus={outreachFocus} /></TabBoundary>
        ) : board.empty ? (
          <div className="empty">
            <PageHeader cap="Hunt" title="No hunts yet" />
            <h1>No hunts yet</h1>
            <p>Run <code>/hunt</code> first, then reload this page.</p>
          </div>
        ) : retro ? (
          <TabBoundary label="Retro" key="retro"><Retro a={allBoard.analytics} cards={retroCards} held={held} onOpen={open} focusKey={retroFocus} /></TabBoundary>
        ) : (<TabBoundary label="Hunt" key="hunt">
          <PageHeader cap="Hunt" title={heldTitle} sub={huntSub}>
            <HuntActions mode={prefs.mode} onMode={(m) => setPref('mode', m)} sort={sort} onSort={setSort} grouped={prefs.grouped} onGrouped={(g) => setPref('grouped', g)}
              showDropped={prefs.showDropped} onShowDropped={(v) => setPref('showDropped', v)} />
          </PageHeader>
          <HuntFilters shown={shown.length} filters={filters} onFilters={setFilters} hunts={sessions} allCount={allCount} hunt={huntSel} onHunt={changeHunt}
            sources={board.analytics.sources} columns={board.columns.map((c) => ({ key: c.key, count: c.cards.length }))} searchRef={searchRef} />
          <div className="scroll hunt-scroll">
            <ProblemsBanner problems={board.problems} />
            {allCards.length === 0 ? (
              <div className="empty small"><p>No roles in this view yet.</p></div>
            ) : shown.length === 0 && isFiltered(filters) ? (
              <div className="empty small">
                <p>No roles match these filters.</p>
                <button className="btn" onClick={() => setFilters(NO_FILTERS)}>Clear filters</button>
              </div>
            ) : prefs.mode === 'list' ? (
              <ListView
                groups={groups}
                collapsed={collapsed}
                onToggleGroup={toggleGroup}
                sort={sort}
                onSort={setSort}
                selectedId={selectedId}
                openId={openId}
                onOpen={open}
              />
            ) : (
              <BoardView columns={columns} selectedId={selectedId} openId={openId} onOpen={open} />
            )}
          </div>
        </TabBoundary>)}
        <div id="rd-slot" className="rd-slot" />
      </main>
      <Drawer card={hunt || retro ? openCard : null} session={hunt && session} onClose={closeDrawer} jump={target} appTab={retro ? 'retro' : 'hunt'} />
      <ReadAlongPill inDrawer={drawerShown} />
    </div>
  )
}
