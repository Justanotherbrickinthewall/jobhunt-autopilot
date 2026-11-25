import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C01SamplingDial.css";

// Illustrative figures: hand-set logits for the next word after "Invoice status:".
const TOKENS = [
  { t: "paid", logit: 3.0 },
  { t: "pending", logit: 2.4 },
  { t: "overdue", logit: 1.6 },
  { t: "disputed", logit: 0.9 },
  { t: "void", logit: 0.2 },
  { t: "banana", logit: -2.0 },
];

function dist(temp: number, topP: number) {
  const exps = TOKENS.map((k) => Math.exp(k.logit / temp));
  const sum = exps.reduce((a, b) => a + b, 0);
  const probs = exps.map((e) => e / sum);
  // Nucleus: smallest set of top tokens whose cumulative probability reaches topP.
  let cum = 0;
  const keep = TOKENS.map(() => false);
  for (let i = 0; i < probs.length; i++) {
    keep[i] = true;
    cum += probs[i];
    if (cum >= topP - 1e-9) break;
  }
  const kept = probs.reduce((a, p, i) => a + (keep[i] ? p : 0), 0);
  return TOKENS.map((k, i) => ({ ...k, p: probs[i], keep: keep[i], after: keep[i] ? probs[i] / kept : 0 }));
}

export default function C01SamplingDial({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [temp, setTemp] = useState(1);
  const [topP, setTopP] = useState(1);
  const [guess, setGuess] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const rows = dist(temp, topP);
  const alive = rows.filter((r) => r.keep).length;
  const truth = dist(0.5, 0.9).filter((r) => r.keep).length;

  const check = () => {
    setTemp(0.5);
    setTopP(0.9);
    setRevealed(true);
    const n = attempts + 1;
    setAttempts(n);
    if (guess === truth) complete("predicted correctly");
    else if (n >= 2) complete("predicted wrongly twice, explanation shown");
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel llm-sampling-dial">
        <p className="w-label">Illustrative figures</p>
        <p>
          Next word after <span className="w-mono">Invoice status:</span>. Predict first: at temperature 0.5 with top-p 0.9, how many words can the model still pick?
        </p>
        <div className="w-row" role="radiogroup" aria-label="Your prediction">
          {[1, 2, 3, 4, 6].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={guess === n} className={`w-chip${guess === n ? " is-on" : ""}`} disabled={revealed} onClick={() => setGuess(n)}>
              {n}
            </button>
          ))}
          <button type="button" className="w-btn" disabled={guess === null || revealed} onClick={check}>
            Set the dials and show me
          </button>
        </div>
        <div className="llm-sampling-dial-controls">
          <label>
            <span className="w-label">Temperature {temp.toFixed(1)}</span>
            <input type="range" min={0.2} max={2} step={0.1} value={temp} onChange={(e) => setTemp(Number(e.target.value))} />
          </label>
          <label>
            <span className="w-label">Top-p {topP.toFixed(2)}</span>
            <input type="range" min={0.3} max={1} step={0.05} value={topP} onChange={(e) => setTopP(Number(e.target.value))} />
          </label>
        </div>
        <ul className="llm-sampling-dial-bars">
          {rows.map((r) => (
            <li key={r.t} className={r.keep ? "on" : "off"}>
              <span className="w-mono llm-sampling-dial-name">{r.t}</span>
              <svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
                <rect width="100" height="10" rx="3" fill="var(--surface-2)" />
                <motion.rect height="10" rx="3" fill={r.keep ? "var(--accent)" : "var(--rose)"} initial={false} animate={{ width: 100 * (r.keep ? r.after : r.p) }} />
              </svg>
              <span className="w-mono llm-sampling-dial-num">{((r.keep ? r.after : r.p) * 100).toFixed(0)}%</span>
            </li>
          ))}
        </ul>
        <p className="llm-sampling-dial-note" aria-live="polite">
          {alive} of 6 words can be sampled. Grey rows are cut by top-p. Kept rows are renormalised to add up to 100%.
        </p>
        {revealed && (
          <div className={`w-verdict ${guess === truth ? "good" : "bad"}`} role="status">
            At temperature 0.5 the top word holds about 72% and the second about 22%, which is already 94%. Top-p 0.9 stops there, so {truth} words survive. You said {guess}. Now push temperature to 2 and watch banana become possible even with top-p at 1.
            {guess !== truth && attempts < 2 && (
              <> <button type="button" className="w-btn ghost" onClick={() => { setRevealed(false); setGuess(null); }}>Try again</button></>
            )}
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
