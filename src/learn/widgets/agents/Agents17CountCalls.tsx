import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents17CountCalls.css";

const NOTE = "Predict the total model calls for each team. Count the supervisor's model calls, then add each worker's. Predict before you pick.";
const CASES: { state: string; show?: string; options: string[]; answer: number; why: string }[] = [
  {
    "state": "One ReAct agent with all three PEP tools answers the walrus question, as in chapter 11.",
    "options": [
      "3",
      "7",
      "8",
      "10"
    ],
    "answer": 0,
    "why": "Two tool calls and one answer make three model calls."
  },
  {
    "state": "A flat team: researcher (3 calls), version checker (2), writer (1). The supervisor calls each, then answers.",
    "options": [
      "4",
      "8",
      "10",
      "12"
    ],
    "answer": 2,
    "why": "The supervisor makes 4 calls. The workers make 3, 2 and 1. The total is 10."
  },
  {
    "state": "The same team, but the supervisor writes the final answer itself and there is no writer.",
    "options": [
      "7",
      "8",
      "10",
      "3"
    ],
    "answer": 1,
    "why": "The supervisor makes 3 calls. The researcher makes 3 and the checker 2. The total is 8."
  },
  {
    "state": "A research desk (its own supervisor, 3 calls) over the researcher and checker, plus the writer. The top supervisor makes 3 calls.",
    "options": [
      "10",
      "11",
      "12",
      "9"
    ],
    "answer": 2,
    "why": "Top 3, desk 3, researcher 3, checker 2 and writer 1 make 12."
  },
  {
    "state": "The researcher repeats a call and stops after 2 calls with no answer. The checker still works and the supervisor answers without a writer.",
    "options": [
      "7",
      "8",
      "5",
      "10"
    ],
    "answer": 0,
    "why": "The supervisor makes 3 calls, the researcher 2 and the checker 2. The total is 7."
  }
];

export default function Agents17CountCalls({ onComplete }: WidgetProps) {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [hits, setHits] = useState(0);
  const [done, setDone] = useState(false);
  const complete = useComplete(onComplete);
  const c = CASES[i];
  const right = pick === c.answer;

  function choose(n: number) {
    if (pick !== null) return;
    setPick(n);
    if (n === c.answer) setHits((h) => h + 1);
  }
  function next() {
    if (i + 1 < CASES.length) {
      setI(i + 1);
      setPick(null);
    } else {
      setDone(true);
      complete(`${hits} of ${CASES.length} matched`);
    }
  }

  return (
    <div className="w-panel agents17-count-calls">
      <p className="agents17-count-calls-note">{NOTE}</p>
      {!done && (
        <fieldset className="agents17-count-calls-card">
          <legend className="agents17-count-calls-legend">Case {i + 1} of {CASES.length}</legend>
          <p className="agents17-count-calls-state">{c.state}</p>
          {c.show && <pre className="agents17-count-calls-show">{c.show}</pre>}
          <div className="agents17-count-calls-opts" role="radiogroup" aria-label="Your choice">
            {c.options.map((o, n) => (
              <label key={o} className={`agents17-count-calls-opt${pick === n ? " on" : ""}`}>
                <input type="radio" name="agents17-count-calls" checked={pick === n} disabled={pick !== null} onChange={() => choose(n)} />
                <span>{o}</span>
              </label>
            ))}
          </div>
          {pick !== null && (
            <p className={`w-verdict ${right ? "good" : "bad"}`} role="status">
              {right ? "Matched. " : `Better fit: ${c.options[c.answer]}. `}
              {c.why}
            </p>
          )}
          {pick !== null && (
            <div className="w-row">
              <button type="button" className="w-btn primary" onClick={next}>
                {i + 1 < CASES.length ? "Next case" : "See my score"}
              </button>
            </div>
          )}
        </fieldset>
      )}
      {done && (
        <div className={`w-verdict ${hits >= CASES.length - 1 ? "good" : "bad"}`} role="status">
          You matched {hits} of {CASES.length}. The supervisor's own count is only part of the cost. Add every model.
        </div>
      )}
      {done && (
        <div className="w-row">
          <button type="button" className="w-btn ghost" onClick={() => { setI(0); setPick(null); setHits(0); setDone(false); }}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
