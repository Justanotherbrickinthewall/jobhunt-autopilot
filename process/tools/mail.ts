// Reads and sends the candidate's Gmail through Google's API, with no connector and no browser.
//
//     node process/engine.ts mail login <client.json>       sign in once; the candidate runs it
//     node process/engine.ts mail status                    print the signed-in address
//     node process/engine.ts mail search '<query>' [--max N]
//     node process/engine.ts mail thread <threadId>
//     node process/engine.ts mail attachment <messageId> --out <dir>
//     node process/engine.ts --session R mail send --item <n> [--dry-run]
//
// The sign-in lives in the macOS Keychain, never in the repo. `send` takes its recipient, subject,
// text and attachment only from an item `outreach approve` wrote, so nothing unapproved can go out.
import { execFileSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { basename, isAbsolute, join } from 'node:path'
import type { Out } from './io.ts'
import * as profiles from './profiles.ts'

const USAGE = `usage: engine.ts mail login <client.json>
       engine.ts mail status
       engine.ts mail search '<query>' [--max N]
       engine.ts mail thread <threadId>
       engine.ts mail attachment <messageId> --out <dir>
       engine.ts --session R mail send --item <n> [--dry-run]

login takes the OAuth client file Google lets you download (a Desktop app client), opens the consent
page and stores the sign-in in the macOS Keychain. The candidate runs it, once.
status prints the signed-in address, or exits 2 with what is missing.
search takes a Gmail search query and prints one line per thread: id | date | from | subject | messages.
thread prints one thread as markdown: each message's sender, date, text and attachment names.
attachment saves every attachment of one message into <dir> (created if missing), prints "saved <path> <bytes>"
per file or "no attachments", and never overwrites a file.
send sends item <n> of R/.stage/outreach/approved.json, which must be an email item. A gmail:<threadId>
item goes out as a reply in that thread, and an email:<address> item as a new message. It prints
"sent id <id> thread <threadId>". --dry-run prints the message it would send and sends nothing.
Exit 2 means nothing was sent.
`

const SERVICE = 'jobhunt-gmail'
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send'
const API = 'https://gmail.googleapis.com/gmail/v1/users/me'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const LOGIN_HINT = 'run `node process/engine.ts mail login <client.json>`'

class MailError extends Error {}

interface Saved { client_id: string; client_secret: string; refresh_token: string }
interface Header { name: string; value: string }
interface Part { mimeType?: string; filename?: string; headers?: Header[]; body?: { data?: string; attachmentId?: string }; parts?: Part[] }
interface Message { id: string; threadId: string; payload?: Part }
interface Thread { id: string; messages?: Message[] }

const b64url = (b: Buffer): string => b.toString('base64url')

function saved(): Saved {
  let raw: string
  try {
    raw = execFileSync('security', ['find-generic-password', '-s', SERVICE, '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch { throw new MailError(`no Gmail sign-in is stored: ${LOGIN_HINT}`) }
  try { return JSON.parse(raw) as Saved } catch { throw new MailError(`the stored Gmail sign-in is unreadable: ${LOGIN_HINT}`) }
}

async function tokenCall(form: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(TOKEN_URL, { method: 'POST', body: new URLSearchParams(form) })
  const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as Record<string, unknown>
  if (body['error'] === 'invalid_grant') throw new MailError(`the Gmail sign-in has expired or was revoked: ${LOGIN_HINT}`)
  if (!res.ok) throw new MailError(`Google refused the sign-in: ${String(body['error'])} ${String(body['error_description'] ?? '')}`)
  return body
}

async function accessToken(): Promise<string> {
  const s = saved()
  const body = await tokenCall({ grant_type: 'refresh_token', refresh_token: s.refresh_token, client_id: s.client_id, client_secret: s.client_secret })
  return String(body['access_token'])
}

async function api<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API + path, { ...init, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' } })
  if (!res.ok) throw new MailError(`Gmail answered ${res.status} for ${path.split('?')[0]}: ${(await res.text()).slice(0, 300)}`)
  return await res.json() as T
}

const header = (m: Message | Part | undefined, name: string): string => {
  const hs = (m && 'payload' in m ? m.payload?.headers : (m as Part | undefined)?.headers) ?? []
  return hs.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}
// "Name <a@b.c>" or "a@b.c" -> a@b.c, lower case.
const address = (s: string): string => (/<([^>]+)>/u.exec(s)?.[1] ?? s).trim().toLowerCase()
const bareSubject = (s: string): string => s.replace(/^(\s*(re|fwd?)\s*:\s*)+/iu, '').trim().toLowerCase()

// ---- reading --------------------------------------------------------------------------------

function decode(p: Part): string {
  // shortcut: Gmail keeps a very large body apart from the message; say so rather than read it as blank, and fetch it if this ever shows.
  if (!p.body?.data) return '(this part is too large to read inline and was not fetched)'
  const charset = /charset="?([^";\s]+)/iu.exec(header(p, 'content-type'))?.[1] ?? 'utf-8'
  const bytes = Buffer.from(p.body?.data ?? '', 'base64url')
  try { return new TextDecoder(charset).decode(bytes) } catch { return bytes.toString('utf8') }
}

// shortcut: a crude tag strip for mail that has no plain-text part; swap in a real HTML parser if a thread reads badly.
function htmlToText(html: string): string {
  return html.replace(/<(style|script)[\s\S]*?<\/\1>/giu, '').replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/giu, '\n').replace(/<[^>]+>/gu, '')
    .replace(/&nbsp;/gu, ' ').replace(/&lt;/gu, '<').replace(/&gt;/gu, '>').replace(/&quot;/gu, '"').replace(/&#(\d+);/gu, (_, n: string) => String.fromCodePoint(Number(n))).replace(/&amp;/gu, '&')
}

function walk(p: Part | undefined, found: { plain: string[]; html: string[]; files: string[] }): void {
  if (!p) return
  if (p.filename) found.files.push(p.filename)
  else if (p.mimeType === 'text/plain') found.plain.push(decode(p))
  else if (p.mimeType === 'text/html') found.html.push(decode(p))
  for (const child of p.parts ?? []) walk(child, found)
}

function threadMarkdown(t: Thread): string {
  const msgs = t.messages ?? []
  const lines = [`# ${header(msgs[0], 'subject') || '(no subject)'}`, '', `thread: ${t.id}`]
  for (const m of msgs) {
    const found = { plain: [] as string[], html: [] as string[], files: [] as string[] }
    walk(m.payload, found)
    const text = found.plain.length ? found.plain.join('\n') : htmlToText(found.html.join('\n'))
    // Quoted lines repeat an earlier message of the same thread, so they are dropped.
    const body = text.replace(/\r/gu, '').split('\n').filter((l) => !l.startsWith('>')).join('\n').replace(/\n{3,}/gu, '\n\n').trim()
    lines.push('', `## ${header(m, 'from')} | ${header(m, 'date')}`, `to: ${header(m, 'to')}`, `message: ${m.id}`, '', body)
    if (found.files.length) lines.push('', `attachments: ${found.files.join(', ')}`)
  }
  return lines.join('\n') + '\n'
}

async function search(query: string, max: number, out: Out): Promise<void> {
  const token = await accessToken()
  const list = await api<{ threads?: { id: string }[] }>(token, `/threads?maxResults=${max}&q=${encodeURIComponent(query)}`)
  for (const { id } of list.threads ?? []) {
    const t = await api<Thread>(token, `/threads/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`)
    const msgs = t.messages ?? []
    const last = msgs[msgs.length - 1]
    out(`${id} | ${header(last, 'date')} | ${header(last, 'from')} | ${header(msgs[0], 'subject')} | ${msgs.length}\n`)
  }
  if (!list.threads?.length) out('no threads\n')
}

async function attachment(id: string, dir: string, out: Out): Promise<void> {
  const token = await accessToken()
  const msg = await api<Message>(token, `/messages/${id}?format=full`)
  const parts: Part[] = []
  const collect = (p: Part | undefined): void => { if (!p) return; if (p.filename && p.body?.attachmentId) parts.push(p); (p.parts ?? []).forEach(collect) }
  collect(msg.payload)
  if (!parts.length) { out('no attachments\n'); return }
  mkdirSync(dir, { recursive: true })
  for (const p of parts) {
    const name = basename((p.filename ?? '').replace(/\\/gu, '/'))   // a hostile name cannot leave <dir>
    if (!name || name.startsWith('.')) throw new MailError(`refusing the attachment name "${p.filename}"`)
    const file = join(dir, name)
    if (existsSync(file)) throw new MailError(`${file} already exists; nothing was overwritten`)
    const data = await api<{ data: string }>(token, `/messages/${id}/attachments/${p.body?.attachmentId}`)
    const bytes = Buffer.from(data.data, 'base64url')
    writeFileSync(file, bytes)
    out(`saved ${file} ${bytes.length}\n`)
  }
}

// ---- sending --------------------------------------------------------------------------------

interface Item { n: number; thread_id: string; channel: string; subject: string; to: string; attach: string; text_file: string }

function approvedItem(n: number): Item {
  const session = (process.env['JOBHUNT_SESSION'] ?? '').trim()
  if (!session) throw new MailError('send needs the global --session flag')
  let data: { send?: Item[] }
  try { data = JSON.parse(readFileSync(join(session, '.stage', 'outreach', 'approved.json'), 'utf8')) as { send?: Item[] } } catch {
    throw new MailError('this run has no approved.json, so nothing is approved to send')
  }
  const item = (data.send ?? []).find((i) => i.n === n)
  if (!item) throw new MailError(`item ${n} is not among the approved items of this run`)
  if (item.channel !== 'email') throw new MailError(`item ${n} is a ${item.channel} item, not an email`)
  if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/u.test(item.to)) throw new MailError(`item ${n} has no single valid "to" address`)
  if (!item.subject.trim() || /[\r\n]/u.test(item.subject)) throw new MailError(`item ${n} has no one-line subject`)
  if (item.thread_id.startsWith('email:') && item.thread_id.slice(6).toLowerCase() !== item.to.toLowerCase()) {
    throw new MailError(`THREAD MISMATCH: item ${n} is for ${item.thread_id.slice(6)} but its "to" is ${item.to}`)
  }
  if (!item.thread_id.startsWith('email:') && !item.thread_id.startsWith('gmail:')) throw new MailError(`item ${n} has thread id ${item.thread_id}, which is not an email thread`)
  return item
}

const fromRepo = (p: string): string => (isAbsolute(p) ? p : join(profiles.REPO, p))
const wrap76 = (b: Buffer): string => (b.toString('base64').match(/.{1,76}/gu) ?? []).join('\r\n')
// A non-ASCII subject goes out as encoded words of 10 characters each, so none passes the 75-character limit.
function encodedWord(s: string): string {
  if (/^[\x20-\x7e]*$/u.test(s)) return s
  const chars = Array.from(s)
  const words: string[] = []
  for (let i = 0; i < chars.length; i += 10) words.push(`=?UTF-8?B?${Buffer.from(chars.slice(i, i + 10).join(''), 'utf8').toString('base64')}?=`)
  return words.join('\r\n ')
}
function fileOf(item: Item, key: 'text_file' | 'attach'): Buffer {
  try { return readFileSync(fromRepo(item[key])) } catch { throw new MailError(`item ${item.n}: cannot read its ${key}, ${item[key]}`) }
}
const MIME_TYPES: Record<string, string> = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', txt: 'text/plain' }

function mime(item: Item, reply: { inReplyTo: string; references: string } | null): string {
  const text = fileOf(item, 'text_file').toString('utf8')
  if (!text.trim()) throw new MailError(`item ${item.n} has an empty text file`)
  const head = [`To: ${item.to}`, `Subject: ${encodedWord(item.subject)}`, 'MIME-Version: 1.0']
  if (reply) head.push(`In-Reply-To: ${reply.inReplyTo}`, `References: ${reply.references}`)
  const textPart = ['Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', wrap76(Buffer.from(text, 'utf8'))]
  if (!item.attach) return [...head, ...textPart].join('\r\n')
  const file = fileOf(item, 'attach')   // stops when the file is missing, so a "here is my resume" mail never goes without it
  const name = basename(item.attach)
  if (!/^[\x20-\x7e]+$/u.test(name) || /["\\]/u.test(name)) throw new MailError(`item ${item.n}: the attachment's file name must be plain ASCII with no quote or backslash`)
  const type = MIME_TYPES[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream'
  const boundary = `jobhunt-${randomBytes(12).toString('hex')}`
  return [...head, `Content-Type: multipart/mixed; boundary="${boundary}"`, '',
    `--${boundary}`, ...textPart,
    `--${boundary}`, `Content-Type: ${type}; name="${name}"`, 'Content-Transfer-Encoding: base64', `Content-Disposition: attachment; filename="${name}"`, '', wrap76(file),
    `--${boundary}--`].join('\r\n')
}

async function send(n: number, dryRun: boolean, out: Out): Promise<void> {
  const item = approvedItem(n)
  let reply: { inReplyTo: string; references: string } | null = null
  let threadId: string | undefined
  let token = ''
  if (item.thread_id.startsWith('gmail:')) {
    threadId = item.thread_id.slice(6)
    token = await accessToken()
    const t = await api<Thread>(token, `/threads/${threadId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Message-ID&metadataHeaders=References`)
    const msgs = t.messages ?? []
    // The reply must go to someone who wrote in this thread, under this thread's subject.
    if (!msgs.some((m) => address(header(m, 'from')) === item.to.toLowerCase())) throw new MailError(`THREAD MISMATCH: ${item.to} wrote no message in thread ${threadId}`)
    if (bareSubject(header(msgs[0], 'subject')) !== bareSubject(item.subject)) throw new MailError(`THREAD MISMATCH: thread ${threadId} has the subject "${header(msgs[0], 'subject')}"`)
    const last = msgs[msgs.length - 1]
    const id = header(last, 'message-id')
    if (id) reply = { inReplyTo: id, references: `${header(last, 'references')} ${id}`.trim() }
  }
  const raw = mime(item, reply)
  if (dryRun) {
    out(`dry run, nothing sent. ${Buffer.byteLength(raw)} bytes${threadId ? `, reply in thread ${threadId}` : ', new message'}\n`)
    out(raw.split('\r\n').map((l) => (l.length > 100 ? `${l.slice(0, 100)}...` : l)).slice(0, 30).join('\n') + '\n')
    return
  }
  // shortcut: the whole message goes in one JSON body, which is fine for a resume; move to Gmail's upload endpoint for files of several MB.
  token ||= await accessToken()
  const sent = await api<Message>(token, '/messages/send', { method: 'POST', body: JSON.stringify({ raw: b64url(Buffer.from(raw, 'utf8')), threadId }) })
  out(`sent id ${sent.id} thread ${sent.threadId}\n`)
}

// ---- sign-in --------------------------------------------------------------------------------

async function login(clientFile: string, out: Out): Promise<void> {
  let client: { client_id?: string; client_secret?: string }
  try {
    const data = JSON.parse(readFileSync(clientFile, 'utf8')) as { installed?: typeof client; web?: unknown }
    if (!data.installed) throw new MailError(data.web ? 'that file is a Web application client; create a Desktop app client instead' : 'that file is not a Google OAuth client file')
    client = data.installed
  } catch (e) {
    if (e instanceof MailError) throw e
    throw new MailError(`cannot read ${clientFile}`)
  }
  if (!client.client_id || !client.client_secret) throw new MailError('the client file has no client_id or client_secret')
  const mailbox = profiles.local('mailbox')
  const state = b64url(randomBytes(16))
  const verifier = b64url(randomBytes(32))
  const code = await new Promise<{ code: string; redirect: string }>((resolve, reject) => {
    let redirect = ''
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      // Only Google's own redirect ends the wait; a stray request is ignored.
      if (url.pathname !== '/' || !(url.searchParams.has('code') || url.searchParams.has('error'))) { res.writeHead(404).end(); return }
      const ok = url.searchParams.get('state') === state && url.searchParams.get('code')
      res.writeHead(200, { 'content-type': 'text/plain' }).end(ok ? 'Google has answered. Close this tab and read the result in the terminal.' : 'Sign-in failed. Go back to the terminal.')
      server.close()
      if (ok) resolve({ code: url.searchParams.get('code') ?? '', redirect })
      else reject(new MailError(`Google returned no code: ${url.searchParams.get('error') ?? 'state mismatch'}`))
    })
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      redirect = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
      const q = new URLSearchParams({
        client_id: client.client_id ?? '', redirect_uri: redirect, response_type: 'code', scope: SCOPES, state,
        access_type: 'offline', prompt: 'consent', code_challenge_method: 'S256',
        code_challenge: b64url(createHash('sha256').update(verifier).digest()),
        ...(mailbox ? { login_hint: mailbox } : {}),
      })
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${q.toString()}`
      out(`Open this page and allow access, if it does not open by itself:\n${authUrl}\n`)
      try { execFileSync('open', [authUrl], { stdio: 'ignore' }) } catch { /* the printed link is enough */ }
    })
    setTimeout(() => { server.close(); reject(new MailError('no answer from Google in 5 minutes')) }, 300_000).unref()
  })
  const tokens = await tokenCall({
    grant_type: 'authorization_code', code: code.code, redirect_uri: code.redirect, code_verifier: verifier,
    client_id: client.client_id, client_secret: client.client_secret,
  })
  if (!tokens['refresh_token']) throw new MailError('Google gave no refresh token; remove the app at myaccount.google.com/permissions and run login again')
  const profile = await api<{ emailAddress: string }>(String(tokens['access_token']), '/profile')
  if (mailbox && profile.emailAddress.toLowerCase() !== mailbox.toLowerCase()) {
    throw new MailError(`signed in as ${profile.emailAddress}, but process/local.json names another mailbox. Nothing was stored`)
  }
  const value: Saved = { client_id: client.client_id, client_secret: client.client_secret, refresh_token: String(tokens['refresh_token']) }
  // shortcut: the value passes through this process's argument list for a moment; fine on a one-user Mac.
  // The catch drops Node's own error, whose text would repeat the command line and so the secret.
  try { execFileSync('security', ['add-generic-password', '-U', '-a', 'oauth', '-s', SERVICE, '-w', JSON.stringify(value)], { stdio: 'ignore' }) } catch {
    throw new MailError('could not write the sign-in to the Keychain. Nothing was stored')
  }
  out(`signed in as ${profile.emailAddress}. The sign-in is in the Keychain as "${SERVICE}". You can delete ${basename(clientFile)}.\n`)
}

export async function main(argv: string[], out: Out = (s) => { process.stdout.write(s) }): Promise<number> {
  if (!argv.length || argv.some((a) => a === '-h' || a === '--help')) { out(USAGE); return argv.length ? 0 : 2 }
  const [cmd, ...rest] = argv
  try {
    if (cmd === 'login' && rest.length === 1) await login(rest[0], out)
    else if (cmd === 'status' && !rest.length) {
      const profile = await api<{ emailAddress: string }>(await accessToken(), '/profile')
      out(`signed in as ${profile.emailAddress}\n`)
    } else if (cmd === 'search' && (rest.length === 1 || (rest.length === 3 && rest[1] === '--max' && /^\d+$/u.test(rest[2])))) {
      await search(rest[0], rest.length === 3 ? Math.min(Number(rest[2]), 100) : 25, out)
    } else if (cmd === 'thread' && rest.length === 1 && /^[0-9a-f]+$/iu.test(rest[0])) {
      out(threadMarkdown(await api<Thread>(await accessToken(), `/threads/${rest[0]}?format=full`)))
    } else if (cmd === 'attachment' && rest.length === 3 && rest[1] === '--out' && /^[0-9a-f]+$/iu.test(rest[0])) {
      await attachment(rest[0], rest[2], out)
    } else if (cmd === 'send' && rest[0] === '--item' && /^\d+$/u.test(rest[1] ?? '') && (rest.length === 2 || (rest.length === 3 && rest[2] === '--dry-run'))) {
      await send(Number(rest[1]), rest.length === 3, out)
    } else throw new MailError('expected login, status, search, thread, attachment or send, as the usage says')
    return 0
  } catch (e) {
    const offline = e instanceof TypeError && e.message === 'fetch failed'
    if (!(e instanceof MailError) && !offline) throw e
    process.stderr.write(`engine.ts mail: ${offline ? 'cannot reach Google' : (e as Error).message}\n`)
    return 2
  }
}
