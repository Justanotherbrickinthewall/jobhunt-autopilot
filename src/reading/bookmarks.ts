// The Notebook's client store, ported from fde-roadmap's engine/bookmarks.ts. The server's my-notebook/
// folder is the record. If the server is down, a save waits in hunt-board:bookmarks-pending:v1 and goes
// up on the next load that reaches the server, so a save is never lost.
import { useSyncExternalStore } from 'react'
import type { Collection, Item, Source } from '../../server/notebook.ts'
import { readKey, useStored, writeKey } from './storage.ts'

export type { Collection, Item, Source }

// A save that has not reached the server yet. It names its collection, because the collection may not exist yet.
export type PendingItem = {
  id: string
  collectionId?: string
  collectionName: string
  createdAt: string
  note: string
  tags: string[]
  source: Source
  text: string
  suggestionPending?: boolean
}

type SaveInput = Omit<PendingItem, 'id' | 'createdAt'>

export class NotebookError extends Error {
  code: string
  status: number   // the HTTP status when the server answered, 0 when it did not
  constructor(code: string, message: string, status = 0) {
    super(message)
    this.code = code
    this.status = status
  }
}

const PENDING_KEY = 'hunt-board:bookmarks-pending:v1'
const EMPTY_PENDING: PendingItem[] = []

type State = { collections: Collection[]; items: Item[]; loaded: boolean; online: boolean; suggesting: string[] }
let state: State = { collections: [], items: [], loaded: false, online: true, suggesting: [] }
const listeners = new Set<() => void>()
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

export const getPending = (): PendingItem[] => readKey<PendingItem[]>(PENDING_KEY, EMPTY_PENDING)
const setPending = (p: PendingItem[]) => writeKey(PENDING_KEY, p)

// A saved passage is known by its kind, the link back to it and its text. The server trims the text it keeps, so this does too.
export const markKey = (s: Source, text: string): string => [s.kind, s.link, text.trim()].join('|')

export type NotebookState = State & { pending: PendingItem[] }

export function useNotebook(): NotebookState {
  const st = useSyncExternalStore(subscribe, () => state, () => state)
  const pending = useStored<PendingItem[]>(PENDING_KEY, EMPTY_PENDING)
  return { ...st, pending }
}

// The saved item for a passage, on the server or still in the queue.
export function findSaved(st: NotebookState, source: Source, text: string): { item?: Item; pending?: PendingItem } {
  const key = markKey(source, text)
  const item = st.items.find((i) => markKey(i.source, i.text) === key)
  if (item) return { item }
  return { pending: st.pending.find((i) => markKey(i.source, i.text) === key) }
}

// ---- network -------------------------------------------------------------------------------------

const DOWN = 'The notebook server is not running. Start the dashboard with npm run dev, and saves will sync.'

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, {
      method,
      // The server refuses a write without a JSON content type, so every write sends one.
      headers: method === 'GET' ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(url.endsWith('/summarise') || url.endsWith('/suggest') ? 200_000 : 8_000),
    })
  } catch {
    set({ online: false })
    throw new NotebookError('server_down', DOWN)
  }
  const data = (await res.json().catch(() => null)) as { code?: string; error?: string } | null
  // The server always answers an error in JSON with a code. Anything else is Vite's proxy saying the server is down.
  if (!res.ok || data === null) {
    if (!data?.code) {
      set({ online: false })
      throw new NotebookError('server_down', DOWN)
    }
    throw new NotebookError(data.code, data.error ?? `Request failed (${res.status}).`, res.status)
  }
  set({ online: true })
  return data as T
}

let flushing: Promise<void> | null = null

async function flushPending(): Promise<void> {
  if (flushing) return flushing
  flushing = (async () => {
    for (const p of getPending()) {
      try {
        await call('POST', '/api/bookmarks', p)
      } catch (e) {
        if (e instanceof NotebookError && e.code === 'server_down') return
        // A 4xx will never succeed on a retry, so the item leaves the queue. Any other failure keeps it, and the items behind it still go up.
        if (!(e instanceof NotebookError && e.status >= 400 && e.status < 500)) continue
      }
      setPending(getPending().filter((x) => x.id !== p.id))
    }
  })().finally(() => { flushing = null })
  return flushing
}

type All = { collections: Collection[]; items: Item[] }

export async function loadNotebook(): Promise<void> {
  try {
    const d = await call<All>('GET', '/api/bookmarks')
    set({ collections: d.collections, items: d.items, loaded: true })
  } catch {
    set({ loaded: true })
    return
  }
  if (getPending().length > 0) {
    await flushPending()
    const d = await call<All>('GET', '/api/bookmarks').catch(() => null)
    if (d) set({ collections: d.collections, items: d.items })
  }
  // A filing call that never finished, because the server was down or restarted, is retried here.
  for (const i of state.items.filter((x) => x.suggestionPending && !state.suggesting.includes(x.id)).slice(0, 5)) void suggestBookmark(i.id)
}

const newId = () => `bm_${crypto.randomUUID().slice(0, 8)}`

// Saves a passage. It resolves with where the save went: the server, or the local queue.
export async function saveBookmark(input: SaveInput): Promise<{ where: 'server' | 'local'; item?: Item }> {
  const id = newId()
  const createdAt = new Date().toISOString()
  input = { ...input, text: input.text.trim() }
  try {
    const d = await call<{ item: Item; collections: Collection[] }>('POST', '/api/bookmarks', { id, createdAt, ...input })
    set({ collections: d.collections, items: [...state.items.filter((i) => i.id !== d.item.id), d.item] })
    if (getPending().length > 0) void loadNotebook()
    return { where: 'server', item: d.item }
  } catch (e) {
    if (e instanceof NotebookError && e.code !== 'server_down') throw e
    setPending([...getPending(), { id, createdAt, ...input }])
    return { where: 'local' }
  }
}

// Asks the server to have Claude file a saved item. A failure is silent and the local guess stays.
export async function suggestBookmark(id: string): Promise<void> {
  if (state.suggesting.includes(id)) return
  set({ suggesting: [...state.suggesting, id] })
  try {
    const d = await call<{ item: Item; collections: Collection[] }>('POST', `/api/bookmarks/${id}/suggest`, {})
    set({ collections: d.collections, items: state.items.map((i) => (i.id === id ? d.item : i)) })
  } catch {
    // Offline or failed. If the item is still flagged, the next loadNotebook retries it.
  } finally {
    set({ suggesting: state.suggesting.filter((x) => x !== id) })
  }
}

const STOP = new Set('the a an and or of to in on for with is are was be it its as at by from that this these those into than then you your can not use used using how what when why which'.split(' '))
const terms = (t: string) => t.toLowerCase().match(/[a-z][a-z0-9-]{2,}/gu)?.filter((w) => !STOP.has(w)) ?? []

// The quick local guess: the collection whose name or tags share the most words with the passage,
// else one named after the first part of the breadcrumb.
export function guessCollection(st: Pick<State, 'collections' | 'items'>, source: Source, text: string): { collectionId?: string; collectionName: string } {
  const bag = new Set(terms(`${text} ${source.crumb}`))
  let best: Collection | undefined
  let bestScore = 0
  for (const c of st.collections) {
    const nameWords = terms(c.name)
    const tagWords = st.items.filter((i) => i.collectionId === c.id).flatMap((i) => i.tags.flatMap(terms))
    const score = nameWords.filter((w) => bag.has(w)).length * 2 + new Set(tagWords.filter((w) => bag.has(w))).size
    if (score > bestScore) {
      best = c
      bestScore = score
    }
  }
  if (best) return { collectionId: best.id, collectionName: best.name }
  const topic = source.crumb.split(' > ')[0].trim() || 'Unsorted'
  const same = st.collections.find((c) => c.name.toLowerCase() === topic.toLowerCase())
  return same ? { collectionId: same.id, collectionName: same.name } : { collectionName: topic }
}

// One-click save: guess a collection now, save with no note or tags, then ask Claude to file it.
export async function quickSave(source: Source, text: string): Promise<{ where: 'server' | 'local'; item?: Item }> {
  const r = await saveBookmark({ ...guessCollection(state, source, text), note: '', tags: [], source, text, suggestionPending: true })
  if (r.where === 'server' && r.item) void suggestBookmark(r.item.id)
  return r
}

export async function patchBookmark(id: string, patch: Partial<Pick<Item, 'note' | 'tags' | 'collectionId'>>): Promise<void> {
  if (getPending().some((p) => p.id === id)) {
    const { collectionId, ...rest } = patch
    setPending(getPending().map((p) => (p.id !== id ? p : {
      ...p,
      ...rest,
      suggestionPending: false,
      ...(collectionId ? { collectionId, collectionName: state.collections.find((c) => c.id === collectionId)?.name ?? p.collectionName } : {}),
    })))
    return
  }
  const d = await call<{ item: Item }>('PATCH', `/api/bookmarks/${id}`, patch)
  set({ items: state.items.map((i) => (i.id === id ? d.item : i)) })
}

export async function deleteBookmark(id: string, opts: { pruneCollection?: boolean } = {}): Promise<Item | PendingItem | undefined> {
  const pending = getPending().find((p) => p.id === id)
  if (pending) {
    setPending(getPending().filter((p) => p.id !== id))
    return pending
  }
  const item = state.items.find((i) => i.id === id)
  await call('DELETE', `/api/bookmarks/${id}`)
  set({ items: state.items.filter((i) => i.id !== id) })
  // Drop a collection this item's quick save created, if it is now empty.
  const col = item && state.collections.find((c) => c.id === item.collectionId)
  if (opts.pruneCollection && item && col && !col.summary && col.createdAt >= item.createdAt && !state.items.some((i) => i.collectionId === col.id)) {
    await deleteCollection(col.id).catch(() => {})
  }
  // The name goes back with the item, so Undo can bring back a collection that was just dropped.
  return item && col ? { ...item, collectionName: col.name } : item
}

// Undo for a delete: post the same item back with its first id and date.
export async function restoreBookmark(item: Item | PendingItem): Promise<void> {
  const collectionName = state.collections.find((c) => c.id === item.collectionId)?.name ?? ('collectionName' in item ? item.collectionName : 'Restored')
  const body: PendingItem = {
    id: item.id, createdAt: item.createdAt, note: item.note, tags: item.tags, source: item.source, text: item.text,
    collectionId: item.collectionId, collectionName,
  }
  try {
    const d = await call<{ item: Item; collections: Collection[] }>('POST', '/api/bookmarks', body)
    set({ collections: d.collections, items: [...state.items.filter((i) => i.id !== d.item.id), d.item] })
  } catch (e) {
    if (!(e instanceof NotebookError) || e.code !== 'server_down') throw e
    setPending([...getPending().filter((p) => p.id !== item.id), body])   // the server is down, so the item waits in the queue like any offline save
  }
}

export async function createCollection(name: string): Promise<Collection> {
  const d = await call<{ collection: Collection }>('POST', '/api/collections', { name })
  set({ collections: [...state.collections.filter((c) => c.id !== d.collection.id), d.collection] })
  return d.collection
}

export async function renameCollection(id: string, name: string): Promise<void> {
  const d = await call<{ collection: Collection }>('PATCH', `/api/collections/${id}`, { name })
  set({ collections: state.collections.map((c) => (c.id === id ? d.collection : c)) })
}

export async function deleteCollection(id: string): Promise<void> {
  await call('DELETE', `/api/collections/${id}`)
  set({ collections: state.collections.filter((c) => c.id !== id) })
}

export async function summariseCollection(id: string): Promise<void> {
  const d = await call<{ collection: Collection }>('POST', `/api/collections/${id}/summarise`, {})
  set({ collections: state.collections.map((c) => (c.id === id ? d.collection : c)) })
}

// Collections with the most recently used first, for the picker.
export function recentCollections(st: Pick<State, 'collections' | 'items'>): Collection[] {
  const last = new Map<string, string>()
  for (const i of st.items) {
    const seen = last.get(i.collectionId)
    if (!seen || i.createdAt > seen) last.set(i.collectionId, i.createdAt)
  }
  return [...st.collections].sort((a, b) => (last.get(b.id) ?? b.createdAt).localeCompare(last.get(a.id) ?? a.createdAt))
}
