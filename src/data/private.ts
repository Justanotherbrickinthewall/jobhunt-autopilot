// The Private pay cut, kept apart from profile.ts so vite.config.ts can import it: profile.ts calls import.meta.glob.
import { Lexer, type Token, type Tokens } from 'marked'

// The private pay section never leaves the data layer. It is cut on what marked parses, not on raw lines,
// so line endings, indentation and the setext form cannot hide it. Headings in quotes and lists count too.
const isPrivate = (t: Token): boolean => {
  const g = t as Tokens.Generic
  if (g.type === 'heading') return /^private pay(?: |$)/u.test(String(g.text).toLowerCase().replace(/[^a-z]+/gu, ' ').trim())
  return (g.tokens ?? g.items ?? []).some(isPrivate)
}

// Where the first private section sits in text, as [from, to). It ends at the next ATX heading of the same or a
// shallower depth. Positions come from each token's raw, because marked drops link reference definitions from
// the token list, and cutting by position leaves them in place. A private heading inside a quote or a list has
// no depth, so it takes the rest of the file. A raw marked rewrote cannot be placed, so it takes everything.
function find(text: string): [number, number] | null {
  let pos = 0
  let from = -1
  let depth = 0
  for (const t of Lexer.lex(text, { gfm: true })) {
    const at = text.indexOf(t.raw, pos)
    if (at < 0) return [0, text.length]
    // Only an ATX heading ends the section. Marked reads a paragraph over --- as a setext H2, and that must not cut early.
    if (from < 0) {
      if (isPrivate(t)) { from = at; depth = t.type === 'heading' ? t.depth : 0 }
    } else if (t.type === 'heading' && t.depth <= depth && /^ {0,3}#/u.test(t.raw)) return [from, at]
    pos = at + t.raw.length
  }
  return from < 0 ? null : [from, text.length]
}

// A last check on the raw text for a private heading marked did not see, such as one inside an open code fence.
const backstop = (out: string): string => {
  const m = /^[ \t>*+\-\d.]*#{1,6}[ \t]*[*_]*[ \t]*private[ \t]+pay\b/imu.exec(out)
  return m ? out.slice(0, m.index) : out
}

export function stripPrivate(markdown: string): string {
  const text = markdown.replace(/\r\n?/gu, '\n') // marked lexes CRLF as LF, so positions only hold on LF text
  const cut = find(text)
  if (!cut) return backstop(markdown)
  const rest = text.slice(0, cut[0]) + text.slice(cut[1])
  // Fail closed: a private heading that survives the cut takes the rest of the file with it.
  const left = find(rest)
  return backstop(left ? rest.slice(0, left[0]) : rest)
}
