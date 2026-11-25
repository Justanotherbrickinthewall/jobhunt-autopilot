// Reads the "## Missing keywords" section of my-sessions/ledger/roles/<id>.md.
// The section is hand-written, so the parser takes the shapes that occur:
//   - <term>: evidence: yes|no|partial (note)
//   - <term> - evidence: no            (separator may be , . · — – - or none)
//   | <term> | "aliases" | evidence: no (note) |   (also "| <term> | no |")
// A line with no term before "evidence:" is skipped.
export type Evidence = 'yes' | 'no' | 'partial'
export interface MissingKeyword { term: string; evidence: Evidence; note: string }

const SEP = /[\s:;,.·—–\-|]+$/u

function cleanTerm(raw: string): string {
  return raw.replace(/\*+|`|__/gu, '').replace(SEP, '').replace(/^[\s:;,.·—–\-|]+/u, '').trim()
}

function noteOf(rest: string): string {
  const paren = /\(([^)]*)\)/u.exec(rest)
  if (paren) return paren[1].trim()
  return rest.replace(/^[\s.;,:·—–\-)|]+/u, '').replace(/[\s|]+$/u, '').trim()
}

function fromBullet(line: string): MissingKeyword | null {
  const m = /^\s*[-*+]\s+(.*?)\bevidence:\s*(yes|no|partial)\b(.*)$/iu.exec(line)
  if (!m) return null
  const term = cleanTerm(m[1])
  if (!term) return null
  return { term, evidence: m[2].toLowerCase() as Evidence, note: noteOf(m[3]) }
}

function fromRow(line: string): MissingKeyword | null {
  if (!/^\s*\|/u.test(line)) return null
  const cells = line.trim().replace(/^\|/u, '').replace(/\|$/u, '').split('|').map((c) => c.trim())
  if (cells.length < 2) return null
  const term = cleanTerm(cells[0])
  if (!term) return null
  for (const cell of cells.slice(1)) {
    const m = /^(?:evidence:\s*)?(yes|no|partial)\b(.*)$/iu.exec(cell)
    if (m) return { term, evidence: m[1].toLowerCase() as Evidence, note: noteOf(m[2]) }
  }
  return null
}

export function parseMissingKeywords(md: string): MissingKeyword[] {
  const section = /^## Missing keywords[ \t]*\r?\n([\s\S]*?)(?=^## |(?![\s\S]))/mu.exec(md)
  if (!section) return []
  const out: MissingKeyword[] = []
  for (const line of section[1].split(/\r?\n/u)) {
    const k = fromBullet(line) ?? fromRow(line)
    if (k) out.push(k)
  }
  return out
}
