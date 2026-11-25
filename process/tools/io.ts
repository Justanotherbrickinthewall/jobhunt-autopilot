import { randomBytes } from 'node:crypto'
import { closeSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { decodeStrict } from '../lib/py.ts'

export type Out = (s: string) => void
export const stdout: Out = (s) => { process.stdout.write(s) }

// SystemExit. A string message goes to stderr with exit 1; a number is the exit code.
export class Exit extends Error {
  code: number | string
  constructor(code: number | string) {
    super(typeof code === 'string' ? code : `exit ${code}`)
    this.code = code
  }
}

export function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

// os.replace(tmp, path) after writing tmp.
export function writeAtomic(path: string, text: string, tmp = path + '.tmp'): void {
  const mine = `${tmp}.${process.pid}`   // a per-process name, so two writers never share a temp file
  writeFileSync(mine, text, 'utf8')
  renameSync(mine, path)
}

// Path.read_text(encoding='utf-8'): strict UTF-8 and universal newlines. Throws on any error,
// a Node error for an unreadable file and a PyExc for bad UTF-8.
export function readText(path: string): string {
  return decodeStrict(readFileSync(path)).replace(/\r\n?/gu, '\n')
}

// Replaces fcntl.flock(LOCK_EX). Touches lockPath as Python's open(path, 'a') does,
// then holds a sibling '<lockPath>.d' directory, which mkdir creates atomically.
// The holder writes '<pid> <token>' into '<lockPath>.d/pid', the token being random per holder. A waiter breaks the
// lock when that process no longer exists, or when there is no pid file and the directory is over 120 s old.
function holderDead(dir: string): boolean {
  let raw: string | null = null
  try { raw = readFileSync(dir + '/pid', 'utf8') } catch { /* no pid file yet */ }
  const pid = Number(raw?.trim().split(/\s+/u)[0])
  if (!Number.isInteger(pid) || pid <= 0) return Date.now() - statSync(dir).mtimeMs > 120_000
  try { process.kill(pid, 0); return false } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'ESRCH'
  }
}

const tokenOf = (dir: string): string | null => {
  try { return readFileSync(dir + '/pid', 'utf8').trim().split(/\s+/u)[1] ?? '' } catch { return null }
}

// Breaks a dead lock by renaming it, which only one waiter can win. The winner removes the folder only when it
// still holds the token it judged dead. Otherwise another process took the lock in between, so it goes back.
function breakDead(dir: string): void {
  const dead = tokenOf(dir)
  if (!holderDead(dir)) return
  const moved = `${dir}.stale.${process.pid}.${Date.now()}`
  try { renameSync(dir, moved) } catch { return }   // another waiter broke it, or the holder released it
  if (tokenOf(moved) === dead) rmSync(moved, { recursive: true, force: true })
  else try { renameSync(moved, dir) } catch { /* a new holder already made the folder; leave the stale copy */ }
}

export function withLock<T>(lockPath: string, fn: () => T): T {
  closeSync(openSync(lockPath, 'a'))
  const dir = lockPath + '.d'
  for (;;) {
    try { mkdirSync(dir); break } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e
      try { breakDead(dir) } catch { /* the holder released it between calls */ }
      sleepSync(50)
    }
  }
  const token = randomBytes(8).toString('hex')
  try {
    writeFileSync(dir + '/pid', `${process.pid} ${token}`)
    return fn()
  } finally {
    if (tokenOf(dir) === token) rmSync(dir, { recursive: true, force: true })
  }
}
