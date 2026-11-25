import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'

// A drag handle between two panes. It sets a CSS custom property on the layout root, so the CSS stays in charge of the layout.
// One width is kept for each kind of pane (name), shared by every screen of that kind. The keys sit outside the fde: and
// hunt-board: prefixes, so they are never mirrored to my-notebook/progress.json.
const KEY = (name: string): string => `pane-width:${name}`
const read = (name: string): number | null => { try { const v = Number(localStorage.getItem(KEY(name))); return v > 0 ? v : null } catch { return null } }
const write = (name: string, v: number | null): void => { try { if (v === null) localStorage.removeItem(KEY(name)); else localStorage.setItem(KEY(name), String(Math.round(v))) } catch { /* storage unavailable */ } }

interface Props {
  name: string                        // list, aside, contents or side
  label: string                       // "Resize the list"
  varName: string                     // the custom property, such as --ld-list-w
  root: RefObject<HTMLElement | null> // the layout root that carries it
  pane: RefObject<HTMLElement | null> // the pane being sized, measured for the current width
  min: number
  max: number
  grow: 'right' | 'left'              // the direction of a drag that widens the pane
  room?: () => number                 // the most the layout can give the pane now, so the main pane keeps its floor
  factor?: number                     // 2 when the pane sits in a centred group, which moves half as fast as the pointer
  className?: string
}

export function Splitter(p: Props) {
  const [w, setW] = useState<number | null>(() => read(p.name))
  const [live, setLive] = useState(0)
  const drag = useRef<{ x: number; w: number } | null>(null)
  const top = (): number => Math.max(p.min, Math.min(p.max, p.room ? p.room() : p.max))
  const clamp = (v: number): number => Math.max(p.min, Math.min(top(), v))

  useEffect(() => {
    const el = p.root.current
    if (!el) return
    if (w === null) el.style.removeProperty(p.varName)
    else el.style.setProperty(p.varName, `${w}px`)
    setLive(p.pane.current?.getBoundingClientRect().width ?? w ?? 0)
  }, [w])
  useEffect(() => () => { p.root.current?.style.removeProperty(p.varName) }, [])

  const set = (v: number | null): void => { setW(v === null ? null : clamp(v)); write(p.name, v === null ? null : clamp(v)) }
  const now = (): number => p.pane.current?.getBoundingClientRect().width ?? w ?? p.min
  const sign = p.grow === 'right' ? 1 : -1

  const down = (e: PointerEvent<HTMLDivElement>): void => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, w: now() }
    p.root.current?.classList.add('is-resizing')
  }
  const move = (e: PointerEvent<HTMLDivElement>): void => {
    if (!drag.current) return
    setW(clamp(drag.current.w + sign * (e.clientX - drag.current.x) * (p.factor ?? 1)))
  }
  const up = (e: PointerEvent<HTMLDivElement>): void => {
    if (!drag.current) return
    drag.current = null
    p.root.current?.classList.remove('is-resizing')
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    write(p.name, w)
  }
  const key = (e: KeyboardEvent<HTMLDivElement>): void => {
    const step = e.shiftKey ? 64 : 16
    if (e.key === 'ArrowRight') set(now() + sign * step)
    else if (e.key === 'ArrowLeft') set(now() - sign * step)
    else if (e.key === 'Home') set(p.min)
    else if (e.key === 'End') set(top())
    else return
    e.preventDefault()
  }

  return (
    <div className={`splitter${p.className ? ` ${p.className}` : ''}`} role="separator" aria-orientation="vertical" aria-label={p.label} tabIndex={0}
      aria-valuenow={Math.round(live)} aria-valuemin={p.min} aria-valuemax={Math.round(top())}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key} onDoubleClick={() => set(null)} />
  )
}
