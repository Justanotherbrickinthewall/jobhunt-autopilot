import { useState } from "react";
import { motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useCompleteOnce } from "./c04-06-shared";
import "./Ch04.css";

const START = { angA: 25, lenA: 1, angB: 60, lenB: 1 };

function vec(angleDeg: number, len: number) {
  const r = (angleDeg * Math.PI) / 180;
  return [len * Math.cos(r), len * Math.sin(r)] as const;
}

function metrics(angA: number, lenA: number, angB: number, lenB: number, normalise: boolean) {
  const a = vec(angA, normalise ? 1 : lenA);
  const b = vec(angB, normalise ? 1 : lenB);
  const dot = a[0] * b[0] + a[1] * b[1];
  const na = Math.hypot(a[0], a[1]);
  const nb = Math.hypot(b[0], b[1]);
  return { a, b, dot, cos: dot / (na * nb), euc: Math.hypot(a[0] - b[0], a[1] - b[1]) };
}

const OPTIONS = [
  { id: "none", text: "None of them change. B still points the same way." },
  { id: "cos", text: "Only cosine similarity changes." },
  { id: "dot-euc", text: "Dot product and Euclidean distance change. Cosine does not." },
  { id: "all", text: "All three change." },
];

export default function C04MetricCalc({ onComplete }: WidgetProps) {
  const complete = useCompleteOnce(onComplete);
  const [s, setS] = useState(START);
  const [normalise, setNormalise] = useState(false);
  const [guess, setGuess] = useState<string | null>(null);

  const now = metrics(s.angA, s.lenA, s.angB, s.lenB, normalise);
  const start = metrics(START.angA, START.lenA, START.angB, START.lenB, normalise);
  const differs = (x: number, y: number) => Math.abs(x - y) > 0.005;
  const correct = guess === "dot-euc";

  function pick(id: string) {
    setGuess(id);
    complete(id === "dot-euc" ? "Predicted correctly: cosine ignores length." : `Predicted ${id}; cosine ignores length, dot and Euclidean do not.`);
  }

  const set = (k: keyof typeof START) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setS((p) => ({ ...p, [k]: Number(e.target.value) }));

  const sx = (v: number) => v;
  const sy = (v: number) => -v;

  return (
    <div className="w-panel">
      <div className="c04-metric-calc-grid">
        <svg className="c04-metric-calc-svg" viewBox="-3.5 -3.4 7 3.9" role="img" aria-label="Two vectors drawn from the origin">
          <defs>
            <marker id="c04-arrA" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0 L6 3 L0 6 z" fill="var(--accent)" />
            </marker>
            <marker id="c04-arrB" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0 L6 3 L0 6 z" fill="var(--teal)" />
            </marker>
          </defs>
          <line x1={-3.4} y1={0} x2={3.4} y2={0} stroke="var(--line)" strokeWidth={0.04} />
          <circle cx={0} cy={0} r={1} fill="none" stroke="var(--line)" strokeWidth={0.03} strokeDasharray="0.1 0.1" />
          <motion.line
            x1={0} y1={0} stroke="var(--accent)" strokeWidth={0.07} markerEnd="url(#c04-arrA)"
            animate={{ x2: sx(now.a[0]), y2: sy(now.a[1]) }} initial={false} transition={{ duration: 0.15 }}
          />
          <motion.line
            x1={0} y1={0} stroke="var(--teal)" strokeWidth={0.07} markerEnd="url(#c04-arrB)"
            animate={{ x2: sx(now.b[0]), y2: sy(now.b[1]) }} initial={false} transition={{ duration: 0.15 }}
          />
          <text x={sx(now.a[0]) + 0.08} y={sy(now.a[1]) - 0.08} fontSize={0.28} fill="var(--accent)">A</text>
          <text x={sx(now.b[0]) + 0.08} y={sy(now.b[1]) - 0.08} fontSize={0.28} fill="var(--teal)">B</text>
        </svg>

        <div>
          <div className="c04-metric-calc-sliders">
            <label>
              <span>A direction</span>
              <input type="range" min={0} max={180} value={s.angA} onChange={set("angA")} aria-label="Direction of A in degrees" />
              <span className="c04-metric-calc-num">{s.angA}°</span>
            </label>
            <label>
              <span>A length</span>
              <input type="range" min={0.2} max={3} step={0.1} value={s.lenA} onChange={set("lenA")} disabled={normalise} aria-label="Length of A" />
              <span className="c04-metric-calc-num">{(normalise ? 1 : s.lenA).toFixed(1)}</span>
            </label>
            <label>
              <span>B direction</span>
              <input type="range" min={0} max={180} value={s.angB} onChange={set("angB")} aria-label="Direction of B in degrees" />
              <span className="c04-metric-calc-num">{s.angB}°</span>
            </label>
            <label>
              <span>B length</span>
              <input type="range" min={0.2} max={3} step={0.1} value={s.lenB} onChange={set("lenB")} disabled={normalise} aria-label="Length of B" />
              <span className="c04-metric-calc-num">{(normalise ? 1 : s.lenB).toFixed(1)}</span>
            </label>
          </div>
          <div className="w-row" style={{ flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            <button className="w-btn" onClick={() => setS((p) => ({ ...p, lenB: 2 }))}>Double B's length</button>
            <button className="w-btn ghost" onClick={() => setS(START)}>Reset</button>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: "0.85rem" }}>
              <input type="checkbox" checked={normalise} onChange={(e) => setNormalise(e.target.checked)} />
              Normalise both to length 1
            </label>
          </div>
        </div>
      </div>

      <table className="c04-metric-calc-table">
        <thead>
          <tr><th>Metric</th><th>Start</th><th>Now</th><th>Higher means</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Dot product</td>
            <td className="c04-metric-calc-val">{start.dot.toFixed(3)}</td>
            <td className={`c04-metric-calc-val ${differs(start.dot, now.dot) ? "c04-metric-calc-flash" : ""}`}>{now.dot.toFixed(3)}</td>
            <td>closer</td>
          </tr>
          <tr>
            <td>Cosine similarity</td>
            <td className="c04-metric-calc-val">{start.cos.toFixed(3)}</td>
            <td className={`c04-metric-calc-val ${differs(start.cos, now.cos) ? "c04-metric-calc-flash" : ""}`}>{now.cos.toFixed(3)}</td>
            <td>closer</td>
          </tr>
          <tr>
            <td>Euclidean distance</td>
            <td className="c04-metric-calc-val">{start.euc.toFixed(3)}</td>
            <td className={`c04-metric-calc-val ${differs(start.euc, now.euc) ? "c04-metric-calc-flash" : ""}`}>{now.euc.toFixed(3)}</td>
            <td>further</td>
          </tr>
        </tbody>
      </table>
      {normalise && (
        <p className="c04-embedding-map-note">
          Normalised: dot product equals cosine ({now.dot.toFixed(3)} and {now.cos.toFixed(3)}). Squared distance{" "}
          {(now.euc * now.euc).toFixed(3)} equals 2 minus 2 times cosine ({(2 - 2 * now.cos).toFixed(3)}). Same ranking from all three.
        </p>
      )}

      <p style={{ margin: "14px 0 4px", fontSize: "0.95rem" }}>
        <strong>Predict.</strong> You stretch B to twice its length without turning it. Which metrics change?
      </p>
      <div className="c04-metric-calc-opts" role="group" aria-label="Your prediction">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            className={`w-btn ${guess === o.id ? "primary" : ""}`}
            disabled={guess !== null}
            onClick={() => pick(o.id)}
          >
            {o.text}
          </button>
        ))}
      </div>
      {guess && (
        <div className={`w-verdict ${correct ? "good" : "bad"}`}>
          {correct ? "Right. " : "Not quite. "}
          Cosine measures only the angle, so stretching B leaves it alone. The dot product grows with length. Euclidean
          distance changes because B's tip has moved. Press "Double B's length" and watch the amber values. Then tick
          normalise: once every vector has length one, all three metrics rank neighbours identically.
        </div>
      )}
    </div>
  );
}
