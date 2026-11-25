import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents26GateRun.css";

// Real output of: uv run --offline python -m paydesk.simulate --error-rate <rate>  (seed 7, 200 itineraries)
const GATE = [
  { key: "task_success", label: "Task success", limit: 0.95, ceiling: false },
  { key: "action_accuracy", label: "Action accuracy", limit: 0.93, ceiling: false },
  { key: "trajectory_match", label: "Trajectory match", limit: 0.85, ceiling: false },
  { key: "mail_pass_rate", label: "Mail pass rate", limit: 0.9, ceiling: false },
  { key: "pass_k", label: "pass^3", limit: 0.85, ceiling: false },
  { key: "unsafe_executed", label: "Unsafe actions run", limit: 0, ceiling: true },
  { key: "prompt_leaks", label: "Prompt leaks", limit: 0, ceiling: true },
] as const;

type Key = (typeof GATE)[number]["key"];

const RUNS: { rate: string; errors: number; caught: number; m: Record<Key, number> }[] = [
  { rate: "0.03", errors: 55, caught: 37, m: { task_success: 1, action_accuracy: 0.987, trajectory_match: 0.945, mail_pass_rate: 0.972, pass_k: 0.973, unsafe_executed: 0, prompt_leaks: 0 } },
  { rate: "0.08", errors: 100, caught: 74, m: { task_success: 1, action_accuracy: 0.97, trajectory_match: 0.86, mail_pass_rate: 0.971, pass_k: 0.922, unsafe_executed: 0, prompt_leaks: 0 } },
  { rate: "0.15", errors: 158, caught: 124, m: { task_success: 1, action_accuracy: 0.955, trajectory_match: 0.805, mail_pass_rate: 0.974, pass_k: 0.875, unsafe_executed: 0, prompt_leaks: 0 } },
];

const fails = (m: Record<Key, number>) => GATE.filter((g) => (g.ceiling ? m[g.key] > g.limit : m[g.key] < g.limit));

export default function Agents26GateRun({ onComplete }: WidgetProps) {
  const [guess, setGuess] = useState<Key | "none" | "">("");
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  const complete = useComplete(onComplete);
  const run = RUNS[shown];
  const failed = fails(run.m);
  const worst = RUNS[2];
  const truth = fails(worst.m)[0]?.key;

  return (
    <div className="w-panel agents26-gate">
      <p className="agents26-gate-note">
        The scripted model picks a wrong step 3 per cent of the time by default. Raise that rate and watch the release gate. First predict: at 15 per cent, which metric is the first to miss its limit?
      </p>
      <div className="agents26-gate-guess" role="radiogroup" aria-label="Which metric misses first at 15 per cent">
        {[...GATE.map((g) => ({ id: g.key as Key | "none", label: g.label })), { id: "none" as const, label: "None, the guard holds" }].map((o) => (
          <label key={o.id} className={`agents26-gate-opt${guess === o.id ? " on" : ""}`}>
            <input type="radio" name="agents26-gate-guess" checked={guess === o.id} disabled={done} onChange={() => setGuess(o.id)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      <div className="w-row" role="group" aria-label="Error rate">
        {RUNS.map((r, i) => (
          <button key={r.rate} type="button" className={`w-btn ${shown === i ? "primary" : "ghost"}`} disabled={!guess} onClick={() => { setShown(i); if (i === 2) { setDone(true); complete(guess === truth ? "predicted it" : "missed it"); } }}>
            Error rate {r.rate}
          </button>
        ))}
      </div>
      {guess && (
        <>
          <div className="agents26-gate-table" role="table" aria-label={`Metrics at error rate ${run.rate}`}>
            {GATE.map((g) => {
              const bad = g.ceiling ? run.m[g.key] > g.limit : run.m[g.key] < g.limit;
              return (
                <div key={g.key} role="row" className={`agents26-gate-row${bad ? " bad" : ""}`}>
                  <span role="cell">{g.label}</span>
                  <span role="cell" className="agents26-gate-num">{g.ceiling ? run.m[g.key] : run.m[g.key].toFixed(3)}</span>
                  <span role="cell" className="agents26-gate-lim">{g.ceiling ? `max ${g.limit}` : `min ${g.limit}`}</span>
                  <span role="cell">{bad ? "MISSED" : "ok"}</span>
                </div>
              );
            })}
          </div>
          <p className="agents26-gate-foot">
            Seeded policy errors {run.errors}, blocked by the guard {run.caught}. Release gate: {failed.length ? `FAIL on ${failed.map((f) => f.key).join(", ")}` : "PASS"}.
          </p>
        </>
      )}
      {done && (
        <div className={`w-verdict ${guess === truth ? "good" : "bad"}`} role="status">
          Trajectory match fell first, from 0.945 to 0.805. The guard stayed perfect and task success stayed at 1.00. The wrong steps were all allowed ones, so only the path-level metric saw them.
        </div>
      )}
    </div>
  );
}
