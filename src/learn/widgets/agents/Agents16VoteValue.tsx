import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents16VoteValue.css";

function choose(n: number, k: number): number {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

// Worst case: every wrong voter picks the same rival answer. A tie counts as half a win.
export function majority(n: number, p: number): number {
  let acc = 0;
  for (let k = 0; k <= n; k++) {
    const pr = choose(n, k) * p ** k * (1 - p) ** (n - k);
    acc += k * 2 > n ? pr : k * 2 === n ? pr / 2 : 0;
  }
  return acc;
}

export function accuracy(n: number, p: number, rho: number): number {
  return rho * p + (1 - rho) * majority(n, p);
}

const GUESSES = [
  { v: "better", label: "Much better than one vote" },
  { v: "same", label: "The same as one vote" },
  { v: "worse", label: "Worse than one vote" },
];

export default function Agents16VoteValue({ onComplete }: WidgetProps) {
  const [guess, setGuess] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [n, setN] = useState(9);
  const [p, setP] = useState(70);
  const [rho, setRho] = useState(100);
  const complete = useComplete(onComplete);
  const acc = accuracy(n, p / 100, rho / 100) * 100;
  const gain = acc - p;

  return (
    <div className="w-panel agents16-vote-value">
      <p className="agents16-vote-value-note">
        Predict first. One vote is right 70% of the time. You run 9 votes, and all nine copies share the same blind spot, so the correlation is 100%. What do 9 votes give?
      </p>
      <div className="w-stack" role="radiogroup" aria-label="Your prediction">
        {GUESSES.map((g) => (
          <label key={g.v} className={`agents16-vote-value-opt${guess === g.v ? " on" : ""}`}>
            <input type="radio" name="agents16-vote-value" checked={guess === g.v} disabled={revealed} onChange={() => setGuess(g.v)} />
            <span>{g.label}</span>
          </label>
        ))}
      </div>
      {!revealed && (
        <div className="w-row">
          <button
            type="button"
            className="w-btn primary"
            disabled={!guess}
            onClick={() => {
              setRevealed(true);
              setN(9);
              setP(70);
              setRho(100);
              complete(guess === "same" ? "predicted the correlated case" : "missed the correlated case");
            }}
          >
            Reveal
          </button>
        </div>
      )}
      {revealed && (
        <>
          <p className={`agents16-vote-value-hit ${guess === "same" ? "right" : "wrong"}`} role="status">
            {guess === "same" ? "Matched. " : "The answer is the same as one vote. "}
            With full correlation, nine copies are one draw repeated, so the majority is right exactly when that one draw is. Now move the sliders and find where voting starts to pay.
          </p>
          <div className="agents16-vote-value-sliders">
            <label>
              <span>Voters (n): {n}</span>
              <input type="range" min={1} max={15} value={n} onChange={(e) => setN(Number(e.target.value))} />
            </label>
            <label>
              <span>One vote is right: {p}%</span>
              <input type="range" min={50} max={95} step={5} value={p} onChange={(e) => setP(Number(e.target.value))} />
            </label>
            <label>
              <span>Shared blind spot (correlation): {rho}%</span>
              <input type="range" min={0} max={100} step={10} value={rho} onChange={(e) => setRho(Number(e.target.value))} />
            </label>
          </div>
          <div className={`w-verdict ${gain >= 5 ? "good" : "bad"}`} role="status">
            {n} calls cost {n}x one call. Expected accuracy is {acc.toFixed(1)}%, a change of {gain >= 0 ? "+" : ""}
            {gain.toFixed(1)} points. Voting pays when votes are independent and one vote is right more often than not. Correlation removes the gain, and below 50% a majority makes things worse.
          </div>
        </>
      )}
    </div>
  );
}
