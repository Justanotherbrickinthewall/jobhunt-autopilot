// Python-compatible output helpers. Pure: no node:* imports, because the dashboard imports lib/.

export const TZ_OFFSET_MIN = 330 // constants.TZ is a fixed UTC+05:30

export const PYFLOAT = Symbol('pyfloat')
export type PyFloat = { readonly [PYFLOAT]: number }
export function pyFloat(v: number): PyFloat {
  return { [PYFLOAT]: v }
}
function isPyFloat(v: unknown): v is PyFloat {
  return typeof v === 'object' && v !== null && PYFLOAT in v
}

// repr(float) for finite values. Exact for the values the engine produces; it does not
// reproduce Python's exponent forms below 1e-4 or at and above 1e16.
// json=true gives json.dumps spellings for nan and the infinities.
export function floatRepr(v: number, json = false): string {
  if (Number.isNaN(v)) return json ? 'NaN' : 'nan'
  if (!Number.isFinite(v)) return (v < 0 ? '-' : '') + (json ? 'Infinity' : 'inf')
  if (Object.is(v, -0)) return '-0.0'
  if (Number.isInteger(v)) return v.toFixed(1)
  return String(v)
}

function num(v: number, json: boolean): string {
  return Number.isInteger(v) ? String(v) : floatRepr(v, json)
}

// repr(str)
function strRepr(s: string): string {
  const q = s.includes("'") && !s.includes('"') ? '"' : "'"
  let out = q
  for (const c of s) {
    const code = c.charCodeAt(0)
    if (c === q || c === '\\') out += '\\' + c
    else if (c === '\n') out += '\\n'
    else if (c === '\r') out += '\\r'
    else if (c === '\t') out += '\\t'
    else if (code < 0x20 || code === 0x7f) out += '\\x' + code.toString(16).padStart(2, '0')
    else out += c
  }
  return out + q
}

// repr() of the values the engine holds: None/True/False, numbers, str, list, dict, set.
function pyRepr(v: unknown): string {
  if (typeof v === 'string') return strRepr(v)
  if (Array.isArray(v)) return '[' + v.map(pyRepr).join(', ') + ']'
  if (v instanceof Set) return v.size === 0 ? 'set()' : '{' + [...v].map(pyRepr).join(', ') + '}'
  if (v instanceof Map || (typeof v === 'object' && v !== null && !isPyFloat(v))) {
    const entries = v instanceof Map ? [...v.entries()] : Object.entries(v)
    return '{' + entries.map(([k, x]) => pyRepr(k) + ': ' + pyRepr(x)).join(', ') + '}'
  }
  return pyStr(v)
}

export const repr = (v: unknown): string => pyStr([v]).slice(1, -1)
export const tupleRepr = (xs: readonly string[]): string => '(' + xs.map(repr).join(', ') + (xs.length === 1 ? ',)' : ')')

// s[:n] counts code points.
export const cut = (s: string, n: number): string => Array.from(s).slice(0, n).join('')

// str(Path(p)): no empty or '.' segments, no trailing slash.
export function pyPath(p: string): string {
  const abs = p.startsWith('/')
  const segs = p.split('/').filter((s) => s !== '' && s !== '.')
  return (abs ? '/' : '') + (segs.join('/') || (abs ? '' : '.'))
}

// bool(v) for a parsed JSON value.
export function pyTruthy(v: unknown): boolean {
  if (v === null || v === undefined || v === false || v === 0 || v === '') return false
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object') {
    if (PYFLOAT in (v as object)) return (v as PyFloat)[PYFLOAT] !== 0
    return Object.keys(v as object).length > 0
  }
  return true
}

export function pyStr(v: unknown): string {
  if (v === null || v === undefined) return 'None'
  if (v === true) return 'True'
  if (v === false) return 'False'
  if (typeof v === 'number') return num(v, false)
  if (isPyFloat(v)) return floatRepr(v[PYFLOAT])
  if (typeof v === 'object') return pyRepr(v)
  return String(v)
}

const ESC: Record<string, string> = {
  '"': '\\"', '\\': '\\\\', '\n': '\\n', '\r': '\\r', '\t': '\\t', '\b': '\\b', '\f': '\\f',
}

function escStr(s: string, ascii: boolean): string {
  let out = '"'
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    const code = s.charCodeAt(i)
    if (Object.hasOwn(ESC, c)) out += ESC[c]
    else if (code < 0x20 || (ascii && code > 0x7e)) out += '\\u' + code.toString(16).padStart(4, '0')
    else out += c
  }
  return out + '"'
}

// json.dumps(value, indent=..., ensure_ascii=...). Separators match Python's defaults:
// (', ', ': ') without indent, (',', ': ') with indent.
// JS puts integer-like keys ("10", "2") first and in ascending order; Python keeps insertion order.
// An object holding such a key carries its Python key order under this non-enumerable symbol.
// jsonLoads sets it, pyJson reads it, and pyCopy carries it across a copy. Ordinary objects have none.
export const PYORDER = Symbol('pyorder')
const isIntKey = (k: string): boolean => /^(?:0|[1-9][0-9]*)$/u.test(k) && Number(k) < 4294967295

// The keys of an object in Python dict order.
export function pyKeys(o: object): string[] {
  const keys = Object.keys(o)
  const order = (o as { [PYORDER]?: string[] })[PYORDER]
  if (!order) return keys
  const have = new Set(keys)
  const seen = new Set(order.filter((k) => have.has(k)))
  return [...seen, ...keys.filter((k) => !seen.has(k))]
}

// Record `keys` as the Python order of `o`, only when an integer-like key makes JS order differ.
export function markOrder<T extends object>(o: T, keys: string[]): T {
  if (keys.some(isIntKey)) Object.defineProperty(o, PYORDER, { value: keys, enumerable: false, writable: true, configurable: true })
  return o
}

// {**src, **extra} as a plain object, keeping Python key order.
export function pyCopy(src: object, extra: Record<string, unknown> = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const keys = pyKeys(src)
  for (const k of keys) out[k] = (src as Record<string, unknown>)[k]
  for (const [k, v] of Object.entries(extra)) { if (!(k in out)) keys.push(k); out[k] = v }
  return markOrder(out, keys)
}

export function pyJson(value: unknown, opts: { indent?: number; ensureAscii?: boolean } = {}): string {
  const ascii = opts.ensureAscii ?? true
  const ind = opts.indent
  const sep = ind === undefined ? ', ' : ','
  const walk = (v: unknown, depth: number): string => {
    if (v === null || v === undefined) return 'null'
    if (v === true) return 'true'
    if (v === false) return 'false'
    if (typeof v === 'number') return num(v, true)
    if (isPyFloat(v)) return floatRepr(v[PYFLOAT], true)
    if (typeof v === 'string') return escStr(v, ascii)
    const isArr = Array.isArray(v)
    const parts: string[] = []
    if (isArr) {
      for (const x of v) parts.push(walk(x, depth + 1))
    } else {
      const entries = v instanceof Map ? [...v.entries()] : pyKeys(v as object).map((k) => [k, (v as Record<string, unknown>)[k]] as const)
      for (const [k, x] of entries) parts.push(escStr(String(k), ascii) + ': ' + walk(x, depth + 1))
    }
    const open = isArr ? '[' : '{'
    const close = isArr ? ']' : '}'
    if (parts.length === 0) return open + close
    if (ind === undefined) return open + parts.join(sep) + close
    const pad = '\n' + ' '.repeat(ind * (depth + 1))
    return open + pad + parts.join(sep + pad) + '\n' + ' '.repeat(ind * depth) + close
  }
  return walk(value, 0)
}

export function roundHalfEven(x: number): number {
  const f = Math.floor(x)
  const d = x - f
  if (d > 0.5) return f + 1
  if (d < 0.5) return f
  return f % 2 === 0 ? f : f + 1
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function parts(t: Date) {
  const s = new Date(t.getTime() + TZ_OFFSET_MIN * 60_000)
  return {
    Y: s.getUTCFullYear(), m: s.getUTCMonth() + 1, d: s.getUTCDate(),
    H: s.getUTCHours(), M: s.getUTCMinutes(), S: s.getUTCSeconds(),
  }
}

// strftime in the engine's fixed timezone. Supports %Y %m %d %H %M %S %b %%.
export function strftime(fmt: string, t: Date = new Date()): string {
  const p = parts(t)
  const z = (n: number, w = 2) => String(n).padStart(w, '0')
  const map: Record<string, string> = {
    Y: z(p.Y, 4), m: z(p.m), d: z(p.d), H: z(p.H), M: z(p.M), S: z(p.S), b: MON[p.m - 1], '%': '%',
  }
  return fmt.replace(/%([YmdHMSb%])/gu, (_, c: string) => map[c])
}

// datetime.now(TZ).isoformat(timespec='seconds')
export function isoSeconds(t: Date = new Date()): string {
  return strftime('%Y-%m-%dT%H:%M:%S', t) + '+05:30'
}

// datetime.date.fromisoformat (3.11+): YYYY-MM-DD, YYYYMMDD, YYYY-Www[-D] and YYYYWww[D], ASCII digits and
// an upper-case W only. Returns midnight UTC of that date. Throws a ValueError-style Error otherwise.
export function dateFromIso(s: string): Date {
  const bad = (): never => {
    throw new Error(`Invalid isoformat string: '${s}'`)
  }
  const mk = (y: number, mo: number, d: number): Date => {
    const t = new Date(0)
    t.setUTCFullYear(y, mo - 1, d)
    return t
  }
  let m = /^(\d{4})-?(\d{2})-?(\d{2})$/u.exec(s)
  if (m && (s.includes('-') ? /^\d{4}-\d{2}-\d{2}$/u : /^\d{8}$/u).test(s)) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
    if (y < 1 || mo < 1 || mo > 12) return bad()
    const t = mk(y, mo, d)
    if (t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return bad()
    return t
  }
  m = /^(\d{4})-W(\d{2})(?:-(\d))?$/u.exec(s) ?? /^(\d{4})W(\d{2})(\d)?$/u.exec(s)
  if (!m) return bad()
  const [y, w, d] = [Number(m[1]), Number(m[2]), m[3] === undefined ? 1 : Number(m[3])]
  if (y < 1 || w < 1 || w > 53 || d < 1 || d > 7) return bad()
  const jan4 = mk(y, 1, 4)
  const mondayWeek1 = jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * 86_400_000
  const t = new Date(mondayWeek1 + ((w - 1) * 7 + (d - 1)) * 86_400_000)
  if (w === 53) {
    // Week 53 exists only when the Thursday of that week stays in year y.
    const thu = new Date(mondayWeek1 + (52 * 7 + 3) * 86_400_000)
    if (thu.getUTCFullYear() !== y) return bad()
  }
  if (t.getUTCFullYear() < 1 || t.getUTCFullYear() > 9999) return bad()
  return t
}

// (date.fromisoformat(b[:10]) - date.fromisoformat(a[:10])).days
export function daysBetween(a: string, b: string): number {
  const day = (s: string): number => dateFromIso(Array.from(s).slice(0, 10).join('')).getTime()
  return Math.round((day(b) - day(a)) / 86_400_000)
}

// argparse's negative-number test: a token like -3 or -.5 is a value, not an option. Unicode digits, as in Python.
export const NEGATIVE_NUMBER = /^-\p{Nd}+$|^-\p{Nd}*\.\p{Nd}+$/u

export type Key = number | string | boolean
// sorted(key=...) with tuple keys. Array.prototype.sort is stable, like Python's.
export function byKey<T>(key: (x: T) => Key | Key[]): (a: T, b: T) => number {
  return (a, b) => {
    const ka = ([] as Key[]).concat(key(a))
    const kb = ([] as Key[]).concat(key(b))
    for (let i = 0; i < Math.min(ka.length, kb.length); i++) {
      if (ka[i] < kb[i]) return -1
      if (ka[i] > kb[i]) return 1
    }
    return ka.length - kb.length
  }
}

// Characters that Python 3's str.isspace() and re \s (str patterns) both treat as whitespace.
// The two sets are identical (checked over all of Unicode). Usable inside a regex character class.
export const PY_WS = '\\t\\n\\v\\f\\r\\x1c-\\x1f \\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000'

const WS_RUN = new RegExp(`^[${PY_WS}]+|[${PY_WS}]+$`, 'gu')
const WS_LEAD = new RegExp(`^[${PY_WS}]+`, 'u')
const WS_TRAIL = new RegExp(`[${PY_WS}]+$`, 'u')

// str.strip(chars), str.lstrip(chars), str.rstrip(chars). chars is a set of code points.
export function pyStrip(s: string, chars?: string | null): string {
  if (chars == null) return s.replace(WS_RUN, '')
  return pyRstrip(pyLstrip(s, chars), chars)
}

export function pyLstrip(s: string, chars?: string | null): string {
  if (chars == null) return s.replace(WS_LEAD, '')
  const set = new Set(chars), cps = Array.from(s)
  let i = 0
  while (i < cps.length && set.has(cps[i])) i++
  return cps.slice(i).join('')
}

export function pyRstrip(s: string, chars?: string | null): string {
  if (chars == null) return s.replace(WS_TRAIL, '')
  const set = new Set(chars), cps = Array.from(s)
  let n = cps.length
  while (n > 0 && set.has(cps[n - 1])) n--
  return cps.slice(0, n).join('')
}

// int(s) for a str. Accepts surrounding whitespace, a sign, any Unicode decimal digits (Nd)
// and single underscores between digits. Throws like int() does on anything else.
// The result is a JS number, so it is exact only up to 2**53.
const ND = /^\p{Nd}$/u
function ndValue(ch: string): number {
  // Nd characters come in contiguous runs of ten (or a multiple), starting at the zero.
  let k = 0
  for (let cp = ch.codePointAt(0)! - 1; cp >= 0 && ND.test(String.fromCodePoint(cp)); cp--) k++
  return k % 10
}

export function pyInt(s: string): number {
  const bad = (): never => { throw new Error(`invalid literal for int() with base 10: ${strRepr(s)}`) }
  const t = pyStrip(s)
  const m = /^([+-]?)(\p{Nd}+(?:_\p{Nd}+)*)$/u.exec(t)
  if (!m) return bad()
  let n = 0
  for (const ch of m[2]) if (ch !== '_') n = n * 10 + ndValue(ch)
  return m[1] === '-' ? -n : n
}

// An exception Python raises that JS has no name for. A tool prints `<pyName>: <message>`.
export class PyExc extends Error {
  pyName: string
  constructor(pyName: string, message: string) {
    super(message)
    this.pyName = pyName
  }
}

function decodeErr(b: number, start: number, end: number, why: string): PyExc {
  const hex = '0x' + b.toString(16).padStart(2, '0')
  const where = end - start === 1 ? `byte ${hex} in position ${start}` : `bytes in position ${start}-${end - 1}`
  return new PyExc('UnicodeDecodeError', `'utf-8' codec can't decode ${where}: ${why}`)
}

// Decode UTF-8 strictly, with CPython's UnicodeDecodeError message. A BOM is kept.
export function decodeStrict(buf: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buf)
  } catch { /* find the byte CPython complains about */ }
  const n = buf.length
  let i = 0
  while (i < n) {
    const b = buf[i]
    if (b < 0x80) { i++; continue }
    let need = 0
    let lo = 0x80
    let hi = 0xbf
    if (b >= 0xc2 && b <= 0xdf) need = 1
    else if (b >= 0xe0 && b <= 0xef) { need = 2; if (b === 0xe0) lo = 0xa0; if (b === 0xed) hi = 0x9f }
    else if (b >= 0xf0 && b <= 0xf4) { need = 3; if (b === 0xf0) lo = 0x90; if (b === 0xf4) hi = 0x8f }
    else throw decodeErr(b, i, i + 1, 'invalid start byte')
    for (let j = 1; j <= need; j++) {
      if (i + j >= n) throw decodeErr(b, i, i + j, 'unexpected end of data')
      const c = buf[i + j]
      if (c < (j === 1 ? lo : 0x80) || c > (j === 1 ? hi : 0xbf)) throw decodeErr(b, i, i + j, 'invalid continuation byte')
    }
    i += need + 1
  }
  throw new PyExc('UnicodeDecodeError', "'utf-8' codec can't decode input")
}
