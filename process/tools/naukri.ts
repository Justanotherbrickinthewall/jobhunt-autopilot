// The naukri lane without the sweep-source and applier agents: code reads the inbox and presses Apply or Not interested.
// `sweep` is read-only. `apply` presses only with --press. One text `claude -p` call (answerQuestions) fills a questions panel.
// Selectors the runner does not name are guesses. Each is marked GUESS, so a first run that fails points at it.
import { cpus, tmpdir } from 'node:os'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { chromium, type Locator, type Page } from 'playwright-core'
import * as C from '../constants.ts'
import { readDicts } from '../lib/csv.ts'
import { answerQuestions, engine, PAY_LABEL, payValue, type Answer, type Field } from './ea-apply.ts'

const PROFILE = join(C.REPO, '.playwright/naukri')
const INBOX = 'https://www.naukri.com/mnjuser/inbox'
const CHIPS = ['Most relevant', 'Others']
const CARD = '[data-inviteid]'

// shortcut: copied from ea-apply.ts, move to a shared module when a third script needs it
function launch(headless: boolean) {
  let executablePath: string | undefined
  if (process.platform === 'darwin' && process.arch === 'x64' && cpus()[0]?.model.startsWith('Apple')) {
    executablePath = join(tmpdir(), 'naukri-chrome-arm64.sh')
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

// shortcut: copied from ea-apply.ts, move to a shared module when a third script needs it
class Stop extends Error {
  outcome: string; extra: Partial<Res>
  constructor(msg: string, outcome = 'failed', extra: Partial<Res> = {}) { super(msg); this.outcome = outcome; this.extra = extra }
}
const settle = <T>(p: Promise<T>, ms: number): Promise<T | 'PENDING'> => Promise.race([p, new Promise<'PENDING'>((r) => setTimeout(() => r('PENDING'), ms))])
const ist = (offsetMs = 0) => new Date(Date.now() + 5.5 * 3600_000 + offsetMs).toISOString()
// the JD and card samples never keep an email address or a phone number
const scrub = (s: string) => s.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email removed]').replace(/\+?\d[\d\s().-]{8,}\d/g, '[number removed]')

// ---- walls -----------------------------------------------------------------------------------------------------

type Wall = 'security' | 'signedout'
let wallSeen: Wall | null = null
// GUESS: login host/path names, the captcha and OTP selectors and the block-page titles.
async function wall(p: Page): Promise<Wall | null> {
  const u = new URL(p.url())
  if (/login|register/i.test(u.hostname + u.pathname)) return 'signedout'
  const vis = async (sel: string) => { const l = p.locator(sel).first(); return (await l.count().catch(() => 0)) > 0 && (await l.isVisible().catch(() => false)) }
  if (await vis('iframe[src*="bframe"], iframe[src*="hcaptcha" i], iframe[title*="challenge" i]')) return 'security'
  if (await vis('input[autocomplete="one-time-code"], input[placeholder*="OTP" i]')) return 'security'
  const head = (await p.title().catch(() => '')) + ' ' + (await p.locator('h1, h2').allInnerTexts().catch(() => [])).join(' ').slice(0, 500)
  return /captcha|verify you.re human|security check|unusual activity|access denied|verification code/i.test(head) ? 'security' : null
}
async function checkWall(p: Page) {
  const w = await wall(p)
  if (!w) return
  wallSeen = w
  const path = new URL(p.url()).pathname
  throw new Stop(w === 'signedout' ? 'SIGNED OUT at ' + path : 'SECURITY STOP at ' + path, w === 'signedout' ? 'failed' : 'held')
}

// A real mouse click at the control's centre, as ea-apply does. Returns after the click is sent or 10 s pass.
let clicks = 0
async function press(page: Page, el: Locator) {
  await el.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {})
  const b = await el.boundingBox({ timeout: 10_000 })
  if (!b) throw new Stop('control not visible')
  const sent = page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  clicks++
  await settle(sent, 10_000)
  await checkWall(page)
}

// ---- inbox -----------------------------------------------------------------------------------------------------

// The runner's key snippet, as it stands: the first 12 hex characters of SHA-256 of the invite id, computed in the page.
async function keysOf(p: Page): Promise<{ key: string; answered: boolean }[]> {
  const raw = await p.evaluate(async () => {
    const out: string[] = []
    for (const c of Array.from(document.querySelectorAll('[data-inviteid]')) as HTMLElement[]) {
      const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(c.dataset['inviteid']))
      out.push([...new Uint8Array(h)].slice(0, 6).map((b) => b.toString(16).padStart(2, '0')).join('') + (c.innerText.includes('You shared interest') ? ' answered' : ''))
    }
    return JSON.stringify(out)
  })
  return (JSON.parse(raw) as string[]).map((s) => ({ key: s.slice(0, 12), answered: s.endsWith(' answered') }))
}

// Switching chips resets the list to 20, so each chip is scrolled again. GUESS: the chip is plain text, and an inner scroller is reached by scrolling the last card into view.
async function openChip(p: Page, chip: string): Promise<boolean> {
  const el = p.getByText(chip, { exact: true }).first()
  const found = (await el.count()) > 0
  if (found) { await press(p, el); await p.waitForTimeout(2000) }
  let last = -1, same = 0
  for (let i = 0; i < 80 && same < 3; i++) {
    const n = await p.locator(CARD).count()
    same = n === last ? same + 1 : 0
    last = n
    await p.evaluate(() => { const c = document.querySelectorAll('[data-inviteid]'); c[c.length - 1]?.scrollIntoView({ block: 'end' }); window.scrollTo(0, document.body.scrollHeight) })
    await p.waitForTimeout(1500)
  }
  return found
}

async function gotoInbox(p: Page) {
  await p.goto(INBOX, { waitUntil: 'domcontentloaded' })
  await checkWall(p)
  if (!/^\/mnjuser\/inbox/.test(new URL(p.url()).pathname)) { wallSeen = 'signedout'; throw new Stop('SIGNED OUT: the inbox redirected to ' + new URL(p.url()).pathname) }
  await p.locator(CARD).first().waitFor({ timeout: 30_000 }).catch(async () => { await checkWall(p); throw new Stop(`no card matched ${CARD} (empty inbox or a changed page)`) })
}

type Card = { title: string; company: string; location: string; pay: string; exp: string; age: string; agency: string; hiringFor: string; lines: string[] }
// GUESS: the class fragments title, comp and loc. Everything else is read from the card's text lines.
async function readCard(p: Page, n: number): Promise<Card> {
  const r = await p.evaluate((i) => {
    const c = document.querySelectorAll('[data-inviteid]')[i] as HTMLElement
    const q = (s: string) => (c.querySelector(s) as HTMLElement | null)?.innerText.trim() ?? ''
    return { lines: c.innerText.split('\n').map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean), title: q('[class*="title" i]'), company: q('[class*="comp" i]'), location: q('[class*="loc" i]') }
  }, n)
  const text = r.lines.join('\n')
  const m = (re: RegExp) => re.exec(text)?.[1]?.trim() ?? ''
  const ageRe = /(\d+\+?\s*(?:min\w*|h\w*|d\w*|w\w*|mo\w*)\s*ago|today|yesterday|just now)/i
  // Seen 25 Nov: [Hiring for, <client>, Posted by <agency>, <age>, <title>, <location>, <pay>, <skills>, <years>].
  const a = r.lines.findIndex((x) => ageRe.test(x))
  const hf = r.lines.findIndex((x) => /^hiring for$/i.test(x))
  return {
    title: (a >= 0 ? r.lines[a + 1] : '') || r.title || r.lines[0] || '', company: r.company || r.lines[1] || '',
    location: (a >= 0 ? r.lines[a + 2] : '') || r.location,
    pay: m(/^(not disclosed|[\d.]+\s*[kl]?\s*-\s*[\d.]+\s*(?:lacs?|lpa|cr|[kl])\b.*)$/im), exp: m(/(\d+\s*-\s*\d+\s*(?:yrs?|years?))/i),
    age: m(ageRe), agency: m(/posted by\s+(.+)/i), hiringFor: hf >= 0 ? r.lines[hf + 1] ?? '' : m(/hiring for\s+(.+)/i), lines: r.lines,
  }
}

function postedAt(age: string): string {
  const m = /(\d+)\+?\s*(min|h|d|w|mo)/i.exec(age)
  if (!m) return /today|just now/i.test(age) ? ist().slice(0, 10) : /yesterday/i.test(age) ? ist(-86_400_000).slice(0, 10) : ''
  const n = Number(m[1]), u = m[2].toLowerCase()
  if (u === 'min' || u === 'h') return ist(-n * (u === 'h' ? 3_600_000 : 60_000)).slice(0, 16)
  return ist(-n * 86_400_000 * (u === 'w' ? 7 : u === 'mo' ? 30 : 1)).slice(0, 10)
}

// Bring card n into view and click its title. The drawer is the nearest ancestor of its Not interested (or Apply) control that holds
// no card, which is tagged data-nk-drawer. GUESS: that shape, and the title selector. Returns the drawer text.
async function openDrawer(p: Page, n: number): Promise<{ drawer: Locator; text: string }> {
  const card = p.locator(CARD).nth(n)
  await card.scrollIntoViewIfNeeded({ timeout: 10_000 })
  const title = card.locator('[class*="title" i]').first()
  await press(p, (await title.count()) ? title : card)
  const ctl = p.getByRole('button', { name: /^(not interested|apply)$/i }).or(p.getByText(/^(Not interested|Apply)$/)).first()
  await ctl.waitFor({ timeout: 10_000 }).catch(() => { throw new Stop('the drawer did not open') })
  await ctl.evaluate((el) => {
    document.querySelectorAll('[data-nk-drawer]').forEach((x) => x.removeAttribute('data-nk-drawer'))
    let a = el as HTMLElement
    while (a.parentElement && a.parentElement !== document.body && !a.parentElement.querySelector('[data-inviteid]')) a = a.parentElement
    a.setAttribute('data-nk-drawer', '1')
  })
  const drawer = p.locator('[data-nk-drawer]').first()
  return { drawer, text: await drawer.innerText().catch(() => '') }
}

// GUESS: a close control labelled close, else Escape.
async function closeDrawer(p: Page, drawer: Locator) {
  const x = drawer.locator('[aria-label*="close" i], [class*="close" i]').first()
  if (await x.count().catch(() => 0)) await press(p, x).catch(() => {})
  else await p.keyboard.press('Escape')
  await p.waitForTimeout(500)
}

const answeredNow = async (p: Page, key: string) => (await keysOf(p)).find((k) => k.key === key)?.answered ?? false

// ---- login -----------------------------------------------------------------------------------------------------

// One window, headed. The candidate types their own credentials and closes the window when signed in. The script types nothing.
async function login(): Promise<number> {
  const ctx = await launch(false)
  const page = ctx.pages()[0] ?? (await ctx.newPage())
  await page.goto('https://www.naukri.com/nlogin/login')
  console.log('Sign in in the Chrome window, then close the window. Waiting up to 10 minutes.')
  const closed = await settle(new Promise<void>((r) => ctx.on('close', () => r())), 600_000)
  if (closed === 'PENDING') await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 15_000))])
  console.log(closed === 'PENDING' ? 'Timed out. The window was closed.' : 'Window closed. Run sweep to check the session.')
  return closed === 'PENDING' ? 1 : 0
}

// ---- sweep -----------------------------------------------------------------------------------------------------

// `out` holds the sweep JSON and the summary. The JD files go to `jdDir`, which the matcher reads. `hunt-sweep` passes the ledger's roles folder.
async function sweep(out: string, jdDir = out): Promise<number> {
  mkdirSync(out, { recursive: true }); mkdirSync(jdDir, { recursive: true })
  const t0 = Date.now()
  const stats = { cards_seen: 0, answered: 0, unanswered: 0, kept: 0, spent: 0, no_jd: 0 }
  const diag: { chips_found: string[]; card_sample: string[][]; drawer_chars: number[] } = { chips_found: [], card_sample: [], drawer_chars: [] }
  const rows: Record<string, unknown>[] = []
  const seen = new Set<string>()
  const firing = ist().slice(0, 13).replace('T', '-')
  const ctx = await launch(true)
  let closing = false
  const close = async () => { if (closing) return; closing = true; await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 15_000))]) }
  const done = (status: string, reason: string) => {
    writeFileSync(join(out, 'naukri-sweep-summary.json'), JSON.stringify({ status, reason, firing, seconds: +((Date.now() - t0) / 1000).toFixed(1), ...stats, diag }, null, 1) + '\n')
    console.log(`${status}${reason ? ': ' + reason : ''}. cards seen ${stats.cards_seen}, answered ${stats.answered}, unanswered ${stats.unanswered}, kept ${stats.kept}, spent ${stats.spent}, without JD ${stats.no_jd}`)
  }
  const overall = setTimeout(async () => { done('failed', 'overall timeout'); await close(); process.exit(3) }, 1_500_000)
  try {
    const page = ctx.pages()[0] ?? (await ctx.newPage())
    await gotoInbox(page)
    for (const [ci, chip] of CHIPS.entries()) {
      // the first chip is the page's default list, so it is read even when its label is not found
      if (!(await openChip(page, chip)) && ci > 0) continue
      diag.chips_found.push(chip)
      const keys = await keysOf(page)
      for (const [n, k] of keys.entries()) {
        if (seen.has(k.key)) continue
        seen.add(k.key); stats.cards_seen++
        if (k.answered) { stats.answered++; continue }
        stats.unanswered++
        const c = await readCard(page, n)
        if (diag.card_sample.length < 2) diag.card_sample.push(c.lines.map(scrub))
        const hidden = !c.company || /^hiring for/i.test(c.company) || !!c.hiringFor
        const company = hidden ? `Client not named (${c.agency || 'agency'})` : c.company
        const link = `${INBOX}#${k.key}`
        if (engine('dedupe', 'check', company, c.title, link).code === 2) { stats.spent++; continue }
        let jd = ''
        try {
          const d = await openDrawer(page, n)
          jd = d.text; diag.drawer_chars.push(jd.length)
          await closeDrawer(page, d.drawer)
        } catch (e) { if (e instanceof Stop && /SECURITY|SIGNED/.test(e.message)) throw e }
        if (jd) writeFileSync(join(jdDir, `naukri-${k.key}.jd.md`), `<!-- source: ${link}, read ${ist().slice(0, 10)} -->\n${scrub(jd)}\n`)
        else stats.no_jd++
        const notes = [c.exp && `experience ${c.exp}`, c.agency && 'posted by an agency', !jd && 'JD not read'].filter(Boolean).join('; ')
        rows.push({
          source: 'naukri', channel: 'direct', company, role: c.title, location: c.location, link, drop_reason: null,
          salary_band: /not disclosed/i.test(c.pay) ? '' : c.pay, salary_period: c.pay && !/not disclosed/i.test(c.pay) ? 'year' : '',
          posted_at: postedAt(c.age), notes,
        })
        stats.kept++
      }
    }
    if (!stats.cards_seen) throw new Stop('no cards read from either chip')
    writeFileSync(join(out, `${firing}-naukri-1.json`), JSON.stringify({ source: 'naukri', firing, queries: CHIPS, rows }, null, 1) + '\n')
    done('ok', '')
    return 0
  } catch (e) {
    const reason = e instanceof Stop ? e.message : 'ERROR: ' + (e as Error).message.split('\n')[0]
    done('failed', reason)
    if (wallSeen && jdDir === out) console.log(`Record it: node process/engine.ts --session <S> session sweep naukri status=failed reason="login wall"`)
    return wallSeen === 'security' ? 4 : wallSeen === 'signedout' ? 5 : 1
  } finally { clearTimeout(overall); await close() }
}

// ---- apply -----------------------------------------------------------------------------------------------------

type Res = {
  id: string; outcome: string; applied_date: string | null; ledger_key: string; reasons: string[]; question: string | null; closed: boolean; notes: string
  route: 'script' | 'fallback'; dry_run: boolean; plan: string; drawer_buttons: string[]; questions: { label: string; kind: string }[]
  answers: { label: string; kind: string; action: string; value: string }[]; llm_calls: number; llm_tokens: number; seconds: number
}

type PF = Field & { idx: string }
// Reads the controls of the questions panel. GUESS: the label is the control's aria-label or placeholder, else the nearest text block above it.
async function readPanel(panel: Locator): Promise<PF[]> {
  const raw = await panel.evaluate((m) => {
    const clean = (x: string | null | undefined) => (x ?? '').replace(/\s+/g, ' ').trim()
    const above = (e: HTMLElement) => {
      for (let a: HTMLElement | null = e, d = 0; a && a !== m && d < 5; a = a.parentElement, d++) {
        for (let s = a.previousElementSibling as HTMLElement | null; s; s = s.previousElementSibling as HTMLElement | null) {
          const t = clean(s.innerText); if (t.length > 3 && !s.querySelector('input, textarea, select')) return t
        }
      }
      return ''
    }
    const out: any[] = []; const groups = new Map<string, any>(); let n = 0
    for (const e of Array.from(m.querySelectorAll('input, select, textarea')) as any[]) {
      if (e.type === 'hidden' || e.type === 'file' || e.offsetParent === null) continue
      const idx = String(n++); e.setAttribute('data-nk', idx)
      const label = clean(e.getAttribute('aria-label')) || above(e) || clean(e.placeholder)
      if (e.type === 'radio') {
        let g = groups.get(e.name)
        if (!g) { g = { key: '', label, kind: 'radio', required: true, value: '', options: [], idx: '', idxs: [] }; groups.set(e.name, g); out.push(g) }
        const opt = clean(e.labels?.[0]?.innerText) || clean(e.parentElement?.innerText)
        g.options.push(opt); g.idxs.push(idx); if (!g.idx) g.idx = idx; if (e.checked) g.value = opt
        continue
      }
      out.push({
        key: '', label, idx, required: !!e.required || e.getAttribute('aria-required') === 'true',
        kind: e.tagName === 'SELECT' ? 'select' : e.tagName === 'TEXTAREA' ? 'textarea' : e.type === 'checkbox' ? 'checkbox' : e.type === 'number' ? 'number' : 'text',
        value: e.type === 'checkbox' ? String(e.checked) : e.tagName === 'SELECT' ? (e.selectedOptions[0]?.text.trim() ?? '') : e.value,
        options: e.tagName === 'SELECT' ? Array.from(e.options as ArrayLike<HTMLOptionElement>).map((o) => o.text.trim()) : undefined,
      })
    }
    return out
  }) as (PF & { idxs?: string[] })[]
  const seen = new Map<string, number>()
  for (const f of raw) { const k = seen.get(f.label) ?? 0; seen.set(f.label, k + 1); f.key = k ? `${f.label}#${k + 1}` : f.label }
  return raw
}

async function fillField(panel: Locator, f: PF & { idxs?: string[] }, value: string, isPay: boolean) {
  const at = (i: string) => panel.locator(`[data-nk="${i}"]`)
  if (f.kind === 'select') await at(f.idx).selectOption({ label: value }, { timeout: 10_000 })
  else if (f.kind === 'radio') {
    const i = f.options?.indexOf(value) ?? -1
    if (i < 0 || !f.idxs) throw new Stop(`option not found for: ${f.label}`)
    await at(f.idxs[i]).check({ force: true, timeout: 5000 })
  } else if (f.kind === 'checkbox') await at(f.idx).setChecked(value === 'true', { force: true, timeout: 5000 })
  else {
    await at(f.idx).fill(value, { timeout: 10_000 }).catch(() => { throw new Stop(`filling failed: ${f.label}`) }) // the error text of a failed fill holds the value
    if (!isPay && (await at(f.idx).inputValue().catch(() => '')) !== value) throw new Stop(`could not set: ${f.label}`)
  }
}

type Plan = { id: string; company: string; role: string; link: string; key: string }
function loadPlan(id: string): Plan {
  const r = readDicts(readFileSync(C.PROSPECTS, 'utf8')).rows.find((x) => x['id'] === id)
  if (!r) throw new Error(`no prospects row ${id}`)
  const link = r['link'] ?? ''
  const key = /^https:\/\/www\.naukri\.com\/mnjuser\/inbox#([0-9a-f]{12})$/.exec(link)?.[1]
  if (!key) throw new Error(`row ${id} has no Naukri invite key in its link`)
  return { id, company: r['company'] ?? '', role: r['role'] ?? '', link, key }
}

const nrm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '')
const either = (x: string, y: string) => !!nrm(x) && !!nrm(y) && (nrm(x).includes(nrm(y)) || nrm(y).includes(nrm(x)))

async function apply(id: string, o: { out: string; press: boolean; triage: string }): Promise<Res> {
  const t0 = Date.now()
  const res: Res = { id, outcome: 'failed', applied_date: null, ledger_key: '', reasons: [], question: null, closed: false, notes: '', route: 'fallback', dry_run: !o.press,
    plan: '', drawer_buttons: [], questions: [], answers: [], llm_calls: 0, llm_tokens: 0, seconds: 0 }
  const notes: string[] = []
  const row = loadPlan(id)
  let reserved = false
  const fin = (): Res => {
    if (reserved && res.outcome !== 'applied' && !res.reasons[0]?.startsWith('STOPPED:')) {
      if (res.reasons.length) res.reasons[0] = 'STOPPED: ' + res.reasons[0]
      else res.reasons.push('STOPPED: opening reserved, outcome unknown')
    }
    res.seconds = +((Date.now() - t0) / 1000).toFixed(1); res.notes = notes.join('; ')
    mkdirSync(o.out, { recursive: true }); writeFileSync(join(o.out, `${id}.json`), JSON.stringify(res, null, 1) + '\n'); return res
  }
  const dd = engine('dedupe', 'check', row.company, row.role, row.link)
  if (dd.code !== 0) {
    res.route = 'script'
    if (dd.code !== 2) { res.outcome = 'held'; res.reasons.push(`STOPPED: dedupe check exited ${dd.code}`) }
    else if (/RESERVED/.test(dd.out)) { res.outcome = 'held'; res.reasons.push('STOPPED: an earlier run reserved this opening') }
    else res.outcome = 'already_applied'
    return fin()
  }
  const notInterested = /^NOT INTERESTED:/.test(o.triage)
  const ctx = await launch(true)
  let closing = false
  const close = async () => { if (closing) return; closing = true; await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 15_000))]) }
  const overall = setTimeout(async () => { res.reasons.push('overall timeout'); await close(); fin(); process.exit(3) }, 420_000)
  try {
    const page = ctx.pages()[0] ?? (await ctx.newPage())
    await gotoInbox(page)
    // find the card by key under each chip
    let n = -1
    for (const chip of CHIPS) {
      await openChip(page, chip)
      n = (await keysOf(page)).findIndex((k) => k.key === row.key)
      if (n >= 0) { if ((await keysOf(page))[n].answered) throw new Stop('the card shows You shared interest', 'already_applied', { route: 'script' }); break }
    }
    if (n < 0) throw new Stop('invite no longer on the page', 'failed', { closed: true, route: 'script' })
    const { drawer, text } = await openDrawer(page, n)
    if (!either(text, row.role)) throw new Stop('FOCUS COLLISION DETECTED: the drawer does not name the role', 'held', { route: 'script' })
    for (const b of await drawer.getByRole('button').allInnerTexts().catch(() => [])) if (/^(apply|not interested)$/i.test(b.trim())) res.drawer_buttons.push(b.trim())
    res.plan = notInterested ? 'not_interested' : 'apply'
    // an email ask goes to the applier, which files the email finding. The address is never read into the result.
    const mailAsk = /[\w.+-]+@(?!(?:[\w-]+\.)*naukri\.com)[\w-]+\.\w/.test(text) && /\b(mail|send|share|forward|write)\b[^.\n]{0,60}\b(resume|cv|profile|details)\b|\b(resume|cv|profile|details)\b[^.\n]{0,60}\b(mail|send|share|forward)\b/i.test(text)
    res.route = 'script'
    if (!o.press) { res.outcome = 'stopped_before_submit'; notes.push(`would ${notInterested ? 'press Not interested' : 'press Apply'}; a questions or resume panel shows only after the press`); if (mailAsk) notes.push('JD asks for an email'); return res }
    if (mailAsk) throw new Stop('the JD asks for an email: the applier files the email finding', 'held', { route: 'fallback' })
    const press1 = async (name: RegExp) => {
      const b = drawer.getByRole('button', { name }).or(drawer.getByText(name)).first()
      if (!(await b.count())) throw new Stop(`no ${name.source} control in the drawer`)
      const c0 = clicks
      await press(page, b)
      return clicks > c0
    }
    const waitAnswered = async (ms: number) => { for (let w = 0; w < ms / 500; w++) { await page.waitForTimeout(500); if (await answeredNow(page, row.key)) return true } return false }

    if (notInterested) {
      await press1(/^not interested$/i)
      if (await waitAnswered(12_000)) { res.outcome = 'declined'; notes.splice(0, notes.length, o.triage); return res }
      // GUESS: a reason picker shows as radios or a list; the script picks nothing
      throw new Stop('Not interested did not settle: the page may ask for a reason')
    }

    const rsv = engine('dedupe', 'reserve', '--id', id, '--company', row.company, '--role', row.role, '--link', row.link, '--channel', 'direct', '--source', 'naukri')
    if (rsv.code !== 0) throw new Stop(rsv.code === 2 ? 'STOPPED: opening already reserved or spent' : `STOPPED: dedupe reserve exited ${rsv.code}`, 'held')
    reserved = true
    clearTimeout(overall) // nothing may exit between the click and the record
    const c0 = clicks
    try { await press1(/^apply$/i) } catch (e) { if (clicks === c0) { engine('dedupe', 'unreserve', '--id', id, '--reason', 'the Apply click was never sent'); reserved = false } throw e }
    // success: the card reads You shared interest. Otherwise a panel may open.
    const savePanel = () => page.getByRole('button', { name: /^save$/i }).or(page.getByText(/^Save$/)).first()
    let ok = false
    for (let round = 0; round < 6 && !ok; round++) {
      if (await waitAnswered(round === 0 ? 8000 : 4000)) { ok = true; break }
      const save = savePanel()
      if (!(await save.isVisible().catch(() => false))) {
        if (await page.locator('input[type=file]').count()) throw new Stop('a resume panel opened: not mapped, the applier takes it')
        throw new Stop('no success state and no questions panel')
      }
      await save.evaluate((el) => {
        document.querySelectorAll('[data-nk-panel]').forEach((x) => x.removeAttribute('data-nk-panel'))
        let a = el as HTMLElement
        while (a.parentElement && a.parentElement !== document.body && !a.querySelector('input, textarea, select')) a = a.parentElement
        a.setAttribute('data-nk-panel', '1')
      })
      const panel = page.locator('[data-nk-panel]').first()
      const fields = (await readPanel(panel)).filter((f) => f.label)
      if (!fields.length) throw new Stop('a panel with a Save button but no readable question')
      res.questions.push(...fields.map((f) => ({ label: f.label, kind: f.kind })))
      const r = await answerQuestions({ company: row.company, role: row.role }, fields.map(({ key, label, kind, required, value, options }) => ({ key, label, kind, required, value, options })))
      res.llm_calls += r.usage.calls; res.llm_tokens += r.usage.tokens
      if (r.failed) throw new Stop('ANSWERS NEEDED: the model call failed')
      if (r.malformed) throw new Stop('MODEL REPLY MALFORMED')
      const held: string[] = []
      for (const f of fields) {
        const isPay = PAY_LABEL.test(f.label)
        let a: Answer = r.answers[f.key] ?? { action: 'hold', reason: 'no answer given' }
        if (isPay && a.action !== 'pay' && a.action !== 'hold') a = { action: 'hold', reason: 'a pay or notice question may only be answered with pay' }
        if (!isPay && a.action === 'pay') a = { action: 'hold', reason: 'pay action on a field that is not a pay question' }
        if (a.action === 'hold') { held.push(f.label); res.reasons.push(`question: ${f.label} (${a.reason.slice(0, 120)})`); continue }
        if (a.action === 'keep') continue
        let value: string
        try { value = a.action === 'pay' ? payValue(a.key) : a.value } catch { throw new Stop('ERROR: reading a pay value failed') }
        if (a.action === 'pay' && !/^\d+(\.\d+)?$/u.test(value)) throw new Stop('pay value is not numeric')
        try { await fillField(panel, f, value, isPay) } catch (e) { throw isPay && !(e instanceof Stop) ? new Stop('ERROR: filling a pay answer failed') : e }
        res.answers.push({ label: f.label, kind: f.kind, action: a.action, value: isPay ? 'filled, not shown' : value })
      }
      if (held.length) throw new Stop('screening questions the bank cannot answer', 'held', { question: held.join(' | '), reasons: res.reasons })
      const s2 = savePanel()
      for (let w = 0; w < 10 && !(await s2.isEnabled().catch(() => false)); w++) await page.waitForTimeout(500)
      if (!(await s2.isEnabled().catch(() => false))) throw new Stop('Save stayed disabled after the answers')
      await press(page, s2)
    }
    if (!ok) throw new Stop('the questions panel did not finish in 6 rounds')
    res.outcome = 'applied'; res.applied_date = ist().slice(0, 10)
    const rec = engine('dedupe', 'record', '--source', 'naukri', '--company', row.company, '--role', row.role, '--link', row.link, '--channel', 'direct', '--role-file', `my-sessions/ledger/roles/${id}.md`)
    if (rec.code !== 0) notes.push('RECORD FAILED')
    reserved = false
    return res
  } catch (e) {
    const s = e instanceof Stop ? e : new Stop('ERROR: ' + (e as Error).message.split('\n')[0])
    Object.assign(res, { outcome: s.outcome, route: 'fallback' }, s.extra)
    if (!s.extra.reasons) res.reasons.push(s.message)
    // runner step 7: close the panel, reload, and unreserve only when the card still shows no answer
    if (reserved && !wallSeen) {
      try {
        const pg = ctx.pages()[0]
        await pg.keyboard.press('Escape').catch(() => {})
        await gotoInbox(pg)
        for (const chip of CHIPS) { if (await openChip(pg, chip).catch(() => false)) { const k = (await keysOf(pg)).find((x) => x.key === row.key); if (k) { if (!k.answered) { engine('dedupe', 'unreserve', '--id', id, '--reason', s.message.slice(0, 150)); reserved = false } break } } }
      } catch { notes.push('WARNING: reload check threw, the reservation stays') }
    }
    return res
  } finally {
    clearTimeout(overall)
    try { await close() } finally {
      if (wallSeen && !res.reasons.some((r) => /SECURITY STOP|SIGNED OUT/.test(r))) res.reasons.push(wallSeen === 'security' ? 'SECURITY STOP: seen during clean-up' : 'SIGNED OUT during clean-up')
      fin()
    }
  }
}

// ---- hunt ------------------------------------------------------------------------------------------------------

const first = (s: string) => s.split('\n')[0]
const walled = (why: string) => /SECURITY STOP|SIGNED OUT/.test(why)

// The sweep of a live /hunt in one call: stdout ends in one NK-SWEEP line. The sweep JSON is staged only on success.
async function huntSweep(S: string): Promise<number> {
  const eng = (...a: string[]) => engine('--session', S, ...a)
  const out = (s: string) => console.log(s)
  const s0 = eng('session', 'started', 's-naukri')
  if (s0.code !== 0) { out(`NK-SWEEP fallback session started failed: ${first(s0.out)}`); return 0 }
  const work = join(S, '.nk', 'sweep')
  rmSync(work, { recursive: true, force: true })
  const code = await sweep(work, C.ROLES)
  let sum: { kept?: number; reason?: string } = {}
  try { sum = JSON.parse(readFileSync(join(work, 'naukri-sweep-summary.json'), 'utf8')) } catch { /* no summary: fall back below */ }
  if (code === 4 || code === 5) {
    const why = code === 4 ? 'security check' : 'signed out'
    eng('session', 'sweep', 'naukri', 'status=failed', 'reason=login wall')
    eng('finding', 'add', '--json', JSON.stringify({ kind: 'blocked', stage: 'sweep', id: '-', summary: `Naukri sweep stopped: ${why}`, proposed: { reason: `the Naukri sweep met a ${why}`, action_for_candidate: code === 5 ? 'run: node process/tools/naukri.ts login' : 'sign in to Naukri in the pinned Chrome yourself and clear the check' } }))
    out(`NK-SWEEP ${code === 4 ? 'security' : 'signed-out'}`); return 0
  }
  const files = existsSync(work) ? readdirSync(work).filter((f) => /-naukri-1\.json$/.test(f)) : []
  if (code !== 0 || files.length !== 1 || typeof sum.kept !== 'number') { out(`NK-SWEEP fallback ${sum.reason || 'sweep exited ' + code}`.slice(0, 200)); return 0 }
  mkdirSync(join(S, '.stage/sweep'), { recursive: true })
  copyFileSync(join(work, files[0]), join(S, '.stage/sweep', files[0]))
  eng('session', 'sweep', 'naukri', `query=${CHIPS.join(' + ')}`, 'pages=1', `kept=${sum.kept}`)
  eng('session', 'sweep', 'naukri', 'status=ok')
  out(`NK-SWEEP ok ${sum.kept}`)
  return 0
}

// Apply or Not interested comes from the row's triage reason: the triage JSON first, then the ledger note, as the applier reads it.
// undefined means no triage was found, and the caller must not press anything.
function triageReason(S: string, id: string): string | undefined {
  for (const d of [join(S, '.stage/triage/done'), join(S, '.stage/triage')]) {
    if (!existsSync(d)) continue
    for (const f of readdirSync(d).filter((n) => n.endsWith('.json') && n.includes(id)).sort().reverse()) {
      try { const j = JSON.parse(readFileSync(join(d, f), 'utf8')); if (j.id === id && typeof j.reason === 'string') return j.reason } catch { /* next file */ }
    }
  }
  const notes = readDicts(readFileSync(C.PROSPECTS, 'utf8')).rows.find((x) => x['id'] === id)?.['notes'] ?? ''
  const m = [...notes.matchAll(/triage: ([^|]*)/gu)]
  return m.length ? m[m.length - 1][1].trim() : undefined
}

// One invite from a live /hunt: bookkeeping is done here, and stdout holds NK-RESULT and NK-OFF lines. Only an applied or declined result is staged.
async function hunt(id: string, S: string, line: string): Promise<number> {
  const eng = (...a: string[]) => engine('--session', S, ...a)
  const out = (s: string) => console.log(s)
  const s0 = eng('session', 'started', 'a-' + id)
  if (s0.code !== 0) { out(`NK-RESULT fallback ${id} session started failed: ${first(s0.out)}`); return 0 }
  const dir = join(S, '.nk'), off = join(dir, 'script-off')
  mkdirSync(dir, { recursive: true })
  if (existsSync(off)) { const why = first(readFileSync(off, 'utf8')); out(`NK-RESULT fallback ${id} ${why}`); out(`NK-OFF ${why}`); return 0 }
  const triage = triageReason(S, id)
  if (triage === undefined) { out(`NK-RESULT fallback ${id} no triage found`); return 0 }
  if (!line?.trim()) { out(`NK-RESULT fallback ${id} no go-ahead line`); return 0 }
  if (eng('session', 'log', `a-${id}: naukri press under go-ahead: ${line}`).code !== 0) { out(`NK-RESULT fallback ${id} go-ahead log failed`); return 0 }
  let res: Res | undefined
  try { res = await apply(id, { out: dir, press: true, triage }) } catch (e) { console.error('apply threw: ' + (e as Error).message.split('\n')[0]) }
  const why = res?.reasons[0] ?? 'no result'
  if (res && res.reasons.some(walled)) {
    const lapsed = res.reasons.some((r) => /SIGNED OUT/.test(r))
    const msg = lapsed ? "the script's Chrome profile is signed out; run node process/tools/naukri.ts login" : 'Naukri showed a security check'
    writeFileSync(off, msg + '\n')
    eng('finding', 'add', '--json', JSON.stringify({ kind: 'blocked', stage: 'apply', id, summary: lapsed ? 'Naukri script is signed out' : 'Naukri security check', proposed: { reason: msg, action_for_candidate: lapsed ? 'run: node process/tools/naukri.ts login' : 'sign in to Naukri in the pinned Chrome yourself and clear the check' } }))
    // a held row with a reservation keeps its STOPPED reason, as R6 says; otherwise the runner's ACCOUNT reason leads
    if (res.outcome !== 'applied' && !/^STOPPED:/.test(why)) res.reasons.unshift('ACCOUNT: Naukri session lapsed')
    res.outcome = res.outcome === 'applied' ? 'applied' : 'held'; res.route = 'script'
    mkdirSync(join(S, '.stage/apply'), { recursive: true })
    writeFileSync(join(S, '.stage/apply', `${id}.json`), JSON.stringify(res, null, 1) + '\n')
    out(`NK-RESULT security ${id} ${res.reasons[0]}`); out(`NK-OFF ${msg}`); return 0
  }
  if (!res || !(res.outcome === 'applied' || res.outcome === 'declined') || res.dry_run) { out(`NK-RESULT fallback ${id} ${why}`); return 0 }
  try {
    const row = loadPlan(id)
    const body = [res.outcome === 'applied' ? 'submitted' : 'declined', ...res.answers.map((a) => `${a.label} [${a.kind}, ${a.action}]: ${a.value}`), ...res.reasons.map((r) => 'reason: ' + r), res.notes && 'notes: ' + res.notes].filter(Boolean).join('\n')
    const r = spawnSync('node', [join(C.PROCESS, 'engine.ts'), '--session', S, 'session', 'send', 'add', '--id', id, '--kind', 'application', '--title', `${row.company}, ${row.role}, naukri`, '--body-file', '-'], { cwd: C.REPO, encoding: 'utf8', input: body })
    if (r.status !== 0) res.notes += '; send add FAILED'
  } catch (e) { res.notes += '; bookkeeping threw: ' + (e as Error).message.split('\n')[0] }
  // the commit point: nothing after this may fail the row
  mkdirSync(join(S, '.stage/apply'), { recursive: true })
  writeFileSync(join(S, '.stage/apply', `${id}.json`), JSON.stringify(res, null, 1) + '\n')
  out(`NK-RESULT staged ${id} ${res.outcome} ${res.reasons[0] ?? 'clean'}`)
  return 0
}

async function main(argv: string[]): Promise<number> {
  const [cmd, arg] = argv
  const val = (n: string) => argv[argv.indexOf(n) + 1]
  if (cmd === 'login') return login()
  if (cmd === 'hunt-sweep' && argv.includes('--session')) {
    if (!existsSync(val('--session'))) { console.error('usage: the session folder does not exist: ' + val('--session')); return 2 }
    return huntSweep(val('--session'))
  }
  if (cmd === 'hunt' && arg && argv.includes('--session') && argv.includes('--go-ahead')) {
    if (!existsSync(val('--session'))) { console.error('usage: the session folder does not exist: ' + val('--session')); return 2 }
    return hunt(arg, val('--session'), val('--go-ahead'))
  }
  if (cmd === 'sweep' && argv.includes('--out')) return sweep(val('--out'))
  if (cmd === 'apply' && arg && argv.includes('--out')) {
    const r = await apply(arg, { out: val('--out'), press: argv.includes('--press'), triage: argv.includes('--triage-reason') ? val('--triage-reason') : '' })
    console.log(JSON.stringify(r, null, 1))
    const why = r.reasons.join()
    if (/SECURITY STOP/.test(why)) { console.error('SECURITY STOP. Tell the candidate; never retry.'); return 4 }
    return /SIGNED OUT/.test(why) ? 5 : 0
  }
  console.error('usage: naukri.ts login | hunt-sweep --session <S> | hunt <row-id> --session <S> --go-ahead "<line>" | sweep --out <dir> | apply <row-id> --out <dir> [--press] [--triage-reason "<matcher reason>"]')
  return 2
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(await main(process.argv.slice(2)))
