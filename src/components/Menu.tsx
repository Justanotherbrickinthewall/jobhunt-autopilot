import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const HIDDEN: CSSProperties = { position: 'fixed', top: 0, left: 0, visibility: 'hidden' }
const PHONE = import.meta.env.VITE_PHONE === '1'
const FOCUSABLE = 'button:not([disabled]), input:not([disabled])'

// A button that opens a small popover. Escape or a click outside closes it, and the arrow keys
// move between its items. Keys pressed inside never reach the board's own shortcuts.
// The popover is drawn in a portal on document.body with position: fixed, so no scrolling or overflow-hidden pane can clip it.
// It opens at the trigger's left edge, flips to the right edge when it would pass the viewport, stays inside it, and opens upwards when there is no room below.
// `align` is accepted for old callers and ignored: every menu opens left-aligned and flips only at the viewport edge.
// `trigger` replaces the button's class, so a filter chip or an icon button can open a menu too. Only .btn draws the caret.
export function Menu(props: { label: ReactNode; active?: boolean; align?: 'left' | 'right'; trigger?: string; title?: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<CSSProperties>(HIDDEN)

  useLayoutEffect(() => {
    if (!open) { setPos(HIDDEN); return }
    if (!trigger.current || !pop.current) return
    const t = trigger.current.getBoundingClientRect()
    const w = pop.current.offsetWidth
    const h = pop.current.offsetHeight
    const m = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s2')) || 8
    const vw = document.documentElement.clientWidth
    const vh = window.innerHeight
    let left = t.left
    if (left + w > vw - m) left = t.right - w
    left = Math.max(m, Math.min(left, vw - m - w))
    const below = t.bottom + 4
    const up = below + h > vh - m && t.top - 4 - h >= m
    // Prep overrides --accent on its own containers, and a portal on body no longer inherits it, so the popup carries the trigger's value.
    const accent = getComputedStyle(trigger.current).getPropertyValue('--accent').trim()
    setPos({ position: 'fixed', left, top: up ? t.top - 4 - h : Math.max(m, below), visibility: 'visible', ...(accent && { '--accent': accent }) } as CSSProperties)
  }, [open])

  useEffect(() => {
    if (!open) return
    pop.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true })
    // pointerdown, because iOS Safari sends no mousedown for a tap on a plain element.
    const onDown = (e: PointerEvent) => { const n = e.target as Node; if (!wrap.current?.contains(n) && !pop.current?.contains(n)) setOpen(false) }
    // A scroll in any ancestor would leave the fixed popover behind, so it closes. A scroll inside the popover does not.
    const onScroll = (e: Event) => { if (!pop.current?.contains(e.target as Node)) setOpen(false) }
    const shut = () => setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', shut)
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', shut) }
  }, [open])

  const close = () => { setOpen(false); trigger.current?.focus() }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!open) return
    e.stopPropagation()
    if (e.key === 'Escape') { e.preventDefault(); close(); return }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [...(pop.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
    const i = items.indexOf(document.activeElement as HTMLElement)
    const next = e.key === 'ArrowDown' ? Math.min(items.length - 1, i + 1) : Math.max(0, i - 1)
    items[next]?.focus()
  }

  return (
    <div className="menu" ref={wrap} onKeyDown={onKeyDown}>
      <button ref={trigger} className={`${props.trigger ?? 'btn'}${props.active ? ' active' : ''}`} title={props.title} aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(!open)}>
        {props.label}
        {!props.trigger && <svg className="caret" viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 4l2.5 2.5L7.5 4" /></svg>}
      </button>
      {open && createPortal(<div className={PHONE ? 'menu-pop phone' : 'menu-pop'} role="menu" ref={pop} style={pos}>{props.children(close)}</div>, document.body)}
    </div>
  )
}
