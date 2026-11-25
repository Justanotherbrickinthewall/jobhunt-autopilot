// Three ways to run `claude -p` on the candidate's own sign-in. claudeText is the locked spawn: built-in tools, MCP
// servers, plugins, hooks and Chrome are all off, nothing is kept, and the working folder is an empty temp folder.
// Ported from fde-roadmap's server/grade.ts. runAgent is the dashboard rerun, with tools and Chrome on and no
// permission prompts. runSendAgent is the dashboard send: the same Chrome, but an allow list and no bypass.
import { execFile, spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { HttpError } from './util.ts'

// The model is always named. Haiku files bookmarks, Sonnet writes crib sheets and Opus is an option for Learn grading.
export type Model = 'haiku' | 'sonnet' | 'opus'

const TIMEOUT_MS = 180_000
const LOGIN = /\b(?:log ?in|auth|authenticat\w*|authori[sz]\w*|credentials?|api key|401)\b/iu
const NOT_LOGGED_IN = 'claude is not signed in. Run `claude` in a terminal and sign in, then try again.'

function runClaude(prompt: string, cwd: string, model: Model): Promise<string> {
  const args = ['-p', '--output-format', 'json', '--model', model, '--tools', '', '--safe-mode', '--strict-mcp-config', '--no-chrome', '--no-session-persistence', '--disable-slash-commands']
  // Without a terminal the shell's claude wrapper runs plain claude with no CLAUDE_CONFIG_DIR, so this does the same.
  const env = { ...process.env }
  delete env.CLAUDE_CONFIG_DIR
  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new HttpError(504, 'timeout', 'claude took longer than 180 seconds and was stopped.'))
    }, TIMEOUT_MS)
    child.stdout.on('data', (d: Buffer) => { out += d.toString() })
    child.stderr.on('data', (d: Buffer) => { err += d.toString() })
    child.on('error', (e: NodeJS.ErrnoException) => {
      clearTimeout(timer)
      if (e.code === 'ENOENT') reject(new HttpError(503, 'claude_missing', 'The claude CLI is not on PATH. Install Claude Code and restart the server.'))
      else reject(new HttpError(500, 'spawn_failed', `Could not start claude: ${e.message}`))
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0 && !out.trim()) {
        const msg = (err || out).trim()
        if (LOGIN.test(msg)) return reject(new HttpError(401, 'not_logged_in', NOT_LOGGED_IN))
        return reject(new HttpError(502, 'claude_failed', `claude exited with code ${code}: ${msg.slice(-400)}`))
      }
      resolve(out)
    })
    child.stdin.on('error', () => { /* claude exited before reading the prompt; close reports it */ })
    child.stdin.end(prompt)
  })
}

// Runs one prompt and returns the reply text.
export async function claudeText(prompt: string, model: Model): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), 'hunt-board-claude-'))
  try {
    const stdout = await runClaude(prompt, cwd, model)
    let envelope: unknown
    try { envelope = JSON.parse(stdout) } catch {
      throw new HttpError(502, 'bad_envelope', `claude returned non-JSON output: ${stdout.slice(0, 200)}`)
    }
    if (Array.isArray(envelope)) envelope = envelope.find((e) => (e as { type?: unknown })?.type === 'result') ?? envelope[envelope.length - 1]
    const env = (envelope ?? {}) as { is_error?: unknown; result?: unknown }
    if (env.is_error) {
      const msg = String(env.result ?? 'unknown error')
      if (LOGIN.test(msg)) throw new HttpError(401, 'not_logged_in', NOT_LOGGED_IN)
      throw new HttpError(502, 'claude_error', msg.slice(0, 400))
    }
    return typeof env.result === 'string' ? env.result : ''
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
}

// The first JSON object in a reply, with any code fence stripped.
export function extractJson(text: string): unknown {
  let t = text.trim()
  const fence = /```(?:json)?\s*([\s\S]*?)```/iu.exec(t)
  if (fence) t = fence[1].trim()
  const first = t.indexOf('{')
  const last = t.lastIndexOf('}')
  if (first === -1 || last <= first) throw new Error('No JSON object in the reply.')
  return JSON.parse(t.slice(first, last + 1))
}

// The second spawn, for a dashboard rerun. Unlike claudeText it runs in the repo root with built-in tools, project
// agents, hooks and Chrome on, and it keeps its session. Nobody is at a terminal to approve a tool call, so it runs
// with --dangerously-skip-permissions; the rerun prompt and the repo's hooks bound what it does. It never throws: the
// caller reads the exit, the output and whether the time limit stopped it.
export type AgentRun = { code: number | null; stdout: string; stderr: string; timedOut: boolean }

export function killGroup(pid: number, sig: NodeJS.Signals): void {
  try { process.kill(-pid, sig) } catch { /* already gone */ }
}

// True while pid leads a claude process group. A pid kept across a reboot may belong to anything, so it is checked first.
function ownsGroup(pid: number): Promise<boolean> {
  return new Promise((resolve) => {
    execFile('ps', ['-o', 'pgid=,command=', '-p', String(pid)], (err, out) => resolve(!err && new RegExp(`^\\s*${pid}\\s+.*claude`, 'u').test(out)))
  })
}

// Stops a run that an earlier server left behind: SIGTERM, then SIGKILL after 10 seconds.
export async function stopOrphan(pid: number): Promise<void> {
  if (!(await ownsGroup(pid))) return
  killGroup(pid, 'SIGTERM')
  for (let i = 0; i < 50 && await ownsGroup(pid); i++) await new Promise((r) => setTimeout(r, 200))
  if (await ownsGroup(pid)) killGroup(pid, 'SIGKILL')
}

// onStart gets the child's pid, so the caller can keep it for a restart.
export function runAgent(prompt: string, cwd: string, model: Model, timeoutMs: number, onStart?: (pid: number) => void): Promise<AgentRun> {
  return spawnClaude(['-p', '--output-format', 'json', '--model', model, '--chrome', '--dangerously-skip-permissions'], prompt, cwd, timeoutMs, onStart)
}

// The dashboard send: no bypass. Anything not listed is refused without a prompt. Project settings only, so the
// user-level and settings.local.json allow lists (git, python, Gmail send) do not apply.
export function runSendAgent(prompt: string, session: string, thread: string, cwd: string, model: Model, timeoutMs: number, onStart?: (pid: number) => void): Promise<AgentRun> {
  // check and record are pinned to the one thread; stop takes only a reason. The file_upload path is not a Read.
  const eng = (sub: string) => `Bash(node process/engine.ts --session ${session} outreach ${sub} *)`
  const pin = (sub: string) => `Bash(node process/engine.ts --session ${session} outreach ${sub} --thread ${thread} *)`
  const chrome = ['select_browser', 'tabs_context_mcp', 'tabs_create_mcp', 'navigate', 'computer', 'find', 'read_page', 'get_page_text', 'form_input', 'javascript_tool', 'file_upload'].map((t) => `mcp__claude-in-chrome__${t}`)
  const allowed = ['Read(./.claude/agents/**)', 'Read(./process/**)', `Read(./${session}/**)`, 'ToolSearch', pin('check'), pin('record'), eng('stop'), ...chrome]
  return spawnClaude(['-p', '--output-format', 'json', '--model', model, '--chrome', '--permission-mode', 'dontAsk', '--setting-sources', 'project', '--allowedTools', allowed.join(',')], prompt, cwd, timeoutMs, onStart)
}

function spawnClaude(args: string[], prompt: string, cwd: string, timeoutMs: number, onStart?: (pid: number) => void): Promise<AgentRun> {
  const env = { ...process.env }
  delete env.CLAUDE_CONFIG_DIR
  return new Promise((resolve) => {
    // Its own process group, so the time limit stops the subagents and MCP servers it starts as well.
    const child = spawn('claude', args, { cwd, env, detached: true, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const kill = (sig: NodeJS.Signals) => { if (child.pid) killGroup(child.pid, sig) }
    if (child.pid) onStart?.(child.pid)
    const timer = setTimeout(() => {
      timedOut = true
      kill('SIGTERM')
      setTimeout(() => kill('SIGKILL'), 10_000).unref()
    }, timeoutMs)
    child.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: null, stdout, stderr: `${stderr}${e.message}`, timedOut }) })
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr, timedOut }) })
    child.stdin.on('error', () => { /* claude exited before reading the prompt; close reports it */ })
    child.stdin.end(prompt)
  })
}

// The result text of a `claude -p --output-format json` reply, or '' when there is none.
export function resultText(stdout: string): string {
  try {
    let envelope: unknown = JSON.parse(stdout)
    if (Array.isArray(envelope)) envelope = envelope.find((e) => (e as { type?: unknown })?.type === 'result') ?? envelope[envelope.length - 1]
    const r = (envelope as { result?: unknown } | null)?.result
    return typeof r === 'string' ? r : ''
  } catch { return '' }
}
