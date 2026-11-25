// The Notebook tab, ported from fde-roadmap's pages/Notebook.tsx. Collections sit on the left. The open
// collection shows its crib sheet, then its items as cards. Saved text goes through the shared renderer,
// so the read-along pill reads this page like any other.
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  NotebookError, createCollection, deleteBookmark, deleteCollection, loadNotebook, patchBookmark, recentCollections,
  renameCollection, restoreBookmark, summariseCollection, useNotebook,
  type Collection, type Item, type PendingItem,
} from '../reading/bookmarks.ts'
import { Blocks, Narr, lex, words, type RenderCtx } from '../reading/render.tsx'
import { Menu } from './Menu.tsx'
import { Plus, Search } from 'lucide-react'
import { FilterRow } from './ui.tsx'
import { PageHeader } from './PageHeader.tsx'
import { shortDate } from './format.ts'
import { LEARN_LINK, goLearn, take, type Target } from '../reading/router.ts'

// The stored crumb joins its parts with " > " (sometimes saved as &gt;); the screen shows a slash.
const crumb = (s: string): string => s.replace(/\s*(?:&gt;|>)\s*/gu, ' / ')
// A saved block is never saved again from here, so the crumb is empty and no bookmark icon shows.
const CTX: RenderCtx = { speak: true, crumb: '', kind: 'notebook', link: () => '' }
const LINK = /^#(?:profile|prep|hunt|retro|interviews|notebook)(?:\/\S*)?$/u
const UNDO_MS = 6000

// A saved table keeps its newlines but lost its `| --- |` row, and its first row sits straight after a paragraph line.
// shortcut: this treats the first pipe row of a run as the header and adds the divider and a blank line; upgrade if a saved table can carry its own divider with other shapes.
function tableBreak(t: string): string {
  const ls = t.split('\n')
  return ls.flatMap((l, i) => {
    if (!/^\|.*\|\s*$/u.test(l) || /^\|/u.test(ls[i - 1] ?? '')) return [l]
    const divider = /^\|[\s:|-]+\|\s*$/u.test(ls[i + 1] ?? '') ? [] : [`|${' --- |'.repeat(l.split('|').length - 2)}`]
    return [...(i > 0 && ls[i - 1].trim() ? [''] : []), l, ...divider]
  }).join('\n')
}

type ViewItem = (Item | PendingItem) & { collectionId: string; pending?: boolean }

const POLISH_ERRORS: Record<string, string> = {
  claude_missing: 'Claude is not installed.',
  not_logged_in: 'Claude is not signed in.',
  timeout: 'Claude took too long.',
  server_down: 'The notebook server is not running.',
}

function ItemCard({ item, collections, showCollection, onDelete }: { item: ViewItem; collections: Collection[]; showCollection: boolean; onDelete: (it: ViewItem) => void }) {
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(item.note)
  const [tags, setTags] = useState(item.tags.join(', '))
  const [err, setErr] = useState('')
  const known = collections.some((c) => c.id === item.collectionId)
  const colName = 'collectionName' in item ? item.collectionName : ''

  const save = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await patchBookmark(item.id, { note, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) })
      setEditing(false)
      setErr('')
    } catch (x) {
      setErr((x as Error).message)
    }
  }
  const move = async (to: string) => {
    try {
      await patchBookmark(item.id, { collectionId: to })
      setErr('')
    } catch (x) {
      setErr((x as Error).message)
    }
  }
  const cancel = () => { setEditing(false); setNote(item.note); setTags(item.tags.join(', ')) }

  return (
    <article className="nb-card">
      <div className="nb-text"><Blocks tokens={lex(tableBreak(item.text))} ctx={CTX} idBase={`nb-${item.id}`} /></div>
      {item.note && <Narr id={`nb-${item.id}-note`} ctx={CTX} className="nb-note">{(sp) => words(item.note, sp)}</Narr>}
      <div className="nb-card-top">
        {LEARN_LINK.test(item.source.link)
          ? <a className="nb-source" href={item.source.link} onClick={(e) => { e.preventDefault(); goLearn(item.source.link) }}>{crumb(item.source.crumb)}</a>
          : LINK.test(item.source.link)
          ? <a className="nb-source" href={item.source.link}>{crumb(item.source.crumb)}</a>
          : <span className="nb-source">{crumb(item.source.crumb)}</span>}
        <span className="muted nb-date num">{shortDate(item.createdAt.slice(0, 10))}</span>
        {item.pending && <span className="muted">Waiting in this browser</span>}
        {!editing && <button type="button" className="btn small ghost nb-editbtn" aria-expanded={false} onClick={() => setEditing(true)}>Edit</button>}
      </div>
      {editing && (
        <form className="nb-edit" onSubmit={save} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); cancel() } }}>
          <label className="bm-field"><span>Note</span><input value={note} onChange={(e) => setNote(e.target.value)} autoFocus /></label>
          <label className="bm-field"><span>Tags, comma separated</span><input value={tags} onChange={(e) => setTags(e.target.value)} /></label>
          <label className="bm-field">
            <span>{showCollection ? 'In collection' : 'Move to collection'}</span>
            <select value={known ? item.collectionId : ''} onChange={(e) => void move(e.target.value)}>
              {!known && <option value="">{colName}</option>}
              {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <div className="bm-actions">
            <button type="submit" className="btn small">Save</button>
            <button type="button" className="btn small ghost" onClick={cancel}>Close</button>
            <button type="button" className="btn small ghost nb-del" onClick={() => onDelete(item)}>Delete</button>
          </div>
        </form>
      )}
      {err && <div className="bm-err" role="alert">{err}</div>}
    </article>
  )
}

export function Notebook({ target }: { target: Target | null }) {
  const st = useNotebook()
  const [sel, setSel] = useState('')   // '' is Everything; otherwise a collection id, or a slug from a link
  const [query, setQuery] = useState('')
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [colErr, setColErr] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameTo, setRenameTo] = useState('')
  const [polishing, setPolishing] = useState(false)
  const [secs, setSecs] = useState(0)
  const [polishErr, setPolishErr] = useState<NotebookError | null>(null)
  const [undo, setUndo] = useState<Item | PendingItem | null>(null)
  const undoTimer = useRef<number | undefined>(undefined)

  useEffect(() => { void loadNotebook() }, [])
  useEffect(() => () => window.clearTimeout(undoTimer.current), [])
  useEffect(() => {
    if (target?.tab !== 'notebook' || !take(target)) return
    setSel(target.slug)
    setQuery('')
  }, [target])

  // Queued saves show beside the saved ones, so nothing seems lost while the server is down.
  const { collections, items } = useMemo(() => {
    const cols: Collection[] = [...st.collections]
    const all: ViewItem[] = [...st.items]
    for (const p of st.pending) {
      let col = cols.find((c) => c.id === p.collectionId) ?? cols.find((c) => c.name.toLowerCase() === p.collectionName.toLowerCase())
      if (!col) {
        col = { id: `local:${p.collectionName.toLowerCase()}`, name: p.collectionName, slug: '', createdAt: p.createdAt, updatedAt: p.createdAt }
        cols.push(col)
      }
      all.push({ ...p, collectionId: col.id, pending: true })
    }
    return { collections: recentCollections({ collections: cols, items: all as Item[] }), items: all }
  }, [st.collections, st.items, st.pending])

  const selected = collections.find((c) => c.id === sel || (c.slug !== '' && c.slug === sel))
  const q = query.trim().toLowerCase()
  const nameOf = (id: string) => collections.find((c) => c.id === id)?.name ?? ''
  const visible = useMemo(() => {
    const pool = q || !selected ? items : items.filter((i) => i.collectionId === selected.id)
    return q ? pool.filter((i) => [i.text, i.note, i.tags.join(' '), i.source.crumb, nameOf(i.collectionId)].join('\n').toLowerCase().includes(q)) : pool
  }, [items, selected, q, collections])

  const countOf = (id: string) => items.filter((i) => i.collectionId === id).length
  const select = (id: string) => { setSel(id); setRenaming(false); setPolishErr(null) }
  const fail = (x: unknown) => setColErr((x as Error).message)

  const onNewCollection = async (e: FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      const c = await createCollection(newName.trim())
      setNewName('')
      setAdding(false)
      setColErr('')
      select(c.id)
    } catch (x) { fail(x) }
  }

  const doRename = async (e: FormEvent) => {
    e.preventDefault()
    if (!selected) return
    try {
      await renameCollection(selected.id, renameTo)
      setSel(selected.id)   // a slug from a link goes stale on a rename
      setRenaming(false)
      setColErr('')
    } catch (x) { fail(x) }
  }

  const doDeleteCollection = async () => {
    if (!selected) return
    try {
      await deleteCollection(selected.id)
      select('')
      setColErr('')
    } catch (x) { fail(x) }
  }

  const polish = async () => {
    if (!selected) return
    setPolishing(true)
    setSecs(0)
    setPolishErr(null)
    const timer = window.setInterval(() => setSecs((s) => s + 1), 1000)
    try {
      await summariseCollection(selected.id)
    } catch (x) {
      setPolishErr(x instanceof NotebookError ? x : new NotebookError('error', (x as Error).message))
    } finally {
      window.clearInterval(timer)
      setPolishing(false)
    }
  }

  const remove = async (it: ViewItem) => {
    try {
      const gone = await deleteBookmark(it.id)
      if (!gone) return
      setUndo(gone)
      window.clearTimeout(undoTimer.current)
      undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS)
    } catch (x) { fail(x) }
  }
  const doUndo = async () => {
    if (!undo) return
    window.clearTimeout(undoTimer.current)
    try {
      await restoreBookmark(undo)
      setUndo(null)
    } catch (x) { fail(x) }
  }

  const local = !!selected?.id.startsWith('local:')
  const canPolish = !!selected && !local && countOf(selected.id) > 0 && !polishing
  const movable = collections.filter((c) => !c.id.startsWith('local:'))

  return (
    <>
    <PageHeader cap="Notebook" title={items.length === 0 ? 'Nothing saved yet' : `${items.length} saved ${items.length === 1 ? 'passage' : 'passages'}`} />
    <div className="scroll notebook rd-page">
        {!st.online && (
          <p className="nb-offline" role="status">
            The notebook server is not running. {st.pending.length > 0 ? `${st.pending.length} ${st.pending.length === 1 ? 'save is' : 'saves are'} waiting in this browser and will sync when it is back.` : 'Saves wait in this browser until it is back.'}
          </p>
        )}

        <FilterRow cap="Collections" count={collections.length}
          right={<>
            <label className="search">
              <Search size={13} aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the notebook" aria-label="Search the notebook" />
            </label>
            {!adding && <button type="button" className="btn small" onClick={() => setAdding(true)}><Plus size={13} aria-hidden="true" />New collection</button>}
          </>}>
          <button type="button" className={`fchip${!selected && !q ? ' active' : ''}`} onClick={() => select('')}>Everything <span className="num">{items.length}</span></button>
          {collections.map((c) => (
            <button key={c.id} type="button" className={`fchip${selected?.id === c.id && !q ? ' active' : ''}`} onClick={() => select(c.id)}>{c.name} <span className="num">{countOf(c.id)}</span></button>
          ))}
        </FilterRow>
        {(adding || colErr) && (
          <div className="nb-strip">
            {adding && (
              <form onSubmit={onNewCollection} className="nb-newcol" onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setAdding(false) } }}>
                <input className="nb-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New collection" aria-label="New collection name" maxLength={120} autoFocus />
                <button type="submit" className="btn small" disabled={!newName.trim()}>Add</button>
                <button type="button" className="btn small ghost" onClick={() => setAdding(false)}>Cancel</button>
              </form>
            )}
            {colErr && <div className="bm-err" role="alert">{colErr}</div>}
          </div>
        )}

        <div className="nb-layout">
          <section className="nb-main">
            <header className="nb-head">
              {q ? (
                <h2>{visible.length} {visible.length === 1 ? 'result' : 'results'} for "{query.trim()}"</h2>
              ) : renaming && selected ? (
                <form onSubmit={doRename} className="nb-rename" onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setRenaming(false) } }}>
                  <input className="nb-input" value={renameTo} onChange={(e) => setRenameTo(e.target.value)} autoFocus aria-label="Collection name" />
                  <button type="submit" className="btn small">Rename</button>
                  <button type="button" className="btn small ghost" onClick={() => setRenaming(false)}>Cancel</button>
                </form>
              ) : selected ? (
                <h2>{selected.name}</h2>
              ) : null}
              {selected && !q && !renaming && !local && (
                <div className="nb-tools">
                  <span className="muted">{polishing ? 'This takes up to a minute.' : 'Takes up to a minute.'}</span>
                  <button type="button" className="btn small" onClick={polish} disabled={!canPolish}>
                    {polishing ? <><span className="rd-spin" aria-hidden="true" /> Polishing, {secs}s</> : selected.summary ? 'Polish again with Claude' : 'Polish with Claude'}
                  </button>
                  <Menu label="Collection" align="right">
                    {(close) => (<>
                      <button className="menu-item" onClick={() => { setRenameTo(selected.name); setRenaming(true); close() }}>Rename</button>
                      <button className="menu-item" disabled={countOf(selected.id) > 0} title={countOf(selected.id) > 0 ? 'Move or delete its passages first' : undefined}
                        onClick={() => { void doDeleteCollection(); close() }}>Delete collection</button>
                    </>)}
                  </Menu>
                </div>
              )}
            </header>

                        {polishErr && (
              <div className="nb-error" role="alert">
                <strong>{POLISH_ERRORS[polishErr.code] ?? 'The crib sheet failed. The old one is kept.'}</strong>
                <p>{polishErr.message}</p>
              </div>
            )}

            {selected?.summary && !q && (
              <div className="nb-summary">
                <div className="nb-card-top">
                  <span className="nb-source">Interview crib sheet</span>
                  <span className="muted nb-date num">Claude, {shortDate((selected.summaryAt ?? '').slice(0, 10))}</span>
                </div>
                <Blocks tokens={lex(selected.summary)} ctx={CTX} idBase={`nb-sum-${selected.id}`} />
              </div>
            )}

            {visible.length === 0 ? (
              <div className="empty small">
                <p>{items.length === 0
                  ? 'Nothing saved yet. Hover a block in Profile, Interview prep, Interviews, Learn or a job\'s JD and click the bookmark beside it.'
                  : q ? 'Nothing in the notebook matches that search.' : 'This collection is empty.'}</p>
              </div>
            ) : (
              <div className="nb-items">
                {visible.map((it) => <ItemCard key={it.id} item={it} collections={movable} showCollection={!!q || !selected} onDelete={remove} />)}
              </div>
            )}

          </section>
        </div>

        {undo && (
          <div className="nb-toast" role="status">
            <span>Item deleted.</span>
            <button type="button" className="btn small" onClick={doUndo}>Undo</button>
          </div>
        )}
    </div>
    </>
  )
}
