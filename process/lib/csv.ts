// Python's csv module, excel dialect: QUOTE_MINIMAL, '"' quote, '\r\n' line ending.
import { pyStr } from './py.ts'

export type CsvRow = Record<string, string | undefined>

// The state machine of CPython's csv reader (excel dialect, strict=False). A quote opens
// quote mode only at the start of a field; after a closing quote, other characters are literal.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let state: 'record' | 'field' | 'in' | 'quoted' | 'quote' = 'record'
  const endField = () => { row.push(field); field = '' }
  const endRow = () => { endField(); rows.push(row); row = []; state = 'record' }
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const nl = c === '\r' || c === '\n'
    if (nl && state !== 'quoted' && c === '\r' && text[i + 1] === '\n') i++
    if (state === 'record') {
      if (nl) { rows.push([]); continue }
      state = 'field'
    }
    if (state === 'quoted') {
      if (c === '"') state = 'quote'
      else field += c
    } else if (nl) endRow()
    else if (c === ',') { endField(); state = 'field' }
    else if (state === 'quote' && c === '"') { field += '"'; state = 'quoted' }
    else if (state === 'field' && c === '"') state = 'quoted'
    else { field += c; state = 'in' }
  }
  if (state !== 'record') endRow()
  return rows
}

// csv.DictReader: blank lines are skipped, short rows leave keys undefined,
// long rows put the overflow under the key '__extra__' joined by ','.
export function readDicts(text: string): { cols: string[]; rows: CsvRow[] } {
  const all = parseCsv(text)
  const cols = all.shift() ?? []
  const rows: CsvRow[] = []
  for (const r of all) {
    if (r.length === 0) continue
    const d: CsvRow = {}
    cols.forEach((c, i) => { d[c] = r[i] })
    if (r.length > cols.length) d.__extra__ = r.slice(cols.length).join(',')
    rows.push(d)
  }
  return { cols, rows }
}

function cell(v: unknown): string {
  const s = v === null || v === undefined ? '' : pyStr(v)
  return /[",\r\n]/u.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s
}

// csv.DictWriter(fieldnames=cols, extrasaction=extras) into a StringIO opened with newline=''.
export function writeDicts(
  cols: readonly string[],
  rows: Iterable<Record<string, unknown>>,
  opts: { header?: boolean; extras?: 'raise' | 'ignore' } = {},
): string {
  const line = (vals: string[]) =>
    (vals.length === 1 && vals[0] === '' ? '""' : vals.join(',')) + '\r\n'
  let out = opts.header === false ? '' : line(cols.map(cell))
  for (const r of rows) {
    if ((opts.extras ?? 'raise') === 'raise') {
      const extra = Object.keys(r).filter((k) => !cols.includes(k))
      if (extra.length) throw new Error(`dict contains fields not in fieldnames: ${extra.map((k) => `'${k}'`).join(', ')}`)
    }
    out += line(cols.map((c) => cell(r[c])))
  }
  return out
}
