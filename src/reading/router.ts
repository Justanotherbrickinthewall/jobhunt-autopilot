// Deep links. A link such as #prep/tech-012 opens that place: the app switches the tab, the page opens
// the fold and reveal() scrolls to it and flashes it. Tab clicks never write the hash, and the hash is
// cleared once read, so a reload does not jump back.
import { useEffect, useState } from 'react'

export type Target =
  | { tab: 'profile'; file: string; block: string }
  | { tab: 'prep'; id: string }
  | { tab: 'hunt'; role: string; pane: string }
  | { tab: 'retro'; role: string; pane: string }
  | { tab: 'notebook'; slug: string }
  | { tab: 'interviews'; folder: string; question?: string }

// A Learn link such as /learn/chapter/rag-01#b-intro-3. Notebook items from Learn carry one, and the server keeps the same shape.
export const LEARN_LINK = /^\/learn(?:\/[\w-]+)*(?:\?q=[\w-]+|#[\w-]+)?$/u

// Opens a Learn path from another tab. App listens for popstate and switches to the Learn tab.
export function goLearn(link: string): void {
  if (link !== location.pathname + location.search + location.hash) history.pushState(null, '', link)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function parseHash(hash: string): Target | null {
  // A bare #retro, #hunt or #interviews opens that view with nothing selected.
  const bare = /^#(hunt|retro|interviews)$/u.exec(hash)
  if (bare) return bare[1] === 'interviews' ? { tab: 'interviews', folder: '' } : { tab: bare[1] as 'hunt' | 'retro', role: '', pane: 'overview' }
  const m = /^#(profile|prep|hunt|retro|notebook|interviews)\/(.+)$/u.exec(hash)
  if (!m) return null
  let parts: string[]
  try { parts = m[2].split('/').map(decodeURIComponent) } catch { return null }
  const [a = '', b = ''] = parts
  if (!a) return null
  switch (m[1]) {
    case 'profile': return { tab: 'profile', file: a, block: b }
    case 'prep': return { tab: 'prep', id: a }
    case 'hunt': return { tab: 'hunt', role: a, pane: b || 'overview' }
    case 'retro': return { tab: 'retro', role: a, pane: b || 'overview' }
    case 'interviews': return { tab: 'interviews', folder: a, ...(b ? { question: b } : {}) }
    default: return { tab: 'notebook', slug: a }
  }
}

// The latest link followed, as a new object each time, so the same link twice is two jumps.
export function useHashTarget(): Target | null {
  const [target, setTarget] = useState<Target | null>(null)
  useEffect(() => {
    const read = () => {
      const t = parseHash(location.hash)
      if (!t) return
      history.replaceState(null, '', location.pathname + location.search)
      setTarget(t)
    }
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])
  return target
}

// A page that mounts again later would see the same target again, so each target is acted on once.
const taken = new WeakSet<Target>()
export const isTaken = (t: Target): boolean => taken.has(t)
export function take(t: Target): boolean {
  if (taken.has(t)) return false
  taken.add(t)
  return true
}

// Waits up to two seconds for the element to be on screen, opens any <details> around it, runs open
// for a fold of its own, scrolls it to the middle and flashes it for 2.6 seconds.
export function reveal(selector: string, open?: (el: HTMLElement) => void): void {
  let tries = 0
  const step = () => {
    const el = document.querySelector<HTMLElement>(selector)
    if (el) for (let d = el.closest('details'); d; d = d.parentElement?.closest('details') ?? null) d.open = true
    if (!el || el.getClientRects().length === 0) {
      if (++tries < 120) requestAnimationFrame(step)
      return
    }
    open?.(el)
    el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    el.classList.add('rd-flash')
    window.setTimeout(() => el.classList.remove('rd-flash'), 2600)
  }
  requestAnimationFrame(step)
}
