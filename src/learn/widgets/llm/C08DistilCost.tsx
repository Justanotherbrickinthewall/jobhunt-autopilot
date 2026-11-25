import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C08DistilCost.css";

// Illustrative figures, hand-authored for teaching. They are not real vendor prices.
const IN_TOK = 500;
const OUT_TOK = 20;
const LARGE = { inPerM: 3, outPerM: 15 };
const SMALL = { inPerM: 0.3, outPerM: 1.2 };
const HOURLY_HOSTING_MONTH = 365; // 0.50 pounds an hour x 730 hours
const LABEL_LINES = 5000;
const REVIEW_LABELS = 500;
const REVIEW_SECONDS = 30;
const REVIEW_RATE = 40;
const TRAIN_RUNS = 3;
const TRAIN_RUN_COST = 50;

const perLine = (p: { inPerM: number; outPerM: number }) => (IN_TOK * p.inPerM + OUT_TOK * p.outPerM) / 1e6;
const labelling = LABEL_LINES * perLine(LARGE);
const review = (REVIEW_LABELS * REVIEW_SECONDS) / 3600 * REVIEW_RATE;
const training = TRAIN_RUNS * TRAIN_RUN_COST;
const ONE_OFF = labelling + review + training;

type Option = "keep" | "distil";
type Case = { id: string; label: string; lines: number; hosting: "hourly" | "token"; why?: string };
const CASES: Case[] = [
  { id: "a", label: "20,000 lines a month, tuned model billed by the hour", lines: 20000, hosting: "hourly" },
  { id: "b", label: "200,000 lines a month, tuned model billed by the hour", lines: 200000, hosting: "hourly" },
  { id: "c", label: "2,000,000 lines a month, tuned model billed by the hour", lines: 2000000, hosting: "hourly" },
  { id: "d", label: "200,000 lines a month, tuned model billed per token with no hourly fee", lines: 200000, hosting: "token" },
];

const twelve = (c: Case) => {
  const large = c.lines * 12 * perLine(LARGE);
  const fixed = c.hosting === "hourly" ? 12 * HOURLY_HOSTING_MONTH : 0;
  const distil = ONE_OFF + c.lines * 12 * perLine(SMALL) + fixed;
  return { large, distil, best: (distil < large ? "distil" : "keep") as Option };
};

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-GB")}`;

export default function C08DistilCost({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<Record<string, Option>>({});
  const [attempts, setAttempts] = useState(0);
  const [done, setDone] = useState(false);

  const allPicked = CASES.every((c) => picks[c.id]);
  const miss = CASES.filter((c) => picks[c.id] !== twelve(c).best);

  const check = () => {
    const n = attempts + 1;
    setAttempts(n);
    if (miss.length === 0) {
      setDone(true);
      complete("Priced twelve months and chose correctly in all four cases");
    } else if (n >= 2) {
      setDone(true);
      complete(`Got ${CASES.length - miss.length} of ${CASES.length}; read the twelve-month totals`);
    }
  };

  return (
    <div className="w-panel llm-distil-cost">
      <p className="llm-distil-cost-note">
        Illustrative prices, not any vendor's. A line is {IN_TOK} input and {OUT_TOK} output tokens. The large model costs {usd(perLine(LARGE) * 1e6)} per million lines and the small tuned model costs {usd(perLine(SMALL) * 1e6)}. The small model passes the same eval. One-off cost: labelling {usd(labelling)}, review {usd(review)}, training {usd(training)}, total {usd(ONE_OFF)}. Hourly hosting is {usd(HOURLY_HOSTING_MONTH)} a month.
      </p>

      <ul className="llm-distil-cost-list">
        {CASES.map((c) => {
          const t = twelve(c);
          const bad = attempts > 0 && picks[c.id] !== t.best;
          return (
            <li key={c.id} className={`llm-distil-cost-item${bad ? " miss" : ""}`}>
              <p className="llm-distil-cost-text">{c.label}</p>
              <div className="w-row" role="group" aria-label={c.label}>
                <button type="button" className="w-chip" aria-pressed={picks[c.id] === "keep"} disabled={done} onClick={() => setPicks((p) => ({ ...p, [c.id]: "keep" }))}>
                  Keep the large model
                </button>
                <button type="button" className="w-chip" aria-pressed={picks[c.id] === "distil"} disabled={done} onClick={() => setPicks((p) => ({ ...p, [c.id]: "distil" }))}>
                  Distil into a small model
                </button>
              </div>
              {done && (
                <p className="llm-distil-cost-why w-mono">
                  Large model, twelve months: {usd(t.large)}. Distilled, twelve months: {usd(t.distil)}. {t.best === "keep" ? "Keep the large model." : "Distil."}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {!done && (
        <div className="w-row">
          <button type="button" className="w-btn" disabled={!allPicked} onClick={check}>
            {attempts === 0 ? "Check my choices" : "Check again"}
          </button>
        </div>
      )}
      {attempts > 0 && !done && (
        <div className="w-verdict bad" role="status">
          {CASES.length - miss.length} of {CASES.length} are right. Add the one-off cost and twelve months of hosting to the distilled side before you compare.
        </div>
      )}
      {done && (
        <div className={`w-verdict ${miss.length === 0 ? "good" : "bad"}`} role="status">
          {miss.length === 0 ? "All four are right. " : `${CASES.length - miss.length} of ${CASES.length} right. `}
          With hourly hosting the break-even is near 241,000 lines a month. Remove the hourly fee and distilling wins at 200,000 lines. The fixed hosting cost, not the training, decides the low-volume cases.
        </div>
      )}
    </div>
  );
}
