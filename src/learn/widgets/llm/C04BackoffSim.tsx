import { useMemo, useState } from "react";
import { MotionConfig } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C04BackoffSim.css";

// Illustrative figures: 20 clients, a server that accepts 5 requests per second, a recovery at second zero.
const CLIENTS = 20;
const CAPACITY = 5;
const SLOTS = 40;

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simulate(base: number, cap: number, jitter: boolean) {
  const rand = rng(7);
  const next: (number | null)[] = Array(CLIENTS).fill(0);
  const attempts: number[] = Array(CLIENTS).fill(0);
  const load = Array(SLOTS).fill(0);
  const served = Array(SLOTS).fill(0);
  for (let t = 0; t < SLOTS; t++) {
    for (let c = 0; c < CLIENTS; c++) {
      const when = next[c];
      if (when === null || Math.floor(when) !== t) continue;
      load[t] += 1;
      if (served[t] < CAPACITY) {
        served[t] += 1;
        next[c] = null;
      } else {
        const d = Math.min(cap, base * 2 ** attempts[c]);
        attempts[c] += 1;
        next[c] = t + Math.max(1, jitter ? rand() * d : d);
      }
    }
  }
  const done = next.filter((n) => n === null).length;
  // Peak of the retry waves; the first wave at second zero is always the whole crowd.
  const peak = Math.max(...load.slice(1));
  const total = load.reduce((a: number, b: number) => a + b, 0);
  return { load, peak, total, done };
}

export default function C04BackoffSim({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [base, setBase] = useState(4);
  const [cap, setCap] = useState(16);
  const [jitter, setJitter] = useState(false);
  const [guess, setGuess] = useState<"bunch" | "spread" | null>(null);
  const [ran, setRan] = useState(false);
  const [runs, setRuns] = useState(0);

  const r = useMemo(() => simulate(base, cap, jitter), [base, cap, jitter]);
  const noJ = useMemo(() => simulate(base, cap, false), [base, cap]);
  const withJ = useMemo(() => simulate(base, cap, true), [base, cap]);
  const truth: "bunch" | "spread" = r.peak > CAPACITY * 2 ? "bunch" : "spread";
  const maxLoad = Math.max(CLIENTS, ...r.load);

  const run = () => {
    setRan(true);
    const n = runs + 1;
    setRuns(n);
    if (guess === truth) complete("predicted correctly");
    else if (n >= 2) complete("predicted wrongly twice, explanation shown");
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel llm-backoff-sim">
        <p className="w-label">Illustrative figures: {CLIENTS} clients, the server takes {CAPACITY} requests per second</p>
        <div className="llm-backoff-sim-controls">
          <label><span className="w-label">Base delay {base}s</span>
            <input type="range" min={2} max={8} step={1} value={base} onChange={(e) => { setBase(Number(e.target.value)); setRan(false); }} /></label>
          <label><span className="w-label">Cap {cap}s</span>
            <input type="range" min={8} max={30} step={1} value={cap} onChange={(e) => { setCap(Number(e.target.value)); setRan(false); }} /></label>
          <label className="w-row"><input type="checkbox" checked={jitter} onChange={(e) => { setJitter(e.target.checked); setRan(false); }} /> <span>Full jitter</span></label>
        </div>
        <p>All clients failed together and the provider has just recovered. Predict how these settings behave.</p>
        <div className="w-row" role="radiogroup" aria-label="Your prediction">
          <button type="button" role="radio" aria-checked={guess === "bunch"} className={`w-chip${guess === "bunch" ? " is-on" : ""}`} onClick={() => { setGuess("bunch"); setRan(false); }}>Retries bunch up</button>
          <button type="button" role="radio" aria-checked={guess === "spread"} className={`w-chip${guess === "spread" ? " is-on" : ""}`} onClick={() => { setGuess("spread"); setRan(false); }}>Retries spread out</button>
          <button type="button" className="w-btn" disabled={guess === null} onClick={run}>Simulate</button>
        </div>
        {ran && (
          <>
            <svg viewBox={`0 0 ${SLOTS * 10} 90`} className="llm-backoff-sim-chart" role="img" aria-label="Requests per second">
              <line x1="0" x2={SLOTS * 10} y1={80 - (CAPACITY / maxLoad) * 70} y2={80 - (CAPACITY / maxLoad) * 70} stroke="var(--teal)" strokeDasharray="4 3" />
              {r.load.map((n: number, t: number) => (
                <rect key={t} x={t * 10 + 1} width="8" y={80 - (n / maxLoad) * 70} height={(n / maxLoad) * 70} fill={n > CAPACITY ? "var(--rose)" : "var(--accent)"} />
              ))}
              <line x1="0" x2={SLOTS * 10} y1="80" y2="80" stroke="var(--line)" />
            </svg>
            <p className="llm-backoff-sim-note">Peak retry wave {r.peak} requests in one second. {r.total} attempts in total. {r.done} of {CLIENTS} clients served. Dashed line is capacity. Rose bars exceed it.</p>
            <div className={`w-verdict ${guess === truth ? "good" : "bad"}`} role="status">
              {guess === truth ? "Correct. " : "Not this time. "}
              Without jitter the clients retry in step: the biggest retry wave is {noJ.peak} requests and the crowd makes {noJ.total} attempts. With full jitter the biggest wave is {withJ.peak} and the attempts are {withJ.total}. Jitter breaks the lockstep, so each wave is smaller. A very small base delay leaves little room to spread, so try a base of 2 to see jitter help less.
            </div>
          </>
        )}
      </div>
    </MotionConfig>
  );
}
