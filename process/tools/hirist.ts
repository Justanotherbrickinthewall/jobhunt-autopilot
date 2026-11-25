// The hirist lane without the sweep-source and applier agents: code reads the search cards and job pages, and presses Apply.
// `sweep` is read-only. `apply` presses only with --press. It makes no model call, because Apply is one button with no form.
// Selectors the runner does not name are guesses. Each is marked GUESS, so a first run that fails points at it.
import { cpus, tmpdir } from 'node:os'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { chromium, type Locator, type Page } from 'playwright-core'
import * as C from '../constants.ts'
import { readDicts } from '../lib/csv.ts'
import { engine } from './ea-apply.ts'

const PROFILE = join(C.REPO, '.playwright/hirist')
const BASE = 'https://www.hirist.tech'
const APPLIED = BASE + '/applied-jobs'
const PAGES_MAX = 5 // the runner's cap per query
const PAGE_SIZE = 20 // the runner's cards per page
const LITTLE = 10 // GUESS: the runner says "when the primaries return little". Under this many distinct cards from the primaries adds the rotation.
const BUDGET_MS = 350_000 // the parent's Bash call has 480 s, so the sweep stops reading new pages at 350 s and writes what it has

// shortcut: copied from ea-apply.ts, move to a shared module when a third script needs it
function launch(headless: boolean) {
  let executablePath: string | undefined
  if (process.platform === 'darwin' && process.arch === 'x64' && cpus()[0]?.model.startsWith('Apple')) {
    executablePath = join(tmpdir(), 'hirist-chrome-arm64.sh')
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

type Res = {
  id: string; outcome: string; applied_date: string | null; ledger_key: string; reasons: string[]; question: string | null; closed: boolean; notes: string
  route: 'script' | 'fallback'; dry_run: boolean; plan: string; seconds: number
}

// shortcut: copied from naukri.ts, move to a shared module when a third script needs it
class Stop extends Error {
  outcome: string; extra: Partial<Res>
  constructor(msg: string, outcome = 'failed', extra: Partial<Res> = {}) { super(msg); this.outcome = outcome; this.extra = extra }
}
const settle = <T>(p: Promise<T>, ms: number): Promise<T | 'PENDING'> => Promise.race([p, new Promise<'PENDING'>((r) => setTimeout(() => r('PENDING'), ms))])
const ist = (offsetMs = 0) => new Date(Date.now() + 5.5 * 3600_000 + offsetMs).toISOString()
// the JD and card samples never keep an email address or a phone number
const scrub = (s: string) => s.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email removed]').replace(/\+?\d[\d\s().-]{8,}\d/g, '[number removed]')
const nrm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '')
const either = (x: string, y: string) => !!nrm(x) && !!nrm(y) && (nrm(x).includes(nrm(y)) || nrm(y).includes(nrm(x)))
const first = (s: string) => s.split('\n')[0]
const walled = (why: string) => /SECURITY STOP|SIGNED OUT/.test(why)
const idOf = (link: string) => /^https:\/\/www\.hirist\.tech\/j\/[^/?#]+-(\d+)$/.exec(link)?.[1]

// ---- walls -----------------------------------------------------------------------------------------------------

type Wall = 'security' | 'signedout'
let wallSeen: Wall | null = null
// GUESS: the login path names, the captcha and OTP selectors and the block-page titles.
// Search and JD pages are public, so a signed-out profile is no wall by itself. A redirect to a sign-in page is.
async function wall(p: Page): Promise<Wall | null> {
  const u = new URL(p.url())
  if (/^\/(login|signin|sign-in|register)\b/i.test(u.pathname) || /^(login|accounts?)\./i.test(u.hostname)) return 'signedout'
  const vis = async (sel: string) => { const l = p.locator(sel).first(); return (await l.count().catch(() => 0)) > 0 && (await l.isVisible().catch(() => false)) }
  if (await vis('iframe[src*="bframe"], iframe[src*="hcaptcha" i], iframe[src*="recaptcha" i], iframe[title*="challenge" i]')) return 'security'
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
async function go(p: Page, url: string) {
  await p.goto(url, { waitUntil: 'domcontentloaded' })
  await checkWall(p)
}
const bodyText = (p: Page) => p.evaluate(() => document.body.innerText).catch(() => '')

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

// ---- login -----------------------------------------------------------------------------------------------------

// One window, headed. The candidate types their own credentials and closes the window when signed in. The script types nothing.
async function login(): Promise<number> {
  const ctx = await launch(false)
  const page = ctx.pages()[0] ?? (await ctx.newPage())
  await page.goto(BASE + '/login') // GUESS: the login path
  console.log('Sign in in the Chrome window, then close the window. Waiting up to 10 minutes.')
  const closed = await settle(new Promise<void>((r) => ctx.on('close', () => r())), 600_000)
  if (closed === 'PENDING') await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 15_000))])
  console.log(closed === 'PENDING' ? 'Timed out. The window was closed.' : 'Window closed. Run apply without --press to check the session.')
  return closed === 'PENDING' ? 1 : 0
}

// ---- cards and job pages ---------------------------------------------------------------------------------------

type Card = { id: string; link: string; title: string; exp: string; location: string; pay: string; age: string; wfh: boolean; lines: string[] }

// GUESS: a card is the nearest ancestor of a /j/ link that holds no other /j/ link. Course adverts have no /j/ link and drop out.
async function readCards(p: Page): Promise<Card[]> {
  const raw = await p.evaluate(() => {
    const out: { path: string; title: string; lines: string[] }[] = []
    const seen = new Set<string>()
    const paths = (e: Element) => new Set(Array.from(e.querySelectorAll('a[href*="/j/"]')).map((a) => new URL((a as HTMLAnchorElement).href, location.href).pathname))
    for (const a of Array.from(document.querySelectorAll('a[href*="/j/"]')) as HTMLAnchorElement[]) {
      const u = new URL(a.href, location.href)
      if (!u.pathname.startsWith('/j/') || !/(^|\.)hirist\.tech$/.test(u.hostname) || seen.has(u.pathname)) continue
      seen.add(u.pathname)
      let c: HTMLElement = a
      for (let d = 0; d < 6 && c.parentElement && c.parentElement !== document.body && paths(c.parentElement).size === 1; d++) c = c.parentElement
      out.push({ path: u.pathname, title: a.innerText.split('\n')[0].trim(), lines: c.innerText.split('\n').map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean) })
    }
    return out
  })
  const cards: Card[] = []
  for (const r of raw) {
    const id = /-(\d+)$/.exec(r.path)?.[1]
    if (!id) continue
    const text = r.lines.join('\n')
    const m = (re: RegExp) => re.exec(text)?.[1]?.trim() ?? ''
    const e = r.lines.findIndex((x) => /^\d+\s*-\s*\d+\s*yrs?$/i.test(x))
    cards.push({
      id, link: BASE + r.path, title: r.title || r.lines[0] || '', exp: m(/^(\d+\s*-\s*\d+\s*yrs?)$/im), location: e >= 0 ? r.lines[e + 1] ?? '' : '',
      pay: m(/^([\d.]+\s*-\s*[\d.]+\s*LPA)$/im), age: m(/(posted\s+.+?ago|posted\s+(?:today|yesterday))/i), wfh: /may work from home/i.test(text), lines: r.lines,
    })
  }
  return cards
}

function postedAt(age: string): string {
  const m = /(\d+)\s*(min|hour|day|week|month)/i.exec(age)
  if (!m) return /today/i.test(age) ? ist().slice(0, 10) : /yesterday/i.test(age) ? ist(-86_400_000).slice(0, 10) : ''
  const n = Number(m[1]), u = m[2].toLowerCase()
  if (u === 'min' || u === 'hour') return ist(-n * (u === 'hour' ? 3_600_000 : 60_000)).slice(0, 16)
  return ist(-n * 86_400_000 * (u === 'week' ? 7 : u === 'month' ? 30 : 1)).slice(0, 10)
}

const findKey = (o: unknown, k: string): unknown => {
  if (!o || typeof o !== 'object') return undefined
  if (k in (o as object)) return (o as Record<string, unknown>)[k]
  for (const v of Object.values(o as object)) { const r = findKey(v, k); if (r !== undefined) return r }
  return undefined
}
const names = (x: unknown): string => Array.isArray(x) ? x.map((e) => (e && typeof e === 'object' ? String((e as { name?: unknown }).name ?? '') : String(e))).filter(Boolean).join(', ') : typeof x === 'string' ? x : ''

const htmlText = (h: string) => h.replace(/<\/(p|div|li|ul|ol|h\d|tr)>|<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&')
  .split('\n').map((x) => x.trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim()

type Job = { title: string; company: string; location: string; exp: string; tags: string; jd: string; postedOn: string; closed: boolean; nextData: boolean; miss: string }

// Opens one /j/ page, reads the fields from __NEXT_DATA__ and the JD from the rendered text.
// GUESS: the JD is the text from "Job Description" to "Last Active", with the poster's name and title as the last two lines before it.
async function readJob(p: Page, link: string): Promise<Job> {
  const calls: string[] = []
  const onResp = (r: import('playwright-core').Response) => { const ct = r.headers()['content-type'] ?? ''; if (ct.includes('json') && calls.length < 12) calls.push(r.status() + ' ' + r.url().slice(0, 160)) }
  p.on('response', onResp)
  await go(p, link)
  await p.waitForFunction(() => { const t = document.body.innerText; return t.length > 1500 || /last active|similar jobs|posted on/i.test(t) }, undefined, { timeout: 20_000 }).catch(() => {})
  const j: Job = { title: '', company: '', location: '', exp: '', tags: '', jd: '', postedOn: '', closed: false, nextData: false, miss: '' }
  try {
    const raw = await p.evaluate(() => document.getElementById('__NEXT_DATA__')?.textContent ?? '')
    const m = findKey(JSON.parse(raw), 'jobMandateInfo') as Record<string, unknown> | undefined
    if (m) {
      j.nextData = true
      j.title = String(m['jobTitle'] ?? ''); j.company = String(m['companyName'] ?? ''); j.location = names(m['location']); j.tags = names(m['jobTags'])
      j.exp = m['expMin'] !== undefined && m['exp'] !== undefined ? `${m['expMin']} - ${m['exp']} yrs` : ''
    }
  } catch { /* the page text below is the only source */ }
  // seen 26 Nov: gladiator.hirist.tech/job/detail?jobcode=<id> answers JSON with no auth. data.introText is the JD as HTML.
  try {
    const id = /-(\d+)$/.exec(link)?.[1]
    const r = id ? await p.context().request.get(`https://gladiator.hirist.tech/job/detail?jobcode=${id}`, { headers: { referer: BASE + '/' }, timeout: 15_000 }) : null
    const d = r?.ok() ? ((await r.json()) as { data?: Record<string, unknown> }).data : undefined
    if (d && typeof d['introText'] === 'string') {
      const loc = (d['locations'] ?? d['location']) as unknown
      const cd = d['companyData'] as Record<string, unknown> | undefined
      j.jd = htmlText(d['introText'])
      j.title ||= String(d['title'] ?? ''); j.company ||= String(cd?.['companyName'] ?? ''); j.location ||= names(loc) // seen 26 Nov
      if (!j.exp && d['min'] !== undefined && d['max'] !== undefined) j.exp = `${d['min']} - ${d['max']} yrs` // seen 26 Nov
      if (!j.postedOn && typeof d['createdTime'] === 'number') j.postedOn = new Date(d['createdTime'] + 19_800_000).toISOString().slice(0, 10) // seen 26 Nov
      if (d['hasExpired'] === true || d['permanentlyRemoved'] === true) j.closed = true // seen 26 Nov
    }
  } catch { /* the rendered page below is the fallback */ }
  const text = await bodyText(p)
  j.closed = j.closed || /this job was unpublished|no longer accepting|job (has been )?(closed|removed|expired)/i.test(text)
  const d = /Posted on:?\s*(\d{2})\/(\d{2})\/(\d{4})/.exec(text)
  if (d) j.postedOn = `${d[3]}-${d[2]}-${d[1]}`
  // innerText follows CSS text-transform, so the heading may arrive in capitals
  const hd = j.jd ? null : /job description/i.exec(text)
  const start = hd ? hd.index : -1
  if (start >= 0) {
    let body = text.slice(start + (hd ? hd[0].length : 0))
    const stops = [body.search(/Last Active/i), body.search(/Similar Jobs/i)].filter((i) => i >= 0)
    const cut = stops.length ? Math.min(...stops) : -1
    if (cut >= 0) {
      body = body.slice(0, cut)
      const ls = body.split('\n').map((x) => x.trim()).filter(Boolean)
      // the poster's name and title sit just above Last Active, and the runner says never to copy them
      if (/Last Active/i.test(text.slice(start)) && ls.length > 2 && ls.slice(-2).every((x) => x.length < 60)) body = ls.slice(0, -2).join('\n')
    }
    j.jd = body.trim()
  }
  p.off('response', onResp)
  if (!j.jd) j.miss = text.slice(0, 800) + '\nCALLS: ' + calls.join(' ; ')
  return j
}

// The runner's company rule: a title prefix that is not a role wins, else the page header, else a placeholder.
const ROLE_WORD = /engineer|developer|architect|manager|lead|analyst|scientist|consultant|specialist|designer|intern|sde|sre|devops|head|director|executive/i
function nameRow(cardTitle: string, j: Job): { company: string; role: string; note: string } {
  const title = j.title || cardTitle
  const pre = /^(.{2,60}?)\s+-\s+(.+)$/.exec(title)
  if (pre && !ROLE_WORD.test(pre[1])) return { company: pre[1].trim(), role: pre[2].trim(), note: j.company && !either(pre[1], j.company) ? `page header names ${j.company}` : '' }
  if (pre && j.company && either(pre[1], j.company)) return { company: j.company, role: pre[2].trim(), note: '' }
  return { company: j.company || 'Client not named (Hirist)', role: title.trim(), note: j.company ? 'company read from the page header, which may be a staffing firm' : '' }
}

const searchUrl = (term: string, n: number) => {
  const w = term.replace(/"/g, '').trim().split(/\s+/).filter(Boolean).join('+') // GUESS: the path part joins words with + as the query does
  return `${BASE}/search/${w}-jobs?query=${w}&minexp=0&maxexp=0&loc=&sort=&page=${n}&industry=&posting=7`
}

// ---- sweep -----------------------------------------------------------------------------------------------------

// `out` holds the sweep JSON and the summary. The JD files go to `jdDir`, which the matcher reads. `hunt-sweep` passes the ledger's roles folder.
async function sweep(out: string, jdDir = out): Promise<number> {
  mkdirSync(out, { recursive: true }); mkdirSync(jdDir, { recursive: true })
  const t0 = Date.now()
  const over = () => Date.now() - t0 > BUDGET_MS
  const stats = { cards_seen: 0, spent: 0, kept: 0, no_jd: 0, closed: 0, no_next_data: 0, truncated: false }
  const perQuery: { q: string; pages: number; kept: number }[] = []
  const diag: { card_sample: string[][]; jd_chars: number[]; header_vs_title: string[]; miss_sample: string[] } = { card_sample: [], jd_chars: [], header_vs_title: [], miss_sample: [] }
  const rows: Record<string, unknown>[] = []
  const seen = new Set<string>()
  const firing = ist().slice(0, 13).replace('T', '-')
  const conf = C.cfg()
  const ctx = await launch(true)
  let closing = false
  const close = async () => { if (closing) return; closing = true; await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 15_000))]) }
  const done = (status: string, reason: string) => {
    writeFileSync(join(out, 'hirist-sweep-summary.json'), JSON.stringify({ status, reason, firing, seconds: +((Date.now() - t0) / 1000).toFixed(1), ...stats, perQuery, diag }, null, 1) + '\n')
    console.log(`${status}${reason ? ': ' + reason : ''}. cards seen ${stats.cards_seen}, spent ${stats.spent}, kept ${stats.kept}, closed ${stats.closed}, without JD ${stats.no_jd}${stats.truncated ? ', stopped at the time budget' : ''}`)
  }
  const overall = setTimeout(async () => { done('failed', 'overall timeout'); await close(); process.exit(3) }, 460_000)
  try {
    const page = ctx.pages()[0] ?? (await ctx.newPage())
    const runQuery = async (q: string) => {
      const rec = { q, pages: 0, kept: 0 }
      perQuery.push(rec)
      for (let n = 0; n < PAGES_MAX && !over(); n++) {
        await go(page, searchUrl(q, n))
        await page.waitForSelector('a[href*="/j/"]', { timeout: 15_000 }).catch(() => {}) // an empty page ("No result found") is not a failure
        const cards = await readCards(page)
        rec.pages++
        if (n === 0 && diag.card_sample.length < 2 && cards[0]) diag.card_sample.push(cards[0].lines.map(scrub))
        for (const c of cards) {
          if (seen.has(c.id)) continue
          seen.add(c.id); stats.cards_seen++
          if (over()) { stats.truncated = true; break }
          const pre = nameRow(c.title, { title: '', company: '', location: '', exp: '', tags: '', jd: '', postedOn: '', closed: false, nextData: false, miss: '' })
          if (engine('dedupe', 'check', pre.company, pre.role, c.link).code === 2) { stats.spent++; continue }
          const j = await readJob(page, c.link)
          if (j.closed) { stats.closed++; continue }
          if (!j.nextData) stats.no_next_data++
          const nm = nameRow(c.title, j)
          if (engine('dedupe', 'check', nm.company, nm.role, c.link).code === 2) { stats.spent++; continue }
          if (j.jd) { diag.jd_chars.push(j.jd.length); writeFileSync(join(jdDir, `hirist-${c.id}.jd.md`), `<!-- source: ${c.link}, read ${ist().slice(0, 10)} -->\n${scrub(j.jd)}\n`) } else { stats.no_jd++; if (diag.miss_sample.length < 2) diag.miss_sample.push(j.miss) }
          if (nm.note && diag.header_vs_title.length < 5) diag.header_vs_title.push(`${c.title} | ${j.company} | ${nm.note}`)
          const exp = c.exp || j.exp
          rows.push({
            source: 'hirist', channel: 'direct', company: nm.company, role: nm.role, location: j.location || c.location, link: c.link, drop_reason: null,
            salary_band: c.pay, salary_period: c.pay ? 'yearly' : '', posted_at: j.postedOn || postedAt(c.age),
            notes: [exp && `experience ${exp}`, c.wfh && 'May work from home', nm.note, !j.jd && 'JD not read'].filter(Boolean).join('; '),
          })
          stats.kept++; rec.kept++
          await page.waitForTimeout(800)
        }
        if (cards.length < PAGE_SIZE || stats.truncated) break
        await page.waitForTimeout(1200)
      }
    }
    for (const q of conf.search_primary) await runQuery(q)
    if (stats.cards_seen < LITTLE) for (const q of conf.search_rotation) await runQuery(q)
    if (over()) stats.truncated = true
    if (!stats.cards_seen) throw new Stop('no cards read from any query (empty results or a changed page)')
    writeFileSync(join(out, `${firing}-hirist-1.json`), JSON.stringify({ source: 'hirist', firing, queries: perQuery.map((x) => x.q), rows }, null, 1) + '\n')
    done('ok', '')
    return 0
  } catch (e) {
    const reason = e instanceof Stop ? e.message : 'ERROR: ' + (e as Error).message.split('\n')[0]
    done('failed', reason)
    if (wallSeen && jdDir === out) console.log(`Record it: node process/engine.ts --session <S> session sweep hirist status=failed reason="login wall"`)
    return wallSeen === 'security' ? 4 : wallSeen === 'signedout' ? 5 : 1
  } finally { clearTimeout(overall); await close() }
}

// ---- apply -----------------------------------------------------------------------------------------------------

type Plan = { id: string; company: string; role: string; link: string; key: string; variant: string }
function loadPlan(id: string): Plan {
  const r = readDicts(readFileSync(C.PROSPECTS, 'utf8')).rows.find((x) => x['id'] === id)
  if (!r) throw new Error(`no prospects row ${id}`)
  const link = r['link'] ?? ''
  const key = idOf(link)
  if (!key) throw new Error(`row ${id} has no Hirist job id in its link`)
  return { id, company: r['company'] ?? '', role: r['role'] ?? '', link, key, variant: r['resume_variant'] ?? '' }
}

// The runner's guard: the applied-jobs page lists the title and company of every application.
async function listed(p: Page, row: Plan): Promise<boolean> {
  await go(p, APPLIED)
  if (new URL(p.url()).pathname !== '/applied-jobs') { wallSeen = 'signedout'; throw new Stop('SIGNED OUT: applied-jobs redirected to ' + new URL(p.url()).pathname) }
  await p.waitForTimeout(2500)
  const t = nrm(await bodyText(p))
  return t.includes(nrm(row.role)) && (/^client not named/i.test(row.company) || t.includes(nrm(row.company)))
}

// Reads the stored resume line without touching the page. GUESS: a line that ends in a file extension, and a date on it or the line after.
async function storedResume(p: Page): Promise<string> {
  try {
    await go(p, BASE + '/registration/addPersonalDetails')
    await p.waitForTimeout(3000)
    const ls = (await bodyText(p)).split('\n').map((x) => x.trim()).filter(Boolean)
    const i = ls.findIndex((x) => /\.(pdf|docx?|rtf)\b/i.test(x))
    if (i < 0) return 'hirist resume: not read'
    const file = ls[i].replace(/\s+/g, ' ')
    const date = /\d{1,2}[\s/-]\w{2,9}[\s/-]\d{2,4}/.exec(ls.slice(i, i + 3).join(' '))?.[0]
    return `hirist resume: ${file}, uploaded ${date ?? 'date not read'}`
  } catch (e) { if (e instanceof Stop && walled(e.message)) throw e; return 'hirist resume: not read' }
}

async function apply(id: string, o: { out: string; press: boolean }): Promise<Res> {
  const t0 = Date.now()
  const res: Res = { id, outcome: 'failed', applied_date: null, ledger_key: '', reasons: [], question: null, closed: false, notes: '', route: 'fallback', dry_run: !o.press, plan: '', seconds: 0 }
  const notes: string[] = []
  const row = loadPlan(id)
  let reserved = false, pressedFrom = Infinity
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
  const ctx = await launch(true)
  let closing = false
  const close = async () => { if (closing) return; closing = true; await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 15_000))]) }
  const overall = setTimeout(async () => { res.reasons.push('overall timeout'); await close(); fin(); process.exit(3) }, 300_000)
  const record = () => {
    const rec = engine('dedupe', 'record', '--source', 'hirist', '--company', row.company, '--role', row.role, '--link', row.link, '--channel', 'direct', '--role-file', `my-sessions/ledger/roles/${id}.md`)
    if (rec.code !== 0) notes.push('RECORD FAILED')
    reserved = false
    res.outcome = 'applied'; res.applied_date = ist().slice(0, 10)
  }
  try {
    const page = ctx.pages()[0] ?? (await ctx.newPage())
    if (await listed(page, row)) throw new Stop('the role is on the applied-jobs page', 'already_applied', { route: 'script' })
    const job = await readJob(page, row.link)
    if (job.closed) throw new Stop('posting no longer on Hirist', 'failed', { closed: true, route: 'script' })
    const text = await bodyText(page)
    if (!either(text, row.role)) throw new Stop('FOCUS COLLISION DETECTED: the page does not name the role', 'held', { route: 'script' })
    const btn = page.getByRole('button', { name: /^apply( now)?$/i }).first() // GUESS: the label, and that the first one is the top button
    if (!(await btn.count())) throw new Stop(/applied/i.test(text.slice(0, 1500)) ? 'the page shows an applied state' : 'no Apply button on the page')
    // an email ask goes to the applier, which files the email finding. The address is never read into the result.
    const mailAsk = /[\w.+-]+@(?!(?:[\w-]+\.)*hirist\.(?:tech|com))[\w-]+\.\w/.test(job.jd) && /\b(mail|send|share|forward|write)\b[^.\n]{0,60}\b(resume|cv|profile|details)\b|\b(resume|cv|profile|details)\b[^.\n]{0,60}\b(mail|send|share|forward)\b/i.test(job.jd)
    res.plan = 'apply'; res.route = 'script'
    notes.push(await storedResume(page), `Hirist sent its stored resume, not the ${row.variant || 'default'} variant`)
    if (!o.press) { res.outcome = 'stopped_before_submit'; notes.unshift('would press Apply'); if (mailAsk) notes.push('JD asks for an email'); return res }
    if (mailAsk) throw new Stop('the JD asks for an email: the applier files the email finding', 'held', { route: 'fallback' })
    await go(page, row.link)
    const apply1 = page.getByRole('button', { name: /^apply( now)?$/i }).first()
    const rsv = engine('dedupe', 'reserve', '--id', id, '--company', row.company, '--role', row.role, '--link', row.link, '--channel', 'direct', '--source', 'hirist')
    if (rsv.code !== 0) throw new Stop(rsv.code === 2 ? 'STOPPED: opening already reserved or spent' : `STOPPED: dedupe reserve exited ${rsv.code}`, 'held')
    reserved = true
    clearTimeout(overall) // nothing may exit between the click and the record
    const c0 = clicks
    pressedFrom = c0
    try { await press(page, apply1) } catch (e) { if (clicks === c0) { engine('dedupe', 'unreserve', '--id', id, '--reason', 'the Apply click was never sent'); reserved = false } throw e }
    let ok = false
    for (let w = 0; w < 24 && !ok; w++) { await page.waitForTimeout(500); ok = /submitted successfully/i.test(await bodyText(page)) }
    if (!ok) {
      const other = (await page.locator('dialog[open], [role=dialog], form input:visible, form textarea:visible').count().catch(() => 0)) > 0 || new URL(page.url()).hostname !== 'www.hirist.tech'
      throw new Stop(other ? 'the press opened a form or another page: the applier takes it' : 'no success message after the press')
    }
    record()
    return res
  } catch (e) {
    const s = e instanceof Stop ? e : new Stop('ERROR: ' + (e as Error).message.split('\n')[0])
    Object.assign(res, { outcome: s.outcome, route: 'fallback' }, s.extra)
    if (!s.extra.reasons) res.reasons.push(s.message)
    // runner step 6: reload the applied-jobs page. A listed role was sent, so record it. An unlisted one is unreserved.
    if (reserved && !wallSeen) {
      try {
        const pg = ctx.pages()[0]
        if (await listed(pg, row)) { record(); res.reasons.length = 0; res.route = 'script'; notes.push('the success message was missed, applied-jobs lists the role') }
        // A sent click with no listing may still be an application that lists late, so the reservation stays.
        else if (clicks > pressedFrom) { res.reasons.unshift('STOPPED: Apply was pressed but not confirmed, and the opening stays reserved'); res.outcome = 'held' }
        else { engine('dedupe', 'unreserve', '--id', id, '--reason', s.message.slice(0, 150)); reserved = false }
      } catch { notes.push('WARNING: applied-jobs check threw, the reservation stays') }
    }
    return res
  } finally {
    clearTimeout(overall)
    try { await close() } finally {
      if (wallSeen && !res.reasons.some((r) => /SECURITY STOP|SIGNED OUT/.test(r)) && res.outcome !== 'applied') res.reasons.push(wallSeen === 'security' ? 'SECURITY STOP: seen during clean-up' : 'SIGNED OUT during clean-up')
      fin()
    }
  }
}

// ---- hunt ------------------------------------------------------------------------------------------------------

// The sweep of a live /hunt in one call: stdout ends in one HR-SWEEP line. The sweep JSON is staged only on success.
// Search is public, so a signed-out profile alone does not stop the sweep. Only a redirect to a sign-in page does, and it prints signed-out.
async function huntSweep(S: string): Promise<number> {
  const eng = (...a: string[]) => engine('--session', S, ...a)
  const out = (s: string) => console.log(s)
  const s0 = eng('session', 'started', 's-hirist')
  if (s0.code !== 0) { out(`HR-SWEEP fallback session started failed: ${first(s0.out)}`); return 0 }
  const work = join(S, '.hr', 'sweep')
  rmSync(work, { recursive: true, force: true })
  const code = await sweep(work, C.ROLES)
  let sum: { kept?: number; reason?: string; perQuery?: { q: string; pages: number; kept: number }[] } = {}
  try { sum = JSON.parse(readFileSync(join(work, 'hirist-sweep-summary.json'), 'utf8')) } catch { /* no summary: fall back below */ }
  if (code === 4 || code === 5) {
    const why = code === 4 ? 'security check' : 'signed out'
    eng('session', 'sweep', 'hirist', 'status=failed', 'reason=login wall')
    eng('finding', 'add', '--json', JSON.stringify({ kind: 'blocked', stage: 'sweep', id: '-', summary: `Hirist sweep stopped: ${why}`, proposed: { reason: `the Hirist sweep met a ${why}`, action_for_candidate: code === 5 ? 'run: node process/tools/hirist.ts login' : 'sign in to Hirist in the pinned Chrome yourself and clear the check' } }))
    out(`HR-SWEEP ${code === 4 ? 'security' : 'signed-out'}`); return 0
  }
  const files = existsSync(work) ? readdirSync(work).filter((f) => /-hirist-1\.json$/.test(f)) : []
  if (code !== 0 || files.length !== 1 || typeof sum.kept !== 'number') { out(`HR-SWEEP fallback ${sum.reason || 'sweep exited ' + code}`.slice(0, 200)); return 0 }
  mkdirSync(join(S, '.stage/sweep'), { recursive: true })
  copyFileSync(join(work, files[0]), join(S, '.stage/sweep', files[0]))
  for (const q of sum.perQuery ?? []) eng('session', 'sweep', 'hirist', `query=${q.q}`, `pages=${q.pages}`, `kept=${q.kept}`)
  eng('session', 'sweep', 'hirist', 'status=ok')
  out(`HR-SWEEP ok ${sum.kept}`)
  return 0
}

type Triage = { decision: string; reason: string }
// A Hirist row is applied to only when its triage decision is `scored`. Any other decision drops it. undefined means no triage was found.
// The triage JSON is read first, then the ledger note (`triage: <reason>` for a scored row, `triage <decision>: <reason>` otherwise), as the applier reads it.
function triageOf(S: string, id: string): Triage | undefined {
  for (const d of [join(S, '.stage/triage/done'), join(S, '.stage/triage')]) {
    if (!existsSync(d)) continue
    for (const f of readdirSync(d).filter((n) => n.endsWith('.json') && n.includes(id)).sort().reverse()) {
      try { const j = JSON.parse(readFileSync(join(d, f), 'utf8')); if (j.id === id && typeof j.decision === 'string') return { decision: j.decision, reason: String(j.reason ?? '') } } catch { /* next file */ }
    }
  }
  const notes = readDicts(readFileSync(C.PROSPECTS, 'utf8')).rows.find((x) => x['id'] === id)?.['notes'] ?? ''
  const m = [...notes.matchAll(/triage(?: (\w+))?: ([^|]*)/gu)]
  return m.length ? { decision: m[m.length - 1][1] ?? 'scored', reason: m[m.length - 1][2].trim() } : undefined
}

// One role from a live /hunt: bookkeeping is done here, and stdout holds HR-RESULT and HR-OFF lines. Only an applied result is staged.
async function hunt(id: string, S: string, line: string): Promise<number> {
  const eng = (...a: string[]) => engine('--session', S, ...a)
  const out = (s: string) => console.log(s)
  const s0 = eng('session', 'started', 'a-' + id)
  if (s0.code !== 0) { out(`HR-RESULT fallback ${id} session started failed: ${first(s0.out)}`); return 0 }
  const dir = join(S, '.hr'), off = join(dir, 'script-off')
  mkdirSync(dir, { recursive: true })
  if (existsSync(off)) { const why = first(readFileSync(off, 'utf8')); out(`HR-RESULT fallback ${id} ${why}`); out(`HR-OFF ${why}`); return 0 }
  const lrow = readDicts(readFileSync(C.PROSPECTS, 'utf8')).rows.find((x) => x['id'] === id)
  if (!lrow || lrow['source'] !== 'hirist') { out(`HR-RESULT fallback ${id} not a hirist row`); return 0 }
  const triage = triageOf(S, id)
  if (triage === undefined) { out(`HR-RESULT fallback ${id} no triage found`); return 0 }
  if (triage.decision !== 'scored') { out(`HR-RESULT fallback ${id} triage decision is ${triage.decision}, not scored`); return 0 }
  if (!['scored', 'ready'].includes(lrow['status'] ?? '')) { out(`HR-RESULT fallback ${id} row status is ${lrow['status'] || 'empty'}`); return 0 }
  if (!line?.trim()) { out(`HR-RESULT fallback ${id} no go-ahead line`); return 0 }
  if (eng('session', 'log', `a-${id}: hirist press under go-ahead: ${line}`).code !== 0) { out(`HR-RESULT fallback ${id} go-ahead log failed`); return 0 }
  let res: Res | undefined
  try { res = await apply(id, { out: dir, press: true }) } catch (e) { console.error('apply threw: ' + (e as Error).message.split('\n')[0]) }
  const why = res?.reasons[0] ?? 'no result'
  if (res && res.reasons.some(walled)) {
    const lapsed = res.reasons.some((r) => /SIGNED OUT/.test(r))
    const msg = lapsed ? "the script's Chrome profile is signed out; run node process/tools/hirist.ts login" : 'Hirist showed a security check'
    writeFileSync(off, msg + '\n')
    eng('finding', 'add', '--json', JSON.stringify({ kind: 'blocked', stage: 'apply', id, summary: lapsed ? 'Hirist script is signed out' : 'Hirist security check', proposed: { reason: msg, action_for_candidate: lapsed ? 'run: node process/tools/hirist.ts login' : 'sign in to Hirist in the pinned Chrome yourself and clear the check' } }))
    // a held row with a reservation keeps its STOPPED reason, as R6 says; otherwise the runner's ACCOUNT reason leads
    if (res.outcome !== 'applied' && !/^STOPPED:/.test(why)) res.reasons.unshift('ACCOUNT: Hirist session lapsed')
    res.outcome = res.outcome === 'applied' ? 'applied' : 'held'; res.route = 'script'
    mkdirSync(join(S, '.stage/apply'), { recursive: true })
    writeFileSync(join(S, '.stage/apply', `${id}.json`), JSON.stringify(res, null, 1) + '\n')
    out(`HR-RESULT security ${id} ${res.reasons[0]}`); out(`HR-OFF ${msg}`); return 0
  }
  if (!res || res.outcome !== 'applied' || res.dry_run) { out(`HR-RESULT fallback ${id} ${why}`); return 0 }
  try {
    const row = loadPlan(id)
    const body = ['submitted', ...res.reasons.map((r) => 'reason: ' + r), res.notes && 'notes: ' + res.notes].filter(Boolean).join('\n')
    const r = spawnSync('node', [join(C.PROCESS, 'engine.ts'), '--session', S, 'session', 'send', 'add', '--id', id, '--kind', 'application', '--title', `${row.company}, ${row.role}, hirist`, '--body-file', '-'], { cwd: C.REPO, encoding: 'utf8', input: body })
    if (r.status !== 0) res.notes += '; send add FAILED'
  } catch (e) { res.notes += '; bookkeeping threw: ' + (e as Error).message.split('\n')[0] }
  // the commit point: nothing after this may fail the row
  mkdirSync(join(S, '.stage/apply'), { recursive: true })
  writeFileSync(join(S, '.stage/apply', `${id}.json`), JSON.stringify(res, null, 1) + '\n')
  out(`HR-RESULT staged ${id} ${res.outcome} ${res.reasons[0] ?? 'clean'}`)
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
    const r = await apply(arg, { out: val('--out'), press: argv.includes('--press') })
    console.log(JSON.stringify(r, null, 1))
    const why = r.reasons.join()
    if (/SECURITY STOP/.test(why)) { console.error('SECURITY STOP. Tell the candidate; never retry.'); return 4 }
    return /SIGNED OUT/.test(why) ? 5 : 0
  }
  console.error('usage: hirist.ts login | hunt-sweep --session <S> | hunt <row-id> --session <S> --go-ahead "<line>" | sweep --out <dir> | apply <row-id> --out <dir> [--press]')
  return 2
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(await main(process.argv.slice(2)))
