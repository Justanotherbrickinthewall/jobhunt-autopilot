// The progress mirror. my-notebook/progress.json holds the keys the browser mirrors (the prefixes in
// src/data/progress-keys.ts), so ticks and settings survive a cleared browser. The browser sends every mirrored key on each write.
import { readFile, rename } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { PROGRESS_PREFIXES, progressPrefix } from '../src/data/progress-keys.ts'
import { SYNC_VERSION, localKey, mergeValue, syncKind } from '../src/data/progress-sync.ts'
import { HttpError, atomicWrite, notebookPath, readJson, sendJson } from './util.ts'

const FILE = notebookPath('progress.json')

type Snapshot = { savedAt: number; keys: Record<string, string> }

async function load(): Promise<Snapshot> {
  try {
    const raw = JSON.parse(await readFile(FILE, 'utf8')) as Partial<Snapshot>
    return { savedAt: Number(raw.savedAt) || 0, keys: raw.keys ?? {} }
  } catch (e) {
    if (e instanceof SyntaxError) {
      // A corrupt file is moved aside, so the next write cannot fail on it and the bad copy is kept.
      const aside = FILE.replace(/\.json$/u, `.bad-${Date.now()}.json`)
      await rename(FILE, aside).catch((err: NodeJS.ErrnoException) => { if (err.code !== 'ENOENT') throw err })   // a parallel load may have moved it already
      console.error(`progress.json was not valid JSON and is now ${aside}`)
      return { savedAt: 0, keys: {} }
    }
    // Only a missing file means empty; any other read error must not let the client overwrite the file.
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
    return { savedAt: 0, keys: {} }
  }
}

// Merges a block copied from the phone into the file. Nothing goes backwards; the rules are in src/data/progress-sync.ts.
export async function handleProgressMerge(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readJson(req, 5_000_000)
  if (body.v !== SYNC_VERSION || typeof body.keys !== 'object' || body.keys === null || Array.isArray(body.keys)) {
    throw new HttpError(400, 'bad_progress', 'That is not a progress block from the phone copy.')
  }
  const keys = { ...(await load()).keys }
  let changed = 0
  let ignored = 0
  for (const [k0, theirs] of Object.entries(body.keys)) {
    if (!syncKind(k0)) { ignored++; continue }
    const k = localKey(k0)   // the phone's prep keys carry its own prefix
    let mine: unknown
    try { mine = JSON.parse(keys[k]) } catch { /* absent or unreadable counts as empty */ }
    let next: unknown
    try { next = mergeValue(k, mine, theirs) } catch (e) { throw new HttpError(400, 'bad_progress', e instanceof Error ? e.message : 'Bad value.') }
    if (JSON.stringify(next) !== JSON.stringify(mine)) { keys[k] = JSON.stringify(next); changed++ }
  }
  if (changed) await atomicWrite(FILE, `${JSON.stringify({ savedAt: Date.now(), keys }, null, 2)}\n`)
  sendJson(res, 200, { ok: true, changed, ignored })
}

export async function handleProgress(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method === 'GET') return sendJson(res, 200, await load())
  if (req.method !== 'PUT') throw new HttpError(405, 'bad_method', 'Use GET or PUT.')
  const body = await readJson(req)
  const given = typeof body.keys === 'object' && body.keys !== null ? (body.keys as Record<string, unknown>) : {}
  const keys: Record<string, string> = {}
  for (const [k, v] of Object.entries(given)) {
    if (progressPrefix(k) && typeof v === 'string') keys[k] = v
  }
  // The file is replaced one prefix at a time. A page that sends no key of a prefix, such as a tab running an older
  // build, leaves that prefix as it was, so it cannot erase the other tab's progress. A page that lists a prefix in
  // body.prefixes owns it, so its absent old keys are deleted, which lets the last key of a prefix be removed.
  const owned = Array.isArray(body.prefixes) ? body.prefixes.filter((p): p is string => typeof p === 'string' && (PROGRESS_PREFIXES as readonly string[]).includes(p)) : []
  const seen = new Set<string | undefined>([...Object.keys(keys).map(progressPrefix), ...owned])
  const old = (await load()).keys
  for (const [k, v] of Object.entries(old)) {
    const p = progressPrefix(k)
    if (p && !seen.has(p)) keys[k] = v
  }
  await atomicWrite(FILE, `${JSON.stringify({ savedAt: Date.now(), keys }, null, 2)}\n`)
  sendJson(res, 200, { ok: true, count: Object.keys(keys).length })
}
