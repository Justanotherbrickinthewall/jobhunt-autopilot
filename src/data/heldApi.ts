// The drawer's calls to the held-row routes in server/held.ts.
import type { Hold, HoldKind } from './holds.ts'

export type JobState = 'queued' | 'running' | 'done' | 'failed' | 'refused'
export type Job = { jobId: string; id: string; state: JobState; queuedAt: number; startedAt: number | null; endedAt: number | null; outcome: string; start?: boolean; resume?: boolean; answer?: { question: string; answer: string } }
export type Trail = { session: string; lane: string; owner: string; updated: string; note: string; log: string[] }
export type HeldStatus = {
  job: Job | null
  opened: HoldKind[]
  ledger: { status: string; appliedDate: string } | null
  holds: Hold[]
  live: string | null
  chromeProfile: string | null
  laneLive: boolean | null
  agesOut: string | null // YYYY-MM-DD, for a new row without override
  trail: Trail | null
}
// `at` is YYYY-MM-DD, or YYYY-MM-DD HH:MM in local time when a stage file dates the event.
export type HistoryEvent = { at: string; label: 'identified' | 'processed' | 'held' | 'unblocked' | 'applied' | 'dropped'; text: string }

// The Outbox routes in server/held.ts. A conversation is read-only and runs no model.
export type ConvEvent = { at: string; dir: 'in' | 'out'; channel: string; kind: 'mail' | 'sent' | 'replied'; who?: string; subject?: string; attachments?: string; text: string; note?: string }
export type OutboxDraft = { text: string; sha: string; asked: string; attach: string; to: string; subject: string; channel: string; questions: string[]; from: string }
export type Conversation = { events: ConvEvent[]; draft?: OutboxDraft | null; refuse?: string; job: Job | null; unknown: boolean; live: string | null; gap: string }

export class HeldError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

const DOWN = 'The dashboard server is not running. Start it with npm run dev.'

async function call<T>(method: 'GET' | 'POST', url: string, body?: unknown, timeout = 15_000): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, {
      method,
      // The server refuses a write without a JSON content type, so every write sends one.
      headers: method === 'GET' ? undefined : { 'content-type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(timeout),
    })
  } catch {
    throw new HeldError('server_down', DOWN)
  }
  const data = (await res.json().catch(() => null)) as { code?: string; error?: string } | null
  // The server answers every error in JSON with a code. Anything else is Vite's proxy saying the server is down.
  if (!res.ok || data === null) throw new HeldError(data?.code ?? 'server_down', data?.error ?? DOWN)
  return data as T
}

const base = (id: string): string => `/api/held/${encodeURIComponent(id)}`

export const heldStatus = (id: string) => call<HeldStatus>('GET', base(id))
export const rerun = (id: string) => call<{ job: Job }>('POST', `${base(id)}/rerun`)
export const openFix = (id: string, kind: HoldKind) => call<{ opened: HoldKind[] }>('POST', `${base(id)}/open`, { kind })
export const drop = (id: string, reason: string) => call<{ ok: true }>('POST', `${base(id)}/drop`, { reason })
export const markSent = (id: string) => call<{ ok: true }>('POST', `${base(id)}/sent`)
// A draft is one `claude -p` call, which can take up to the server's 180-second limit.
export const draftAnswer = (id: string, question: string, rough: string) =>
  call<{ question: string; answer: string }>('POST', `${base(id)}/answer/draft`, { question, rough }, 200_000)
export const saveAnswer = (id: string, question: string, answer: string) =>
  call<{ job: Job; row: string }>('POST', `${base(id)}/answer/save`, { question, answer })
export const rowHistory = (id: string) => call<{ events: HistoryEvent[] }>('GET', `${base(id)}/history`)

// The latest job for each row, and the fix pages opened per row. A server started before this route reads `jobs` as a
// row id and answers 200 with no jobs list, so that counts as an old server.
export async function heldJobs(): Promise<{ jobs: Job[]; opened: Record<string, HoldKind[]> }> {
  const r = await call<{ jobs?: unknown; opened?: Record<string, HoldKind[]> }>('GET', '/api/held/jobs')
  if (!Array.isArray(r.jobs)) throw new HeldError('old_server', 'Run state shows once the dashboard server is restarted.')
  return { jobs: r.jobs as Job[], opened: r.opened ?? {} }
}

export const conversation = (ref: string) => call<Conversation>('GET', `/api/outbox/conversation?ref=${encodeURIComponent(ref)}`)
export const sendDraft = (ref: string, sha: string, text: string) => call<{ job: Job }>('POST', '/api/outbox/send', { ref, sha, text })
export const skipDraft = (ref: string) => call<{ ok: true }>('POST', '/api/outbox/skip', { ref })
export const resolveSend = (ref: string, sent: boolean) => call<{ ok: true }>('POST', '/api/outbox/resolve', { ref, sent })
