import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents17PickShape.css";

const NOTE = "Choose the design for each desk question. Predict before you pick.";
const CASES: { state: string; show?: string; options: string[]; answer: number; why: string }[] = [
  {
    "state": "Every refund checks the order, then the policy, then pays. The order never changes.",
    "options": [
      "Deterministic workflow",
      "Plan-and-execute",
      "Supervisor"
    ],
    "answer": 0,
    "why": "The order is known and money moves. Code should own the route, as in chapter 12's deterministic workflow."
  },
  {
    "state": "A long report with a dozen sections. The model can list them first, and the list rarely changes once written.",
    "options": [
      "Deterministic workflow",
      "Plan-and-execute",
      "Supervisor"
    ],
    "answer": 1,
    "why": "A plan written once and worked step by step fits open but stable steps, as in chapter 13."
  },
  {
    "state": "A support question where the next worker depends on what the last one found: sometimes a PEP lookup, sometimes a version check, sometimes both.",
    "options": [
      "Deterministic workflow",
      "Plan-and-execute",
      "Supervisor"
    ],
    "answer": 2,
    "why": "The next job depends on the last result, and the jobs need different tools. The supervisor picks again after every result."
  },
  {
    "state": "A fixed pipeline that always searches, then ranks, then cites.",
    "options": [
      "Deterministic workflow",
      "Plan-and-execute",
      "Supervisor"
    ],
    "answer": 0,
    "why": "Nothing needs a model to pick the order. A supervisor would add a call on every hop for no gain."
  }
];

export default function Agents17PickShape({ onComplete }: WidgetProps) {
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
    <div className="w-panel agents17-pick-shape">
      <p className="agents17-pick-shape-note">{NOTE}</p>
      {!done && (
        <fieldset className="agents17-pick-shape-card">
          <legend className="agents17-pick-shape-legend">Case {i + 1} of {CASES.length}</legend>
          <p className="agents17-pick-shape-state">{c.state}</p>
          {c.show && <pre className="agents17-pick-shape-show">{c.show}</pre>}
          <div className="agents17-pick-shape-opts" role="radiogroup" aria-label="Your choice">
            {c.options.map((o, n) => (
              <label key={o} className={`agents17-pick-shape-opt${pick === n ? " on" : ""}`}>
                <input type="radio" name="agents17-pick-shape" checked={pick === n} disabled={pick !== null} onChange={() => choose(n)} />
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
          You matched {hits} of {CASES.length}. Ask who should pick the next step, and whether the order is known.
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
