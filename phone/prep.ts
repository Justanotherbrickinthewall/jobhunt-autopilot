// Prep's public content for the phone copy: parsed, cleaned of pay, with evidence emptied. build.ts writes it as prep.json
// and audio.ts synthesises from the same object, so the two always agree.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { stripPrivate } from '../src/data/private.ts'
import { buildSources, hasAnyContent } from '../src/data/prepParse.ts'
import type { PrepContent } from '../src/data/prepTypes.ts'
import { OUT, PROFILE, isPay, payFigures, payKeyNames, payMatcher, payTopic, prepPayKeys } from './lib.ts'


// Prep's JSON files, through the same parser the dashboard uses. Each file passes through stripPrivate first.
function readPrep(): PrepContent {
  const dir = join(PROFILE, 'interview-prep')
  const docs = new Map<string, unknown>()
  const problems: string[] = []
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    try { docs.set(f.replace(/\.json$/u, ''), JSON.parse(stripPrivate(readFileSync(join(dir, f), 'utf8')))) } catch { throw new Error(`Interview prep file ${f} could not be parsed, so the phone copy would be missing part of it.`) }
  }
  const source = buildSources(docs, problems)[0]
  if (problems.length > 0) throw new Error(`The interview prep parser reported ${problems.length} problems, so the phone copy would be missing part of it.`)
  if (!source || !hasAnyContent(source.content)) throw new Error('There is no interview prep content to build from.')
  return source.content
}

function* strings(v: unknown): Generator<string> {
  if (typeof v === 'string') yield v
  else if (Array.isArray(v)) for (const x of v) yield* strings(x)
  else if (typeof v === 'object' && v !== null) for (const x of Object.values(v)) yield* strings(x)
}

// Drops every question, card and glossary term that holds a pay figure or a pay term next to a digit.
// Returns what was dropped, counted by section, and never the text.
function dropPay(content: PrepContent): { questions: Record<string, number>; other: number; ids: string[] } {
  const figures = payFigures()
  const topic = payTopic(payKeyNames())
  const bad = (node: unknown) => { for (const s of strings(node)) if (isPay(s, figures) || topic(s)) return true; return false }
  const questions: Record<string, number> = {}
  const ids: string[] = []
  let other = 0
  for (const tab of content.tabs) {
    for (const cat of tab.categories) {
      const keep = cat.questions.filter((q) => { const drop = bad(q); if (drop) ids.push(String((q as { id?: unknown }).id ?? '?')); return !drop })
      const n = cat.questions.length - keep.length
      if (n > 0) questions[`${tab.id}/${cat.id}`] = n
      cat.questions = keep
    }
    const cards = tab.cards.filter((c) => !bad(c))
    other += tab.cards.length - cards.length
    tab.cards = cards
  }
  for (const g of content.glossary?.groups ?? []) {
    const terms = g.terms.filter((t) => !bad(t))
    other += g.terms.length - terms.length
    g.terms = terms
  }
  return { questions, other, ids }
}

// Everything left in the content is tested again, whole: every string, then the serialised object, which also holds
// keys and bare numbers. A hit outside the allow list in my-phone/pay-allow.txt stops the build. Only counts and
// places are printed, the matches go to my-phone/pay-hits-prep.txt.
function payCheck(content: PrepContent): number {
  const allow = existsSync(join(OUT, 'pay-allow.txt')) ? new Set(readFileSync(join(OUT, 'pay-allow.txt'), 'utf8').split('\n').filter(Boolean)) : new Set<string>()
  const left = prepPayKeys(content, payMatcher(payFigures())).filter((k) => !allow.has(k))
  mkdirSync(OUT, { recursive: true })
  writeFileSync(join(OUT, 'pay-hits-prep.txt'), `${left.join('\n')}\n`)
  return left.length
}

export function preparedPrep(): PrepContent {
  // Pay is read first, so a profile with no Private pay section stops the run before anything is built.
  payFigures()
  const content = readPrep()
  const dropped = dropPay(content)
  const total = Object.values(dropped.questions).reduce((a, b) => a + b, 0)
  console.log(`Pay screen: dropped ${total} questions${total ? ` (${Object.entries(dropped.questions).map(([k, n]) => `${k}: ${n}`).join(', ')})` : ''} and ${dropped.other} cards or glossary terms. Dropped question ids: ${dropped.ids.join(', ') || 'none'}.`)
  if (content.problems.length > 0) throw new Error(`The interview prep parser reported ${content.problems.length} problems.`)
  const left = payCheck(content)
  if (left > 0) throw new Error(`Pay check: ${left} pay figure hits are left in the interview prep after the drop. See my-phone/pay-hits-prep.txt.`)
  // Evidence holds repo paths and Prep never shows it, so it is left out of the public file.
  return JSON.parse(JSON.stringify(content, (k, v) => (k === 'evidence' ? [] : v))) as PrepContent
}
