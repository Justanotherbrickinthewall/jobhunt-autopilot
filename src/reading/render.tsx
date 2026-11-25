// The shared reading renderer, extracted from Profile.tsx. It turns Markdown into React blocks with
// stable ids and never injects HTML: raw HTML shows as text, an image shows as its alt text, and only
// http, https and mailto links work. A narratable block builds the text the narrator speaks in the same
// walk that wraps each word in a span, so the highlighted word is always the spoken one.
import { Fragment, type ReactNode } from 'react'
import { Lexer, type Token, type Tokens } from 'marked'
import { isSafeUrl } from '../components/markdown.ts'
import { PLAY_ICON, useActiveWord, useReadAlong } from './ReadAlong.tsx'
import { BookmarkButton } from './Bookmark.tsx'

export type RenderCtx = {
  speak: boolean                   // false renders plain text, with no word spans and no narration
  crumb: string                    // where a saved block came from, such as "My profile > FAQ > Notice period"
  kind: string                     // what a saved block is, such as "profile" or "jd"
  link: (id: string) => string     // the hash link back to a block id
  go?: (href: string) => (() => void) | null   // the in-app action for a link, or null to treat it as a web link
}

// The spoken text of one unit and the index of its last word, filled in as the unit renders.
export type Speaker = { text: string; n: number; active: number | null }

export const lex = (source: string, breaks = false): Token[] => Lexer.lex(source, { gfm: true, breaks })
export const lexInline = (source: string): Token[] => Lexer.lexInline(source, { gfm: true, breaks: true })

// marked escapes the text of inline text and codespan tokens, and React escapes again, so undo it once.
export const unescapeHtml = (t: string) =>
  t.replace(/&lt;/gu, '<').replace(/&gt;/gu, '>').replace(/&quot;/gu, '"').replace(/&#39;/gu, "'").replace(/&amp;/gu, '&')

export function plain(tokens: Token[] | undefined): string {
  if (!tokens) return ''
  return tokens.map((t) => {
    const g = t as Tokens.Generic
    if (g.type === 'codespan' || g.type === 'text' || g.type === 'escape') return g.tokens ? plain(g.tokens) : unescapeHtml(String(g.text ?? ''))
    if (g.tokens) return plain(g.tokens)
    return g.type === 'br' ? ' ' : unescapeHtml(String(g.raw ?? ''))
  }).join('')
}

const SHORT_VALUE = 60
// The phone copy shows no authority tags, so the labels stay out of its bundle.
const TAG_TITLES: Record<string, string> = import.meta.env.VITE_PHONE === '1' ? {} : {
  stated: 'Stated: the candidate said it',
  artefact: 'Artefact: read from a file, repo or site',
  ours: 'Inference: verify before you say it',
}

// ---- words ---------------------------------------------------------------------------------------

// Wraps each whitespace-delimited word in a span. A word that touches the one before it, such as bold
// text followed by a comma, keeps that word's index, so the indices match tokenise() in text.ts.
// data-w carries that index, so a double-click can start the narrator at the word.
export function words(text: string, sp: Speaker | null): ReactNode {
  if (!sp) return text
  const out: ReactNode[] = []
  for (const m of text.matchAll(/(\s+)|(\S+)/gu)) {
    if (m[1]) { out.push(m[1]); sp.text += m[1]; continue }
    if (sp.text === '' || /\s$/u.test(sp.text)) sp.n++
    sp.text += m[2]
    out.push(<span key={out.length} data-w={sp.n} className={sp.n === sp.active ? 'rd-w is-now' : 'rd-w'}>{m[2]}</span>)
  }
  return out
}

// Ends a sentence between two parts of one unit, such as two list items or a label and its value.
// It returns null so JSX can call it in place between two parts.
export function gap(sp: Speaker | null): null {
  if (!sp || sp.text.trim() === '') return null
  sp.text = sp.text.trimEnd()
  sp.text += /[.!?:;]$/u.test(sp.text) ? ' ' : '. '
  return null
}

// ---- inline --------------------------------------------------------------------------------------

function anchor(href: string, title: string | null, ctx: RenderCtx, children: ReactNode, key: number): ReactNode {
  const h = href.trim()
  const act = ctx.go?.(h) ?? null
  if (act) return <a key={key} href={h} title={title ?? undefined} onClick={(e) => { e.preventDefault(); act() }}>{children}</a>
  if (!isSafeUrl(h)) return <Fragment key={key}>{children}</Fragment>
  return <a key={key} href={h} title={title ?? undefined} target="_blank" rel="noreferrer noopener">{children}</a>
}

export function inline(tokens: Token[] | undefined, ctx: RenderCtx, sp: Speaker | null = null): ReactNode {
  if (!tokens) return null
  return tokens.map((tk, i) => {
    const t = tk as Tokens.Generic
    switch (t.type) {
      case 'text':
      case 'escape':
        return <Fragment key={i}>{t.tokens ? inline(t.tokens, ctx, sp) : words(unescapeHtml(String(t.text)), sp)}</Fragment>
      case 'strong': return <strong key={i}>{inline(t.tokens, ctx, sp)}</strong>
      case 'em': return <em key={i}>{inline(t.tokens, ctx, sp)}</em>
      case 'del': return <del key={i}>{inline(t.tokens, ctx, sp)}</del>
      case 'br':
        if (sp) sp.text += ' '
        return <br key={i} />
      case 'codespan': {
        const text = unescapeHtml(String(t.text))
        return text in TAG_TITLES   // a tag pill is not spoken
          ? <span key={i} className={`rd-tag rd-tag-${text}`} title={TAG_TITLES[text]}>{text}</span>
          : <code key={i}>{words(text, sp)}</code>
      }
      case 'image': return <Fragment key={i}>{words(unescapeHtml(String(t.text ?? '')), sp)}</Fragment>
      case 'link': return anchor(String(t.href ?? ''), t.title as string | null, ctx, inline(t.tokens, ctx, sp), i)
      default: return <Fragment key={i}>{String(t.raw ?? '')}</Fragment>   // raw HTML is shown as text and not spoken
    }
  })
}

// ---- blocks --------------------------------------------------------------------------------------

function list(t: Tokens.List, ctx: RenderCtx, sp: Speaker | null): ReactNode {
  const items = t.items.map((it, i) => {
    gap(sp)
    return (
      <li key={i}>
        {it.tokens.map((sub, j) => sub.type === 'text'
          ? <Fragment key={j}>{inline((sub as Tokens.Text).tokens ?? [sub], ctx, sp)}</Fragment>
          : nested(sub, ctx, sp, j))}
      </li>
    )
  })
  return t.ordered ? <ol className="rd-list" start={typeof t.start === 'number' ? t.start : undefined}>{items}</ol> : <ul className="rd-list">{items}</ul>
}

// A table of three or more columns is never spoken.
function grid(t: Tokens.Table, ctx: RenderCtx): ReactNode {
  return (
    <div className="rd-table-wrap">
      <table className="rd-table">
        <thead><tr>{t.header.map((c, i) => <th key={i} style={{ textAlign: c.align ?? undefined }}>{inline(c.tokens, ctx)}</th>)}</tr></thead>
        <tbody>{t.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ textAlign: c.align ?? undefined }}>{inline(c.tokens, ctx)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

// Blocks that are never spoken: headings, code, rules, wide tables and anything marked does not name.
function still(tk: Token, ctx: RenderCtx, key: number): ReactNode {
  const t = tk as Tokens.Generic
  switch (t.type) {
    case 'space': return null
    case 'heading': return <h4 key={key} className="rd-h4">{inline(t.tokens, ctx)}</h4>
    case 'code': return <pre key={key} className="rd-code"><code>{String(t.text)}</code></pre>
    case 'hr': return <hr key={key} className="rd-hr" />
    case 'table': return <Fragment key={key}>{grid(tk as Tokens.Table, ctx)}</Fragment>
    default: return t.raw ? <p key={key}>{String(t.raw)}</p> : null
  }
}

// A block inside a unit: list items and quotes join the unit they sit in.
function nested(tk: Token, ctx: RenderCtx, sp: Speaker | null, key: number): ReactNode {
  const t = tk as Tokens.Generic
  switch (t.type) {
    case 'paragraph':
    case 'text':
      gap(sp)
      return <p key={key}>{inline(t.tokens ?? [tk], ctx, sp)}</p>
    case 'list':
      gap(sp)
      return <Fragment key={key}>{list(tk as Tokens.List, ctx, sp)}</Fragment>
    case 'blockquote':
      return <blockquote key={key} className="rd-callout">{(t.tokens ?? []).map((sub: Token, j: number) => nested(sub, ctx, sp, j))}</blockquote>
    default: return still(tk, ctx, key)
  }
}

type NarrProps = {
  id: string
  ctx: RenderCtx
  className?: string
  inline?: boolean                 // a span with no margin icons, for a fold title
  save?: string                    // the Markdown a bookmark saves, when it differs from the spoken text
  children: (sp: Speaker | null) => ReactNode
}

// One narratable unit. It carries its block id, the text the narrator speaks and its word spans.
export function Narr({ id, ctx, className, inline: isInline, save, children }: NarrProps) {
  const ctrl = useReadAlong()
  const active = useActiveWord(id)
  const Tag = isInline ? 'span' : 'div'
  if (!ctx.speak) return <Tag id={id} className={className}>{children(null)}</Tag>
  const sp: Speaker = { text: '', n: -1, active }
  const body = children(sp)
  const text = sp.text.trim()
  const cls = `${isInline ? 'rd-inline' : 'rd-block'}${className ? ` ${className}` : ''}${active !== null ? ' is-current' : ''}`
  return (
    <Tag id={id} className={cls} data-narr-key={id} data-narr={text || undefined}>
      {body}
      {!isInline && text && ctrl && (
        <span className="rd-margin">
          <button type="button" className="rd-mbtn" aria-label="Read from here" title="Read from here" onClick={() => ctrl.playFrom(id)}>{PLAY_ICON}</button>
          {ctx.crumb && <BookmarkButton source={{ kind: ctx.kind, crumb: ctx.crumb, link: ctx.link(id) }} text={save ?? text} />}
        </span>
      )}
    </Tag>
  )
}

// A two-column table becomes label and value pairs, each its own unit, spoken as "Label. Value."
function Pairs({ t, ctx, id }: { t: Tokens.Table; ctx: RenderCtx; id: string }) {
  const wide = t.rows.every((r) => plain(r[1].tokens).length < SHORT_VALUE)
  return (
    <dl className={`rd-pairs${wide ? ' rd-pairs-grid' : ''}`}>
      {t.rows.map((r, i) => (
        <Narr key={i} id={`${id}-${i}`} ctx={ctx} className="rd-pair">
          {(sp) => (
            <>
              <dt className="rd-label">{inline(r[0].tokens, ctx, sp)}</dt>
              {gap(sp)}
              <dd className="rd-value">{inline(r[1].tokens, ctx, sp)}</dd>
            </>
          )}
        </Narr>
      ))}
    </dl>
  )
}

function Block({ t, ctx, id }: { t: Token; ctx: RenderCtx; id: string }) {
  switch (t.type) {
    case 'paragraph':
    case 'text':
    case 'list':
    case 'blockquote':
      return <Narr id={id} ctx={ctx} save={t.raw.trim()}>{(sp) => nested(t, ctx, sp, 0)}</Narr>
    case 'table':
      if ((t as Tokens.Table).header.length === 2) return <Pairs t={t as Tokens.Table} ctx={ctx} id={id} />
      return <>{still(t, ctx, 0)}</>
    default:
      return <>{still(t, ctx, 0)}</>
  }
}

// A run of blocks. Block n gets the id `${idBase}-b${n}`, counted over the blocks that are not blank.
export function Blocks({ tokens, ctx, idBase }: { tokens: Token[]; ctx: RenderCtx; idBase: string }) {
  let n = 0
  return <>{tokens.map((t, i) => (t.type === 'space' ? null : <Block key={i} t={t} ctx={ctx} id={`${idBase}-b${n++}`} />))}</>
}
