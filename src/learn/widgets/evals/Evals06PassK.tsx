import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Evals06PassK.css";

// The same estimators as pass_at_k and pass_pow_k in the lab: n recorded runs, c of them passed, k drawn at random.
// The five runs are a toggle, not a record from a live desk.

const N = 5;
const KS = [1, 2, 3, 4, 5];

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}
const passAt = (c: number, k: number) => 1 - choose(N - c, k) / choose(N, k);
const passPow = (c: number, k: number) => choose(c, k) / choose(N, k);
const fmt = (x: number) => x.toFixed(2);

// The challenge: a user who sees three drafts is nearly always happy, and a job that needs three good runs rarely works.
const solved = (c: number) => passAt(c, 3) >= 0.9 - 1e-9 && passPow(c, 3) < 0.2;

export default function Evals06PassK({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [runs, setRuns] = useState<boolean[]>([true, true, true, true, false]);
  const [done, setDone] = useState(false);

  const c = runs.filter(Boolean).length;
  const ok = solved(c);

  const flip = (i: number) => {
    const next = runs.map((r, j) => (j === i ? !r : r));
    setRuns(next);
    const nc = next.filter(Boolean).length;
    if (solved(nc)) {
      setDone(true);
      complete(`Solved with ${nc} passes in ${N} runs: pass@3 is ${fmt(passAt(nc, 3))} and pass^3 is ${fmt(passPow(nc, 3))}`);
    }
  };

  return (
    <div className="w-panel evals06-pass-k">
      <p className="evals06-pass-k-hint">
        Illustrative runs, with the same formulas as this chapter's lab. Click a run to flip it between pass and fail.
      </p>

      <div className="evals06-pass-k-runs" role="group" aria-label="Five recorded runs of one item">
        {runs.map((r, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={r}
            className={`w-chip evals06-pass-k-run${r ? " good" : " bad"}`}
            onClick={() => flip(i)}
          >
            Run {i + 1}: {r ? "pass" : "fail"}
          </button>
        ))}
      </div>
      <p className="evals06-pass-k-count">
        {c} of {N} runs passed.
      </p>

      <table className="evals06-pass-k-table">
        <caption className="w-label">What k runs would give</caption>
        <thead>
          <tr>
            <th scope="col">k</th>
            <th scope="col">pass@k</th>
            <th scope="col">pass^k</th>
          </tr>
        </thead>
        <tbody>
          {KS.map((k) => {
            const a = passAt(c, k);
            const p = passPow(c, k);
            return (
              <tr key={k} className={k === 3 ? "focus" : undefined}>
                <th scope="row">{k}</th>
                <td>
                  <span className="evals06-pass-k-bar" aria-hidden="true">
                    <span className="evals06-pass-k-fill at" style={{ width: `${Math.round(a * 100)}%` }} />
                  </span>
                  <span className="evals06-pass-k-num">{fmt(a)}</span>
                </td>
                <td>
                  <span className="evals06-pass-k-bar" aria-hidden="true">
                    <span className="evals06-pass-k-fill pow" style={{ width: `${Math.round(p * 100)}%` }} />
                  </span>
                  <span className="evals06-pass-k-num">{fmt(p)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="evals06-pass-k-note">At k of 1, both numbers are the share of runs that passed.</p>

      <div className="evals06-pass-k-challenge">
        <span className="w-label">Challenge</span>
        <p>
          Set the five runs so that pass@3 is at least 0.90 and pass^3 is below 0.20. Then a user who sees three drafts almost always gets a good one, and a job that needs three good runs rarely works.
        </p>
        <p className="evals06-pass-k-status" role="status">
          {ok || done
            ? ok
              ? "Met. Both conditions hold for this record."
              : "You met it once. The record has moved on, and the numbers above are the new ones."
            : `Not yet. pass@3 is ${fmt(passAt(c, 3))} and pass^3 is ${fmt(passPow(c, 3))}.`}
        </p>
      </div>

      {done && (
        <div className="w-verdict good" role="status">
          One record gave two honest answers. Pass@3 says the desk finds a good path within three tries. Pass^3 says it rarely takes a good path three times in a row. Quote the number that matches how the desk is used.
        </div>
      )}
    </div>
  );
}
