import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C05ModelScorecard.css";

type Model = { id: string; name: string; success: number; tail: number; ctx: number; price: number };

// Illustrative figures, hand-authored for teaching. They are not measurements of any real model.
const MODELS: Model[] = [
  { id: "a", name: "Model A", success: 88, tail: 1.1, ctx: 32, price: 0.5 },
  { id: "b", name: "Model B", success: 94, tail: 2.8, ctx: 128, price: 1.8 },
  { id: "c", name: "Model C", success: 97, tail: 7.0, ctx: 200, price: 6.0 },
];
const CTX_OPTIONS = [30, 100, 150];

const costPerSuccess = (m: Model) => m.price / (m.success / 100);

export default function C05ModelScorecard({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [bar, setBar] = useState(92);
  const [maxTail, setMaxTail] = useState(4);
  const [needCtx, setNeedCtx] = useState(30);
  const [pick, setPick] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [locks, setLocks] = useState(0);

  const rows = MODELS.map((m) => {
    const okQuality = m.success >= bar;
    const okTail = m.tail <= maxTail;
    const okCtx = m.ctx >= needCtx;
    return { m, okQuality, okTail, okCtx, pass: okQuality && okTail && okCtx, cps: costPerSuccess(m) };
  });
  const passing = rows.filter((r) => r.pass).sort((x, y) => x.cps - y.cps);
  const best = passing[0]?.m.id ?? "none";
  const right = pick === best;

  const lock = () => {
    setLocked(true);
    const n = locks + 1;
    setLocks(n);
    if (right) complete("Picked the cheapest passing model");
    else if (n >= 2) complete("Missed the cheapest passing model twice, explanation shown");
  };
  const change = (fn: () => void) => {
    fn();
    setLocked(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel llm-model-scorecard">
        <p className="llm-model-scorecard-note">Illustrative figures. Three fictional models on the Harbour Supplies invoice set.</p>

        <div className="llm-model-scorecard-controls">
          <label className="llm-model-scorecard-ctl">
            <span className="llm-model-scorecard-lab">
              Quality bar <b className="w-mono">{bar}% of tasks correct</b>
            </span>
            <input type="range" min={85} max={98} step={1} value={bar} onChange={(e) => change(() => setBar(Number(e.target.value)))} />
          </label>
          <label className="llm-model-scorecard-ctl">
            <span className="llm-model-scorecard-lab">
              Slowest allowed tail latency <b className="w-mono">{maxTail.toFixed(1)} s</b>
            </span>
            <input type="range" min={1} max={8} step={0.5} value={maxTail} onChange={(e) => change(() => setMaxTail(Number(e.target.value)))} />
          </label>
          <fieldset className="llm-model-scorecard-ctx">
            <legend className="llm-model-scorecard-lab">Longest input you must fit</legend>
            <div className="w-row">
              {CTX_OPTIONS.map((c) => (
                <button key={c} type="button" className="w-chip" aria-pressed={needCtx === c} onClick={() => change(() => setNeedCtx(c))}>
                  {c}k tokens
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="llm-model-scorecard-table" role="table" aria-label="Model results against your constraints">
          {rows.map(({ m, okQuality, okTail, okCtx, pass, cps }) => (
            <motion.div layout key={m.id} role="row" className={`llm-model-scorecard-row${pass ? " pass" : " fail"}`}>
              <div className="llm-model-scorecard-name" role="cell">
                <b>{m.name}</b>
                <span className={`w-chip ${pass ? "good" : "bad"}`}>{pass ? "passes" : "filtered out"}</span>
              </div>
              <svg viewBox="0 0 200 14" className="llm-model-scorecard-svg" role="img" aria-label={`${m.name} correct on ${m.success} percent of tasks, bar at ${bar}`}>
                <rect x="0" y="3" width="200" height="8" rx="4" className="llm-model-scorecard-track" />
                <motion.rect x="0" y="3" height="8" rx="4" initial={false} animate={{ width: (m.success - 80) * (200 / 20) }} className={okQuality ? "llm-model-scorecard-fill ok" : "llm-model-scorecard-fill no"} />
                <line x1={(bar - 80) * 10} x2={(bar - 80) * 10} y1="0" y2="14" className="llm-model-scorecard-barline" />
              </svg>
              <div className="llm-model-scorecard-facts w-mono" role="cell">
                <span className={okQuality ? "ok" : "no"}>{m.success}% correct</span>
                <span className={okTail ? "ok" : "no"}>{m.tail.toFixed(1)} s tail</span>
                <span className={okCtx ? "ok" : "no"}>{m.ctx}k window</span>
                <span>{m.price.toFixed(1)}p per call</span>
                <span>
                  <b>{cps.toFixed(2)}p</b> per success
                </span>
              </div>
            </motion.div>
          ))}
        </div>
        <p className="llm-model-scorecard-note">Cost per successful task is the price per call divided by the share of tasks that succeed. The scale on the quality bars starts at 80%.</p>

        <fieldset className="llm-model-scorecard-pick">
          <legend className="llm-model-scorecard-lab">Your judgement: which model do you ship?</legend>
          <div className="w-row">
            {[...MODELS.map((m) => ({ id: m.id, name: m.name })), { id: "none", name: "None passes" }].map((o) => (
              <button key={o.id} type="button" className="w-chip" aria-pressed={pick === o.id} onClick={() => change(() => setPick(o.id))}>
                {o.name}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="w-row">
          <button type="button" className="w-btn" disabled={pick === null || locked} onClick={lock}>
            Lock in my pick
          </button>
        </div>

        {locked && (
          <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
            {best === "none"
              ? right
                ? "Correct. No model clears every constraint, so the honest answer is to relax a constraint or find another candidate."
                : "No model clears every constraint here. Relax the bar, the latency limit or the input size, or add a candidate."
              : right
                ? `Correct. ${MODELS.find((m) => m.id === best)?.name} is the cheapest per successful task among the models that pass.`
                : `The cheapest passing model is ${MODELS.find((m) => m.id === best)?.name}. Filter on the hard constraints first, then compare cost per success among the survivors.`}{" "}
            Move the sliders and see how the answer changes. Raising the bar to 96 and loosening latency to 8 seconds is the case that picks Model C.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
