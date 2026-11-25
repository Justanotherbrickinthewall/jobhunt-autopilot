// Leitner deck over quiz blocks. Boxes 1 to 5, intervals 0, 1, 3, 7, 16 days.
import { readKey, writeKey } from "./storage.ts";

export const INTERVAL_DAYS = [0, 1, 3, 7, 16] as const;
export const DAY_MS = 86_400_000;

export type Card = { box: number; due: number; last: number };
export type Deck = Record<string, Card>;

const KEY = "fde:review";
export const EMPTY_DECK: Deck = {};
export const DECK_KEY = KEY;

export function getDeck(): Deck {
  return readKey<Deck>(KEY, EMPTY_DECK);
}

export function nextCard(box: number, now: number): Card {
  const b = Math.min(5, Math.max(1, box));
  return { box: b, due: now + INTERVAL_DAYS[b - 1] * DAY_MS, last: now };
}

/** Apply an answer. Right moves up one box. Wrong drops to box 1, due now. */
export function grade(card: Card | undefined, correct: boolean, now = Date.now()): Card {
  if (!correct) return nextCard(1, now);
  return nextCard((card?.box ?? 1) + 1, now);
}

/** Called from a chapter quiz. It only creates a card: right starts it in box 2, wrong in box 1. Only answerReview moves one. */
export function recordQuizResult(quizId: string, correct: boolean): void {
  const deck = getDeck();
  if (deck[quizId]) return;
  writeKey<Deck>(KEY, { ...deck, [quizId]: correct ? nextCard(2, Date.now()) : nextCard(1, Date.now()) });
}

export function answerReview(quizId: string, correct: boolean): void {
  const deck = getDeck();
  writeKey<Deck>(KEY, { ...deck, [quizId]: grade(deck[quizId], correct) });
}

export type DeckEntry = { id: string; card: Card | null };

/** Quizzes that have a card and whose card is due, oldest first. A quiz with no card is not due. */
export function dueIds(quizIds: string[], deck: Deck, now = Date.now()): string[] {
  return quizIds
    .filter((id) => deck[id] && deck[id].due <= now)
    .sort((a, b) => (deck[a]?.due ?? 0) - (deck[b]?.due ?? 0));
}

export function boxCounts(quizIds: string[], deck: Deck): number[] {
  const counts = [0, 0, 0, 0, 0];
  for (const id of quizIds) counts[(deck[id]?.box ?? 1) - 1]++;
  return counts;
}

/**
 * Cards whose due time has passed. The app rail imports this, so it reads the deck only and pulls in no chapter content.
 * dueCountExact gives the same number, apart from cards whose quiz has been deleted.
 */
export function dueCount(now = Date.now()): number {
  try {
    return Object.values(getDeck()).filter((c) => typeof c?.due === "number" && c.due <= now).length;
  } catch {
    return 0;
  }
}

/** The count the Review page shows. It loads the course content on first call, so call it after idle. */
export async function dueCountExact(): Promise<number> {
  try {
    const [{ allQuizzes }, { getChapterProgress }] = await Promise.all([import("../content/courses.ts"), import("./progress.ts")]);
    const opened = allQuizzes.filter((q) => getChapterProgress(q.chapterId).opened).map((q) => q.id);
    return dueIds(opened, getDeck()).length;
  } catch {
    return dueCount();
  }
}
