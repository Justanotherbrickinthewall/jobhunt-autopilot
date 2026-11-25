import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents11BudgetDial.css";

const CLEAN_TURNS = 3; // search, version, answer

type Result = { budget: number; guard: boolean; clean: number; cleanDone: boolean; loopCalls: number; good: boolean };

function simulate(budget: number, guard: boolean): Result {
  const cleanDone = budget >= CLEAN_TURNS;
  const clean = Math.min(budget, CLEAN_TURNS);
  // A stuck model repeats one call forever. The repeat check stops it on turn 2.
  const loopCalls = guard ? Math.min(budget, 2) : budget;
  return { budget, guard, clean, cleanDone, loopCalls, good: cleanDone && loopCalls <= 3 };
}

export default function Agents11BudgetDial({ onComplete }: WidgetProps) {
  const [budget, setBudget] = useState(8);
  const [guard, setGuard] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [tries, setTries] = useState(0);
  const complete = useComplete(onComplete);

  function run() {
    const r = simulate(budget, guard);
    setRes(r);
    const n = tries + 1;
    setTries(n);
    if (r.good || n >= 2) complete(r.good ? "budget and repeat check fit the task" : "saw the trade-off after two tries");
  }

  return (
    <div className="w-panel agents11-budget-dial">
      <p className="agents11-budget-dial-note">The clean question needs 3 model calls. A stuck model repeats one call for ever. Set the loop so it finishes the first and stops the second cheaply.</p>
      <div className="w-stack">
        <label className="agents11-budget-dial-field">
          <span>Step budget: {budget}</span>
          <input type="range" min={1} max={10} value={budget} onChange={(e) => { setBudget(Number(e.target.value)); setRes(null); }} />
        </label>
        <label className="agents11-budget-dial-check">
          <input type="checkbox" checked={guard} onChange={(e) => { setGuard(e.target.checked); setRes(null); }} />
          <span>Stop on a repeated identical call</span>
        </label>
        <div className="w-row">
          <button type="button" className="w-btn primary" onClick={run}>Run both questions</button>
        </div>
      </div>
      {res && (
        <div className="agents11-budget-dial-out" role="status">
          <p>Clean question: {res.cleanDone ? `answered in ${res.clean} calls.` : `stopped by the budget after ${res.clean} calls, with no answer.`}</p>
          <p>Stuck model: {res.loopCalls} calls before the loop stopped it{res.guard ? ", through the repeat check" : ", through the budget"}.</p>
          <p className={`w-verdict ${res.good ? "good" : "bad"}`}>
            {res.good
              ? "That fits. The budget leaves room for the real path, and the stuck run ends within three calls."
              : !res.cleanDone
                ? "A budget below 3 cuts off a healthy run. Raise it."
                : "The stuck model burns your whole budget. Switch the repeat check on, or lower the budget towards the real path."}
          </p>
        </div>
      )}
    </div>
  );
}
