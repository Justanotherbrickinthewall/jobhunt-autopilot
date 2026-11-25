import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Evals04ScoreReader.css";

// Illustrative figures. The runs, the passages and the scores are made up for the exercise. Each pattern
// follows the rules in the chapter: low recall points at retrieval, low relevancy at focus, and a claim
// from outside the passages is caught by Grounded when faithfulness lets it through as borderline.

const THRESHOLD = 0.7;

type Fault = "retrieval" | "claims" | "focus" | "none";
type Scores = { grounded: number; faithfulness: number; relevancy: number; recall: number };
type Run = {
  title: string;
  question: string;
  passage: string;
  deskAnswer: string;
  reference: string;
  scores: Scores;
  fault: Fault;
  why: string;
};

const METRICS: { key: keyof Scores; label: string }[] = [
  { key: "grounded", label: "Grounded" },
  { key: "faithfulness", label: "Faithfulness" },
  { key: "relevancy", label: "Answer relevancy" },
  { key: "recall", label: "Contextual recall" },
];

const OPTIONS: { id: Fault; label: string }[] = [
  { id: "retrieval", label: "The retriever. The evidence the reference answer needs did not reach the desk." },
  { id: "claims", label: "The writer's claims. The answer says something the cited passage does not support." },
  { id: "focus", label: "The writer's focus. The answer is supported, but it answers another question." },
  { id: "none", label: "No fault. Every metric passes." },
];

const RUNS: Run[] = [
  {
    title: "Run 1",
    question: "What line length does PEP 8 recommend for docstrings and comments?",
    passage: "Limit all lines to a maximum of 79 characters.",
    deskAnswer: "PEP 8 limits code lines to 79 characters [1]. The passage does not say what it recommends for docstrings.",
    reference: "72 characters.",
    scores: { grounded: 0.8, faithfulness: 0.95, relevancy: 0.75, recall: 0.2 },
    fault: "retrieval",
    why: "The answer rests on what it was given, and it admits the gap. The reference answer, 72 characters, appears nowhere in the passage, so recall is low. The passage that holds it never reached the writer. Fix retrieval, chunking or the query.",
  },
  {
    title: "Run 2",
    question: "How do I annotate a function that returns nothing?",
    passage: "A function that returns nothing gets None as its return annotation. PEP 484 introduced type hints in Python 3.5.",
    deskAnswer: "PEP 484 introduced type hints in Python 3.5 [1].",
    reference: "Write None as the return type.",
    scores: { grounded: 0.5, faithfulness: 0.95, relevancy: 0.2, recall: 0.9 },
    fault: "focus",
    why: "Every claim is supported, and the passage holds the answer, so faithfulness and recall are high. Relevancy is low because the answer is about another question. Grounded drops too, because its third step penalises drift. Look at the writer's prompt and at how the question reaches it.",
  },
  {
    title: "Run 3",
    question: "Which Python version added the walrus operator?",
    passage: "PEP 572 adds assignment expressions, written with the := operator. Python-Version: 3.8.",
    deskAnswer:
      "The walrus operator arrived in Python 3.8 through PEP 572 [1]. The argument over it also led Python's creator to step down as project leader.",
    reference: "Python 3.8, through PEP 572.",
    scores: { grounded: 0.35, faithfulness: 0.85, relevancy: 0.7, recall: 0.9 },
    fault: "claims",
    why: "The second sentence is true, and no cited passage says it. Faithfulness can give such a claim borderline, and borderline passes by default, so faithfulness stays high. Grounded penalises any claim the passage does not support. That is why the two sit side by side.",
  },
  {
    title: "Run 4",
    question: "What does PEP 634 add to Python?",
    passage: "PEP 8 recommends four spaces per indentation level.",
    deskAnswer: "PEP 634 adds the match statement, which compares a value against patterns and runs the first branch that fits [1].",
    reference: "Structural pattern matching, written as a match statement.",
    scores: { grounded: 0.2, faithfulness: 0.85, relevancy: 0.9, recall: 0.1 },
    fault: "retrieval",
    why: "Grounded and recall fail. Faithfulness passes, because the passage never contradicts the claim. The passage is about indentation, and recall is 0.1. The evidence never arrived, and the writer filled the gap from memory. Work stage by stage. Fix retrieval first, then check whether the writer still invents.",
  },
  {
    title: "Run 5",
    question: "How many spaces per indentation level does PEP 8 recommend?",
    passage: "Use 4 spaces per indentation level.",
    deskAnswer: "PEP 8 recommends four spaces per indentation level [1].",
    reference: "Four spaces per indentation level.",
    scores: { grounded: 0.92, faithfulness: 1, relevancy: 0.95, recall: 0.9 },
    fault: "none",
    why: "Every score is at or above 0.7, so nothing needs fixing. A run like this is the baseline you compare the others with.",
  },
];

export default function Evals04ScoreReader({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState<Fault | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const run = RUNS[index];
  const right = pick === run.fault;

  const check = () => {
    if (pick === null) return;
    const n = attempts + 1;
    setAttempts(n);
    if (pick === run.fault || n >= 2) {
      setResolved(true);
      if (pick === run.fault && n === 1) setFirstTry((k) => k + 1);
    }
  };

  const next = () => {
    if (index + 1 < RUNS.length) {
      setIndex(index + 1);
      setPick(null);
      setAttempts(0);
      setResolved(false);
    } else {
      setFinished(true);
      complete(`Predicted ${firstTry} of ${RUNS.length} runs on the first try`);
    }
  };

  return (
    <div className="w-panel evals04-score-reader">
      <div className="w-row between">
        <span className="w-label">{run.title}</span>
        <span className="evals04-score-reader-count">
          {index + 1} of {RUNS.length}
        </span>
      </div>

      <div className="evals04-score-reader-scene">
        <p>
          <strong>Question.</strong> {run.question}
        </p>
        <p>
          <strong>Cited passage.</strong> {run.passage}
        </p>
        <p>
          <strong>Desk answer.</strong> {run.deskAnswer}
        </p>
        <p>
          <strong>Reference answer.</strong> {run.reference}
        </p>
      </div>

      <div className="evals04-score-reader-bars" role="list" aria-label="Metric scores">
        {METRICS.map((m) => {
          const value = run.scores[m.key];
          const pass = value >= THRESHOLD;
          return (
            <div key={m.key} className="evals04-score-reader-row" role="listitem">
              <span className="evals04-score-reader-name">{m.label}</span>
              <span className="evals04-score-reader-track" aria-hidden="true">
                <span className={`evals04-score-reader-fill ${pass ? "pass" : "fail"}`} style={{ width: `${Math.round(value * 100)}%` }} />
                <span className="evals04-score-reader-mark" />
              </span>
              <span className={`evals04-score-reader-value ${pass ? "pass" : "fail"}`}>
                {value.toFixed(2)} {pass ? "pass" : "fail"}
              </span>
            </div>
          );
        })}
      </div>
      <p className="evals04-score-reader-note">Illustrative figures. The mark on each bar is the 0.7 threshold.</p>

      <div className="evals04-score-reader-group" role="radiogroup" aria-label="Your prediction">
        <span className="w-label">Predict: where does the fault lie?</span>
        <div className="evals04-score-reader-opts">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={pick === o.id}
              className={`evals04-score-reader-opt${pick === o.id ? " on" : ""}`}
              disabled={resolved}
              onClick={() => setPick(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-row">
        {!resolved && (
          <button type="button" className="w-btn primary" disabled={pick === null} onClick={check}>
            Check my prediction
          </button>
        )}
        {resolved && !finished && (
          <button type="button" className="w-btn ghost" onClick={next}>
            {index + 1 < RUNS.length ? "Next run" : "Finish"}
          </button>
        )}
      </div>

      {attempts > 0 && !resolved && (
        <div className="w-verdict bad" role="status">
          Not quite. Look at which scores fail, and ask which stage of the desk each one measures. Then pick again.
        </div>
      )}

      {resolved && (
        <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
          <strong>{right ? "Correct. " : "Not quite. "}</strong>
          {run.why}
        </div>
      )}

      {finished && (
        <div className="w-verdict good" role="status">
          You predicted {firstTry} of {RUNS.length} runs on the first try. The rule: read the scores together, and start at the earliest stage that failed.
        </div>
      )}
    </div>
  );
}
