// The bookmark icon and its popover, ported from fde-roadmap's components/Bookmark.tsx. A click saves at
// once to a guessed collection. The popover says where the item went and offers Change and Undo.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  createCollection, deleteBookmark, findSaved, patchBookmark, quickSave, recentCollections, useNotebook,
  type Source,
} from './bookmarks.ts'

const BookmarkIcon = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" />
  </svg>
)

const NEW = '__new'
const IDLE_MS = 5000

function Popover({ source, text, label, failed, onClose }: { source: Source; text: string; label: string; failed: string; onClose: (refocus: boolean) => void }) {
  const st = useNotebook()
  const saved = findSaved(st, source, text)
  const existing = saved.item ?? saved.pending
  const recent = recentCollections(st)
  const [mode, setMode] = useState<'confirm' | 'form'>('confirm')
  const [col, setCol] = useState<string>(NEW)
  const [newName, setNewName] = useState('')
  const [note, setNote] = useState('')
  const [tags, setTags] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [activity, setActivity] = useState(0)
  const root = useRef<HTMLDivElement>(null)

  const colName = existing
    ? st.collections.find((c) => c.id === existing.collectionId)?.name ?? ('collectionName' in existing ? existing.collectionName : '')
    : ''
  const offline = !!saved.pending
  const filing = !!existing && !!existing.suggestionPending && (offline || st.suggesting.includes(existing.id))

  const openForm = () => {
    if (!existing) return
    const known = st.collections.find((c) => c.id === existing.collectionId) ?? st.collections.find((c) => c.name === colName)
    setCol(known?.id ?? NEW)
    setNewName(known ? '' : colName)
    setNote(existing.note)
    setTags(existing.tags.join(', '))
    setMode('form')
  }

  useEffect(() => {
    if (mode === 'form') root.current?.querySelector<HTMLElement>('select, input')?.focus()
    if (mode === 'confirm') root.current?.querySelector<HTMLElement>('button')?.focus()
  }, [mode])

  useEffect(() => {
    const away = (e: PointerEvent) => {
      const host = root.current?.parentElement
      if (host && !host.contains(e.target as Node)) onClose(false)
    }
    document.addEventListener('pointerdown', away)   // not mousedown: iOS Safari sends none for a tap on a plain element
    return () => document.removeEventListener('pointerdown', away)
  }, [onClose])

  // The confirmation closes after five idle seconds, but not while Claude is still filing, nor in the form.
  useEffect(() => {
    if (mode !== 'confirm' || filing || !existing) return
    const t = setTimeout(() => onClose(false), IDLE_MS)
    return () => clearTimeout(t)
  }, [mode, filing, existing, activity, onClose])

  const collectionName = col === NEW ? newName.trim() : recent.find((c) => c.id === col)?.name ?? ''
  const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || !existing) return
    if (!collectionName) { setErr('Name the collection first.'); return }
    setBusy(true)
    setErr('')
    try {
      const target = col === NEW ? (await createCollection(collectionName)).id : col
      await patchBookmark(existing.id, { note, tags: tagList, collectionId: target })
      setMode('confirm')
    } catch (e2) {
      setErr((e2 as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const undo = async () => {
    if (!existing) return
    setBusy(true)
    try {
      await deleteBookmark(existing.id, { pruneCollection: true })
      onClose(true)
    } catch (e2) {
      setErr((e2 as Error).message)
      setBusy(false)
    }
  }

  return (
    <div
      ref={root}
      className="bm-pop"
      role="dialog"
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
      onPointerMove={() => setActivity((n) => n + 1)}
      onFocus={() => setActivity((n) => n + 1)}
      onKeyDown={(e) => {
        setActivity((n) => n + 1)
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose(true)
        }
      }}
    >
      {mode === 'confirm' && !existing && (failed
        ? <div className="bm-err" role="alert">{failed}</div>
        : <div className="bm-title" role="status">Saving…</div>)}
      {mode === 'confirm' && existing && (
        <div className="bm-stack">
          <div className="bm-title" role="status">Saved to {colName || 'your notebook'}</div>
          {offline && <p className="bm-note">Saved in this browser. It will sync when the notebook server is back.</p>}
          {filing && !offline && <p className="bm-note bm-filing">Claude is filing this…</p>}
          {!filing && existing.note && <p className="bm-note">{existing.note}</p>}
          {!filing && existing.tags.length > 0 && <div className="bm-tags">{existing.tags.map((t) => <span key={t} className="bm-tag">{t}</span>)}</div>}
          {err && <div className="bm-err" role="alert">{err}</div>}
          <div className="bm-actions">
            <button type="button" className="btn small" onClick={openForm}>Change</button>
            <button type="button" className="btn small ghost" onClick={undo} disabled={busy}>Undo</button>
          </div>
        </div>
      )}
      {mode === 'form' && (
        <form className="bm-stack" onSubmit={submit}>
          <label className="bm-field">
            <span>Collection</span>
            <select value={col} onChange={(e) => setCol(e.target.value)}>
              {recent.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value={NEW}>New collection…</option>
            </select>
          </label>
          {col === NEW && (
            <label className="bm-field">
              <span>New collection name</span>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Numbers to quote" maxLength={120} />
            </label>
          )}
          <label className="bm-field">
            <span>Note (optional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why this matters in an interview" />
          </label>
          <label className="bm-field">
            <span>Tags (optional, comma separated)</span>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="numbers, delivery" />
          </label>
          {err && <div className="bm-err" role="alert">{err}</div>}
          <div className="bm-actions">
            <button type="submit" className="btn small" disabled={busy}>Update</button>
            <button type="button" className="btn small ghost" onClick={() => setMode('confirm')}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  )
}

// The icon and its confirmation. what names the passage for screen readers, such as "this block".
// The phone copy has no notebook server, so it shows no bookmark button.
export function BookmarkButton(props: { source: Source; text: string; what?: string }) {
  return import.meta.env.VITE_PHONE === '1' ? null : <BookmarkControl {...props} />
}

function BookmarkControl({ source, text, what = 'this block' }: { source: Source; text: string; what?: string }) {
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState('')
  const btn = useRef<HTMLButtonElement>(null)
  const saving = useRef(false)
  const st = useNotebook()
  const hit = findSaved(st, source, text)
  const saved = !!(hit.item || hit.pending)
  const label = saved ? `Show the bookmark on ${what}` : `Bookmark ${what}`

  const click = () => {
    if (open) { setOpen(false); return }
    setOpen(true)
    setFailed('')
    if (saved || saving.current) return   // already saved: just show where it went
    saving.current = true
    // Only a down server queues a save. Any other error would fail again, so the popover stays open and says so.
    quickSave(source, text)
      .catch(() => setFailed('This could not be saved. Reload the page and try again.'))
      .finally(() => { saving.current = false })
  }

  return (
    <span className={`bm${open ? ' open' : ''}`} onClick={(e) => e.stopPropagation()}>
      <button
        ref={btn}
        type="button"
        className={`rd-mbtn bm-btn${saved ? ' is-on' : ''}`}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={saved ? 'Bookmarked' : 'Bookmark'}
        onClick={(e) => { e.stopPropagation(); click() }}
      >
        <BookmarkIcon filled={saved} />
      </button>
      {open && (
        <Popover
          source={source}
          text={text}
          label={label}
          failed={failed}
          onClose={(refocus) => {
            setOpen(false)
            if (refocus) btn.current?.focus()
          }}
        />
      )}
    </span>
  )
}
