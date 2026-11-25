// POST /api/prep/judge: one Claude read of a spoken interview answer. Writes nothing to disk.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { claudeText, extractJson } from './claude.ts'
import { HttpError, readJson, sendJson } from './util.ts'

const CAPS = { question: 2000, answer: 8000, reference: 30000 } as const
const VERDICTS = new Set(['missed', 'shaky', 'had'])

export function judgePrompt(question: string, answer: string, reference: string, followUpOf?: string): string {
  return `You are a senior interviewer judging a candidate's spoken answer. The answer came through dictation, so ignore transcription slips, odd wording and missing punctuation. Judge content only.

The reference below holds the candidate's own true facts and the strongest points for this question. Judge the answer against it. Do not praise. Do not agree by default. If the answer is thin or wrong, say so.

${followUpOf ? `The candidate was first asked: ${JSON.stringify(followUpOf)}\nThe question below is your follow-up to their first answer. There may be no direct reference for it, so judge against the reference as far as it applies and list fewer gaps where it does not.\n\n` : ''}Question: ${JSON.stringify(question)}

Reference (JSON):
${reference}

Candidate's answer:
${JSON.stringify(answer)}

Reply with one JSON object and nothing else:
{"verdict": "missed" | "shaky" | "had", "score": 0 to 10, "gaps": [up to 3 strings], "followUp": "one question"}

Rules:
- score is a whole number from 0 to 10. 0 to 3 means missed, 4 to 6 means shaky and 7 to 10 means had, and the verdict must match the score's band.
- Each gap names one specific fact, number or decision from the reference that the answer left out or got wrong. Never invent a fact that is not in the reference.
- followUp is the one question you would ask next. It presses on the weakest thing the candidate actually said.
- Use an empty gaps array if nothing important is missing.`
}

function text(body: Record<string, unknown>, key: string, max: number, required = true): string {
  const v = body[key]
  if (v === undefined && !required) return ''
  if (typeof v !== 'string') throw new HttpError(400, 'bad_body', `${key} must be a string.`)
  if (v.length > max) throw new HttpError(413, 'too_large', `${key} is longer than ${max} characters.`)
  return v
}

export async function handlePrepJudge(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readJson(req)
  const question = text(body, 'question', CAPS.question)
  const answer = text(body, 'answer', CAPS.answer)
  const reference = text(body, 'reference', CAPS.reference)
  const followUpOf = text(body, 'followUpOf', CAPS.question, false)
  if (!answer.trim()) throw new HttpError(400, 'bad_body', 'answer is empty.')
  const reply = await claudeText(judgePrompt(question, answer, reference, followUpOf || undefined), 'sonnet')
  let out: { verdict?: unknown; score?: unknown; gaps?: unknown; followUp?: unknown }
  try { out = extractJson(reply) as typeof out } catch { throw new HttpError(502, 'bad_judge_reply', 'Claude did not return JSON.') }
  const { verdict, gaps, followUp, score } = out ?? {}
  if (typeof verdict !== 'string' || !VERDICTS.has(verdict) || !Array.isArray(gaps)
    || !gaps.every((g) => typeof g === 'string') || typeof followUp !== 'string') {
    throw new HttpError(502, 'bad_judge_shape', 'Claude returned JSON in the wrong shape.')
  }
  // Clamp and round the score, and drop it when it sits outside its verdict's band.
  const n = typeof score === 'number' && Number.isFinite(score) ? Math.round(Math.min(10, Math.max(0, score))) : undefined
  const band = n === undefined ? undefined : n <= 3 ? 'missed' : n <= 6 ? 'shaky' : 'had'
  sendJson(res, 200, { verdict, ...(band === verdict ? { score: n } : {}), gaps: gaps.slice(0, 3), followUp })
}
