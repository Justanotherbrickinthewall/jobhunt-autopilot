import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Llmops06CounterMatrix.css";

// The five counters of the lab, with the filter each one uses written as a rule over one log line.
type Line = Record<string, string | boolean | number | null>;
type Counter = "askpep_requests" | "askpep_requests_failed" | "askpep_guard_blocked" | "askpep_budget_stops" | "askpep_tool_errors";

const COUNTERS: { id: Counter; filter: string }[] = [
  { id: "askpep_requests", filter: "request_done lines, except a run paused for approval" },
  { id: "askpep_requests_failed", filter: "the same lines, with success false" },
  { id: "askpep_guard_blocked", filter: "the same lines, with guard_blocked true" },
  { id: "askpep_budget_stops", filter: "budget_stop lines" },
  { id: "askpep_tool_errors", filter: "tool_error lines" },
];

const finished = (l: Line) => l.message === "request_done" && l.stop_reason !== "awaiting_approval";
const RULES: Record<Counter, (l: Line) => boolean> = {
  askpep_requests: finished,
  askpep_requests_failed: (l) => finished(l) && l.success === false,
  askpep_guard_blocked: (l) => finished(l) && l.guard_blocked === true,
  askpep_budget_stops: (l) => l.message === "budget_stop",
  askpep_tool_errors: (l) => l.message === "tool_error",
};

// Illustrative lines. Real lines carry more fields, which no counter reads.
type Case = { title: string; line: Line; why: string };
const CASES: Case[] = [
  {
    title: "A question the desk answers",
    line: { message: "request_done", route: "ask", status: "ok", success: true, stop_reason: "done", guard_blocked: false },
    why: "A finished request adds to the total once. Nothing failed, so no other counter moves.",
  },
  {
    title: "The model declines to answer",
    line: { message: "request_done", route: "agent", status: "refused", success: false, stop_reason: "refused", guard_blocked: false },
    why: "A refusal gives the person no answer, so chapter 1 counts it as a failure. It was not a guard block.",
  },
  {
    title: "A guard blocks the question",
    line: { message: "request_done", route: "ask", status: "blocked", success: false, stop_reason: "guard_blocked", guard_blocked: true },
    why: "One line adds to three counters. The request finished, it failed, and a guard blocked it.",
  },
  {
    title: "The guard_blocked event of that same block",
    line: { message: "guard_blocked", route: "ask" },
    why: "No counter reads this line. It is there for a person who searches the logs. The request line above already counted the block.",
  },
  {
    title: "A desk run reaches its step budget",
    line: { message: "request_done", route: "agent", status: "stopped", success: false, stop_reason: "step_budget", guard_blocked: false },
    why: "A stopped run is a failed request. The request line counts it, and the budget_stop event below counts the stop.",
  },
  {
    title: "The budget_stop event of that same run",
    line: { message: "budget_stop", route: "agent", stop_reason: "step_budget" },
    why: "This line feeds its own counter, so the dashboard can chart budget stops apart from other failures.",
  },
  {
    title: "A run pauses to ask a person for approval",
    line: { message: "request_done", route: "agent", status: "awaiting_approval", success: false, stop_reason: "awaiting_approval", guard_blocked: false },
    why: "The run has not finished. Its success is false, but it is not a failure. Left in, every approval would spend error budget, so the filter leaves it out.",
  },
  {
    title: "A tool call fails",
    line: { message: "tool_error", tool: "search_peps", error: "TimeoutError()" },
    why: "The desk's tools log this line when a call fails. Only the tool error counter reads it.",
  },
];

const show = (l: Line) =>
  "{ " +
  Object.entries(l)
    .map(([k, v]) => `${k}: ${typeof v === "string" ? `"${v}"` : String(v)}`)
    .join(", ") +
  " }";

const truth = (l: Line): Counter[] => COUNTERS.filter((c) => RULES[c.id](l)).map((c) => c.id);
const same = (a: Counter[], b: Counter[]) => a.length === b.length && a.every((x) => b.includes(x));

export default function Llmops06CounterMatrix({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<Counter[][]>(CASES.map(() => []));
  const [checked, setChecked] = useState<boolean[]>(CASES.map(() => false));

  const toggle = (i: number, id: Counter) => {
    if (checked[i]) return;
    setPicks(picks.map((p, j) => (j !== i ? p : p.includes(id) ? p.filter((x) => x !== id) : [...p, id])));
  };

  const check = (i: number) => {
    if (checked[i]) return;
    const next = checked.map((c, j) => (j === i ? true : c));
    setChecked(next);
    if (next.every(Boolean)) {
      const exact = CASES.filter((c, j) => same(picks[j], truth(c.line))).length;
      complete(`${exact} of ${CASES.length} lines predicted exactly`);
    }
  };

  const done = checked.filter(Boolean).length;

  return (
    <div className="w-panel llmops06-counter-matrix">
      <p className="w-label">Illustrative log lines</p>
      <p className="llmops06-counter-matrix-hint">
        Each card is one log line. Pick every counter that adds one to it, then check. A card can add to several counters or to none. {done} of {CASES.length} checked.
      </p>
      <dl className="llmops06-counter-matrix-rules">
        {COUNTERS.map((c) => (
          <div key={c.id} className="llmops06-counter-matrix-rule">
            <dt className="w-mono">{c.id}</dt>
            <dd>{c.filter}</dd>
          </div>
        ))}
      </dl>
      {CASES.map((c, i) => {
        const isChecked = checked[i];
        const right = truth(c.line);
        const exact = same(picks[i], right);
        return (
          <section key={c.title} className="llmops06-counter-matrix-card" aria-label={`Line ${i + 1}: ${c.title}`}>
            <h4 className="llmops06-counter-matrix-title">{c.title}</h4>
            <p className="w-mono llmops06-counter-matrix-line">{show(c.line)}</p>
            <div className="llmops06-counter-matrix-choices" role="group" aria-label="Counters this line adds to">
              {COUNTERS.map((k) => {
                const on = picks[i].includes(k.id);
                const should = right.includes(k.id);
                const cls = isChecked ? (should && on ? " good" : should ? " warn" : on ? " bad" : "") : on ? " is-on" : "";
                return (
                  <button
                    key={k.id}
                    type="button"
                    aria-pressed={on}
                    disabled={isChecked}
                    className={`w-chip w-mono llmops06-counter-matrix-choice${cls}`}
                    onClick={() => toggle(i, k.id)}
                  >
                    {k.id}
                  </button>
                );
              })}
            </div>
            {!isChecked && (
              <div>
                <button type="button" className="w-btn small" onClick={() => check(i)}>
                  Check this line
                </button>
              </div>
            )}
            {isChecked && (
              <p className={`llmops06-counter-matrix-why ${exact ? "ok" : "miss"}`} role="status">
                <strong>
                  {exact
                    ? "Correct. "
                    : right.length === 0
                      ? "Missed. No counter reads this line. "
                      : `Missed. The counters are ${right.join(" and ")}. `}
                </strong>
                {c.why}
              </p>
            )}
          </section>
        );
      })}
      {done === CASES.length && (
        <div className="w-verdict good" role="status">
          Two of the eight lines add to no counter. Every counter reads the finished request line, or one of the two event lines, and one stopped run writes both kinds. The filters decide what a metric counts, so a field the log line lacks is a number you can never chart.
        </div>
      )}
    </div>
  );
}
