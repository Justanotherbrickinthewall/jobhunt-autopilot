import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Ban, Briefcase, CircleCheck, CircleMinus, CircleX, CopyCheck, CornerDownRight, ExternalLink, Globe, Info, ListChecks, LogIn,
  MessageCircleQuestionMark, PenLine, RotateCw, Search, ShieldCheck, Sparkles, SquarePen, UserPlus, type LucideIcon,
} from 'lucide-react'
import type { Analytics, Card, Tally } from '../data/types.ts'
import { INFO, hostIn, maskEmail, plainLines, type HoldKind } from '../data/holds.ts'
import * as api from '../data/heldApi.ts'
import type { useHeldRun } from '../data/useHeldRun.ts'
import { PageHeader } from './PageHeader.tsx'
import { buildRetro, isActive, othersBlock, repliedCount, type RetroItem, type RetroRow } from '../data/retro.ts'
import { AnswerForm, jobLine } from './HeldActions.tsx'
import { Chip, FitBar, StateLabel, Tile } from './Chip.tsx'
import { EmptyState, ListDetail, ListRow } from './ui.tsx'
import { label, pct, shortDate } from './format.ts'
import { KIND_TONE, waitingFor } from './Today.tsx'

// The Retro view, laid out as an outbox: the questions that block roles on the left, the chosen one on the right,
// and the hunt numbers behind the page bar's switch. Retro runs across every hunt, so App hands it every row whatever
// hunt the filter picked, and the run state it already polls for the rail.
type HeldRun = ReturnType<typeof useHeldRun>
const roles = (n: number): string => `${n} ${n === 1 ? 'role' : 'roles'}`
const companies = (rows: RetroRow[]): string => [...new Set(rows.map((r) => r.card.company || 'Unknown company'))].join(', ')
const when = (ms: number): string => new Date(ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const latest = (it: RetroItem): string => it.rows.reduce((m, r) => (r.at > m ? r.at : m), '')
const bare = (s: string): string => s.toLowerCase().replace(/[\s.?!:]+$/u, '').trim()

// One icon per kind of hold, so an account, a consent and a question look different in the list.
const KIND_ICON: Partial<Record<HoldKind, LucideIcon>> = {
  account: UserPlus, signin: LogIn, domain: Globe, question: MessageCircleQuestionMark, checkpoint: ShieldCheck, captcha: ShieldCheck,
  staffing: Briefcase, consent: ListChecks, duplicate: CopyCheck, resume: SquarePen, blocked: Ban, failed: CircleX, stopped: CircleMinus,
}

export function Retro({ a, cards, held, onOpen, focusKey }: { a: Analytics; cards: Card[]; held: HeldRun; onOpen: (c: Card) => void; focusKey?: string | null }) {
  const { run, jobs, refresh } = held
  const [all, setAll] = useState(false)
  const [view, setView] = useState<'questions' | 'numbers'>('questions')
  const [pick, setPick] = useState<string | null>(focusKey ?? null)
  // Today links here: that question is chosen and scrolled into view.
  useEffect(() => { if (focusKey) { setPick(focusKey); setView('questions') } }, [focusKey])
  const { open, resolved } = useMemo(() => buildRetro(cards, jobs), [cards, jobs])
  const replied = useMemo(() => repliedCount(cards), [cards])
  const shown = all ? resolved : resolved.slice(0, TOP)
  const current = [...open, ...shown].find((it) => it.key === pick) ?? open[0] ?? shown[0] ?? null
  const done = current !== null && !open.includes(current)
  const title = open.length === 0 ? 'Nothing needs you' : `${open.length} ${open.length === 1 ? 'question needs' : 'questions need'} you`

  return (
    <>
      <PageHeader cap="Retro" title={title}>
        <div className="seg" role="group" aria-label="Show">
          <button aria-pressed={view === 'questions'} onClick={() => setView('questions')}>Questions</button>
          <button aria-pressed={view === 'numbers'} onClick={() => setView('numbers')}>Numbers</button>
        </div>
      </PageHeader>
      {view === 'numbers' ? (
        <div className="scroll">
          <div className="retro">
            <section className="retro-numbers">
              <h2>{a.found === 0 ? 'No roles have been found yet.' : `${a.applied} of ${a.found} roles found were applied to, ${pct(a.applied, a.found)}.`}</h2>
              <FunnelSection a={a} replied={replied} />
              <div className="retro-pair">
                <SourcesSection sources={a.sources} total={a.found} />
                <ScoresSection bins={a.matchBins} avg={a.avgMatch} scored={a.scoredCount} />
              </div>
              <KeywordsSection no={a.missingNo} partial={a.missingPartial} found={a.found} />
            </section>
          </div>
        </div>
      ) : current === null ? (
        <EmptyState icon={CircleCheck} title="Nothing needs you"><p>A role a hunt cannot finish shows here, with the question that blocks it.</p></EmptyState>
      ) : (
        <ListDetail
          label="Questions"
          groups={[{ key: 'open', head: 'Needs you', rows: open }, { key: 'resolved', head: 'Resolved', rows: shown, count: resolved.length }]}
          id={(it) => it.key}
          selected={current.key}
          onSelect={(it) => setPick(it.key)}
          row={(it) => <ItemRow item={it} done={!open.includes(it)} jobs={jobs} />}
          foot={resolved.length > TOP && <button className="btn ghost small" onClick={() => setAll(!all)}>{all ? `Show the newest ${TOP}` : `Show all ${resolved.length} resolved`}</button>}
        >
          <Detail key={current.key} item={current} done={done} jobs={jobs} opened={run?.opened ?? null} onOpen={onOpen} onDone={refresh} />
        </ListDetail>
      )}
    </>
  )
}

// A list row: the company tile and name, the question, and the hold as a reason under the Held label.
function ItemRow({ item, done, jobs }: { item: RetroItem; done: boolean; jobs: ReadonlyMap<string, api.Job> }) {
  const first = item.rows[0].card
  const spinning = item.rows.some((r) => isActive(jobs.get(r.card.id)))
  const at = latest(item)
  return (
    <ListRow
      lead={<Tile name={first.company || item.title} />}
      name={companies(item.rows)}
      meta={<>{spinning && <span className="spin" role="img" aria-label="A run is queued or running" />}{done ? (at ? shortDate(at) : '') : <span title="Since the oldest blocked role was found">{waitingFor(item)}</span>}</>}
      line={item.title}
      foot={done
        ? <><StateLabel value={first.column} />{item.rows.length > 1 && <span>and {roles(item.rows.length - 1)} more</span>}</>
        : <><StateLabel value="held" icon={KIND_ICON[item.kind]}>{INFO[item.kind].label}</StateLabel><span>{item.rows.length === 1 ? first.role : roles(item.rows.length)}</span></>}
    />
  )
}

function Section({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="retro-sec">
      <h2>{title}</h2>
      {lead && <p className="lead">{lead}</p>}
      {children}
    </section>
  )
}

export function FunnelSection({ a, replied }: { a: Analytics; replied: number }) {
  const steps = [
    { label: 'Found', n: a.found, rate: '', of: '' },
    { label: 'Swept', n: a.swept, rate: pct(a.swept, a.found), of: 'of found' },
    { label: 'Applied', n: a.applied, rate: pct(a.applied, a.swept), of: 'of swept' },
    { label: 'Replied', n: replied, rate: pct(replied, a.applied), of: 'of applied' },
  ]
  return (
    <Section title="Funnel">
      <div className="funnel">
        {steps.map((s) => (
          <div className="funnel-row" key={s.label}>
            <span className="f-label">{s.label}</span>
            <span className="f-track"><span className="f-fill" style={{ width: a.found ? `${(s.n / a.found) * 100}%` : 0 }} /></span>
            <span className="f-n num">{s.n}</span>
            <span className="f-rate num muted">{s.rate && `${s.rate} ${s.of}`}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

export function SourcesSection({ sources, total }: { sources: Tally[]; total: number }) {
  const top = sources[0]
  return (
    <Section title="Sources" lead={top ? `${label(top.name)} supplied ${pct(top.count, total)} of roles, across ${sources.length} source${sources.length === 1 ? '' : 's'}.` : 'No sources recorded.'}>
      {sources.length > 0 && (<>
        <div className="stack" role="img" aria-label={sources.map((s) => `${label(s.name)} ${s.count}`).join(', ')}>
          {sources.map((s, i) => <span key={s.name} className={`seg-${i % 6}`} style={{ flexGrow: s.count }} title={`${label(s.name)}: ${s.count}`} />)}
        </div>
        <ul className="legend">
          {sources.map((s, i) => (
            <li key={s.name}>
              <span className={`swatch seg-${i % 6}`} aria-hidden="true" />
              <span className="grow">{label(s.name)}</span>
              <span className="num">{s.count}</span>
              <span className="num muted">{pct(s.count, total)}</span>
            </li>
          ))}
        </ul>
      </>)}
    </Section>
  )
}

export function ScoresSection({ bins, avg, scored }: { bins: number[]; avg: number | null; scored: number }) {
  const max = Math.max(1, ...bins)
  const high = bins.slice(7).reduce((s, n) => s + n, 0)
  return (
    <Section
      title="Match scores"
      lead={scored === 0 ? 'No scored roles in this scope.' : `Average ${avg} across ${scored} scored roles. ${high} scored 70 or more.`}
    >
      {scored > 0 && (
        <div className="hist">
          <div className="hist-bars">
            {bins.map((n, i) => (
              <span key={i} className="hist-bar" title={`${i * 10}-${i === 9 ? 100 : i * 10 + 9}: ${n}`}>
                <span style={{ height: `${(n / max) * 100}%` }} />
              </span>
            ))}
            {avg !== null && (
              <span className="hist-avg" style={{ left: `${Math.min(100, Math.max(0, avg))}%` }} title={`average ${avg}`}>
                <span className="num">avg {avg}</span>
              </span>
            )}
          </div>
          <div className="hist-axis num" aria-hidden="true"><span>0</span><span>50</span><span>100</span></div>
        </div>
      )}
    </Section>
  )
}

type KwSort = { key: 'count' | 'name'; dir: 'asc' | 'desc' }
const TOP = 20

export function KeywordsSection({ no, partial, found }: { no: Tally[]; partial: Tally[]; found: number }) {
  const [q, setQ] = useState('')
  const [all, setAll] = useState(false)
  const [sort, setSort] = useState<KwSort>({ key: 'count', dir: 'desc' })
  const rowsOf = (items: Tally[]) => {
    const needle = q.trim().toLowerCase()
    const sign = sort.dir === 'asc' ? 1 : -1
    return [...items]
      .filter((k) => !needle || k.name.toLowerCase().includes(needle))
      .sort((x, y) => (sort.key === 'count' ? (x.count - y.count) * sign || x.name.localeCompare(y.name) : x.name.localeCompare(y.name) * sign))
  }
  const noRows = rowsOf(no)
  const partialRows = rowsOf(partial)
  const more = noRows.length > TOP || partialRows.length > TOP
  const onSort = (key: KwSort['key']) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'count' ? 'desc' : 'asc' }))

  return (
    <Section
      title="Missing keywords"
      lead={`${no.length} terms with no evidence in the profile, and ${partial.length} with partial evidence. Counts are roles that asked for the term.`}
    >
      <div className="kw-tools">
        <label className="search">
          <Search size={14} aria-hidden="true" />
          <input type="search" placeholder="Filter terms" aria-label="Filter terms" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {more && <button className="btn" onClick={() => setAll(!all)}>{all ? `Show the top ${TOP}` : `Show all ${no.length + partial.length} keywords`}</button>}
      </div>
      <div className="kw-pair">
        <KwTable label="no" rows={noRows} total={no.length} found={found} all={all} sort={sort} onSort={onSort} />
        <KwTable label="partial" rows={partialRows} total={partial.length} found={found} all={all} sort={sort} onSort={onSort} />
      </div>
    </Section>
  )
}

function KwTable(p: { label: 'no' | 'partial'; rows: Tally[]; total: number; found: number; all: boolean; sort: KwSort; onSort: (k: KwSort['key']) => void }) {
  const shown = p.all ? p.rows : p.rows.slice(0, TOP)
  const max = Math.max(1, ...p.rows.map((k) => k.count))
  const arrow = (k: KwSort['key']) => (p.sort.key === k ? <span className={`dir ${p.sort.dir}`} aria-hidden="true" /> : null)
  const ariaSort = (k: KwSort['key']) => (p.sort.key === k ? (p.sort.dir === 'asc' ? 'ascending' : 'descending') : undefined)
  return (
    <div className="kw-block">
      <h3>
        <Chip value={p.label} />
        <span>evidence</span>
        <span className="muted num">{p.rows.length === p.total ? p.total : `${p.rows.length} of ${p.total}`}</span>
      </h3>
      {p.rows.length === 0 ? <p className="none">{p.total === 0 ? 'none recorded' : 'no terms match'}</p> : (
        <table className={`kw-table${p.label === 'partial' ? ' partial' : ''}`}>
          <colgroup><col className="k-rank" /><col /><col className="k-n" /><col className="k-share" /></colgroup>
          <thead>
            <tr>
              <th aria-hidden="true" />
              <th aria-sort={ariaSort('name')}><button onClick={() => p.onSort('name')}>Term {arrow('name')}</button></th>
              <th aria-sort={ariaSort('count')} className="right"><button onClick={() => p.onSort('count')}>Roles {arrow('count')}</button></th>
              <th>Share of roles</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((k, i) => (
              <tr key={`${k.name}-${i}`}>
                <td className="muted num right">{i + 1}</td>
                <td><span className="kw-term" title={k.name}>{k.name}</span></td>
                <td className="num right">{k.count}</td>
                <td>
                  <span className="kw-share">
                    <span className="kw-track"><span style={{ width: `${(k.count / max) * 100}%` }} /></span>
                    <span className="num muted">{pct(k.count, p.found)}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!p.all && p.rows.length > TOP && <p className="kw-more muted">{p.rows.length - TOP} more behind "Show all"</p>}
    </div>
  )
}

// The chosen question: its fields, the question itself, the agent's reasons in the "because" box, and its buttons.
function Detail({ item, done, jobs, opened, onOpen, onDone }: {
  item: RetroItem; done: boolean; jobs: ReadonlyMap<string, api.Job>; opened: Record<string, HoldKind[]> | null
  onOpen: (c: Card) => void; onDone: () => void
}) {
  const spinning = item.rows.some((r) => isActive(jobs.get(r.card.id)))
  // Rows that a group action leaves out, because another hold on them is not settled by it.
  const also = done ? [] : item.rows.filter((r) => !isActive(jobs.get(r.card.id)) && othersBlock(item, r.card, opened?.[r.card.id] ?? []))
  const host = hostIn(item.rows[0].hold.text)
  const quotes = [...new Set(item.rows.flatMap((r) => [r.hold.raw, ...r.more].flatMap(plainLines)))]
  const asked = item.ask && bare(item.ask) !== bare(item.title) ? item.ask : ''
  const at = latest(item)
  return (
    <>
      <div className="ld-field">
        <span className="cap">Kind</span>
        <span className="ld-val"><Chip tone={KIND_TONE[item.kind] ?? 'gray'}>{INFO[item.kind].label}</Chip>{spinning && <span className="faint"><span className="spin" aria-hidden="true" /> A run is queued or running</span>}</span>
      </div>
      {host && <div className="ld-field"><span className="cap">Site</span><span className="ld-val">{host}</span></div>}
      <div className="ld-field top">
        <span className="cap">{item.rows.length === 1 ? 'Role' : 'Roles'}</span>
        <ul className="ld-roles">{item.rows.map((r) => <RoleRow key={r.card.id} row={r} job={jobs.get(r.card.id)} done={done} onOpen={onOpen} />)}</ul>
      </div>
      <h2 className="ld-h">{item.title}</h2>
      {(asked || !done) && <div className="ld-body">{asked && <p>{asked}</p>}{!done && <p>{INFO[item.kind].step}</p>}</div>}
      {(quotes.length > 0 || also.length > 0) && (
        <div className="because">
          {quotes.length > 0 && <><span className="cap"><Sparkles size={12} aria-hidden="true" />Why the agent held it</span>
          <ul>{quotes.map((t) => <li key={t}><CornerDownRight size={13} aria-hidden="true" />{t}</li>)}</ul></>}
          {also.length > 0 && <p>{companies(also)} {also.length === 1 ? 'also has' : 'also have'} another hold. Open the {also.length === 1 ? 'role' : 'roles'} to fix {also.length === 1 ? 'both' : 'them'} together.</p>}
        </div>
      )}
      {done
        ? <div className="ld-foot"><span className="ld-note good"><CircleCheck size={13} aria-hidden="true" />{at ? `Settled ${shortDate(at)}` : 'Settled'}</span></div>
        : <Actions item={item} jobs={jobs} opened={opened} onDone={onDone} onOpen={onOpen} />}
    </>
  )
}

// How a resolved row ended, from the ledger the page loaded.
function ended(c: Card): string {
  if (c.column === 'applied') return c.appliedDate ? `Applied ${shortDate(c.appliedDate.slice(0, 10))}` : 'Applied'
  if (c.column === 'dropped') return c.dropReason ? `${c.dropReason.type}${c.dropReason.text ? `: ${c.dropReason.text}` : ''}` : 'Dropped'
  return c.column === 'new' ? 'Back in New' : 'Back in Processing'
}

// One blocked role as a field value. Its name opens the role in the drawer.
function RoleRow({ row: { card: c }, job, done, onOpen }: { row: RetroRow; job: api.Job | undefined; done: boolean; onOpen: (c: Card) => void }) {
  const line = plainLines(isActive(job) ? jobLine(job) : done ? ended(c) : job?.outcome ?? '').join('. ')
  return (
    <li>
      <button className="ld-role" data-id={c.id} onClick={() => onOpen(c)}>
        <Tile name={c.company || 'Unknown company'} /><b>{c.company || 'Unknown company'}</b><span>{c.role || 'Untitled role'}</span>
      </button>
      <FitBar value={c.match} />
      <StateLabel value={c.column} />
      {line && <span className="ld-role-note">{isActive(job) && <span className="spin" aria-hidden="true" />}{line}</span>}
      {done && job?.answer && <span className="ld-role-note">You answered: {maskEmail(job.answer.answer)} ({when(job.queuedAt)})</span>}
    </li>
  )
}

// The buttons under an unresolved question: the fix as the primary button, Rerun as the default one. Every call goes
// out at once: the first write reloads the page (Vite watches my-sessions/ and faq.md), which would cut a loop short.
// The server queues the reruns one at a time.
// shortcut: a browser sends at most 6 requests to one host at once, so a question over 6 roles can lose the rest to that reload; split the calls if one grows that big.
function Actions({ item, jobs, opened, onDone, onOpen }: {
  item: RetroItem; jobs: ReadonlyMap<string, api.Job>; opened: Record<string, HoldKind[]> | null; onDone: () => void; onOpen: (c: Card) => void
}) {
  const [busy, setBusy] = useState<'open' | 'rerun' | null>(null)
  const [errs, setErrs] = useState<string[]>([])
  const [form, setForm] = useState(false)
  const note = <span className="ld-note"><Info size={13} aria-hidden="true" />Blocks {roles(item.rows.length)}</span>
  // A kind that only the drawer fixes has no group action, so its button opens the role.
  if (item.kind !== 'question' && item.kind !== 'account' && item.kind !== 'domain') {
    return (
      <div className="ld-foot">
        {note}
        <button className="btn fill" onClick={() => onOpen(item.rows[0].card)}>{item.rows.length === 1 ? 'Review the role' : 'Review the first role'}</button>
      </div>
    )
  }
  if (!opened) return <div className="ld-foot"><span className="ld-note"><Info size={13} aria-hidden="true" />The fix buttons need the dashboard's server, which isn't answering.</span></div>
  const pages = (c: Card): HoldKind[] => opened[c.id] ?? []
  const idle = item.rows.filter((r) => !isActive(jobs.get(r.card.id)))
  const waiting = idle.filter((r) => othersBlock(item, r.card, pages(r.card)))
  // A wall's own page must be open too: Open marks it on every row held at the same host.
  const ready = idle.filter((r) => !waiting.includes(r) && (item.kind === 'question' || pages(r.card).includes(item.kind)))
  const each = async (key: 'open' | 'rerun', ids: string[], call: (id: string) => Promise<unknown>) => {
    setBusy(key)
    setErrs([])
    const res = await Promise.allSettled(ids.map(call))
    setErrs(res.flatMap((r, i) => (r.status === 'rejected' ? [`${ids[i]}: ${(r.reason as Error).message}`] : [])))
    setBusy(null)
    onDone()
  }
  return (
    <>
      {item.kind === 'question' && form && ready.length > 0 && (
        <div className="ld-reply">
          <AnswerForm ids={ready.map((r) => r.card.id)} question={item.ask || item.title} onBusy={() => {}} onDone={onDone} onCancel={() => setForm(false)} />
        </div>
      )}
      <div className="ld-foot">
        {item.kind === 'question' || ready.length > 0 ? note : <span className="ld-note"><Info size={13} aria-hidden="true" />Opens in the pinned Chrome profile. You make the account or sign in yourself.</span>}
        {item.kind === 'question' ? (ready.length > 0 && !form && (
          <button className="btn fill" onClick={() => setForm(true)}><PenLine size={14} aria-hidden="true" />Answer</button>
        )) : (<>
          {ready.length > 0 && (
            <button className="btn" disabled={busy !== null} onClick={() => void each('rerun', ready.map((r) => r.card.id), api.rerun)}>
              <RotateCw size={14} aria-hidden="true" />{busy === 'rerun' ? 'Starting…' : `Rerun ${roles(ready.length)}`}
            </button>
          )}
          <button className="btn fill" disabled={busy !== null || idle.length === 0} onClick={() => void each('open', [idle[0].card.id], (id) => api.openFix(id, item.kind))}>
            <ExternalLink size={14} aria-hidden="true" />{busy === 'open' ? 'Opening…' : INFO[item.kind].fixes[0]?.label ?? 'Open site'}
          </button>
        </>)}
      </div>
      {errs.map((e) => <p key={e} className="ld-err">{e}</p>)}
    </>
  )
}
