import { useState } from "react";
import { MotionConfig } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C07ThinkingDial.css";

type SetId = "lookup" | "recon";

// Illustrative figures, hand-authored for teaching. They are not measurements of any real model.
const BUDGETS = [0, 2000, 4000, 8000, 16000];
const SETS: Record<SetId, { pass: number[]; used: number[] }> = {
  lookup: { pass: [96, 96, 97, 97, 97], used: [0, 400, 400, 400, 400] },
  recon: { pass: [52, 71, 86, 93, 94], used: [0, 900, 3400, 6200, 9800] },
};
const BASE_PENCE = 0.35;
const PENCE_PER_1K = 0.5;
const BASE_SECONDS = 1;
const TOKENS_PER_SECOND = 100;

type Scenario = { title: string; set: SetId; bar: number; maxSec: number; note: string };
const SCENARIOS: Scenario[] = [
  { title: "Supplier lookup on the portal", set: "lookup", bar: 95, maxSec: 3, note: "A supplier is waiting for the page." },
  { title: "Month-end statement reconciliation, overnight batch", set: "recon", bar: 90, maxSec: Infinity, note: "No one is waiting. A wrong balance means a payment error." },
  { title: "Statement reconciliation while a clerk waits", set: "recon", bar: 85, maxSec: 40, note: "The clerk will wait up to forty seconds." },
];

const label = (b: number) => (b === 0 ? "Off" : `${b / 1000}k`);
const stats = (set: SetId, i: number) => {
  const pass = SETS[set].pass[i];
  const used = SETS[set].used[i];
  const cost = BASE_PENCE + (used * PENCE_PER_1K) / 1000;
  const sec = BASE_SECONDS + used / TOKENS_PER_SECOND;
  return { pass, used, cost, sec, cps: cost / (pass / 100) };
};
const meets = (s: Scenario, i: number) => {
  const st = stats(s.set, i);
  return st.pass >= s.bar && st.sec <= s.maxSec;
};
const best = (s: Scenario) => BUDGETS.findIndex((_, i) => meets(s, i));

export default function C07ThinkingDial({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [round, setRound] = useState(0);
  const [idx, setIdx] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [resolved, setResolved] = useState<null | boolean>(null);
  const [score, setScore] = useState(0);

  const s = SCENARIOS[round];
  const answer = best(s);
  const st = stats(s.set, idx);
  const last = round === SCENARIOS.length - 1;

  const lock = () => {
    if (resolved !== null) return;
    const n = attempts + 1;
    setAttempts(n);
    const ok = idx === answer;
    if (ok) {
      setResolved(true);
      setHint(null);
      const next = score + 1;
      setScore(next);
      if (last) complete(`${next} of ${SCENARIOS.length} budgets right`);
    } else if (n >= 2) {
      setResolved(false);
      setHint(null);
      if (last) complete(`${score} of ${SCENARIOS.length} budgets right`);
    } else {
      const m = stats(s.set, idx);
      setHint(
        m.pass < s.bar
          ? "That budget misses the quality bar. Try again."
          : m.sec > s.maxSec
            ? "That budget is too slow for this path. Try again."
            : "That budget clears both limits, but a cheaper one does too. Try again.",
      );
    }
  };

  const next = () => {
    setRound(round + 1);
    setIdx(0);
    setAttempts(0);
    setHint(null);
    setResolved(null);
  };

  const chosen = stats(s.set, answer);

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel llm-thinking-dial">
        <p className="llm-thinking-dial-note">
          Illustrative figures. A fixed set of 100 Harbour cases. Case {round + 1} of {SCENARIOS.length}.
        </p>
        <div className="w-inset">
          <b>{s.title}</b>
          <div className="llm-thinking-dial-note">
            {s.note} Quality bar: <span className="w-mono">{s.bar} of 100 right</span>.{" "}
            {Number.isFinite(s.maxSec) ? (
              <>
                Time limit: <span className="w-mono">{s.maxSec} seconds</span>.
              </>
            ) : (
              "No time limit."
            )}
          </div>
        </div>

        <label className="llm-thinking-dial-ctl">
          <span className="llm-thinking-dial-lab">
            Thinking budget <b className="w-mono">{BUDGETS[idx] === 0 ? "off" : `${BUDGETS[idx].toLocaleString("en-GB")} tokens`}</b>
          </span>
          <input
            type="range"
            min={0}
            max={BUDGETS.length - 1}
            step={1}
            value={idx}
            disabled={resolved !== null}
            aria-valuetext={BUDGETS[idx] === 0 ? "Thinking off" : `${BUDGETS[idx]} tokens`}
            onChange={(e) => {
              setIdx(Number(e.target.value));
              setHint(null);
            }}
          />
        </label>

        <svg viewBox="0 0 300 90" className="llm-thinking-dial-svg" role="img" aria-label={`Pass rate by budget. At ${label(BUDGETS[idx])} budget, ${st.pass} of 100 pass. The bar is ${s.bar}.`}>
          {BUDGETS.map((b, i) => {
            const p = SETS[s.set].pass[i];
            const h = ((p - 40) / 60) * 60;
            return (
              <g key={b}>
                <rect x={12 + i * 58} y={70 - h} width="40" height={h} rx="4" className={i === idx ? "llm-thinking-dial-bar on" : "llm-thinking-dial-bar"} />
                <text x={32 + i * 58} y="84" textAnchor="middle" className="llm-thinking-dial-tick">
                  {label(b)}
                </text>
                <text x={32 + i * 58} y={66 - h} textAnchor="middle" className="llm-thinking-dial-tick">
                  {p}
                </text>
              </g>
            );
          })}
          <line x1="0" x2="300" y1={70 - ((s.bar - 40) / 60) * 60} y2={70 - ((s.bar - 40) / 60) * 60} className="llm-thinking-dial-barline" />
        </svg>
        <p className="llm-thinking-dial-note">The scale starts at 40 right. The dark line is your quality bar.</p>

        <div className="llm-thinking-dial-facts w-mono">
          <span className={st.pass >= s.bar ? "ok" : "no"}>{st.pass} of 100 right</span>
          <span className={st.sec <= s.maxSec ? "ok" : "no"}>{st.sec.toFixed(1)} seconds</span>
          <span>{st.used.toLocaleString("en-GB")} tokens used</span>
          <span>{st.cost.toFixed(2)} pence per call</span>
          <span>{st.cps.toFixed(2)} pence per success</span>
        </div>

        <div className="w-row">
          <button type="button" className="w-btn" disabled={resolved !== null} onClick={lock}>
            Lock in this budget
          </button>
          {resolved !== null && !last && (
            <button type="button" className="w-btn" onClick={next}>
              Next case
            </button>
          )}
        </div>

        {hint && (
          <div className="w-verdict bad" role="status">
            {hint}
          </div>
        )}
        {resolved !== null && (
          <div className={`w-verdict ${resolved ? "good" : "bad"}`} role="status">
            {resolved ? "Correct. " : `The cheapest budget that meets both limits is ${answer === 0 ? "reasoning off" : `${BUDGETS[answer].toLocaleString("en-GB")} tokens`}. `}
            It gets {chosen.pass} of 100 right in {chosen.sec.toFixed(1)} seconds for {chosen.cost.toFixed(2)} pence a call. Pick the first budget that clears the bar and the time limit.
            {last && ` You got ${score} of ${SCENARIOS.length}.`}
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
