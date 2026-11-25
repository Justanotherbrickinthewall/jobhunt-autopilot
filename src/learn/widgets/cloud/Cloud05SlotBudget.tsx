import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud05SlotBudget.css";

type Case = { instances: number; seconds: number; why: string };

// Illustrative figures. A real quota may count requests or tokens, so read the row in the console.
// CHECK: whether a Gemini quota on pay as you go counts requests or tokens, and whether it is per model or
// per project, was not read. The 300 calls a minute here is not a real quota.
const CAPACITY = 300; // model calls a minute that the project may make
const OPTIONS = [1, 2, 4, 8, 16]; // values of VERTEX_MAX_CONCURRENT to choose from

// The most calls a minute the whole fleet can make when every slot is busy all the time.
// Calls in flight are instances times slots. Each call holds its slot for `seconds`.
const perMinute = (c: Case, slots: number) => Math.round(((c.instances * slots) / c.seconds) * 60);
const best = (c: Case) => Math.max(...OPTIONS.filter((g) => perMinute(c, g) <= CAPACITY));

const CASES: Case[] = [
  {
    instances: 3,
    seconds: 6,
    why: "This is the production fleet: the cap of three instances in run.tf, and a call that takes about 6 seconds.",
  },
  {
    instances: 10,
    seconds: 6,
    why: "Someone raised max_instance_count and left the slots alone. The cap on calls is instances times slots, so a bigger fleet needs fewer slots on each one.",
  },
  {
    instances: 5,
    seconds: 3,
    why: "Short calls free their slots quickly, so the same number of slots makes more calls a minute.",
  },
  {
    instances: 2,
    seconds: 12,
    why: "Long calls hold a slot for 12 seconds. Even the largest option stays under the capacity, so the gate is not the limit here.",
  },
  {
    instances: 3,
    seconds: 2,
    why: "A fast model, such as a lite one, turns a slot over every 2 seconds. The slots you chose for a slow model are now too many.",
  },
];

export default function Cloud05SlotBudget({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<(number | null)[]>(CASES.map(() => null));

  const pick = (i: number, slots: number) => {
    if (picks[i] !== null) return;
    const next = picks.map((p, j) => (j === i ? slots : p));
    setPicks(next);
    if (next.every((p) => p !== null)) {
      const right = next.filter((p, j) => p === best(CASES[j])).length;
      complete(`${right} of ${CASES.length} settings chosen right`);
    }
  };

  const answered = picks.filter((p) => p !== null).length;

  return (
    <div className="w-panel cloud05-slot-budget">
      <p className="cloud05-slot-budget-hint">
        Illustrative figures. The project may make {CAPACITY} model calls a minute. Pick the largest <span className="w-mono">VERTEX_MAX_CONCURRENT</span> that keeps the whole fleet at or under that, when every slot is busy. {answered} of {CASES.length} answered.
      </p>
      {CASES.map((c, i) => {
        const truth = best(c);
        const picked = picks[i];
        const done = picked !== null;
        const inFlight = c.instances * (picked ?? truth);
        return (
          <section key={`${c.instances}-${c.seconds}`} className="cloud05-slot-budget-card" aria-label={`Case ${i + 1}`}>
            <p className="cloud05-slot-budget-config">
              <span className="w-mono">max_instance_count={c.instances}</span> and about {c.seconds} seconds a model call
            </p>
            <div className="cloud05-slot-budget-choices" role="radiogroup" aria-label="Slots on each instance">
              {OPTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={picked === g}
                  disabled={done}
                  className={`w-chip w-mono cloud05-slot-budget-choice${picked === g ? " on" : ""}${done && g === truth ? " right" : ""}`}
                  onClick={() => pick(i, g)}
                >
                  {g}
                </button>
              ))}
            </div>
            {done && (
              <>
                <ul className="cloud05-slot-budget-rates" aria-label="Calls a minute for each option">
                  {OPTIONS.map((g) => {
                    const rate = perMinute(c, g);
                    return (
                      <li key={g} className={`w-chip cloud05-slot-budget-rate ${rate <= CAPACITY ? "good" : "bad"}${picked === g ? " picked" : ""}`}>
                        <span className="w-mono">{g}</span> slots: {rate} a minute
                      </li>
                    );
                  })}
                </ul>
                <p className={`cloud05-slot-budget-why ${picked === truth ? "ok" : "miss"}`} role="status">
                  <strong>
                    {picked === truth
                      ? "Correct. "
                      : perMinute(c, picked) > CAPACITY
                        ? `Over capacity. The best choice is ${truth}. `
                        : `Safe, but ${truth} fits. `}
                  </strong>
                  <span className="w-mono">
                    {c.instances} x {picked} = {inFlight} in flight, and {inFlight} / {c.seconds} x 60 = {perMinute(c, picked)} a minute.
                  </span>{" "}
                  {c.why}
                </p>
              </>
            )}
          </section>
        );
      })}
      {answered === CASES.length && (
        <div className="w-verdict good" role="status">
          The gate caps one process, so the fleet cap is instances times slots. Work out the calls a minute again whenever you change the instance count or the model.
        </div>
      )}
    </div>
  );
}
