// LinkedIn messaging without the messenger and inbox-reader browser work: code sends a reply in an existing thread or a connection
// request with a note, and reads the inbox into files. It uses the Easy Apply script's signed-in Chrome profile, headless.
// `send` is a dry run unless --press. First messages, InMails and email items are not its job: it answers route fallback for them.
// Every selector the runner does not name is a guess. Each is marked GUESS, so a first live run that fails points at it.
import { cpus, tmpdir } from 'node:os'
import { existsSync, mkdirSync, readFileSync, readlinkSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { chromium, type Locator, type Page } from 'playwright-core'
import * as C from '../constants.ts'
import { engine, linkedinClear } from './ea-apply.ts'

const PROFILE = join(C.REPO, '.playwright/linkedin')
const BASE = 'https://www.linkedin.com'
const OVERALL_MS = 1_200_000 // the parent runs the script in the background, so the only limit is a hang; typing 3000 characters takes about 12 minutes
const TEXT_MAX = 3000 // at the typing pace below, 3000 characters take about 12 minutes
const THREADS_MAX = 40

// shortcut: copied from ea-apply.ts, move to a shared module when a fourth script needs it
function launch(headless: boolean) {
  let executablePath: string | undefined
  if (process.platform === 'darwin' && process.arch === 'x64' && cpus()[0]?.model.startsWith('Apple')) {
    executablePath = join(tmpdir(), 'li-msg-chrome-arm64.sh')
    writeFileSync(executablePath, '#!/bin/sh\nexec /usr/bin/arch -arm64 "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" "$@"\n', { mode: 0o755 })
  }
  return chromium.launchPersistentContext(PROFILE, {
    ...(executablePath ? { executablePath } : { channel: 'chrome' }),
    headless,
    viewport: headless ? { width: 1400, height: 1000 } : null,
    // shortcut: pins Chrome 158's string to hide "HeadlessChrome", update it when Chrome updates.
    userAgent: headless ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36' : undefined,
    args: ['--disable-blink-features=AutomationControlled'],
  })
}

// Chrome keeps SingletonLock in the profile folder as a link to `<host>-<pid>`. A live pid means ea-apply (or another script) holds the profile.
function profileBusy(): boolean {
  try {
    const pid = Number(/-(\d+)$/u.exec(readlinkSync(join(PROFILE, 'SingletonLock')))?.[1])
    if (!pid) return false
    process.kill(pid, 0)
    return true
  } catch { return false }
}

// kind: fallback means nothing was clicked that could send, so the messenger may take the item. stopped means a Send click went
// out and the result is unconfirmed, so nothing may send it again.
type Kind = 'fallback' | 'security' | 'signedout' | 'stopped'
class Stop extends Error {
  kind: Kind
  constructor(msg: string, kind: Kind = 'fallback') { super(msg); this.kind = kind }
}
const settle = <T>(p: Promise<T>, ms: number): Promise<T | 'PENDING'> => Promise.race([p, new Promise<'PENDING'>((r) => setTimeout(() => r('PENDING'), ms))])
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const between = (a: number, b: number) => a + Math.random() * (b - a)
const first = (s: string) => s.split('\n')[0]
const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/gu, '').toLowerCase().replace(/\s+/gu, ' ').trim()

// shortcut: copied from ea-apply.ts, move to a shared module when a fourth script needs it
type Wall = 'security' | 'signedout'
async function wall(p: Page): Promise<Wall | null> {
  const path = new URL(p.url()).pathname
  if (/^\/checkpoint/.test(path)) return 'security'
  if (/^\/(login|uas|authwall)/.test(path)) return 'signedout'
  // visible only: on 26 Nov a messaging page with no challenge tripped this three times, likely on hidden captcha scaffolding
  if (await p.locator('iframe[src*="captcha" i]:visible, [id*="captcha" i]:visible').count().catch(() => 0)) { wallWhy = 'a visible captcha element'; return 'security' }
  const re = /security verification|security check|captcha|verify you.re human|account (is )?restricted|unusual activity/i
  // not a dialog with its own fields: the invitation dialog's note box may hold anything
  const dialogs = (await p.getByRole('dialog').filter({ hasNot: p.locator('input, select, textarea') }).allInnerTexts().catch(() => [])).join(' ').slice(0, 3000)
  const head = (await p.title().catch(() => '')) + ' ' + (await p.locator('h1').allInnerTexts().catch(() => [])).join(' ')
  const hit = re.exec(dialogs + ' ' + head)
  if (hit) wallWhy = `the words "${hit[0]}" in a dialog or heading`
  return hit ? 'security' : null
}
let wallWhy = ''
async function checkWall(p: Page) {
  const w = await wall(p)
  if (!w) return
  const path = new URL(p.url()).pathname
  if (w === 'signedout') throw new Stop('SIGNED OUT at ' + path, 'signedout')
  throw new Stop(`SECURITY STOP: ${path}${wallWhy ? ', ' + wallWhy : ''}`, 'security')
}

// shortcut: copied from ea-apply.ts, move to a shared module when a fourth script needs it
// A real mouse click at the control's centre. It checks the page for a wall afterwards.
async function press(page: Page, el: Locator) {
  await el.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {})
  const b = await el.boundingBox({ timeout: 10_000 })
  if (!b) throw new Stop('control not visible')
  await settle(page.mouse.click(b.x + b.width / 2, b.y + b.height / 2), 10_000)
  await checkWall(page)
}

// What a selector that found nothing looked like, so the next edit has something to go on. Message bodies are cut to 150 characters.
async function missSample(page: Page, diag: string[], what: string) {
  if (diag.length >= 3) return
  const buttons = (await page.getByRole('button').evaluateAll((els) => els.slice(0, 15).map((e) => (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30))).catch(() => [] as string[])).filter(Boolean)
  const main = ((await page.locator('main').first().innerText({ timeout: 3000 }).catch(() => '')) as string).replace(/\s+/gu, ' ').slice(0, 150)
  diag.push(`${what} | ${new URL(page.url()).pathname} | buttons: ${buttons.join(' / ')} | main: ${main}`)
}

// ---- typing -------------------------------------------------------------------------------------------------------
// A person's pace: 120 to 300 ms a key, a short stop after a word now and then, a longer one after a sentence. Never Enter: a newline is insertParagraph, and
// LinkedIn may send on Enter. In a textarea (the invitation note) a newline is inserted as text.
async function typeHuman(page: Page, box: Locator, text: string, textarea: boolean) {
  await box.click({ timeout: 5000 })
  await sleep(between(300, 800))
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (i) { if (textarea) await page.keyboard.insertText('\n'); else await page.evaluate(() => document.execCommand('insertParagraph')) }
    for (const ch of lines[i]) {
      await page.keyboard.type(ch)
      await sleep(between(120, 300))
      if (ch === ' ' && Math.random() < 0.2) await sleep(between(300, 900))
      if (/[.!?]/u.test(ch) && Math.random() < 0.3) await sleep(between(500, 1500))
    }
  }
}
const boxText = async (box: Locator): Promise<string> => (await box.evaluate((el) => {
  if (el instanceof HTMLTextAreaElement) return el.value
  const ps = [...el.querySelectorAll('p')]
  return ps.length ? ps.map((p) => p.textContent ?? '').join('\n') : (el as HTMLElement).innerText
}).catch(() => '')).trim()
async function clearBox(page: Page, box: Locator) {
  await box.click({ timeout: 5000 }).catch(() => {})
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
  await page.keyboard.press('Backspace')
}

// ---- the item ------------------------------------------------------------------------------------------------------
type Sent = { n: number; thread_id: string; vanity: string; post_url: string; role_id?: string; channel: string; subject?: string; name: string; company: string; to?: string; attach?: string; text_file: string }
type Outcome = 'sent' | 'dry' | 'fallback' | 'security' | 'stopped'
type Result = {
  item: string; n: number; run: string; channel: string; outcome: Outcome; route: 'script' | 'fallback'; reason: string; dry_run: boolean
  thread_id: string; chars: number; attach: string; pressed: boolean; confirmed: boolean; recorded: boolean; seconds: number; at: string
  notes: string[]; miss_sample: string[]
}

const stageOf = (R: string) => join(resolve(C.REPO, R), C.STAGE_DIR, C.OUTREACH_STAGE)

// The candidate's send word is logged by `outreach log "approval: ..."` before approve runs, and the item is in approved.json only because the
// decision line chose it. A reply needs both, as R10's reply loop says. A prospect connect needs neither, because rule 9 clears it.
function approvalLogged(R: string): boolean {
  const notes = readFileSync(join(resolve(C.REPO, R), 'notes.md'), 'utf8')
  const log = notes.split(/^## Log$/mu)[1]?.split(/^## /mu)[0] ?? ''
  return /^- .*\sapproval:\s*\S/mu.test(log)
}

async function send(arg: string, R: string, pressIt: boolean): Promise<number> {
  const t0 = Date.now()
  const n = Number(/^(\d+)(\.\w+)?$/u.exec(basename(arg))?.[1])
  if (!n || !R) { console.error('usage: li-msg.ts send <item-file or number> --run <run folder> [--press]'); return 2 }
  const dir = stageOf(R)
  const resPath = join(dir, 'send', `${n}.result.json`)
  const markPath = join(dir, 'send', `${n}.pressed`)
  const res: Result = { item: String(n), n, run: R, channel: '', outcome: 'fallback', route: 'fallback', reason: '', dry_run: !pressIt, thread_id: '', chars: 0, attach: '',
    pressed: false, confirmed: false, recorded: false, seconds: 0, at: '', notes: [], miss_sample: [] }
  let exit = 0, secReason = ''
  let overall: ReturnType<typeof setTimeout> | undefined
  const fin = (): number => {
    clearTimeout(overall)
    if (res.pressed && res.outcome !== 'sent') res.outcome = 'stopped' // after a click that can send, nothing else is true
    res.seconds = +((Date.now() - t0) / 1000).toFixed(1); res.at = new Date().toISOString()
    res.route = res.outcome === 'fallback' ? 'fallback' : 'script'
    try { mkdirSync(join(dir, 'send'), { recursive: true }); writeFileSync(resPath, JSON.stringify(res, null, 1) + '\n') } catch (e) { console.error('result not written: ' + (e as Error).message) }
    console.log(`LM-RESULT ${res.outcome} ${n} ${res.reason || 'ok'}`)
    return exit
  }
  const fb = (reason: string, code = 0): number => { res.outcome = 'fallback'; res.reason = reason; exit = code; return fin() }
  // The marker is written before the first click that can send. Once it exists the item is never fallback and never pressed again.
  const mark = () => { if (closing) throw new Stop('Chrome is closing, no click was made'); mkdirSync(join(dir, 'send'), { recursive: true }); writeFileSync(markPath, new Date().toISOString() + '\n'); res.pressed = true }
  // After a click that can send, every ending is sent or stopped. A wall keeps its exit code and its cooldown.
  const wrap = (s: Stop) => {
    if (s.kind === 'security') secReason = s.message
    if (res.pressed) { res.outcome = 'stopped'; res.reason = `STOPPED: a click that can send went out, then ${s.message}` }
    else { res.outcome = s.kind === 'signedout' ? 'fallback' : s.kind; res.reason = s.message }
    exit = s.kind === 'security' ? 4 : s.kind === 'signedout' ? 5 : 0
  }
  // The cooldown for a wall, and a finding for /retro for a stopped item or one sent and not recorded.
  const after = () => {
    if (secReason) { const s = engine('--session', R, 'outreach', 'stop', '--reason', secReason); if (s.code !== 0) console.error('outreach stop failed: ' + first(s.out)) }
    if (res.outcome !== 'stopped' && !res.reason.startsWith('SENT, NOT RECORDED')) return
    const f = engine('--session', R, 'finding', 'add', '--json', JSON.stringify({ kind: 'blocked', stage: /-(\w+)$/u.exec(basename(R))?.[1] ?? 'retro', id: `lm-${n}`,
      summary: `LinkedIn item ${n} (${res.channel}) is ${res.outcome === 'stopped' ? 'stopped' : 'sent and not recorded'}: ${res.reason}`.slice(0, 200), evidence: res.reason,
      proposed: { reason: res.reason, action_for_candidate: 'Check the thread or the profile in LinkedIn. Never send this item again until it is settled.' } }))
    if (f.code !== 0) console.error('finding add failed: ' + first(f.out))
  }
  let ctx: Awaited<ReturnType<typeof launch>> | undefined
  let closing = false
  const close = async () => { if (closing || !ctx) return; closing = true; await Promise.race([ctx.close(), sleep(15_000)]) }
  // started at once, so a hang in the checks or the launch is covered too
  overall = setTimeout(async () => {
    wrap(new Stop('overall timeout'))
    await Promise.race([close(), sleep(20_000)]); fin(); after(); process.exit(res.outcome === 'security' ? 4 : 3)
  }, OVERALL_MS)

  const approved = join(dir, 'approved.json')
  if (!existsSync(approved)) return fb('no approved.json in the run')
  const it = (JSON.parse(readFileSync(approved, 'utf8')) as { send: Sent[] }).send.find((s) => s.n === n)
  if (!it) return fb(`item ${n} is not in approved.json`)
  res.channel = it.channel; res.thread_id = it.thread_id
  // a sent item needs no second send, and an item that was ever pressed is never pressed again
  const old = existsSync(resPath) ? JSON.parse(readFileSync(resPath, 'utf8')) as Result : null
  if (old?.outcome === 'sent') { res.outcome = 'sent'; res.reason = 'an earlier call: ' + old.reason; res.pressed = old.pressed; res.confirmed = old.confirmed; res.recorded = old.recorded; return fin() }
  if (existsSync(markPath)) { res.outcome = 'stopped'; res.pressed = true; res.reason = 'already pressed once'; return fin() }
  const reply = it.channel !== 'email' && it.channel !== 'inmail' && it.channel !== 'connect' && !!it.thread_id
  if (!reply && it.channel !== 'connect') return fb(it.channel === 'email' ? 'email item' : it.channel === 'inmail' ? 'InMail is out of scope' : 'a first message is out of scope')
  const textPath = resolve(C.REPO, it.text_file)
  if (!existsSync(textPath)) return fb('text file missing: ' + it.text_file)
  const text = readFileSync(textPath, 'utf8').replace(/\n+$/u, '')
  res.chars = text.length
  if (!text.trim()) return fb('text file is empty')
  if (text.length > TEXT_MAX) return fb(`text is ${text.length} characters, over the ${TEXT_MAX} that can be typed at a human pace`)
  if (pressIt && reply && !approvalLogged(R)) return fb('no logged approval in the run, so a reply is not pressed')
  if (!linkedinClear()) { res.outcome = 'security'; res.reason = 'LinkedIn security cooldown is running'; exit = 4; return fin() }
  if (profileBusy()) return fb('profile in use')
  const attach = it.attach ? resolve(C.REPO, it.attach) : ''
  if (attach && !existsSync(attach)) return fb('attachment missing: ' + it.attach)
  res.attach = attach ? basename(attach) : ''

  // outreach check, as the messenger's limit 5 and the prospect rules say
  const checkArgs = reply ? ['--thread', it.thread_id] : it.post_url ? ['--post', it.post_url] : ['--vanity', it.vanity]
  const chk = engine('--session', R, 'outreach', 'check', ...checkArgs)
  if (chk.code === 2 && (!reply || (new RegExp(`session ${basename(R)}\\b`).test(chk.out) && /follow-up none/.test(chk.out)))) { res.outcome = 'sent'; res.reason = 'already sent'; res.confirmed = true; res.recorded = true; return fin() }
  if (chk.code !== 0 && chk.code !== 2) return fb('outreach check exited ' + chk.code + ': ' + first(chk.out))
  if (!reply && !it.vanity) return fb('the connect item has no vanity')
  const max = Number(/note_max_chars\s+(\d+)/u.exec(engine('outreach', 'prospect-inputs').out)?.[1] ?? 300)
  if (!reply && text.length > max) return fb(`note is ${text.length} characters, over prospect.note_max_chars ${max}`)

  try { ctx = await launch(true) } catch (e) { return fb(profileBusy() ? 'profile in use' : 'launch failed: ' + first((e as Error).message)) }
  let page: Page | undefined
  try {
    page = ctx.pages()[0] ?? (await ctx.newPage())
    if (reply) await sendReply(page, it, text, attach, pressIt, res, mark)
    else await sendConnect(page, it, text, max, pressIt, res, mark)
    if (!pressIt) { res.outcome = 'dry'; res.reason = res.reason || `would send ${text.length} characters${attach ? ' with ' + basename(attach) : ''}` }
    else {
      res.outcome = 'sent'
      const rec = reply
        ? engine('--session', R, 'outreach', 'record', '--thread', it.thread_id, '--vanity', it.vanity, '--name', it.name, '--company', it.company, '--status', 'sent', '--notes', 'reply sent')
        : engine('--session', R, 'outreach', 'record', ...(it.post_url ? ['--post', it.post_url] : ['--role', it.role_id ?? '']), '--vanity', it.vanity, '--name', it.name, '--company', it.company, '--channel', 'connect', '--status', 'sent', '--notes', 'invitation sent')
      res.recorded = rec.code === 0
      res.reason = res.recorded ? (reply ? 'reply sent' : 'invitation sent') : `SENT, NOT RECORDED: ${rec.code} ${first(rec.out)}`
    }
  } catch (e) {
    wrap(e instanceof Stop ? e : new Stop('ERROR: ' + first((e as Error).message)))
    if (page && res.outcome === 'fallback') await missSample(page, res.miss_sample, res.reason)
  } finally {
    await close()
  }
  const code = fin()
  after()
  return code
}

// Thread header names, GUESS: the full-page view has the name in a link to the profile, the overlay in its bubble header.
// Only these header elements count. A link elsewhere in main may name the candidate or someone quoted in the thread.
const HEADER_NAME = ['.msg-thread__link-to-profile', 'h2.msg-entity-lockup__entity-title', '.msg-overlay-bubble-header__title', 'a.msg-s-profile-card-one-to-one__profile-link'] // GUESS
const COMPOSER = '.msg-form__contenteditable[role=textbox], div[role=textbox][contenteditable=true]' // runner: .msg-form__contenteditable[role=textbox]; the second is GUESS
const nameMatches = (header: string, name: string): boolean => {
  const h = norm(header), t = norm(name).replace(/[^\p{L}\s]/gu, ' ').split(' ').filter(Boolean)
  return t.length > 0 && h.includes(t[0]) && h.includes(t[t.length - 1])
}

async function sendReply(page: Page, it: Sent, text: string, attach: string, pressIt: boolean, res: Result, mark: () => void) {
  await page.goto(`${BASE}/messaging/thread/${encodeURIComponent(it.thread_id)}/`, { waitUntil: 'domcontentloaded' })
  await checkWall(page)
  const box = page.locator(COMPOSER).first()
  await box.waitFor({ timeout: 25_000 }).catch(async () => {
    // a message request shows Accept and Decline and no box until accepted
    if (await page.getByRole('button', { name: /^accept$/i }).count().catch(() => 0)) return
    await missSample(page, res.miss_sample, 'composer not found'); throw new Stop('composer not found')
  })
  await checkWall(page)
  const names: string[] = []
  for (const s of HEADER_NAME) names.push(...(await page.locator(s).allInnerTexts().catch(() => [])).map((x) => x.split('\n').map((l) => l.trim()).find(Boolean) ?? '').filter(Boolean)) // name line only, as readThread
  if (!names.length) { await missSample(page, res.miss_sample, 'header name not found'); throw new Stop('header name not found') }
  if (!names.some((x) => nameMatches(x, it.name))) throw new Stop(`THREAD MISMATCH: the header names ${names[0].replace(/\s+/gu, ' ').slice(0, 40)}`)
  const accept = page.getByRole('button', { name: /^accept$/i }).first()
  if (await accept.count().catch(() => 0)) {
    if (!pressIt) { res.reason = 'dry run: the thread is a message request, Accept was not clicked'; return }
    await press(page, accept)
    await box.waitFor({ timeout: 15_000 }).catch(() => { throw new Stop('composer did not appear after Accept') })
  }
  // Send and the file chip belong to the composer's own form, never to another button on the page
  const form = box.locator('xpath=ancestor::form[1]')
  if (!(await form.count().catch(() => 0))) { await missSample(page, res.miss_sample, 'composer has no form'); throw new Stop('composer has no form') }
  const sendBtn = form.getByRole('button', { name: /^send$/i }).first() // GUESS: the runner says "click Send"
  const region = page.locator('main').first()
  const tail = norm(text).slice(-80)
  const occurs = async () => (norm(await region.innerText({ timeout: 5000 }).catch(() => '')).split(tail).length - 1)
  const before = await occurs()
  const chips = region.getByText(basename(attach || 'no-attachment'))
  const chipBefore = await chips.count().catch(() => 0) // the same file name may sit in an earlier message
  await sleep(between(3000, 6000)) // the reading pause
  await typeHuman(page, box, text, false)
  if (norm(await boxText(box)) !== norm(text)) { await clearBox(page, box); throw new Stop('typed text does not match the file') }
  if (attach) {
    const docs = page.locator('input[type=file]:not([accept^="image"])').first() // runner: one input accepts image/*, the other .pdf and others
    for (let a = 0; a < 2 && (await chips.count().catch(() => 0)) <= chipBefore; a++) {
      if (!(await docs.count())) { await clearBox(page, box); throw new Stop('attachment not confirmed: no file input') }
      await docs.setInputFiles(attach)
      await chips.nth(chipBefore).waitFor({ timeout: 8000 }).catch(() => {})
    }
    if ((await chips.count().catch(() => 0)) <= chipBefore) { await clearBox(page, box); throw new Stop('attachment not confirmed') }
  }
  if (!pressIt) {
    await clearBox(page, box)
    if (attach) {
      const rm = form.locator('button[aria-label*="emove" i], button[aria-label*="ismiss" i], button[aria-label*="elete" i]').first() // GUESS
      if (await rm.count().catch(() => 0)) await rm.click({ timeout: 3000 }).catch(() => {})
    }
    await sleep(3000) // LinkedIn saves a draft after a short wait, so look again after it
    if ((await boxText(box)) || (attach && (await chips.count().catch(() => 0)) > chipBefore)) throw new Stop('draft may remain', 'stopped')
    res.reason = ''
    return
  }
  if (!(await sendBtn.isEnabled({ timeout: 5000 }).catch(() => false))) { await clearBox(page, box); throw new Stop('Send button not found or disabled') }
  mark() // before the pause: from here on the result is sent or stopped, and the timer reports stopped
  await sleep(between(800, 2000))
  await press(page, sendBtn)
  // the newest message is ours: the tail of the text appears one more time and the box is empty
  for (let i = 0; i < 15; i++) {
    await sleep(1000)
    if ((await occurs()) > before && !(await boxText(box))) { res.confirmed = true; return }
  }
  throw new Stop('the sent text did not show as the newest message')
}

async function sendConnect(page: Page, it: Sent, text: string, max: number, pressIt: boolean, res: Result, mark: () => void) {
  await page.goto(`${BASE}/in/${encodeURIComponent(it.vanity)}/`, { waitUntil: 'domcontentloaded' })
  await checkWall(page)
  await page.locator('main h1').first().waitFor({ timeout: 25_000 }).catch(() => {})
  // earlier threads reopen as overlays and cover the top card, so close each (runner quirk 2026-10-28)
  for (const b of await page.locator('button[aria-label^="Close your conversation"]').all()) await b.click({ timeout: 3000 }).catch(() => {})
  const h1 = (await page.locator('main h1').first().innerText({ timeout: 5000 }).catch(() => ''))
  if (!h1) { await missSample(page, res.miss_sample, 'profile name not found'); throw new Stop('profile name not found') }
  if (!nameMatches(h1, it.name)) throw new Stop(`PROFILE MISMATCH: the page names ${h1.replace(/\s+/gu, ' ').slice(0, 40)}`)
  const card = page.locator('main').first()
  if (await card.getByRole('button', { name: /^pending/i }).count().catch(() => 0)) throw new Stop('the profile already shows Pending')
  const connect = card.getByRole('button', { name: /^(connect|invite .* to connect)/i }).first() // GUESS: the aria-label is "Invite <name> to connect"
  const more = card.getByRole('button', { name: /^more/i }).first() // GUESS
  const direct = (await connect.count().catch(() => 0)) > 0
  if (!direct && !(await more.count().catch(() => 0))) { await missSample(page, res.miss_sample, 'no Connect or More button'); throw new Stop('no Connect button') }
  // The Connect click can send an invitation with no note, so a dry run stops here and clicks nothing.
  if (!pressIt) { res.reason = `would click ${direct ? 'Connect' : 'More, then Connect'}, then Add a note, and type ${text.length} characters`; return }
  if (direct) { mark(); await press(page, connect) }
  else {
    await press(page, more)
    const item = page.getByRole('menuitem', { name: /connect/i }).first() // GUESS: the runner says Connect sits under More
    if (!(await item.count().catch(() => 0))) { await missSample(page, res.miss_sample, 'More has no Connect'); throw new Stop('no Connect button') }
    mark(); await press(page, item)
  }
  const dialog = page.getByRole('dialog').first()
  if (!(await dialog.waitFor({ timeout: 10_000 }).then(() => true, () => false))) {
    // no note dialog: LinkedIn may have sent the invitation as it was
    if (await page.getByText(/invitation sent/i).or(page.getByRole('button', { name: /^pending/i })).count().catch(() => 0)) throw new Stop('sent without a note')
    await missSample(page, res.miss_sample, 'no invitation dialog'); throw new Stop('no invitation dialog after Connect')
  }
  const dismiss = async () => { await page.keyboard.press('Escape').catch(() => {}); await sleep(800) }
  if (await dialog.locator('input[type=email], input[name=email]').count().catch(() => 0)) { await dismiss(); throw new Stop('asks for email') } // GUESS
  const add = dialog.getByRole('button', { name: /add a note/i }).first()
  if (!(await add.count().catch(() => 0))) { await dismiss(); await missSample(page, res.miss_sample, 'no Add a note'); throw new Stop('no Add a note control') }
  await press(page, add)
  const note = dialog.locator('textarea').first() // GUESS: textarea#custom-message
  await note.waitFor({ timeout: 8000 }).catch(async () => { await dismiss(); throw new Stop('note box not found') })
  await sleep(between(2500, 5000))
  await typeHuman(page, note, text, true)
  if (norm(await boxText(note)) !== norm(text)) { await clearBox(page, note); await dismiss(); throw new Stop('typed note does not match the file') }
  // the counter reads "<used>/<max>" (GUESS); either the used or the remaining count has to agree with the text
  const counter = /(\d+)\s*\/\s*(\d+)/u.exec(await dialog.innerText({ timeout: 3000 }).catch(() => ''))
  if (counter) {
    const used = Number(counter[1]), cap = Number(counter[2])
    if (used !== text.length && cap - used !== text.length) { await clearBox(page, note); await dismiss(); throw new Stop(`note counter reads ${counter[0]} for ${text.length} characters`) }
    if (cap > max) res.notes.push(`the dialog allows ${cap}, prospect.note_max_chars is ${max}`)
  } else res.notes.push('no note counter found')
  const go = dialog.getByRole('button', { name: /^send( invitation| now)?$/i }).first() // GUESS
  if (!(await go.isEnabled({ timeout: 5000 }).catch(() => false))) { await clearBox(page, note); await dismiss(); throw new Stop('Send button not found or disabled') }
  mark()
  await sleep(between(800, 2000))
  await press(page, go)
  // "Invitation sent" or a Pending button, either one
  const seen = page.getByText(/invitation sent/i).or(page.getByRole('button', { name: /^pending/i }))
  await seen.first().waitFor({ timeout: 15_000 }).catch(() => { throw new Stop('neither "Invitation sent" nor Pending appeared') })
  res.confirmed = true
}

// ---- the inbox -----------------------------------------------------------------------------------------------------
type Card = { id: string; name: string; unread: boolean; sponsored: boolean; tab: string }

async function readCards(page: Page, tab: string): Promise<Card[]> {
  return page.evaluate((tabName) => {
    const items = [...document.querySelectorAll('li[class*="msg-conversation"], li[class*="conversation-listitem"]')] // GUESS
    return items.map((li) => {
      const a = li.querySelector('a[href*="/messaging/thread/"]') as HTMLAnchorElement | null // GUESS
      const id = a ? decodeURIComponent(/\/messaging\/thread\/([^/?#]+)/u.exec(a.getAttribute('href') ?? '')?.[1] ?? '') : ''
      const name = (li.querySelector('[class*="participant-names"], h3') as HTMLElement | null)?.innerText.trim() ?? ''
      const unread = !!li.querySelector('[class*="unread-count"], [class*="unread-dot"], [class*="notification-badge--show"]') || /unread/i.test(li.getAttribute('aria-label') ?? '') // GUESS
      return { id, name, unread, sponsored: /sponsored/i.test((li as HTMLElement).innerText), tab: tabName }
    }).filter((c) => c.name || c.id)
  }, tab)
}

// Scrolls the virtualised list and collects every card on the way, because a card scrolled out of sight leaves the DOM.
async function collect(page: Page, tab: string, into: Map<string, Card>, diag: string[]) {
  let still = 0
  for (let round = 0; round < 25 && still < 3; round++) {
    const cards = await readCards(page, tab)
    const sizeBefore = into.size
    for (const c of cards) { const k = c.id || 'name:' + norm(c.name); if (!into.has(k)) into.set(k, c) }
    still = into.size === sizeBefore ? still + 1 : 0
    if (!cards.length && round === 0) { await missSample(page, diag, 'no conversation cards'); return }
    await page.evaluate(() => {
      const li = document.querySelector('li[class*="msg-conversation"], li[class*="conversation-listitem"]')
      for (let el = li?.parentElement ?? null; el; el = el.parentElement) { if (el.scrollHeight > el.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(el).overflowY)) { el.scrollTop = el.scrollHeight; return } }
    })
    await sleep(between(1200, 2200))
  }
}

const safe = (id: string) => id.replace(/[^A-Za-z0-9_-]/gu, '_')

// One thread file in the shape of the Gmail staging (mail thread): a `# <who>` line, `key: value` lines, then `## <sender> | <time>` for each message.
async function readThread(page: Page, id: string, set: string, card: Card | undefined, diag: string[]): Promise<string> {
  await page.goto(`${BASE}/messaging/thread/${encodeURIComponent(id)}/`, { waitUntil: 'domcontentloaded' })
  await checkWall(page)
  await page.locator('[class*="msg-s-message-list"], main').first().waitFor({ timeout: 20_000 }).catch(() => {})
  await sleep(between(1500, 3000))
  await checkWall(page)
  const t = await page.evaluate(() => {
    const txt = (sel: string) => (document.querySelector(sel) as HTMLElement | null)?.innerText.replace(/\s+/gu, ' ').trim() ?? ''
    const link = document.querySelector('.msg-thread__link-to-profile[href*="/in/"], [class*="msg-entity-lockup"] a[href*="/in/"], [class*="msg-title-bar"] a[href*="/in/"]') as HTMLAnchorElement | null // GUESS: the header's own link only
    // innerText puts the name and the headline on separate lines, so the name is the first non-empty line
    const first1 = (sel: string) => ((document.querySelector(sel) as HTMLElement | null)?.innerText ?? '').split('\n').map((l) => l.trim()).find(Boolean) ?? ''
    const name = first1('.msg-thread__link-to-profile') || first1('h2.msg-entity-lockup__entity-title') || (link?.innerText ?? '').split('\n').map((l) => l.trim()).find(Boolean) || '' // GUESS
    const headline = txt('.msg-entity-lockup__entity-info') || txt('.msg-s-profile-card__headline') || txt('.msg-thread__link-to-profile + *') // GUESS
    let who = ''
    const msgs: { from: string; at: string; text: string }[] = []
    for (const ev of document.querySelectorAll('.msg-s-message-list__event, li[class*="msg-s-event-listitem"]')) { // GUESS
      const g = (ev.querySelector('.msg-s-message-group__name') as HTMLElement | null)?.innerText.trim(); if (g) who = g
      const at = (ev.querySelector('time, .msg-s-message-group__timestamp, .msg-s-message-list__time-heading') as HTMLElement | null)?.innerText.trim() ?? ''
      const body = (ev.querySelector('.msg-s-event-listitem__body, [class*="event-listitem__body"]') as HTMLElement | null)?.innerText.trim() ?? ''
      const attached = [...ev.querySelectorAll('[class*="attachment"]')].map((a) => (a as HTMLElement).innerText.replace(/\s+/gu, ' ').trim()).filter(Boolean)
      if (body || attached.length) msgs.push({ from: who, at, text: [body, ...attached.map((a) => '[attachment] ' + a)].filter(Boolean).join('\n') })
    }
    const main = (document.querySelector('main') as HTMLElement | null)?.innerText ?? ''
    return { name, headline, vanity: /\/in\/([^/?#]+)/u.exec(link?.getAttribute('href') ?? '')?.[1] ?? '', msgs, main,
      request: !!Array.from(document.querySelectorAll('button')).find((b) => /^accept$/i.test(b.innerText.trim())), inmail: /inmail/i.test(main.slice(0, 4000)) }
  })
  // fallback: a one-line header with the headline glued on
  if (t.headline && t.name.endsWith(t.headline)) t.name = t.name.slice(0, -t.headline.length).trim()
  const lines = [`# ${t.name || card?.name || id}`, '', 'source: linkedin', `thread: ${id}`, `url: ${BASE}/messaging/thread/${encodeURIComponent(id)}/`, `name: ${t.name || card?.name || ''}`,
    `headline: ${t.headline}`, `vanity: ${decodeURIComponent(t.vanity)}`, `set: ${set}`, `unread: ${card?.unread ? 'yes' : 'no'}`, `tab: ${card?.tab ?? ''}`,
    `sponsored: ${card?.sponsored ? 'yes' : 'no'}`, `message_request: ${t.request ? 'yes' : 'no'}`, `inmail: ${t.inmail ? 'yes' : 'no'}`]
  if (!t.msgs.length) {
    await missSample(page, diag, 'no message events')
    lines.push('', '## raw page text (the message selectors found nothing)', '', t.main.replace(/\n{3,}/gu, '\n\n').trim())
  }
  for (const m of t.msgs) lines.push('', `## ${m.from} | ${m.at}`, '', m.text)
  return lines.join('\n') + '\n'
}

// The thread ids on `outreach drafted` or `outreach recent-sent`. A line keys on `thread:<id>`. A gmail: or email: id is not LinkedIn's,
// and a drafted line with a post and no (follow-up) mark is a prospect row, which the reader leaves alone.
function listed(sub: 'drafted' | 'recent-sent'): string[] {
  return engine('outreach', sub).out.split('\n').filter((l) => /^thread:/.test(l) && !/^thread:(gmail|email):/.test(l) && !(sub === 'drafted' && / post http/.test(l) && !/\(follow-up\)/.test(l)))
    .map((l) => /^thread:(\S+)/.exec(l)![1])
}

async function inbox(R: string): Promise<number> {
  if (!R) { console.error('usage: li-msg.ts inbox --run <run folder>'); return 2 }
  const t0 = Date.now()
  const out = (s: string) => console.log(s)
  const outDir = join(resolve(C.REPO, R), C.STAGE_DIR, 'mail')
  const diag: string[] = []
  if (!linkedinClear()) { out('LM-INBOX fallback security cooldown is running'); return 0 }
  if (profileBusy()) { out('LM-INBOX fallback profile in use'); return 0 }
  let ctx: Awaited<ReturnType<typeof launch>>
  try { ctx = await launch(true) } catch (e) { out(`LM-INBOX fallback ${profileBusy() ? 'profile in use' : 'launch failed: ' + first((e as Error).message)}`); return 0 }
  let closing = false, written = 0
  const close = async () => { if (closing) return; closing = true; await Promise.race([ctx.close(), sleep(15_000)]) }
  const overall = setTimeout(async () => { await Promise.race([close(), sleep(20_000)]); out(`LM-INBOX fallback timeout after ${written} threads`); process.exit(3) }, OVERALL_MS) // 20 minutes, a hang only: the parent runs this in the background
  const report = (path: string, extra: object) => writeFileSync(path, JSON.stringify({ at: new Date().toISOString(), seconds: +((Date.now() - t0) / 1000).toFixed(1), miss_sample: diag, ...extra }, null, 1) + '\n')
  const indexPath = join(resolve(C.REPO, R), C.STAGE_DIR, 'linkedin-inbox.json')
  mkdirSync(join(resolve(C.REPO, R), C.STAGE_DIR), { recursive: true })
  let code = 0, line = ''
  try {
    const page = ctx.pages()[0] ?? (await ctx.newPage())
    await page.goto(`${BASE}/messaging/`, { waitUntil: 'domcontentloaded' })
    await checkWall(page)
    await page.locator('li[class*="msg-conversation"], li[class*="conversation-listitem"]').first().waitFor({ timeout: 25_000 }).catch(() => {}) // GUESS
    // every unread sender goes down before any thread opens, because opening one marks it read
    const cards = new Map<string, Card>()
    // LinkedIn may open the newest thread by itself on this page, which marks it read. Read the list once at once and write what it shows, before anything else.
    const firstCards = await readCards(page, 'focused')
    report(indexPath, { stage: 'first read of the list, before any scroll or thread', cards: firstCards.length, unread: firstCards.filter((c) => c.unread).map((c) => ({ name: c.name, id: c.id, sponsored: c.sponsored })) })
    const auto = /^\/messaging\/thread\/([^/?#]+)/u.exec(new URL(page.url()).pathname)?.[1]
    if (auto) diag.push(`LinkedIn opened thread ${decodeURIComponent(auto)} on its own, so its unread mark may have cleared before the read`)
    await collect(page, 'focused', cards, diag)
    {
      const area = page.locator('main, [class*="msg-conversations-container"]').first() // the messaging list's area, never the whole page
      const el = area.getByRole('tab', { name: /^other$/i }).or(area.getByRole('button', { name: /^other$/i })).or(area.getByRole('link', { name: /^other$/i })).first()
      if (!(await el.count().catch(() => 0))) diag.push('no Other tab found')
      else {
        await el.click({ timeout: 5000 }).catch(() => {}); await sleep(between(1500, 2500)); await checkWall(page)
        await collect(page, 'other', cards, diag)
      }
    }
    const unread = [...cards.values()].filter((c) => c.unread)
    const drafted = listed('drafted'), recent = listed('recent-sent')
    mkdirSync(outDir, { recursive: true })
    report(indexPath, { cards: cards.size, unread: unread.map((c) => ({ name: c.name, id: c.id, tab: c.tab, sponsored: c.sponsored })), drafted, recent_sent: recent })
    // thread ids: from the list's links; a card with no link in the list is opened by name, which marks it read, after the index above is written
    const todo = new Map<string, { set: string; card?: Card }>()
    for (const c of unread) if (c.id) todo.set(c.id, { set: 'unread', card: c })
    if (auto && !todo.has(decodeURIComponent(auto))) todo.set(decodeURIComponent(auto), { set: 'auto-opened', card: cards.get(decodeURIComponent(auto)) })
    for (const id of drafted) if (!todo.has(id)) todo.set(id, { set: 'drafted', card: cards.get(id) })
    for (const id of recent) if (!todo.has(id)) todo.set(id, { set: 'recent-sent', card: cards.get(id) })
    const noId = unread.filter((c) => !c.id)
    if (noId.length) diag.push(`${noId.length} unread cards carry no thread link: ${noId.map((c) => c.name).join(', ').slice(0, 200)}`)
    for (const [id, v] of [...todo].slice(0, THREADS_MAX)) {
      writeFileSync(join(outDir, `linkedin-${safe(id)}.md`), await readThread(page, id, v.set, v.card, diag))
      written++
      await sleep(between(2000, 5000))
    }
    report(indexPath, { cards: cards.size, unread: unread.map((c) => ({ name: c.name, id: c.id, tab: c.tab, sponsored: c.sponsored })), drafted, recent_sent: recent, written, no_link: noId.map((c) => c.name) })
    line = noId.length || !cards.size ? `LM-INBOX fallback ${cards.size ? noId.length + ' unread threads have no link in the list' : 'no conversation cards found'}` : `LM-INBOX ok ${written}`
  } catch (e) {
    const s = e instanceof Stop ? e : new Stop('ERROR: ' + first((e as Error).message))
    if (s.kind === 'security') {
      const r = engine('--session', R, 'outreach', 'stop', '--reason', s.message); if (r.code !== 0) console.error('outreach stop failed: ' + first(r.out))
      line = 'LM-INBOX security ' + s.message; code = 4
    } else { line = `LM-INBOX fallback ${s.message}`; code = s.kind === 'signedout' ? 5 : 0 }
  } finally { clearTimeout(overall); await close() }
  out(line)
  return code
}

async function main(argv: string[]): Promise<number> {
  const [cmd, arg] = argv
  const val = (n: string) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] ?? '' : '')
  if (cmd === 'send' && arg && !arg.startsWith('--')) return send(arg, val('--run'), argv.includes('--press'))
  if (cmd === 'inbox') return inbox(val('--run'))
  console.error('usage: li-msg.ts send <item-file or number> --run <run folder> [--press] | inbox --run <run folder>\n' +
    'exit 0 any LM-RESULT or LM-INBOX line, 2 usage, 3 timeout, 4 security stop, 5 signed out (run node process/tools/ea-apply.ts login)')
  return 2
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(await main(process.argv.slice(2)))
