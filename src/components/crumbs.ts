// The top bar's trail below the area. A page sets it with useCrumbs, and it clears when the page unmounts.
// It is its own module because the phone build swaps Rail.tsx for a stand-in, and pages in both builds call it.
import { useEffect, useRef, useSyncExternalStore } from 'react'

export interface Crumb { label: string; go?: () => void }

let trail: Crumb[] = []
const subs = new Set<() => void>()
const set = (next: Crumb[]): void => { trail = next; subs.forEach((f) => f()) }
const subscribe = (f: () => void): (() => void) => { subs.add(f); return () => { subs.delete(f) } }

export function useTrail(): Crumb[] {
  return useSyncExternalStore(subscribe, () => trail)
}

// A page's go closures are new on every render, so the trail is reset only when a label changes, and each crumb calls the latest closure.
export function useCrumbs(next: Crumb[]): void {
  const latest = useRef(next)
  latest.current = next
  const key = next.map((c) => `${c.label}${c.go ? '>' : ''}`).join('\u0000')
  useEffect(() => {
    set(latest.current.map((c, i) => ({ label: c.label, go: c.go && (() => latest.current[i]?.go?.()) })))
    return () => set([])
  }, [key])
}
