// prelim - the card-only ordering rank. ORDERS the queue; never drops a role.
// It scores only the dimensions a job card can show (no stack, no level). The number is a rank. It is never
// compared to a threshold and never quoted to the candidate as a match. The floor belongs to `match`, which
// comes from a full JD read. An earlier version applied the `match` threshold to `prelim` and deleted 83 of
// 116 harvested roles unread.
//
// Reach has four tiers. Home and anywhere both score REACH_POINTS.home. Near scores less.
// A location that is blank, or stated but not recognisable, scores unstated_points from
// inputs.toml until the JD is read.
//
// Usage through engine.ts: `prelim '<json row>'`, a row with `role` (or `title`), `company` and `location`.
import * as C from '../constants.ts'
import { PY_WS, PYFLOAT, pyJson, type PyFloat } from '../lib/py.ts'
import { jsonLoads } from '../lib/pyjson.ts'
import type { Out } from './io.ts'

// Python's \w and \b are Unicode-aware. JS's are ASCII, so spell them out.
const W = '[\\p{L}\\p{N}_]'
const B = `(?:(?<=${W})(?!${W})|(?<!${W})(?=${W}))`
// Python's \s is its isspace set and its . excludes only \n, so rewrite both. \b and \w come out as above.
function pySrc(src: string): string {
  let out = '', inClass = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (c === '\\') {
      const n = src[++i]
      out += n === 's' ? (inClass ? PY_WS : `[${PY_WS}]`) : c + n
    } else if (c === '[') { inClass = true; out += c }
    else if (c === ']') { inClass = false; out += c }
    else out += c === '.' && !inClass ? '[^\\n]' : c
  }
  return out
}
const rx = (src: string, flags = 'iu'): RegExp =>
  new RegExp(pySrc(src).replaceAll('<b>', B).replaceAll('<w>', W), flags)

// re.escape for the characters that matter under the u flag.
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\/]/gu, '\\$&')

// One regex for a token list, matching whole words so that 'india' does not read 'Indiana'.
function matcher(tokens: readonly string[]): RegExp {
  if (!tokens.length) return /(?!x)x/u
  return new RegExp('(?<![a-z0-9])(?:' + tokens.map(escapeRe).join('|') + ')(?![a-z0-9])', 'u')
}

function tiers(): [RegExp, RegExp, RegExp] {
  const c = C.cfg()
  return [matcher(c.home_tokens), matcher(c.anywhere_tokens), matcher(c.near_tokens)]
}

const FD_STRONG = rx('forward.?deploy(ed|ment)')
const FD_MEDIUM = rx('<b>(customer|solutions?|delivery|implementation|deployment|field|' +
                     'professional services)<b>[\\s\\-]*<w>*\\s*<b>(engineer|architect|lead|manager)<b>')
const FD_MTS = rx('member of technical staff')
const FD_WEAK = rx('<b>architect<b>')

const AI_HEAD = rx('<b>(ai|gen[\\s\\-]?ai|llm|generative|agentic|applied ai|machine learning|ml)<b>' +
                   '[\\s\\-/&,]*<w>*[\\s\\-/&,]*<b>(engineer|architect|lead|scientist|solutions?|platform)<b>')
const AI_ANY = rx('<b>(ai|gen[\\s\\-]?ai|llm|generative|agentic|machine learning|ml|rag|nlp)<b>')

const SENIOR = rx('<b>(senior|sr\\.?|staff|principal|lead|head|distinguished|chief)<b>')
const MANAGER = rx('<b>(manager|director)<b>')

const AGGREGATOR = rx('jobgether|ladders|dice<b>|monster')
const PRESALES = rx('pre[\\s\\-]?sales')

// 'home', 'anywhere', 'near' or 'unstated' for a card's location text.
export function reachTier(location: string | null | undefined): string {
  const loc = (location || '').toLowerCase()
  const [home, anywhere, near] = tiers()
  if (home.test(loc)) return 'home'
  if (anywhere.test(loc)) return 'anywhere'
  if (near.test(loc)) return 'near'
  return 'unstated'
}

// Python truthiness for the values a JSON row can hold.
function truthy(v: unknown): boolean {
  if (v === null || v === undefined || v === false || v === 0 || v === '') return false
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object') {
    if (PYFLOAT in v) return (v as PyFloat)[PYFLOAT] !== 0
    return Object.keys(v).length > 0
  }
  return true
}

// Return [score, breakdown]. Card-visible dimensions only, out of 100. Never a verdict.
export function prelim(title: unknown, company: unknown = '', location: unknown = ''): [number, Record<string, unknown>] {
  const t = (truthy(title) ? title : '') as string
  const c = (truthy(company) ? company : '') as string
  if (typeof t !== 'string' || typeof c !== 'string') throw new TypeError('expected string or bytes-like object')
  const w = C.PRELIM_WEIGHTS
  const pen = C.PRELIM_PENALTIES

  let fd: number
  if (FD_STRONG.test(t)) fd = w['fd']
  else if (FD_MEDIUM.test(t)) fd = 16
  else if (FD_MTS.test(t)) fd = 10
  else if (FD_WEAK.test(t)) fd = 6
  else fd = 0

  let ai: number
  if (AI_HEAD.test(t)) ai = w['ai']
  else if (AI_ANY.test(t)) ai = 18
  else ai = 0

  const tier = reachTier((truthy(location) ? location : '') as string)
  const reach = Object.hasOwn(C.REACH_POINTS, tier) ? C.REACH_POINTS[tier] : C.cfg().unstated_points

  let lvl: number
  if (SENIOR.test(t)) lvl = w['level']
  else if (MANAGER.test(t)) lvl = 8
  else lvl = 5

  let penalty = 0
  const why: string[] = []
  if (AGGREGATOR.test(c)) { penalty += pen['aggregator']; why.push('aggregator/reposter') }
  if (PRESALES.test(t)) { penalty += pen['presales']; why.push('pre-sales framing') }

  const score = Math.max(0, Math.min(100, fd + ai + reach + lvl + penalty))
  return [score, {
    [`fd_${w['fd']}`]: fd, [`ai_${w['ai']}`]: ai, [`reach_${w['reach']}`]: reach,
    [`level_${w['level']}`]: lvl, reach_tier: tier,
    penalty, penalty_why: why.join('; '),
  }]
}

export function main(argv: string[], out: Out = (s) => { process.stdout.write(s) }): number {
  if (argv.length !== 1) {
    process.stderr.write("usage: engine.ts prelim '<json row with role, company, location>'\n")
    return 2
  }
  let row: Record<string, unknown>
  try {
    const parsed = jsonLoads(argv[0])
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed) || PYFLOAT in parsed) throw new Error('not an object')
    row = parsed as Record<string, unknown>
  } catch (exc) {
    process.stderr.write(`prelim: the argument is not a JSON object: ${(exc as Error).message}\n`)
    return 2
  }
  const title = truthy(row['role']) ? row['role'] : truthy(row['title']) ? row['title'] : ''
  const [s, b] = prelim(title, Object.hasOwn(row, 'company') ? row['company'] : '',
                        Object.hasOwn(row, 'location') ? row['location'] : '')
  out(pyJson({ prelim: s, ...b }, { indent: 1 }) + '\n')
  return 0
}
