import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PrepContent, PrepQuestion, PrepTab, QuickRefCard } from '../data/prepTypes.ts'
import { checkCount, hasAnyContent, loadPractised, loadPrepSources, matches, savePractised, tabHasContent, tabQuestions, type PrepSource } from '../data/prep.ts'
import { isTyping, toTop } from '../util.ts'
import { Check, Search } from 'lucide-react'
import { Menu } from './Menu.tsx'
import { ListDetail, ListRow } from './ui.tsx'
import { PageHeader } from './PageHeader.tsx'
import { ProblemsBanner } from './ProblemsBanner.tsx'
import { PrepQuestionCard, QuestionBody, QuestionTitle } from './PrepQuestion.tsx'
import { PrepGlossary } from './PrepGlossary.tsx'
import { PrepRoom } from './PrepRoom.tsx'
import { PrepDrill, type DrillSummary } from './PrepDrill.tsx'
import { drillable, quickCheck } from '../data/prepRecall.ts'
import { sectionConfidence } from '../data/prepConfidence.ts'
import { QuestionFlag } from './PrepFlag.tsx'
import { addr, go, leave, usePath } from './nav.ts'
import { useCrumbs } from './crumbs.ts'
import { isTaken, reveal, take, type Target } from '../reading/router.ts'

const Bank = lazy(() => import('../learn/Bank.tsx'))

const PHONE = import.meta.env.VITE_PHONE === '1'
const PROBLEMS_LABEL = (n: number) => `${n} prep content ${n === 1 ? 'problem' : 'problems'}`

// The Prep tab: an interview-prep document read from my-profile/interview-prep/*.json.
export function Prep({ target }: { target: Target | null }) {
  const sources = loadPrepSources()
  const source = sources[0]

  if (!source || !hasAnyContent(source.content)) {
    return (
      <div className="scroll">
        <div className="empty">
          <h1>No prep content yet</h1>
          <p>Interview preparation hasn't been set up yet.</p>
          {PHONE ? <p className="muted">This copy was built without any.</p> : <p className="muted">Run <code>/setup</code> in chat and choose interview preparation.</p>}
          {source && <ProblemsBanner problems={source.content.problems} label={PROBLEMS_LABEL} />}
        </div>
      </div>
    )
  }
  return <PrepFlow source={source} target={target} />
}

const ROOM = '/prep'
// The address decides the screen: /prep is the room, /prep/questions[/section[/question]] the ledger, /prep/drill/section[/question] a section drill,
// /prep/check a quick check and /prep/bank[/question] the course question bank. A link to a question opens the ledger.
function PrepFlow({ source, target }: { source: PrepSource; target: Target | null }) {
  const { content } = source
  const [, sub, a, b] = usePath()
  const [last, setLast] = useState<DrillSummary | null>(null)
  // Already in the ledger, it opens the link itself.
  useEffect(() => { if (target?.tab === 'prep' && !isTaken(target) && sub !== 'questions') go(addr('prep', 'questions'), { replace: true }) }, [target])
  useEffect(toTop, [sub])   // room, drill, ledger and bank each start at the top of the page
  const back = () => leave(ROOM)
  const done = (s: DrillSummary | null) => { setLast(s); back() }
  if (sub === 'bank') return <BankScreen selected={a ?? null} />
  if (sub === 'questions') return <PrepView source={source} target={target} section={a} sel={b} onBack={back} />
  if (sub === 'check') return <QuickCheck tabs={content.tabs} onExit={done} />
  const drill = sub === 'drill' ? content.tabs.find((t) => t.id === a) : undefined
  if (drill && drillable(drill).length > 0) {
    return <PrepDrill key={drill.id} pool={drillable(drill)} title={drill.title} section={drill.id} first={b} readiness={() => sectionConfidence(drillable(drill)).pct} onExit={done} />
  }
  return <PrepRoom content={content} last={last} onSection={(t) => go(addr('prep', 'drill', t.id))} onQuick={() => go(addr('prep', 'check'))}
    onLedger={(id) => go(id ? addr('prep', 'questions', id) : addr('prep', 'questions'))} onBank={() => go(addr('prep', 'bank'))} />
}

// A fresh set each time the screen opens, so a reload starts a new check.
function QuickCheck({ tabs, onExit }: { tabs: PrepTab[]; onExit: (s: DrillSummary | null) => void }) {
  const [fixed] = useState(() => quickCheck(tabs))
  return <PrepDrill pool={[]} fixed={fixed} title="Quick check" onExit={onExit} />
}

function BankScreen({ selected }: { selected: string | null }) {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => { let live = true; void import('../learn/content/courses.ts').then((m) => { if (live) setCount(m.interviewQuestions.length) }); return () => { live = false } }, [])
  const trail = [{ label: 'Interview prep', go: () => go(ROOM) }, { label: 'Question bank', go: () => go(addr('prep', 'bank')) }]
  return (
    <div className="bank-host">
      {PHONE && <div className="back-row"><button className="back-link" onClick={() => go(ROOM)}>Back to the prep room</button></div>}
      <PageHeader cap="Interview prep" title="Question bank" sub={count === null ? ' ' : `${count} questions from your courses`} />
      <Suspense fallback={<div className="scroll"><div className="empty small"><p>Loading the question bank.</p></div></div>}>
        <div className="prep-bank"><Bank embedded initialQ={selected ?? undefined} selected={selected} trail={trail}
          onSelect={(id) => go(id ? addr('prep', 'bank', id) : addr('prep', 'bank'), { replace: true })} /></div>
      </Suspense>
    </div>
  )
}

function PrepView({ source, target, section, sel, onBack }: { source: PrepSource; target: Target | null; section?: string; sel?: string; onBack: () => void }) {
  const { content } = source
  // The section and the open question come from the address. A change of either replaces it, so Back leaves the ledger in one step.
  const first = (content.tabs.find((t) => tabHasContent(t, content)) ?? content.tabs[0]).id
  const tabId = content.tabs.some((t) => t.id === section) ? (section as string) : first
  const homeOf = useMemo(() => new Map(content.tabs.flatMap((t) => tabQuestions(t).map((q) => [q.id, t.id] as const))), [content])
  const open = (tid: string, id?: string) => go(id ? addr('prep', 'questions', tid, id) : addr('prep', 'questions', tid), { replace: true })
  // /prep/questions on its own settles on the first section. A link in flight sets its own address.
  useEffect(() => { if (section !== tabId && !(target?.tab === 'prep' && !isTaken(target))) open(tabId) }, [section, tabId, target])
  const [query, setQuery] = useState('')
  const [confirmOnly, setConfirmOnly] = useState(false)
  const [printAll, setPrintAll] = useState(false)
  const [practised, setPractised] = useState(() => loadPractised())
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(toTop, [tabId, confirmOnly])

  const tab = content.tabs.find((t) => t.id === tabId) ?? content.tabs[0]
  useCrumbs([{ label: 'Interview prep', go: onBack }, { label: 'All questions', go: () => open(first) }, { label: confirmOnly ? 'Questions to confirm' : tab.title }])
  const searching = query.trim() !== ''
  // "To confirm" gathers every question with checks into one list, so it spans all tabs.
  // A cards or glossary section is a desk. Questions are a list and detail, and a search or To confirm spans every section.
  const desk = !confirmOnly && !printAll && (tab.layout === 'glossary' || tab.layout === 'cards')
  const scope = desk ? [tab] : searching || confirmOnly || printAll ? content.tabs : [tab]
  const blobs = source.blobs

  const toConfirm = useMemo(() => content.tabs.reduce((n, t) => n + tabQuestions(t).filter((q) => checkCount(q) > 0).length, 0), [content])
  const keep = (q: PrepQuestion) => (!confirmOnly || checkCount(q) > 0) && (!searching || matches(blobs.get(q.id) ?? '', query))
  const visible = (qs: PrepQuestion[]) => qs.filter(keep)

  const counts = useMemo(() => {
    const total = content.tabs.reduce((n, t) => n + tabQuestions(t).length, 0)
    return { total, done: content.tabs.reduce((n, t) => n + tabQuestions(t).filter((q) => practised.has(q.id)).length, 0) }
  }, [content, practised])

  // Print shows every section: render them all, print, then go back to the one on screen.
  useEffect(() => {
    if (!printAll) return
    const done = () => setPrintAll(false)
    window.addEventListener('afterprint', done)
    window.print()
    return () => window.removeEventListener('afterprint', done)
  }, [printAll])

  const mark = useCallback((id: string, on: boolean) => setPractised((s) => {
    const n = new Set(s)
    if (on) n.add(id); else n.delete(id)
    savePractised(n)
    return n
  }), [])
  const reset = () => {
    let ok = true
    try { ok = window.confirm('Clear every practised mark for this profile?') } catch { /* no dialogs */ }
    if (!ok) return
    const none = new Set<string>()
    setPractised(none)
    savePractised(none)
  }

  // A link to a question or a glossary entry: show its tab with nothing filtered out, open it and reveal it.
  useEffect(() => {
    if (target?.tab !== 'prep' || !take(target)) return
    const id = target.id
    const home = content.tabs.find((t) => tabQuestions(t).some((q) => q.id === id))
      ?? (content.glossary?.groups.some((g) => g.terms.some((t) => t.id === id)) ? content.tabs.find((t) => t.layout === 'glossary') : undefined)
    if (!home) return
    open(home.id, id)
    setQuery('')
    setConfirmOnly(false)
    reveal(`.term[id="${CSS.escape(id)}"]`, (el) => {
      if (el.matches('.term:not(.open)')) el.querySelector<HTMLElement>('.term-head')?.click()
    })
  }, [target, content])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement
      if (e.key === '/' && !isTyping(t)) { e.preventDefault(); searchRef.current?.focus(); return }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const glossaryHits = () => (content.glossary?.groups ?? []).reduce((n, g) => n + g.terms.filter((t) => matches(blobs.get(t.id) ?? '', query)).length, 0)
  const matchTotal = scope.reduce((n, t) => n + (t.layout === 'glossary' ? (confirmOnly ? 0 : glossaryHits()) : t.layout === 'cards' ? (confirmOnly ? 0 : t.cards.filter((c) => matches(blobs.get(c.id) ?? '', query)).length) : visible(tabQuestions(t)).length), 0)

  const controls = (
    <>
      <label className="search">
        <Search size={13} aria-hidden="true" />
        <input
          ref={searchRef}
          type="search"
          placeholder="Search"
          aria-label="Search the prep document"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Escape') return
            e.stopPropagation()
            if (query) setQuery('')
            else e.currentTarget.blur()
          }}
        />
        {import.meta.env.VITE_PHONE !== '1' && <kbd>/</kbd>}
      </label>
      <Menu label={confirmOnly ? 'Questions to confirm' : tab.title}>
        {(close) => (<>
          {content.tabs.map((t) => {
            const qs = tabQuestions(t)
            const done = qs.filter((q) => practised.has(q.id)).length
            const n = t.layout === 'glossary' ? content.glossary?.groups.reduce((s, g) => s + g.terms.length, 0) ?? 0 : t.layout === 'cards' ? t.cards.length : qs.length
            return (
              <button key={t.id} role="menuitemradio" aria-checked={!confirmOnly && t.id === tab.id} className="menu-item" title={t.purpose}
                onClick={() => { open(t.id); setConfirmOnly(false); close() }}>
                <span className="check">{!confirmOnly && t.id === tab.id ? '\u2713' : ''}</span>
                <span className="menu-grow">{t.title}</span>
                <span className="muted num">{qs.length > 0 ? `${done}/${n}` : n}</span>
              </button>
            )
          })}
          <div className="menu-sep" />
          <button role="menuitemradio" aria-checked={confirmOnly} className="menu-item" title="Show only questions with facts to confirm, across every section"
            onClick={() => { setConfirmOnly(true); open(tab.id); close() }}>
            <span className="check">{confirmOnly ? '\u2713' : ''}</span>
            <span className="menu-grow">Questions to confirm</span>
            <span className="muted num">{toConfirm}</span>
          </button>
        </>)}
      </Menu>
      <Menu label="More" align="right">
        {(close) => (<>
          <button className="menu-item" onClick={() => { reset(); close() }}>Reset practised</button>
          <button className="menu-item" onClick={() => { setPrintAll(true); close() }}>Print</button>
        </>)}
      </Menu>
    </>
  )

  const header = (<>
    {PHONE && <div className="back-row"><button className="back-link" onClick={onBack}>Back to the prep room</button></div>}
    {confirmOnly || !tab.title ? <PageHeader cap="Interview prep" title="All questions" sub={<span className="num">{counts.done} of {counts.total} practised</span>} />
      : <PageHeader cap="Interview prep" title={tab.title} sub={tab.purpose || <span className="num">{counts.done} of {counts.total} practised</span>} />}
  </>)
  const allOpen = new Set(content.tabs.flatMap((t) => tabQuestions(t).map((q) => q.id)))
  const body = (t: PrepTab, open: ReadonlySet<string>) => (
    <TabBody key={t.id} tab={t} content={content} query={searching ? query : ''} showTitle={scope.length > 1}
      blobs={blobs} keep={keep} confirmOnly={confirmOnly} open={open} practised={practised} onToggle={() => {}} onPractised={mark} />
  )

  // Print and the cards and glossary sections read as one long page.
  if (printAll || desk) {
    return (
      <>
        {header}
        {!printAll && <div className="prep-bar">{controls}</div>}
        <div className="scroll">
          <ProblemsBanner problems={content.problems} label={PROBLEMS_LABEL} />
          <div className="prep">
            {searching && <p className="muted prep-found num">{matchTotal} {matchTotal === 1 ? 'match' : 'matches'} in {tab.title}</p>}
            {scope.map((t) => body(t, allOpen))}
          </div>
        </div>
      </>
    )
  }

  const many = scope.length > 1
  const groups = scope.flatMap((t) => (t.layout === 'categories' || t.layout === 'flat') ? t.categories.map((c) => ({
    key: `${t.id}/${c.id}`,
    head: t.layout === 'flat' ? (many ? t.title : '') : many ? `${t.title}, ${c.title}` : c.title,
    rows: c.questions.filter(keep),
    count: `${c.questions.filter((q) => practised.has(q.id)).length} of ${c.questions.length}`,
    note: c.purpose || undefined,
  })) : [])
  const flat = groups.flatMap((g) => g.rows)
  const current = flat.find((q) => q.id === sel) ?? flat[0]
  const num = (q: PrepQuestion) => /(\d+)$/u.exec(q.id)?.[1]
  const empty = confirmOnly && toConfirm === 0 ? 'Nothing to confirm.' : searching ? 'No questions match.' : 'No questions in this section yet.'

  return (
    <>
      {header}
      <ProblemsBanner problems={content.problems} label={PROBLEMS_LABEL} />
      <div className="prep-ld">
        <ListDetail
          label="Questions"
          wrap
          top={controls}
          groups={groups}
          id={(q) => q.id}
          selected={current?.id ?? null}
          onSelect={(q) => open(homeOf.get(q.id) ?? tab.id, q.id)}
          row={(q) => (
            <ListRow
              lead={<span className="lr-num num">{num(q) ? Number(num(q)) : ''}</span>}
              name={q.question}
              meta={<>{practised.has(q.id) && <Check size={13} aria-label="Practised" />}{q.kind !== 'coaching' && <QuestionFlag id={q.id} />}</>}
            />
          )}
          foot={searching ? <p className="muted prep-found num">{flat.length} {flat.length === 1 ? 'match' : 'matches'}{many ? ' across all sections' : ` in ${tab.title}`}</p> : undefined}
          aside={current && (<>
            <QuestionBody key={`${current.id}-side`} q={current} speak part="aside" />
            <label className="pd-done"><input type="checkbox" checked={practised.has(current.id)} onChange={(e) => mark(current.id, e.target.checked)} /> Mark as practised</label>
          </>)}
        >
          {current ? (<>
            <QuestionTitle key={`${current.id}-title`} q={current} />
            <QuestionBody key={current.id} q={current} speak part="main" />
          </>) : <div className="empty small"><p>{empty}</p></div>}
        </ListDetail>
      </div>
    </>
  )
}

type BodyProps = {
  tab: PrepTab
  content: PrepContent
  query: string
  showTitle: boolean
  blobs: ReadonlyMap<string, string>
  keep: (q: PrepQuestion) => boolean
  confirmOnly: boolean
  open: ReadonlySet<string>
  practised: ReadonlySet<string>
  onToggle: (id: string) => void
  onPractised: (id: string, on: boolean) => void
}

function TabBody({ tab, content, query, showTitle, blobs, keep, confirmOnly, open, practised, onToggle, onPractised }: BodyProps) {
  const searching = query !== ''
  let body
  if (confirmOnly && tab.layout !== 'categories' && tab.layout !== 'flat') {
    if (showTitle) return null
    body = <Empty text="Only questions have facts to confirm." />
  } else if (tab.layout === 'glossary') {
    if (!content.glossary) body = <Empty text="The glossary hasn't been generated yet." />
    else if (showTitle && !content.glossary.groups.some((g) => g.terms.some((t) => matches(blobs.get(t.id) ?? '', query)))) return null
    else body = <PrepGlossary glossary={content.glossary} query={query} blobs={blobs} />
  } else if (tab.layout === 'cards') {
    const cards = tab.cards.filter((c) => !searching || matches(blobs.get(c.id) ?? '', query))
    if (cards.length === 0) { if (showTitle) return null; body = <Empty text={searching ? 'No cards match.' : 'No cards yet.'} /> }
    else body = <div className="qr-grid">{cards.map((c) => <QuickCard key={c.id} c={c} />)}</div>
  } else {
    const cats = tab.categories
      .map((c) => ({ ...c, questions: c.questions.filter(keep) }))
      .filter((c) => c.questions.length > 0)
    if (cats.length === 0) { if (showTitle) return null; body = <Empty text={confirmOnly ? 'No questions to confirm here.' : searching ? 'No questions match.' : 'No questions in this tab yet.'} /> }
    else body = (<>
      {cats.map((c) => (
        <section key={c.id} className="pcat">
          {tab.layout !== 'flat' && (
            <header className="pcat-head">
              <h3>{c.title}</h3>
              <span className="muted num">{c.questions.filter((q) => practised.has(q.id)).length}/{c.questions.length}</span>
              {c.purpose && <p className="muted">{c.purpose}</p>}
            </header>
          )}
          <div className="q-list">
            {c.questions.map((q) => (
              <PrepQuestionCard key={q.id} q={q} open={open.has(q.id)} practised={practised.has(q.id)} onToggle={onToggle} onPractised={onPractised} />
            ))}
          </div>
        </section>
      ))}
    </>)
  }
  return (
    <section className="ptab">
      <header className="ptab-head">
        <h2>{tab.title}</h2>
        <p className="muted">{tab.purpose}</p>
      </header>
      {body}
    </section>
  )
}

const Empty = ({ text }: { text: string }) => <div className="empty small"><p>{text}</p></div>

function QuickCard({ c }: { c: QuickRefCard }) {
  return (
    <article className={`qr qr-${c.tone}`}>
      <h4>{c.title}</h4>
      <ul>{(Array.isArray(c.lines) ? c.lines : []).map((l, i) => <li key={i}>{l}</li>)}</ul>
    </article>
  )
}
