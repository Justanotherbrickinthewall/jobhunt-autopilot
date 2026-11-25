// Confidence for the Prep room: every rating is kept as a pass, and a question's confidence is built from its last passes.
// A pass never holds the candidate's answer text. The key is mirrored, so it lands in my-notebook/progress.json.
import type { PrepQuestion } from './prepTypes.ts'
import { readKey, writeKey } from '../reading/storage.ts'

export type PassRating = 'missed' | 'shaky' | 'had'
export type Pass = { at: string; r: PassRating; score?: number }
export const PASSES_KEY = 'hunt-board:prep-passes:v1'
// prepRecall.ts owns this key. It is repeated here because prepRecall.ts calls addPass.
const RECALL_KEY = 'hunt-board:prep-recall:v1'
const KEEP = 20
const DAY = 86_400_000
const WEIGHTS = [3, 2, 1]   // newest first

export type Flag = 'none' | 'weak' | 'shaky' | 'strong'
export const FLAG_LABEL: Record<Flag, string> = { none: 'Not tried', weak: 'Weak', shaky: 'Shaky', strong: 'Strong' }
// The tones Retro's Kind column draws: neutral, red, amber and the good tone.
export const FLAG_TONE = { none: 'gray', weak: 'red', shaky: 'amber', strong: 'green' } as const

type Passes = Record<string, Pass[]>
const store = (): Passes => readKey<Passes>(PASSES_KEY, {})

// A pass scores its judge score, else 0, 5 or 10 for the self-rating.
export const passScore = (p: Pass): number => p.score ?? (p.r === 'missed' ? 0 : p.r === 'shaky' ? 5 : 10)

// Each old prep-recall entry with no passes becomes one pass, so the map isn't blank. Safe to run again: it adds nothing the second time.
export function migrate(): void {
  try {
    const recall = readKey<Record<string, { at: string; r: PassRating }>>(RECALL_KEY, {})
    const all = store()
    const add = Object.entries(recall).filter(([id, v]) => !all[id]?.length && v && typeof v.at === 'string')
    if (add.length === 0) return
    writeKey(PASSES_KEY, { ...all, ...Object.fromEntries(add.map(([id, v]) => [id, [{ at: v.at, r: v.r }]])) })
  } catch { /* storage may be blocked; the map just stays empty */ }
}

export function addPass(id: string, r: PassRating, score?: number): void {
  try {
    migrate()
    const pass: Pass = { at: new Date().toISOString(), r, ...(score !== undefined ? { score } : {}) }
    const all = store()
    writeKey(PASSES_KEY, { ...all, [id]: [...(all[id] ?? []), pass].slice(-KEEP) })
  } catch { /* as above */ }
}

// Passes read as saved, or from the old record when migrate has not run yet, so a screen is right on its first render.
function passesOf(id: string, all: Passes, recall: Record<string, { at: string; r: PassRating }>): Pass[] {
  const own = all[id]
  if (Array.isArray(own) && own.length) return own
  const old = recall[id]
  return old && typeof old.at === 'string' ? [{ at: old.at, r: old.r }] : []
}
const recallStore = () => readKey<Record<string, { at: string; r: PassRating }>>(RECALL_KEY, {})

// Weighted mean of the last 3 pass scores, as a percentage. No pass is null.
function confidenceOf(passes: Pass[]): number | null {
  const last = passes.slice(-WEIGHTS.length).reverse()
  if (last.length === 0) return null
  const w = last.reduce((n, _, i) => n + WEIGHTS[i], 0)
  return (last.reduce((n, p, i) => n + passScore(p) * WEIGHTS[i], 0) / w) * 10
}

export const flagOf = (pct: number | null): Flag => (pct === null ? 'none' : pct < 40 ? 'weak' : pct < 75 ? 'shaky' : 'strong')

export type QuestionConfidence = { pct: number | null; flag: Flag; passes: number; latest: number; first: number; scores: number[]; move: number }

export function questionConfidence(id: string): QuestionConfidence {
  const ps = passesOf(id, store(), recallStore())
  const pct = confidenceOf(ps)
  const scores = ps.map(passScore)
  // Movement is the latest pass against the first, and only once there are two.
  const move = scores.length >= 2 ? scores[scores.length - 1] - scores[0] : 0
  return { pct: pct === null ? null : Math.round(pct), flag: flagOf(pct), passes: ps.length, latest: scores[scores.length - 1] ?? 0, first: scores[0] ?? 0, scores, move }
}

export type SectionConfidence = { pct: number; total: number; tried: number; counts: Record<Flag, number>; move: number }

// Mean over the questions, an untried one counting 0. move is the change in points since 7 days ago, 0 when nothing was tried by then.
export function sectionConfidence(qs: PrepQuestion[], now = Date.now()): SectionConfidence {
  const all = store(), recall = recallStore()
  const cut = now - 7 * DAY
  const counts: Record<Flag, number> = { none: 0, weak: 0, shaky: 0, strong: 0 }
  let sum = 0, old = 0, oldSeen = false
  for (const q of qs) {
    const ps = passesOf(q.id, all, recall)
    const c = confidenceOf(ps)
    counts[flagOf(c)]++
    sum += c ?? 0
    const then = confidenceOf(ps.filter((p) => Date.parse(p.at) <= cut))
    if (then !== null) { old += then; oldSeen = true }
  }
  const mean = (n: number) => (qs.length ? n / qs.length : 0)
  return { pct: Math.round(mean(sum)), total: qs.length, tried: qs.length - counts.none, counts, move: oldSeen ? Math.round(mean(sum)) - Math.round(mean(old)) : 0 }
}

export const flagTitle = (c: QuestionConfidence): string => (c.pct === null ? 'No passes yet' : `${c.pct}% over ${c.passes} ${c.passes === 1 ? 'pass' : 'passes'}`)
export const moveText = (move: number): string => `${move > 0 ? '+' : '−'}${Math.abs(move)} in 7 days`

migrate()
