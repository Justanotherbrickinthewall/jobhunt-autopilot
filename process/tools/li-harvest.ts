// The two LinkedIn harvest lanes without the sweep-source agent: plain Node fetch on LinkedIn's guest endpoints. No browser, no sign-in.
// `sweep --out <dir>` is read-only: it writes the sweep JSON and JD files into <dir> and nothing else, and it runs `dedupe check` only.
// `hunt-sweep --session <R>` is what step 2 of a hunt runs. It writes R/.stage/sweep/ and the JD files, as the sweep-source agent did.
// Exit codes: 0 done, 1 failed, 2 usage, 3 timeout, 4 a wall (429, 999, authwall, checkpoint), for `sweep` only. `hunt-sweep` exits 0 even on a wall, and the parent reads its lines, not the code. Result lines start `LH-SWEEP`, a wall also prints `LH-OFF`.
// In `hunt-sweep` a 429, a 999 or an authwall hands that lane to the sweep-source agent (`fallback`), and the other lane then falls back without a request. Only a checkpoint is `security`: it runs `outreach stop` and closes both lanes. A checkpoint during the JD reads keeps that lane's rows: it prints `LH-SWEEP <lane> ok <n>`, then `LH-OFF`, runs `outreach stop`, and the next lane prints `security`.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import * as C from '../constants.ts'
import { engine } from './ea-apply.ts'

const SEARCH = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search'
const JOB = 'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/'
const LANES = ['linkedin-ea', 'linkedin-ex'] as const
type Lane = (typeof LANES)[number]
const PAGES_MAX = 10 // the runner's cap per keyword
const AL_PAGES_MAX = 20 // shortcut: the runner walks the Easy Apply pass to a zero-length 200 or 100 pages. 20 keeps the run short and the evidence is written as weak when it is hit. Raise it if the weak caveat hides real Easy Apply roles.
const LITTLE = 10 // GUESS: the runner says "when the primaries return little". Under this many kept rows from the primaries adds the rotation.
const ADJACENT_MAX = 5 // shortcut: the agent judged how many adjacent titles to recover. Five per keyword matches the last hunt (1 to 5). Raise it if the matcher queue starves.
const BUDGET_S = 400 // the parent's Bash call has 480 s. The whole run stops reading at this many seconds and writes what it has.
const WAIT_MIN = 1200 // ms between requests, plus a random 0 to 2300 ms. The runner's 300 ms gave no 429s, a person is slower.
const WAIT_SPAN = 2300

class Stop extends Error {}
// kind: throttle is a 429 or 999, authwall a sign-in redirect or page, checkpoint a security challenge.
class Off extends Error {
  kind: 'throttle' | 'authwall' | 'checkpoint'
  constructor(kind: 'throttle' | 'authwall' | 'checkpoint', msg: string) { super(msg); this.kind = kind }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const first = (s: string) => s.split('\n')[0]
const ist = () => new Date(Date.now() + 5.5 * 3600_000).toISOString()
const nrm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '')

// ---- requests --------------------------------------------------------------------------------------------------

const ctx = { reqs: 0, deadline: 0, lastAt: 0 }
const over = () => Date.now() > ctx.deadline

// One request at a time, a random wait before each. Returns the body, or null for a 404 or 410.
async function get(url: string): Promise<string | null> {
  const gap = WAIT_MIN + Math.random() * WAIT_SPAN - (Date.now() - ctx.lastAt)
  if (ctx.reqs > 0 && gap > 0) await sleep(gap)
  ctx.reqs++
  let r: Response | undefined
  for (let a = 0; a < 2 && !r; a++) {
    try {
      r = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(30_000) })
    } catch (e) {
      if (a === 1) throw new Stop('network: ' + (e as Error).message.split('\n')[0])
      await sleep(5000)
    }
  }
  ctx.lastAt = Date.now()
  const s = r!.status
  if (s === 429 || s === 999) throw new Off('throttle', `status ${s}`)
  if (s >= 300 && s < 400) {
    const loc = r!.headers.get('location') ?? ''
    if (/checkpoint|challenge/i.test(loc)) throw new Off('checkpoint', 'redirect to a checkpoint')
    if (/authwall|login|signup|uas\//i.test(loc)) throw new Off('authwall', 'redirect to a sign-in page')
    throw new Stop(`unexpected redirect ${s}`)
  }
  if (s === 404 || s === 410) return null
  if (s !== 200) throw new Stop(`status ${s}`)
  const body = await r!.text()
  const title = /<title[^>]*>([^<]*)/i.exec(body)?.[1] ?? ''
  if (/security verification|let.s do a quick security check/i.test(title)) throw new Off('checkpoint', 'security verification page')
  if (/sign in|log in|join linkedin|sign up/i.test(title) || /authwall/i.test(body.slice(0, 3000))) throw new Off('authwall', 'sign-in page')
  return body
}

// ---- text helpers ----------------------------------------------------------------------------------------------

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
const decode1 = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e.toLowerCase()] ?? m))
const decode = (s: string) => { let p = s; for (let i = 0; i < 5; i++) { const n = decode1(p); if (n === p) break; p = n } return p } // titles can be double-encoded
const tidy = (s: string) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const toText = (h: string) => decode(h.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|ul|ol|h\d)>/gi, '\n\n').replace(/<li[^>]*>/gi, '\n- ').replace(/<[^>]+>/g, ''))
  .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
const pad = (n: number) => String(n).padStart(2, '0')
const local = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

// ---- cards -----------------------------------------------------------------------------------------------------

type Card = { id: string; title: string; company: string; location: string; postedAt: string; postedNote: string }
const CARD = /data-entity-urn="urn:li:jobPosting:(\d+)"[\s\S]*?base-search-card__title">([\s\S]*?)<\/h3>[\s\S]*?base-search-card__subtitle">([\s\S]*?)<\/h4>[\s\S]*?job-search-card__location">([\s\S]*?)<\/span>/g
const UNITS: Record<string, number> = { minute: 60e3, hour: 3600e3, day: 86400e3, week: 7 * 86400e3, month: 30 * 86400e3 }

// R2: minutes and hours give the time minus the span. Days and weeks give the same and a note. No text falls back to the datetime day.
function posted(slice: string, at: number): { when: string; note: string } {
  const rel = /(\d+)\s+(minute|hour|day|week|month)s?\s+ago/i.exec(slice)
  if (rel) return { when: local(new Date(at - +rel[1] * UNITS[rel[2].toLowerCase()])), note: /day|week|month/i.test(rel[2]) ? `posted_at estimated from "${rel[0]}"` : '' }
  const day = /datetime="(\d{4}-\d{2}-\d{2})"/.exec(slice)?.[1]
  return day ? { when: day, note: '' } : { when: '', note: 'no posting age shown' }
}

function parseCards(html: string, at: number): Card[] {
  const out: Card[] = []
  const hits = [...html.matchAll(CARD)]
  for (let i = 0; i < hits.length; i++) {
    const m = hits[i]
    const end = (m.index ?? 0) + m[0].length
    const next = html.indexOf('data-entity-urn=', end)
    const p = posted(html.slice(end, next < 0 ? undefined : next), at)
    let company = tidy(m[3])
    if (/apply now|\bago\b/i.test(company) || company.length > 70 || !company) company = 'UNPARSED' // never guess a name
    out.push({ id: m[1], title: tidy(m[2]), company, location: tidy(m[4]), postedAt: p.when, postedNote: p.note })
  }
  const urns = (html.match(/data-entity-urn="urn:li:jobPosting:/g) ?? []).length
  if (urns > 0 && out.length === 0) throw new Stop('cards exist but none parsed: suspect the regex before LinkedIn')
  return out
}

// ---- keywords --------------------------------------------------------------------------------------------------

// shortcut: the runner builds each title regex by judgement. This builds it from the keyword: the words inside its quotes and the words outside them, minus generic
// words, each matched as a word prefix (a word of 3 letters or fewer, such as ai, as a whole word). Forward Deployed uses the runner's own regex. Upgrade to a per-keyword override in inputs.toml
// if a keyword keeps pulling off-topic titles.
const GENERIC = new Set(['engineer', 'engineering', 'senior', 'sr', 'junior', 'lead', 'developer', 'of', 'the', 'and', 'for', 'a'])
const stem = (w: string) => /^deploy(ed|ment|ing)$/.test(w) ? 'deploy' : w.length > 4 ? w.replace(/s$/, '') : w
function onPhrase(q: string): RegExp {
  const split = (t: string) => t.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  const inside = split([...q.matchAll(/"([^"]*)"/g)].map((m) => m[1]).join(' '))
  const words = [...inside, ...split(q.replace(/"[^"]*"/g, ' '))]
  if ((inside.length ? inside : words).join(' ') === 'forward deployed') return /forward.?deploy(ed|ment)?|(^|[^a-z])fde([^a-z]|$)/i
  const spec = words.filter((w) => !GENERIC.has(w))
  const need = (spec.length ? spec : words).map(stem)
  return new RegExp(need.map((w) => `(?=.*(^|[^a-z0-9])${w}${w.length <= 3 ? '([^a-z0-9]|$)' : ''})`).join('') + '.*', 'i')
}
// shortcut: the agent's `adjacent` tranche was a judgement. An AI term plus a role noun in an off-phrase title, five at most per keyword.
const ADJ_AI = /(^|[^a-z0-9])(ai|a\.i\.|genai|gen ai|agentic|llm|llms|ml|machine learning|generative)([^a-z0-9]|$)/i
const ADJ_ROLE = /engineer|architect|developer|scientist|lead|manager|specialist|consultant/i
// A hard filter a card can show: the title says intern, trainee or fresher. Every other hard filter needs the JD, so it stays with scoring.
const JUNIOR = /(^|[^a-z])(intern|interns|internship|internships|trainee|trainees|fresher|freshers)([^a-z]|$)/i

const normKw = (q: string) => q.replace(/"/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
// shortcut: R2 name normalisation by rule, not by reading. Strips brackets, "in India", a trailing country and "-ad".
const normCompany = (c: string) => nrm(c.replace(/\([^)]*\)/g, '').replace(/\s+in\s+india\b/i, '').replace(/[\s,-]+(india|usa|uk|us)$/i, '').replace(/-ad$/i, ''))

// The queries the last hunt ran on this lane, from its `## Sweeps` line. None when no earlier hunt swept the lane.
function lastQueries(lane: Lane, skip: string | null): Set<string> {
  const dirs = C.sessionFolders(null, 'hunt', null, true).reverse()
  for (const d of dirs) {
    if (skip && resolve(d) === resolve(skip)) continue
    const m = new RegExp(`^- ${lane}: queries (.*?), pages \\d+`, 'm').exec(readFileSync(join(d, 'notes.md'), 'utf8'))
    if (m) return new Set(m[1].split(';').map(normKw))
  }
  return new Set()
}

// ---- one lane --------------------------------------------------------------------------------------------------

type Row = Record<string, string | null>
type PerQuery = { q: string; pages: number; kept: number; discarded: number; discarded_titles: string[] }
type Summary = {
  status: string; reason: string; lane: string; firing: string; window: string; windowFromLast: boolean; seconds: number; requests: number
  cards_seen: number; kept: number; dropped: number; jd_expected: number; jd_saved: number; jd_failed: number; truncated: boolean; off: string; offKind: string
  alPass: { q: string; ids: number; pages: number; complete: boolean }[]; perQuery: PerQuery[]; collapsed: string[]
}

async function laneSweep(lane: Lane, out: string, jdDir: string, deadline: number, ledgerDirs: boolean): Promise<{ code: number; sum: Summary; files: string[] }> {
  mkdirSync(out, { recursive: true }); mkdirSync(jdDir, { recursive: true })
  const t0 = Date.now()
  const conf = C.cfg()
  const firing = ist().slice(0, 13).replace('T', '-')
  const ex = lane === 'linkedin-ex'
  let window = ex ? conf.linkedin_ex_posted_within : engine('session', 'ea-window').out
  let windowFromLast = false
  if (ex) { // the shared runner's rule: a last hunt over 24 hours ago widens the window to the time since it, up to a week
    const last = engine('session', 'last-started').out
    const at = Date.parse(last)
    if (!Number.isNaN(at) && Date.now() - at > 86400e3) { window = 'r' + Math.min(604800, Math.floor((Date.now() - at) / 1000)); windowFromLast = true }
  }
  const sum: Summary = { status: 'ok', reason: '', lane, firing, window, windowFromLast, seconds: 0, requests: 0, cards_seen: 0, kept: 0, dropped: 0, jd_expected: 0, jd_saved: 0, jd_failed: 0, truncated: false, off: '', offKind: '', alPass: [], perQuery: [], collapsed: [] }
  ctx.deadline = deadline
  const reqs0 = ctx.reqs
  const channel = ex ? 'external_ats' : 'easy_apply'
  const rows: (Row & { _page: string; _q: string; _id: string })[] = []
  const seen = new Set<string>() // ids already judged in this lane
  const al = new Set<string>() // ids the Easy Apply pass found (ex lane)
  const spent = new Map<string, boolean>()
  const url = (q: string, start: number, alOnly: boolean) =>
    `${SEARCH}?keywords=${encodeURIComponent(q)}&geoId=${conf.linkedin_geo_id}&f_TPR=${window}${alOnly || !ex ? '&f_AL=true' : ''}&start=${start}`
  let pageNo = 0

  // Walk one pass: pages until a zero-length 200, two pages under 30% on-phrase, or the cap. Returns the cards and whether it ended on a zero-length 200.
  const walk = async (q: string, re: RegExp, alOnly: boolean, cap: number) => {
    const cards: { c: Card; page: number; on: boolean }[] = []
    let low = 0, pages = 0, complete = false
    for (let n = 0; n < cap; n++) {
      if (over()) { sum.truncated = true; break }
      const html = await get(url(q, n * 10, alOnly))
      pages++
      if (!html || !html.trim()) { complete = true; break }
      const cs = parseCards(html, Date.now())
      if (!cs.length) { complete = true; break }
      const on = cs.filter((c) => re.test(c.title)).length
      for (const c of cs) cards.push({ c, page: n + 1, on: re.test(c.title) })
      low = on / cs.length < 0.3 ? low + 1 : 0
      if (low >= 2) break
    }
    return { cards, pages, complete }
  }

  const runQuery = async (q: string) => {
    const rec: PerQuery = { q, pages: 0, kept: 0, discarded: 0, discarded_titles: [] }
    sum.perQuery.push(rec)
    const re = onPhrase(q)
    let alComplete = false
    if (ex) {
      const a = await walk(q, re, true, AL_PAGES_MAX)
      for (const x of a.cards) al.add(x.c.id)
      alComplete = a.complete
      sum.alPass.push({ q, ids: a.cards.length, pages: a.pages, complete: a.complete })
    }
    const p = await walk(q, re, false, PAGES_MAX)
    rec.pages = p.pages
    let adj = 0
    for (const { c, page, on } of p.cards) {
      if (seen.has(c.id)) continue
      const adjacent = !on && adj < ADJACENT_MAX && ADJ_AI.test(c.title) && ADJ_ROLE.test(c.title) && !JUNIOR.test(c.title)
      if (!on && !adjacent) { rec.discarded++; if (rec.discarded_titles.length < 50) rec.discarded_titles.push(c.title); continue }
      seen.add(c.id); sum.cards_seen++
      if (ex && al.has(c.id)) continue // an Easy Apply role belongs to the other lane. Re-checked at the end for ids a later keyword finds.
      const link = `https://www.linkedin.com/jobs/view/${c.id}/`
      if (!spent.has(c.id)) spent.set(c.id, engine('dedupe', 'check', c.company, c.title, link).code === 2)
      if (spent.get(c.id)) continue
      if (adjacent) adj++
      const caveat = ex ? `external_ats: absent from the Easy Apply pass for this keyword, which ${alComplete ? 'ended on a zero-length page, so firm evidence' : 'did not reach its end, so weak evidence'}` : ''
      const junior = JUNIOR.test(c.title)
      rows.push({
        _page: `${q}\u0000${page}`, _q: q, _id: c.id,
        source: 'linkedin', channel, company: c.company, role: c.title, location: c.location, link, posted_at: c.postedAt,
        notes: [adjacent && 'adjacent', c.company === 'UNPARSED' && 'company name did not parse', c.postedNote, caveat].filter(Boolean).join('; '),
        drop_reason: junior ? 'internship, trainee or fresher role, by its title' : null,
      })
      rec.kept++
    }
  }

  try {
    for (const q of conf.search_primary) await runQuery(q)
    const kept0 = rows.filter((r) => !r.drop_reason).length
    if (kept0 < LITTLE) { // shortcut: rotation is three keywords the last hunt did not run, in file order
      const ran = lastQueries(lane, ledgerDirs ? out.replace(/[\\/]\.li[\\/].*$/, '') : null)
      const rest = conf.search_rotation.filter((q) => !ran.has(normKw(q)))
      for (const q of (ran.size ? rest : conf.search_rotation).slice(0, 3)) await runQuery(q)
    }
    // R2 step 2: collapse one role posted in several places to one row, and name the variants. Distinct titles stay distinct, so seniority and requisition numbers hold.
    const byKey = new Map<string, number>()
    const keep: typeof rows = []
    for (const r of rows) {
      if (ex && al.has(r._id)) continue
      const k = normCompany(r.company ?? '') + '|' + nrm(r.role ?? '')
      const at = byKey.get(k)
      if (at === undefined) { byKey.set(k, keep.length); keep.push(r); continue }
      const v = `${r.location} (${r._id})`
      keep[at].notes = [keep[at].notes, `also posted: ${v}`].filter(Boolean).join('; ')
      sum.collapsed.push(`${r._id} into ${keep[at]._id}`)
    }
    sum.kept = keep.filter((r) => !r.drop_reason).length
    sum.dropped = keep.length - sum.kept

    // The JD of every kept row, by the per-job guest endpoint. A wall here ends the JD reads and keeps the rows.
    const need = keep.filter((r) => !r.drop_reason)
    sum.jd_expected = need.length
    let jdOff = '', jdOffKind = ''
    for (const r of need) {
      if (over()) { sum.truncated = true; break }
      try {
        const html = await get(JOB + r._id)
        const body = html && /show-more-less-html__markup[^>]*>([\s\S]*?)<\/div>/.exec(html)?.[1]
        if (!html || !body) { sum.jd_failed++; continue }
        const crit = [...html.matchAll(/description__job-criteria-subheader">([\s\S]*?)<\/h3>[\s\S]*?description__job-criteria-text[^>]*>([\s\S]*?)<\/span>/g)].map((m) => `${tidy(m[1])}: ${tidy(m[2])}`)
        const ctl = /public_jobs_apply-link-(\w+)/.exec(html)?.[1]
        const head = [`${r.role} at ${r.company}`, r.location, ...crit, ctl && `Apply control: public_jobs_apply-link-${ctl}`].filter(Boolean).join('\n')
        writeFileSync(join(jdDir, `linkedin-${r._id}.jd.md`), `<!-- source: ${r.link}, read ${ist().slice(0, 10)} -->\n${head}\n\n${toText(body)}\n`)
        sum.jd_saved++
        if (ctl) r.notes = [r.notes, `JD apply control: ${ctl}`, ex && /onsite|simple/.test(ctl) && 'JD APPLY CONTROL SAYS EASY APPLY'].filter(Boolean).join('; ')
      } catch (e) {
        if (e instanceof Off) { jdOff = `${e.kind} on a JD read: ${e.message}`; jdOffKind = e.kind; break }
        sum.jd_failed++
      }
    }
    if (jdOff) { sum.off = jdOff; sum.offKind = jdOffKind; if (!(ledgerDirs && jdOffKind === 'checkpoint')) console.log(`LH-OFF ${lane} ${jdOff}`) } // hunt-sweep prints a checkpoint itself, after its LH-SWEEP line

    // One file per results page that kept a row, as the agent wrote them.
    const files: string[] = []
    const pages = new Map<string, typeof rows>()
    for (const r of keep) { const a = pages.get(r._page) ?? []; a.push(r); pages.set(r._page, a) }
    for (const [key, list] of pages) {
      const name = `${firing}-${lane}-${++pageNo}.json`
      const clean = list.map(({ _page, _q, _id, ...row }) => row)
      writeFileSync(join(out, name), JSON.stringify({ source: 'linkedin', firing, queries: [key.split('\u0000')[0]], rows: clean }, null, 1) + '\n')
      files.push(name)
    }
    sum.seconds = +((Date.now() - t0) / 1000).toFixed(1); sum.requests = ctx.reqs - reqs0
    writeFileSync(join(out, `li-sweep-summary-${lane}.json`), JSON.stringify(sum, null, 1) + '\n')
    return { code: 0, sum, files }
  } catch (e) {
    sum.status = 'failed'
    sum.seconds = +((Date.now() - t0) / 1000).toFixed(1); sum.requests = ctx.reqs - reqs0
    let code = 1
    if (e instanceof Off) { code = 4; sum.reason = `${e.kind}: ${e.message}`; sum.off = e.kind; console.log(`LH-OFF ${lane} ${sum.reason}`) } else sum.reason = e instanceof Stop ? e.message : 'ERROR: ' + (e as Error).message.split('\n')[0]
    writeFileSync(join(out, `li-sweep-summary-${lane}.json`), JSON.stringify(sum, null, 1) + '\n')
    return { code, sum, files: [] }
  }
}

// ---- commands --------------------------------------------------------------------------------------------------

function lanesFor(arg: string | undefined): Lane[] | null {
  if (arg) return (LANES as readonly string[]).includes(arg) ? [arg as Lane] : null
  return LANES.filter((l) => C.cfg().live_sources.includes(l))
}

// Read-only. Both lanes share one run budget, and each lane gets an equal share of what is left.
async function sweep(out: string, lanes: Lane[], budgetS: number): Promise<number> {
  const t0 = Date.now()
  const hard = setTimeout(() => { console.log('LH-SWEEP timeout'); process.exit(3) }, (budgetS + 40) * 1000)
  let worst = 0
  try {
    for (let i = 0; i < lanes.length; i++) {
      const left = t0 + budgetS * 1000 - Date.now()
      const r = await laneSweep(lanes[i], out, out, Date.now() + left / (lanes.length - i), false)
      console.log(`${r.sum.status} ${lanes[i]}${r.sum.reason ? ': ' + r.sum.reason : ''}. cards kept ${r.sum.kept}, dropped ${r.sum.dropped}, requests ${r.sum.requests}, JDs ${r.sum.jd_saved} of ${r.sum.jd_expected}, ${r.sum.seconds}s, window ${r.sum.window}${r.sum.truncated ? ', stopped at the time budget' : ''}`)
      if (r.code) worst = worst || r.code
      if (r.code === 4) break // a wall closes both LinkedIn lanes
    }
  } finally { clearTimeout(hard) }
  return worst
}

// The sweep of a live /hunt: stdout has one LH-SWEEP line per lane. The sweep JSON is staged only on success.
async function huntSweep(S: string, lanes: Lane[], budgetS: number): Promise<number> {
  const eng = (...a: string[]) => engine('--session', S, ...a)
  const out = (s: string) => console.log(s)
  const t0 = Date.now()
  const hard = setTimeout(() => { out('LH-SWEEP timeout'); process.exit(3) }, (budgetS + 40) * 1000)
  let wall = ''
  let soft = '' // throttle or authwall seen on an earlier lane
  try {
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i]
      if (wall) { eng('session', 'sweep', lane, 'status=failed', 'reason=login wall'); out(`LH-SWEEP ${lane} security`); continue }
      if (engine('outreach', 'cooldown').code === 2) { out(`LH-SWEEP ${lane} paused`); continue }
      const s0 = eng('session', 'started', `s-${lane}`)
      if (s0.code !== 0) { out(`LH-SWEEP ${lane} fallback session started failed: ${first(s0.out)}`); continue }
      if (soft) { out(`LH-SWEEP ${lane} fallback ${soft}: after the other lane's ${soft === 'throttle' ? '429' : 'authwall'}`); continue }
      const work = join(S, '.li', 'sweep', lane)
      rmSync(work, { recursive: true, force: true })
      const left = t0 + budgetS * 1000 - Date.now()
      const r = await laneSweep(lane, work, C.ROLES, Date.now() + left / (lanes.length - i), true)
      if (r.code === 4 && r.sum.off) {
        const why = r.sum.reason
        if (r.sum.off !== 'checkpoint') { out(`LH-SWEEP ${lane} fallback ${r.sum.off}: ${why}`.slice(0, 200)); soft = r.sum.off; continue } // the tag stays registered and no sweep line is written, so the agent's run records the lane itself
        eng('outreach', 'stop', '--reason', `LinkedIn guest endpoint: ${why}`)
        eng('session', 'sweep', lane, 'status=failed', 'reason=login wall')
        out(`LH-SWEEP ${lane} security`); wall = why
        continue
      }
      if (r.code !== 0) { out(`LH-SWEEP ${lane} fallback ${r.sum.reason || 'sweep exited ' + r.code}`.slice(0, 200)); continue }
      mkdirSync(join(S, '.stage/sweep'), { recursive: true })
      for (const f of r.files) copyFileSync(join(work, f), join(S, '.stage/sweep', f))
      r.sum.perQuery.forEach((q, n) => eng('session', 'sweep', lane, `query=${q.q}`, `pages=${q.pages}`, `kept=${q.kept}`, ...(n === 0 && r.sum.windowFromLast ? [`window=${r.sum.window}`] : [])))
      // the engine adds up only pages and kept, so the discard count goes in once as a lane total. The titles are in li-sweep-summary-<lane>.json under .li/sweep/<lane>/ in the session
      eng('session', 'sweep', lane, `discarded=${r.sum.perQuery.reduce((a, q) => a + q.discarded, 0)}`)
      eng('session', 'sweep', lane, 'status=ok')
      out(`LH-SWEEP ${lane} ok ${r.sum.kept}${r.sum.truncated ? ' (time budget reached)' : ''}`)
      if (r.sum.offKind === 'checkpoint') { // a checkpoint during the JD reads: the rows stay staged, the cooldown starts and the other lane gets no request
        eng('outreach', 'stop', '--reason', `LinkedIn guest endpoint: ${r.sum.off}`)
        out(`LH-OFF ${lane} ${r.sum.off}`.slice(0, 200)); wall = r.sum.off
      }
    }
  } finally { clearTimeout(hard) }
  return 0
}

async function main(argv: string[]): Promise<number> {
  const [cmd] = argv
  const val = (n: string) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined)
  const lanes = lanesFor(val('--lane'))
  const budget = Number(val('--budget') ?? BUDGET_S)
  if (!lanes || !lanes.length) { console.error('usage: --lane must be linkedin-ea or linkedin-ex, and be live in search.live_sources'); return 2 }
  if (cmd === 'sweep' && val('--out')) return sweep(val('--out')!, lanes, budget)
  if (cmd === 'hunt-sweep' && val('--session')) {
    if (!existsSync(val('--session')!)) { console.error('usage: the session folder does not exist: ' + val('--session')); return 2 }
    return huntSweep(val('--session')!, lanes, budget)
  }
  console.error('usage: li-harvest.ts sweep --out <dir> [--lane linkedin-ea|linkedin-ex] [--budget <s>] | hunt-sweep --session <S> [--lane ...] [--budget <s>]')
  return 2
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(await main(process.argv.slice(2)))
