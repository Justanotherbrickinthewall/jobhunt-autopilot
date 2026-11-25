import { useEffect, useMemo, useState } from 'react'
import { loadInterviews, type AnalysisRow, type Interview, type Next } from '../data/interviews.ts'
import { linksForRow, useLinksReady } from '../data/links.ts'
import { WikiLine } from './WikiLinks.tsx'
import { Blocks, lex, type RenderCtx } from '../reading/render.tsx'
import { take, type Target } from '../reading/router.ts'
import { PageHeader } from './PageHeader.tsx'
import { Chip, Tile } from './Chip.tsx'
import { DataTable, ListDetail, ListRow, StatStrip, type Column, type Stat } from './ui.tsx'
import { toTop } from '../util.ts'
import { addr, go, usePath } from './nav.ts'
import { useCrumbs } from './crumbs.ts'
import { shortDate } from './format.ts'

type View = 'questions' | 'next' | 'review' | 'transcript'
const VIEWS: { key: View; label: string }[] = [
  { key: 'questions', label: 'Questions' },
  { key: 'next', label: 'Next steps' },
  { key: 'review', label: 'Review' },
  { key: 'transcript', label: 'Transcript' },
]

const title = (i: Interview) => [i.company, i.role, i.round].filter(Boolean).join(', ')

const VERDICTS = { strong: 'Strong', adequate: 'Adequate', weak: 'Weak', wrong: 'Wrong' }
const status = (r: AnalysisRow) => (r.scored && r.verdict ? VERDICTS[r.verdict] : 'Not scored')

// What was said, why it landed as it did, a better answer and what to confirm. The links to Prep and Learn go in the aside.
function QuestionDetail({ r }: { r: AnalysisRow }) {
  return (
    <>
      <header className="pd-head"><h2 className="pd-title">{r.question}</h2><p className="pd-note">{status(r)}</p></header>
      {r.answer && <p className="iv-quote">{r.answer}</p>}
      {r.why && <p>{r.why}</p>}
      {r.better && <p><span className="muted">A better answer: </span>{r.better}</p>}
      {r.missing && <p><span className="muted">To confirm: </span>{r.missing}</p>}
    </>
  )
}

// What comes after the call: the rounds ahead and how to prepare, what is owed and what to ask.
function NextSteps({ next }: { next: Next }) {
  const line = (label: string, v: string) => v && <p><span className="muted">{label}: </span>{v}</p>
  return (
    <>
      {next.said && <p>{next.said}</p>}
      {next.rounds.length > 0 && <h2>Rounds ahead</h2>}
      {next.rounds.map((r, i) => (
        <section key={i}>
          <h3>{r.round || `Round ${i + 1}`}</h3>
          {line('Format', r.format)}{line('With', r.with)}{line('When', r.when)}{line('How to prepare', r.prep)}
        </section>
      ))}
      {next.owed.length > 0 && <><h2>Owed by you</h2><ul>{next.owed.map((o, i) => <li key={i}>{o}</li>)}</ul></>}
      {next.ask.length > 0 && <><h2>To ask the recruiter</h2><ul>{next.ask.map((o, i) => <li key={i}>{o}</li>)}</ul></>}
    </>
  )
}

function QuestionLinks({ r }: { r: AnalysisRow }) {
  useLinksReady()
  const l = linksForRow(r)
  if (l.learn.length + l.prep.length === 0) return null
  return <div className="wiki-end"><WikiLine label="Learn" links={l.learn} className="wiki-line iv-links" /><WikiLine label="Practise" links={l.prep} className="wiki-line iv-links" /></div>
}

function Detail({ interview, question }: { interview: Interview; question?: string }) {
  const views = VIEWS.filter((v) => (v.key === 'questions' ? !!interview.analysis : v.key === 'next' ? !!interview.analysis?.next : true))
  // The tab comes from the address and a change of tab replaces it, so Back leaves the interview in one step.
  const at = usePath()[2]
  const view: View = views.find((v) => v.key === at)?.key ?? views[0].key
  const setView = (v: View) => go(addr('interviews', interview.folder, v), { replace: true })
  const [sel, setSel] = useState<string | undefined>(question)
  useEffect(() => { if (question && interview.analysis) setSel(question) }, [question, interview])
  // A link opens with the question selected: bring its row into the list and the detail to its top once the layout has settled.
  useEffect(() => {
    if (!question) return
    const f = requestAnimationFrame(() => {
      document.querySelector(`.iv-ld [data-ld="${CSS.escape(question)}"]`)?.scrollIntoView({ block: 'nearest' })
      document.querySelector('.iv-ld .ld-detail')?.scrollTo?.({ top: 0 })
    })
    return () => cancelAnimationFrame(f)
  }, [question, view])
  const source = view === 'review' ? interview.review : interview.transcript
  const ctx: RenderCtx = { speak: false, crumb: `Interviews > ${title(interview)}`, kind: 'interview', link: () => `#interviews/${encodeURIComponent(interview.folder)}` }
  const a_ = interview.analysis
  const a = a_
  const stats: Stat[] = a ? [
    { label: 'Score', value: a.score !== null ? a.score.toFixed(1) : '–', sub: 'out of 10' },
    { label: 'Questions', value: a.questions.length, sub: `${a.questions.filter((r) => r.scored).length} scored` },
    { label: 'Strong', value: a.questions.filter((r) => r.verdict === 'strong').length, sub: 'answers that held up' },
    { label: 'To work on', value: a.questions.filter((r) => r.verdict === 'weak' || r.verdict === 'wrong').length, sub: 'weak or wrong' },
  ] : []
  const strip = a_ && <StatStrip stats={stats} />
  const tabs = (
    <div className="filter-row campaign-tabs">
      <div className="tabs" role="tablist" aria-label="Interview files">
        {views.map((v) => <button key={v.key} role="tab" aria-selected={v.key === view} onClick={() => setView(v.key)}>{v.label}</button>)}
      </div>
    </div>
  )
  const rows = a_?.questions ?? []
  const current = rows.find((r) => r.id === sel) ?? rows[0]
  return (
    <>
      <PageHeader cap="Interviews" title={title(interview)} sub={shortDate(interview.date)} />
      {view === 'questions' ? (
        <>
          {strip}
          {tabs}
          <div className="iv-ld">
            <ListDetail
              label="Questions"
              wrap
              groups={[{ key: 'q', head: '', rows }]}
              id={(r) => r.id}
              selected={current?.id ?? null}
              onSelect={(r) => setSel(r.id)}
              row={(r) => <ListRow lead={<span className="lr-num num">{rows.indexOf(r) + 1}</span>} name={r.question} foot={<span className="tag small">{status(r)}</span>} />}
              aside={current && <QuestionLinks r={current} />}
            >
              {current ? <QuestionDetail r={current} /> : <div className="empty small"><p>No questions in this interview</p></div>}
            </ListDetail>
          </div>
        </>
      ) : (
        <div className="scroll iv-page">
          {strip}
          {tabs}
          <div className="rd-page iv-body">
            {view === 'next' && a?.next ? <NextSteps next={a.next} /> : source
              ? <Blocks key={view} tokens={lex(source, view === 'transcript')} ctx={ctx} idBase={`iv-${interview.folder}-${view}`} />
              : <p>There's no {view} file in this interview's folder.</p>}
          </div>
        </div>
      )}
    </>
  )
}

const COLS: Column<Interview>[] = [
  {
    key: 'interview', head: 'Interview', cell: (i) => (
      <span className="who">
        <Tile name={i.company || i.role || '?'} />
        <span className="who-text">
          <span className="who-name">{i.company || 'Unknown company'}</span>
          <span className="who-sub"><span>{i.role || 'Role not named'}</span></span>
        </span>
      </span>
    ),
  },
  { key: 'round', head: 'Round', className: 'c-round', cell: (i) => (i.round ? <Chip>{i.round}</Chip> : <span className="faint">–</span>) },
  { key: 'date', head: 'Date', className: 'c-date', cell: (i) => <span className="num">{shortDate(i.date)}</span> },
  {
    key: 'result', head: 'Result', className: 'c-result right', cell: (i) => {
      const sc = i.analysis?.score
      return sc == null ? <span className="faint">Not scored</span> : <Chip tone={sc >= 7 ? 'green' : sc >= 5 ? 'amber' : 'red'}>{sc.toFixed(1)} out of 10</Chip>
    },
  },
]

// The Interviews tab: reviews and transcripts from my-interviews/, which /interview writes. It only reads.
export function Interviews({ target }: { target: Target | null }) {
  const { interviews, problem } = useMemo(loadInterviews, [])
  const folder = usePath()[1]
  const [question, setQuestion] = useState<string | undefined>()
  // A link opens its interview in place of the list, and on Questions when it names a question.
  useEffect(() => {
    if (target?.tab !== 'interviews' || !target.folder || !take(target)) return
    setQuestion(target.question)
    go(target.question ? addr('interviews', target.folder, 'questions') : addr('interviews', target.folder), { replace: true })
  }, [target])
  useEffect(toTop, [folder])
  const open = interviews.find((i) => i.folder === folder)
  useCrumbs(open ? [{ label: 'Interviews', go: () => go('/interviews') }, { label: title(open) }] : [{ label: 'Interviews' }])
  if (open) return <Detail key={open.folder} interview={open} question={question} />
  if (problem) return <div className="empty"><h1>The interview index can't be read</h1><p>{problem}</p></div>
  const count = interviews.length
  return (
    <>
      <PageHeader cap="Interviews" title={count === 0 ? 'No interviews reviewed yet' : `${count} ${count === 1 ? 'interview' : 'interviews'} reviewed`} />
      <div className="scroll iv-page">
        {count === 0 ? (
          <div className="empty small"><p>Run <code>/interview</code> in chat to pull a recorded interview and review it.</p></div>
        ) : (
          <DataTable label="Interview reviews" columns={COLS} groups={[{ key: '', rows: interviews }]} id={(i) => i.folder} onRow={(i) => { setQuestion(undefined); go(addr('interviews', i.folder)) }} focusable />
        )}
      </div>
    </>
  )
}
