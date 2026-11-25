// Shared server helpers: JSON in and out, the error type every route throws, and the write guard.
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dirname, isAbsolute, relative, resolve } from 'node:path'

// The only folder the server writes to. It is gitignored and derived from the page, never a source of facts.
export const NOTEBOOK = resolve(import.meta.dirname, '..', 'my-notebook')

export class HttpError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

// Every write path goes through here. A path that resolves outside my-notebook/ throws before anything is written.
export function notebookPath(...parts: string[]): string {
  const p = resolve(NOTEBOOK, ...parts)
  const rel = relative(NOTEBOOK, p)
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) throw new Error(`Refusing a path outside my-notebook/: ${p}`)
  return p
}

let tmpSeq = 0

// Writes through a temp file and a rename, so a reader never sees half a file.
// Each call has its own temp name, so overlapping writes to one target cannot share a file. The last rename wins.
export async function atomicWrite(path: string, data: string): Promise<void> {
  const target = notebookPath(path)
  await mkdir(dirname(target), { recursive: true })
  const tmp = `${target}.${process.pid}.${tmpSeq++}.tmp`
  try {
    await writeFile(tmp, data, 'utf8')
    await rename(tmp, target)
  } catch (e) {
    await rm(tmp, { force: true }) // a unique name is never reused, so a failed write would otherwise leave it behind
    throw e
  }
}

export async function removeFile(path: string): Promise<void> {
  await rm(notebookPath(path), { force: true })
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    'cache-control': 'no-store',
  })
  res.end(data)
}

// Reads a JSON object body of at most 1 MB. An empty body reads as {}.
export async function readJson(req: IncomingMessage, limit = 1_000_000): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > limit) throw new HttpError(413, 'too_large', 'Request body too large.')
    chunks.push(chunk as Buffer)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw.trim()) return {}
  let body: unknown
  try { body = JSON.parse(raw) } catch { throw new HttpError(400, 'bad_json', 'Body must be JSON.') }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new HttpError(400, 'bad_json', 'Body must be a JSON object.')
  return body as Record<string, unknown>
}
