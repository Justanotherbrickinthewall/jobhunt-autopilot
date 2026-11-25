import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Evals03BiasFlip.css";

const PASS_MARK = 4;
const POSITION = 1; // points lost when the source that holds the answer is shown second
const LENGTH = 1; // points gained when the answer is padded

type Setup = { holdsFirst: boolean; padded: boolean };
type Round = { title: string; story: string; change: string; fair: number; before: Setup; after: Setup };

const ROUNDS: Round[] = [
  {
    title: "A strong answer, sources reversed",
    story: "The answer is correct and fully supported, so a fair reader scores it 5. The source that holds the answer is shown first.",
    change: "Reverse the order of the sources.",
    fair: 5,
    before: { holdsFirst: true, padded: false },
    after: { holdsFirst: false, padded: false },
  },
  {
    title: "A borderline answer, sources reversed",
    story: "The answer is correct with a small gap, so a fair reader scores it 4. The source that holds the answer is shown first.",
    change: "Reverse the order of the sources.",
    fair: 4,
    before: { holdsFirst: true, padded: false },
    after: { holdsFirst: false, padded: false },
  },
  {
    title: "A borderline answer that starts with its source second",
    story: "The answer is correct with a small gap, so a fair reader scores it 4. The source that holds the answer is shown second.",
    change: "Reverse the order of the sources.",
    fair: 4,
    before: { holdsFirst: false, padded: false },
    after: { holdsFirst: true, padded: false },
  },
  {
    title: "A weak answer, padded",
    story: "The answer is partly right, so a fair reader scores it 3. The source that holds the answer is shown first.",
    change: "Add the padding text to the end of the answer three times.",
    fair: 3,
    before: { holdsFirst: true, padded: false },
    after: { holdsFirst: true, padded: true },
  },
  {
    title: "A wrong answer, padded",
    story: "The answer is wrong, so a fair reader scores it 1. The source that holds the answer is shown first.",
    change: "Add the padding text to the end of the answer three times.",
    fair: 1,
    before: { holdsFirst: true, padded: false },
    after: { holdsFirst: true, padded: true },
  },
];

function score(r: Round, s: Setup) {
  const raw = r.fair - (s.holdsFirst ? 0 : POSITION) + (s.padded ? LENGTH : 0);
  return Math.min(5, Math.max(1, raw));
}

export default function Evals03BiasFlip({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<(boolean | null)[]>(ROUNDS.map(() => null));
  const [revealed, setRevealed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const outcomes = ROUNDS.map((r) => ({ b: score(r, r.before), a: score(r, r.after) }));
  const flips = outcomes.map((o) => (o.b >= PASS_MARK) !== (o.a >= PASS_MARK));
  const ready = picks.every((p) => p !== null);
  const correct = picks.filter((p, i) => p === flips[i]).length;

  const done = revealed && (correct === ROUNDS.length || attempt >= 2);

  const reveal = () => {
    const n = attempt + 1;
    setAttempt(n);
    setRevealed(true);
    if (correct === ROUNDS.length || n >= 2) complete(`${correct} of ${ROUNDS.length} flip predictions correct on attempt ${n}`);
  };

  const retry = () => {
    setPicks((ps) => ps.map((x, i) => (x === flips[i] ? x : null)));
    setRevealed(false);
  };

  const verdictWord = (n: number) => (n >= PASS_MARK ? "passes" : "fails");

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel evals03-bias-flip">
        <p className="evals03-bias-flip-hint">
          Illustrative figures. The scale runs from 1 to 5, and the pass mark is {PASS_MARK}. This judge has two habits. It takes {POSITION} point off the score when the source that holds the answer is shown second. It adds {LENGTH} point when the answer is padded. Scores stop at 1 and 5. A flip means the verdict changes between pass and fail.
        </p>
        {ROUNDS.map((r, i) => {
          const o = outcomes[i];
          return (
            <section key={r.title} className="evals03-bias-flip-card" aria-label={`Round ${i + 1}`}>
              <div className="w-label">{r.title}</div>
              <p className="evals03-bias-flip-story">{r.story}</p>
              <p className="evals03-bias-flip-change">
                <strong>Change:</strong> {r.change}
              </p>
              <div className="evals03-bias-flip-opts" role="radiogroup" aria-label={`Round ${i + 1} prediction`}>
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    role="radio"
                    aria-checked={picks[i] === v}
                    disabled={revealed || (attempt > 0 && picks[i] === flips[i])}
                    className={`w-chip evals03-bias-flip-opt${picks[i] === v ? " is-on" : ""}${done && v === flips[i] ? " good" : ""}`}
                    onClick={() => setPicks((ps) => ps.map((x, j) => (j === i ? v : x)))}
                  >
                    {v ? "The verdict flips" : "The verdict stays"}
                  </button>
                ))}
              </div>
              <AnimatePresence>
                {revealed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`evals03-bias-flip-fix ${picks[i] === flips[i] ? "ok" : "miss"}`}
                  >
                    {picks[i] === flips[i] ? "Correct. " : "Missed. "}
                    Before: score {o.b}, {verdictWord(o.b)}. After: score {o.a}, {verdictWord(o.a)}.
                    {!flips[i] && o.b !== o.a ? " The score moved and the verdict did not, so the check does not count it." : ""}
                  </motion.p>
                )}
              </AnimatePresence>
            </section>
          );
        })}
        {!revealed && (
          <button type="button" className="w-btn primary" disabled={!ready} onClick={reveal}>
            Check my predictions
          </button>
        )}
        {revealed && !done && (
          <button type="button" className="w-btn primary" onClick={retry}>
            Try the missed rounds again
          </button>
        )}
        {done && (
          <div className={`w-verdict ${correct >= 4 ? "good" : "bad"}`} role="status">
            {correct} of {ROUNDS.length} correct. The same habit flipped some verdicts and left others alone, because only answers near the pass mark can cross it. A clean result on clear-cut cases proves little, so test a judge on some borderline ones too.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
