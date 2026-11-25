import { createContext, memo, useContext, useState } from 'react'
import type { FollowUp, PrepQuestion as Question, QuestionBase } from '../data/prepTypes.ts'
import { askedIn, learnFor, useLinksReady } from '../data/links.ts'
import { PassLine } from './PrepFlag.tsx'
import { WikiLine } from './WikiLinks.tsx'
import { Blocks, Narr, gap, inline, lex, lexInline, words, type RenderCtx } from '../reading/render.tsx'

// One prep question as a collapsible card. The body is always in the DOM and hidden by CSS,
// so the print stylesheet can open every card without a render pass.

// Content comes from hand-edited JSON, so anything that isn't an array counts as empty.
const arr = <T,>(v: readonly T[] | undefined): readonly T[] => (Array.isArray(v) ? v : [])
// The same for lists of objects: elements that are not objects are dropped, so a stray string cannot crash a render.
const objs = <T extends object>(v: readonly T[] | undefined): readonly T[] => (Array.isArray(v) ? v.filter((x) => x !== null && typeof x === 'object') : [])
// The same for text: anything that is not a string renders as nothing.
const str = (v: unknown): string => (typeof v === 'string' ? v : '')

// Where the blocks of one open card or glossary entry get their ids and their reading context.
// speak is the card's open state, so a closed card adds nothing to the read-along.
export type PrepReading = { base: string; ctx: RenderCtx }
export const PrepReadingContext = createContext<PrepReading>({ base: 'pq', ctx: { speak: false, crumb: '', kind: 'prep', link: () => '' } })

// A Prep field as Markdown with its line breaks kept. Its blocks get the ids `${base}-${field}-b<n>`.
export function Md({ text, field }: { text: unknown; field: string }) {
  const { base, ctx } = useContext(PrepReadingContext)
  const src = str(text)
  if (src.trim() === '') return null
  return <div className="pq-md rd-page"><Blocks tokens={lex(src, true)} ctx={ctx} idBase={`${base}-${field}`} /></div>
}

function Caret() {
  return <svg className="caret q-caret" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5L5 6.5L8 3.5" /></svg>
}

// One point as a bullet. The label, when there is one, runs into the first line of the text as a bold lead.
// The label sits outside Md, so the saved and spoken text of the block is the text alone.
function Field({ label, text, field }: { label?: string; text: unknown; field: string }) {
  if (str(text).trim() === '') return null
  const lead = str(label).trim()
  return (
    <div className="apt">
      {lead && <b className="apt-label">{/[:.!?]$/u.test(lead) ? lead : `${lead}:`}</b>}
      <Md text={text} field={field} />
    </div>
  )
}

// A list is one read-along unit, with a sentence break between items.
function Bullets({ items, field }: { items: readonly string[] | undefined; field: string }) {
  const { base, ctx } = useContext(PrepReadingContext)
  const list = arr(items).map(str).filter((x) => x.trim() !== '')
  if (list.length === 0) return null
  return (
    <Narr id={`${base}-${field}`} ctx={ctx} save={list.map((x) => `- ${x}`).join('\n')}>
      {(sp) => <ul className="pbullets">{list.map((x, i) => <li key={i}>{gap(sp)}{inline(lexInline(x), ctx, sp)}</li>)}</ul>}
    </Narr>
  )
}

function Steps({ items, field }: { items: readonly { title: string; text: string }[] | undefined; field: string }) {
  const { base, ctx } = useContext(PrepReadingContext)
  const list = objs(items)
  if (list.length === 0) return null
  return (
    <Narr id={`${base}-${field}`} ctx={ctx} save={list.map((s, i) => `${i + 1}. **${str(s.title)}** ${str(s.text)}`).join('\n')}>
      {(sp) => (
        <ol className="psteps">
          {list.map((s, i) => (
            <li key={i}>{gap(sp)}<b>{words(str(s.title), sp)}</b>{gap(sp)} <span>{inline(lexInline(str(s.text)), ctx, sp)}</span></li>
          ))}
        </ol>
      )}
    </Narr>
  )
}

// The fields only one kind of question has that are said or shown as the answer. They sit above the spoken answer.
function KindExtras({ q }: { q: Question }) {
  const { base, ctx } = useContext(PrepReadingContext)
  switch (q.kind) {
    case 'project':
      return (<>
        {objs(q.metrics).map((g, gi) => (
          <div className="pfield" key={g.title}>
            <div className="pfield-label">{g.title}</div>
            <Narr id={`${base}-metrics${gi}`} ctx={ctx}>
              {(sp) => (
                <ul className="metric-list">
                  {objs(g.lines).map((l, i) => (
                    <li key={i}>{gap(sp)}<span>{inline(lexInline(str(l.text)), ctx, sp)}</span></li>
                  ))}
                </ul>
              )}
            </Narr>
          </div>
        ))}
      </>)
    case 'behavioural':
      return (<>
        <Field label="Theme" text={q.theme} field="theme" />
        {arr(q.variations).length > 0 && <div className="pfield"><div className="pfield-label">Also asked as</div><Bullets items={q.variations} field="variations" /></div>}
        {q.star && (
          <div className="answer">
            {(['situation', 'task', 'action', 'result'] as const).map((k) => (
              <Field key={k} label={k[0].toUpperCase() + k.slice(1)} text={q.star?.[k]} field={`star-${k}`} />
            ))}
          </div>
        )}
      </>)
    case 'scenario':
      return <Field label="The scenario" text={q.scenario} field="scenario" />
    case 'design':
      return (<>
        <Field label="The problem" text={q.problem} field="problem" />
        {objs(q.clarifying).length > 0 && (
          <div className="pfield">
            <div className="pfield-label">Clarifying questions</div>
            <Narr id={`${base}-clarifying`} ctx={ctx}>
              {(sp) => (
                <ul className="pbullets">
                  {objs(q.clarifying).map((c, i) => <li key={i}>{gap(sp)}{inline(lexInline(str(c.question)), ctx, sp)} <span className="muted">{str(c.why)}</span></li>)}
                </ul>
              )}
            </Narr>
          </div>
        )}
        {objs(q.steps).length > 0 && <div className="pfield"><div className="pfield-label">Steps</div><Steps items={q.steps} field="steps" /></div>}
        <Field label="Whiteboard" text={q.whiteboard} field="whiteboard" />
        {objs(q.tradeOffs).length > 0 && <div className="pfield"><div className="pfield-label">Trade-offs</div><Steps items={q.tradeOffs} field="tradeoffs" /></div>}
      </>)
    case 'hr':
      return (<>
        {arr(q.variations).length > 0 && <div className="pfield"><div className="pfield-label">Also asked as</div><Bullets items={q.variations} field="variations" /></div>}
      </>)
    case 'trend':
      return (
        <div className="answer">
          <Field label="What it is" text={q.whatItIs} field="what" />
          <Field label="Opinion" text={q.opinion} field="opinion" />
          <Field label="Link to your work" text={q.cvConnection} field="cv" />
          <Field label="Example" text={q.example} field="example" />
          <Field label="If asked: have you used it?" text={q.ifAskedUsed} field="used" />
        </div>
      )
    case 'coaching':
      return (<>
        {objs(q.blocks).map((b, i) => (!arr(b.items).length && !objs(b.scripts).length)
          ? <Field key={i} label={b.heading} text={b.text} field={`c${i}`} />
          : (
          <div className="pfield" key={i}>
            <div className="pfield-label">{b.heading}</div>
            <Md text={b.text} field={`c${i}`} />
            <Bullets items={b.items} field={`c${i}-items`} />
            {objs(b.scripts).length > 0 && (
              <Narr id={`${base}-c${i}-scripts`} ctx={ctx}>
                {(sp) => <ul className="scripts">{objs(b.scripts).map((s, j) => <li key={j}>{gap(sp)}<q>{words(str(s.say), sp)}</q><span className="muted">{str(s.effect)}</span></li>)}</ul>}
              </Narr>
            )}
          </div>
          )
        )}
      </>)
    default:
      return null
  }
}

// The trap, the delivery tip and what to confirm, behind one quiet button. The notes stay in the DOM when
// folded so print can open them, and a folded Tips adds nothing to the read-along.
// The field names are the ones the bookmarks and the read-along anchor on, so they stay as they were.
function Tips({ q }: { q: Question }) {
  const [open, setOpen] = useState(false)
  const { base, ctx } = useContext(PrepReadingContext)
  const tip = 'deliveryTip' in q ? q.deliveryTip : undefined
  const checks = arr(q.checks)
  const confirm = [...checks, ...arr(q.noEvidence?.prepare)].map(str).filter((x) => x.trim() !== '')
  if (str(q.trap).trim() === '' && str(tip).trim() === '' && confirm.length === 0) return null
  return (
    <div className={`tips${open ? ' open' : ''}`}>
      <button type="button" className="tips-head" aria-expanded={open} aria-controls={`${base}-tips`} onClick={() => setOpen((o) => !o)}>
        <Caret />Tips
      </button>
      <PrepReadingContext.Provider value={{ base, ctx: { ...ctx, speak: ctx.speak && open } }}>
        <div className="tips-body" id={`${base}-tips`}>
          <Field label="Trap" text={q.trap} field="trap" />
          <Field label="Delivery tip" text={tip} field="tip" />
          {confirm.length > 0 && (
            <div className="pfield">
              <div className="pfield-label">Confirm before you say this</div>
              <Bullets items={confirm} field={checks.length > 0 ? 'checks' : 'prepare'} />
            </div>
          )}
        </div>
      </PrepReadingContext.Provider>
    </div>
  )
}

function Tags({ q }: { q: QuestionBase }) {
  const projects = arr(q.projectTags)
  const tools = arr(q.toolTags)
  if (projects.length + tools.length === 0) return null
  return (
    <div className="ptags">
      {projects.map((t) => <span key={`p-${t}`} className="tag">{t}</span>)}
      {tools.map((t) => <span key={`t-${t}`} className="tag">{t}</span>)}
    </div>
  )
}

// A follow-up is a fold card. Closed, it adds only its title to the read-along.
function FollowUpItem({ f, path }: { f: FollowUp; path: string }) {
  const [open, setOpen] = useState(false)
  const { base, ctx } = useContext(PrepReadingContext)
  const kids = objs(f.followUps)
  const inner = { base: `${base}-${path}`, ctx: { ...ctx, speak: ctx.speak && open } }
  return (
    <div className={`fu${open ? ' open' : ''}`}>
      <button className="fu-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Caret />
        <Narr inline id={`${base}-${path}-t`} ctx={ctx} className="grow">{(sp) => words(str(f.question), sp)}</Narr>
      </button>
      <PrepReadingContext.Provider value={inner}>
        <div className="fu-body">
          <Md text={f.answer} field="answer" />
          {kids.length > 0 && <div className="fu-list">{kids.map((k, i) => <FollowUpItem key={i} f={k} path={`fu${i}`} />)}</div>}
        </div>
      </PrepReadingContext.Provider>
    </div>
  )
}

type Props = {
  q: Question
  open: boolean
  practised: boolean
  onToggle: (id: string) => void
  onPractised: (id: string, on: boolean) => void
}

// The one note a question carries, in muted grey: facts to confirm, or no story of the candidate's behind the
// answer (nothing in the profile supports it, or its confidence is 'understand'). None when it is clean.
function severity(q: Question): { text: string } | null {
  const n = arr(q.checks).length
  if (n > 0) return { text: `${n} ${n === 1 ? 'fact' : 'facts'} to confirm` }
  if (q.noEvidence || q.confidence === 'understand') return { text: 'No direct story behind this answer' }
  return null
}

const readingOf = (q: Question, speak: boolean): PrepReading =>
  ({ base: `pq-${q.id}`, ctx: { speak, crumb: `Prep > ${str(q.question)}`, kind: 'prep', link: () => `#prep/${q.id}` } })

// The interviews that asked it, as one tag per company, and a muted line of chapters that go deeper. Nothing shows without links.
function PrepWiki({ id }: { id: string }) {
  useLinksReady()
  const asked = askedIn(id)
  return (
    <>
      {asked.length > 0 && (
        <div className="pfield">
          <div className="pfield-label">Asked in</div>
          <div className="ptags">{asked.map((l) => <a key={l.href} className="tag" href={l.href} target="_blank" rel="noopener">{l.label}</a>)}</div>
        </div>
      )}
      <div className="wiki-end"><WikiLine label="Go deeper" links={learnFor(id)} /></div>
    </>
  )
}

// The title of the open question, with the one muted note it carries.
export function QuestionTitle({ q }: { q: Question }) {
  const sev = severity(q)
  const reading = readingOf(q, true)
  return (
    <header className="pd-head">
      <h2 className="pd-title"><Narr inline id={`pq-${q.id}-q`} ctx={reading.ctx}>{(sp) => words(str(q.question), sp)}</Narr></h2>
      {sev && <p className="pd-note">{sev.text}</p>}
      {q.kind !== 'coaching' && <PassLine id={q.id} />}
    </header>
  )
}

// What an open question shows under its title, with the reading context its blocks need. The whole body is the answer
// then the companies, follow-ups and Tips. part picks one half: main is the answer, aside is the rest.
export function QuestionBody({ q, speak, part }: { q: Question; speak: boolean; part?: 'main' | 'aside' }) {
  return (
    <PrepReadingContext.Provider value={readingOf(q, speak)}>
      <div className="q-body" id={part === 'aside' ? undefined : `pq-${q.id}`}>
        {part !== 'aside' && (<>
          <KindExtras q={q} />
          {objs(q.answer).length > 0 && (
            <div className="answer">
              {objs(q.answer).map((p, i) => <Field key={i} label={p.label} text={p.text} field={`a${i}`} />)}
            </div>
          )}
        </>)}
        {part !== 'main' && (<>
          <PrepWiki id={q.id} />
          <Tags q={q} />
          {objs(q.followUps).length > 0 && (
            <div className="pfield">
              <div className="pfield-label">Follow-ups</div>
              <div className="fu-list">{objs(q.followUps).map((f, i) => <FollowUpItem key={i} f={f} path={`fu${i}`} />)}</div>
            </div>
          )}
          <Tips q={q} />
        </>)}
      </div>
    </PrepReadingContext.Provider>
  )
}

export const PrepQuestionCard = memo(function PrepQuestionCard({ q, open, practised, onToggle, onPractised }: Props) {
  const sev = severity(q)
  const bodyId = `pq-${q.id}`
  // The number comes from the stable id ('<tab>-<nnn>'), so filtering never renumbers a card.
  const num = /(\d+)$/u.exec(q.id)?.[1]
  const reading = readingOf(q, open)
  return (
    <article className={`q${open ? ' open' : ''}${practised ? ' done' : ''}`} data-qid={q.id}>
      <div className="q-row">
        <button className="q-head" aria-expanded={open} aria-controls={bodyId} onClick={() => onToggle(q.id)}>
          {num && <span className="q-num num">{Number(num)}</span>}
          <Narr inline id={`pq-${q.id}-q`} ctx={reading.ctx} className="q-text">{(sp) => words(str(q.question), sp)}</Narr>
          {sev && <span className="q-note">{sev.text}</span>}
          <Caret />
        </button>
        <label className="q-check" title="Mark as practised">
          <input type="checkbox" aria-label="Practised" checked={practised} onChange={(e) => onPractised(q.id, e.target.checked)} />
        </label>
      </div>
      <QuestionBody q={q} speak={open} />
    </article>
  )
})
