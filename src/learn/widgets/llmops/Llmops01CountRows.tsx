import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Llmops01CountRows.css";

type Call = "good" | "bad" | "skip";

const CALLS: { id: Call; label: string }[] = [
  { id: "good", label: "Good" },
  { id: "bad", label: "Bad" },
  { id: "skip", label: "Not counted" },
];

type Row = { route: string; error: string | null; refused: boolean; stop: string | null; call: Call; why: string };

// Ten made-up trace rows. The rules are those of is_success, request_rows and is_finished in the lab.
const ROWS: Row[] = [
  {
    route: "ask",
    error: null,
    refused: false,
    stop: "done",
    call: "good",
    why: "No error, no refusal and the run finished with done. The person got an answer.",
  },
  {
    route: "ask",
    error: null,
    refused: true,
    stop: "refused",
    call: "bad",
    why: "The desk refused, so the person got no answer. The success SLO counts that as a failure, even when the refusal was right.",
  },
  {
    route: "agent",
    error: null,
    refused: false,
    stop: "done",
    call: "good",
    why: "A desk run that finished. The route agent is a person's request, so it counts.",
  },
  {
    route: "agent",
    error: null,
    refused: false,
    stop: "step_budget",
    call: "bad",
    why: "The run hit its step budget and stopped early. Any stop reason other than done is a failure.",
  },
  {
    route: "ask",
    error: null,
    refused: false,
    stop: "guard_blocked",
    call: "bad",
    why: "A guard blocked the question. The refused flag is False, because no model ever saw it. The stop reason still marks a failure.",
  },
  {
    route: "agent.search",
    error: null,
    refused: false,
    stop: "done",
    call: "skip",
    why: "A tool call inside a desk run. The run has its own row, so counting this one counts the same request twice.",
  },
  {
    route: "eval",
    error: null,
    refused: false,
    stop: "done",
    call: "skip",
    why: "A run from the eval harness. It is a test, not traffic.",
  },
  {
    route: "ask",
    error: "TimeoutError()",
    refused: false,
    stop: "error",
    call: "bad",
    why: "An error is a failure, whatever else the row says.",
  },
  {
    route: "agent",
    error: null,
    refused: false,
    stop: "awaiting_approval",
    call: "skip",
    why: "The run is paused for a person to approve. It has not finished, so no SLO counts it yet.",
  },
  {
    route: "search",
    error: null,
    refused: false,
    stop: null,
    call: "good",
    why: "No stop reason, as in every row from before migration 006. A missing stop reason reads as done.",
  },
];

const COUNTED = ROWS.filter((r) => r.call !== "skip").length;
const GOOD = ROWS.filter((r) => r.call === "good").length;

export default function Llmops01CountRows({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<(Call | null)[]>(ROWS.map(() => null));
  const [checked, setChecked] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const answered = picks.filter((p) => p !== null).length;
  const wrong = picks.filter((p, i) => p !== ROWS[i].call).length;
  const right = checked && wrong === 0;
  const showWhy = checked && (right || attempts >= 2);

  const set = (i: number, call: Call) => {
    if (checked) return;
    setPicks((p) => p.map((x, j) => (j === i ? call : x)));
  };

  const check = () => {
    const n = attempts + 1;
    setAttempts(n);
    setChecked(true);
    if (picks.every((p, i) => p === ROWS[i].call)) {
      complete("Counted all ten rows right");
    } else if (n >= 2) {
      complete("Saw the counting rules after two tries");
    }
  };

  return (
    <div className="w-panel llmops01-count-rows">
      <p className="w-label">Ten made-up trace rows</p>
      <p className="llmops01-count-rows-hint">
        Mark each row for the answer-success SLO. A good row is a success. A bad row counts against the SLO. A row that is not counted leaves the total alone. {answered} of {ROWS.length} marked.
      </p>
      <ol className="llmops01-count-rows-list">
        {ROWS.map((r, i) => {
          const picked = picks[i];
          const isRight = checked && picked === r.call;
          const isWrong = checked && picked !== r.call;
          return (
            <li key={i} className={`llmops01-count-rows-row${isRight ? " ok" : ""}${isWrong ? " bad" : ""}`}>
              <p className="llmops01-count-rows-fields w-mono">
                route={r.route} error={r.error ?? "None"} refused={r.refused ? "True" : "False"} stop_reason={r.stop ?? "None"}
              </p>
              <div className="llmops01-count-rows-opts" role="radiogroup" aria-label={`Row ${i + 1}`}>
                {CALLS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={picked === c.id}
                    disabled={checked}
                    className={`llmops01-count-rows-opt${picked === c.id ? " on" : ""}`}
                    onClick={() => set(i, c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              {showWhy && (
                <p className="llmops01-count-rows-why">
                  {isRight ? "Right. " : `Should be ${CALLS.find((c) => c.id === r.call)!.label.toLowerCase()}. `}
                  {r.why}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="w-row">
        {!checked ? (
          <button type="button" className="w-btn primary" disabled={answered < ROWS.length} onClick={check}>
            Check my count
          </button>
        ) : (
          !right && (
            <button type="button" className="w-btn ghost" onClick={() => setChecked(false)}>
              Change my marks
            </button>
          )
        )}
      </div>

      {checked && (
        <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
          {right
            ? `Correct. ${COUNTED} of the ${ROWS.length} rows count, and ${GOOD} are good. The attainment is ${GOOD} of ${COUNTED}, which is ${(GOOD / COUNTED).toFixed(3)}. Against a target of 0.95 that is a miss, because more than half the counted requests failed.`
            : showWhy
              ? `Not quite. ${COUNTED} rows count and ${GOOD} are good, so the attainment is ${(GOOD / COUNTED).toFixed(3)}. Read the reason under each row.`
              : `${wrong} ${wrong === 1 ? "row is" : "rows are"} marked wrong. Change your marks and try once more.`}
        </div>
      )}
    </div>
  );
}
