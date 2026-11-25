import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Card } from '../data/types.ts'
import { Chip, FitBar, StateLabel } from './Chip.tsx'
import { SCORE_LABELS, human, label, longDate, shortDate } from './format.ts'
import { isSafeUrl } from './markdown.ts'
import { Blocks, Narr, lex, words, type RenderCtx } from '../reading/render.tsx'
import type { Target } from '../reading/router.ts'
import { BookmarkButton } from '../reading/Bookmark.tsx'
import { INFO, classify } from '../data/holds.ts'
import { COLUMN_OF } from '../data/board.ts'
import { rowHistory, type HeldStatus, type HistoryEvent } from '../data/heldApi.ts'
import { HeldActions } from './HeldActions.tsx'
import { isDropped, shownStatus } from '../data/drops.ts'

type Tab = 'overview' | 'jd' | 'resume'
const TABS: { key: Tab; label: string }[] = [{ key: 'overview', label: 'Overview' }, { key: 'jd', label: 'JD' }, { key: 'resume', label: 'Resume' }]

const NONE = <p className="none">not captured</p>

// Where a saved block from this role came from, and the link back to its tab.
const roleCtx = (c: Card, kind: string, tab: Tab): RenderCtx => ({
  speak: true,
  crumb: `Hunt > ${c.company || 'Unknown company'} > ${c.role || 'Untitled role'}`,
  kind,
  link: () => `#hunt/${c.id}/${tab}`,
})

// Evidence is a run of quotes from the JD, written as "a"; "b". Split it so each quote reads on its own line.
function quotes(evidence: string): string[] | null {
  const t = evidence.trim()
  if (!t.startsWith('"') || !t.endsWith('"')) return null
  return t.slice(1, -1).split(/"\s*;\s*"/u).map((q) => q.replace(/""/gu, '"').trim()).filter(Boolean)
}

// The drawer stays mounted so it can slide in and out. While closed it keeps the last card,
// so the content doesn't vanish halfway through the slide.
export function Drawer({ card, session, onClose, jump, appTab }: { card: Card | null; session: boolean; onClose: () => void; jump: Target | null; appTab: 'hunt' | 'retro' }) {
  const last = useRef<Card | null>(card)
  if (card) last.current = card
  const c = card ?? last.current
  const [tab, setTab] = useState<Tab>('overview')
  // Where HeldActions puts its explanation of the row, which reads best in the overview rather than in the head.
  const [leadHost, setLeadHost] = useState<HTMLElement | null>(null)
  const body = useRef<HTMLDivElement>(null)
  useEffect(() => { body.current?.scrollTo({ top: 0 }) }, [c?.id, tab])
  // A link to a role opens the drawer on the tab it names.
  useEffect(() => {
    const pane = jump?.tab === 'hunt' || jump?.tab === 'retro' ? TABS.find((t) => t.key === jump.pane)?.key : undefined
    if (pane) setTab(pane)
  }, [jump])

  // The fix buttons show for a held row, a new row and a row part-way through a run. Any other row has none.
  const holds = (c?.holdReasons ?? []).map((r) => classify(r, false))
  const lead: ((st: HeldStatus | null) => ReactNode) | undefined | null = !c ? null
    : c.holdReasons ? undefined
    : c.ledgerStatus === 'new' ? (st) => <NewLead st={st} />
    : COLUMN_OF[c.ledgerStatus ?? ''] === 'processing' ? (st) => <Progress status={c.ledgerStatus ?? ''} st={st} />
    : null

  return (
    <aside className={`drawer${card ? ' open' : ''}`} aria-label={c ? `${c.company} ${c.role}` : 'Role detail'} aria-hidden={!card} inert={!card}>
      {c && <>
        <header className="dr-head">
          <div className="dr-top">
            <h2>{c.role || 'Untitled role'}</h2>
            <BookmarkButton
              source={{ kind: 'role', crumb: roleCtx(c, 'role', 'overview').crumb, link: `#hunt/${c.id}/overview` }}
              text={[`${c.role || 'Untitled role'} at ${c.company || 'Unknown company'}`, c.location, c.link].filter(Boolean).join('\n')}
              what="this role"
            />
            <button className="icon-btn" onClick={onClose} aria-label="Close" title="Close (Esc)">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
            </button>
          </div>
          <div className="dr-meta">
            <span>{c.company || 'Unknown company'}</span>
            <StateLabel value={c.column} title="Status" />
            <FitBar value={c.match} />
            {c.link && (isSafeUrl(c.link)
              ? <a className="dr-link" href={c.link} target="_blank" rel="noreferrer">Open the posting</a>
              : <span className="muted">{c.link}</span>)}
          </div>
          <div className="dr-acts">
            {lead !== null && <HeldActions key={c.id} card={c} holds={holds} open={card !== null} appTab={appTab} lead={lead} leadHost={leadHost} />}
            <div className="tabs" role="tablist" aria-label="Role detail">
              {TABS.map((t) => (
                <button key={t.key} role="tab" id={`tab-${t.key}`} aria-selected={tab === t.key} aria-controls="drawer-panel" onClick={() => setTab(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </header>
        <div className={`dr-body tab-${tab}`} ref={body} id="drawer-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === 'overview' && <Overview card={c} session={session} setLeadHost={setLeadHost} />}
          {tab === 'jd' && <Jd card={c} />}
          {tab === 'resume' && <Resume card={c} />}
        </div>
      </>}
      <div id="rd-slot-drawer" className="rd-slot" />
    </aside>
  )
}

// A quiet collapsed section. The summary is the title.
function Fold({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="dr-fold">
      <summary>{title}</summary>
      <div className="dr-fold-body">{children}</div>
    </details>
  )
}

function Overview({ card: c, session, setLeadHost }: { card: Card; session: boolean; setLeadHost: (el: HTMLElement | null) => void }) {
  const q = quotes(c.evidence)
  const ctx = roleCtx(c, 'evidence', 'overview')
  const holds = (c.holdReasons ?? []).map((r) => classify(r, false))
  // One step for each kind, however many reasons share it. A row with no recorded reason gets the free-text step.
  const steps = [...new Set(holds.map((h) => INFO[h.kind].step))]
  if (steps.length === 0) steps.push(INFO.question.step)
  const facts = [c.location, c.workMode && human(c.workMode), c.dateFound && `found ${shortDate(c.dateFound)}`, c.appliedDate && `applied ${shortDate(c.appliedDate)}`].filter(Boolean).join(', ')
  return (<>
    <section className="dr-sec dr-state">
      {c.holdReasons ? (<>
        <h3>Why it was held</h3>
        {holds.length === 0 ? <p className="none">No reason is recorded on this row.</p> : (
          <ul className="dr-kw">
            {holds.map((h, i) => (
              <li key={`${h.kind}-${i}`}>
                <span className="dr-kw-term">{INFO[h.kind].label}</span>
                <span className="dr-kw-note">{h.text}</span>
              </li>
            ))}
          </ul>
        )}
        <ul className="quotes">{steps.map((t) => <li key={t}>{t}</li>)}</ul>
        {holds.some((h) => h.kind === 'account' || h.kind === 'signin') && (
          <p className="muted">Buttons open the site in the pinned Chrome profile. You make the account or sign in yourself.</p>
        )}
      </>) : isDropped(c.ledgerStatus) ? (<>
        <h3>Why it was dropped</h3>
        {!c.dropReason ? <p className="none">No reason is recorded on this row.</p> : (
          <ul className="dr-kw">
            <li>
              <span className="dr-kw-term">{c.dropReason.type}</span>
              {c.dropReason.text && <span className="dr-kw-note">{c.dropReason.text}</span>}
            </li>
          </ul>
        )}
      </>) : (<>
        <h3>{c.ledgerStatus === 'new' ? 'What it waits for' : COLUMN_OF[c.ledgerStatus ?? ''] === 'processing' ? 'How far it got' : 'Where it stands'}</h3>
        <div ref={setLeadHost} />
        {c.column === 'applied' && <p className="muted">{c.appliedDate ? `Applied ${shortDate(c.appliedDate.slice(0, 10))}.` : 'Applied.'}</p>}
      </>)}
      {session && <p className="muted">Ledger status: {c.ledgerStatus ? label(shownStatus(c.ledgerStatus)) : 'not in the ledger'}.</p>}
      {facts && <p className="muted">{facts}.</p>}
      {c.warnings.length > 0 && <ul className="dr-warn">{c.warnings.map((w, i) => <li key={`${w}-${i}`}>{w}</li>)}</ul>}
    </section>
    <Fold title="Scores">
      {c.match === null ? NONE : (<>
        <div className="score-head">
          <FitBar value={c.match} large />
          <span className="muted">match</span>
          {c.semantic !== null && <><span className="score-sem num">{c.semantic}</span><span className="muted">by meaning</span></>}
        </div>
        <div className="bars">
          {c.components.map((k) => {
            const ratio = (k.value ?? 0) / k.max
            return (
              <div className="bar-row" key={k.key}>
                <span className="bar-key">{SCORE_LABELS[k.key] ?? human(k.key)}</span>
                <span className="bar-track"><span className={`bar-fill${ratio >= 0.75 ? ' hi' : ratio >= 0.5 ? ' mid' : ''}`} style={{ width: `${Math.min(1, ratio) * 100}%` }} /></span>
                <span className="bar-val num">{k.value ?? '–'}<span className="muted">/{k.max}</span></span>
              </div>
            )
          })}
        </div>
      </>)}
    </Fold>
    <Fold title="Evidence">
      {!c.evidence ? NONE : q
        ? <ul className="quotes">{q.map((t, i) => <li key={i}><Narr id={`ev-${c.id}-${i}`} ctx={ctx}>{(sp) => words(t, sp)}</Narr></li>)}</ul>
        : <Narr id={`ev-${c.id}`} ctx={ctx} className="evidence">{(sp) => words(c.evidence, sp)}</Narr>}
    </Fold>
    <Fold title="Missing keywords">
      {c.missing.length === 0 ? NONE : (
        <ul className="dr-kw">
          {c.missing.map((k, i) => (
            <li key={`${k.term}-${i}`}>
              <span className="dr-kw-term">{k.term}</span>
              <Chip value={k.evidence} />
              {k.note && <span className="dr-kw-note">{k.note}</span>}
            </li>
          ))}
        </ul>
      )}
    </Fold>
    <History id={c.id} />
  </>)
}

const EVENT: Record<HistoryEvent['label'], string> = { identified: 'Identified', processed: 'Processed', held: 'Held', unblocked: 'Unblocked', applied: 'Applied', dropped: 'Dropped' }
const when = (at: string): string => `${shortDate(at)}${at.length > 10 ? `, ${at.slice(11)}` : ''}`

// The server dates the events, because the browser bundle cannot see a stage file's time.
function History({ id }: { id: string }) {
  const [events, setEvents] = useState<HistoryEvent[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    let gone = false
    setEvents(null)
    setErr(null)
    rowHistory(id).then((r) => { if (!gone) setEvents(r.events) }, (e: Error) => { if (!gone) setErr(e.message) })
    return () => { gone = true }
  }, [id])
  return (
    <Fold title="History">
      {err ? <p className="none">{err}</p> : !events ? <p className="none">Reading the history.</p> : events.length === 0 ? <p className="none">No dated events are recorded for this role.</p> : (
        <ul className="dr-kw">
          {events.map((e, i) => (
            <li key={`${e.at}-${e.label}-${i}`}>
              <span className="dr-kw-term">{EVENT[e.label]}</span>
              <span className="dr-kw-note num">{when(e.at)}{e.text ? `. ${e.text}` : ''}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="muted">Job id {id}</p>
    </Fold>
  )
}

// What follows a Start now or an extracted Resume click once the matcher has read the JD.
const AFTER_MATCH = "If the matcher drops it, it moves to Dropped. If the applier can't submit, it holds it with its reasons."

// The server reads the lane and the age-out date, because the browser gets one number from inputs.toml.
function NewLead({ st }: { st: HeldStatus | null }) {
  if (!st) return null
  return (<>
    <p className="muted">{st.laneLive === false
      ? 'Its source is not live, so no hunt or Start now will work it.'
      : `The next hunt reads its JD and scores it. Start now does that at once and sends it if the form is clean. ${AFTER_MATCH}`}</p>
    {st.agesOut && <p className="muted">If it is still new at the first hunt on or after {longDate(st.agesOut)}, that hunt drops it as too old.</p>}
  </>)
}

const STEPS = ['Found', 'JD read', 'Scored', 'Ready', 'Applying']
const REACHED: Record<string, number> = { extracted: 1, scored: 2, ready: 3, queued: 3 }

// Only the orchestrator's own stop line has free text, the other log lines are dispatch bookkeeping. Drop its timestamp and tag.
const stopReason = (log: string[]) =>
  log.findLast((l) => /returned: |\(/u.test(l))?.replace(/^\S+ \S+ \S+\s+(?:[a-z]-\S+?:?\s+)?(?:returned:\s+)?/u, '') ?? null

// A board row last seen in the apply lane, or with an apply failure noted, means its applier was claimed, whatever the ledger says.
function Progress({ status, st }: { status: string; st: HeldStatus | null }) {
  const t = st?.trail ?? null
  const at = t?.lane === 'applying' || /apply failed:/u.test(t?.note ?? '') ? 4 : REACHED[status] ?? 0
  const why = stopReason(t?.log ?? [])
  const raw = why ? [] : t?.log ?? [] // the stop line is shown as the sentence, so it is not repeated raw
  return (<>
    <p>{STEPS.map((s, i) => <span key={s} className={i > at ? 'muted' : undefined}>{i ? ', ' : ''}{s}</span>)}</p>
    <p className="muted">It got as far as {STEPS[at]}{t ? ` in ${t.session}, last updated ${t.updated}` : ''}.</p>
    {why && <p className="muted">The hunt log says why it stopped: {why}.</p>}
    {t && (t.note || raw.length > 0) && (
      <ul className="quotes">
        {t.note && <li>Board note: {t.note}</li>}
        {raw.map((l, i) => <li key={i}>{l}</li>)}
      </ul>
    )}
    {status === 'queued' && <p className="muted">Nothing in the engine picks up a queued row, so Drop is the only way to clear it.</p>}
    {status !== 'queued' && st?.laneLive === false && <p className="muted">Its source is not live, so no run will work it.</p>}
    {status !== 'queued' && st?.laneLive !== false && (
      <p className="muted">{status === 'extracted' ? `Resume scores it and sends it if the form is clean. ${AFTER_MATCH}` : 'Resume sends it now if the form is clean. Anything else holds it with its reasons.'}</p>
    )}
  </>)
}

// The JD is a reading page. Scraped HTML in it shows as text, as the renderer never injects HTML.
function Jd({ card: c }: { card: Card }) {
  const tokens = useMemo(() => (c.jd && c.jd.trim() ? lex(c.jd) : null), [c.jd])
  if (!tokens) return <section className="dr-sec">{NONE}</section>
  return <article className="dr-jd rd-page"><Blocks tokens={tokens} ctx={roleCtx(c, 'jd', 'jd')} idBase={`jd-${c.id}`} /></article>
}

function Resume({ card: c }: { card: Card }) {
  if (!c.resume) return <section className="dr-sec">{NONE}</section>
  return (
    <div className="resume">
      <div className="resume-bar">
        <Chip value={c.resume.tailored ? 'tailored' : 'standard'} />
        <span className="grow muted">{c.resume.variant ?? (c.resume.tailored ? 'Tailored resume' : 'Standard resume')}</span>
        <a className="btn small" href={c.resume.url} download>Download the PDF</a>
      </div>
      <iframe className="pdf" src={c.resume.url} title="Resume" />
    </div>
  )
}
