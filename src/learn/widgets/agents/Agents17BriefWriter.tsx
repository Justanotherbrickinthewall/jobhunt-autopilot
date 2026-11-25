import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents17BriefWriter.css";

const NOTE = "Pick the task the supervisor sends. The worker sees that string and nothing else. Predict before you pick.";
const CASES: { state: string; show?: string; options: string[]; answer: number; why: string }[] = [
  {
    "state": "The researcher must read the walrus PEP's history.",
    "options": [
      "Look into it.",
      "Find the PEP for the walrus operator and read its history section.",
      "Here is the whole conversation so far. Carry on."
    ],
    "answer": 1,
    "why": "The task names the PEP topic and the section. The vague one leaves the researcher guessing, and the pasted history carries pages the worker does not need."
  },
  {
    "state": "The version checker must find one version.",
    "options": [
      "Which Python version added the walrus operator?",
      "Check the version.",
      "Here are the researcher's notes and the user's full question. Find any version."
    ],
    "answer": 0,
    "why": "One feature name is all the checker needs, because its tool takes a feature. Anything more adds noise."
  },
  {
    "state": "The writer has no tools. The supervisor holds the facts.",
    "options": [
      "Write the answer.",
      "Write one sentence: the walrus operator came in 3.8 through PEP 572, after a bitter debate.",
      "Write the answer from your own knowledge of Python."
    ],
    "answer": 1,
    "why": "The writer starts empty. The facts must travel inside the task, or it writes from nothing."
  }
];

export default function Agents17BriefWriter({ onComplete }: WidgetProps) {
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
    <div className="w-panel agents17-brief-writer">
      <p className="agents17-brief-writer-note">{NOTE}</p>
      {!done && (
        <fieldset className="agents17-brief-writer-card">
          <legend className="agents17-brief-writer-legend">Case {i + 1} of {CASES.length}</legend>
          <p className="agents17-brief-writer-state">{c.state}</p>
          {c.show && <pre className="agents17-brief-writer-show">{c.show}</pre>}
          <div className="agents17-brief-writer-opts" role="radiogroup" aria-label="Your choice">
            {c.options.map((o, n) => (
              <label key={o} className={`agents17-brief-writer-opt${pick === n ? " on" : ""}`}>
                <input type="radio" name="agents17-brief-writer" checked={pick === n} disabled={pick !== null} onChange={() => choose(n)} />
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
          You matched {hits} of {CASES.length}. Good briefs name the job and carry the facts. A thin one starves the worker and a pasted history defeats context isolation.
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
