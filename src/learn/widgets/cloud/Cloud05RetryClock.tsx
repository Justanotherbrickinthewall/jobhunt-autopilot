import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud05RetryClock.css";

type Bucket = "under10" | "to60" | "to200" | "over200";
type Setup = { retries: number; hint: number | null; why: string };

// The numbers below are the defaults of `retry_delay` in quota.py: base 1 second and a cap of 30 seconds.
const BASE = 1;
const CAP = 30;
// The desk time budget from agents-06 and the request timeout in run.tf. Both are drawn as markers.
// CHECK: the 300 second request timeout is the value in run.tf, which calls it a guess. Cloud Run's own
// documented limit for the setting was not read. The 60 second budget is the agents-06 default.
const DESK_BUDGET = 60;
const REQUEST_TIMEOUT = 300;
const SCALE = 330;

const BUCKETS: { id: Bucket; label: string }[] = [
  { id: "under10", label: "Under 10 seconds" },
  { id: "to60", label: "10 to 60 seconds" },
  { id: "to200", label: "61 to 200 seconds" },
  { id: "over200", label: "Over 200 seconds" },
];

// The worst case wait before each retry. A server hint is used as it is, cut to the cap, with no jitter.
// With no hint, the ceiling doubles from the base until it reaches the cap, and the real wait is a random
// number from 0 up to that ceiling.
const waits = (retries: number, hint: number | null): number[] =>
  Array.from({ length: retries }, (_, i) => (hint !== null ? Math.min(hint, CAP) : Math.min(CAP, BASE * 2 ** i)));

const total = (s: Setup) => waits(s.retries, s.hint).reduce((a, b) => a + b, 0);

const bucketOf = (seconds: number): Bucket =>
  seconds < 10 ? "under10" : seconds <= 60 ? "to60" : seconds <= 200 ? "to200" : "over200";

const SETUPS: Setup[] = [
  {
    retries: 3,
    hint: null,
    why: "This is the production setting. Three retries wait at most 1, 2 and 4 seconds. The 60 second time budget barely notices.",
  },
  {
    retries: 5,
    hint: null,
    why: "Two more retries add ceilings of 8 and 16 seconds. The total stays inside the time budget, but a user can wait half a minute in the worst case.",
  },
  {
    retries: 3,
    hint: 34,
    why: "A hint of 34 seconds is cut to the cap of 30, and every retry uses it as it is, with no jitter. The retries alone use more than the 60 second time budget.",
  },
  {
    retries: 8,
    hint: null,
    why: "The ceiling reaches the cap of 30 seconds at the sixth retry. After that each retry adds the full 30 seconds, so the doubling stops helping.",
  },
  {
    retries: 10,
    hint: 34,
    why: "Ten waits of 30 seconds add up to 300 seconds, the same as the request timeout in run.tf. The service cuts the request off before the retry loop has finished.",
  },
];

export default function Cloud05RetryClock({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<(Bucket | null)[]>(SETUPS.map(() => null));

  const pick = (i: number, said: Bucket) => {
    if (picks[i] !== null) return;
    const next = picks.map((p, j) => (j === i ? said : p));
    setPicks(next);
    if (next.every((p) => p !== null)) {
      const right = next.filter((p, j) => p === bucketOf(total(SETUPS[j]))).length;
      complete(`${right} of ${SETUPS.length} waits called right`);
    }
  };

  const answered = picks.filter((p) => p !== null).length;

  return (
    <div className="w-panel cloud05-retry-clock">
      <p className="cloud05-retry-clock-hint">
        Illustrative figures. Each card is one chat model call that gets a 429 on every try. Predict the longest total wait before the call gives up. The formula is the one in <span className="w-mono">retry_delay</span>, with a base of 1 second and a cap of 30. {answered} of {SETUPS.length} answered.
      </p>
      {SETUPS.map((s, i) => {
        const truth = bucketOf(total(s));
        const picked = picks[i];
        const done = picked !== null;
        const list = waits(s.retries, s.hint);
        const sum = total(s);
        return (
          <section key={`${s.retries}-${s.hint}`} className="cloud05-retry-clock-card" aria-label={`Setting ${i + 1}`}>
            <p className="cloud05-retry-clock-config">
              <span className="w-mono">VERTEX_MAX_RETRIES={s.retries}</span>
              {s.hint === null ? " and no wait asked for by the server" : ` and a server hint of ${s.hint} seconds on every 429`}
            </p>
            <div className="cloud05-retry-clock-choices" role="radiogroup" aria-label="Longest total wait">
              {BUCKETS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="radio"
                  aria-checked={picked === b.id}
                  disabled={done}
                  className={`w-chip cloud05-retry-clock-choice${picked === b.id ? " on" : ""}${done && b.id === truth ? " right" : ""}`}
                  onClick={() => pick(i, b.id)}
                >
                  {b.label}
                </button>
              ))}
            </div>
            {done && (
              <>
                <div
                  className="cloud05-retry-clock-track"
                  role="img"
                  aria-label={`The longest total wait is ${sum} seconds. The desk time budget is ${DESK_BUDGET} seconds and the request timeout is ${REQUEST_TIMEOUT} seconds.`}
                >
                  <span className="cloud05-retry-clock-fill" style={{ width: `${Math.min(100, (sum / SCALE) * 100)}%` }} />
                  <span className="cloud05-retry-clock-mark" style={{ left: `${(DESK_BUDGET / SCALE) * 100}%` }} />
                  <span className="cloud05-retry-clock-mark timeout" style={{ left: `${(REQUEST_TIMEOUT / SCALE) * 100}%` }} />
                </div>
                <p className="cloud05-retry-clock-legend">
                  Left marker: the 60 second desk time budget. Right marker: the 300 second request timeout.
                </p>
                <p className={`cloud05-retry-clock-why ${picked === truth ? "ok" : "miss"}`} role="status">
                  <strong>{picked === truth ? "Correct. " : "Missed. "}</strong>
                  <span className="w-mono">{list.join(" + ")} = {sum} seconds.</span> {s.why}
                </p>
              </>
            )}
          </section>
        );
      })}
      {answered === SETUPS.length && (
        <div className="w-verdict good" role="status">
          The retry count and the server hint set the worst case wait, and a hint raises it to the cap on every retry. Keep the total under the time budget of the desk run, and far under the request timeout.
        </div>
      )}
    </div>
  );
}
