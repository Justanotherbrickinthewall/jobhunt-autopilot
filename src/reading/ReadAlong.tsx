// The read-along: one controller for the app, the units of the current view and the floating pill.
// Units are read from the page itself: every visible element with a data-narr attribute, in page order.
import { createPortal } from 'react-dom'
import { createContext, useContext, useEffect, useLayoutEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { NarrationController, type NarrState } from './narration.ts'
import { tokenise, type NarrUnit } from './text.ts'
import { useWakeLock } from './wakeLock.ts'

const Ctx = createContext<NarrationController | null>(null)

// Space plays and pauses, except where it already means something.
const KEEPS_SPACE = 'input, textarea, select, button, a, summary, [contenteditable="true"]'

function scan(): NarrUnit[] {
  const units: NarrUnit[] = []
  const seen = new Set<string>()   // auto-advance finds the next unit by key, so a repeated key would loop
  for (const el of document.querySelectorAll<HTMLElement>('[data-narr]')) {
    if (el.closest('[inert]') || el.getClientRects().length === 0) continue   // a closed drawer, tab, panel or fold
    const key = el.dataset.narrKey ?? ''
    if (seen.has(key)) continue
    seen.add(key)
    const text = el.dataset.narr ?? ''
    units.push({ key, text, tokens: tokenise(text) })
  }
  return units
}

export function ReadAlongProvider({ children }: { children: ReactNode }) {
  const [ctrl] = useState(() => new NarrationController())

  useEffect(() => {
    ctrl.readPage = scan
    let frame = 0
    const later = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; ctrl.setUnits(scan()) }) }
    const watch = new MutationObserver(later)
    watch.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-narr', 'data-active', 'inert', 'open', 'hidden', 'aria-expanded'] })
    later()
    return () => { watch.disconnect(); cancelAnimationFrame(frame); ctrl.readPage = null; ctrl.stop() }
  }, [ctrl])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      if ((e.target as HTMLElement | null)?.closest?.(KEEPS_SPACE)) return
      if (ctrl.getState().total === 0) return
      e.preventDefault()
      ctrl.toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ctrl])

  // A double-click on a spoken word starts the narrator at that word. The press that makes the second
  // click is cancelled, so the browser never selects the word, and the selection is cleared as a backstop.
  useEffect(() => {
    const word = (e: MouseEvent): HTMLElement | null => {
      const t = e.target
      return t instanceof Element && !t.closest(KEEPS_SPACE) ? t.closest<HTMLElement>('.rd-w') : null
    }
    const onDown = (e: MouseEvent) => { if (e.detail === 2 && e.button === 0 && word(e)) e.preventDefault() }
    const onDouble = (e: MouseEvent) => {
      const w = word(e)
      const key = w?.closest<HTMLElement>('[data-narr-key]')?.dataset.narrKey
      if (!w || key === undefined) return
      getSelection()?.removeAllRanges()
      ctrl.playFrom(key, Number(w.dataset.w) || 0)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('dblclick', onDouble)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('dblclick', onDouble) }
  }, [ctrl])

  return <Ctx.Provider value={ctrl}>{children}</Ctx.Provider>
}

export const useReadAlong = (): NarrationController | null => useContext(Ctx)

const IDLE: NarrState = { status: 'idle', index: -1, word: -1, total: 0, rate: 1, source: 'neural', follow: true, message: null }
const noSubscribe = () => () => {}

function useNarrState(): NarrState {
  const c = useContext(Ctx)
  return useSyncExternalStore(c ? c.subscribe : noSubscribe, c ? c.getState : () => IDLE, () => IDLE)
}

/** The word being spoken in one block, -1 before its first word, or null when the block is not current. */
export function useActiveWord(key: string): number | null {
  const c = useContext(Ctx)
  return useSyncExternalStore(c ? c.subscribe : noSubscribe, () => (c ? c.activeWord(key) : null), () => null)
}

const I = {
  play: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>,
  pause: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>,
  prev: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h2v14H6zM20 5v14L9 12z" /></svg>,
  next: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5l11 7L4 19z" /></svg>,
}

export const PLAY_ICON = I.play

// The bar starts as a small pill on every screen. The choice is kept per device.
const COLLAPSE_KEY = 'hunt-board:listen-collapsed'
function readCollapsed(): boolean {
  try { return localStorage.getItem(COLLAPSE_KEY) !== '0' } catch { return true }
}

/** The listen strip, docked at the bottom of .main. Shown whenever the current view has something to read. */
export function ReadAlongPill({ inDrawer }: { inDrawer: boolean }) {
  const ctrl = useReadAlong()
  const s = useNarrState()
  useWakeLock(s.status === 'playing' || s.status === 'loading')
  const [stored, setStored] = useState(readCollapsed)
  const setCollapsed = (v: boolean) => { setStored(v); try { localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0') } catch { /* storage unavailable */ } }
  // The strip docks in the open drawer, which overlays .main on narrower screens, and in .main otherwise.
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => setSlot(document.getElementById(inDrawer ? 'rd-slot-drawer' : 'rd-slot')), [inDrawer])
  // On the dashboard the rail's dock holds the player while the rail is full width, as it does for Learn (L8). The phone has no dock.
  const [dock, setDock] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => {
    if (import.meta.env.VITE_PHONE === '1' || inDrawer) { setDock(null); return }
    const mq = window.matchMedia('(min-width: 1061px)')
    const sync = () => setDock(mq.matches ? document.getElementById('rail-dock') : null)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [inDrawer])
  if (!ctrl || s.total === 0) return null
  // The phone shows no player. A double-tap on the text starts reading, and this one button ends it.
  if (import.meta.env.VITE_PHONE === '1') {
    if (s.status === 'idle') return null
    const close = <button type="button" className="rd-mini" onClick={() => ctrl.stop()}>Close read-along</button>
    return slot ? createPortal(close, slot) : close
  }
  const busy = s.status === 'playing' || s.status === 'loading'
  // Playback opens the strip without changing the stored choice.
  const collapsed = stored && !busy && !dock
  const bar = collapsed ? (
    <button type="button" className="rd-mini" onClick={() => setCollapsed(false)} aria-label="Show the listen controls">
      {I.play}{busy ? 'Playing' : 'Listen'}
    </button>
  ) : (
    <div className={dock ? 'rd-pill is-docked' : 'rd-pill'} role="toolbar" aria-label="Read-along controls">
      <div className="rd-row">
      <button type="button" onClick={() => ctrl.prev()} aria-label="Previous block" title="Previous block">{I.prev}</button>
      <button type="button" className="rd-main" onClick={() => ctrl.toggle()} aria-label={busy ? 'Pause' : 'Play'} title="Play or pause (Space)">
        {s.status === 'loading' ? <span className="rd-spin" aria-hidden="true" /> : busy ? I.pause : I.play}
      </button>
      <button type="button" onClick={() => ctrl.next()} aria-label="Next block" title="Next block">{I.next}</button>
      <span className="rd-status num" aria-live="polite">{s.index >= 0 ? `${s.index + 1} / ${s.total}` : 'Listen'}</span>
      </div>
      <span className="rd-sep" />
      <div className="rd-row">
      <label className="rd-speed">
        <input type="range" min={0.8} max={1.6} step={0.1} value={s.rate} onChange={(e) => ctrl.setRate(Number(e.target.value))} aria-label="Speed" />
        <output>{s.rate.toFixed(1)}x</output>
      </label>
      </div>
      <span className="rd-sep" />
      <div className="rd-row">
      <button type="button" onClick={() => ctrl.setSource(s.source === 'neural' ? 'system' : 'neural')} title="Switch the voice">
        {s.source === 'neural' ? 'Neural' : 'System'}
      </button>
      <button type="button" className={s.follow ? 'is-on' : ''} onClick={() => ctrl.setFollow(!s.follow)} aria-pressed={s.follow} title="Keep the spoken block in view">
        Follow
      </button>
      </div>
      {!busy && !dock && <button type="button" onClick={() => setCollapsed(true)}>Hide</button>}
      {s.message && <span className="rd-msg" role="status">{s.message}</span>}
    </div>
  )
  if (dock) return createPortal(bar, dock)
  return slot ? createPortal(bar, slot) : bar
}
