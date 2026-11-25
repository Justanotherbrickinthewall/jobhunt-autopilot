import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Llmops01BurnRate.css";

const REQUESTS = 1000;
const WINDOW_DAYS = 28;

type Card = { id: string; target: number; bad: number; what: string };

// Illustrative counts. The targets are those of the chapter's slos.json.
const CARDS: Card[] = [
  { id: "answer-success", target: 0.95, bad: 60, what: "requests that gave no answer" },
  { id: "total-latency", target: 0.95, bad: 40, what: "requests slower than 10 seconds" },
  { id: "guard-block-rate", target: 0.97, bad: 45, what: "requests blocked by a guard" },
];

const burn = (bad: number, total: number, target: number) => bad / total / (1 - target);
const one = (x: number) => x.toFixed(1);
const upTo2 = (x: number) => String(Number(x.toFixed(2)));
const FASTEST = CARDS.map((c) => burn(c.bad, REQUESTS, c.target)).reduce(
  (best, b, i, all) => (b > all[best] ? i : best),
  0,
);

const TARGETS = [0.9, 0.95, 0.97, 0.99, 0.999];

export default function Llmops01BurnRate({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [pick, setPick] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [target, setTarget] = useState(0.95);
  const [bad, setBad] = useState(30);

  const right = revealed && pick === FASTEST;
  const showWhy = revealed && (right || attempts >= 2);
  const done = right || showWhy;

  const check = () => {
    if (pick === null) return;
    const n = attempts + 1;
    setAttempts(n);
    setRevealed(true);
    if (pick === FASTEST) complete("Found the fastest burn from the targets, not the counts");
    else if (n >= 2) complete("Saw the burn rates after two tries");
  };

  const rate = burn(bad, REQUESTS, target);
  const days = rate > 0 ? WINDOW_DAYS / rate : null;
  const share14 = 14.4 * (1 - target);

  return (
    <div className="w-panel llmops01-burn-rate">
      <p className="w-label">Illustrative figures</p>
      <p className="llmops01-burn-rate-hint">
        Three SLOs each saw {REQUESTS.toLocaleString("en-GB")} requests in the same hour. The counts of bad requests differ, and so do the targets. Which SLO is spending its error budget fastest?
      </p>

      <div className="llmops01-burn-rate-cards" role="radiogroup" aria-label="The SLO that burns fastest">
        {CARDS.map((c, i) => {
          const allowed = Math.round(REQUESTS * (1 - c.target));
          const isFast = showWhy && i === FASTEST;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={pick === i}
              disabled={revealed && done}
              className={`llmops01-burn-rate-card${pick === i ? " on" : ""}${isFast ? " right" : ""}`}
              onClick={() => {
                setPick(i);
                setRevealed(false);
              }}
            >
              <span className="w-mono llmops01-burn-rate-name">{c.id}</span>
              <span className="llmops01-burn-rate-line">Target {c.target}</span>
              <span className="llmops01-burn-rate-line">
                {c.bad} {c.what}
              </span>
              {showWhy && (
                <span className="llmops01-burn-rate-sum">
                  The target allows {allowed} bad per {REQUESTS.toLocaleString("en-GB")}. Burn rate {c.bad} / {allowed} = {one(burn(c.bad, REQUESTS, c.target))}. At that rate the 28-day budget lasts {one(WINDOW_DAYS / burn(c.bad, REQUESTS, c.target))} days.
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!done && (
        <div className="w-row">
          <button type="button" className="w-btn primary" disabled={pick === null} onClick={check}>
            Check my pick
          </button>
        </div>
      )}

      {revealed && (
        <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
          {right
            ? `Correct. ${CARDS[FASTEST].id} burns at ${one(burn(CARDS[FASTEST].bad, REQUESTS, CARDS[FASTEST].target))}, the fastest of the three, though answer-success has the most bad requests. The burn rate divides the bad share by the share the target allows, so a tighter target burns faster for the same count.`
            : showWhy
              ? `Not quite. The fastest burn is ${CARDS[FASTEST].id}, at ${one(burn(CARDS[FASTEST].bad, REQUESTS, CARDS[FASTEST].target))}. Compare each count with what its target allows, not with the other counts.`
              : "That is not the fastest. Compare each count with what its own target allows, not with the other counts. You have one more try."}
        </div>
      )}

      {done && (
        <div className="llmops01-burn-rate-play" role="group" aria-label="Burn rate calculator">
          <p className="w-label">Try your own numbers, for {REQUESTS.toLocaleString("en-GB")} requests</p>
          <div className="w-row" role="radiogroup" aria-label="Target">
            {TARGETS.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={target === t}
                className={`w-chip w-mono${target === t ? " is-on" : ""}`}
                onClick={() => setTarget(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <label className="llmops01-burn-rate-slider">
            <span>
              Bad requests: <strong>{bad}</strong> of {REQUESTS.toLocaleString("en-GB")}
            </span>
            <input type="range" min={0} max={200} step={1} value={bad} onChange={(e) => setBad(Number(e.target.value))} />
          </label>
          <p className="llmops01-burn-rate-out w-inset">
            The target allows {one(REQUESTS * (1 - target))} bad requests. The burn rate is {one(rate)}.{" "}
            {days === null
              ? "Nothing is burning."
              : `The 28-day budget lasts ${one(days)} days at this rate.`}{" "}
            A burn rate of 14.4 needs {share14 >= 1 ? "more than every request to fail, so this target can never reach it" : `${upTo2(share14 * 100)}% of requests to fail`}.
          </p>
        </div>
      )}
    </div>
  );
}
