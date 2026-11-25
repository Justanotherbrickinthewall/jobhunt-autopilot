// Tokenisation and word alignment for the read-along, ported from fde-roadmap's engine/text.ts.
// A unit is one narratable block of the current view; its text is exactly what the voice speaks.

export type Token = { start: number; end: number; norm: string }
export type NarrUnit = { key: string; text: string; tokens: Token[] }
export type TimedWord = { text: string; start: number; end: number }

export function normalise(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
}

/** Whitespace-delimited words with stable indices. The renderer's word spans use the same rule. */
export function tokenise(plain: string): Token[] {
  const tokens: Token[] = []
  for (const m of plain.matchAll(/\S+/gu)) {
    const start = m.index ?? 0
    tokens.push({ start, end: start + m[0].length, norm: normalise(m[0]) })
  }
  return tokens
}

/** The token that contains a character offset, or the next token after it. */
export function tokenAtChar(tokens: Token[], ch: number): number {
  for (let i = 0; i < tokens.length; i++) if (ch < tokens[i].end) return i
  return Math.max(0, tokens.length - 1)
}

/**
 * Aligns the server's word timings to the page's tokens by normalised text, with a forward cursor.
 * Returns the start time in seconds of every token. Unmatched tokens are interpolated.
 */
export function alignWords(tokens: Token[], words: TimedWord[]): number[] {
  const starts: (number | null)[] = tokens.map(() => null)
  const consumed = tokens.map(() => 0)
  let cursor = 0
  const WINDOW = 8
  for (const w of words) {
    const nw = normalise(w.text)
    if (!nw) continue
    let found = -1
    for (let j = cursor; j < Math.min(tokens.length, cursor + WINDOW); j++) {
      const nt = tokens[j].norm
      if (!nt) continue
      if (nt === nw || nt.startsWith(nw) || nw.startsWith(nt)) { found = j; break }
    }
    if (found === -1) continue
    if (starts[found] === null) starts[found] = w.start
    consumed[found] += nw.length
    cursor = consumed[found] >= tokens[found].norm.length ? found + 1 : found
  }
  // Fill gaps by linear interpolation between known neighbours.
  const out: number[] = new Array<number>(tokens.length).fill(0)
  const endT = words.length ? words[words.length - 1].end : 0
  let prevIdx = -1
  let prevT = 0
  for (let i = 0; i <= tokens.length; i++) {
    const known = i < tokens.length ? starts[i] : endT
    if (known === null) continue
    for (let k = prevIdx + 1; k < i; k++) out[k] = prevT + ((known - prevT) * (k - prevIdx)) / (i - prevIdx)
    if (i < tokens.length) out[i] = known
    prevIdx = i
    prevT = known
  }
  return out
}
