import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Guardrails07GateBar.css";

const SIZES = [10, 25, 40, 100];
const BARS = [0, 5, 10];
const CHALLENGE = [10, 25, 40];

// Whole numbers throughout, so a rate that sits exactly on the bar is never lost to rounding.
const passes = (k: number, n: number, barPct: number) => k * 100 <= barPct * n;
const mostThatPass = (n: number, barPct: number) => Math.floor((barPct * n) / 100);
const pct = (k: number, n: number) => `${((k * 100) / n).toFixed(1)}%`;

// Real offline runs, 21 October 2026. The first two play the v1 set. The third is ten attacks the course author wrote after the guards were fixed.
const PRESETS = [
  { label: "v1, guarded: 0 of 25", n: 25, k: 0 },
  { label: "v1, unguarded: 23 of 25", n: 25, k: 23 },
  { label: "Ten new attacks: 5 of 10", n: 10, k: 5 },
];

export default function Guardrails07GateBar({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [n, setN] = useState(25);
  const [bar, setBar] = useState(5);
  const [k, setK] = useState(3);
  const [solved, setSolved] = useState<number[]>([]);
  const [msg, setMsg] = useState("");

  const ok = passes(k, n, bar);
  const canLock = bar === 5 && CHALLENGE.includes(n) && !solved.includes(n);

  function pickSize(size: number) {
    setN(size);
    setK((v) => Math.min(v, size));
    setMsg("");
  }

  function lock() {
    const best = mostThatPass(n, 5);
    if (k === best) {
      const next = [...solved, n];
      setSolved(next);
      setMsg(`Right. ${k} of ${n} is ${pct(k, n)} and passes. ${k + 1} would be ${pct(k + 1, n)} and fails.${best === 0 ? ` At ${n} attacks the bar allows no success at all.` : ""}`);
      if (CHALLENGE.every((c) => next.includes(c))) complete("Found the most successes the 5 percent bar allows at 10, 25 and 40 attacks.");
    } else if (k < best) {
      setMsg(`${k} of ${n} passes, but ${k + 1} of ${n} is ${pct(k + 1, n)} and passes too. Go higher.`);
    } else {
      setMsg(`${k} of ${n} is ${pct(k, n)}, which is over the bar. Go lower.`);
    }
  }

  return (
    <div className="w-panel guardrails07-gate-bar">
      <p className="guardrails07-gate-bar-note w-mono">The presets are real offline runs from 21 October 2026. Every other number is yours to set.</p>

      <div className="w-row" aria-label="Real runs">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className="w-chip" onClick={() => { setN(p.n); setK(p.k); setMsg(""); }}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="guardrails07-gate-bar-controls">
        <div>
          <span className="w-label">Attacks in the set</span>
          <div className="w-row" role="group" aria-label="Attacks in the set">
            {SIZES.map((s) => (
              <button key={s} type="button" aria-pressed={n === s} className={"w-chip" + (n === s ? " is-on" : "")} onClick={() => pickSize(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="w-label">Pass mark (--max-asr)</span>
          <div className="w-row" role="group" aria-label="Pass mark">
            {BARS.map((b) => (
              <button key={b} type="button" aria-pressed={bar === b} className={"w-chip" + (bar === b ? " is-on" : "")} onClick={() => { setBar(b); setMsg(""); }}>
                {b}%
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className="guardrails07-gate-bar-slider">
        <span className="w-label">Attacks that got through: {k} of {n}</span>
        <input type="range" min={0} max={n} step={1} value={k} onChange={(e) => { setK(Number(e.target.value)); setMsg(""); }} />
      </label>

      <dl className="guardrails07-gate-bar-stats">
        <div><dt>Attack success rate</dt><dd>{pct(k, n)}</dd></div>
        <div><dt>Pass mark</dt><dd>{bar}%</dd></div>
        <div><dt>One attack moves it</dt><dd>{(100 / n).toFixed(1)} points</dd></div>
        <div><dt>Most that still pass</dt><dd>{mostThatPass(n, bar)}</dd></div>
      </dl>

      <p className={"w-verdict " + (ok ? "good" : "bad")} role="status">
        {ok ? "Exit code 0. The gate passes, and the merge goes ahead." : "Exit code 1. The gate fails, and CI stops the merge."}
      </p>

      <fieldset className="guardrails07-gate-bar-challenge">
        <legend className="w-label">Challenge: at a 5% pass mark, find the most successes that still pass</legend>
        <p className="guardrails07-gate-bar-sizes">
          {CHALLENGE.map((c) => (
            <span key={c} className={"guardrails07-gate-bar-size" + (solved.includes(c) ? " solved" : "")}>
              {solved.includes(c) ? "✓ " : ""}{c} attacks
            </span>
          ))}
        </p>
        <div className="w-row">
          <button type="button" className="w-btn primary" disabled={!canLock} onClick={lock}>
            This is the most that passes
          </button>
        </div>
        {!canLock && !CHALLENGE.every((c) => solved.includes(c)) && (
          <p className="guardrails07-gate-bar-hint">Set the pass mark to 5% and the set to 10, 25 or 40 attacks that you haven't solved yet.</p>
        )}
        {msg && <p className="guardrails07-gate-bar-msg" role="status">{msg}</p>}
      </fieldset>
    </div>
  );
}
