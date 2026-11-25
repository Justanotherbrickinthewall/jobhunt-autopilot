// The neural read-aloud voice: edge-tts through uvx, with word timings. Each result is cached in
// my-notebook/tts-cache/ under sha1(text|voice|rate). The rate never changes, because playback speed is
// applied in the browser, so every speed shares one cache entry.
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pipeline } from 'node:stream'
import { HttpError, notebookPath, readJson, sendJson } from './util.ts'

const CACHE = notebookPath('tts-cache')
const HELPER = join(import.meta.dirname, 'tts_helper.py')
const DEFAULT_VOICE = 'en-GB-RyanNeural'
const RATE = '+0%'
const MAX_TEXT = 5000
const inflight = new Map<string, Promise<void>>()

type Word = { text: string; start: number; end: number }

function run(args: string[], timeoutMs: number): Promise<{ code: number | null; stderr: string; missing: boolean }> {
  return new Promise((resolve) => {
    const child = spawn('uvx', args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    child.on('error', (e: NodeJS.ErrnoException) => {
      clearTimeout(timer)
      resolve({ code: null, stderr: e.message, missing: e.code === 'ENOENT' })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code, stderr, missing: false })
    })
  })
}

async function synth(id: string, text: string, voice: string): Promise<void> {
  await mkdir(CACHE, { recursive: true })
  // The text goes to the helper in a temp file outside the repo, removed when the call ends.
  const textFile = join(tmpdir(), `hunt-board-tts-${id}.txt`)
  const mp3 = notebookPath('tts-cache', `${id}.mp3`)
  const json = notebookPath('tts-cache', `${id}.json`)
  const part = `${mp3}.part`
  await writeFile(textFile, text, 'utf8')
  try {
    const r = await run(['--with', 'edge-tts==7.3.1', 'python', HELPER, textFile, voice, RATE, part, json], 60_000)
    if (r.missing) throw new Error('uvx is not installed.')
    if (r.code !== 0) throw new Error(`edge-tts failed: ${r.stderr.slice(-300)}`)
    await rename(part, mp3)
  } finally {
    await rm(textFile, { force: true })
    await rm(part, { force: true })
  }
}

// The cached or freshly synthesised audio for one text. The phone build calls it too, to pre-build the audio files.
export async function ttsFor(text: string, voice: string = DEFAULT_VOICE): Promise<{ id: string; words: Word[] }> {
  const id = createHash('sha1').update(`${text}|${voice}|${RATE}`).digest('hex')
  const json = join(CACHE, `${id}.json`)
  const cached = await Promise.all([stat(json), stat(join(CACHE, `${id}.mp3`))]).then(() => true, () => false)
  if (!cached) {
    // Two identical requests share one synthesis.
    let job = inflight.get(id)
    if (!job) {
      job = synth(id, text, voice).finally(() => inflight.delete(id))
      inflight.set(id, job)
    }
    await job
  }
  return { id, words: (JSON.parse(await readFile(json, 'utf8')) as { words: Word[] }).words }
}

// POST /api/tts {text, voice} returns {id, words}. The audio is at /api/tts/audio/<id>.mp3.
export async function handleTts(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readJson(req)
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text) throw new HttpError(400, 'bad_request', 'text is required.')
  if (text.length > MAX_TEXT) throw new HttpError(400, 'too_long', `text is too long (${MAX_TEXT} characters max).`)
  const voice = typeof body.voice === 'string' && /^[A-Za-z0-9-]+$/u.test(body.voice) ? body.voice : DEFAULT_VOICE
  try {
    sendJson(res, 200, await ttsFor(text, voice))
  } catch (e) {
    throw new HttpError(503, 'tts_unavailable', `Neural voice unavailable. ${e instanceof Error ? e.message : String(e)}`)
  }
}

// GET /api/tts/audio/<sha1>.mp3, with Range support so the audio element can seek.
export async function handleTtsAudio(file: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!/^[a-f0-9]{40}\.mp3$/u.test(file)) throw new HttpError(404, 'not_found', 'Not found.')
  const path = join(CACHE, file)
  const size = await stat(path).then((s) => s.size, () => -1)
  if (size < 0) throw new HttpError(404, 'not_found', 'Not found.')
  const base = { 'content-type': 'audio/mpeg', 'accept-ranges': 'bytes', 'cache-control': 'public, max-age=31536000, immutable' }
  const m = /^bytes=(\d*)-(\d*)$/u.exec(req.headers.range ?? '')
  if (m && (m[1] || m[2])) {
    const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]))
    const end = m[1] && m[2] ? Math.min(size - 1, Number(m[2])) : size - 1
    if (start > end || start >= size) {
      res.writeHead(416, { 'content-range': `bytes */${size}` })
      res.end()
      return
    }
    res.writeHead(206, { ...base, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1 })
    // pipeline closes the file on error or client abort; the callback keeps a read error from crashing the server.
    pipeline(createReadStream(path, { start, end }), res, () => {})
    return
  }
  res.writeHead(200, { ...base, 'content-length': size })
  pipeline(createReadStream(path), res, () => {})
}
