import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents06BudgetCheck.css";

type Reason = "step_budget" | "token_budget" | "time_budget" | "loop" | "None";
type Run = {
  title: string;
  steps: number;
  tokensIn: number;
  tokensOut: number;
  elapsed: number | null; // null: started_at is not set
  sameCalls: number; // identical tool calls at the end of the run
  why: string;
};

// The default budget from Settings: desk_max_steps, desk_max_tokens, desk_max_seconds, desk_loop_repeats.
const BUDGET = { steps: 12, tokens: 20000, seconds: 60, repeats: 3 };
const CHOICES: Reason[] = ["step_budget", "token_budget", "time_budget", "loop", "None"];

type Row = { label: string; value: string; limit: string; reached: boolean; reason: Reason };

// The same order as check_budget in askpep/agents/budget.py.
function rows(r: Run): Row[] {
  const tokens = r.tokensIn + r.tokensOut;
  return [
    { label: "Steps", value: String(r.steps), limit: String(BUDGET.steps), reached: r.steps >= BUDGET.steps, reason: "step_budget" },
    { label: "Tokens", value: tokens.toLocaleString("en-GB"), limit: BUDGET.tokens.toLocaleString("en-GB"), reached: tokens >= BUDGET.tokens, reason: "token_budget" },
    {
      label: "Time",
      value: r.elapsed === null ? "no start time" : `${r.elapsed} s`,
      limit: `${BUDGET.seconds} s`,
      reached: r.elapsed !== null && r.elapsed >= BUDGET.seconds,
      reason: "time_budget",
    },
    { label: "Repeated calls", value: `${r.sameCalls} identical`, limit: String(BUDGET.repeats), reached: r.sameCalls >= BUDGET.repeats, reason: "loop" },
  ];
}

function checkBudget(r: Run): Reason {
  return rows(r).find((x) => x.reached)?.reason ?? "None";
}

const RUNS: Run[] = [
  {
    title: "Every counter is one short of its limit",
    steps: 11,
    tokensIn: 12000,
    tokensOut: 7999,
    elapsed: 59.9,
    sameCalls: 2,
    why: "Steps and tokens stop at the limit, so 11 of 12 and 19,999 of 20,000 are still inside. The time is 0.1 seconds short, and two identical calls are one short of three. The run goes on.",
  },
  {
    title: "Every limit is reached at once",
    steps: 12,
    tokensIn: 18000,
    tokensOut: 4000,
    elapsed: 80,
    sameCalls: 3,
    why: "All four limits are reached, and the function returns at the first one it tests. Steps come first in the order, so the user sees the message for step_budget.",
  },
  {
    title: "Tokens and time are both over",
    steps: 7,
    tokensIn: 17000,
    tokensOut: 4500,
    elapsed: 72,
    sameCalls: 1,
    why: "Tokens come before time in the order. The run used 21,500 tokens, so the token stop wins even though the clock also ran out.",
  },
  {
    title: "Time is over and the last three calls match",
    steps: 9,
    tokensIn: 6000,
    tokensOut: 900,
    elapsed: 75,
    sameCalls: 3,
    why: "Time comes before repeated calls. The repeated-call check scans the messages and goes last, so it only decides a run that every cheaper test let through.",
  },
  {
    title: "Only the repeated-call check fires",
    steps: 6,
    tokensIn: 4000,
    tokensOut: 300,
    elapsed: 20,
    sameCalls: 3,
    why: "Steps, tokens and time are all well inside their limits. Three identical calls in a row are the only problem, so the reason is loop.",
  },
  {
    title: "The state has no start time",
    steps: 3,
    tokensIn: 1000,
    tokensOut: 100,
    elapsed: null,
    sameCalls: 1,
    why: "The time test runs only when started_at is set. With no start time there is no time limit, and nothing else is near its limit.",
  },
];

export default function Agents06BudgetCheck({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<(Reason | null)[]>(RUNS.map(() => null));

  const pick = (i: number, said: Reason) => {
    if (picks[i] !== null) return;
    const next = picks.map((p, j) => (j === i ? said : p));
    setPicks(next);
    if (next.every((p) => p !== null)) {
      const right = next.filter((p, j) => p === checkBudget(RUNS[j])).length;
      complete(`${right} of ${RUNS.length} check_budget results predicted`);
    }
  };

  const answered = picks.filter((p) => p !== null).length;

  return (
    <div className="w-panel agents06-budget-check">
      <p className="agents06-budget-check-hint">
        The budget is {BUDGET.steps} steps, {BUDGET.tokens.toLocaleString("en-GB")} tokens, {BUDGET.seconds} seconds and {BUDGET.repeats} repeats. Each card is one run. Predict what <span className="w-mono">check_budget</span> returns. {answered} of {RUNS.length} answered.
      </p>
      {RUNS.map((r, i) => {
        const truth = checkBudget(r);
        const picked = picks[i];
        const done = picked !== null;
        const table = rows(r);
        return (
          <section key={r.title} className="agents06-budget-check-card" aria-label={`Run ${i + 1}: ${r.title}`}>
            <h4 className="agents06-budget-check-title">{r.title}</h4>
            <dl className="agents06-budget-check-state">
              {table.map((row) => (
                <div key={row.label} className={`agents06-budget-check-row${done && row.reached ? " reached" : ""}${done && row.reason === truth ? " returned" : ""}`}>
                  <dt>{row.label}</dt>
                  <dd className="w-mono">
                    {row.value}
                    <span className="agents06-budget-check-limit"> of {row.limit}</span>
                    {done && <span className="agents06-budget-check-flag">{row.reason === truth ? "returned" : row.reached ? "also reached" : "inside"}</span>}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="agents06-budget-check-choices" role="radiogroup" aria-label="What check_budget returns">
              {CHOICES.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={picked === c}
                  disabled={done}
                  className={`w-chip w-mono agents06-budget-check-choice${picked === c ? " on" : ""}${done && c === truth ? " right" : ""}`}
                  onClick={() => pick(i, c)}
                >
                  {c}
                </button>
              ))}
            </div>
            {done && (
              <p className={`agents06-budget-check-why ${picked === truth ? "ok" : "miss"}`} role="status">
                <strong>{picked === truth ? "Correct. " : `Missed. It returns ${truth}. `}</strong>
                {r.why}
              </p>
            )}
          </section>
        );
      })}
      {answered === RUNS.length && (
        <div className="w-verdict good" role="status">
          The order is steps, tokens, time, then repeated calls. When two limits are reached together, the earlier test decides which message the user sees. The cheap numeric tests run before the one that scans messages.
        </div>
      )}
    </div>
  );
}
