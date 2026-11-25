// Course registry. Chapters and interview banks are discovered with import.meta.glob,
// so the app builds and runs with zero chapters present.
import type { Chapter, Course, InterviewQuestion } from "./types.ts";

export const courses: Course[] = [
  { id: "learn", title: "How to learn this fast", tagline: "Mental models, retrieval practice and building to learn. The method behind every other course.", status: "live", order: 0, colour: "teal" },
  { id: "rag", title: "Retrieval-augmented generation", tagline: "Build a RAG pipeline by hand, from loading to evaluation, and learn to defend every choice in an interview.", status: "live", order: 1, colour: "accent" },
  { id: "agents", title: "Multi-agent systems", tagline: "Part 1 builds the AskPEP desk of agents on LangGraph, with handoffs, budgets, durable runs and memory. Part 2 rebuilds each architecture by hand, then adds evaluation, guardrails, a payments capstone and the system design interview.", status: "live", order: 2, colour: "accent" },
  { id: "guardrails", title: "Guardrails", tagline: "Put a guard on every untrusted input and every action of AskPEP. Add approval before tickets, an attack gate in CI and an audit trail.", status: "live", order: 3, colour: "rose" },
  { id: "evals", title: "Evaluation", tagline: "Give AskPEP versioned golden sets, code graders and a judge checked against your own labels. Then build the command that decides whether a change ships.", status: "live", order: 4, colour: "rose" },
  { id: "llmops", title: "Observability", tagline: "Set SLOs for AskPEP and trace every answer to its retrieval, agent steps and cost. Judge live traffic, alert on what users feel and rehearse the incident.", status: "live", order: 5, colour: "teal" },
  { id: "architecture", title: "AI systems design", tagline: "Pick each AskPEP component from measured numbers, and record why in an ADR.", status: "live", order: 6, colour: "amber" },
  { id: "cloud", title: "AI deployment on GCP", tagline: "Deploy AskPEP on Google Cloud with Terraform, Cloud Run and Cloud SQL. Add a gated pipeline and canary rollouts, and learn how the design moves to other clouds.", status: "live", order: 7, colour: "teal" },
  { id: "fde-craft", title: "The FDE craft: discovery, scoping, demos, customer delivery", tagline: "One customer engagement from first call to handover, with each step solved on the page.", status: "live", order: 8, colour: "accent" },
  { id: "design", title: "The system design round", tagline: "The system-design interview round beyond RAG: a method, worked designs for LLM and classical machine learning systems, and the follow-ups that attack each one.", status: "live", order: 9, colour: "rose" },
  { id: "llm", title: "LLM engineering", tagline: "How models behave, and how to make prompts, structured output and model choices reliable enough to ship.", status: "live", order: 10, colour: "amber" },
  { id: "docai", title: "Document AI", tagline: "From OCR to a validated, idempotent document intake pipeline that knows when to ask a human.", status: "live", order: 11, colour: "amber" },
];

const chapterModules = import.meta.glob<{ default: Chapter }>("./*/ch*.ts", { eager: true });

function isChapter(c: unknown): c is Chapter {
  const x = c as Chapter | undefined;
  return !!x && typeof x.id === "string" && typeof x.course === "string" && Array.isArray(x.sections);
}

const orderOf = (id: string) => courses.find((c) => c.id === id)?.order ?? 999;

export const chapters: Chapter[] = Object.values(chapterModules)
  .map((m) => m.default)
  .filter(isChapter)
  .sort((a, b) => orderOf(a.course) - orderOf(b.course) || a.number - b.number);

const interviewModules = import.meta.glob<{ default: InterviewQuestion[] }>("./interview/*.ts", { eager: true });

export const interviewQuestions: InterviewQuestion[] = Object.values(interviewModules)
  .flatMap((m) => (Array.isArray(m.default) ? m.default : []))
  .sort((a, b) => a.id.localeCompare(b.id));

export const getCourse = (id: string): Course | undefined => courses.find((c) => c.id === id);
export const getChapter = (id: string): Chapter | undefined => chapters.find((c) => c.id === id);
export const chaptersFor = (courseId: string): Chapter[] => chapters.filter((c) => c.course === courseId);
export const getQuestion = (id: string): InterviewQuestion | undefined => interviewQuestions.find((q) => q.id === id);

export type QuizRef = { id: string; chapterId: string; sectionId: string; block: Extract<import("./types.ts").Block, { kind: "quiz" }> };

export const allQuizzes: QuizRef[] = chapters.flatMap((ch) =>
  ch.sections.flatMap((s) =>
    s.blocks.flatMap((b) => (b.kind === "quiz" ? [{ id: b.id, chapterId: ch.id, sectionId: s.id, block: b }] : [])),
  ),
);
