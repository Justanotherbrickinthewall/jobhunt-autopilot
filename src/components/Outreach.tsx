import { useEffect, useMemo, useState } from 'react'
import { CircleMinus, Clock, Inbox, PenLine, Reply, Send, SkipForward, UserCheck, type LucideIcon } from 'lucide-react'
import { PageHeader } from './PageHeader.tsx'
import { Avatar, Fraction, StateLabel, Tile } from './Chip.tsx'
import { EmptyState, ListDetail, ListRow } from './ui.tsx'
import { loadContacts, inviteWeek, groupByWait, parse, timeline, type Contact } from '../data/outreach.ts'
import { conversation, resolveSend, sendDraft, skipDraft, type Conversation as Conv } from '../data/heldApi.ts'
import { isActive } from '../data/retro.ts'
import { maskPay } from '../data/holds.ts'
import { age, label, longDate, shortDate, type Tone } from './format.ts'

// The status keeps its words from outreach.ts. Its tone says whose move it is: amber for the candidate's,
// blue for the other person's, violet once they replied and grey when closed.
const toneOf = (c: Contact): Tone => (c.replied ? 'violet' : c.wait === 'you' ? 'amber' : c.wait === 'them' ? 'blue' : 'gray')
const iconOf = (c: Contact): LucideIcon => (c.replied ? Reply : c.wait === 'you' ? Inbox : c.wait === 'them' ? Clock : CircleMinus)
const Status = ({ c }: { c: Contact }) => <StateLabel tone={toneOf(c)} icon={iconOf(c)}>{c.status}</StateLabel>
const known = (company: string): string => (/^(not stated|unknown)\b/iu.test(company.trim()) ? '' : company.trim())

// plainNote in outreach.ts writes `2 Nov, sent: text`. A note in any other shape stays one plain message.
const KIND: Record<string, { word: string; icon: LucideIcon; tone: 'out' | 'draft' | 'in' | '' }> = {
  sent: { word: 'Sent', icon: Send, tone: 'out' },
  draft: { word: 'Drafted by Claude', icon: PenLine, tone: 'draft' },
  accepted: { word: 'Accepted', icon: UserCheck, tone: 'in' },
  skipped: { word: 'Skipped', icon: SkipForward, tone: '' },
  declined: { word: 'Declined by you', icon: CircleMinus, tone: '' },
  withdrawn: { word: 'Withdrawn', icon: CircleMinus, tone: '' },
}

// The Outbox: the replies and messages that wait on the candidate, and the ones sent. A draft is sent, edited or skipped here.
// The ledger rows are read in the browser, and the server answers the conversation and runs the send.
export function Outreach({ focus = null }: { focus?: string | null }) {
  const contacts = useMemo(loadContacts, [])
  const byWait = useMemo(() => groupByWait(contacts), [contacts])
  const week = useMemo(() => inviteWeek(contacts), [contacts])
  const [pick, setPick] = useState<string | null>(null)
  const [view, setView] = useState<'outbox' | 'closed'>('outbox')
  // A link from a campaign selects that person and opens the view that holds them.
  useEffect(() => {
    const c = focus ? contacts.find((x) => x.ref === focus) : undefined
    if (!c) return
    setView(byWait.closed.includes(c) ? 'closed' : 'outbox')
    setPick(c.key)
  }, [focus, contacts, byWait])
  const groups = view === 'outbox'
    ? [{ key: 'you', head: 'Waiting for you', count: byWait.you.length, rows: byWait.you }, { key: 'sent', head: 'Sent', rows: byWait.them }]
    : [{ key: 'closed', head: '', rows: byWait.closed }]
  const current = groups.flatMap((g) => g.rows).find((c) => c.key === pick) ?? groups.find((g) => g.rows.length > 0)?.rows[0] ?? null
  const reached = contacts.filter((c) => c.contacted)
  const replied = reached.filter((c) => c.replied).length
  const title = contacts.length === 0 || reached.length === 0
    ? 'No one contacted yet'
    : `${reached.length} of ${contacts.length} ${contacts.length === 1 ? 'person' : 'people'} on the list contacted, ${replied} replied`

  return (
    <>
      <PageHeader cap="Outreach" title={title}>
        <div className="seg" role="group" aria-label="Show">
          <button aria-pressed={view === 'outbox'} onClick={() => setView('outbox')}>Outbox <span className="num">{byWait.you.length + byWait.them.length}</span></button>
          <button aria-pressed={view === 'closed'} onClick={() => setView('closed')}>Closed <span className="num">{byWait.closed.length}</span></button>
        </div>
      </PageHeader>
      {current === null ? (
        contacts.length === 0
          ? <EmptyState icon={Send} title="No one contacted yet"><p>Run <code>/outreach</code> in chat to start.</p></EmptyState>
          : <EmptyState icon={Inbox} title={view === 'outbox' ? 'The outbox is empty' : 'Nothing is closed'}><p>{view === 'outbox' ? 'Choose Closed to see the finished conversations.' : 'Choose Outbox to see the open ones.'}</p></EmptyState>
      ) : (
        <ListDetail
          label="People"
          groups={groups}
          id={(c) => c.key}
          selected={current.key}
          onSelect={(c) => setPick(c.key)}
          unread={(c) => c.replied}
          row={(c) => (
            <ListRow
              lead={<Avatar name={c.name} />}
              name={c.name}
              meta={c.date ? <span title={longDate(c.date)}>{age(c.date)}</span> : undefined}
              preview={c.notes.length > 0 ? maskPay(parse(c.notes[c.notes.length - 1]).text) : 'No notes yet'}
              foot={<><Status c={c} />{known(c.company) && <span>{known(c.company)}</span>}<span>{label(c.channel)}</span></>}
            />
          )}
        >
          <Conversation key={current.key} c={current} /><Context c={current} week={week} />
        </ListDetail>
      )}
    </>
  )
}

const QSLOT = /\[Q\d+\]/u
const when = (at: string): string => (at ? `${shortDate(at.slice(0, 10))}${at.length > 10 ? `, ${at.slice(11, 16)}` : ''}` : '')

// The middle pane: who it is between, the saved conversation, and the draft that waits with Skip, Edit and Send.
// The server answers the text and the hash. A row with no saved ref, or no server, falls back to the dated notes.
function Conversation({ c }: { c: Contact }) {
  const [data, setData] = useState<Conv | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  useEffect(() => {
    if (!c.ref) return
    let gone = false
    conversation(c.ref).then((d) => { if (!gone) { setData(d); setErr(null) } }, (e: unknown) => { if (!gone) setErr(e instanceof Error ? e.message : 'The conversation could not be loaded.') })
    return () => { gone = true }
  }, [c.ref, tick])
  const active = isActive(data?.job ?? undefined)
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setTick((n) => n + 1), 4_000)
    return () => clearInterval(t)
  }, [active])

  if (!c.ref) return <Thread c={c} reason="This is an older log entry. It has no saved conversation." />
  if (err !== null) return <Thread c={c} reason={err} />
  if (data === null) return <Thread c={c} reason="Loading the conversation." />

  const draft = data.draft ?? null
  const body = text ?? draft?.text ?? ''
  const waitReason = QSLOT.test(body) ? 'Fill in or remove the [Q] placeholders first.'
    : data.unknown ? 'An earlier send may have gone out. Say below whether it did.'
    : active ? 'A send is already running.'
    : data.live ? 'A run is live, so Send waits until it closes.' : ''
  const act = async (f: () => Promise<unknown>) => {
    setBusy(true); setMsg('')
    try { await f(); setConfirm(false); setTick((n) => n + 1) } catch (e) { setMsg(e instanceof Error ? e.message : 'That did not work.') } finally { setBusy(false) }
  }
  const entries = timeline(c, data.events)
  const company = known(c.company)
  const rows: [string, string][] = ([['From', draft?.from ?? ''], ['To', draft?.to || c.name], ['Channel', label(c.channel)], ['Subject', draft?.subject ?? ''], ['Attachment', draft?.attach ?? '']] as [string, string][]).filter((r) => r[1])
  const job = data.job
  const reason = msg || (job && job.outcome) || (job?.state === 'queued' ? 'The send is queued.' : job?.state === 'running' ? 'Sending. This takes a few minutes.' : '') || data.refuse || ''

  return (
    <>
      <div className="th-head">
        <div>
          <b>{c.name}</b>
          <span className="who-sub">{company && <span>{company}</span>}<span>{label(c.channel)}</span></span>
        </div>
        <Status c={c} />
      </div>
      <dl className="ob-rows">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      {data.gap && <p className="ctx-note">{data.gap}</p>}
      {entries.length === 0 ? <p className="ctx-note">Nothing was saved for this person.</p> : (
        <ol className="th-list">
          {entries.map((e, i) => (
            <li key={i}>
              {e.dir === 'in' ? <Avatar name={e.who || c.name} small /> : <span className="th-me" aria-hidden="true"><Send size={12} /></span>}
              <div className={`th-msg${e.dir === 'out' ? ' out' : ''}`}>
                <div className="th-msg-head">
                  <b>{e.head ?? (e.dir === 'out' ? 'Sent' : 'Received')}</b>
                  <span className="who-sub"><span>{label(e.channel)}</span>{e.subject && <span>{e.subject}</span>}</span>
                  {e.at && <time>{when(e.at)}</time>}
                </div>
                <p className="ob-pre">{e.text}</p>
                {e.attachments && <div className="th-msg-foot">Attachment: {e.attachments}</div>}
                {e.note && <div className="th-msg-foot">{e.note}</div>}
              </div>
            </li>
          ))}
        </ol>
      )}
      {draft && (
        <div className="ob-draft">
          <div className="ob-draft-head"><span className="cap">Draft waiting for you</span></div>
          {editing
            ? <textarea className="ob-edit" aria-label="Reply text" value={body} onChange={(e) => setText(e.target.value)} rows={Math.min(18, Math.max(6, body.split('\n').length + 1))} />
            : <p className="ob-pre">{body}</p>}
          {draft.asked && <div className="ob-why"><span className="cap">Why it was written</span><p className="ob-pre">{draft.asked}</p></div>}
          {draft.questions.length > 0 && <div className="ob-why"><span className="cap">Open questions</span><ul>{draft.questions.map((q, i) => <li key={i}>{q}</li>)}</ul></div>}
          <div className="ob-foot">
            <span className="ob-reason">{waitReason}</span>
            <button className="btn" disabled={busy || data.unknown || active || !!data.live} onClick={() => (confirm ? void act(() => skipDraft(c.ref)) : setConfirm(true))}>{confirm ? 'Confirm skip' : 'Skip'}</button>
            <button className="btn" disabled={busy} onClick={() => setEditing((v) => !v)}>{editing ? 'Done editing' : 'Edit'}</button>
            <button className="btn fill" disabled={busy || waitReason !== ''} onClick={() => void act(() => sendDraft(c.ref, draft.sha, body))}>Send</button>
          </div>
        </div>
      )}
      {reason && <p className="ob-reason block">{reason}</p>}
      {data.unknown && (
        <div className="ob-foot">
          <button className="btn" disabled={busy} onClick={() => void act(() => resolveSend(c.ref, true))}>It went out</button>
          <button className="btn" disabled={busy} onClick={() => void act(() => resolveSend(c.ref, false))}>It did not go out</button>
        </div>
      )}
    </>
  )
}

// The middle pane: the contact's dated notes as messages, oldest first.
function Thread({ c, reason }: { c: Contact; reason?: string }) {
  const company = known(c.company)
  const last = c.notes.length - 1
  return (
    <>
      <div className="th-head">
        <div>
          <b>{c.name}</b>
          <span className="who-sub">{company && <span>{company}</span>}<span>{label(c.channel)}</span><span>{c.notes.length} {c.notes.length === 1 ? 'note' : 'notes'}</span></span>
        </div>
        <Status c={c} />
      </div>
      {reason && <p className="ctx-note">{reason}</p>}
      {c.notes.length === 0 ? <p className="ctx-note">No notes recorded for this person.</p> : (
        <ol className="th-list">
          {c.notes.map((n, i) => {
            const m = parse(n)
            const k = KIND[m.kind]
            const Icon = k?.icon ?? PenLine
            const waiting = k?.tone === 'draft' && i === last && c.wait === 'you'
            return (
              <li key={i}>
                {k?.tone === 'in' ? <Avatar name={c.name} small /> : <span className="th-me" aria-hidden="true"><Icon size={12} /></span>}
                {/* Only the draft that waits on the candidate gets the halo; an older one sits on sub with the log. */}
                <div className={`th-msg${k?.tone === 'draft' ? (waiting ? ' draft' : '') : k?.tone ? ` ${k.tone}` : ''}`}>
                  <div className="th-msg-head">
                    <b>{k?.word ?? (m.kind ? label(m.kind) : 'Note')}</b>
                    {waiting && <Status c={c} />}
                    {m.date && <time>{m.date}</time>}
                  </div>
                  <p>{maskPay(m.text)}</p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </>
  )
}

// The card under the thread: who this is, how we reached them, and the week's connection requests against the cap.
function Context({ c, week }: { c: Contact; week: { used: number; cap: number } | null }) {
  const company = known(c.company)
  return (
    <div className="ctx">
      <div className="ctx-head"><span className="cap">About {c.name.split(' ')[0]}</span></div>
      <div className="ctx-grid">
        <div className="ctx-cell">
          <span className="cap">Company</span>
          <span className="ctx-val">{company ? <><Tile name={company} /><span>{company}</span></> : <span className="faint">Not recorded</span>}</span>
        </div>
        <div className="ctx-cell">
          <span className="cap">Channel</span>
          <span className="ctx-val">{label(c.channel)}</span>
          <span className="ctx-sub">{c.date ? `Last touch ${shortDate(c.date)}, ${age(c.date)}` : 'No touch recorded'}</span>
        </div>
        {week && (
          <div className="ctx-cell">
            <span className="cap">Invitations this week</span>
            <span className="ctx-val"><Fraction n={week.used} of={week.cap} /></span>
            <span className="ctx-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (week.used / Math.max(1, week.cap)) * 100)}%` }} /></span>
          </div>
        )}
      </div>
    </div>
  )
}
