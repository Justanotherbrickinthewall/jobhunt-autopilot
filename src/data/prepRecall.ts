// Readiness for the Prep room. One record per question: how stable the memory is (days) and when it was last rated.
// It never holds the candidate's answer text. The key is mirrored, so it lands in my-notebook/progress.json.
import type { PrepQuestion, PrepTab } from './prepTypes.ts'
import { loadPractised, savePractised, tabQuestions } from './prep.ts'
import { readKey, writeKey } from '../reading/storage.ts'
import { addPass } from './prepConfidence.ts'

export type Rating = 'missed' | 'shaky' | 'had'
export type Recall = { s: number; at: string; r: Rating }
export const RECALL_KEY = 'hunt-board:prep-recall:v1'

const DAY = 86_400_000
const store = (): Record<string, Recall> => readKey<Record<string, Recall>>(RECALL_KEY, {})

export const isDrillable = (q: PrepQuestion): boolean => q.kind !== 'coaching'
export const drillable = (tab: PrepTab): PrepQuestion[] => tabQuestions(tab).filter(isDrillable)

// Probability the answer still comes to mind. An unseen question is 0.
export function retrievability(rec: Recall | undefined, now = Date.now()): number {
  if (!rec) return 0
  return 0.5 ** (Math.max(0, now - Date.parse(rec.at)) / DAY / rec.s)
}

// score is the judge's 0 to 10, present only when the answer was judged. Spaced recall below still picks the next question.
export function rate(id: string, rating: Rating, score?: number): void {
  addPass(id, rating, score)
  const all = store()
  const s = all[id]?.s ?? 1 // a first-time question counts as 1 day
  const next = rating === 'missed' ? 0.5 : rating === 'shaky' ? Math.max(1, s * 1.2) : Math.max(3, s * 2.5)
  writeKey(RECALL_KEY, { ...all, [id]: { s: next, at: new Date().toISOString(), r: rating } })
  savePractised(new Set([...loadPractised(), id]))
}

export type Readiness = { pct: number; seen: number; total: number }

// Mean retrievability over the tabs' drillable questions, so a meter falls as time passes.
export function readiness(tabs: PrepTab[]): Readiness {
  const all = store()
  const qs = tabs.flatMap(drillable)
  const sum = qs.reduce((n, q) => n + retrievability(all[q.id]), 0)
  return { pct: qs.length ? Math.round((sum / qs.length) * 100) : 0, seen: qs.filter((q) => all[q.id]).length, total: qs.length }
}

// Weak and unseen questions first, with enough noise that the order still feels random.
export function pickNext(pool: PrepQuestion[], excluded: ReadonlySet<string>): PrepQuestion | undefined {
  const all = store()
  let best: PrepQuestion | undefined
  let low = Infinity
  for (const q of pool) {
    if (excluded.has(q.id)) continue
    const score = retrievability(all[q.id]) + Math.random() * 0.3
    if (score < low) { low = score; best = q }
  }
  return best
}

// Six sections picked at random, one question from each.
// shortcut: a random-comparator sort is slightly biased, fine for six picks, switch to Fisher-Yates if the order ever matters.
export function quickCheck(tabs: PrepTab[]): PrepQuestion[] {
  return tabs.filter((t) => drillable(t).length > 0).sort(() => Math.random() - 0.5).slice(0, 6)
    .map((t) => pickNext(drillable(t), new Set())).filter((q): q is PrepQuestion => !!q)
}
