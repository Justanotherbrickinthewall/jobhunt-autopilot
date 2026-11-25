// CPython-faithful json.loads, with its JSONDecodeError messages. Pure: no node:* imports.
import { markOrder, PyExc, pyFloat } from './py.ts'

class JsonErr extends PyExc {
  constructor(msg: string, doc: string, pos: number) {
    const before = doc.slice(0, pos)
    const nl = before.lastIndexOf('\n')
    const colno = Array.from(nl < 0 ? before : before.slice(nl + 1)).length + 1
    super('JSONDecodeError', `${msg}: line ${before.split('\n').length} column ${colno} (char ${Array.from(before).length})`)
  }
}

class Stop { idx: number; constructor(idx: number) { this.idx = idx } }

const JSON_NUM = /(-?(?:0|[1-9][0-9]*))(\.[0-9]+)?([eE][-+]?[0-9]+)?/uy
const JSON_ESC: Record<string, string> = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' }
const isWs = (c: string | undefined): boolean => c === ' ' || c === '\t' || c === '\n' || c === '\r'

// json.loads. Integers come back as numbers, floats wrapped with pyFloat, objects as null-prototype
// objects, so the caller can tell 5 from 5.0.
export function jsonLoads(s: string): unknown {
  const len = s.length
  const skip = (i: number): number => { while (i < len && isWs(s[i])) i++; return i }
  if (s.startsWith('﻿')) throw new JsonErr('Unexpected UTF-8 BOM (decode using utf-8-sig)', s, 0)

  const hex4 = (a: number, b: number): number => {
    let v = 0
    for (let k = a; k < b; k++) {
      const d = '0123456789abcdef'.indexOf(s[k].toLowerCase())
      if (d < 0) throw new JsonErr('Invalid \\uXXXX escape', s, b - 5)
      v = v * 16 + d
    }
    return v
  }

  // begin is the index of the opening quote. Returns the string and the index after the closing quote.
  function scanString(begin: number): [string, number] {
    let end = begin + 1
    let out = ''
    for (;;) {
      let next = end
      let c = ''
      for (; next < len; next++) {
        c = s[next]
        if (c === '"' || c === '\\') break
        if (c.charCodeAt(0) <= 0x1f) throw new JsonErr('Invalid control character at', s, next)
      }
      if (next >= len) throw new JsonErr('Unterminated string starting at', s, begin)
      out += s.slice(end, next)
      next++
      if (c === '"') return [out, next]
      if (next === len) throw new JsonErr('Unterminated string starting at', s, begin)
      c = s[next]
      if (c !== 'u') {
        end = next + 1
        if (!Object.hasOwn(JSON_ESC, c)) throw new JsonErr('Invalid \\escape', s, end - 2)
        out += JSON_ESC[c]
      } else {
        next++
        end = next + 4
        if (end >= len) throw new JsonErr('Invalid \\uXXXX escape', s, next - 1)
        let cp = hex4(next, end)
        next = end
        if (cp >= 0xd800 && cp <= 0xdbff && end + 6 < len && s[next] === '\\' && s[next + 1] === 'u') {
          const c2 = hex4(next + 2, end + 6)
          if (c2 >= 0xdc00 && c2 <= 0xdfff) { cp = 0x10000 + ((cp - 0xd800) << 10) + (c2 - 0xdc00); end += 6 }
        }
        out += String.fromCodePoint(cp)
      }
    }
  }

  function parseObject(start: number): [unknown, number] {
    const obj: Record<string, unknown> = Object.create(null)
    const order = new Set<string>()
    let idx = skip(start + 1)
    if (idx >= len || s[idx] !== '}') {
      for (;;) {
        if (idx >= len || s[idx] !== '"') throw new JsonErr('Expecting property name enclosed in double quotes', s, idx)
        const [key, afterKey] = scanString(idx)
        idx = skip(afterKey)
        if (idx >= len || s[idx] !== ':') throw new JsonErr("Expecting ':' delimiter", s, idx)
        idx = skip(idx + 1)
        const [val, afterVal] = scanOnce(idx)
        obj[key] = val
        order.add(key)
        idx = skip(afterVal)
        if (idx < len && s[idx] === '}') break
        if (idx >= len || s[idx] !== ',') throw new JsonErr("Expecting ',' delimiter", s, idx)
        const comma = idx
        idx = skip(idx + 1)
        if (idx < len && s[idx] === '}') throw new JsonErr('Illegal trailing comma before end of object', s, comma)
      }
    }
    return [markOrder(obj, [...order]), idx + 1]
  }

  function parseArray(start: number): [unknown, number] {
    const arr: unknown[] = []
    let idx = skip(start + 1)
    if (idx >= len || s[idx] !== ']') {
      for (;;) {
        const [val, afterVal] = scanOnce(idx)
        arr.push(val)
        idx = skip(afterVal)
        if (idx < len && s[idx] === ']') break
        if (idx >= len || s[idx] !== ',') throw new JsonErr("Expecting ',' delimiter", s, idx)
        const comma = idx
        idx = skip(idx + 1)
        if (idx < len && s[idx] === ']') throw new JsonErr('Illegal trailing comma before end of array', s, comma)
      }
    }
    return [arr, idx + 1]
  }

  function scanOnce(idx: number): [unknown, number] {
    if (idx >= len) throw new Stop(idx)
    const c = s[idx]
    if (c === '"') return scanString(idx)
    if (c === '{') return parseObject(idx)
    if (c === '[') return parseArray(idx)
    if (c === 'n' && s.startsWith('null', idx)) return [null, idx + 4]
    if (c === 't' && s.startsWith('true', idx)) return [true, idx + 4]
    if (c === 'f' && s.startsWith('false', idx)) return [false, idx + 5]
    if (c === 'N' && s.startsWith('NaN', idx)) return [pyFloat(NaN), idx + 3]
    if (c === 'I' && s.startsWith('Infinity', idx)) return [pyFloat(Infinity), idx + 8]
    if (c === '-' && s.startsWith('-Infinity', idx)) return [pyFloat(-Infinity), idx + 9]
    JSON_NUM.lastIndex = idx
    const m = JSON_NUM.exec(s)
    if (!m) throw new Stop(idx)
    return [m[2] || m[3] ? pyFloat(Number(m[0])) : Number(m[0]), idx + m[0].length]
  }

  let value: unknown
  let end: number
  try {
    [value, end] = scanOnce(skip(0))
  } catch (e) {
    if (e instanceof Stop) throw new JsonErr('Expecting value', s, e.idx)
    throw e
  }
  end = skip(end)
  if (end !== len) throw new JsonErr('Extra data', s, end)
  return value
}
