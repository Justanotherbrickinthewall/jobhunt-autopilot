import { readText } from './files.ts'

// One row of my-interviews/index.json, which the /interview skill writes.
type IndexRow = {
  date: string
  company: string
  role: string
  round: string
  folder: string
  wispr_meeting_id?: string
  source?: 'connector' | 'paste' | 'file'
  source_id?: string | null
  application_id: string | null
}

export type Verdict = 'strong' | 'adequate' | 'weak' | 'wrong'
export type AnalysisRow = {
  id: string; question: string; scored: boolean; answer: string; verdict: Verdict | null
  why: string; better: string; gap: string | null; missing: string; prepIds: string[]; learn: string[]
}
export type NextRound = { round: string; format: string; with: string; when: string; prep: string }
export type Next = { said: string; rounds: NextRound[]; owed: string[]; ask: string[] }
export type Analysis = { questions: AnalysisRow[]; score: number | null; next: Next | null }
export type Interview = IndexRow & { review: string | null; transcript: string | null; analysis: Analysis | null }

const POINTS: Record<Verdict, number> = { strong: 3, adequate: 2, weak: 1, wrong: 0 }
const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

// A damaged or missing analysis.json gives null, so the tab falls back to the review. The score is never stored.
function parseAnalysis(raw: string | null): Analysis | null {
  if (!raw) return null
  try {
    const doc = JSON.parse(raw) as { questions?: unknown; next?: Record<string, unknown> }
    const list = doc.questions
    if (!Array.isArray(list)) return null
    const questions = list.flatMap((r: Record<string, unknown> | null): AnalysisRow[] => {
      if (!r || typeof r !== 'object' || !str(r.id)) return []
      const verdict = typeof r.verdict === 'string' && r.verdict in POINTS ? (r.verdict as Verdict) : null
      return [{ id: str(r.id), question: str(r.question), scored: r.scored !== false && verdict !== null, answer: str(r.answer), verdict,
        why: str(r.why), better: str(r.better), gap: str(r.gap) || null, missing: str(r.missing), prepIds: ids(r.prepIds), learn: ids(r.learn) }]
    })
    const scored = questions.filter((q) => q.scored)
    const points = scored.reduce((n, q) => n + POINTS[q.verdict!], 0)
    const n = doc.next && typeof doc.next === 'object' ? doc.next : null
    const rounds = n && Array.isArray(n.rounds) ? n.rounds.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
      .map((r) => ({ round: str(r.round), format: str(r.format), with: str(r.with), when: str(r.when), prep: str(r.prep) })) : []
    const next = n ? { said: str(n.said), rounds, owed: ids(n.owed), ask: ids(n.ask) } : null
    return { next, questions, score: scored.length ? Math.round((10 * points / (3 * scored.length)) * 10) / 10 : null }
  } catch { return null }
}

export function loadInterviews(): { interviews: Interview[]; problem: string | null } {
  const raw = readText('/my-interviews/index.json')
  if (!raw) return { interviews: [], problem: null }
  try {
    const rows = JSON.parse(raw) as IndexRow[]
    const interviews = rows.map((r) => ({
      ...r,
      review: readText(`/my-interviews/${r.folder}/review.md`),
      transcript: readText(`/my-interviews/${r.folder}/transcript.md`),
      analysis: parseAnalysis(readText(`/my-interviews/${r.folder}/analysis.json`)),
    }))
    return { interviews: interviews.sort((a, b) => b.date.localeCompare(a.date)), problem: null }
  } catch {
    return { interviews: [], problem: 'The list of interviews is damaged, so none can show. Ask Claude in chat to repair it.' }
  }
}
