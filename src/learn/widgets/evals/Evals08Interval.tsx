import { useMemo, useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Evals08Interval.css";

// The same generator and the same bootstrap as askpep/evals/stats.py (mulberry32, percentile method).
// Evals08GateVerdict imports bootstrapCi from here, so both widgets show numbers the gate would print.
export type Interval = { rate: number; low: number; high: number };

export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function bootstrapCi(results: boolean[], resamples = 1000, confidence = 0.95, seed = 1): Interval {
  const n = results.length;
  const rng = makeRng(seed);
  const rate = results.filter(Boolean).length / n;
  const rates: number[] = [];
  for (let r = 0; r < resamples; r++) {
    let passes = 0;
    for (let i = 0; i < n; i++) if (results[Math.floor(rng() * n)]) passes++;
    rates.push(passes / n);
  }
  rates.sort((x, y) => x - y);
  const alpha = 1 - confidence;
  return {
    rate,
    low: rates[Math.floor((alpha / 2) * resamples)],
    high: rates[Math.ceil((1 - alpha / 2) * resamples) - 1],
  };
}

// As in the lab tests: n results, of which the first `passes` passed.
export const sample = (passes: number, n: number): boolean[] => Array.from({ length: n }, (_, i) => i < passes);

// Illustrative figures: one slice with a floor of 0.70 and a baseline of 0.90, so only the baseline rule can fire.
const FLOOR = 0.7;
const BASELINE = 0.9;
const CARDS = [
  { n: 12, passes: 10 },
  { n: 22, passes: 18 },
  { n: 100, passes: 82 },
];
const SIZES = [12, 22, 50, 100, 200];

type Pick = "fires" | "quiet";
const fires = (i: Interval) => i.high < BASELINE;
const two = (x: number) => x.toFixed(2);

function Bar({ interval }: { interval: Interval }) {
  const at = (x: number) => `${(x * 100).toFixed(1)}%`;
  return (
    <div className="evals08-interval-scale">
      <div
        className="evals08-interval-bar"
        role="img"
        aria-label={`Interval ${two(interval.low)} to ${two(interval.high)}, rate ${two(interval.rate)}, floor ${two(FLOOR)}, baseline ${two(BASELINE)}`}
      >
        <div className="evals08-interval-span" style={{ left: at(interval.low), width: at(interval.high - interval.low) }} />
        <div className="evals08-interval-line floor" style={{ left: at(FLOOR) }} />
        <div className="evals08-interval-line baseline" style={{ left: at(BASELINE) }} />
        <div className="evals08-interval-dot" style={{ left: at(interval.rate) }} />
      </div>
      <div className="evals08-interval-ticks w-mono" aria-hidden="true">
        <span>0</span>
        <span>0.5</span>
        <span>1</span>
      </div>
    </div>
  );
}

export default function Evals08Interval({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<(Pick | null)[]>(CARDS.map(() => null));
  const [size, setSize] = useState(22);
  const [passes, setPasses] = useState(18);

  const cards = useMemo(() => CARDS.map((c) => bootstrapCi(sample(c.passes, c.n))), []);
  const own = useMemo(() => bootstrapCi(sample(passes, size)), [passes, size]);

  const pick = (i: number, said: Pick) => {
    if (picks[i] !== null) return;
    const next = picks.map((p, j) => (j === i ? said : p));
    setPicks(next);
    if (next.every((p) => p !== null)) {
      const right = next.filter((p, j) => (p === "fires") === fires(cards[j])).length;
      complete(`${right} of ${CARDS.length} baseline rule outcomes predicted`);
    }
  };

  const answered = picks.filter((p) => p !== null).length;
  const allDone = answered === CARDS.length;

  return (
    <div className="w-panel evals08-interval">
      <p className="w-label">Illustrative figures</p>
      <p className="evals08-interval-hint">
        One slice has a floor of {two(FLOOR)} and a baseline of {two(BASELINE)}. Each card shows a drop of seven or eight points on a slice of a different size. The floor holds in all three, so only the baseline rule can fire. Predict whether it does. {answered} of {CARDS.length} answered.
      </p>
      {CARDS.map((c, i) => {
        const iv = cards[i];
        const picked = picks[i];
        const done = picked !== null;
        const truth = fires(iv);
        return (
          <section key={c.n} className="evals08-interval-card" aria-label={`Slice of ${c.n} items`}>
            <h4 className="evals08-interval-title">
              {c.n} items, {c.passes} pass
            </h4>
            <p className="evals08-interval-line-text">
              The rate is {two(c.passes / c.n)}, which is {Math.round((BASELINE - c.passes / c.n) * 100)} points under the baseline. Does the interval sit wholly below it?
            </p>
            <div className="evals08-interval-choices" role="radiogroup" aria-label="Does the baseline rule fire">
              {(["fires", "quiet"] as Pick[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={picked === p}
                  disabled={done}
                  className={`w-chip evals08-interval-choice${picked === p ? " on" : ""}${done && (p === "fires") === truth ? " right" : ""}`}
                  onClick={() => pick(i, p)}
                >
                  {p === "fires" ? "The rule fires" : "The rule stays quiet"}
                </button>
              ))}
            </div>
            {done && (
              <>
                <Bar interval={iv} />
                <p className={`evals08-interval-why ${(picked === "fires") === truth ? "ok" : "miss"}`} role="status">
                  <strong>{(picked === "fires") === truth ? "Correct. " : `Missed. The rule ${truth ? "fires" : "stays quiet"}. `}</strong>
                  The interval runs from {two(iv.low)} to {two(iv.high)}. Its top, {two(iv.high)}, is {truth ? "below" : "not below"} the baseline {two(BASELINE)}.
                  {truth ? " The drop is more than noise on a slice this size." : ` A slice of ${c.n} items can lose this much by chance, so the gate lets it through.`}
                </p>
              </>
            )}
          </section>
        );
      })}
      {allDone && (
        <>
          <div className="w-verdict good" role="status">
            A drop of this size fires the rule on 100 items and stays quiet on 12 and 22. The gate asks whether the drop is bigger than the noise of a slice that size, and a small slice has a lot of noise.
          </div>
          <section className="evals08-interval-card" aria-label="Try your own slice">
            <h4 className="evals08-interval-title">Try your own</h4>
            <div className="w-row">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={size === s}
                  className={`w-chip${size === s ? " is-on" : ""}`}
                  onClick={() => {
                    setSize(s);
                    setPasses(Math.round(s * 0.82));
                  }}
                >
                  {s} items
                </button>
              ))}
            </div>
            <label className="evals08-interval-range">
              <span className="w-label">Items that pass</span>
              <input
                type="range"
                min={0}
                max={size}
                step={1}
                value={passes}
                aria-label="Items that pass"
                onChange={(e) => setPasses(Number(e.target.value))}
              />
            </label>
            <p className="evals08-interval-line-text w-mono">
              {passes} of {size} pass. Rate {two(own.rate)}, interval {two(own.low)} to {two(own.high)}.
            </p>
            <Bar interval={own} />
            <p className="evals08-interval-line-text">
              {fires(own) ? "The baseline rule fires: " : "The baseline rule stays quiet: "}
              the top of the interval is {two(own.high)} and the baseline is {two(BASELINE)}.
              {own.rate < FLOOR ? ` The floor also fails, because the rate is under ${two(FLOOR)}.` : ""}
            </p>
          </section>
        </>
      )}
      <p className="evals08-interval-legend">
        On the bar, the shaded span is the interval, the dot is the rate, the dashed line is the floor and the solid line is the baseline.
      </p>
    </div>
  );
}
