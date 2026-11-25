import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents15LatencyCost.css";

type Guess = "slowest" | "average" | "total";

const COUNTS = [2, 3, 4, 6];
const SLOW = [1, 3, 5];
const GUESSES: { id: Guess; label: string }[] = [
  { id: "slowest", label: "About as long as the slowest sub-question" },
  { id: "average", label: "About the total divided by the number of sub-questions" },
  { id: "total", label: "About the same as running them in order" },
];

export default function Agents15LatencyCost({ onComplete }: WidgetProps) {
  const [n, setN] = useState(3);
  const [slow, setSlow] = useState(1);
  const [guess, setGuess] = useState<Guess | undefined>();
  const [attempts, setAttempts] = useState(0);
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);

  // Every part takes 2 seconds (two model calls of 1 second). The last part takes 2 x slow.
  const durations = Array.from({ length: n }, (_, i) => (i === n - 1 ? 2 * slow : 2));
  const seq = durations.reduce((a, b) => a + b, 0);
  const fan = Math.max(...durations);
  const calls = 1 + 2 * n;
  const right = guess === "slowest";

  const reset = () => {
    setGuess(undefined);
    setChecked(false);
    setAttempts(0);
  };

  return (
    <div className="w-panel agents15-latency-cost">
      <p className="agents15-latency-cost-note">Set up a fan-out. Predict its wall time before you check. Each model call takes one second.</p>
      <fieldset className="agents15-latency-cost-group">
        <legend className="agents15-latency-cost-legend">Number of sub-questions</legend>
        <div className="agents15-latency-cost-opts" role="radiogroup" aria-label="Number of sub-questions">
          {COUNTS.map((c) => (
            <label key={c} className={`agents15-latency-cost-opt${n === c ? " on" : ""}`}>
              <input type="radio" name="agents15-count" checked={n === c} onChange={() => { setN(c); reset(); }} />
              <span>{c} sub-questions</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="agents15-latency-cost-group">
        <legend className="agents15-latency-cost-legend">How slow the last sub-question is</legend>
        <div className="agents15-latency-cost-opts" role="radiogroup" aria-label="How slow the last sub-question is">
          {SLOW.map((s) => (
            <label key={s} className={`agents15-latency-cost-opt${slow === s ? " on" : ""}`}>
              <input type="radio" name="agents15-slow" checked={slow === s} onChange={() => { setSlow(s); reset(); }} />
              <span>{s === 1 ? "Same as the others" : `${s} times slower`}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="agents15-latency-cost-group">
        <legend className="agents15-latency-cost-legend">Your prediction: how long does the fan-out take?</legend>
        <div className="agents15-latency-cost-opts" role="radiogroup" aria-label="Your prediction">
          {GUESSES.map((g) => (
            <label key={g.id} className={`agents15-latency-cost-opt${guess === g.id ? " on" : ""}`}>
              <input type="radio" name="agents15-guess" checked={guess === g.id} onChange={() => setGuess(g.id)} />
              <span>{g.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="w-row">
        <button
          type="button"
          className="w-btn primary"
          disabled={!guess}
          onClick={() => {
            setChecked(true);
            const next = attempts + 1;
            setAttempts(next);
            if (right || next >= 2) complete(right ? "predicted the slowest sub-question" : "saw the slowest sub-question set the time");
          }}
        >
          Check my prediction
        </button>
      </div>
      {checked && (
        <>
          <div className="agents15-latency-cost-bars" aria-hidden="true">
            <div className="agents15-latency-cost-label">In order: {seq} seconds</div>
            <div className="agents15-latency-cost-seq">
              {durations.map((d, i) => (
                <span key={i} className={`agents15-latency-cost-bar seq${d > 2 ? " slow" : ""}`} style={{ width: `${(d / seq) * 100}%` }} />
              ))}
            </div>
            <div className="agents15-latency-cost-label">Fan-out: {fan} seconds</div>
            <div className="agents15-latency-cost-track">
              {durations.map((d, i) => (
                <span key={i} className={`agents15-latency-cost-bar${d > 2 ? " slow" : ""}`} style={{ width: `${(d / seq) * 100}%` }} />
              ))}
            </div>
          </div>
          <p className="agents15-latency-cost-facts" role="status">
            In order: {seq} seconds. Fan-out: {fan} seconds. Both make {calls} model calls: one split and {2 * n} worker calls.
          </p>
          <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
            {right ? "Right. " : "Not quite. "}
            The fan-out ends when its slowest sub-question ends. {slow > 1 ? "The slow sub-question now sets the whole wait, so the others finish early and idle. " : ""}
            The call count is the same in both runs, so you save time and spend the same. The shared timeout caps the wait for a slow sub-question.
          </div>
        </>
      )}
    </div>
  );
}
