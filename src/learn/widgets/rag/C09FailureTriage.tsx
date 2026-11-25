import { useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import "./C09FailureTriage.css";

const BUCKETS = [
  "Never retrieved",
  "Retrieved but ranked or cut too low",
  "Chunking broke the answer",
  "Model ignored the context",
  "Answer not in the corpus",
];

type Case = { q: string; facts: string[]; bucket: number; fix: string };
const CASES: Case[] = [
  {
    q: "What is the docstring line limit in PEP 8?",
    facts: ["The right chunk is in the index.", "Dense retrieval ranks it 34th.", "Only the top 5 chunks go to the model.", "The model says it does not know."],
    bucket: 1,
    fix: "Retrieve many, rerank few. Recall at 50 is fine, so a reranker or a larger final k fixes this.",
  },
  {
    q: "Does Python have a switch statement?",
    facts: ["The match statement chunks are in the index.", "Neither dense nor BM25 returns them in the top 100.", "The user said switch. The PEPs say match and pattern."],
    bucket: 0,
    fix: "A vocabulary gap. Query rewriting, HyDE or a hybrid index should pull the chunks in.",
  },
  {
    q: "Where does an assignment expression bind inside a comprehension?",
    facts: ["The scope rule is one sentence cut in two by the chunker.", "Both halves are retrieved, at ranks 3 and 4.", "Each half is incomplete. The model states half the rule."],
    bucket: 2,
    fix: "Change the chunking: larger chunks, overlap, or parent-child so the whole rule travels together.",
  },
  {
    q: "What is the maximum line length in PEP 8?",
    facts: ["The right chunk is rank 1 and is in the prompt.", "The chunk says 79.", "The model answers 80 and cites source 1."],
    bucket: 3,
    fix: "Retrieval is fine. Fix the generation step: a grounding prompt, a lower temperature, and a faithfulness check that catches it.",
  },
  {
    q: "Who maintains pip?",
    facts: ["No chunk in the index mentions pip maintainers.", "The best retrieval score is low for every candidate.", "The model names a team confidently."],
    bucket: 4,
    fix: "Nothing to retrieve. The system should have refused. Add a score gate and a refusal instruction, and keep unanswerable questions in the golden set.",
  },
  {
    q: "Can I reuse the same quote character inside an f-string?",
    facts: ["The PEP 701 chunk is rank 2 and is in the prompt.", "It says reuse is allowed.", "The answer says no, with no citation."],
    bucket: 3,
    fix: "The model answered from memory of the old behaviour. Require a citation on every claim and check faithfulness.",
  },
];

export default function C09FailureTriage({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<(number | null)[]>(CASES.map(() => null));
  const [revealed, setRevealed] = useState(false);
  const done = useRef(false);

  const ready = picks.every((p) => p !== null);
  const correct = picks.filter((p, i) => p === CASES[i].bucket).length;

  const reveal = () => {
    setRevealed(true);
    if (!done.current) {
      done.current = true;
      onComplete?.(`${correct} of ${CASES.length} failures triaged correctly`);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel c09-ft">
        <p className="c09-ft-hint">Each card is a failed question with the evidence an error analysis would pull from your logs. Sort every failure into the stage that broke first.</p>
        {CASES.map((c, i) => {
          const p = picks[i];
          const right = p === c.bucket;
          return (
            <section key={c.q} className="c09-ft-card" aria-label={`Failure ${i + 1}`}>
              <p className="c09-ft-q">{c.q}</p>
              <ul className="c09-ft-facts">
                {c.facts.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <div className="c09-ft-buckets" role="radiogroup" aria-label="Failure bucket">
                {BUCKETS.map((b, bi) => (
                  <button
                    key={b}
                    type="button"
                    role="radio"
                    aria-checked={p === bi}
                    disabled={revealed}
                    className={`w-chip c09-ft-bucket${p === bi ? " on" : ""}${revealed && bi === c.bucket ? " right" : ""}`}
                    onClick={() => setPicks((ps) => ps.map((x, j) => (j === i ? bi : x)))}
                  >
                    {b}
                  </button>
                ))}
              </div>
              <AnimatePresence>
                {revealed && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`c09-ft-fix ${right ? "ok" : "miss"}`}>
                    {right ? "Correct. " : `Missed: this is "${BUCKETS[c.bucket]}". `}
                    {c.fix}
                  </motion.p>
                )}
              </AnimatePresence>
            </section>
          );
        })}
        {!revealed && (
          <button type="button" className="w-btn primary" disabled={!ready} onClick={reveal}>
            Check my triage
          </button>
        )}
        {revealed && (
          <div className={`w-verdict ${correct >= 5 ? "good" : "bad"}`} role="status">
            {correct} of {CASES.length} correct. Triage tells you where to spend the week. Count the buckets across fifty real failures and fix the biggest one first. Two of these six were generation failures, which no amount of retrieval tuning would have touched.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
