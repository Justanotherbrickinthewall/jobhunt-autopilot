// Every screen's address. Pages read their screen from usePath() and move with go(), so Back and a reload work.
// A change of screen pushes an address. A change of selection, tab or drill question passes { replace: true }.
// The phone copy is hosted on GitHub Pages with no fallback for deep links, so there the path lives in memory and the URL never moves.
import { useSyncExternalStore } from 'react'

const PHONE = import.meta.env.VITE_PHONE === '1'
const BASE = import.meta.env.BASE_URL.replace(/\/$/u, '')
const subs = new Set<() => void>()
const notify = (): void => subs.forEach((f) => f())
const split = (p: string): string[] => p.split('/').filter(Boolean).map((s) => { try { return decodeURIComponent(s) } catch { return s } })

let memory: string[] = []
let seen = { raw: '\0', segs: [] as string[] }
function snapshot(): string[] {
  if (PHONE) return memory
  const raw = location.pathname
  if (raw !== seen.raw) seen = { raw, segs: split(raw.startsWith(BASE) ? raw.slice(BASE.length) : raw) }
  return seen.segs
}
function subscribe(f: () => void): () => void {
  subs.add(f)
  window.addEventListener('popstate', f)
  return () => { subs.delete(f); window.removeEventListener('popstate', f) }
}

/** The segments after the base, such as ['prep', 'drill', 'tech', 'tech-012']. */
export const usePath = (): string[] => useSyncExternalStore(subscribe, snapshot)

/** Builds '/prep/questions/tech' from its segments, encoding each one. */
export const addr = (...segs: string[]): string => `/${segs.map(encodeURIComponent).join('/')}`

export function go(path: string, opts?: { replace?: boolean }): void {
  if (PHONE) { memory = split(path); notify(); return }
  const url = BASE + path
  if (url === location.pathname) return
  // A pushed entry remembers where it came from, so leave() can tell when Back reaches the place it wants.
  if (opts?.replace) history.replaceState(history.state, '', url)
  else history.pushState({ from: location.pathname }, '', url)
  notify()
}

/** Leaves a screen for the one it was opened from. It steps Back when that is the previous entry, so the stack doesn't double up. */
export function leave(to: string): void {
  if (!PHONE && (history.state as { from?: string } | null)?.from === BASE + to) history.back()
  else go(to, { replace: !PHONE })
}
