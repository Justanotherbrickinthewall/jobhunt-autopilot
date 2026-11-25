// A small localStorage layer with change subscription, ported from fde-roadmap's engine/storage.ts. It is the one
// layer for the hunt board and for Learn. Keys in MIRRORED, and every fde: key, are also kept in
// my-notebook/progress.json, so progress survives a cleared browser. The file wins on load; a mirrored key only in the
// browser is kept and pushed back.
import { useSyncExternalStore } from 'react'
import { PROGRESS_PREFIXES, progressPrefix } from '../data/progress-keys.ts'

// The phone build has no server, so nothing is pushed to it or read back from it.
const PHONE = import.meta.env.VITE_PHONE === '1'
const PREFIX = 'hunt-board:'
const MIRRORED: ReadonlySet<string> = new Set([
  'hunt-board:prep-practised:v2',
  'hunt-board:prep-recall:v1',
  'hunt-board:profile-read:v1',
  'hunt-board:narration:v1',
])

// Every fde: key is mirrored too, because Learn keeps its chapter and review state under that prefix.
const LEARN_PREFIX = 'fde:'
// Set while a mirrored write has not reached the server. The key sits outside every mirrored prefix, so it is never mirrored itself.
const DIRTY_KEY = 'mirror-dirty:v1'
let writes = 0   // counts mirrored writes, so a push that finishes after a newer write does not clear the flag
const isDirty = (): boolean => { try { return localStorage.getItem(DIRTY_KEY) === '1' } catch { return false } }
const setDirty = (on: boolean): void => { try { if (on) localStorage.setItem(DIRTY_KEY, '1'); else localStorage.removeItem(DIRTY_KEY) } catch { /* storage unavailable */ } }

const isMirrored = (key: string): boolean => MIRRORED.has(key) || progressPrefix(key) === LEARN_PREFIX

let version = 0
const listeners = new Set<() => void>()
const cache = new Map<string, { raw: string | null; value: unknown }>()

function emit(): void {
  version++
  listeners.forEach((l) => l())
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === null) {   // another tab cleared all site data
      cache.clear()
      emit()
    } else if (e.key.startsWith(PREFIX) || e.key.startsWith(LEARN_PREFIX)) {
      cache.delete(e.key)
      emit()
    }
  })
}

export function readKey<T>(key: string, fallback: T): T {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(key)
  } catch {
    return fallback
  }
  const hit = cache.get(key)
  if (hit && hit.raw === raw) return hit.value as T
  let value: unknown = fallback
  if (raw !== null) {
    try { value = JSON.parse(raw) } catch { value = fallback }
  }
  cache.set(key, { raw, value })
  return value as T
}

export function writeKey<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* storage may be full or blocked; the app still works for the session */ }
  cache.delete(key)
  emit()
  if (isMirrored(key)) { writes++; setDirty(true); schedulePush() }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch { /* storage unavailable */ }
  cache.delete(key)
  emit()
  if (isMirrored(key)) { writes++; setDirty(true); schedulePush() }
}

let hydrated = false
let pushTimer: ReturnType<typeof setTimeout> | undefined

function snapshot(): Record<string, string> {
  const keys: Record<string, string> = {}
  for (const k of MIRRORED) {
    try {
      const v = localStorage.getItem(k)
      if (v !== null) keys[k] = v
    } catch { /* storage unavailable */ }
  }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && progressPrefix(k) === LEARN_PREFIX) keys[k] = localStorage.getItem(k) ?? ''
    }
  } catch { /* storage unavailable */ }
  return keys
}

function push(keepalive = false): void {
  clearTimeout(pushTimer)
  pushTimer = undefined
  const sent = writes
  try {
    void fetch(PHONE ? '' : '/api/progress', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ keys: snapshot(), prefixes: [...PROGRESS_PREFIXES] }),
      keepalive,
    }).then((res) => { if (res.ok && writes === sent) setDirty(false) }).catch(() => {})
  } catch { /* fetch unavailable */ }
}

function schedulePush(): void {
  if (PHONE || !hydrated) return   // never overwrite the file before it has been read
  clearTimeout(pushTimer)
  pushTimer = setTimeout(push, 800)
}

let focusBound = false
function bindFocus(): void {
  if (focusBound) return
  focusBound = true
  // Back in the tab: reload the file unless this tab has unsynced writes, so a merge from the phone is taken in before this tab can push its older copy. Unsynced writes are pushed.
  const back = () => { if (!hydrated || !isDirty()) void reload(); else push() }
  window.addEventListener('focus', back)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') back() })
  window.addEventListener('pagehide', () => { if (pushTimer) push(true) })
}

/** Loads my-notebook/progress.json into localStorage. Call once before the first render. */
let inflight: Promise<void> | null = null
export function hydrateFromServer(): Promise<void> {
  return PHONE || hydrated ? Promise.resolve() : reload()
}

const reload = (): Promise<void> => (inflight ??= hydrate().finally(() => { inflight = null }))   // one fetch at a time, so a slow older copy cannot land after a tick

async function hydrate(): Promise<void> {
  bindFocus()
  try {
    const res = await fetch('/api/progress', { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return   // server down: run on localStorage alone and do not push
    const data = (await res.json()) as { keys?: Record<string, string> }
    const dirty = isDirty()   // unsynced local writes win; the server only fills the keys missing here
    // shortcut: a key removed while the server was down comes back from the server copy; track removals if that bites.
    for (const [k, v] of Object.entries(data.keys ?? {})) {
      if (isMirrored(k) && typeof v === 'string' && !(dirty && localStorage.getItem(k) !== null)) localStorage.setItem(k, v)
    }
    cache.clear()
    const first = !hydrated
    hydrated = true
    emit()
    if (first) push()   // later reloads have nothing the file lacks
  } catch { /* server down or storage blocked: the next focus tries again */ }
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

/** Subscribes a component to one key. `fallback` must be a stable constant. */
export function useStored<T>(key: string, fallback: T): T {
  return useSyncExternalStore(subscribe, () => readKey(key, fallback), () => fallback)
}

/** Re-renders on any storage change. Use for derived views over many keys. */
export function useStorageVersion(): number {
  return useSyncExternalStore(subscribe, () => version, () => 0)
}
