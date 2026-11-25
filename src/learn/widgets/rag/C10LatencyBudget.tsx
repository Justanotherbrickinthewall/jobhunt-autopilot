import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { useOnce } from "./c1012shared";
import "./C10LatencyBudget.css";

type Stage = {
  id: string;
  label: string;
  start: number;
  min: number;
  max: number;
  step: number;
  colour: string;
  optional?: boolean;
  hint: string;
};

const STAGES: Stage[] = [
  { id: "rewrite", label: "Query rewrite (LLM)", start: 600, min: 150, max: 800, step: 10, colour: "var(--accent)", optional: true, hint: "A model call. Use a small model, or skip it for clear questions." },
  { id: "embed", label: "Embed the query", start: 150, min: 50, max: 300, step: 10, colour: "var(--teal)", hint: "One embedding call. Cache repeated queries." },
  { id: "search", label: "Hybrid search", start: 80, min: 20, max: 200, step: 5, colour: "var(--amber)", hint: "Dense and BM25 run in parallel. Filter early." },
  { id: "rerank", label: "Rerank", start: 400, min: 100, max: 600, step: 10, colour: "var(--rose)", optional: true, hint: "A cross-encoder. Rerank fewer candidates to cut time." },
  { id: "assemble", label: "Prompt assembly", start: 20, min: 10, max: 60, step: 5, colour: "var(--muted)", hint: "Cheap. Rarely the problem." },
  { id: "generate", label: "Generation, first token", start: 1100, min: 300, max: 1600, step: 20, colour: "var(--ink)", hint: "Prefill grows with the tokens you send." },
];

const TARGET = 1500;
const BIGGEST = "generate";

export default function C10LatencyBudget({ onComplete }: WidgetProps) {
  const reduce = useReducedMotion();
  const complete = useOnce(onComplete);
  const [guess, setGuess] = useState<string | null>(null);
  const [ms, setMs] = useState<Record<string, number>>(() => Object.fromEntries(STAGES.map((s) => [s.id, s.start])));
  const [off, setOff] = useState<Record<string, boolean>>({});
  const [verdict, setVerdict] = useState<{ good: boolean; text: string } | null>(null);

  const eff = (s: Stage) => (off[s.id] ? 0 : ms[s.id]);
  const total = useMemo(() => STAGES.reduce((a, s) => a + eff(s), 0), [ms, off]); // eslint-disable-line react-hooks/exhaustive-deps
  const domain = Math.max(total, TARGET) * 1.08;
  const W = 600;
  let x = 0;
  const segs = STAGES.map((s) => {
    const w = (eff(s) / domain) * W;
    const seg = { s, x, w };
    x += w;
    return seg;
  });
  const targetX = (TARGET / domain) * W;
  const over = total - TARGET;

  function submit() {
    const biggestLeft = [...STAGES].sort((a, b) => eff(b) - eff(a))[0];
    if (total > TARGET) {
      setVerdict({ good: false, text: `Still ${over} ms over. The largest stage left is ${biggestLeft.label} at ${eff(biggestLeft)} ms. Cut where the milliseconds are.` });
      complete("Missed the latency target.");
      return;
    }
    if (off.rerank) {
      setVerdict({ good: false, text: `You met the target at ${total} ms, but by dropping the reranker. That trades precision for speed, so run your golden set before you ship it. Try keeping it and rerank fewer candidates.` });
      complete("Met the target by dropping the reranker.");
      return;
    }
    setVerdict({ good: true, text: `Within budget at ${total} ms, with every quality stage kept. The two LLM calls were the lever, as they usually are.` });
    complete("Met the latency budget and kept quality stages.");
  }

  return (
    <div className="w-panel c10lb-root">
      <p className="c10lb-lead">
        Target: p95 time to first token of <strong>{TARGET} ms</strong>. All figures are illustrative assumptions for this exercise.
      </p>

      <fieldset className="c10lb-guess">
        <legend>Step 1. Predict the biggest stage.</legend>
        <div className="w-row c10lb-chips">
          {STAGES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={"w-chip c10lb-chip" + (guess === s.id ? " is-on" : "")}
              aria-pressed={guess === s.id}
              disabled={guess !== null}
              onClick={() => setGuess(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        {guess && (
          <p className={"c10lb-note " + (guess === BIGGEST ? "ok" : "no")} role="status">
            {guess === BIGGEST
              ? "Right. Generation is the largest single stage, and the rewrite call is second."
              : "Not quite. Generation prefill is the largest, with the rewrite call next. Retrieval is the small part."}
          </p>
        )}
      </fieldset>

      {guess && (
        <>
          <p className="c10lb-step">Step 2. Tune the stages until the bar ends before the target line.</p>
          <svg viewBox={`0 0 ${W} 74`} className="c10lb-svg" role="img" aria-label={`Stacked latency bar, total ${total} milliseconds against a target of ${TARGET}`}>
            <rect x="0" y="22" width={W} height="30" rx="6" className="c10lb-track" />
            {segs.map(({ s, x: sx, w }) => (
              <motion.rect
                key={s.id}
                x={0}
                y="22"
                height="30"
                fill={s.colour}
                opacity={0.88}
                initial={false}
                animate={{ x: sx, width: Math.max(w, 0) }}
                transition={reduce ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
              />
            ))}
            <motion.line x1={0} x2={0} y1="12" y2="62" strokeWidth="2.5" className="c10lb-target" initial={false} animate={{ x: targetX }} transition={reduce ? { duration: 0 } : { duration: 0.22 }} />
            <motion.text x={0} y="9" className="c10lb-tl" textAnchor="middle" initial={false} animate={{ x: Math.min(Math.max(targetX, 40), W - 40) }}>
              target {TARGET} ms
            </motion.text>
            <text x="0" y="70" className="c10lb-tl">
              0
            </text>
            <text x={W} y="70" textAnchor="end" className={"c10lb-tl " + (over > 0 ? "bad" : "good")}>
              total {total} ms {over > 0 ? `(${over} over)` : `(${-over} spare)`}
            </text>
          </svg>

          <div className="c10lb-sliders">
            {STAGES.map((s) => (
              <div key={s.id} className="c10lb-row">
                <label htmlFor={`c10lb-${s.id}`} className="c10lb-label">
                  <span className="c10lb-swatch" style={{ background: s.colour }} aria-hidden="true" />
                  {s.label}
                  <span className="c10lb-val">{off[s.id] ? "off" : `${ms[s.id]} ms`}</span>
                </label>
                <input
                  id={`c10lb-${s.id}`}
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={ms[s.id]}
                  disabled={!!off[s.id]}
                  onChange={(e) => setMs({ ...ms, [s.id]: Number(e.target.value) })}
                />
                <div className="c10lb-hint">
                  {s.hint}
                  {s.optional && (
                    <label className="c10lb-skip">
                      <input type="checkbox" checked={!!off[s.id]} onChange={(e) => setOff({ ...off, [s.id]: e.target.checked })} /> skip this stage
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="w-row">
            <button type="button" className="w-btn primary" onClick={submit}>
              Submit my budget
            </button>
            <button
              type="button"
              className="w-btn ghost"
              onClick={() => {
                setMs(Object.fromEntries(STAGES.map((s) => [s.id, s.start])));
                setOff({});
                setVerdict(null);
              }}
            >
              Reset
            </button>
          </div>
          {verdict && (
            <p className={"w-verdict " + (verdict.good ? "good" : "bad")} role="status">
              {verdict.text}
            </p>
          )}
        </>
      )}
    </div>
  );
}
