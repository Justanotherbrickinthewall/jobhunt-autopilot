import { Fragment, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Check } from 'lucide-react'
import { Lexer, type Token, type Tokens } from 'marked'
import { loadProfileFiles, type ProfileFile, type ProfileFileKey } from '../data/profile.ts'
import { Blocks, inline, plain, type RenderCtx } from '../reading/render.tsx'
import { readKey, useStored, writeKey } from '../reading/storage.ts'
import { reveal, take, type Target } from '../reading/router.ts'
import { PageHeader } from './PageHeader.tsx'
import { ListRow, StatStrip, type Stat } from './ui.tsx'
import { Splitter } from './Splitter.tsx'
import { toTop } from '../util.ts'
import { longDate, shortDate } from './format.ts'

const TAB_KEY = 'hunt-board:profile-tab:v1'
const READ_KEY = 'hunt-board:profile-read:v1'
const TAB_KEYS: ProfileFileKey[] = ['profile', 'work-portfolio', 'faq']
const NONE_READ: Record<string, true> = {}

function loadTab(): ProfileFileKey {
  try {
    const v = localStorage.getItem(TAB_KEY)
    return TAB_KEYS.find((k) => k === v) ?? 'profile'
  } catch { return 'profile' }
}

const slugify = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s/gu, '-')

const PAREN_END = /\s*\(([^()]*)\)\s*$/u
const CAPS = /^([A-Z][A-Z0-9&-]{2,}(?: [A-Z][A-Z0-9&-]+)*)(?:\s+(\d.*))?$/u
const INTERNAL = /^(?:\.\/)?(profile|work-portfolio|faq)\.md(?:#(.+))?$/u

// ---- document model ------------------------------------------------------------------------------

type Heading = Tokens.Heading
type Item = { h3: Heading; id: string; blocks: Token[] }
type Section = { h2: Heading; id: string; pre: Token[]; items: Item[] }
type Doc = { h1: Heading | null; intro: Token[]; sections: Section[] }

// An authority tag carries the date it was set. Show it as '2 Nov', or '2 Nov 2025' outside this year.
const TAG_DATE = /(`(?:stated|artefact|ours)`\s*)(\d{4}-\d{2}-\d{2})/gu
const niceDate = (iso: string) => (iso.startsWith(String(new Date().getFullYear())) ? shortDate(iso) : longDate(iso))

// shortcut: hides any paragraph that names a file; mark agent-only notes in the profile files if a real sentence goes missing.
function agentOnly(t: Token): boolean {
  if (t.type !== 'paragraph') return false
  const codes = ((t as Tokens.Paragraph).tokens ?? []).filter((x) => x.type === 'codespan').map((x) => String((x as Tokens.Codespan).text))
  return codes.some((c) => /\.(?:toml|json|md)\b/u.test(c) || c.startsWith('node '))
}

// shortcut: a list item that names a command is an agent rule and is hidden whole; mark such rules in the file if a real sentence goes missing.
const COMMAND = /^`(?:node|\/(?:retro|hunt|outreach|profile|setup)\b)/u
function withoutRules(t: Token): Token | null {
  if (t.type !== 'list') return t
  const items = (t as Tokens.List).items.filter((i) => !COMMAND.test(i.text.split(/\.\s/u)[0] ?? ''))
  return items.length === 0 ? null : items.length === (t as Tokens.List).items.length ? t : ({ ...t, items } as Tokens.List)
}

const wordCount = (tokens: Token[]) => tokens.reduce((n, t) => n + (t.raw.match(/\S+/gu)?.length ?? 0), 0)
const sectionWords = (s: Section) => wordCount([...s.pre, ...s.items.flatMap((i) => i.blocks)])

function parseDoc(source: string, file: ProfileFileKey): Doc {
  const seen = new Map<string, number>()
  const idFor = (h: Heading) => {
    const base = slugify(plain(h.tokens)) || 'section'
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    return `pf-${file}-${n === 0 ? base : `${base}-${n}`}`
  }
  const doc: Doc = { h1: null, intro: [], sections: [] }
  let section: Section | null = null
  let item: Item | null = null
  // Provenance in brackets (ids, retro sittings, role ids) and the file names in links are for the agent.
  const NAMES: Record<string, string> = { 'work-portfolio': 'work portfolio', faq: 'screening answers' }
  const clean = (s: string) => s
    .replace(/\s*\([^()]*(?:\b(?:OQ|F|Q)-\d+\b|\bretro\b|\d{4}-\d{2}-\d{2}-[A-Z]{2}-\d+)[^()]*\)/gu, '')
    .replace(/\b(?:OQ|F)-\d+ answer/gu, 'earlier answer')
    .replace(/,?\s*from `my-interviews\/[^`]*`/gu, '')
    .replace(/`([\w-]+)\.md`/gu, (_m, n: string) => NAMES[n] ?? n)
  for (const lexed of Lexer.lex(clean(source).replace(TAG_DATE, (_m, tag: string, d: string) => `${tag}${niceDate(d)}`))) {
    const t = withoutRules(lexed)
    if (!t || t.type === 'space' || agentOnly(t)) continue
    if (t.type === 'heading') {
      const h = t as Heading
      if (h.depth === 1 && !doc.h1 && !section) { doc.h1 = h; continue }
      if (h.depth <= 2) { section = { h2: h, id: idFor(h), pre: [], items: [] }; item = null; doc.sections.push(section); continue }
      if (h.depth === 3 && section) { item = { h3: h, id: idFor(h), blocks: [] }; section.items.push(item); continue }
    }
    if (item) item.blocks.push(t)
    else if (section) section.pre.push(t)
    else doc.intro.push(t)
  }
  return doc
}

// ---- headings: title, then meta ------------------------------------------------------------------

// Splits inline tokens on a separator that sits inside plain text tokens.
function splitOn(tokens: Token[], sep: string): Token[][] {
  const segs: Token[][] = [[]]
  for (const tk of tokens) {
    const t = tk as Tokens.Generic
    if (t.type !== 'text' || t.tokens || !String(t.text).includes(sep)) { segs[segs.length - 1].push(tk); continue }
    String(t.text).split(sep).forEach((part, i) => {
      if (i > 0) segs.push([])
      if (part !== '') segs[segs.length - 1].push({ type: 'text', raw: part, text: part } as Tokens.Text)
    })
  }
  return segs
}

// A trailing "(a, b)" becomes the segment without it plus one segment per comma part.
function takeParen(seg: Token[]): Token[][] {
  const last = seg[seg.length - 1] as Tokens.Generic | undefined
  if (!last || last.type !== 'text' || last.tokens) return [seg]
  const m = PAREN_END.exec(String(last.text))
  if (!m) return [seg]
  const head = String(last.text).slice(0, m.index)
  const rest = seg.slice(0, -1)
  if (head !== '') rest.push({ type: 'text', raw: head, text: head } as Tokens.Text)
  const parts = m[1].split(/,\s+/u).filter((p) => p !== '').map((p) => [{ type: 'text', raw: p, text: p } as Tokens.Text] as Token[])
  return [rest, ...parts]
}

function headingParts(h: Heading): { title: Token[]; meta: Token[][] } {
  const segs = splitOn(h.tokens, ' — ').map((s) => s.filter((t, i, a) => !(t.type === 'text' && i === a.length - 1 && String((t as Tokens.Text).text).trim() === '' && a.length > 1)))
  const flat = segs.flatMap(takeParen).filter((s) => s.length > 0)
  return { title: flat[0] ?? h.tokens, meta: flat.slice(1) }
}

function Meta({ parts, ctx }: { parts: Token[][]; ctx: RenderCtx }) {
  if (parts.length === 0) return null
  return (
    <div className="pf-meta">
      {parts.map((p, i) => {
        const text = plain(p).trim()
        const caps = CAPS.exec(text)
        if (caps) {
          return (
            <Fragment key={i}>
              <span className="pf-chip">{caps[1]}</span>
              {caps[2] && <span className="pf-meta-item">{caps[2]}</span>}
            </Fragment>
          )
        }
        return <span key={i} className="pf-meta-item">{inline(p, ctx)}</span>
      })}
    </div>
  )
}

// ---- document ------------------------------------------------------------------------------------

function DocHead({ h1, ctx }: { h1: Heading; ctx: RenderCtx }) {
  const text = plain(h1.tokens)
  const colon = /^([^:]{1,40}):\s+(.+)$/u.exec(text)
  // The page bar already says Profile, so that word is not repeated above the name.
  if (colon) return <header className="pf-head">{colon[1] !== 'Profile' && <p className="pf-eyebrow">{colon[1]}</p>}<h1 className="pf-name">{colon[2]}</h1></header>
  const { title, meta } = headingParts(h1)
  return (
    <header className="pf-head">
      <h1 className="pf-name">{inline(title, ctx)}</h1>
      {meta.length > 0 && <p className="pf-sub">{meta.map((m, i) => <Fragment key={i}>{i > 0 && ', '}{inline(m, ctx)}</Fragment>)}</p>}
    </header>
  )
}

function DocView({ doc, file, ctx }: { doc: Doc; file: ProfileFileKey; ctx: (crumb: string) => RenderCtx }) {
  const head = ctx('')
  return (
    <>
      {doc.h1 && <DocHead h1={doc.h1} ctx={head} />}
      {doc.intro.length > 0 && <div className="pf-intro"><Blocks tokens={doc.intro} ctx={ctx(doc.h1 ? plain(doc.h1.tokens) : '')} idBase={`pf-${file}-intro`} /></div>}
      {doc.sections.map((s) => (
        <section key={s.id} className="pf-section" data-pf-section={s.id}>
          <h2 id={s.id} data-pf-h2={s.id} className="pf-h2">{inline(s.h2.tokens, head)}</h2>
          <Blocks tokens={s.pre} ctx={ctx(plain(s.h2.tokens))} idBase={s.id} />
          {s.items.map((it) => {
            const { title, meta } = headingParts(it.h3)
            return (
              <article key={it.id} className="pf-item">
                <h3 id={it.id} className="pf-h3">{inline(title, head)}</h3>
                <Meta parts={meta} ctx={head} />
                <div className="pf-details"><Blocks tokens={it.blocks} ctx={ctx(plain(title))} idBase={it.id} /></div>
              </article>
            )
          })}
        </section>
      ))}
    </>
  )
}

// The contents list, built as Learn's chapter list is: one ld-row per H2 with a tile that turns into a tick once the reader has passed the section's end.
function Rail({ doc, activeId, read, onJump, layout }: { doc: Doc; activeId: string | null; read: Record<string, true>; onJump: (id: string) => void; layout: RefObject<HTMLElement | null> }) {
  const pane = useRef<HTMLElement>(null)
  if (doc.sections.length === 0) return null
  return (
    <aside className="pf-toc ld-list" aria-label="On this page" ref={pane}>
      <div className="pf-toc-in">
        <div className="ld-group">
          <div className="ld-group-head"><span className="cap">On this page</span><span className="num">{doc.sections.length}</span></div>
          {doc.sections.map((s, i) => {
            const current = s.id === activeId
            return (
              <Fragment key={s.id}>
                <button type="button" className={`ld-row${current ? ' selected' : ''}`} aria-current={current ? 'true' : undefined} onClick={() => onJump(s.id)}>
                  <ListRow lead={<span className="tile" aria-hidden="true">{read[s.id] === true ? <Check size={14} /> : i + 1}</span>} name={plain(s.h2.tokens)} />
                </button>
                {current && s.items.map((it) => (
                  <button key={it.id} type="button" className="ld-row pf-toc-sub" onClick={() => onJump(it.id)}>
                    <ListRow name={plain(headingParts(it.h3).title)} />
                  </button>
                ))}
              </Fragment>
            )
          })}
        </div>
      </div>
      <Splitter name="list" label="Resize the list" varName="--ld-list-w" root={layout} pane={pane} min={280} max={560} grow="right" room={() => (layout.current?.clientWidth ?? 0) - 480} />
    </aside>
  )
}

// ---- tab -----------------------------------------------------------------------------------------

const scrollToId = (id: string) => {
  const el = document.getElementById(id)
  if (!el) return false
  let smooth = true
  try { smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { /* no matchMedia */ }
  el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
  return true
}

// The Profile tab: the candidate's profile files, read from my-profile/ and laid out to be re-read.
export function Profile({ target }: { target: Target | null }) {
  const files = useMemo(loadProfileFiles, [])
  const docs = useMemo(() => new Map<ProfileFileKey, Doc>(files.filter((f) => f.source !== null).map((f) => [f.key, parseDoc(f.source ?? '', f.key)])), [files])
  const [tab, setTab] = useState<ProfileFileKey>(loadTab)
  const [pending, setPending] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const read = useStored(READ_KEY, NONE_READ)
  const scroller = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLElement>(null)
  const layout = useRef<HTMLDivElement>(null)

  useEffect(() => { try { localStorage.setItem(TAB_KEY, tab) } catch { /* storage unavailable */ } }, [tab])

  const go = (file: ProfileFileKey, anchor: string | null) => {
    setTab(file)
    setPending(anchor ? `pf-${file}-${anchor}` : null)
    if (!anchor) { if (scroller.current) scroller.current.scrollTop = 0; toTop() }
  }
  const ctxFor = (f: ProfileFile) => (crumb: string): RenderCtx => ({
    speak: true,
    crumb: ['Profile', f.label, crumb].filter(Boolean).join(' > '),
    kind: 'profile',
    link: (id) => `#profile/${f.key}/${id}`,
    go: (h) => {
      const internal = INTERNAL.exec(h)
      if (internal) return () => go(internal[1] as ProfileFileKey, internal[2] ?? null)
      if (h.startsWith('#') && h.length > 1) return () => go(f.key, h.slice(1))
      return null
    },
  })

  useEffect(() => {
    if (pending) { scrollToId(pending); setPending(null) }
  }, [pending, tab])

  // A link to a block: show its file, then reveal the block, or the top of the file when none is named.
  useEffect(() => {
    if (target?.tab !== 'profile' || !take(target)) return
    const file = TAB_KEYS.find((k) => k === target.file)
    if (!file) return
    setTab(file)
    if (target.block) reveal(`[id="${CSS.escape(target.block)}"]`)
    else { if (scroller.current) scroller.current.scrollTop = 0; toTop() }
  }, [target])

  // On scroll: the section on screen, the progress bar and the sections the reader has passed.
  const syncActive = () => {
    const box = scroller.current
    if (!box) return
    const heads = [...box.querySelectorAll<HTMLElement>('.pf-panel[data-active] [data-pf-h2]')]
    // Over 900px .scroll scrolls. Under it the window does, and .scroll just grows with its content.
    const inBox = box.scrollHeight > box.clientHeight + 1
    const root = document.scrollingElement ?? document.documentElement
    const rect = inBox ? box.getBoundingClientRect() : { top: 0, bottom: window.innerHeight, height: window.innerHeight }
    const scrollTop = inBox ? box.scrollTop : root.scrollTop
    const top = rect.top + 96
    let id: string | null = heads[0]?.id ?? null
    for (const h of heads) { if (h.getBoundingClientRect().top <= top) id = h.id; else break }
    setActiveId(id)

    const room = inBox ? box.scrollHeight - box.clientHeight : root.scrollHeight - root.clientHeight
    if (bar.current) bar.current.style.transform = `scaleX(${room > 0 ? scrollTop / room : 0})`

    // A section is read once its end passes the middle of the view, or comes into view at the bottom.
    const atEnd = scrollTop > 0 && scrollTop >= room - 4
    const line = atEnd ? rect.bottom : rect.top + rect.height / 2
    const seen = readKey(READ_KEY, NONE_READ)
    const fresh = [...box.querySelectorAll<HTMLElement>('.pf-panel[data-active] [data-pf-section]')]
      .filter((s) => s.getBoundingClientRect().bottom <= line && seen[s.dataset.pfSection ?? ''] !== true)
      .map((s) => s.dataset.pfSection ?? '')
    if (fresh.length > 0) writeKey(READ_KEY, { ...seen, ...Object.fromEntries(fresh.map((s) => [s, true])) })
  }
  useEffect(syncActive, [tab])
  // Under 900px the window scrolls, not .scroll. syncActive only touches refs and setters, so the first render's copy is safe to keep.
  useEffect(() => {
    window.addEventListener('scroll', syncActive, { passive: true })
    return () => window.removeEventListener('scroll', syncActive)
  }, [])

  if (files.every((f) => f.source === null)) {
    return (
      <div className="scroll">
        <div className="empty small"><p>Your profile hasn't been set up yet. Run <code>/setup</code> in chat to begin.</p></div>
      </div>
    )
  }

  const current = docs.get(tab) ?? null
  const total = current?.sections.length ?? 0
  const done = current ? current.sections.filter((s) => read[s.id] === true).length : 0
  const left = current ? Math.max(1, Math.round(current.sections.filter((s) => read[s.id] !== true).reduce((n, s) => n + sectionWords(s), 0) / 200)) : 0
  const whole = current ? Math.max(1, Math.round(current.sections.reduce((n, s) => n + sectionWords(s), 0) / 200)) : 0
  const title = total === 0 ? 'Your profile, portfolio and screening answers'
    : done === 0 || done === total ? `About ${whole} ${whole === 1 ? 'minute' : 'minutes'} to re-read`
    : `${left} ${left === 1 ? 'minute' : 'minutes'} left to re-read`
  const entries = current ? current.sections.reduce((k, x) => k + x.items.length, 0) : 0
  const stats: Stat[] = current ? [
    { label: 'Sections', value: total, sub: `${done} read so far` },
    { label: 'Entries', value: entries, sub: entries === 1 ? 'one named item' : 'named items' },
    { label: 'Re-read', value: `${total === 0 ? 0 : Math.round((done / total) * 100)}%`, sub: `${done} of ${total} sections` },
    { label: 'Reading time', value: `${whole} min`, sub: `${left} min left` },
  ] : []
  return (
    <>
      <PageHeader cap="Profile" title={title}>
        <div className="seg" role="group" aria-label="Profile files">
          {files.map((f) => (
            <button key={f.key} aria-pressed={f.key === tab} onClick={() => go(f.key, null)}>{f.label}</button>
          ))}
        </div>
      </PageHeader>
      <div className="pf-progress" aria-hidden="true"><i ref={bar} /></div>
      <div className="scroll" ref={scroller} onScroll={syncActive}>
        {current && <StatStrip stats={stats} />}
        <div className="pf-layout" ref={layout}>
          {current && <Rail doc={current} activeId={activeId} read={read} onJump={(id) => scrollToId(id)} layout={layout} />}
          <div className="pf-col rd-page">
            {files.map((f: ProfileFile) => {
              const doc = docs.get(f.key)
              return (
                <div key={f.key} className="pf-panel" data-active={f.key === tab ? '' : undefined}>
                  {doc ? <DocView doc={doc} file={f.key} ctx={ctxFor(f)} /> : <p className="pf-empty">Nothing here yet. Run <code>/setup</code> in chat to fill it in.</p>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
