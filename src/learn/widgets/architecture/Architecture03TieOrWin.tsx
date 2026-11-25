import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Architecture03TieOrWin.css";

// Every number below is an illustrative figure for a golden set of 20 scored questions. None of them was
// measured. Recall is the partial-credit recall of compare_stacks, so one question moves it by 0.05 at most.
// The rule is a rule of thumb: a gap of two questions, 0.10, or less is a tie.

const QUESTIONS = 20;

type Option = { id: string; label: string };
type Case = {
  title: string;
  defaultRecall: number;
  candidateRecall: number;
  defaultMs: number;
  candidateMs: number;
  note: string;
  options: Option[];
  answer: string;
  why: string;
};

const CASES: Case[] = [
  {
    title: "Case 1: a small lead",
    defaultRecall: 0.8,
    candidateRecall: 0.85,
    defaultMs: 210,
    candidateMs: 190,
    note: "Both stacks cost about the same to run.",
    options: [
      { id: "win", label: "The candidate wins." },
      { id: "tie", label: "It is a tie." },
      { id: "lose", label: "The default wins." },
    ],
    answer: "tie",
    why: "The gap is 0.05, which is one question. That sits inside the noise of a 20 question set. Quality gives no reason to switch, so cost and operations decide.",
  },
  {
    title: "Case 2: a clear lead",
    defaultRecall: 0.7,
    candidateRecall: 0.85,
    defaultMs: 210,
    candidateMs: 230,
    note: "The candidate needs a new migration, a re-ingest and a new refusal threshold.",
    options: [
      { id: "win", label: "The candidate leads on quality." },
      { id: "tie", label: "It is a tie." },
      { id: "lose", label: "The default leads on quality." },
    ],
    answer: "win",
    why: "The gap is 0.15, which is three questions. That is past the two question rule. The ADR can argue for a switch, and it must count the migration, the re-ingest and the new threshold as the cost.",
  },
  {
    title: "Case 3: equal recall, different speed",
    defaultRecall: 0.8,
    candidateRecall: 0.8,
    defaultMs: 410,
    candidateMs: 190,
    note: "The latency budget for one retrieval call is 300 ms.",
    options: [
      { id: "recall", label: "The candidate wins on recall." },
      { id: "latency", label: "It is a tie on quality, so latency decides." },
      { id: "lose", label: "The default wins." },
    ],
    answer: "latency",
    why: "The recall is equal, so quality gives no reason either way. The default misses a 300 ms budget and the candidate meets it, so the speed decides. Check that the timings include the same network path for both.",
  },
  {
    title: "Case 4: a cheaper stack that misses more",
    defaultRecall: 0.85,
    candidateRecall: 0.65,
    defaultMs: 210,
    candidateMs: 180,
    note: "The candidate costs less for each question.",
    options: [
      { id: "switch", label: "Switch for the lower cost." },
      { id: "stay", label: "Stay on the default." },
      { id: "tie", label: "It is a tie." },
    ],
    answer: "stay",
    why: "The gap is 0.20, which is four questions, and it favours the default. A cheaper stack that misses four more questions out of 20 gives worse answers, and a lower price does not repay that.",
  },
];

const gapText = (a: number, b: number) => {
  const gap = Math.abs(a - b);
  const n = Math.round(gap * QUESTIONS);
  return `${gap.toFixed(2)}, which is ${n} ${n === 1 ? "question" : "questions"}`;
};

export default function Architecture03TieOrWin({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const c = CASES[index];
  const right = pick === c.answer;

  const check = () => {
    if (pick === null) return;
    const n = attempts + 1;
    setAttempts(n);
    if (pick === c.answer || n >= 2) {
      setResolved(true);
      if (pick === c.answer && n === 1) setFirstTry((k) => k + 1);
    }
  };

  const next = () => {
    if (index + 1 < CASES.length) {
      setIndex(index + 1);
      setPick(null);
      setAttempts(0);
      setResolved(false);
    } else {
      setFinished(true);
      complete(`Called ${firstTry} of ${CASES.length} comparisons on the first try`);
    }
  };

  return (
    <div className="w-panel architecture03-tie-or-win">
      <div className="w-row between">
        <span className="w-label">{c.title}</span>
        <span className="architecture03-tie-or-win-count">
          {index + 1} of {CASES.length}
        </span>
      </div>

      <span className="w-chip">Illustrative figures</span>

      <table className="architecture03-tie-or-win-table">
        <thead>
          <tr>
            <th scope="col">Stack</th>
            <th scope="col">Recall at 5</th>
            <th scope="col">Median call</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Default</th>
            <td>{c.defaultRecall.toFixed(2)}</td>
            <td>{c.defaultMs} ms</td>
          </tr>
          <tr>
            <th scope="row">Candidate</th>
            <td>{c.candidateRecall.toFixed(2)}</td>
            <td>{c.candidateMs} ms</td>
          </tr>
        </tbody>
      </table>
      <p className="architecture03-tie-or-win-note">{c.note}</p>

      <div className="architecture03-tie-or-win-group" role="radiogroup" aria-label="Your call">
        <span className="w-label">Predict: how do you read the gap in recall?</span>
        <div className="architecture03-tie-or-win-opts">
          {c.options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={pick === o.id}
              className={`architecture03-tie-or-win-opt${pick === o.id ? " on" : ""}`}
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
            Check my call
          </button>
        )}
        {resolved && !finished && (
          <button type="button" className="w-btn ghost" onClick={next}>
            {index + 1 < CASES.length ? "Next case" : "Finish"}
          </button>
        )}
      </div>

      {attempts > 0 && !resolved && (
        <div className="w-verdict bad" role="status">
          Not quite. Turn the gap in recall into a number of questions, then compare it with two.
        </div>
      )}

      {resolved && (
        <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
          <strong>{right ? "Correct. " : "Not quite. "}</strong>
          The gap in recall is {gapText(c.defaultRecall, c.candidateRecall)}. {c.why}
        </div>
      )}

      {finished && (
        <div className="w-verdict good" role="status">
          You called {firstTry} of {CASES.length} comparisons on the first try. The rule: two questions or fewer is a tie, and the other inputs settle a tie.
        </div>
      )}
    </div>
  );
}
