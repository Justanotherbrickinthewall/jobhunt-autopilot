// Progress store. Per chapter: sections read, widget verdicts, quiz answers, completed, last position.
import { readKey, useStored, writeKey } from "./storage.ts";
import { recordQuizResult } from "./review.ts";

export type QuizAnswer = { choice: number; correct: boolean; at: number };

export type ChapterProgress = {
  opened: boolean;
  sectionsRead: string[];
  widgets: Record<string, string>; // widget block key -> verdict
  quiz: Record<string, QuizAnswer>;
  labDone: number[];
  steps?: Record<string, boolean>; // step block id -> checked
  completed: boolean;
  lastSection?: string;
  lastAt: number;
};

export type LastPosition = { chapterId: string; sectionId?: string; blockId?: string; at: number };

export const EMPTY_CHAPTER: ChapterProgress = {
  opened: false,
  sectionsRead: [],
  widgets: {},
  quiz: {},
  labDone: [],
  completed: false,
  lastAt: 0,
};

const chapterKey = (id: string) => `fde:chapter:${id}`;
const LAST_KEY = "fde:last";

export function getChapterProgress(id: string): ChapterProgress {
  return readKey<ChapterProgress>(chapterKey(id), EMPTY_CHAPTER);
}

export function useChapterProgress(id: string): ChapterProgress {
  return useStored<ChapterProgress>(chapterKey(id), EMPTY_CHAPTER);
}

function update(id: string, fn: (p: ChapterProgress) => ChapterProgress): void {
  const next = fn({ ...EMPTY_CHAPTER, ...getChapterProgress(id) });
  writeKey(chapterKey(id), { ...next, lastAt: Date.now() });
}

export function markOpened(id: string): void {
  if (getChapterProgress(id).opened) return;
  update(id, (p) => ({ ...p, opened: true }));
}

export function markSectionRead(id: string, sectionId: string): void {
  const p = getChapterProgress(id);
  if (p.sectionsRead.includes(sectionId)) return;
  update(id, (cur) => ({ ...cur, sectionsRead: [...cur.sectionsRead, sectionId] }));
}

export const getLastPosition = () => readKey<LastPosition | null>(LAST_KEY, null);

/** Opening a chapter passes no section, and that must not wipe the saved one. */
export function setLastPosition(chapterId: string, sectionId?: string, blockId?: string): void {
  const cur = getLastPosition();
  if (cur && cur.chapterId === chapterId && (sectionId === undefined || (cur.sectionId === sectionId && cur.blockId === blockId))) return;
  writeKey<LastPosition>(LAST_KEY, { chapterId, sectionId, blockId, at: Date.now() });
}

export function useLastPosition(): LastPosition | null {
  return useStored<LastPosition | null>(LAST_KEY, null);
}

export function recordWidget(chapterId: string, widgetKey: string, verdict: string): void {
  update(chapterId, (p) => ({ ...p, widgets: { ...p.widgets, [widgetKey]: verdict } }));
}

export function recordQuiz(chapterId: string, quizId: string, choice: number, correct: boolean): void {
  update(chapterId, (p) => ({ ...p, quiz: { ...p.quiz, [quizId]: { choice, correct, at: Date.now() } } }));
  recordQuizResult(quizId, correct);
}

export function clearQuiz(chapterId: string, quizId: string): void {
  update(chapterId, (p) => {
    const quiz = { ...p.quiz };
    delete quiz[quizId];
    return { ...p, quiz };
  });
}

export function toggleLabStep(chapterId: string, step: number): void {
  update(chapterId, (p) => ({
    ...p,
    labDone: p.labDone.includes(step) ? p.labDone.filter((s) => s !== step) : [...p.labDone, step],
  }));
}

export function setStepDone(chapterId: string, stepId: string, done: boolean): void {
  update(chapterId, (p) => {
    const steps = { ...(p.steps ?? {}) };
    if (done) steps[stepId] = true;
    else delete steps[stepId];
    return { ...p, steps };
  });
}

export function setCompleted(chapterId: string, completed: boolean): void {
  update(chapterId, (p) => ({ ...p, completed }));
}

/** Fraction 0..1 of sections read, or 1 when the chapter is marked complete. */
export function chapterFraction(p: ChapterProgress, sectionCount: number): number {
  if (p.completed) return 1;
  if (!sectionCount) return 0;
  return Math.min(1, p.sectionsRead.length / sectionCount);
}
