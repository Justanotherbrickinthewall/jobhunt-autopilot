// The pure half of the prep loader: it turns the parsed interview-prep JSON files into the shape prepTypes.ts describes.
// It holds no import.meta.glob and no browser API, so Node can run it too (phone/build.ts does).
// A block of the wrong shape is skipped with a problem; nothing throws.
import type {
  GlossaryFile, GlossaryGroup, GlossaryTerm, PrepCategory, PrepContent, PrepMeta, PrepQuestion, PrepTab, QuickRefCard,
} from './prepTypes.ts'

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const msg = (e: unknown): string => (e instanceof Error ? e.message : String(e))

export type PrepSource = {
  content: PrepContent
  // Lower-case search text per question, card and glossary term id, built once at load.
  blobs: Map<string, string>
}

// docs: file stem -> parsed JSON. problems: what the loader already found wrong.
export function buildSources(docs: Map<string, unknown>, problems: string[]): PrepSource[] {
  if (docs.size === 0 && problems.length === 0) return []
  let content: PrepContent
  try { content = merge(docs, problems) } catch (e) { content = emptyContent([...problems, `could not merge the prep files: ${msg(e)}`]) }
  return [{ content, blobs: blobsOf(content) }]
}

const emptyContent = (problems: string[]): PrepContent => ({
  meta: { version: 1, title: 'Interview prep', subtitle: '', updated: '', tabs: [], files: [] },
  tabs: [], glossary: null, problems,
})

export function blobsOf(content: PrepContent): Map<string, string> {
  const m = new Map<string, string>()
  for (const t of content.tabs) {
    for (const q of tabQuestions(t)) m.set(q.id, searchBlob(q))
    for (const c of t.cards) m.set(c.id, searchBlob(c))
  }
  for (const g of content.glossary?.groups ?? []) for (const t of g.terms) m.set(t.id, searchBlob(t))
  return m
}

function cleanGlossary(raw: unknown, problems: string[]): GlossaryFile | null {
  if (raw === undefined) return null
  if (!isObj(raw) || !Array.isArray(raw.groups)) { problems.push('glossary.json is not a glossary file'); return null }
  const groups: GlossaryGroup[] = []
  for (const g of raw.groups) {
    if (!isObj(g) || !isStr(g.id) || !Array.isArray(g.terms)) { problems.push('glossary.json: a group is not an object with an id and a terms array, skipped'); continue }
    const terms: GlossaryTerm[] = []
    for (const t of g.terms) {
      if (!isObj(t) || !isStr(t.id) || !isStr(t.term)) { problems.push(`glossary.json: a term in group ${g.id} has no id or no term, skipped`); continue }
      terms.push(t as unknown as GlossaryTerm)
    }
    groups.push({ ...(g as unknown as GlossaryGroup), title: isStr(g.title) ? g.title : g.id, terms })
  }
  return { version: 1, groups }
}

function merge(docs: Map<string, unknown>, problems: string[]): PrepContent {
  const rawMeta = docs.get('meta')
  if (!isObj(rawMeta) || !Array.isArray(rawMeta.tabs)) {
    problems.push('meta.json is missing, unreadable or has no tabs array')
    return emptyContent(problems)
  }
  const meta = rawMeta as unknown as PrepMeta

  const tabs: PrepTab[] = []
  for (const t of meta.tabs as unknown[]) {
    if (!isObj(t) || !isStr(t.id) || !isStr(t.title)) { problems.push('meta.json: a tab is not an object with an id and a title, skipped'); continue }
    let cats: unknown[] = []
    if (Array.isArray(t.categories)) cats = t.categories
    else if (t.categories !== undefined) problems.push(`meta.json: categories of tab ${t.id} is not an array`)
    const categories: PrepCategory[] = []
    for (const c of cats) {
      if (!isObj(c) || !isStr(c.id)) { problems.push(`meta.json: a category in tab ${t.id} has no id, skipped`); continue }
      categories.push({ ...(c as unknown as PrepCategory), title: isStr(c.title) ? c.title : c.id, questions: [] })
    }
    tabs.push({ ...(t as unknown as PrepTab), purpose: isStr(t.purpose) ? t.purpose : '', categories, cards: [] })
  }
  const tabById = new Map(tabs.map((t) => [t.id, t]))
  const seen = new Set<string>()

  // meta.files order first, then any batch file it doesn't list, by name.
  const listed: string[] = []
  if (Array.isArray(meta.files)) {
    for (const f of meta.files as unknown[]) {
      if (isStr(f)) listed.push(f.replace(/\.json$/u, ''))
      else problems.push('meta.json: an entry in files is not a string, skipped')
    }
  }
  const unlisted = [...docs]
    .filter(([name, doc]) => name !== 'meta' && name !== 'glossary' && !listed.includes(name) && isObj(doc) && Array.isArray(doc.categories))
    .map(([name]) => name).sort()
  const order = [...new Set([...listed, ...unlisted])]

  for (const name of order) {
    const doc = docs.get(name)
    if (doc === undefined) { problems.push(`${name}.json is listed in meta.json but was not found or could not be read`); continue }
    if (!isObj(doc) || !Array.isArray(doc.categories ?? doc.cards)) { problems.push(`${name}.json is not a question file`); continue }
    for (const block of (doc.categories ?? []) as unknown[]) {
      if (!isObj(block)) { problems.push(`${name}.json: a categories entry is not an object, skipped`); continue }
      const cat = tabById.get(String(block.tabId))?.categories.find((c) => c.id === block.categoryId)
      if (!cat) { problems.push(`${name}.json: unknown category ${String(block.tabId)}/${String(block.categoryId)}, its questions are skipped`); continue }
      if (!Array.isArray(block.questions)) { problems.push(`${name}.json: questions of ${cat.id} is not an array, skipped`); continue }
      for (const q of block.questions as unknown[]) {
        if (!isObj(q) || !isStr(q.id) || !isStr(q.question)) { problems.push(`${name}.json: a question in ${cat.id} has no id or no question text, skipped`); continue }
        if (seen.has(q.id)) { problems.push(`${name}.json: duplicate question id ${q.id}`); continue }
        seen.add(q.id)
        cat.questions.push(q as unknown as PrepQuestion)
      }
    }
    if (doc.cards !== undefined) {
      if (!Array.isArray(doc.cards)) { problems.push(`${name}.json: cards is not an array, skipped`); continue }
      const good = (doc.cards as unknown[]).filter((c): c is QuickRefCard => {
        const ok = isObj(c) && isStr(c.id) && isStr(c.title)
        if (!ok) problems.push(`${name}.json: a quick-reference card has no id or title, skipped`)
        return ok
      })
      const cardTab = tabs.find((t) => t.layout === 'cards')
      if (good.length === 0) continue
      if (cardTab) cardTab.cards.push(...good)
      else problems.push(`${name}.json has quick-reference cards but meta.json declares no cards tab`)
    }
  }

  return { meta, tabs, glossary: cleanGlossary(docs.get('glossary'), problems), problems }
}

// ---------- Helpers the view uses ----------

// How many facts on a question still need the candidate's confirmation.
export const checkCount = (q: PrepQuestion): number => (Array.isArray(q.checks) ? q.checks.length : 0)

export function tabQuestions(tab: PrepTab): PrepQuestion[] {
  return tab.categories.flatMap((c) => c.questions)
}

export function tabHasContent(tab: PrepTab, content: PrepContent): boolean {
  if (tab.layout === 'glossary') return (content.glossary?.groups.length ?? 0) > 0
  if (tab.layout === 'cards') return tab.cards.length > 0
  return tabQuestions(tab).length > 0
}

export function hasAnyContent(content: PrepContent): boolean {
  return content.tabs.some((t) => tabHasContent(t, content))
}

// One lower-case string of every piece of text a node holds, so search covers question text,
// answer parts, follow-ups, evidence and the kind-specific fields without naming each one.
// Fields the Prep tab does not show are skipped whole, so a hit there would show nothing. 'note' is noEvidence.note; trap and noEvidence.prepare show under Tips, so they stay searchable.
const HIDDEN = ['evidence', 'simple', 'throughLine', 'remember', 'steer', 'redFlags', 'keyPhrases', 'testing', 'structure', 'note']
const SKIP_KEYS = new Set(['id', 'kind', 'provenance', 'sourceRef', 'confidence', 'tag', ...HIDDEN])
export function searchBlob(node: unknown): string {
  const out: string[] = []
  const walk = (v: unknown, key?: string) => {
    if (key && SKIP_KEYS.has(key)) return
    if (typeof v === 'string') out.push(v)
    else if (Array.isArray(v)) v.forEach((x) => walk(x, key))
    else if (isObj(v)) for (const [k, x] of Object.entries(v)) walk(x, k)
  }
  walk(node)
  return out.join('\n').toLowerCase()
}

export const matches = (blob: string, query: string): boolean => {
  const terms = query.toLowerCase().split(/\s+/u).filter(Boolean)
  return terms.every((t) => blob.includes(t))
}

