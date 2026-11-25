import type { InterviewQuestion } from "../../content/types.ts";
export type Dimension = "crispness" | "understanding" | "keywords" | "structure" | "depth";
export const DIMENSIONS: Dimension[] = ["crispness", "understanding", "keywords", "structure", "depth"];

export type FramePart = "direct" | "flow" | "controls" | "metrics" | "tradeoff" | "fallback";
export const FRAME_PARTS: { id: FramePart; label: string }[] = [
  { id: "direct", label: "Direct answer" },
  { id: "flow", label: "Flow" },
  { id: "controls", label: "Controls" },
  { id: "metrics", label: "Metrics" },
  { id: "tradeoff", label: "Trade-off" },
  { id: "fallback", label: "Fallback" },
];

export type GradeResult = {
  overall: number;
  scores: Record<Dimension, { score: number; note: string }>;
  keywordsHit: string[];
  keywordsMissed: string[];
  strengths: string[];
  gaps: string[];
  // Absent on attempts saved before the frame and overclaim checks were added.
  frame?: { applies: boolean; present: FramePart[]; missing: FramePart[] };
  overclaim?: string[];
  betterAnswer: string;
  followUps: { question: string; why: string }[];
};

export type Attempt = { ts: string; questionId: string | null; question: string; answer: string; result: GradeResult };

export type PracticeQuestion = {
  id?: string;
  question: string;
  idealAnswer?: string;
  keywords?: string[];
  category?: string;
  level?: string;
  source?: "asked" | "practice";
};

export const toPractice = (q: InterviewQuestion): PracticeQuestion => ({
  id: q.id, question: q.question, idealAnswer: q.idealAnswer, keywords: q.keywords, category: q.category, level: q.level, source: q.source,
});

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export async function gradeAnswer(q: PracticeQuestion, answer: string): Promise<GradeResult> {
  let res: Response;
  try {
    res = await fetch("/api/learn/grade", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId: q.id, question: q.question, idealAnswer: q.idealAnswer, keywords: q.keywords, answer }),
      signal: AbortSignal.timeout(200_000),
    });
  } catch {
    throw new ApiError("server_down", "The local server is not responding. Start it with npm run dev, then try again.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.code ?? "error", body.error ?? `Grading failed (${res.status}).`);
  return body as GradeResult;
}

export async function fetchAttempts(): Promise<Attempt[]> {
  try {
    const res = await fetch("/api/learn/attempts");
    if (!res.ok) return [];
    return ((await res.json()) as { attempts: Attempt[] }).attempts ?? [];
  } catch {
    return [];
  }
}
