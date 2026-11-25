// The fix buttons for an unsubmitted role. server/held.ts does the work: it opens fix pages in the pinned Chrome,
// reruns the row in the background, and records a drop or a form the candidate sent by hand.
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Card } from '../data/types.ts'
import { INFO, NO_RERUN, OPEN, RERUNNABLE, RESUME, type Fix, type Hold, type HoldKind } from '../data/holds.ts'
import * as api from '../data/heldApi.ts'

const clock = (ms: number | null): string => (ms ? new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '')

export function jobLine(j: api.Job): string {
  if (j.state === 'queued') return `Queued. It starts when the ${j.resume ? 'run' : 'rerun'} before it ends.`
  if (j.state === 'running') return `Running since ${clock(j.startedAt)}. ${j.start ? 'The matcher runs first, so it can take up to 30 minutes.' : j.resume ? 'A run can take up to 15 minutes.' : 'A rerun can take up to 15 minutes.'}`
  return j.outcome
}

// leadHost: an element elsewhere in the drawer where `lead` renders, so the buttons can sit in the drawer's head and the explanation in its body.
export function HeldActions({ card: c, holds, open, lead, leadHost, appTab }: { card: Card; holds: Hold[]; open: boolean; lead?: (st: api.HeldStatus | null) => ReactNode; leadHost?: HTMLElement | null; appTab: 'hunt' | 'retro' }) {
  const [st, setSt] = useState<api.HeldStatus | null>(null)
  const [err, setErr] = useState<string | null>(null) // an action's failure; the status refetch must not clear it
  const [stErr, setStErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [working, setWorking] = useState<string | null>(null)
  const [mode, setMode] = useState<'idle' | 'drop' | 'sent' | 'answer'>('idle')
  const [reason, setReason] = useState('')
  const [poll, setPoll] = useState(0)
  const active = st?.job?.state === 'queued' || st?.job?.state === 'running'
  const watch = active || !!st?.live // a live hunt ends without a click here, so the buttons need a poll to wake up

  useEffect(() => {
    let gone = false
    api.heldStatus(c.id).then((s) => { if (!gone) { setSt(s); setStErr(null) } }, (e: Error) => { if (!gone) setStErr(e.message) })
    return () => { gone = true }
  }, [c.id, poll])
  useEffect(() => {
    if (!watch) return
    const t = setInterval(() => setPoll((n) => n + 1), 4_000)
    return () => clearInterval(t)
  }, [watch])
  // A rerun writes my-sessions/, and an answer writes faq.md. Vite reloads the page on each write, which closes the
  // drawer. The hash makes App open it again on the same tab after the reload; useHashTarget clears it, so it is set on each poll.
  useEffect(() => {
    if (!open || (!active && !busy)) return
    history.replaceState(history.state, '', `${location.pathname}${location.search}#${appTab}/${c.id}/overview`)   // history.state carries App's drawer entry
    return () => history.replaceState(history.state, '', location.pathname + location.search)
  }, [open, active, busy, c.id, poll, appTab])
  useEffect(() => { setMode('idle'); setReason(''); setErr(null) }, [c.id])

  const status = st?.ledger?.status ?? c.ledgerStatus ?? ''
  if (!OPEN.has(status) && !st?.job && !lead) return null
  const can = !!st && OPEN.has(status) && !active && !busy && mode === 'idle' && !st.live // no click before the status lands
  // The server reads the hold kinds from the ledger row, which is newer than the card and covers a card with no reasons.
  const hs = st?.holds ?? holds
  const kinds = [...new Set(hs.map((h) => h.kind))]
  const rerunOk = !kinds.some((k) => NO_RERUN.has(k))
  // No run works a row from a lane that is not live, so it only gets Drop.
  const showRun = RERUNNABLE.has(status) && rerunOk && st?.laneLive === true
  // Every Processing row reads Resume, and an extracted one still takes the Start now route because it needs the matcher. A held lane keeps Rerun.
  const runLabel = status === 'new' ? 'Start now' : status === 'extracted' || (!c.holdReasons && RESUME.has(status)) ? 'Resume' : st?.opened.length ? 'Done, rerun' : 'Rerun'
  // A duplicate is only ever dropped, so its other fix buttons go with Rerun.
  const fixes: { kind: HoldKind; fix: Fix }[] = rerunOk ? kinds.flatMap((kind) => INFO[kind].fixes.map((fix) => ({ kind, fix }))) : []

  const act = async (key: string, f: () => Promise<unknown>) => {
    setBusy(true)
    setWorking(key)
    setErr(null)
    try { await f() } catch (e) { setErr((e as Error).message) } finally {
      setBusy(false)
      setWorking(null)
      setPoll((n) => n + 1)
    }
  }
  const doFix = (kind: HoldKind, fix: Fix) => {
    if (fix.action === 'answer') return setMode('answer')
    if (fix.action === 'sent') return setMode('sent')
    void act(`${kind}-${fix.label}`, async () => { const r = await api.openFix(c.id, kind); setSt((s) => (s ? { ...s, opened: r.opened } : s)) })
  }

  return (
    <div className="held-acts">
      {lead && (leadHost !== undefined ? leadHost && createPortal(lead(st), leadHost) : lead(st))}
      {st?.live && <p className="muted">A /hunt, /outreach or /retro run is live. These buttons wait until it closes.</p>}
      {st?.job && <p className="held-job">{jobLine(st.job)}</p>}
      {mode === 'idle' && OPEN.has(status) && (
        <div className="bm-actions">
          {fixes.map(({ kind, fix }) => (
            <button key={`${kind}-${fix.label}`} className="btn small" disabled={!can} onClick={() => doFix(kind, fix)}>{working === `${kind}-${fix.label}` ? 'Opening…' : fix.label}</button>
          ))}
          {showRun && (
            <button className="btn small" disabled={!can} onClick={() => void act('rerun', async () => { const r = await api.rerun(c.id); setSt((s) => (s ? { ...s, job: r.job } : s)) })}>
              {working === 'rerun' ? 'Starting…' : runLabel}
            </button>
          )}
          {OPEN.has(status) && <button className="btn small ghost" disabled={!can} onClick={() => setMode('drop')}>Drop</button>}
        </div>
      )}
      {mode === 'drop' && (
        <div className="bm-stack">
          <label className="bm-field">
            <span>Why drop it (required)</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Not a fit" autoFocus />
          </label>
          <div className="bm-actions">
            <button className="btn small" disabled={busy || !reason.trim()} onClick={() => void act('drop', async () => { await api.drop(c.id, reason); setMode('idle') })}>{working === 'drop' ? 'Dropping…' : 'Drop'}</button>
            <button className="btn small ghost" disabled={busy} onClick={() => setMode('idle')}>Cancel</button>
          </div>
        </div>
      )}
      {mode === 'sent' && (
        <div className="bm-stack">
          <p className="muted">This records the role as applied today. Click it only after the form went through.</p>
          <div className="bm-actions">
            <button className="btn small" disabled={busy} onClick={() => void act('sent', async () => { await api.markSent(c.id); setMode('idle') })}>{working === 'sent' ? 'Recording…' : 'Yes, I sent it'}</button>
            <button className="btn small ghost" disabled={busy} onClick={() => setMode('idle')}>Cancel</button>
          </div>
        </div>
      )}
      {mode === 'answer' && (
        <AnswerForm
          ids={[c.id]}
          question={hs.filter((h) => h.kind === 'question').map((h) => h.text).join('\n')}
          onBusy={setBusy}
          onDone={(jobs) => { setSt((s) => (s ? { ...s, job: jobs[0] } : s)); setMode('idle'); setPoll((n) => n + 1) }}
          onCancel={() => setMode('idle')}
        />
      )}
      {(err ?? stErr) && <p className="held-err">{err ?? stErr}</p>}
    </div>
  )
}

// A run's writes reload the page, so the form keeps what the candidate typed in this tab's session storage.
type Kept = { q?: string; rough?: string; draft?: { question: string; answer: string } | null }
const PAY = /\b(?:pay|salary|ctc|lpa|compensation)\b/iu // the same words server/held.ts screens
const kept = (key: string): Kept => { try { return (JSON.parse(sessionStorage.getItem(key) ?? '{}') ?? {}) as Kept } catch { return {} } }
const forget = (key: string): void => { try { sessionStorage.removeItem(key) } catch { /* storage unavailable */ } }
// ids: the rows one answer settles. The drawer passes its own row. Retro passes every ready row that a question card lists.
export function AnswerForm({ ids, question, onBusy, onDone, onCancel }: {
  ids: string[]; question: string; onBusy: (b: boolean) => void; onDone: (jobs: api.Job[]) => void; onCancel: () => void
}) {
  const key = `hunt-board:answer:${question}`
  const [q, setQ] = useState(() => kept(key).q ?? question)
  const [rough, setRough] = useState(() => kept(key).rough ?? '')
  const [draft, setDraft] = useState<{ question: string; answer: string } | null>(() => kept(key).draft ?? null)
  const [busy, setBusy] = useState<'draft' | 'save' | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    const json = JSON.stringify({ q, rough, draft })
    // A pay answer is never written to browser storage, as server/held.ts keeps it out of reruns.json.
    try { if (PAY.test(json)) sessionStorage.removeItem(key); else sessionStorage.setItem(key, json) } catch { /* storage unavailable */ }
  }, [key, q, rough, draft])
  const many = ids.length > 1
  const run = async (kind: 'draft' | 'save') => {
    setBusy(kind)
    onBusy(true)
    setErr(null)
    try {
      if (kind === 'draft') setDraft(await api.draftAnswer(ids[0], q, rough))
      else if (draft) {
        forget(key) // the save writes faq.md, which reloads the page before the reply lands
        // Every save goes out at once: the first one writes faq.md and Vite reloads the page, which would cut a loop
        // short. faq.ts writes one row for an identical answer, and the server queues the reruns one at a time.
        const res = await Promise.allSettled(ids.map((id) => api.saveAnswer(id, draft.question, draft.answer)))
        const fails = res.flatMap((r, i) => (r.status === 'rejected' ? [`${many ? `${ids[i]}: ` : ''}${(r.reason as Error).message}`] : []))
        if (fails.length) setErr(fails.join(' '))
        const jobs = res.flatMap((r) => (r.status === 'fulfilled' ? [r.value.job] : []))
        if (jobs.length) onDone(jobs)
      }
    } catch (e) { setErr((e as Error).message) } finally {
      setBusy(null)
      onBusy(false)
    }
  }
  return (
    <div className="bm-stack">
      <label className="bm-field">
        <span>Question on the form</span>
        <textarea rows={3} value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} />
      </label>
      <label className="bm-field">
        <span>Your answer, in your own words</span>
        <textarea rows={3} value={rough} onChange={(e) => setRough(e.target.value)} maxLength={2000} />
      </label>
      <div className="bm-actions">
        <button className="btn small" disabled={busy !== null || !q.trim() || !rough.trim()} onClick={() => void run('draft')}>
          {busy === 'draft' ? 'Drafting…' : draft ? 'Draft again' : 'Draft'}
        </button>
        <button className="btn small ghost" disabled={busy !== null} onClick={() => { forget(key); onCancel() }}>Cancel</button>
      </div>
      {draft && <>
        <label className="bm-field">
          <span>Bank question</span>
          <textarea rows={2} value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} maxLength={300} />
        </label>
        <label className="bm-field">
          <span>Bank answer</span>
          <textarea rows={3} value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} maxLength={1000} />
        </label>
        <p className="muted">Save and rerun adds this to your screening answers, then reruns {many ? `the ${ids.length} roles` : 'the role'}.</p>
        <div className="bm-actions">
          <button className="btn small" disabled={busy !== null || !draft.question.trim() || !draft.answer.trim()} onClick={() => void run('save')}>
            {busy === 'save' ? 'Saving…' : many ? `Save and rerun ${ids.length} roles` : 'Save and rerun'}
          </button>
        </div>
      </>}
      {err && <p className="held-err">{err}</p>}
    </div>
  )
}
