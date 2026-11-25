import { useEffect, useMemo, useRef, useState } from 'react'
import type { PrepQuestion } from '../data/prepTypes.ts'
import { pickNext, rate, type Rating } from '../data/prepRecall.ts'
import { useReadAlong } from '../reading/ReadAlong.tsx'
import { Narr, words } from '../reading/render.tsx'
import { unlockAudio } from '../learn/engine/handsfree.ts'
import { HANDS_FREE_END, HANDS_FREE_INTRO, prepScript, say, stopSpeech } from '../reading/handsFree.ts'
import { useWakeLock } from '../reading/wakeLock.ts'
import { isTyping, toTop } from '../util.ts'
import { Check } from 'lucide-react'
import { PageHeader } from './PageHeader.tsx'
import { addr, go as navigate } from './nav.ts'
import { useCrumbs } from './crumbs.ts'
import { ListDetail, ListRow } from './ui.tsx'
import { QuestionBody } from './PrepQuestion.tsx'
import { PassLine, QuestionFlag } from './PrepFlag.tsx'

export type DrillSummary = { title: string; counts: Record<Rating, number>; before?: number; after?: number }
type Verdict = { verdict: Rating; score?: number; gaps: string[]; followUp: string }
type Read = { state: 'pending' } | { state: 'failed'; message: string } | ({ state: 'done' } & Verdict)

// The phone copy has no server, so Claude cannot read an answer. It shows the model answer and the rating buttons only.
const PHONE = import.meta.env.VITE_PHONE === '1'
// What the judge never needs: evidence and source notes are the candidate's private proof, not the reference answer.
const OMIT = ['evidence', 'followUps', 'searchTerms', 'projectTags', 'toolTags', 'provenance', 'sourceRef', 'confidence']
const referenceOf = (q: PrepQuestion): string => JSON.stringify(q, (k, v: unknown) => (OMIT.includes(k) ? undefined : v))
const RATINGS: { r: Rating; label: string }[] = [{ r: 'missed', label: 'I missed it' }, { r: 'shaky', label: 'Shaky' }, { r: 'had', label: 'I had it' }]
const WORD: Record<Rating, string> = { missed: 'Missed it', shaky: 'Shaky', had: 'Had it' }

async function judge(body: object, signal: AbortSignal): Promise<Verdict> {
  let res: Response
  try {
    res = await fetch(PHONE ? '' : '/api/prep/judge', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal })
  } catch (e) {
    if (signal.aborted) throw e
    throw new Error('The dashboard server is not running, so Claude could not read your answer.')
  }
  const data = (await res.json().catch(() => null)) as (Verdict & { error?: string }) | null
  if (!res.ok || !data) throw new Error(data?.error ?? `Claude could not read your answer (${res.status}).`)
  return data
}

// The whole section in drill order: weak and unseen first, and the question the address names ahead of them.
function ordered(pool: PrepQuestion[], first?: string): PrepQuestion[] {
  const out = pool.filter((x) => x.id === first)
  const used = new Set(out.map((x) => x.id))
  for (let n = pickNext(pool, used); n; n = pickNext(pool, used)) { out.push(n); used.add(n.id) }
  return out
}

type Props = {
  pool: PrepQuestion[]
  fixed?: PrepQuestion[]
  // A section drill names its section and the question to open on, and keeps the address in step with the question.
  section?: string
  first?: string
  title: string
  // Confidence of the section before and after, for a single-section drill.
  readiness?: () => number
  onExit: (summary: DrillSummary | null) => void
}

export function PrepDrill({ pool, fixed, section, first, title, readiness, onExit }: Props) {
  const ctrl = useReadAlong()
  const before = useRef(readiness?.())
  const counts = useRef<Record<Rating, number>>({ missed: 0, shaky: 0, had: 0 })
  // The list holds every question the drill will ask, in order.
  const [seq] = useState<PrepQuestion[]>(() => (fixed ? [...fixed] : ordered(pool, first)))
  const [idx, setIdx] = useState(0)
  const [rated, setRated] = useState<ReadonlySet<string>>(new Set())
  const q: PrepQuestion | undefined = seq[idx]
  const [shown, setShown] = useState(false)
  const [answer, setAnswer] = useState('')
  const [read, setRead] = useState<Read | null>(null)
  const [round, setRound] = useState<{ q: string; answer: string; read: Read | null } | null>(null)
  const abort = useRef<AbortController | null>(null)
  const box = useRef<HTMLTextAreaElement>(null)
  const [hands, setHands] = useState(false)
  useWakeLock(hands)

  useCrumbs([{ label: 'Interview prep', go: () => navigate('/prep') }, ...(section ? [{ label: 'Drill', go: () => navigate('/prep') }] : []), { label: title }])
  // The next question replaces the address, so Back leaves the drill in one step. The phone keeps its path in memory and needs no update.
  useEffect(() => { if (!PHONE && section && q) navigate(addr('prep', 'drill', section, q.id), { replace: true }) }, [section, q?.id])
  const reference = useMemo(() => (q ? referenceOf(q) : ''), [q])

  const exit = () => {
    abort.current?.abort()
    const total = counts.current.missed + counts.current.shaky + counts.current.had
    onExit(total === 0 ? null : { title, counts: counts.current, before: before.current, after: readiness?.() })
  }

  useEffect(() => { if (shown) ctrl?.stop() }, [shown, ctrl])
  useEffect(() => () => { ctrl?.stop(); abort.current?.abort() }, [ctrl])
  useEffect(() => { if (!shown) box.current?.focus({ preventScroll: true }) }, [q, shown])
  useEffect(toTop, [q])
  useEffect(() => {
    if (!hands || !q) return
    setShown(true)
    let cancelled = false
    const rate = ctrl?.getState().rate ?? 1
    void (async () => {
      for (const t of prepScript(q)) { if (cancelled) return; await say(t, rate) }
      if (cancelled) return
      if (idx + 1 < seq.length) go(idx + 1)
      else { await say(HANDS_FREE_END, rate); if (!cancelled) setHands(false) }
    })()
    return () => { cancelled = true; stopSpeech() }
  }, [hands, q?.id])   // the next question starts at the top of the page

  const check = async (text: string, asFollowUp: boolean) => {
    if (PHONE || !q || !text.trim()) return
    abort.current?.abort()
    const ac = new AbortController()
    abort.current = ac
    const set = (r: Read) => (asFollowUp ? setRound((c) => (c ? { ...c, read: r } : c)) : setRead(r))
    set({ state: 'pending' })
    try {
      const body = asFollowUp
        ? { question: round?.q ?? '', answer: text, reference, followUpOf: q.question }
        : { question: q.question, answer: text, reference }
      const v = await judge(body, ac.signal)
      if (!ac.signal.aborted) set({ state: 'done', ...v })
    } catch (e) {
      if (!ac.signal.aborted) set({ state: 'failed', message: e instanceof Error ? e.message : 'Claude could not read your answer.' })
    }
  }
  const reveal = (withCheck: boolean) => {
    setShown(true)
    if (withCheck) void check(answer, false)
  }

  const go = (i: number) => {
    abort.current?.abort()
    setIdx(i); setShown(false); setAnswer(''); setRead(null); setRound(null)
  }
  const next = (r: Rating) => {
    if (!q) return
    rate(q.id, r, read?.state === 'done' ? read.score : undefined)
    counts.current[r]++
    setRated((s) => new Set(s).add(q.id))
    if (idx + 1 < seq.length) go(idx + 1)
    else exit()
  }

  useEffect(() => {
    if (!shown) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      const r = RATINGS[Number(e.key) - 1]
      if (r) next(r.r)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!q) return <div className="empty small"><p>There are no questions to drill here.</p>{PHONE && <button className="btn" onClick={() => onExit(null)}>Back to the prep room</button>}</div>

  const ctx = { speak: true, crumb: `Prep > ${q.question}`, kind: 'prep' as const, link: () => `#prep/${q.id}` }
  const submit = (e: React.KeyboardEvent, go: () => void) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); go() } }

  const n = idx + 1
  const pane = !shown ? (
    <>
      {!PHONE && (
        <textarea ref={box} className="drill-box" rows={7} value={answer} onChange={(e) => setAnswer(e.target.value)}
          placeholder="Say your answer with Wispr Flow, or type it." aria-label="Your answer"
          onKeyDown={(e) => submit(e, () => answer.trim() && reveal(true))} />
      )}
      <div className="drill-actions">
        {answer.trim() && <button className="btn fill" onClick={() => reveal(true)}>Check my answer</button>}
        <button className={PHONE ? 'btn fill' : 'btn'} onClick={() => reveal(false)}>Show the answer</button>
      </div>
    </>
  ) : (
    <>
      {answer.trim() && <p className="drill-said muted">{answer}</p>}
      {answer.trim() && (
        <ReadBlock label="Claude's read" read={read}>
          {read?.state === 'done' && !round && read.followUp && (
            <button className="btn" onClick={() => setRound({ q: read.followUp, answer: '', read: null })}>Answer this</button>
          )}
          {round && (
            <div className="drill-round">
              <p className="drill-fu">{round.q}</p>
              {round.read === null ? (
                <>
                  <textarea className="drill-box" rows={4} autoFocus value={round.answer} aria-label="Your answer to the follow-up"
                    onChange={(e) => setRound({ ...round, answer: e.target.value })}
                    onKeyDown={(e) => submit(e, () => void check(round.answer, true))} />
                  {round.answer.trim() && <div className="drill-actions"><button className="btn fill" onClick={() => void check(round.answer, true)}>Check my answer</button></div>}
                </>
              ) : <ReadBlock label="Follow-up read" read={round.read} />}
            </div>
          )}
        </ReadBlock>
      )}
      <QuestionBody q={q} speak part="main" />
      <div className="drill-rate">
        <span className="muted">How did you do?</span>
        {RATINGS.map((x, i) => <button key={x.r} className="btn" onClick={() => next(x.r)}>{x.label}{import.meta.env.VITE_PHONE !== "1" && <> <span className="muted num">{i + 1}</span></>}</button>)}
      </div>
    </>
  )

  return (
    <>
      <PageHeader cap="Interview prep" title={title} sub={<span className="num">Question {n}{fixed ? ` of ${fixed.length}` : ''}</span>}>
        {PHONE && (
          <button className="btn ghost" onClick={() => {
            if (hands) { setHands(false); return }
            // iOS only speaks what starts inside the tap, so the first utterance is queued here.
            unlockAudio(); ctrl?.stop(); speechSynthesis.cancel(); void say(HANDS_FREE_INTRO, ctrl?.getState().rate ?? 1); setHands(true)
          }}>{hands ? 'Stop' : 'Hands-free'}</button>
        )}
        <button className="btn ghost" onClick={exit}>Finish</button>
      </PageHeader>
      <div className="prep-ld">
        <ListDetail
          label="Drill questions"
          wrap
          groups={[{ key: 'seq', head: title, rows: seq }]}
          id={(x) => x.id}
          selected={q.id}
          onSelect={(x) => { const i = seq.indexOf(x); if (i !== idx) go(i) }}
          row={(x) => <ListRow lead={<span className="lr-num num">{seq.indexOf(x) + 1}</span>} name={x.question} meta={<>{rated.has(x.id) && <Check size={13} aria-label="Done" />}<QuestionFlag id={x.id} /></>} />}
          aside={shown && <QuestionBody key={q.id} q={q} speak part="aside" />}
        >
          <div className="drill-q">
            <Narr id={`pq-${q.id}-q`} ctx={ctx} className="drill-qtext">{(sp) => words(q.question, sp)}</Narr>
            <PassLine id={q.id} />
          </div>
          <div className="drill">{pane}</div>
        </ListDetail>
      </div>
    </>
  )
}

function ReadBlock({ label, read, children }: { label: string; read: Read | null; children?: React.ReactNode }) {
  return (
    <section className="drill-read">
      <div className="pfield-label">{label}</div>
      {(!read || read.state === 'pending') && <p className="muted">Reading your answer...</p>}
      {read?.state === 'failed' && <p className="muted">{read.message}</p>}
      {read?.state === 'done' && (
        <>
          <p>{WORD[read.verdict]}.</p>
          {read.gaps.length > 0 && <ul>{read.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>}
        </>
      )}
      {children}
    </section>
  )
}
