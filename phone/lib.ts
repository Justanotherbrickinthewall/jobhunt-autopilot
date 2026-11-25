// Shared by build.ts, scan.ts and publish.ts. It holds no fact about any person: everything personal is read
// from my-profile/ at run time and kept in memory.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'smol-toml'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const OUT = join(ROOT, 'my-phone')
export const DIST = join(OUT, 'dist')
export const PROFILE = join(ROOT, 'my-profile')
export const PRIVATE_DIRS = ['my-profile', 'my-sessions', 'my-applications', 'my-interviews', 'my-notebook', 'my-learn'] as const

export function walk(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (e.isFile()) out.push(p)
  }
  return out.sort()
}

// SHA-256 over every path and every file's own hash, so a change to any file or name changes it.
export function treeHash(dir: string): string {
  const h = createHash('sha256')
  for (const f of walk(dir)) h.update(`${relative(dir, f)}\0${createHash('sha256').update(readFileSync(f)).digest('hex')}\n`)
  return h.digest('hex')
}

export const isDir = (p: string): boolean => { try { return statSync(p).isDirectory() } catch { return false } }

// ---------- Private pay ----------

// The text of the Private pay section of profile.md, as it sits in memory. The run fails if there is none.
export function privatePaySection(): string {
  const lines = readFileSync(join(PROFILE, 'profile.md'), 'utf8').replace(/\r\n?/gu, '\n').split('\n')
  let from = -1
  let depth = 0
  for (let i = 0; i < lines.length; i++) {
    const m = /^ {0,3}(#{1,6})\s+(.*)$/u.exec(lines[i])
    if (!m) continue
    if (from < 0) {
      if (/^private pay\b/u.test(m[2].toLowerCase().replace(/[^a-z]+/gu, ' ').trim())) { from = i; depth = m[1].length }
    } else if (m[1].length <= depth) return lines.slice(from, i).join('\n')
  }
  if (from < 0) throw new Error('The Private pay section was not found in the profile, so pay cannot be screened.')
  return lines.slice(from).join('\n')
}

const CUR = '[₹$£€]|\\b(?:CAD|USD|INR|EUR|GBP|AUD|Rs\\.?|rupees?)\\b'
const UNIT: Record<string, number> = { lakh: 1e5, lakhs: 1e5, lac: 1e5, lacs: 1e5, lpa: 1e5, l: 1e5, crore: 1e7, crores: 1e7, cr: 1e7, k: 1e3, m: 1e6, mn: 1e6, million: 1e6 }
const AMOUNT = new RegExp(`(?<cur>${CUR})?[ \\t]*(?<num>\\d[\\d,]*(?:\\.\\d+)?)(?<sp>[ \\t]*)(?<unit>lakhs?|lacs?|lpa|crores?|cr|million|mn|k|m|l)?(?![A-Za-z])(?<after>[ \\t]*(?:${CUR}))?`, 'giu')

// Every number in a text as a fixed-point string, with where it sits and whether it reads as money: it has a
// currency or a unit, or is 10000 or more, so a year or a count of months is not. "99 lakh", "99,00,000" and
// "9900000" give the same string.
export function numbersIn(text: string): { v: string; at: number; money: boolean }[] {
  const out: { v: string; at: number; money: boolean }[] = []
  for (const m of text.matchAll(AMOUNT)) {
    const g = m.groups as Record<string, string | undefined>
    let value = Number((g.num ?? '').replace(/,/gu, ''))
    if (!Number.isFinite(value)) continue
    let unit = g.unit?.toLowerCase()
    if (unit && unit.length === 1 && g.sp) unit = undefined   // "5 m" and "5 l" are not money
    if (unit) value *= UNIT[unit] ?? 1
    out.push({ v: value.toFixed(2), at: m.index ?? 0, money: Boolean(g.cur || g.after || unit || value >= 10000) })
  }
  return out
}

export const amountsIn = (text: string): string[] => numbersIn(text).filter((n) => n.money).map((n) => n.v)

// The figures the owner keeps in inputs.toml, read at run time. A key ending in _lakh is in lakh, so it is scaled to rupees.
type Table = Record<string, unknown>
const inputsToml = (): Table => parse(readFileSync(join(PROFILE, 'inputs.toml'), 'utf8')) as Table
const tableOf = (t: Table, name: string): Table => (typeof t[name] === 'object' && t[name] !== null && !Array.isArray(t[name]) ? (t[name] as Table) : {})

// Every figure in the [pay] table except the notice period, plus every quote_ key in [outreach]. A key ending in _lakh is in lakh, so it is scaled to rupees.
function inputFigures(): string[] {
  const t = inputsToml()
  const out: string[] = []
  for (const [k, v] of Object.entries(tableOf(t, 'pay'))) {
    if (k !== 'notice_days_max' && typeof v === 'number') out.push((k.endsWith('_lakh') ? v * 1e5 : v).toFixed(2))
  }
  for (const [k, v] of Object.entries(tableOf(t, 'outreach'))) {
    if (!k.startsWith('quote_')) continue
    if (typeof v === 'number') out.push(v.toFixed(2))
    else if (typeof v === 'string') out.push(...amountsIn(v))
  }
  return out
}

// The names of the pay keys, read at run time. Names are safe to print and to match against; their values are not.
export function payKeyNames(): string[] {
  const t = inputsToml()
  return [...Object.keys(tableOf(t, 'pay')), ...Object.keys(tableOf(t, 'outreach')).filter((k) => k.startsWith('quote_'))]
}

const PAY_TOPIC = /\b(?:salary|salaries|ctc|compensation|remuneration|lpa)\b|\bpay (?:is|was|band|range|expectation|ask|floor|strategy|figure|question)\b|\b(?:expected|current|in|within|give|gives|my|your|their|the|on) pay\b(?!-)|inputs\.toml|\bpay\.[a-z_]+|\boutreach\.quote_[a-z_]+/iu

// True for a string that talks about pay, whatever figure it holds. The verb "pay for" does not match.
export function payTopic(keys: string[]): (s: string) => boolean {
  const names = keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'))
  const keyRx = names.length ? new RegExp(`\\b(?:${names.join('|')})\\b`, 'iu') : null
  return (s) => PAY_TOPIC.test(s) || (keyRx?.test(s) ?? false)
}

export const payFigures = (): Set<string> => new Set([...amountsIn(privatePaySection()), ...inputFigures()])

// One line for each distinct hit in the prep content, with how many times it occurs, as it is kept in pay-allow.txt.
export function prepPayKeys(content: unknown, find: ReturnType<typeof payMatcher>): string[] {
  const m = new Map<string, number>()
  for (const h of payHitsDeep(content, find)) { const k = `prep\t${h.key}\t${h.path}`; m.set(k, (m.get(k) ?? 0) + 1) }
  return [...m].map(([k, n]) => `${k}\t${n}`)
}

const TERM = '(?:ctc|lpa|salary|salaries|compensation|remuneration|stipend|lakhs?|lacs?|crores?|per annum|per hour|an hour|per use case)'
const NEAR_DIGIT = new RegExp(`\\d.{0,80}?\\b${TERM}\\b|\\b${TERM}\\b.{0,80}?\\d`, 'isu')
const PAY_WORD = /\b(?:ctc|lpa|salary|salaries|compensation|comp|remuneration|stipend|pay|paid|package|offer|expected|expectation|current|rate|hourly|annual|annually|monthly|base|bonus|equity|esop|in-hand|take-home|income|earn|earning|earnings|wage|wages|lakhs?|lacs?|crores?|per annum|per month|per year|per hour)\b/iu

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
// A whole number below a billion in words, without "and" and without hyphens, to match normalised text.
function words(n: number): string {
  if (n < 20) return ONES[n]
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : '')
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${words(n % 100)}` : ''}`
  if (n < 1e6) return `${words(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${words(n % 1000)}` : ''}`
  return `${words(Math.floor(n / 1e6))} million${n % 1e6 ? ` ${words(n % 1e6)}` : ''}`
}
const spoken = (t: string): string => t.toLowerCase().replace(/[-\u2013\u2014]/gu, ' ').replace(/\band\b/gu, ' ').replace(/\s+/gu, ' ')

// Finds every written form of the pay figures in a text. Returns one entry per hit, naming the kind and the figure,
// so a caller can count and locate hits without printing the text.
// 1. A number with a currency or a unit, of any size, or a bare number of 10000 or more, that equals a figure.
// 2. A smaller bare number that equals a figure and has a pay word within 80 characters.
// 3. A figure in words ("ninety five lakh", "ninety five thousand", "twelve dollars").
export function payMatcher(figures: ReadonlySet<string>): (text: string) => { key: string; at: number }[] {
  const phrases: string[] = []
  for (const f of figures) {
    const v = Number(f)
    if (!Number.isInteger(v) || v < 1) continue
    if (v < 1000) phrases.push(`${words(v)} (?:dollars?|rupees?|pounds?|euros?|bucks|cad|usd|inr)`)
    else if (v < 1e9) phrases.push(words(v))
    for (const [unit, names] of [[1e5, 'lakhs?|lacs?|lpa'], [1e6, 'millions?'], [1e7, 'crores?']] as const) {
      if (v % unit === 0 && v / unit >= 1 && v / unit < 1000) phrases.push(`${words(v / unit)} (?:${names})`)
    }
  }
  const spokenRe = phrases.length > 0 ? new RegExp(`\\b(?:${phrases.join('|')})\\b`, 'gu') : undefined
  return (text) => {
    const hits: { key: string; at: number }[] = []
    for (const n of numbersIn(text)) {
      if (!figures.has(n.v)) continue
      if (n.money) hits.push({ key: `amount ${n.v}`, at: n.at })
      else if (PAY_WORD.test(text.slice(Math.max(0, n.at - 80), n.at + 80))) hits.push({ key: `bare ${n.v}`, at: n.at })
    }
    if (spokenRe) for (const m of spoken(text).matchAll(spokenRe)) hits.push({ key: `words ${m[0]}`, at: m.index ?? 0 })
    return hits
  }
}

// True when one string holds a pay figure in any written form, or a pay term next to a digit.
export const isPay = (s: string, figures: ReadonlySet<string>): boolean => NEAR_DIGIT.test(s) || payMatcher(figures)(s).length > 0

// Anything in a folder that is not a plain file or folder, such as a symlink, which a copy would follow or keep.
export function oddEntries(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...oddEntries(p))
    else if (!e.isFile()) out.push(relative(dir, p))
  }
  return out
}

// Every pay hit in a value: each string, each key, then the serialised whole, which also holds bare numbers.
// Returns the kind and figure of the hit and where it sits, never the text around it.
export function payHitsDeep(value: unknown, find: ReturnType<typeof payMatcher>): { key: string; path: string }[] {
  const out: { key: string; path: string }[] = []
  const visit = (v: unknown, path: string) => {
    if (typeof v === 'string') for (const h of find(v)) out.push({ key: h.key, path })
    else if (Array.isArray(v)) v.forEach((x, i) => visit(x, `${path}[${i}]`))
    else if (typeof v === 'object' && v !== null) for (const [k, x] of Object.entries(v)) { visit(k, `${path}.<key>`); visit(x, `${path}.${k}`) }
  }
  visit(value, 'content')
  // A bare number needs the words around it, which the per-string pass has. The whole pass is for keys and numbers.
  for (const h of find(JSON.stringify(value))) if (!h.key.startsWith('bare')) out.push({ key: h.key, path: 'whole' })
  return out
}
