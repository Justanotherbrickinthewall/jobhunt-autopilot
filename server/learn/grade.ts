// Interview grading for the Learn tab. The Claude call is server/claude.ts, the locked `claude -p` spawn with every
// tool off. Graded attempts are appended to my-learn/attempts.jsonl, which the first write creates.
import { appendFile, mkdir, readFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import { claudeText, type Model } from '../claude.ts'
import { HttpError, readJson, sendJson } from '../util.ts'

// The only folder the Learn routes write besides my-notebook/. It is gitignored and may not exist yet.
const LEARN = resolve(import.meta.dirname, '..', '..', 'my-learn')
const ATTEMPTS = resolve(LEARN, 'attempts.jsonl')
const MODELS: readonly Model[] = ['haiku', 'sonnet', 'opus']
// GRADER_MODEL picks the grader. An unknown value falls back to sonnet.
const GRADER_MODEL: Model = MODELS.find((m) => m === process.env.GRADER_MODEL) ?? 'sonnet'
const DIMENSIONS = ["crispness", "understanding", "keywords", "structure", "depth"] as const;
// The six-part answer frame.
const FRAME_PARTS = ["direct", "flow", "controls", "metrics", "tradeoff", "fallback"] as const;

export type GradeInput = {
  questionId?: string;
  question: string;
  idealAnswer?: string;
  keywords?: string[];
  answer: string;
};

export function buildPrompt(input: GradeInput): string {
  const hasIdeal = !!input.idealAnswer?.trim();
  const keywords = (input.keywords ?? []).filter(Boolean);
  return `You are a senior interviewer hiring forward-deployed AI engineers. These engineers sit with customers, build retrieval and LLM systems end to end, and explain trade-offs to technical and non-technical people. You are grading a spoken-style answer from a candidate. Be strict and specific. Do not flatter. A vague answer that sounds fluent is still vague.

QUESTION
${input.question}

${hasIdeal ? `IDEAL ANSWER (reference)\n${input.idealAnswer}` : "NO IDEAL ANSWER WAS SUPPLIED. Before grading, draft a strong ideal answer yourself, internally, in the register of a confident spoken interview answer. Grade against that."}

${keywords.length ? `KEYWORDS A STRONG ANSWER USES\n${keywords.join(", ")}` : "NO KEYWORD LIST WAS SUPPLIED. Choose 5 to 8 terms a strong answer would use and treat those as the keywords."}

CANDIDATE ANSWER
${input.answer}

GRADING METHOD
Compare the candidate answer to the ideal answer and the keywords. Score each dimension from 0 to 10, with one sentence of note that names what was said or missing.
- crispness: does it lead with the answer, stay on the question and avoid waffle? Spoken answers should land in about 60 to 140 seconds of speech.
- understanding: is it technically correct, and does it show why, not only what?
- keywords: does it use the precise terms of art, used correctly? Count a keyword as hit only if the idea is present, even if the exact wording differs.
- structure: is there a clear order, such as answer first, then reasons, then trade-offs or an example? For a scenario or design question, also judge how much of the six-part frame below the answer covers.
- depth: does it go beyond the textbook into trade-offs, failure modes, numbers or real experience?
ANSWER FRAME
For scenario, design and "how would you" questions, a strong answer has six parts, in this order: direct (the answer comes first), flow (the steps in execution order), controls (validation, security, retries, idempotency, observability), metrics (what is measured and the thresholds), tradeoff (what the choice costs), fallback (what happens when it fails). Decide whether the frame fits this question. A definition or a pure fact question does not need it. If it fits, list which parts the candidate answer actually contained, judged by the ideas present and not by the words used, and which were missing. If it does not fit, say so and leave both lists empty.

OVERCLAIMING
Flag anything the candidate states as fact about their own experience with nothing to back it. That covers production claims ("we ran this in production"), numbers ("cut latency by 60 percent") and ownership ("I built the whole pipeline"). Quote each flagged phrase exactly as the candidate wrote it. Do not flag hypothetical design language such as "I would" or "I'd use", and do not flag textbook facts that are not about the candidate's own work. A claim that comes with a specific, checkable detail is backed. If nothing is overclaimed, return an empty list. Never put an unbacked production claim, number or ownership claim into betterAnswer; write it as a design the candidate would use.

The overall score is your weighted judgement from 0 to 10 with one decimal. It does not need to be the plain mean. Use the full range: a typical decent but unremarkable answer is 5 to 6, and 9 or more is rare.

For betterAnswer, write a crisp answer of 90 to 140 words in a confident spoken register, in first person, answer first. Write in British English. Do not use bullet points.
For followUps, give 2 to 3 questions the interviewer would ask next. Each has a "why" that says what the interviewer is probing.
strengths and gaps are short sentences, 2 to 4 each, specific to this answer.

OUTPUT FORMAT
Output ONLY a single JSON object. No prose before or after it. No code fences. Use exactly this shape:
{
  "overall": 7.5,
  "scores": {
    "crispness": {"score": 7, "note": "..."},
    "understanding": {"score": 8, "note": "..."},
    "keywords": {"score": 6, "note": "..."},
    "structure": {"score": 7, "note": "..."},
    "depth": {"score": 8, "note": "..."}
  },
  "keywordsHit": ["..."],
  "keywordsMissed": ["..."],
  "strengths": ["..."],
  "gaps": ["..."],
  "frame": {"applies": true, "present": ["direct", "controls"], "missing": ["flow", "metrics", "tradeoff", "fallback"]},
  "overclaim": ["exact phrase from the candidate answer"],
  "betterAnswer": "...",
  "followUps": [{"question": "...", "why": "..."}]
}
In frame, use only these part names: direct, flow, controls, metrics, tradeoff, fallback.`;
}

export function extractJson(text: string): unknown {
  let t = text.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
  if (fence) t = fence[1].trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first === -1 || last <= first) throw new Error("No JSON object in grader output.");
  return JSON.parse(t.slice(first, last + 1));
}

const clamp = (n: unknown): number => Math.min(10, Math.max(0, Number(n) || 0));
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : []);

export function validateResult(raw: any): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || !raw.scores) throw new Error("Grader output is missing scores.");
  const scores: Record<string, { score: number; note: string }> = {};
  for (const d of DIMENSIONS) {
    const s = raw.scores[d];
    if (!s) throw new Error(`Grader output is missing the ${d} score.`);
    scores[d] = { score: clamp(s.score), note: String(s.note ?? "") };
  }
  const mean = DIMENSIONS.reduce((a, d) => a + scores[d].score, 0) / DIMENSIONS.length;
  const overall = raw.overall === undefined || isNaN(Number(raw.overall)) ? mean : clamp(raw.overall);
  const followUps = Array.isArray(raw.followUps)
    ? raw.followUps
        .map((f: any) => ({ question: String(f?.question ?? ""), why: String(f?.why ?? "") }))
        .filter((f: { question: string }) => f.question)
    : [];
  const parts = (v: unknown): string[] => {
    const seen = new Set<string>();
    for (const p of strArr(v)) {
      const key = p.toLowerCase().replace(/[^a-z]/g, "");
      const hit = FRAME_PARTS.find((f) => f === key || (f === "tradeoff" && key === "tradeoffs"));
      if (hit) seen.add(hit);
    }
    return FRAME_PARTS.filter((f) => seen.has(f));
  };
  const rawFrame = raw.frame && typeof raw.frame === "object" ? raw.frame : null;
  const present = parts(rawFrame?.present);
  const frame = {
    applies: rawFrame ? rawFrame.applies !== false && (present.length > 0 || parts(rawFrame.missing).length > 0) : false,
    present,
    missing: parts(rawFrame?.missing).filter((p) => !present.includes(p)),
  };
  return {
    overall: Math.round(overall * 10) / 10,
    scores,
    keywordsHit: strArr(raw.keywordsHit),
    keywordsMissed: strArr(raw.keywordsMissed),
    strengths: strArr(raw.strengths),
    gaps: strArr(raw.gaps),
    frame,
    overclaim: strArr(raw.overclaim),
    betterAnswer: String(raw.betterAnswer ?? ""),
    followUps,
  };
}

export async function grade(input: GradeInput): Promise<Record<string, unknown>> {
  const text = await claudeText(buildPrompt(input), GRADER_MODEL);
  try {
    return validateResult(extractJson(text));
  } catch (e: any) {
    throw new HttpError(502, "bad_grade", `The grader did not return valid JSON (${e.message}). Try again.`);
  }
}

export async function handleGrade(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readJson(req);
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";
  if (!question || !answer) throw new HttpError(400, "bad_request", "question and answer are required.");
  const tooLong = (name: string, v: unknown, max: number) => {
    if (typeof v === "string" && v.length > max) throw new HttpError(413, "too_large", `${name} is longer than ${max} characters.`);
  };
  tooLong("question", question, 2000);
  tooLong("answer", answer, 8000);
  tooLong("idealAnswer", body.idealAnswer, 30000);
  if (Array.isArray(body.keywords)) {
    if (body.keywords.length > 30) throw new HttpError(413, "too_large", "keywords has more than 30 entries.");
    for (const k of body.keywords) tooLong("keywords entry", String(k), 200);
  }
  const input: GradeInput = {
    questionId: typeof body.questionId === "string" ? body.questionId : undefined,
    question,
    idealAnswer: typeof body.idealAnswer === "string" ? body.idealAnswer : undefined,
    keywords: Array.isArray(body.keywords) ? body.keywords.map(String) : undefined,
    answer,
  };
  const result = await grade(input);
  await mkdir(LEARN, { recursive: true });
  await appendFile(ATTEMPTS, JSON.stringify({ ts: new Date().toISOString(), questionId: input.questionId ?? null, question, answer, result }) + "\n");
  sendJson(res, 200, result);
}

export async function handleAttempts(url: URL, res: ServerResponse): Promise<void> {
  const questionId = url.searchParams.get("questionId");
  let raw = "";
  try {
    raw = await readFile(ATTEMPTS, "utf8");
  } catch (e) {
    // Only a missing file means no attempts yet.
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  const attempts = raw
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    })
    .filter((a) => !questionId || a.questionId === questionId);
  sendJson(res, 200, { attempts: attempts.slice(-200) });
}
