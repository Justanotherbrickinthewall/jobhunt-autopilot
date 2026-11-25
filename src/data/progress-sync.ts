// Carries reading progress from the phone copy to the dashboard. The phone builds a block with progressBlock(),
// and the server merges it with mergeValue(). Both read the same key list, so a key added here crosses over.
// It never copies answer text, bookmarks, settings or the last screen and paragraph, which stay on their own device.
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export const SYNC_VERSION = 1
type Kind = 'chapter' | 'review' | 'practised' | 'recall'

const PREP: Record<string, Kind> = { ':prep-practised:v2': 'practised', ':prep-recall:v1': 'recall' }
// The phone build renames the prep key prefix, so a prep key is matched by its suffix and stored under this side's prefix.
export function syncKind(key: string): Kind | undefined {
  if (key.startsWith('fde:chapter:')) return 'chapter'
  if (key.startsWith('fde:')) return key === 'fde:review' ? 'review' : undefined
  return PREP[key.slice(key.indexOf(':'))]
}
export const localKey = (key: string): string => (key.startsWith('fde:') ? key : `hunt-board${key.slice(key.indexOf(':'))}`)

const FIRST_LINE = 'This is reading progress copied from the phone copy. In the repo, save this whole message to a file and run `npm run phone:merge -- <that file>` to merge it into the dashboard.'

/** The text the phone copies: one plain line for Claude, then the data as JSON on one line. */
export function progressBlock(): string {
  const keys: Record<string, unknown> = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !syncKind(k)) continue
      try { keys[k] = JSON.parse(localStorage.getItem(k) ?? '') } catch { /* an unreadable value is left out */ }
    }
  } catch { /* storage unavailable */ }
  return `${FIRST_LINE}\n${JSON.stringify({ v: SYNC_VERSION, at: new Date().toISOString(), keys })}`
}

const fail = (key: string, what: string): never => { throw new Error(`${key}: ${what}`) }
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
// For each id, theirs replaces mine only when it shows more progress; otherwise the dashboard's value stays.
const byId = <T>(mine: Record<string, T>, theirs: Record<string, T>, wins: (t: T, m: T) => boolean): Record<string, T> => {
  const out = { ...mine }
  for (const [id, t] of Object.entries(theirs)) if (!(id in out) || wins(t, out[id])) out[id] = t
  return out
}
const never = (): boolean => false

function record<T>(key: string, v: unknown, ok: (x: unknown) => x is T, what: string): Record<string, T> {
  if (!isObj(v)) return fail(key, 'expected an object')
  for (const [id, x] of Object.entries(v)) if (!ok(x)) fail(key, `${id} is not ${what}`)
  return v as Record<string, T>
}

type Quiz = { choice: number; correct: boolean; at: number }
type Chapter = { opened: boolean; sectionsRead: string[]; widgets: Record<string, string>; quiz: Record<string, Quiz>; labDone: number[]; steps: Record<string, boolean>; completed: boolean; lastSection?: string; lastAt: number }

function chapter(key: string, v: unknown): Chapter {
  if (!isObj(v)) return fail(key, 'expected an object')
  const list = <T>(x: unknown, ok: (e: unknown) => e is T, name: string): T[] => (x === undefined ? [] : Array.isArray(x) && x.every(ok) ? (x as T[]) : fail(key, `${name} is not a list of the right type`))
  const flag = (x: unknown, name: string): boolean => (x === undefined ? false : typeof x === 'boolean' ? x : fail(key, `${name} is not true or false`))
  return {
    opened: flag(v.opened, 'opened'),
    sectionsRead: list(v.sectionsRead, (e): e is string => typeof e === 'string', 'sectionsRead'),
    widgets: v.widgets === undefined ? {} : record(key, v.widgets, (x): x is string => typeof x === 'string', 'text'),
    quiz: v.quiz === undefined ? {} : record(key, v.quiz, (x): x is Quiz => isObj(x) && num(x.choice) && typeof x.correct === 'boolean' && num(x.at), 'a quiz answer'),
    labDone: list(v.labDone, num, 'labDone'),
    steps: v.steps === undefined ? {} : record(key, v.steps, (x): x is boolean => typeof x === 'boolean', 'true or false'),
    completed: flag(v.completed, 'completed'),
    lastSection: typeof v.lastSection === 'string' ? v.lastSection : undefined,
    lastAt: v.lastAt === undefined ? 0 : num(v.lastAt) ? v.lastAt : fail(key, 'lastAt is not a number'),
  }
}

type Card = { box: number; due: number; last: number }
type Recall = { s: number; at: string; r: string }

/**
 * Merges the phone's value for one key into the dashboard's. Nothing goes backwards: the value that shows more
 * progress wins, the later of two timestamps wins where there is no order, and the dashboard's value wins a tie.
 * `mine` is the parsed dashboard value, or undefined. A value of the wrong shape throws a plain error.
 */
export function mergeValue(key: string, mine: unknown, theirs: unknown): unknown {
  const kind = syncKind(key)
  if (kind === 'chapter') {
    const t = chapter(key, theirs)
    let m: Chapter
    try { m = chapter(key, mine ?? {}) } catch { m = chapter(key, {}) }   // a damaged dashboard copy counts as unread
    const merged = {
      opened: m.opened || t.opened,
      sectionsRead: [...new Set([...m.sectionsRead, ...t.sectionsRead])],
      widgets: byId(m.widgets, t.widgets, never),
      quiz: byId(m.quiz, t.quiz, (a, b) => a.at > b.at),
      labDone: [...new Set([...m.labDone, ...t.labDone])],
      steps: byId(m.steps, t.steps, never),
      completed: m.completed || t.completed,
      lastAt: Math.max(m.lastAt, t.lastAt),
    }
    // The paragraph the reader left at is device state, so only the dashboard's own survives.
    return m.lastSection ? { ...merged, lastSection: m.lastSection } : merged
  }
  const old = isObj(mine) ? mine : {}
  if (kind === 'review') {
    const t = record<Card>(key, theirs, (x): x is Card => isObj(x) && num(x.box) && num(x.due) && num(x.last), 'a review card')
    return byId(old as Record<string, Card>, t, (a, b) => a.box > b.box || (a.box === b.box && a.last > b.last))
  }
  if (kind === 'practised') return byId(old as Record<string, true>, record<true>(key, theirs, (x): x is true => x === true, 'true'), never)
  const t = record<Recall>(key, theirs, (x): x is Recall => isObj(x) && num(x.s) && typeof x.at === 'string' && typeof x.r === 'string', 'a recall record')
  return byId(old as Record<string, Recall>, t, (a, b) => a.s > b.s || (a.s === b.s && Date.parse(a.at) > Date.parse(b.at)))
}

/** Merges a pasted block into this browser's localStorage with mergeValue, the rule the server uses. Returns how many keys changed. Throws a plain error on a bad block. */
export function mergeBlock(text: string): number {
  const json = text.split('\n').find((l) => l.startsWith('{'))
  if (!json) throw new Error('No progress data found. The block should have a line that starts with {.')
  let body: { v?: unknown; keys?: unknown }
  try { body = JSON.parse(json) } catch { throw new Error('The progress line is not valid JSON.') }
  if (body.v !== SYNC_VERSION || !isObj(body.keys)) throw new Error('That is not a progress block.')
  return mergeKeys(body.keys)
}

/** Merges already-parsed keys ({ key: parsed value }) into localStorage, the same rule as mergeBlock. Returns how many keys changed. */
export function mergeKeys(keys: Record<string, unknown>): number {
  const next: [string, string][] = []
  for (const [k0, theirs] of Object.entries(keys)) {
    if (!syncKind(k0)) continue
    const k = localKey(k0)
    let raw: string | null = null
    let mine: unknown
    try { raw = localStorage.getItem(k); mine = raw === null ? undefined : JSON.parse(raw) } catch { /* absent or unreadable counts as empty */ }
    const merged = JSON.stringify(mergeValue(k, mine, theirs))
    if (merged !== JSON.stringify(mine)) next.push([k, merged])
  }
  for (const [k, v] of next) localStorage.setItem(k, v)   // all keys validated first, so a bad one writes nothing
  return next.length
}
