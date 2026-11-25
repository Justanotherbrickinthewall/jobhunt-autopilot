import { useMemo, useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import { bootstrapCi, sample } from "./Evals08Interval";
import "./Evals08GateVerdict.css";

// Illustrative figures. The limits are the ones in evals/gate.json. The baseline is a made-up accepted run.
type Rule = { slice: string; metric: string; n: number; floor?: number; ceiling?: number; baseline: number };
const RULES: Rule[] = [
  { slice: "retrieval", metric: "recall@6", n: 20, floor: 0.8, baseline: 1.0 },
  { slice: "routing", metric: "route_accuracy", n: 16, floor: 0.9, baseline: 0.94 },
  { slice: "answer", metric: "answer_pass", n: 14, floor: 0.8, baseline: 0.93 },
  { slice: "action", metric: "trajectory_pass", n: 12, floor: 0.8, baseline: 0.92 },
  { slice: "attack", metric: "attack_success_rate", n: 25, ceiling: 0.05, baseline: 0.04 },
];

// Items that pass for each floor slice, and items where the attack got through for the attack slice.
type Change = { title: string; note: string; counts: Record<string, number>; why: string };
const BASE = { retrieval: 20, routing: 15, answer: 13, action: 11, attack: 1 };
const CHANGES: Change[] = [
  {
    title: "A reworded desk prompt",
    note: "The answer and action slices each lose one item. Nothing else moves.",
    counts: { ...BASE, answer: 12, action: 10 },
    why: "One item is 7 or 8 points on slices this small. Both rates stay above their floors, and both intervals reach 1.00, which is above their baselines.",
  },
  {
    title: "A new chunk size",
    note: "Retrieval loses four items. Everything else matches the baseline.",
    counts: { ...BASE, retrieval: 16 },
    why: "The rate, 0.80, equals the floor of 0.80, so the floor passes it. The interval tops out at 0.95, wholly below a baseline of 1.00. Only the baseline rule catches it, and a gate with floors alone would ship it.",
  },
  {
    title: "A re-indexed corpus",
    note: "Retrieval loses two items. Everything else matches the baseline.",
    counts: { ...BASE, retrieval: 18 },
    why: "Two lost items on 20 leave an interval that still reaches 1.00. The baseline rule stays quiet, and the rate is above the floor.",
  },
  {
    title: "A cheaper model for the answer step",
    note: "The answer slice loses two items. Everything else matches the baseline.",
    counts: { ...BASE, answer: 11 },
    why: "11 of 14 is 0.79, under the floor of 0.80. The floor fails it, and the interval does not matter.",
  },
  {
    title: "A looser guard",
    note: "Every floor slice passes every item. Three attacks get through.",
    counts: { retrieval: 20, routing: 16, answer: 14, action: 12, attack: 3 },
    why: "Three slices improved and retrieval holds at 1.00, and the attack slice is at 0.12 against a ceiling of 0.05. The gate reads every slice, so the average does not rescue it.",
  },
];

const GATE = { resamples: 1000, confidence: 0.95, seed: 1 };
const two = (x: number) => x.toFixed(2);

type Row = {
  rule: Rule;
  count: number;
  rate: number;
  low: number;
  high: number;
  reasons: string[];
};

function judge(rule: Rule, count: number): Row {
  // For the attack slice, True means the attack got through, so the count is of successes.
  const iv = bootstrapCi(sample(count, rule.n), GATE.resamples, GATE.confidence, GATE.seed);
  const reasons: string[] = [];
  if (rule.floor !== undefined && iv.rate < rule.floor) reasons.push(`${rule.metric} ${two(iv.rate)} is below the floor ${two(rule.floor)}`);
  if (rule.ceiling !== undefined && iv.rate > rule.ceiling) reasons.push(`${rule.metric} ${two(iv.rate)} is above the ceiling ${two(rule.ceiling)}`);
  if (rule.floor !== undefined && iv.high < rule.baseline) reasons.push(`the interval ${two(iv.low)} to ${two(iv.high)} is below the baseline ${two(rule.baseline)}`);
  if (rule.ceiling !== undefined && iv.low > rule.baseline) reasons.push(`the interval ${two(iv.low)} to ${two(iv.high)} is above the baseline ${two(rule.baseline)}`);
  return { rule, count, rate: iv.rate, low: iv.low, high: iv.high, reasons };
}

type Pick = 0 | 1;

export default function Evals08GateVerdict({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<(Pick | null)[]>(CHANGES.map(() => null));

  const judged = useMemo(() => CHANGES.map((c) => RULES.map((r) => judge(r, c.counts[r.slice]))), []);
  const exitCode = (i: number): Pick => (judged[i].every((row) => row.reasons.length === 0) ? 0 : 1);

  const pick = (i: number, said: Pick) => {
    if (picks[i] !== null) return;
    const next = picks.map((p, j) => (j === i ? said : p));
    setPicks(next);
    if (next.every((p) => p !== null)) {
      const right = next.filter((p, j) => p === exitCode(j)).length;
      complete(`${right} of ${CHANGES.length} gate exit codes predicted`);
    }
  };

  const answered = picks.filter((p) => p !== null).length;

  return (
    <div className="w-panel evals08-gate-verdict">
      <p className="w-label">Illustrative figures</p>
      <p className="evals08-gate-verdict-hint">
        The limits are the ones in <span className="w-mono">evals/gate.json</span>. The baseline is a made-up accepted run. Each card is a change and the counts it produces. Predict the exit code of <span className="w-mono">askpep eval gate</span>. {answered} of {CHANGES.length} answered.
      </p>
      <dl className="evals08-gate-verdict-rules">
        {RULES.map((r) => (
          <div key={r.slice} className="evals08-gate-verdict-rule">
            <dt className="w-mono">{r.slice}</dt>
            <dd>
              {r.n} items, {r.metric}, {r.floor !== undefined ? `floor ${two(r.floor)}` : `ceiling ${two(r.ceiling as number)}`}, baseline {two(r.baseline)}
            </dd>
          </div>
        ))}
      </dl>
      {CHANGES.map((c, i) => {
        const picked = picks[i];
        const done = picked !== null;
        const truth = exitCode(i);
        return (
          <section key={c.title} className="evals08-gate-verdict-card" aria-label={`Change ${i + 1}: ${c.title}`}>
            <h4 className="evals08-gate-verdict-title">{c.title}</h4>
            <p className="evals08-gate-verdict-note">{c.note}</p>
            <ul className="evals08-gate-verdict-rows">
              {judged[i].map((row) => {
                const failed = row.reasons.length > 0;
                const attack = row.rule.slice === "attack";
                return (
                  <li key={row.rule.slice} className={`evals08-gate-verdict-row${done && failed ? " failed" : ""}`}>
                    <span className="w-mono evals08-gate-verdict-name">{row.rule.slice}</span>
                    <span>
                      {row.count} of {row.rule.n} {attack ? "got through" : "pass"}
                    </span>
                    {done && (
                      <span className="evals08-gate-verdict-detail">
                        rate {two(row.rate)}, interval {two(row.low)} to {two(row.high)}.{" "}
                        <strong>{failed ? `Fails: ${row.reasons.join("; ")}.` : "Passes."}</strong>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="evals08-gate-verdict-choices" role="radiogroup" aria-label="Exit code">
              {([0, 1] as Pick[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={picked === p}
                  disabled={done}
                  className={`w-chip w-mono evals08-gate-verdict-choice${picked === p ? " on" : ""}${done && p === truth ? " right" : ""}`}
                  onClick={() => pick(i, p)}
                >
                  {p === 0 ? "Exit 0, it ships" : "Exit 1, it is blocked"}
                </button>
              ))}
            </div>
            {done && (
              <p className={`evals08-gate-verdict-why ${picked === truth ? "ok" : "miss"}`} role="status">
                <strong>{picked === truth ? "Correct. " : `Missed. The exit code is ${truth}. `}</strong>
                {c.why}
              </p>
            )}
          </section>
        );
      })}
      {answered === CHANGES.length && (
        <div className="w-verdict good" role="status">
          Three of the five changes are blocked, by a floor, by the baseline rule and by a ceiling. Two ship, and each lost items. The gate does not ask whether a number moved. It asks whether a limit was crossed or whether the drop is bigger than the noise.
        </div>
      )}
    </div>
  );
}
