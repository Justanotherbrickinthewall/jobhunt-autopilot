import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Llmops05LabelBudget.css";

// Illustrative figures. The minutes per label are an assumption, not a measurement.
const Z2 = 1.96 * 1.96; // 95 percent confidence
const BAND2 = 2.8 * 2.8; // the noise band of evals-05, 1.4 times two standard errors

// Labels to measure a rate p within a margin m: N = 1.96 squared times p(1 - p) over m squared.
const rateLabels = (p: number, m: number) => Math.ceil((Z2 * p * (1 - p)) / (m * m) - 1e-9);

// Labels to see a failure at least once with a 95 percent chance: 0.05 = (1 - p) to the power N.
const rareLabels = (p: number) => Math.ceil(Math.log(0.05) / Math.log(1 - p) - 1e-9);

// Labels in each of two windows to see a rise of g points from p, by the noise band rule, with p at the midpoint.
const riseLabels = (p: number, g: number) => {
  const mid = p + g / 2;
  return Math.ceil((BAND2 * mid * (1 - mid)) / (g * g) - 1e-9);
};

const OPTIONS = ["24 labels", "100 labels", "385 labels", "1,000 labels"];
const RIGHT = 2;

const W = 320;
const BAR_W = 300;
const fmt = (n: number) => n.toLocaleString("en-GB");
const hours = (labels: number, minutes: number) => (labels * minutes) / 60;
const hoursText = (h: number) => (h < 10 ? h.toFixed(1) : Math.round(h).toString());

export default function Llmops05LabelBudget({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [pick, setPick] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [checked, setChecked] = useState(false);
  const [failPct, setFailPct] = useState(10);
  const [marginPts, setMarginPts] = useState(3);
  const [risePts, setRisePts] = useState(5);
  const [minutes, setMinutes] = useState(3);

  const done = checked && (pick === RIGHT || attempt >= 2);

  const check = () => {
    const tries = attempt + 1;
    setAttempt(tries);
    setChecked(true);
    if (pick === RIGHT || tries >= 2) {
      complete(pick === RIGHT ? `Sized the rate audit at 385 labels, on attempt ${tries}` : "Did not size the rate audit at 385 labels");
    }
  };

  const retry = () => {
    setChecked(false);
    setPick(null);
  };

  const p = failPct / 100;
  const rows = [
    { name: "Measure the rate", n: rateLabels(p, marginPts / 100) },
    { name: "See one failure at all", n: rareLabels(p) },
    { name: "See a rise between two windows", n: 2 * riseLabels(p, risePts / 100) },
  ];
  const biggest = Math.max(...rows.map((r) => r.n));

  return (
    <div className="w-panel llmops05-label-budget">
      <fieldset className="llmops05-label-budget-guess" disabled={checked}>
        <legend className="w-label">Predict first</legend>
        <p className="llmops05-label-budget-q">
          A team expects its judge to be wrong on about 10 percent of the traces it passes. How many passed traces must a
          person label to measure that rate to within 3 points, at 95 percent confidence?
        </p>
        <div className="llmops05-label-budget-opts" role="radiogroup" aria-label="Labels needed">
          {OPTIONS.map((o, i) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={pick === i}
              className={`llmops05-label-budget-opt${pick === i ? " on" : ""}`}
              onClick={() => setPick(i)}
            >
              {o}
            </button>
          ))}
        </div>
        {!checked && (
          <div className="w-row">
            <button type="button" className="w-btn" disabled={pick === null} onClick={check}>
              Check my prediction
            </button>
          </div>
        )}
      </fieldset>

      {checked && !done && (
        <div className="w-verdict bad" role="status">
          Not quite. The margin of a rate shrinks with the square root of the labels, so halving the margin needs four
          times the labels. Try once more.{" "}
          <button type="button" className="w-btn small" onClick={retry}>
            Try again
          </button>
        </div>
      )}

      {done && (
        <>
          <div className={`w-verdict ${pick === RIGHT ? "good" : "bad"}`} role="status">
            {pick === RIGHT ? "Right. " : "Not quite. "}
            The answer is 385. N is 3.84 times 0.10 times 0.90, divided by 0.03 squared, which is 384.2, so 385. Now change
            the inputs and read what three review jobs cost.
          </div>

          <div className="llmops05-label-budget-sliders">
            <label>
              <span className="w-label">Failure rate, {failPct} percent</span>
              <input type="range" min={1} max={40} step={1} value={failPct} onChange={(e) => setFailPct(Number(e.target.value))} />
            </label>
            <label>
              <span className="w-label">Margin, {marginPts} points</span>
              <input type="range" min={2} max={10} step={1} value={marginPts} onChange={(e) => setMarginPts(Number(e.target.value))} />
            </label>
            <label>
              <span className="w-label">Rise to see, {risePts} points</span>
              <input type="range" min={2} max={10} step={1} value={risePts} onChange={(e) => setRisePts(Number(e.target.value))} />
            </label>
            <label>
              <span className="w-label">Minutes per label, {minutes}</span>
              <input type="range" min={1} max={10} step={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
            </label>
          </div>

          <svg
            className="llmops05-label-budget-chart"
            viewBox={`0 0 ${W} 150`}
            role="img"
            aria-label={rows.map((r) => `${r.name}: ${fmt(r.n)} labels, ${hoursText(hours(r.n, minutes))} hours`).join(". ")}
          >
            {rows.map((r, i) => {
              const y = 6 + i * 48;
              return (
                <g key={r.name}>
                  <text x={0} y={y + 11} className="llmops05-label-budget-text">
                    {r.name}
                  </text>
                  <text x={W} y={y + 11} textAnchor="end" className="llmops05-label-budget-text mono">
                    {fmt(r.n)} labels, {hoursText(hours(r.n, minutes))} h
                  </text>
                  <rect x={0} y={y + 18} width={BAR_W} height={12} rx={3} className="llmops05-label-budget-track" />
                  <rect x={0} y={y + 18} width={Math.max(3, (BAR_W * r.n) / biggest)} height={12} rx={3} className="llmops05-label-budget-bar" />
                </g>
              );
            })}
          </svg>

          <p className="llmops05-label-budget-foot">
            Illustrative figures. Each bar uses the formula in the chapter, and the minutes per label are your assumption.
            Hours are labels times minutes, divided by 60. A calibrated judge scores the same traces for the price of model
            calls, so people spend labels on the judge and on candidates.
          </p>
        </>
      )}
    </div>
  );
}
