// The gate. It walks every file in my-phone/dist and fails on anything that could identify the candidate or
// the machine. Every pattern is built here at run time from my-profile/, git and gh, and held in memory only.
// Output names categories, files and counts, never a matched string. Tier two writes its words to
// my-phone/scan-hits.txt, which stays inside my-phone/.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { ICONS, renderIcon } from './icons.ts'
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, userInfo } from 'node:os'
import { basename, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readDicts } from '../process/lib/csv.ts'
import { DIST, OUT, PRIVATE_DIRS, PROFILE, ROOT, oddEntries, payFigures, payKeyNames, payMatcher, payTopic, prepPayKeys, treeHash, walk } from './lib.ts'

// cs: match the exact case (short tokens). rx: text is a regular expression source.
type Needle = { cat: string; text: string; word: boolean; cs?: boolean; rx?: boolean }

// Short tokens (2 or 3 characters) of names and entities are matched on word boundaries, in the case the profile
// writes them. These are the ones that are ordinary words or filler, so they are not needles.
const SHORT_OK = new Set(['the', 'and', 'for', 'van', 'von', 'der', 'den', 'del', 'la', 'le', 'de', 'of', 'inc', 'ltd', 'llc', 'llp', 'pvt', 'plc', 'co', 'corp', 'ai', 'it', 'us', 'uk', 'in', 'on', 'at', 'to', 'dr', 'mr', 'ms', 'sr', 'jr', 'na', 'nil', 'tbd', 'yes', 'no', 'via', 'new', 'old', 'all'])
// Acronyms that are ordinary technical vocabulary. Any other 2 or 3 capital letters in the profile go to the review list.
const SHORT_TECH = new Set(['API', 'LLM', 'SQL', 'RAG', 'AWS', 'GCP', 'CSV', 'PDF', 'HTTP', 'JSON', 'CLI', 'MCP', 'SDK', 'ETL', 'CPU', 'GPU', 'RAM', 'URL', 'UI', 'UX', 'CI', 'CD', 'QA', 'PR', 'AI', 'ML', 'NLP', 'OCR', 'ADR', 'SLO', 'SLA', 'KPI', 'ROI', 'TTL', 'TLS', 'SSL', 'SSH', 'DNS', 'VPC', 'IAM', 'JWT', 'SQS', 'SNS', 'EC2', 'S3', 'IT', 'HR', 'PM', 'TL', 'EM', 'FDE', 'FDA', 'SaaS', 'ERP', 'CRM', 'BI', 'DB', 'OS', 'IO', 'ID', 'OK', 'TIL', 'USD', 'CAD', 'INR', 'EUR', 'UTC', 'GMT', 'AM', 'PM', 'EOD', 'FAQ', 'XML', 'CSS', 'DOM', 'GUI', 'IDE', 'SRE', 'IaC', 'VM', 'AD', 'SSO', 'MFA', 'RBAC', 'ACL', 'VPN', 'NAT', 'CDN', 'REST', 'GPT', 'BM25', 'KNN', 'ANN', 'PEP', 'MRR', 'NDCG'])

// What the page says about itself. The phone copy must not read as the output of a job-search tool. Each pattern is
// narrow. An entry in PURPOSE_ALLOW is "<file stem>\t<pattern id>" and needs a reason in the line above it.
const PURPOSE: { id: string; re: RegExp; ext?: string }[] = [
  { id: 'browser-key prefix', re: /hunt-board/iu },
  { id: 'candidate label', re: /\bthe candidate said it\b|\bstated: the candidate\b/iu },
  { id: 'job-tool words', re: /\bjob[- ]?(?:hunt|search|board)\b|\bjobhunt\b|\bhunt numbers\b|\bheld roles?\b|\bthe hunt\b/iu },
  { id: 'named job sites', re: /\b(?:naukri|linkedin|wispr|easy apply|workatastartup)\b/iu },
  { id: 'recruiter', re: /\brecruiters?\b/iu },
  { id: 'dashboard areas', re: /\boutreach\b|\bretro\b|\/(?:hunt|retro|outreach)\b/iu },
  { id: 'question bank chip', re: /\basked in a real interview\b/iu },
  { id: 'assistant memory prompt', re: /\bpaste this into your claude\.md\b/iu },
  { id: 'setup command', re: /\brun \/setup\b/iu },
  { id: 'career sentence', re: /\bi am becoming\b|\bbecoming a forward-deployed\b/iu },
  { id: 'dashboard classes', re: /\.(?:ou|rt|nb|iv|pf|kw|dr)-[a-z]/u, ext: '.css' },
]
const PURPOSE_ALLOW: string[] = []

// prep.json is public plain text. Inside it only, organisation names and interview or job-search wording are fine.
// Everything else (pay, email, phone, time zone offset, people, paths, accounts) fails as it does elsewhere.
const PREP_FILE = 'prep.json'
// The candidate's prep answers name the sessions folder as a working practice, so that one folder name is fine in Prep.
const PREP_OK_CATS = new Set(['entity', 'ledger company', 'sessions folder'])
const PREP_OK_PURPOSE = new Set(['job-tool words', 'named job sites', 'recruiter', 'dashboard areas', 'question bank chip', 'career sentence'])
const PREP_EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gu
const PREP_PHONE = /\+?\d[\d\s().-]{8,}\d/gu
const PREP_OFFSET = /\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?\s?(?:[+-]\d{2}:?\d{2}|[A-Z]{3,4}\b(?!\w))|T\d{2}:\d{2}[^"\s]{0,12}[+-]\d{2}:?\d{2}/gu
const phoneHits = (t: string): number => (t.match(PREP_PHONE) ?? []).filter((m) => { const d = m.replace(/\D/gu, '').length; return d >= 10 && d <= 13 }).length

const PROFILE_EXT = new Set(['.md', '.toml', '.json', '.tex', '.txt', '.csv', '.yaml', '.yml'])
const TAGS = /\b(?:stated|artefact|ours)\b/giu

const profileFiles = (): { file: string; text: string }[] => walk(PROFILE).filter((f) => PROFILE_EXT.has(extname(f).toLowerCase())).map((f) => ({ file: f, text: readFileSync(f, 'utf8') }))

function tables(md: string): { head: string[]; rows: string[][] }[] {
  const out: { head: string[]; rows: string[][] }[] = []
  const lines = md.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*\|/u.test(lines[i]) || !/^\s*\|[\s:|-]+\|\s*$/u.test(lines[i + 1] ?? '')) continue
    const cells = (l: string) => l.trim().replace(/^\||\|$/gu, '').split('|').map((c) => c.trim())
    const t = { head: cells(lines[i]), rows: [] as string[][] }
    for (i += 2; i < lines.length && /^\s*\|/u.test(lines[i]); i++) t.rows.push(cells(lines[i]))
    out.push(t)
  }
  return out
}

const clean = (s: string): string => s.replace(/[`*_]/gu, '').replace(TAGS, '').replace(/\b\d{4}-\d{2}-\d{2}\b/gu, '').trim()

const shortOk = (raw: string): boolean => raw.length >= 2 && raw.length <= 3 && /^[A-Za-z0-9&]+$/u.test(raw) && !SHORT_OK.has(raw.toLowerCase())
const plainTex = (s: string): string => s.replace(/\\&/gu, '&').replace(/\\[A-Za-z]+\*?/gu, ' ').replace(/[{}$\\]/gu, ' ').replace(/\s+/gu, ' ').trim()

// A resume's .tex source: the name on the \Huge line, and the company, client and school before \hfill on each dated line.
function texNeedles(tex: string, add: (cat: string, text: string, word?: boolean) => void): void {
  for (const l of tex.split('\n')) {
    if (/\\Huge/u.test(l)) { const nm = plainTex(l); add('name', nm, true); for (const p of nm.split(/\s+/u)) add('name', p, true) }
    if (/\\hfill/u.test(l) && /\d\d\/\d{4}/u.test(l)) {
      const lead = plainTex(l.split('\\hfill')[0])
      add('entity', lead.split(/[,(]/u)[0] ?? '', true)
      for (const v of lead.matchAll(/\bvia\s+([^,(;]+)/giu)) add('entity', v[1], true)
    }
  }
}

function profileNeedles(files: { file: string; text: string }[]): Needle[] {
  const n: Needle[] = []
  const add = (cat: string, text: string, word = false) => {
    const raw = text.trim()
    if (raw.length >= 4) n.push({ cat, text: raw.toLowerCase(), word })
    else if (word && shortOk(raw)) n.push({ cat, text: raw, word: true, cs: true })
  }
  for (const { file, text: md } of files) {
    if (file.endsWith('.tex')) texNeedles(md, add)
    for (const m of md.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gu)) add('email', m[0])
    for (const m of md.matchAll(/\+?\d[\d\s().-]{8,}\d/gu)) {
      const digits = m[0].replace(/\D/gu, '')
      if (digits.length >= 10 && digits.length <= 13) { add('phone', m[0]); add('phone', digits) }
    }
    for (const m of md.matchAll(/https?:\/\/[^\s)>\]"'`<]+/giu)) add('url', m[0].replace(/[.,;:/]+$/u, ''))
    for (const m of md.matchAll(/\b(?:www\.)?(?:[a-z0-9-]+\.)+(?:com|in|io|ai|dev|org|net|co|app|me|xyz|video|jobs|tech)\b(?:\/[^\s)>\]"'`<,;|]*)?/giu)) add('url', m[0].replace(/[.,;:/]+$/u, ''))
    for (const m of md.matchAll(/(?<![\w.])@[A-Za-z0-9_][A-Za-z0-9_.-]{2,}/gu)) add('handle', m[0])
    for (const m of md.matchAll(/^#\s*Profile:\s*(.+)$/gimu)) { add('name', clean(m[1]), true); for (const p of clean(m[1]).split(/\s+/u)) add('name', p, true) }
    for (const t of tables(md)) {
      for (const r of t.rows) {
        const key = clean(r[0] ?? '').toLowerCase()
        const val = clean(r[1] ?? '')
        if (/^name$/u.test(key)) { add('name', val, true); for (const p of val.split(/\s+/u)) add('name', p, true) }
        if (/^(?:slug|github|handle|username|twitter|x)$/u.test(key)) add('handle', val.split(/\s+/u)[0] ?? '')
      }
      const col = t.head.findIndex((h) => /company|employer|school|institution|university|college|organi[sz]ation/iu.test(h))
      if (col >= 0) {
        for (const r of t.rows) {
          const cell = clean(r[col] ?? '')
          add('entity', cell.split(/[,(;]/u)[0] ?? '', true)
          for (const v of cell.matchAll(/\bvia\s+([^,(;]+)/giu)) add('entity', v[1], true)
        }
      }
    }
    for (const m of md.matchAll(/\b(?:B\.?Tech|M\.?Tech|MBA|B\.?Sc|M\.?Sc|Ph\.?D|degree|graduated?)\b[^.\n]{0,80}?\bfrom\s+([A-Z][\w&'.-]*(?:\s+(?:of\s+)?[A-Z][\w&'.-]*){0,4})/gu)) add('entity', m[1], true)
  }
  return n
}

// Names from the ledger, the application and interview indexes: companies and people. A name of two words or more is a
// hard phrase. A single word goes to the review list, because many names are ordinary words or technical terms.
const LEDGER_COLS = /^(?:company|company_norm|name|person|vanity|employer)$/u
const ORG_COLS = /^(?:company|company_norm|employer)$/u
const COMPANY_TAIL = /[\s,]+(?:inc|llc|ltd|pvt|limited|private|corp|corporation|plc|gmbh|technologies|technology|labs|solutions|systems)\.?$/iu
type Phrase = { cat: string; text: string }
function recordNames(): { phrases: Phrase[]; review: Set<string> } {
  const phrases = new Map<string, Phrase>()
  const review = new Set<string>()
  const add = (cat: string, raw: string) => {
    const text = raw.toLowerCase().replace(/\s+/gu, ' ').trim()
    if (text.length < 4 || /^[\d\s.-]+$/u.test(text) || !/^[a-z0-9]/u.test(text)) return
    const words = text.split(' ')
    if (words.length >= 2) { phrases.set(`${cat}|${text}`, { cat, text }); for (const w of words) add(cat, w); return }
    review.add(text)
  }
  const person = (raw: string, cat = 'ledger name') => { add(cat, raw); add(cat, raw.replace(COMPANY_TAIL, '')) }
  const dir = join(ROOT, 'my-sessions', 'ledger')
  if (existsSync(dir)) {
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.csv'))) {
      for (const row of readDicts(readFileSync(join(dir, f), 'utf8')).rows) for (const [col, v] of Object.entries(row)) if (LEDGER_COLS.test(col) && typeof v === 'string') person(v, ORG_COLS.test(col) ? 'ledger company' : 'ledger name')
    }
  }
  for (const f of ['my-applications/index.json', 'my-interviews/index.json']) {
    const p = join(ROOT, f)
    if (!existsSync(p)) continue
    for (const row of JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>[]) if (typeof row.company === 'string') person(row.company, 'ledger company')
  }
  return { phrases: [...phrases.values()], review }
}

// Text that names each phrase on word boundaries, by category. It looks a phrase up by its first word, so a ledger of
// thousands of names costs one pass over the text.
function phraseIndex(phrases: Phrase[]): Map<string, Phrase[]> {
  const idx = new Map<string, Phrase[]>()
  for (const p of phrases) { const first = /^[a-z0-9]+/u.exec(p.text)?.[0]; if (first) idx.set(first, [...(idx.get(first) ?? []), p]) }
  return idx
}
function countPhrases(lower: string, idx: Map<string, Phrase[]>): Map<string, number> {
  const out = new Map<string, number>()
  for (const m of lower.matchAll(/[a-z0-9]+/gu)) {
    const list = idx.get(m[0])
    if (!list) continue
    const at = m.index ?? 0
    for (const p of list) if (lower.startsWith(p.text, at) && !/[a-z0-9]/u.test(lower[at + p.text.length] ?? '')) out.set(p.cat, (out.get(p.cat) ?? 0) + 1)
  }
  return out
}

// The local settings file and the pinned browser's account, which no page of mine should name.
function localNeedles(): Needle[] {
  const p = join(ROOT, 'process', 'local.json')
  if (!existsSync(p)) return []
  const n: Needle[] = []
  for (const [k, v] of Object.entries(JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>)) if (k !== '_comment' && typeof v === 'string' && v.trim().length >= 4) n.push({ cat: 'local settings', text: v.trim().toLowerCase(), word: false })
  return n
}

function machineNeedles(): Needle[] {
  const n: Needle[] = []
  const add = (cat: string, text: string, word = false) => {
    const raw = text.trim()
    if (raw.length >= 4) n.push({ cat, text: raw.toLowerCase(), word })
    else if (word && shortOk(raw)) n.push({ cat, text: raw, word: true, cs: true })
  }
  const people = (cat: string, name: string) => { add(cat, name, true); for (const p of name.split(/\s+/u)) add(cat, p, true) }
  const log = execFileSync('git', ['-C', fileURLToPath(new URL('..', import.meta.url)), 'log', '--all', '--format=%an%n%ae%n%cn%n%ce'], { encoding: 'utf8' })
  // The AI co-author's identity is a product name that Learn's own text uses, not a person.
  const lines = log.split('\n').filter(Boolean)
  for (let i = 0; i + 1 < lines.length; i += 2) if (lines[i + 1] !== 'noreply@anthropic.com') { add('git', lines[i + 1]); people('git', lines[i]) }
  let gh: string[]
  try { gh = execFileSync('gh', ['api', 'user', '--jq', '.login + "\\n" + (.name // "")'], { encoding: 'utf8' }).split('\n') } catch { throw new Error('gh api user failed, so the account login cannot be checked. Run gh auth login.') }
  add('gh', gh[0] ?? '')
  if (gh[1]) people('gh', gh[1])
  add('home', homedir())
  add('home', userInfo().username)
  for (const d of [...PRIVATE_DIRS, 'fde-roadmap']) add(d === 'my-sessions' ? 'sessions folder' : 'folder', d)
  // The machine's own offset, in winter and summer, as a stamp suffix, and its zone name.
  for (const month of [0, 6]) {
    const off = -new Date(2026, month, 1).getTimezoneOffset()
    if (off === 0) continue
    const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0')
    const mm = String(Math.abs(off) % 60).padStart(2, '0')
    const sign = off < 0 ? '-' : '+'
    n.push({ cat: 'time zone', text: `(?<![0-9])\\${sign}${hh}:?${mm}(?![0-9])`, word: false, rx: true })
  }
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (zone && zone !== 'UTC') { add('time zone', zone); add('time zone', zone.split('/').pop() ?? '', true) }
  return n
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
const matcher = (n: Needle): RegExp => {
  if (n.rx) return new RegExp(n.text, 'gu')
  if (n.cs) return new RegExp(`(?<![A-Za-z0-9])${escape(n.text)}(?![A-Za-z0-9])`, 'gu')
  return new RegExp(n.word ? `(?<![a-z0-9])${escape(n.text)}(?![a-z0-9])` : escape(n.text), 'gu')
}

const dictOf = (): Set<string> => new Set(readFileSync('/usr/share/dict/words', 'utf8').toLowerCase().split('\n'))
function inDict(w: string, dict: Set<string>): boolean {
  if (dict.has(w)) return true
  for (const s of ['s', 'es', 'ed', 'd', 'ing', 'ly', 'er', 'ers', 'al']) if (w.endsWith(s) && dict.has(w.slice(0, -s.length))) return true
  return w.endsWith('ies') && dict.has(`${w.slice(0, -3)}y`)
}

const FONT_EXT = new Set(['.woff2', '.woff'])
const TEXT_EXT = new Set(['.html', '.js', '.css', '.svg', '.txt', '.webmanifest'])
const UTF8 = new TextDecoder('utf-8', { fatal: true })
const isText = (b: Buffer): boolean => { if (b.includes(0)) return false; try { UTF8.decode(b); return true } catch { return false } }

const stem = (f: string): string => basename(f).replace(/-[A-Za-z0-9_-]{8}(\.[a-z0-9]+)$/u, '$1')
const readList = (name: string): Set<string> => (existsSync(join(OUT, name)) ? new Set(readFileSync(join(OUT, name), 'utf8').split('\n').filter(Boolean)) : new Set<string>())

function allNeedles(): { needles: Needle[]; texts: string[]; phrases: Phrase[]; review: Set<string> } {
  const files = profileFiles()
  return { needles: [...profileNeedles(files), ...machineNeedles(), ...localNeedles()], texts: files.map((f) => f.text), ...recordNames() }
}

// A hash of every pattern the gate uses, so a pass is tied to the profile, git and gh as they were when it ran.
export function tokenHash(): string {
  const { needles, phrases, review } = allNeedles()
  const keys = [...new Set(needles.map((x) => `${x.cat}|${x.word}|${x.cs ?? false}|${x.rx ?? false}|${x.text}`))].sort()
  const names = phrases.map((p) => `${p.cat}|${p.text}`).sort()
  const payAllow = existsSync(join(OUT, 'pay-allow.txt')) ? readFileSync(join(OUT, 'pay-allow.txt'), 'utf8') : ''
  return createHash('sha256').update(JSON.stringify({ keys, names, review: [...review].sort(), pay: [...payFigures()].sort(), payAllow, purpose: PURPOSE.map((p) => `${p.id}|${p.re.source}|${p.ext ?? ''}`), allow: PURPOSE_ALLOW, gate: 5, prep: [...PREP_OK_CATS, ...PREP_OK_PURPOSE].sort() })).digest('hex')
}

export function runScan(): number {
  const pass = join(OUT, 'scan-pass.json')
  rmSync(pass, { force: true })
  const files = walk(DIST)
  const rel = (f: string) => relative(DIST, f)
  const dict = dictOf()
  const { needles, texts, phrases, review } = allNeedles()
  const index = phraseIndex(phrases)
  const figures = payFigures()
  const find = payMatcher(figures)
  const payAllow = readList('pay-allow.txt')
  const payLines: string[] = []
  const hits: { cat: string; file: string; n: number }[] = []
  const hit = (cat: string, file: string, n: number) => { if (n > 0) hits.push({ cat, file: rel(file), n }) }
  const compiled = [...new Map(needles.map((x) => [`${x.cat}|${x.word}|${x.cs ?? false}|${x.rx ?? false}|${x.text}`, x])).values()].map((x) => ({ cat: x.cat, cs: Boolean(x.cs), re: matcher(x) }))

  for (const o of oddEntries(DIST)) hits.push({ cat: 'symlink or special file', file: o, n: 1 })

  const wordCounts = new Map<string, Map<string, number>>()
  const acronyms = new Map<string, Map<string, number>>()
  for (const f of files) {
    const ext = rel(f) === 'progress.json' || /^audio\/[^/]+\.json$/u.test(rel(f)) ? '.txt' : extname(f).toLowerCase()   // the published progress and audio manifests are scanned as plain text
    const name = basename(f)
    if (ext === '.map') { hit('map file', f, 1); continue }
    const isPrep = rel(f) === PREP_FILE
    const icon = ICONS.find((i) => i.name === rel(f))
    if (icon) { if (!readFileSync(f).equals(renderIcon(icon.size))) hit('icon is not the generated one', f, 1); continue }
    if (/^audio\/[^/]+\.mp3$/u.test(rel(f))) continue   // spoken audio of course text, which the JS bundles already carry and the scan has read
    if (!TEXT_EXT.has(ext) && !FONT_EXT.has(ext) && !isPrep && rel(f) !== '.nojekyll') { hit('file is not text, a font or prep.json', f, 1); continue }
    for (const x of compiled) { x.re.lastIndex = 0; if (x.re.test(x.cs ? name : name.toLowerCase())) hit(`${x.cat} (file name)`, f, 1) }
    for (const [cat, n] of countPhrases(name.toLowerCase(), index)) hit(`${cat} (file name)`, f, n)
    if (!TEXT_EXT.has(ext) && !isPrep) continue
    const buf = readFileSync(f)
    if (!isText(buf)) { hit('file is not text', f, 1); continue }
    const text = buf.toString('utf8')
    const lower = text.toLowerCase()
    const okHere = (cat: string) => isPrep && PREP_OK_CATS.has(cat)
    for (const [cat, n] of countPhrases(lower, index)) if (!okHere(cat)) hit(cat, f, n)
    for (const x of compiled) { if (okHere(x.cat)) continue; x.re.lastIndex = 0; hit(x.cat, f, (x.cs ? text : lower).match(x.re)?.length ?? 0) }
    if (isPrep) {
      hit('email address (prep)', f, (text.match(PREP_EMAIL) ?? []).length)
      hit('phone number (prep)', f, phoneHits(text))
      hit('time zone offset (prep)', f, (text.match(PREP_OFFSET) ?? []).length)
      try {
        const topic = payTopic(payKeyNames())
        const count = (v: unknown): number => typeof v === 'string' ? Number(topic(v)) : Array.isArray(v) ? v.reduce((a: number, x) => a + count(x), 0) : typeof v === 'object' && v !== null ? Object.values(v).reduce((a: number, x) => a + count(x), 0) : 0
        hit('pay topic (prep)', f, count(JSON.parse(text)))
      } catch { /* the next line reports a prep.json that is not JSON */ }
      try { for (const key of prepPayKeys(JSON.parse(text), find)) if (!payAllow.has(key)) { hit('pay figure (prep)', f, 1); payLines.push(key) } } catch { hit('prep.json is not JSON', f, 1) }
      for (const p of PURPOSE) if (!PREP_OK_PURPOSE.has(p.id) && !p.ext) hit(`purpose: ${p.id}`, f, text.match(new RegExp(p.re.source, `${p.re.flags}g`.replace('gg', 'g')))?.length ?? 0)
      continue
    }
    // Chunk names carry hashes such as "6M9S", which read as amounts. They are blanked, keeping every offset.
    const unhashed = text.replace(/(?:\.\/|assets\/)[\w.-]+\.(?:js|css|woff2?)/gu, (m) => ' '.repeat(m.length)).replace(/-[A-Za-z0-9_-]{8}\.(?:js|css|woff2?)/gu, (m) => ' '.repeat(m.length))
    // A pay hit is allowed by a line "<file stem>, <hash of the 80 characters around it>, <kind and figure>" in
    // my-phone/pay-allow.txt, after it was read and judged to be a code constant or a teaching example. A changed
    // neighbourhood gives a new hash, so the hit shows again. pay-hits.txt keeps the context with its digits masked.
    for (const h of find(unhashed)) {
      const around = unhashed.slice(Math.max(0, h.at - 40), h.at + 40).replace(/\s+/gu, ' ')
      const key = `${stem(f)}\t${createHash('sha256').update(around).digest('hex').slice(0, 12)}\t${h.key}`
      if (payAllow.has(key)) continue
      hit('pay figure', f, 1)
      payLines.push(`${key}\t${around.replace(/\d+/gu, '#')}`)
    }
    for (const p of PURPOSE) {
      if (p.ext && p.ext !== ext) continue
      if (PURPOSE_ALLOW.includes(`${stem(f)}\t${p.id}`)) continue
      const g = new RegExp(p.re.source, p.re.flags.includes('g') ? p.re.flags : `${p.re.flags}g`)
      hit(`purpose: ${p.id}`, f, text.match(g)?.length ?? 0)
    }
    if (ext === '.js') hit('/api/ string in JS', f, (text.match(/\/api\//gu) ?? []).length)
    if (ext === '.js' || ext === '.html') hit('unreplaced glob of a private folder', f, (text.match(new RegExp(`import\\.meta\\.glob[^)]*(?:${PRIVATE_DIRS.join('|')})`, 'gu')) ?? []).length)
    const counts = new Map<string, number>()
    for (const w of lower.match(/[a-z]{4,}/gu) ?? []) counts.set(w, (counts.get(w) ?? 0) + 1)
    wordCounts.set(rel(f), counts)
    const ac = new Map<string, number>()
    for (const w of text.match(/(?<![A-Za-z0-9])[A-Z]{2,3}(?![A-Za-z0-9])/gu) ?? []) ac.set(w, (ac.get(w) ?? 0) + 1)
    acronyms.set(rel(f), ac)
  }
  writeFileSync(join(OUT, 'pay-hits.txt'), `${payLines.join('\n')}\n`)

  // Tier two: words of four letters or more in the profile that are not English words, and capital-letter tokens of
  // two or three letters that are not on the technical list, found anywhere in dist.
  const candidates = new Set<string>(review)
  const shortCandidates = new Set<string>()
  for (const t of texts) {
    for (const w of t.toLowerCase().match(/[a-z]{4,}/gu) ?? []) if (!inDict(w, dict)) candidates.add(w)
    for (const w of t.match(/(?<![A-Za-z0-9])[A-Z]{2,3}(?![A-Za-z0-9])/gu) ?? []) if (!SHORT_TECH.has(w)) shortCandidates.add(w)
  }
  const found = new Map<string, { n: number; files: Set<string> }>()
  const collect = (maps: Map<string, Map<string, number>>, set: Set<string>) => {
    for (const [file, counts] of maps) for (const [w, c] of counts) {
      if (!set.has(w)) continue
      const e = found.get(w) ?? { n: 0, files: new Set<string>() }
      e.n += c
      e.files.add(file)
      found.set(w, e)
    }
  }
  collect(wordCounts, candidates)
  collect(acronyms, shortCandidates)
  const lines = [...found].sort((a, b) => b[1].n - a[1].n).map(([w, e]) => `${w}\t${e.n}\t${[...e.files].slice(0, 5).join(' ')}`)
  writeFileSync(join(OUT, 'scan-hits.txt'), `${lines.join('\n')}\n`)

  const byCat = new Map<string, number>()
  for (const h of hits) byCat.set(h.cat, (byCat.get(h.cat) ?? 0) + h.n)
  console.log(`Scan: ${files.length} files, ${hits.reduce((a, h) => a + h.n, 0)} hard hits, ${found.size} second-tier words (in my-phone/scan-hits.txt).`)
  for (const [cat, n] of byCat) console.log(`  hard: ${cat}: ${n}`)
  for (const h of hits.slice(0, 40)) console.log(`  ${h.cat}: ${h.file} x${h.n}`)
  if (hits.length > 0) return 1
  writeFileSync(pass, `${JSON.stringify({ sha256: treeHash(DIST), tokens: tokenHash(), files: files.length, at: new Date().toISOString() })}\n`)
  return 0
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!existsSync(DIST)) { console.error('There is no my-phone/dist to scan. Run npm run phone:build first.'); process.exitCode = 1 } else process.exitCode = runScan()
}
