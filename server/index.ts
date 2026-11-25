// The dashboard's local server. No framework. Run with: node server/index.ts (Node 25 strips the types).
// Vite proxies /api here. It writes my-notebook/, appends rows to my-profile/faq.md, and starts rerun runs, which
// write my-sessions/ through the engine as any run does. The Outbox routes (/api/outbox/) send, skip or resolve one
// drafted reply the same way, and read a person's saved conversation.
import { createServer, type IncomingMessage } from 'node:http'
import { handleHeld, handleOutbox, stopRuns } from './held.ts'
import { handleAttempts, handleGrade } from './learn/grade.ts'
import { handleNotebook } from './notebook.ts'
import { handlePrepJudge } from './prepJudge.ts'
import { handleProgress, handleProgressMerge } from './progress.ts'
import { handleRuns } from './runs.ts'
import { handleTts, handleTtsAudio } from './tts.ts'
import { HttpError, sendJson } from './util.ts'

// HUNT_SERVER_PORT lets a smoke test run a second server beside the live one.
const PORT = Number(process.env.HUNT_SERVER_PORT) || 7003
// HUNT_DASH_PORT does the same for Vite, so a verification preview passes the host and origin checks.
const DASH = Number(process.env.HUNT_DASH_PORT) || 7002
const HOSTS = new Set([`localhost:${DASH}`, `127.0.0.1:${PORT}`, `localhost:${PORT}`])
const ORIGIN = `http://localhost:${DASH}`

// Stops another web page from writing to the notebook or starting a Claude call.
function refuse(req: IncomingMessage): HttpError | null {
  if (!HOSTS.has(req.headers.host ?? '')) return new HttpError(403, 'bad_host', 'This host is not allowed.')
  if (req.headers.origin !== undefined && req.headers.origin !== ORIGIN) return new HttpError(403, 'bad_origin', 'Requests from other sites are refused.')
  const write = req.method !== 'GET' && req.method !== 'HEAD'
  if (write && !(req.headers['content-type'] ?? '').startsWith('application/json')) {
    return new HttpError(400, 'bad_content_type', 'A write must send content-type: application/json.')
  }
  return null
}

const server = createServer(async (req, res) => {
  try {
    // Inside the try, so a target such as "//" is a 400 reply and not an unhandled rejection that ends the process.
    let path: string
    try { path = new URL(req.url ?? '/', 'http://localhost').pathname } catch { throw new HttpError(400, 'bad_url', 'The request URL is not valid.') }
    const bad = refuse(req)
    if (bad) throw bad
    if (req.method === 'GET' && path === '/api/health') return sendJson(res, 200, { ok: true })
    if (req.method === 'GET' && path === '/api/runs') return await handleRuns(res)
    if (req.method === 'POST' && path === '/api/tts') return await handleTts(req, res)
    if (req.method === 'GET' && path.startsWith('/api/tts/audio/')) return await handleTtsAudio(path.slice('/api/tts/audio/'.length), req, res)
    if (req.method === 'POST' && path === '/api/prep/judge') return await handlePrepJudge(req, res)
    if (req.method === 'POST' && path === '/api/progress/merge') return await handleProgressMerge(req, res)
    if (path === '/api/progress') return await handleProgress(req, res)
    if (path.startsWith('/api/bookmarks') || path.startsWith('/api/collections')) return await handleNotebook(req, res, path)
    // Learn writes only my-learn/ and my-notebook/, so these two take no hunt lock.
    if (req.method === 'POST' && path === '/api/learn/grade') return await handleGrade(req, res)
    if (req.method === 'GET' && path === '/api/learn/attempts') return await handleAttempts(new URL(req.url ?? '/', 'http://localhost'), res)
    if (path.startsWith('/api/held/')) return await handleHeld(req, res, path)
    if (path.startsWith('/api/outbox/')) return await handleOutbox(req, res, path)
    throw new HttpError(404, 'not_found', 'Not found.')
  } catch (e) {
    const err = e instanceof HttpError ? e : new HttpError(500, 'internal', String(e instanceof Error ? e.message : e))
    if (!res.headersSent) sendJson(res, err.status, { error: err.message, code: err.code })
    else res.end()
  }
})

server.listen(PORT, '127.0.0.1', () => console.log(`Hunt board server on http://127.0.0.1:${PORT}`))

// A rerun runs in its own process group, so the shell's Ctrl-C does not reach it. Stop it, let the server settle its row, then exit.
// npm and concurrently each forward a second SIGINT, and Node's default action for it would end the server before it settles the row.
let down = false
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
  process.on(sig, () => {
    if (down) return
    down = true
    void stopRuns().finally(() => process.exit(0))
  })
}
