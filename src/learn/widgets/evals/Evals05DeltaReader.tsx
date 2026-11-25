import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Evals05DeltaReader.css";

// Illustrative figures, not from a real run. The baseline prompt and the one-sentence variant ran on the 14 item
// answer slice. The widget keeps those pass rates and asks what a larger slice would do to the noise band.
type Delta = { name: string; a: number; b: number; passA: number; passB: number };

// In the order compare_experiments returns them: the largest difference first.
const DELTAS: Delta[] = [
  { name: "refusal", a: 11 / 14, b: 13 / 14, passA: 11, passB: 13 },
  { name: "citations", a: 9 / 14, b: 10 / 14, passA: 9, passB: 10 },
];

const ITEM_COUNTS = [14, 56, 224, 896] as const;
const BASE_ITEMS = 14;

// The noise band is two standard errors of the gap, treating each score as a pass rate.
const variance = (d: Delta) => d.a * (1 - d.a) + d.b * (1 - d.b);
const bandAt = (d: Delta, n: number) => 2 * Math.sqrt(variance(d) / n);
const gapOf = (d: Delta) => d.b - d.a;
const itemsNeeded = (d: Delta) => Math.ceil((4 * variance(d)) / (gapOf(d) * gapOf(d)) - 1e-9);

type Guess = "both" | "refusal" | "neither";

const GUESSES: { id: Guess; text: string }[] = [
  { id: "both", text: "Both. Refusal and citations each moved up." },
  { id: "refusal", text: "Refusal only, because it moved the most." },
  { id: "neither", text: "Neither. Both gaps are inside their noise band." },
];

const points = (x: number) => Math.round(x * 100);

const W = 320;
const BAR_X = 44;
const SCALE = 5; // pixels for each point of score, so a 40 point bar is 200 wide.

export default function Evals05DeltaReader({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [pick, setPick] = useState<Guess | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [checked, setChecked] = useState(false);
  const [n, setN] = useState<number>(BASE_ITEMS);
  const done = checked && (pick === "neither" || attempt >= 2);

  const check = () => {
    const tries = attempt + 1;
    setAttempt(tries);
    setChecked(true);
    if (pick === "neither" || tries >= 2) {
      complete(pick === "neither" ? `Judged both gaps as noise at 14 items, on attempt ${tries}` : "Did not judge the gaps as noise");
    }
  };

  const retry = () => {
    setChecked(false);
    setPick(null);
  };

  return (
    <div className="w-panel evals05-delta-reader">
      <fieldset className="evals05-delta-reader-guess" disabled={checked}>
        <legend className="w-label">Predict first</legend>
        <p className="evals05-delta-reader-q">
          compare_experiments returned two differences on the 14 answer items. Refusal went from 11 passes to 13, which is
          0.79 to 0.93. Citations went from 9 passes to 10, which is 0.64 to 0.71. Which differences can you act on?
        </p>
        <div className="evals05-delta-reader-opts" role="radiogroup" aria-label="The differences you can act on">
          {GUESSES.map((g) => (
            <button
              key={g.id}
              type="button"
              role="radio"
              aria-checked={pick === g.id}
              className={`evals05-delta-reader-opt${pick === g.id ? " on" : ""}`}
              onClick={() => setPick(g.id)}
            >
              {g.text}
            </button>
          ))}
        </div>
        {!checked && (
          <div className="w-row">
            <button type="button" className="w-btn primary" disabled={!pick} onClick={check}>
              Check my prediction
            </button>
          </div>
        )}
      </fieldset>

      {checked && !done && (
        <div className="w-verdict bad" role="status">
          Not quite. Compare each gap with its noise band, and remember that 14 items give a wide band. Try once more.{" "}
          <button type="button" className="w-btn small" onClick={retry}>
            Try again
          </button>
        </div>
      )}

      {done && (
        <>
          <div className={`w-verdict ${pick === "neither" ? "good" : "bad"}`} role="status">
            {pick === "neither" ? "Right. " : "Not quite. "}
            At 14 items the noise band is {points(bandAt(DELTAS[0], BASE_ITEMS))} points for refusal and{" "}
            {points(bandAt(DELTAS[1], BASE_ITEMS))} for citations. Both gaps are smaller. Raise the item count to see
            how many items each gap needs.
          </div>

          <div className="w-row" role="radiogroup" aria-label="Items in the slice">
            <span className="w-label">Items, at the same pass rates</span>
            {ITEM_COUNTS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={n === c}
                className={`w-chip${n === c ? " is-on" : ""}`}
                onClick={() => setN(c)}
              >
                {c}
              </button>
            ))}
          </div>

          {DELTAS.map((d) => {
            const gap = gapOf(d) * 100;
            const band = bandAt(d, n) * 100;
            const clears = gap > band;
            return (
              <div key={d.name} className="w-inset evals05-delta-reader-row">
                <div className="w-row between">
                  <span className="w-mono">
                    {d.name} {d.a.toFixed(2)} to {d.b.toFixed(2)} ({gapOf(d) >= 0 ? "+" : ""}
                    {gapOf(d).toFixed(2)})
                  </span>
                  <span className={`w-chip ${clears ? "good" : "bad"}`}>{clears ? "Clears the band" : "Inside the noise"}</span>
                </div>
                <svg
                  viewBox={`0 0 ${W} 58`}
                  className="evals05-delta-reader-chart"
                  role="img"
                  aria-label={`${d.name} at ${n} items. The gap is ${points(gapOf(d))} points and the noise band is ${points(bandAt(d, n))} points. ${clears ? "The gap clears the band." : "The gap is inside the noise."}`}
                >
                  <text x={0} y={17} className="evals05-delta-reader-text">
                    Gap
                  </text>
                  <rect x={BAR_X} y={6} width={gap * SCALE} height={14} rx={3} className={`evals05-delta-reader-gap${clears ? " clears" : ""}`} />
                  <text x={BAR_X + gap * SCALE + 6} y={17} className="evals05-delta-reader-text mono">
                    {points(gapOf(d))} points
                  </text>
                  <text x={0} y={47} className="evals05-delta-reader-text">
                    Band
                  </text>
                  <rect x={BAR_X} y={36} width={band * SCALE} height={14} rx={3} className="evals05-delta-reader-band" />
                  <text x={BAR_X + band * SCALE + 6} y={47} className="evals05-delta-reader-text mono">
                    {points(bandAt(d, n))} points
                  </text>
                </svg>
                <p className="evals05-delta-reader-note">
                  The pass rates stay at {d.passA} of 14 and {d.passB} of 14, scaled up to {n} items. At these rates the
                  gap needs about {itemsNeeded(d)} items to clear its band.
                </p>
              </div>
            );
          })}

          <p className="evals05-delta-reader-foot">
            The band is two standard errors of the gap. It treats each score as a pass rate. For citations, which can
            score partly, that overstates the noise a little.
          </p>
        </>
      )}
    </div>
  );
}
