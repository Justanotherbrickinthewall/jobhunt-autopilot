import { useState } from "react";
import { MotionConfig } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C03RepairLoop.css";

type Out = "ok" | "syntax" | "schema" | "business" | "refusal" | "truncated";
type Status = "ok" | "review" | "failed";
// Illustrative scripted model answers, one list per case.
const CASES: { name: string; script: Out[] }[] = [
  { name: "A. Prose around the JSON, then clean", script: ["syntax", "ok"] },
  { name: "B. Total wrong three times, right on the fourth", script: ["business", "business", "business", "ok"] },
  { name: "C. The model refuses", script: ["refusal", "ok"] },
  { name: "D. Output cut off at the token limit", script: ["truncated", "ok"] },
  { name: "E. A required field missing every time", script: ["schema", "schema", "schema", "schema"] },
];

function run(script: Out[], cap: number): { status: Status; attempts: number } {
  for (let n = 1; n <= cap; n++) {
    const out = script[Math.min(n - 1, script.length - 1)];
    if (out === "ok") return { status: "ok", attempts: n };
    if (out === "refusal") return { status: "review", attempts: n };
    if (out === "truncated") return { status: "failed", attempts: n };
  }
  return { status: "review", attempts: cap };
}

const STATUSES: Status[] = ["ok", "review", "failed"];

export default function C03RepairLoop({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [cap, setCap] = useState(3);
  const [guess, setGuess] = useState<Record<number, Status>>({});
  const [ran, setRan] = useState(false);
  const [runs, setRuns] = useState(0);

  const results = CASES.map((c) => run(c.script, cap));
  const score = CASES.filter((_, i) => guess[i] === results[i].status).length;
  const ready = CASES.every((_, i) => guess[i]);

  const go = () => {
    setRan(true);
    const n = runs + 1;
    setRuns(n);
    if (score === CASES.length) complete(`${score} of ${CASES.length} predicted`);
    else if (n >= 2) complete(`${score} of ${CASES.length} predicted on the second attempt, explanation shown`);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel llm-repair-loop">
        <p className="w-label">Illustrative scripts</p>
        <label className="llm-repair-loop-cap">
          <span className="w-label">Attempt cap: {cap}</span>
          <input type="range" min={1} max={4} step={1} value={cap} disabled={ran} onChange={(e) => { setCap(Number(e.target.value)); setGuess({}); }} />
        </label>
        <p>Each retry sends the original prompt plus the error messages only. Predict how each case ends.</p>
        <ul className="llm-repair-loop-list">
          {CASES.map((c, i) => (
            <li key={c.name} className="llm-repair-loop-row">
              <div>
                <strong>{c.name}</strong>
                <div className="w-mono llm-repair-loop-script">{c.script.join(" , ")}</div>
              </div>
              <div className="w-row" role="radiogroup" aria-label={`Outcome for ${c.name}`}>
                {STATUSES.map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={guess[i] === s} disabled={ran} className={`w-chip${guess[i] === s ? " is-on" : ""}${ran && results[i].status === s ? " good" : ""}`} onClick={() => setGuess({ ...guess, [i]: s })}>
                    {s}
                  </button>
                ))}
              </div>
              {ran && <div className="llm-repair-loop-res">Ends {results[i].status} after {results[i].attempts} attempt{results[i].attempts > 1 ? "s" : ""}.</div>}
            </li>
          ))}
        </ul>
        {!ran ? (
          <button type="button" className="w-btn" disabled={!ready} onClick={go}>Run the loop</button>
        ) : (
          <>
            <div className={`w-verdict ${score >= 4 ? "good" : "bad"}`} role="status">
              {score} of {CASES.length} right. A refusal goes to review at once. A truncation fails at once, because the same request would be cut off again. Recoverable errors retry up to the cap, then go to review, and no field is ever filled in. Case B needs a cap of four to succeed, which costs one more model call.
            </div>
            <button type="button" className="w-btn ghost" onClick={() => { setRan(false); setGuess({}); }}>Try again</button>
          </>
        )}
      </div>
    </MotionConfig>
  );
}
