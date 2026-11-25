// Easy Apply without the applier subagent: code does the routine pages, one text `claude -p` call answers
// screening questions. The browser flow is added under `apply` below; everything above it needs no browser.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { cpus, tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { chromium, type Locator, type Page } from 'playwright-core'
import * as C from '../constants.ts'
import { readDicts } from '../lib/csv.ts'
import { extractJson } from '../../server/claude.ts'

export type Kind = 'text' | 'number' | 'select' | 'radio' | 'checkbox' | 'textarea'
export type Field = { key: string; label: string; kind: Kind; required: boolean; value: string; options?: string[] }
export type Answer =
  | { action: 'answer'; value: string }
  | { action: 'keep' }
  | { action: 'pay'; key: string }
  | { action: 'hold'; reason: string }
export type Job = { company: string; role: string }
export type Usage = { tokens: number; seconds: number }
export type Row = { id: string; company: string; role: string; link: string; jobId: string; match: number; resume: string }

export const engine = (...args: string[]): { out: string; code: number } => {
  const r = spawnSync('node', [join(C.PROCESS, 'engine.ts'), ...args], { cwd: C.REPO, encoding: 'utf8' })
  return { out: r.stdout.trim(), code: r.status ?? 1 }
}

// The same lookup the hunt uses: the row's variant in `## Resume variants`, else the Default row. Fails if the PDF is absent.
export function loadRow(id: string): Row {
  const r = readDicts(readFileSync(C.PROSPECTS, 'utf8')).rows.find((x) => x['id'] === id)
  if (!r) throw new Error(`no prospects row ${id}`)
  const profile = readFileSync(join(C.profileDir(), 'profile.md'), 'utf8')
  const section = profile.split(/^## Resume variants$/mu)[1]?.split(/^## /mu)[0] ?? ''
  const rows = section.split('\n').filter((l) => l.startsWith('| `')).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))
  const want = (r['resume_variant'] ?? '').trim()
  const live = rows.filter((c) => c[4] === 'live')
  const hit = live.find((c) => c[0].replaceAll('`', '') === want) ?? live.find((c) => c[5] === 'yes')
  const rel = hit?.[1].replaceAll('`', '')
  if (!rel) throw new Error(`no live resume variant for ${id}`)
  const resume = join(C.profileDir(), 'resume', rel)
  if (!existsSync(resume)) throw new Error(`resume PDF missing: ${resume}`)
  const jobId = /\/jobs\/view\/(\d+)/u.exec(r['link'] ?? '')?.[1]
  if (!jobId) throw new Error(`row ${id} has no LinkedIn job id in its link`)
  return { id, company: r['company'] ?? '', role: r['role'] ?? '', link: r['link'] ?? '', jobId, match: Number(r['match']) || 0, resume }
}

// The Phone row of faq.md, as "+<code>-<number>".
export function contact(): { country: string; number: string; countryName: string } {
  const row = /^\| Phone \|.*$/mu.exec(readFileSync(join(C.profileDir(), 'faq.md'), 'utf8'))?.[0] ?? ''
  const m = /^\| Phone \| \+(\d+)-(\d+)/u.exec(row)
  if (!m) throw new Error('faq.md has no Phone row of the form +<code>-<number>')
  // the row names the country as "<Name> (+NN)"; without it a shared code stays ambiguous
  return { country: `+${m[1]}`, number: m[2], countryName: /\b([A-Z][A-Za-z ]+?) \(\+\d+\)/u.exec(row)?.[1]?.trim() ?? '' }
}

// A label that asks for pay or notice. The model may only answer these with `pay` or `hold`, and no value is ever written down.
export const PAY_LABEL = /salary|ctc|compensation|remuneration|expected pay|current pay|pay expectation|notice period/i

export const linkedinClear = (): boolean => engine('outreach', 'cooldown').out === 'clear'

// Only the script ever holds a pay figure. notice_days_max is a day count, which config prints.
export function payValue(key: string): string {
  const k = key.replace(/^pay\./u, '')
  if (k === 'notice_days_max') {
    const d = /pay\.notice_days_max\s+(\S+)/u.exec(engine('config').out)?.[1]
    if (!d || !/^\d+$/u.test(d)) throw new Error('notice_days_max is not a number')
    return d
  }
  const r = engine('pay', 'value', k)
  if (r.code !== 0 || !r.out) throw new Error(`pay value ${k} refused`)
  return r.out
}

// An empty temp cwd and the server's locked flags: no CLAUDE.md, hooks, tools, MCP or session file load.
function claudeJson(prompt: string): Promise<{ text: string; tokens: number }> {
  const cwd = mkdtempSync(join(tmpdir(), 'ea-apply-'))
  const args = ['-p', '--output-format', 'json', '--model', 'sonnet', '--tools', '', '--safe-mode', '--strict-mcp-config', '--no-chrome', '--no-session-persistence', '--disable-slash-commands']
  const env = { ...process.env }
  delete env.CLAUDE_CONFIG_DIR
  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('claude timed out after 120 s')) }, 120_000)
    child.stdout.on('data', (d: Buffer) => { out += d })
    child.stderr.on('data', (d: Buffer) => { err += d })
    child.on('error', reject)
    child.on('close', () => {
      clearTimeout(timer)
      rmSync(cwd, { recursive: true, force: true })
      try {
        let env = JSON.parse(out)
        if (Array.isArray(env)) env = env.find((e) => e?.type === 'result') ?? env[env.length - 1]
        if (env.is_error) throw new Error(String(env.result).slice(0, 300))
        const u = env.usage ?? {}
        const tokens = (u.input_tokens ?? 0) + (u.output_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0)
        resolve({ text: String(env.result ?? ''), tokens })
      } catch (e) { reject(new Error(`claude failed: ${(e as Error).message} ${err.slice(-200)}`)) }
    })
    child.stdin.on('error', () => { /* close reports it */ })
    child.stdin.end(prompt)
  })
}

// One call for one form page. A reply that does not parse, or that skips a field, holds every field.
export async function answerQuestions(job: Job, fields: Field[]): Promise<{ answers: Record<string, Answer>; usage: Usage & { calls: number }; failed?: boolean; malformed?: boolean }> {
  const faq = readFileSync(join(C.profileDir(), 'faq.md'), 'utf8')
  const portfolio = readFileSync(join(C.profileDir(), 'work-portfolio.md'), 'utf8')
  const prompt = `You fill one page of a LinkedIn Easy Apply form for the role "${job.role}" at ${job.company}. Answer only from the answer bank and the work portfolio below. Never invent a fact. Respect the caveats in the portfolio, and never claim work that is not the candidate's. The bank says years-of-experience answers come from the portfolio.

Reply with one JSON object and nothing else. Its keys are the field keys, and each value is one of:
{"action":"answer","value":"..."}  the answer. For a select or radio, value is exactly one of the field's options. For a checkbox, "true" or "false". A number or years field takes a whole number only, so write 1.5 as 2.
{"action":"keep"}  the pre-filled value already matches the bank.
{"action":"pay","key":"pay.<name>"}  a pay, salary, CTC or notice-period question. Name the pay key the bank row gives. Never write a figure yourself.
{"action":"hold","reason":"..."}  the bank cannot answer it truthfully. A required field with no truthful answer must be a hold.
Use pay only for a text or number field. For a select or radio about notice period, pay is also allowed and the script picks the option.
Where the bank and a pre-filled value conflict, the bank wins.

Fields:
${JSON.stringify(fields.map((f) => (PAY_LABEL.test(f.label) ? { ...f, value: '' } : f)))}

Answer bank:
${faq}

Work portfolio:
${portfolio}`
  const t0 = Date.now()
  const hold = (reason: string) => Object.fromEntries(fields.map((f) => [f.key, { action: 'hold', reason } as Answer]))
  let r: { text: string; tokens: number }
  try { r = await claudeJson(prompt) } catch (e) {
    return { answers: hold(`model call failed: ${(e as Error).message}`), usage: { tokens: 0, seconds: (Date.now() - t0) / 1000, calls: 1 }, failed: true }
  }
  const usage = { tokens: r.tokens, seconds: (Date.now() - t0) / 1000, calls: 1 }
  let raw: Record<string, Record<string, unknown>>
  const bad = { answers: hold('MODEL REPLY MALFORMED'), usage, malformed: true }
  try { raw = extractJson(r.text) as typeof raw } catch { return bad }
  const answers: Record<string, Answer> = {}
  const placeholder = /^(select( an)?( option)?|choose|please select)/i
  for (const f of fields) {
    const a = raw?.[f.key]
    const s = (k: string) => (typeof a?.[k] === 'string' ? (a[k] as string) : '')
    const choice = f.kind === 'select' || f.kind === 'radio'
    const payField = PAY_LABEL.test(f.label)
    if (a?.action === 'hold' && s('reason')) answers[f.key] = { action: 'hold', reason: s('reason') }
    else if (payField && a?.action !== 'pay') answers[f.key] = { action: 'hold', reason: 'a pay or notice question may only be answered with pay' }
    else if (a?.action === 'pay' && /^(pay\.)?[a-z_]+$/u.test(s('key'))) answers[f.key] = payField ? { action: 'pay', key: s('key') } : { action: 'hold', reason: 'pay action on a field that is not a pay question' }
    else if (a?.action === 'keep') answers[f.key] = { action: 'keep' }
    else if (a?.action === 'answer' && s('value') !== '' &&
      (f.kind === 'checkbox' ? /^(true|false)$/u.test(s('value')) : choice ? !!f.options?.includes(s('value')) && !placeholder.test(s('value')) : true)) answers[f.key] = { action: 'answer', value: s('value') }
    else return bad
  }
  return { answers, usage }
}


export type Result = {
  id: string; outcome: string; applied_date: string | null; ledger_key: string; reasons: string[]
  question: string | null; closed: boolean; notes: string
  dry_run: boolean; seconds: number; launch_to_form_s: number; form_to_review_s: number; pages: number
  llm_calls: number; llm_tokens: number; would_submit: boolean; route: 'script' | 'fallback'
  // what a real run would send: a pay value is never written, and the contact section is never read into the result
  answers: { label: string; kind: string; action: string; value: string }[]
  review: { resume: string | null; questions: { label: string; shown: string }[] }
}

// Question labels may appear in reasons or notes. No pay figure and no phone number is ever passed in.
export function writeResult(dir: string, result: Result): string {
  mkdirSync(dir, { recursive: true })
  const path = join(dir, `${result.id}.json`)
  writeFileSync(path, JSON.stringify(result, null, 1) + '\n')
  return path
}

// ---- browser flow -------------------------------------------------------------------------------------------

const PROFILE = join(C.REPO, '.playwright/linkedin')

// An x64 node on Apple silicon runs Chrome under Rosetta, where LinkedIn's render blocks for 10-40 s and every click waits.
// The wrapper forces Chrome's arm64 slice and keeps Playwright's flags, so the profile's cookies stay readable.
// A plain Chrome cannot read this profile's cookies: they are readable only under Playwright's launch.
function launch(headless: boolean) {
  let executablePath: string | undefined
  if (process.platform === 'darwin' && process.arch === 'x64' && cpus()[0]?.model.startsWith('Apple')) {
    executablePath = join(tmpdir(), 'ea-trial-chrome-arm64.sh')
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

class Stop extends Error {
  outcome: string; route: 'script' | 'fallback'; extra: Partial<Result>
  constructor(msg: string, outcome = 'failed', route: 'script' | 'fallback' = 'fallback', extra: Partial<Result> = {}) { super(msg); this.outcome = outcome; this.route = route; this.extra = extra }
}
const settle = <T>(p: Promise<T>, ms: number): Promise<T | 'PENDING'> => Promise.race([p, new Promise<'PENDING'>((r) => setTimeout(() => r('PENDING'), ms))])

// Only a /checkpoint page, a captcha or security-verification text is a security check. A login page or authwall is a signed-out
// session. On a job page the h1 is the job title, so its text is not searched there.
type Wall = 'security' | 'signedout'
async function wall(p: Page): Promise<Wall | null> {
  const path = new URL(p.url()).pathname
  if (/^\/checkpoint/.test(path)) return 'security'
  if (/^\/(login|uas|authwall)/.test(path)) return 'signedout'
  if (await p.locator('iframe[src*="captcha" i], [id*="captcha" i]').count().catch(() => 0)) return 'security'
  const re = /security verification|security check|captcha|verify you.re human|account (is )?restricted|unusual activity/i
  // not the form's own dialog: its screening questions may mention a security check
  const dialogs = (await p.getByRole('dialog').filter({ hasNot: p.locator('input, select, textarea') }).allInnerTexts().catch(() => [])).join(' ').slice(0, 3000)
  const head = /^\/jobs\/view/.test(path) ? '' : (await p.title().catch(() => '')) + ' ' + (await p.locator('h1').allInnerTexts().catch(() => [])).join(' ')
  return re.test(dialogs + ' ' + head) ? 'security' : null
}
let wallSeen: Wall | null = null
let clicks = 0 // mouse clicks sent, so a caller can tell whether a click went out before a later throw
// The caller must run this command for a security stop: it starts the LinkedIn cooldown and needs the hunt's session folder.
const COOLDOWN = 'node process/engine.ts --session <session folder> outreach stop --reason "<what the page showed>"'
async function checkWall(p: Page) {
  const w = await wall(p)
  if (!w) return
  wallSeen = w
  const path = new URL(p.url()).pathname
  if (w === 'signedout') throw new Stop('SIGNED OUT at ' + path, 'failed', 'fallback')
  throw new Stop('SECURITY STOP: ' + path, 'held', 'script', { reasons: ['LinkedIn security check', 'SECURITY STOP: ' + path] })
}

// A real mouse click at the control's centre: a DOM click on Easy Apply does nothing, and the input ack waits on the page's
// main thread, so the click is raced against a timeout and the caller checks the result. It throws only before the click is
// sent, and after every click it checks the page for a wall.
async function press(page: Page, el: Locator) {
  for (let i = 0; i < 20; i++) { const s = Date.now(); if ((await settle(page.evaluate(() => 1), 5000)) === 1 && Date.now() - s < 300) break }
  await el.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {}) // a control below the modal's fold is not under the mouse otherwise
  const b = await el.boundingBox({ timeout: 10_000 })
  if (!b) throw new Stop('control not visible')
  const sent = page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  clicks++
  await settle(sent, 10_000)
  await checkWall(page)
}

type PF = Field & { tags: string[]; ids: string[]; combo?: boolean }
type Snap = { heading: string; step: string; progress: string; fields: PF[]; errors: string[] }

// Fields are tagged data-ea=<n> so later steps find them without generated ids. Radios are grouped by fieldset.
export async function readPage(modal: Locator): Promise<Snap> {
  const s = await modal.evaluate((m) => {
    const clean = (x: string | null | undefined) => (x ?? '').replace(/\s+/g, ' ').replace(/\s*\*$/u, '').trim().replace(/^(.+?) \1$/u, '$1')
    const out: any[] = []
    const groups = new Map<Element, any>()
    let n = 0
    for (const el of Array.from(m.querySelectorAll('input, select, textarea'))) {
      const e = el as any
      if (e.type === 'hidden' || e.type === 'file') continue
      const tag = String(n++)
      e.setAttribute('data-ea', tag)
      const own = clean(e.labels?.[0]?.innerText) || clean(e.getAttribute('aria-label'))
      if (e.type === 'radio') {
        const fs = e.closest('fieldset') ?? e.closest('[role=radiogroup]') ?? e.parentElement
        let g = groups.get(fs)
        // the question is the text before the fieldset, with a trailing * when required; each radio's aria-label repeats the question
        const q = (fs.querySelector('legend')?.textContent ?? fs.getAttribute('aria-label') ?? fs.previousElementSibling?.textContent ?? '').trim()
        if (!g) { g = { key: '', label: clean(q), kind: 'radio', required: !!e.required || /\*$/u.test(q), value: '', options: [], tags: [], ids: [] }; groups.set(fs, g); out.push(g) }
        let opt = ''
        for (let o = e.parentElement as HTMLElement | null, i = 0; o && !opt && i < 3; o = o.parentElement, i++) opt = clean(o.innerText)
        g.options.push(opt || own); g.tags.push(tag); g.ids.push(e.id)
        if (e.checked) g.value = opt || own
        continue
      }
      out.push({
        key: '', label: own, tags: [tag], ids: [e.id], combo: e.getAttribute('role') === 'combobox',
        kind: e.tagName === 'SELECT' ? 'select' : e.tagName === 'TEXTAREA' ? 'textarea' : e.type === 'checkbox' ? 'checkbox' : e.type === 'number' ? 'number' : 'text',
        required: !!e.required || e.getAttribute('aria-required') === 'true',
        // a select's value attribute is a code (a country's is "in"), so its value is the chosen option's text, as in options
        value: e.type === 'checkbox' ? String(e.checked) : e.tagName === 'SELECT' ? (e.selectedOptions[0]?.text.trim() ?? '') : e.value,
        options: e.tagName === 'SELECT' ? Array.from(e.options as ArrayLike<HTMLOptionElement>).map((o) => o.text.trim()) : undefined,
      })
    }
    // unverified selectors: a false hit only makes the run stop and fall back
    const errors = Array.from(m.querySelectorAll('[class*="inline-feedback--error"], [role="alert"], [data-test-form-element-error-message]'))
      .map((x) => clean((x as HTMLElement).innerText)).filter((x) => x && x.length < 200)
    // #dialog-header is the form's title ("Apply to <company>"); the step name is the line after "N/M pages"
    const lines = (m as HTMLElement).innerText.split('\n').map(clean).filter(Boolean)
    const at = lines.findIndex((l) => /\d+\s*\/\s*\d+\s*pages?/u.test(l))
    return {
      heading: clean(m.querySelector('#dialog-header')?.textContent), step: at >= 0 ? lines[at + 1] ?? '' : '',
      progress: /\d+\s*\/\s*\d+\s*pages?/u.exec((m as HTMLElement).innerText)?.[0] ?? '',
      fields: out, errors: Array.from(new Set(errors)),
    }
  })
  const seen = new Map<string, number>()
  for (const f of s.fields as PF[]) { const k = seen.get(f.label) ?? 0; seen.set(f.label, k + 1); f.key = k ? `${f.label}#${k + 1}` : f.label }
  return s as Snap
}

const sig = (s: Snap) => s.step + '|' + s.fields.map((f) => f.label).join('|')

// notice-period choices: the largest option that is at most N days
function noticeOption(options: string[], days: number): string | undefined {
  // an open-ended option such as "More than 60 days" or "60+ days" is not 60
  const d = (o: string) => /more than|over|above|at least|or more|plus|greater|[+>]/i.test(o) ? NaN : /immediate/i.test(o) ? 0 : ((m) => m ? Number(m[1]) * (/month/i.test(o) ? 30 : /week/i.test(o) ? 7 : 1) : NaN)(/(\d+)\s*(day|week|month)/i.exec(o))
  return options.map((o) => ({ o, n: d(o) })).filter((x) => x.n <= days).sort((a, b) => b.n - a.n)[0]?.o
}

// Returns the value now on the form.
export async function setField(page: Page, modal: Locator, f: PF, a: Answer): Promise<string> {
  if (a.action === 'keep' || a.action === 'hold') return f.value
  let value = a.action === 'answer' ? a.value : payValue(a.key)
  if (a.action === 'pay' && !/^\d+(\.\d+)?$/u.test(value)) throw new Stop('pay value is not numeric')
  if (a.action === 'pay' && (f.kind === 'select' || f.kind === 'radio')) {
    const o = noticeOption(f.options ?? [], Number(value))
    if (!/notice/i.test(a.key) || !o) throw new Stop(`pay answer on a choice field: ${f.label}`)
    value = o
  }
  // LinkedIn re-renders the block after an answer and the data-ea tags vanish, so tag again and find this field by its key
  const fresh = (await readPage(modal)).fields.find((x) => x.key === f.key && x.kind === f.kind)
  if (!fresh) throw new Stop(`field gone after re-render: ${f.label}`)
  f = { ...f, tags: fresh.tags, ids: fresh.ids }
  const at = (i: number) => modal.locator(`[data-ea="${f.tags[i]}"]`)
  // A chosen radio option is a different component (only it carries a componentkey), so a click remounts it and drops its
  // data-ea tag. Every read-back therefore reads the page again, which re-tags it, and takes the field's value from there.
  const now = async () => {
    const r = await settle(readPage(modal), 5000)
    const g = r === 'PENDING' ? undefined : r.fields.find((x) => x.key === f.key && x.kind === f.kind)
    if (!g) throw new Stop(`option not found on the page: ${f.label}`)
    f = { ...f, tags: g.tags, ids: g.ids }
    return g.value
  }
  if (f.kind === 'select') {
    const i = (f.options ?? []).findIndex((o) => o === value)
    if (i < 0) throw new Stop(`option not found for: ${f.label}`)
    if (f.options![i] !== f.value) await at(0).selectOption({ index: i }, { timeout: 10_000 })
    if ((await now()) !== value) throw new Stop(`could not set: ${f.label}`)
  } else if (f.kind === 'radio' || f.kind === 'checkbox') {
    const i = f.kind === 'radio' ? (f.options ?? []).indexOf(value) : 0
    if (i < 0) throw new Stop(`option not found for: ${f.label}`)
    const isSet = async () => { const v = await now(); return f.kind === 'radio' ? v === value : (v === 'true') === (value === 'true') }
    if (!(await isSet())) {
      // the label is empty on radios, so fall back to the box around the input and its option text
      const lab = modal.locator(`label[for="${f.ids[i]}"]`).first()
      await press(page, (await lab.boundingBox({ timeout: 5000 }).catch(() => null))?.width ? lab : at(i).locator('xpath=../..'))
    }
    if (!(await isSet())) await settle(at(i).setChecked(f.kind === 'radio' || value === 'true', { force: true, timeout: 5000 }).catch(() => {}), 8000)
    if (!(await isSet())) throw new Stop(`could not set: ${f.label}`)
  } else if (value !== f.value) {
    await at(0).fill(value, { timeout: 10_000 })
    if (f.combo) {
      await page.waitForTimeout(800)
      const opt = page.getByRole('option').first()
      if (await opt.count()) await press(page, opt)
      const n = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (n(await at(0).inputValue().catch(() => '')) !== n(value)) throw new Stop(`typeahead did not take the answer: ${f.label}`)
    }
  }
  return value
}

async function pickResume(page: Page, modal: Locator, pdf: string): Promise<void> {
  const name = basename(pdf)
  // each card is a radio whose aria-label is the filename; the card text is what a click can hit
  const radio = modal.locator('input[type=radio]').and(modal.locator(`[aria-label="${name}"]`)).first()
  if (!(await radio.count())) {
    const up = modal.getByRole('button', { name: /upload resume/i }).first()
    if (!(await up.count())) throw new Stop(`RESUME UPLOAD FAILED: ${name}: no upload control`, 'held', 'script')
    const [fc] = await Promise.all([page.waitForEvent('filechooser', { timeout: 10_000 }), press(page, up)])
    await fc.setFiles(pdf)
    await radio.waitFor({ state: 'attached', timeout: 15_000 }).catch(() => { throw new Stop(`RESUME UPLOAD FAILED: ${name}: card never appeared`, 'held', 'script') })
  }
  if (!(await radio.isChecked())) {
    await press(page, modal.getByText(name, { exact: true }).first()).catch(() => {})
    await page.waitForTimeout(800)
  }
  if (!(await radio.isChecked())) throw new Stop(`RESUME UPLOAD FAILED: ${name}: card not selected`, 'held', 'script')
}

async function capture(modal: Locator, n: number) {
  const dir = process.env.EA_CAPTURE
  if (!dir) return
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `p${n}.aria.txt`), await modal.ariaSnapshot().catch(() => ''))
  writeFileSync(join(dir, `p${n}.html`), await modal.evaluate((m) => m.outerHTML).catch(() => ''))
  await modal.screenshot({ path: join(dir, `p${n}.png`) }).catch(() => {})
}

// Each answer is read back from the Review page text: the value after its label, up to the next label or section heading.
// Every field is reported only as matches or differs.
export function compareReview(text: string, answers: Result['answers'], paid: Map<string, string>): { label: string; shown: string; ok: boolean }[] {
  const lines = text.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const labels = answers.map((a) => a.label)
  const norm = (x: string) => (Number.isFinite(Number(x)) && x !== '' ? String(Number(x)) : x.toLowerCase())
  return answers.map((a) => {
    const at = lines.indexOf(a.label)
    const end = at < 0 ? -1 : lines.findIndex((l, j) => j > at && (labels.includes(l) || lines[j + 1] === 'Edit' || /^(Follow |Application powered|Submit application)/.test(l)))
    const shown = at < 0 ? null : lines.slice(at + 1, end < 0 ? undefined : end).join(' ')
    const ok = shown !== null && (a.kind === 'checkbox' || norm(shown) === norm(paid.get(a.label) ?? a.value))
    return { label: a.label, ok, shown: ok ? 'matches' : 'differs' } // the page text is never stored
  })
}

const nrm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '')
const either = (x: string, y: string) => !!nrm(x) && !!nrm(y) && (nrm(x).includes(nrm(y)) || nrm(y).includes(nrm(x)))
// A page that holds contact details or the Review page is never captured.
const private_ = (step: string) => /contact|^review/i.test(step)

export async function apply(id: string, o: { out: string; answers?: string; submit: boolean; headed: boolean }): Promise<Result> {
  const t0 = Date.now()
  const res: Result = { id, outcome: 'failed', applied_date: null, ledger_key: '', reasons: [], question: null, closed: false, notes: '',
    dry_run: !o.submit, seconds: 0, launch_to_form_s: 0, form_to_review_s: 0, pages: 0, llm_calls: 0, llm_tokens: 0, would_submit: false, route: 'fallback', answers: [], review: { resume: null, questions: [] } }
  const notes: string[] = []
  const row = loadRow(id)
  let reserved = false
  // every result is written here: a reserved opening that did not go out always starts with STOPPED:
  const fin = (): Result => {
    if (reserved && res.outcome !== 'applied' && !res.reasons[0]?.startsWith('STOPPED:')) {
      if (res.reasons.length) res.reasons[0] = 'STOPPED: ' + res.reasons[0]
      else res.reasons.push('STOPPED: opening reserved, outcome unknown')
    }
    res.seconds = +((Date.now() - t0) / 1000).toFixed(1); res.notes = notes.join('; '); writeResult(o.out, res); return res }
  if (!linkedinClear()) { res.outcome = 'held'; res.route = 'script'; res.reasons.push('LinkedIn security cooldown'); return fin() }
  const dd = engine('dedupe', 'check', row.company, row.role, row.link)
  if (dd.code !== 0) {
    res.route = 'script'
    if (dd.code !== 2) { res.outcome = 'held'; res.reasons.push(`STOPPED: dedupe check exited ${dd.code}`) }
    else if (/RESERVED/.test(dd.out)) { res.outcome = 'held'; res.reasons.push('STOPPED: an earlier run reserved this opening') }
    else res.outcome = 'already_applied'
    return fin()
  }
  const answersFile: Record<string, Answer> | undefined = o.answers ? JSON.parse(readFileSync(o.answers, 'utf8')) : undefined
  const floor = Number(/scores\.ea_match_floor\s+(\d+)/u.exec(engine('config').out)?.[1] ?? 80)
  const contactInfo = contact()

  const ctx = await launch(!o.headed)
  let page: Page | undefined
  let formOpened = false, submitted = false, closing = false, curStep = ''
  const close = async () => { if (closing) return; closing = true; await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 15_000))]) }
  const formsOpen = () => page!.getByRole('dialog').filter({ has: page!.locator('input, select, textarea') }).count().catch(() => -1)
  // Always try Dismiss then Discard, so no saved draft is left behind. Chrome closes whatever happens here.
  const cleanup = async () => {
    try {
      if (page && formOpened && !submitted) {
        const dismiss = page.getByRole('dialog').getByRole('button', { name: /^(dismiss|close)/i }).first()
        if (await dismiss.count().catch(() => 0)) await press(page, dismiss).catch(() => {})
        else await page.keyboard.press('Escape').catch(() => {})
        const discard = page.getByRole('button', { name: /^discard/i }).first()
        await discard.waitFor({ timeout: 5000 }).then(() => press(page!, discard)).catch(() => {})
        await page.waitForTimeout(1500).catch(() => {})
        let left = await formsOpen()
        if (left !== 0) { // one retry, with a screenshot of what is on screen
          if (process.env.EA_CAPTURE && !private_(curStep)) await page.screenshot({ path: join(process.env.EA_CAPTURE, 'cleanup.png') }).catch(() => {})
          await page.keyboard.press('Escape').catch(() => {})
          await discard.waitFor({ timeout: 5000 }).then(() => press(page!, discard)).catch(() => {})
          await page.waitForTimeout(1500).catch(() => {})
          left = await formsOpen()
        }
        notes.push(left === 0 ? 'form discarded' : 'WARNING: form may still be open')
      }
    } catch { notes.push('WARNING: clean-up threw') } finally { await close() }
  }
  const overall = setTimeout(async () => {
    res.reasons.push('overall timeout')
    await Promise.race([cleanup(), new Promise((r) => setTimeout(r, 40_000))])
    fin(); process.exit(3)
  }, 420_000)

  try {
    page = ctx.pages()[0] ?? (await ctx.newPage())
    await page.goto(`https://www.linkedin.com/jobs/view/${row.jobId}/`, { waitUntil: 'domcontentloaded' })
    await checkWall(page)
    if (await page.getByRole('link', { name: /^sign in$/i }).or(page.getByRole('button', { name: /^sign in$/i })).count()) { wallSeen = 'signedout'; throw new Stop('SIGNED OUT: the job page shows a sign-in control') }
    const easy = page.locator('button[aria-label^="Easy Apply"], a[aria-label^="Easy Apply"]').first()
    await easy.or(page.getByRole('button', { name: /appl/i })).or(page.getByRole('link', { name: /appl/i })).first().waitFor({ timeout: 45_000 }).catch(() => {})
    await checkWall(page)
    // the page must be this row's job: its title or h1 names the role
    const titles = [await page.title().catch(() => ''), ...(await page.locator('h1').allInnerTexts().catch(() => []))]
    if (!titles.some((t) => either(t, row.role))) throw new Stop('FOCUS COLLISION DETECTED: the page title does not name the role', 'held', 'script')
    if (!(await easy.count())) {
      if (/no longer accepting applications/i.test(await page.locator('body').innerText().catch(() => ''))) throw new Stop('listing closed', 'held', 'script', { closed: true })
      const labels = [...(await page.getByRole('button', { name: /appl/i }).allTextContents()), ...(await page.getByRole('link', { name: /appl/i }).allTextContents())].map((x) => x.trim())
      if (labels.some((x) => /^applied/i.test(x))) throw new Stop('already applied on LinkedIn', 'already_applied', 'script')
      if (labels.some((x) => /^apply/i.test(x))) { notes.push('CHANNEL IS external_ats'); throw new Stop('CHANNEL IS external_ats', 'failed', 'script') } // ingest reads it from notes
      throw new Stop('no apply control found')
    }
    notes.push('apply control: ' + (await easy.getAttribute('aria-label')))
    formOpened = true // before the click, so cleanup always runs
    await press(page, easy)
    // a native <dialog open data-testid="dialog">, so CSS [role=dialog] misses it; getByRole matches the implicit role
    const modal = page.getByRole('dialog').filter({ has: page.locator('input, select, textarea') }).first()
    await modal.waitFor({ timeout: 30_000 }).catch(() => { throw new Stop('no form dialog opened') })
    const formTitle = ((await modal.locator('#dialog-header').innerText().catch(() => '')) || '').replace(/^\s*apply to\s+/i, '')
    if (!either(formTitle, row.company)) throw new Stop('FOCUS COLLISION DETECTED: the form does not name the company', 'held', 'script')
    res.launch_to_form_s = +((Date.now() - t0) / 1000).toFixed(1)
    const tForm = Date.now()
    const held: { label: string; reason: string }[] = []
    const paid = new Map<string, string>()
    let atReview = false

    for (let i = 0; i < 12 && !atReview; i++) {
      const snap = await readPage(modal)
      curStep = snap.step
      res.pages++
      if (i === 0) notes.push(`opened on "${snap.step}" ${snap.progress}`)
      if ((await modal.getByRole('button', { name: /submit application/i }).count()) || /^review/i.test(snap.step)) { atReview = true; break }
      if (!private_(snap.step)) await capture(modal, i + 1)

      if (/contact/i.test(snap.step)) {
        for (const f of snap.fields) {
          if (/country code/i.test(f.label)) {
            const hits = (f.options ?? []).map((x, k) => ({ x, k })).filter((h) => h.x.includes(`(${contactInfo.country})`))
            const named = hits.filter((h) => contactInfo.countryName && h.x.toLowerCase().includes(contactInfo.countryName.toLowerCase()))
            const pick = hits.length === 1 ? hits[0] : named.length === 1 ? named[0] : undefined
            if (!pick) throw new Stop('phone country code missing or ambiguous in the list')
            if (pick.x !== f.value) await modal.locator(`[data-ea="${f.tags[0]}"]`).selectOption({ index: pick.k }).catch(() => { throw new Stop('ERROR: choosing the phone country code failed') })
          } else if (/phone number/i.test(f.label) && f.value.replace(/\D/g, '') !== contactInfo.number) {
            // a Playwright timeout prints the fill argument, so the message is replaced
            await modal.locator(`[data-ea="${f.tags[0]}"]`).fill(contactInfo.number).catch(() => { throw new Stop('ERROR: filling the phone number failed') })
          }
        }
      } else if (/resume/i.test(snap.step)) {
        await pickResume(page, modal, row.resume)
      } else if (/top choice/i.test(snap.step)) {
        notes.push('top choice page left alone')
      } else {
        const qs = snap.fields.filter((f) => !/^follow /i.test(f.label) && !/top choice/i.test(f.label))
        if (qs.length) {
          let answers = answersFile
          if (!answers) {
            const r = await answerQuestions(row, qs.map(({ key, label, kind, required, value, options }) => ({ key, label, kind, required, value, options })))
            res.llm_calls += r.usage.calls; res.llm_tokens += r.usage.tokens
            if (r.failed) {
              mkdirSync(o.out, { recursive: true })
              writeFileSync(join(o.out, `${id}.questions.json`), JSON.stringify(qs.map(({ label, kind, required, options }) => ({ label, kind, required, options })), null, 1))
              throw new Stop('ANSWERS NEEDED')
            }
            if (r.malformed) throw new Stop('MODEL REPLY MALFORMED')
            answers = r.answers
          }
          for (const f of qs) {
            const isPay = PAY_LABEL.test(f.label)
            let a: Answer = answers[f.key] ?? answers[f.label] ?? { action: 'hold', reason: 'no answer given' }
            if (isPay && a.action !== 'pay' && a.action !== 'hold') a = { action: 'hold', reason: 'a pay or notice question may only be answered with pay' }
            if (!isPay && a.action === 'pay') a = { action: 'hold', reason: 'pay action on a field that is not a pay question' }
            if (a.action === 'hold') { if (f.required) held.push({ label: f.label, reason: a.reason }); else notes.push(`optional left blank: ${f.label}`); continue }
            let value: string
            try { value = await setField(page, modal, f, a) } catch (e) {
              if (a.action === 'pay' && !(e instanceof Stop)) throw new Stop('ERROR: filling a pay answer failed')
              throw e
            }
            if (isPay) paid.set(f.label, value)
            res.answers.push({ label: f.label, kind: f.kind, action: a.action, value: isPay ? 'filled, not shown' : value })
          }
          notes.push(`page ${i + 1}: ${qs.length} questions`)
        } else notes.push(`page ${i + 1}: nothing to fill`)
      }
      if (held.length) throw new Stop('screening questions the bank cannot answer', 'held', 'script', { question: held.map((h) => h.label).join(' | '), reasons: held.map((h) => `question: ${h.label} (${h.reason.slice(0, 120)})`) })

      const next = modal.getByRole('button', { name: /^(next|review|continue)/i }).first()
      if (!(await next.count())) throw new Stop('no Next or Review control on page ' + (i + 1))
      await next.scrollIntoViewIfNeeded().catch(() => {})
      await press(page, next)
      let after = snap
      for (let w = 0; w < 20; w++) {
        await page.waitForTimeout(500)
        after = await readPage(modal)
        if (sig(after) !== sig(snap) || after.errors.length || (await modal.getByRole('button', { name: /submit application/i }).count())) break
      }
      if (sig(after) === sig(snap)) throw new Stop(after.errors.length ? 'validation errors: ' + after.errors.join(' | ') : 'page did not advance', 'failed', 'fallback')
    }
    if (!atReview) throw new Stop('no Review page within 12 pages')

    res.form_to_review_s = +((Date.now() - tForm) / 1000).toFixed(1)
    const rv = await readPage(modal)
    const text = await modal.innerText()
    const resumeShown = text.includes(basename(row.resume))
    notes.push(`review: resume filename ${resumeShown ? 'shown' : 'not shown'}`)
    res.review.resume = resumeShown ? basename(row.resume) : null
    if (!resumeShown) res.reasons.push('HELD: the Review page does not show the resume filename')
    for (const q of compareReview(text, res.answers, paid)) { res.review.questions.push({ label: q.label, shown: q.shown }); if (!q.ok) res.reasons.push(`REVIEW MISMATCH: ${q.label}`) }
    // only the Follow-company box and a plain consent or terms box may be ticked
    const consent = /consent|terms|privacy|agree|acknowledg/i
    for (const l of [...rv.fields.filter((f) => f.kind === 'checkbox' && f.value === 'true' && !/^follow /i.test(f.label)).map((f) => f.label),
      ...res.answers.filter((a) => a.kind === 'checkbox' && a.value === 'true').map((a) => a.label)]) {
      if (!consent.test(l)) res.reasons.push(`HELD: a checkbox is ticked that is not consent: ${l}`)
    }
    if (row.match < floor) res.reasons.push(`HELD: easy apply floor, match ${row.match} under ${floor}`)
    res.would_submit = res.reasons.length === 0
    res.route = 'script'

    if (!o.submit) { res.outcome = 'stopped_before_submit'; return res }
    if (!res.would_submit) { res.outcome = 'held'; return res }
    // submit: reserve just before the click, and only an exit 0 is a reservation
    const rsv = engine('dedupe', 'reserve', '--id', id, '--company', row.company, '--role', row.role, '--link', row.link, '--channel', 'easy_apply', '--source', 'linkedin')
    if (rsv.code !== 0) throw new Stop(rsv.code === 2 ? 'STOPPED: opening already reserved or spent' : `STOPPED: dedupe reserve exited ${rsv.code}`, 'held', 'script')
    reserved = true
    clearTimeout(overall) // from here nothing may exit between the click and the record
    const submit = modal.getByRole('button', { name: /submit application/i }).first()
    const c0 = clicks
    try {
      await submit.scrollIntoViewIfNeeded().catch(() => {})
      await press(page, submit)
    } catch (e) {
      // unreserve only when no click went out; after a click the reservation stays
      if (clicks === c0) { engine('dedupe', 'unreserve', '--id', id, '--reason', 'the Submit click was never sent'); reserved = false }
      else res.reasons.push('STOPPED: submit clicked, then the page stopped the run')
      throw e
    }
    let sent = false
    for (let w = 0; w < 30 && !sent; w++) { await page.waitForTimeout(500); sent = /application (was )?sent|application submitted/i.test(await page.locator('body').innerText().catch(() => '')) }
    // a click was sent, so the reservation stays: the form may have gone, and only a person can tell
    if (!sent) {
      // pay-safe trace: control names only, 60 chars each, no digit run of 4+, never input values or body text
      try {
        const keep = (a: string[]) => a.map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 60)).filter((t) => t && !/\d{4}/.test(t)).slice(0, 12)
        const vis = async (l: Locator) => { const o: string[] = []; for (const e of await l.all()) if (await e.isVisible().catch(() => false)) o.push((await e.innerText().catch(() => '')) || (await e.getAttribute('aria-label').catch(() => '')) || ''); return o }
        const dl: string[] = []
        for (const d of await page.getByRole('dialog').all()) dl.push((await d.getAttribute('aria-label').catch(() => '')) || (await d.locator('h1, h2, h3, [role=heading]').first().innerText().catch(() => '')) || '')
        notes.push(`after submit: headings=${JSON.stringify(keep(await vis(page.locator('h1, h2, h3, [role=heading]'))))} buttons=${JSON.stringify(keep(await vis(page.getByRole('button'))))} dialogs=${JSON.stringify(keep(dl))}`)
      } catch { /* the trace must not change the outcome */ }
      throw new Stop('STOPPED: submit clicked, no success state seen', 'held', 'script')
    }
    submitted = true
    const rec = engine('dedupe', 'record', '--source', 'linkedin', '--company', row.company, '--role', row.role, '--link', row.link, '--channel', 'easy_apply', '--role-file', `my-sessions/ledger/roles/${id}.md`)
    if (rec.code !== 0) notes.push('RECORD FAILED')
    res.outcome = 'applied'; res.applied_date = new Date().toISOString().slice(0, 10)
    return res
  } catch (e) {
    const s = e instanceof Stop ? e : new Stop('ERROR: ' + (e as Error).message.split('\n')[0])
    Object.assign(res, { outcome: s.outcome, route: s.route }, s.extra)
    if (!s.extra.reasons) res.reasons.push(s.message)
    if (page && process.env.EA_CAPTURE && !private_(curStep)) {
      await page.screenshot({ path: join(process.env.EA_CAPTURE, 'fail.png') }).catch(() => {})
      writeFileSync(join(process.env.EA_CAPTURE, 'fail.html'), await page.content().catch(() => ''))
    }
    return res
  } finally {
    clearTimeout(overall)
    try { await cleanup() } finally {
      if (wallSeen && !res.reasons.some((r) => /SECURITY STOP|SIGNED OUT/.test(r))) res.reasons.push(wallSeen === 'security' ? 'SECURITY STOP: seen during clean-up' : 'SIGNED OUT during clean-up')
      if (res.reasons.some((r) => /SECURITY STOP/.test(r))) notes.push('RUN THIS to start the cooldown: ' + COOLDOWN)
      fin()
    }
  }
}

// One window, headed, so the candidate signs in by hand. The session stays in the profile folder.
async function login(): Promise<number> {
  const ctx = await launch(false)
  const page = ctx.pages()[0] ?? (await ctx.newPage())
  await page.goto('https://www.linkedin.com/login')
  console.log('Sign in in the Chrome window. Waiting up to 5 minutes.')
  const ok = await page.waitForURL(/linkedin\.com\/feed/, { timeout: 300_000 }).then(() => true, () => false)
  await ctx.close()
  console.log(ok ? 'Signed in. The session is saved.' : 'Timed out.')
  return ok ? 0 : 1
}

// One Easy Apply row from a live /hunt in one call: the row's bookkeeping is done here, and stdout holds only EA-RESULT / EA-OFF lines.
async function hunt(id: string, S: string, line: string): Promise<number> {
  const first = (s: string) => s.split('\n')[0]
  const eng = (...a: string[]) => engine('--session', S, ...a)
  const out = (s: string) => console.log(s)
  const s0 = eng('session', 'started', 'a-' + id)
  if (s0.code !== 0) { out(`EA-RESULT ${id} fallback session started failed: ${first(s0.out)}`); return 0 }
  const off = join(S, '.ea/script-off')
  mkdirSync(join(S, '.ea'), { recursive: true })
  if (existsSync(off)) { const why = first(readFileSync(off, 'utf8')); out(`EA-RESULT ${id} fallback ${why}`); out(`EA-OFF ${why}`); return 0 }
  eng('session', 'log', `a-${id}: ea-apply --submit under go-ahead: ${line}`)
  const dir = join(S, '.ea')
  delete process.env.EA_CAPTURE // a capture could hold a pre-filled pay answer
  let res: Result | undefined
  try { res = await apply(id, { out: dir, submit: true, headed: false }) } catch (e) { console.error('apply threw: ' + (e as Error).message.split('\n')[0]) }
  const why = res?.reasons[0] ?? 'no result'
  if (res && res.reasons.some((r) => /SIGNED OUT/.test(r))) {
    const msg = "the script's Chrome profile is signed out; run node process/tools/ea-apply.ts login"
    writeFileSync(off, msg + '\n')
    eng('finding', 'add', '--json', JSON.stringify({ kind: 'blocked', stage: 'apply', id, summary: 'Easy Apply script is signed out', proposed: { reason: 'the script Chrome profile is signed out of LinkedIn', action_for_candidate: 'run: node process/tools/ea-apply.ts login' } }))
    out(`EA-RESULT ${id} fallback ${why}`); out(`EA-OFF ${msg}`); return 0
  }
  if (!res || res.route !== 'script') { out(`EA-RESULT ${id} fallback ${why}`); return 0 }
  const fail = (what: string, r: { code: number }) => { if (r.code !== 0) res!.notes += `; ${what} FAILED` }
  try {
    const row = loadRow(id)
    for (const q of (res.question ?? '').split(' | ').filter(Boolean)) {
      fail('answer_gap finding', eng('finding', 'add', '--json', JSON.stringify({ kind: 'answer_gap', stage: 'apply', id, summary: q.slice(0, 80), proposed: { question: q } })))
    }
    const body = [res.outcome === 'applied' ? 'submitted' : 'held', ...res.answers.map((a) => `${a.label} [${a.kind}, ${a.action}]: ${a.value}`),
      ...res.review.questions.map((q) => `review: ${q.label}: ${q.shown}`), ...res.reasons.map((r) => 'reason: ' + r), res.notes && 'notes: ' + res.notes].filter(Boolean).join('\n')
    const r = spawnSync('node', [join(C.PROCESS, 'engine.ts'), '--session', S, 'session', 'send', 'add', '--id', id, '--kind', 'application', '--title', `${row.company}, ${row.role}, easy_apply`, '--body-file', '-'], { cwd: C.REPO, encoding: 'utf8', input: body })
    fail('send add', { code: r.status ?? 1 })
  } catch (e) { res.notes += '; bookkeeping threw: ' + (e as Error).message.split('\n')[0] }
  const sec = res.reasons.find((r) => /SECURITY STOP/.test(r))
  if (sec) fail('outreach stop', eng('outreach', 'stop', '--reason', sec))
  const stopped = /^STOPPED: submit clicked/.test(why)
  if (stopped) writeFileSync(off, 'an earlier Submit click was not confirmed\n')
  // the commit point: nothing after this may fail the row
  mkdirSync(join(S, '.stage/apply'), { recursive: true })
  writeResult(join(S, '.stage/apply'), res)
  if (stopped) out('EA-OFF an earlier Submit click was not confirmed')
  out(sec ? `EA-RESULT ${id} security ${why}` : `EA-RESULT ${id} staged ${res.outcome} ${res.reasons[0] ?? 'clean'}`)
  return 0
}

async function main(argv: string[]): Promise<number> {
  const [cmd, arg] = argv
  const flag = (n: string) => argv.includes(n)
  const val = (n: string) => argv[argv.indexOf(n) + 1]
  if (cmd === 'login') return login()
  if (cmd === 'plan' && arg) {
    const row = loadRow(arg)
    const c = contact()
    console.log(JSON.stringify({ ...row, resume: row.resume.replace(C.REPO + '/', ''), phone: `${c.country} ${'*'.repeat(c.number.length - 2)}${c.number.slice(-2)}`, linkedin_clear: linkedinClear() }, null, 1))
    return 0
  }
  if (cmd === 'hunt' && arg && flag('--session') && flag('--go-ahead')) {
    if (!existsSync(val('--session'))) { console.error('usage: the session folder does not exist: ' + val('--session')); return 2 }
    return hunt(arg, val('--session'), val('--go-ahead'))
  }
  if (cmd === 'apply' && arg && flag('--out')) {
    const r = await apply(arg, { out: val('--out'), answers: flag('--answers') ? val('--answers') : undefined, submit: flag('--submit'), headed: flag('--headed') })
    console.log(JSON.stringify(r, null, 1))
    const why = r.reasons.join()
    if (/SECURITY STOP/.test(why)) { console.error('SECURITY STOP. Start the cooldown: ' + COOLDOWN); return 4 }
    return /SIGNED OUT/.test(why) ? 5 : 0
  }
  if (cmd === 'ask-sample') {
    const fields: Field[] = [
      { key: 'q1', label: 'How many years of work experience do you have with Python?', kind: 'number', required: true, value: '' },
      { key: 'q2', label: 'What is your notice period?', kind: 'select', required: true, value: 'Select an option', options: ['Select an option', 'Immediate', '15 days', '30 days', '60 days or more'] },
      { key: 'q3', label: 'Are you comfortable working on-site in Springfield?', kind: 'radio', required: true, value: '', options: ['Yes', 'No'] },
      { key: 'q4', label: 'What is your expected annual salary?', kind: 'text', required: true, value: '' },
    ]
    const { answers, usage } = await answerQuestions({ company: 'Sample Co', role: 'AI Engineer' }, fields)
    for (const f of fields) console.log(f.key, answers[f.key].action)
    const a = answers[fields[0].key]
    if (usage.tokens === 0 && a.action === 'hold') console.log(a.reason)
    console.log(`tokens=${usage.tokens} seconds=${usage.seconds.toFixed(1)}`)
    return 0
  }
  console.error('usage: ea-apply.ts plan <row-id> | ask-sample | login | apply <row-id> --out <dir> [--answers <file>] [--submit] [--headed] | hunt <row-id> --session <S> --go-ahead "<line>"')
  return 2
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(await main(process.argv.slice(2)))
