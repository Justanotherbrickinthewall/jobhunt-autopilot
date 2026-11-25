import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Evals06PathGrader.css";

// Four scripted runs of action item t10, graded by the same three checks as grade_trajectory in the lab.
// The runs are invented to show one defect each. They are not output from a live desk.

const EXPECTED = ["search_peps", "open_ticket"];
const MAX_STEPS = 9;
const COMPLETED = ["done", "awaiting_approval"];

type Kind = "tool" | "handoff";
type Step = { agent: string; kind: Kind; name: string; ok: boolean };
type Status = "done" | "awaiting_approval" | "stopped";
type Run = { title: string; story: string; trajectory: Step[]; steps: number; status: Status; stopReason?: string };
type CheckId = "tools" | "steps" | "finished";

const t = (agent: string, name: string, ok = true): Step => ({ agent, kind: "tool", name, ok });
const h = (agent: string, name: string): Step => ({ agent, kind: "handoff", name, ok: true });

const RUNS: Run[] = [
  {
    title: "Run 1",
    story: "The researcher searches and hands over. The writer asks to open the ticket, and the run waits for approval.",
    trajectory: [t("researcher", "search_peps"), h("researcher", "transfer_to_writer"), t("writer", "open_ticket", false)],
    steps: 4,
    status: "awaiting_approval",
  },
  {
    title: "Run 2",
    story: "Triage sends the question straight to the writer. The writer asks to open the ticket and nothing was looked up.",
    trajectory: [t("writer", "open_ticket", false)],
    steps: 2,
    status: "awaiting_approval",
  },
  {
    title: "Run 3",
    story: "The researcher repeats one search until the loop detector from the multi-agent course ends the run.",
    trajectory: [t("researcher", "search_peps"), t("researcher", "search_peps"), t("researcher", "search_peps")],
    steps: 4,
    status: "stopped",
    stopReason: "loop",
  },
  {
    title: "Run 4",
    story: "The researcher searches and reads for a long time. The writer then asks to open the ticket.",
    trajectory: [
      t("researcher", "search_peps"),
      t("researcher", "read_pep_section"),
      t("researcher", "read_pep_section"),
      t("researcher", "search_peps"),
      t("researcher", "read_pep_section"),
      t("researcher", "read_pep_section"),
      t("researcher", "search_peps"),
      h("researcher", "transfer_to_writer"),
      t("writer", "open_ticket", false),
    ],
    steps: 10,
    status: "awaiting_approval",
  },
];

const CHECKS: { id: CheckId; label: string }[] = [
  { id: "tools", label: "Tool order" },
  { id: "steps", label: "Step count" },
  { id: "finished", label: "Finished" },
];

const pyList = (xs: string[]) => `[${xs.map((x) => `'${x}'`).join(", ")}]`;

// The same rules as grade_trajectory: tools in order among the tool steps, steps at most max_steps, status completed.
function grade(run: Run) {
  const names = run.trajectory.filter((s) => s.kind === "tool").map((s) => s.name);
  let from = 0;
  const inOrder = EXPECTED.every((tool) => {
    const at = names.indexOf(tool, from);
    if (at < 0) return false;
    from = at + 1;
    return true;
  });
  const pass: Record<CheckId, boolean> = {
    tools: inOrder,
    steps: run.steps <= MAX_STEPS,
    finished: COMPLETED.includes(run.status),
  };
  const why: Record<CheckId, string> = {
    tools: `tools ${pyList(names)} do not contain ${pyList(EXPECTED)} in order`,
    steps: `took ${run.steps} steps, the limit is ${MAX_STEPS}`,
    finished: `the run ended ${run.status} (${run.stopReason ?? "done"})`,
  };
  const failed = CHECKS.filter((c) => !pass[c.id]);
  const value = (3 - failed.length) / 3;
  return { pass, why, value, passed: failed.length === 0, reason: failed.map((c) => why[c.id]).join("; ") };
}

const GRADES = RUNS.map(grade);
const OK_TEXT: Record<CheckId, (r: Run) => string> = {
  tools: () => "search_peps and then open_ticket both appear among the tool steps, in that order.",
  steps: (r) => `${r.steps} steps, and the limit is ${MAX_STEPS}.`,
  finished: (r) => `The status is ${r.status}, which counts as finished.`,
};

type Marks = Record<CheckId, boolean | null>;
const BLANK: Marks = { tools: null, steps: null, finished: null };

export default function Evals06PathGrader({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [marks, setMarks] = useState<Marks>(BLANK);
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);
  const [lastRight, setLastRight] = useState(0);

  const run = RUNS[index];
  const g = GRADES[index];
  const ready = CHECKS.every((c) => marks[c.id] !== null);

  const mark = (id: CheckId, value: boolean) => {
    if (resolved) return;
    setMarks((m) => ({ ...m, [id]: value }));
  };

  const check = () => {
    if (!ready) return;
    const right = CHECKS.filter((c) => marks[c.id] === g.pass[c.id]).length;
    const n = attempts + 1;
    setAttempts(n);
    setLastRight(right);
    if (right === 3 || n >= 2) {
      setResolved(true);
      if (n === 1 && right === 3) setFirstTry((k) => k + 1);
    }
  };

  const next = () => {
    if (index + 1 < RUNS.length) {
      setIndex(index + 1);
      setMarks(BLANK);
      setAttempts(0);
      setResolved(false);
      setLastRight(0);
    } else {
      setFinished(true);
      complete(`Graded ${firstTry} of ${RUNS.length} runs right on the first try`);
    }
  };

  const wrongOnce = attempts > 0 && !resolved;

  return (
    <div className="w-panel evals06-path-grader">
      <p className="evals06-path-grader-hint">
        Illustrative runs, graded by the three checks of this chapter's lab. They are scripted for this chapter and are not output from a live desk.
      </p>

      <div className="evals06-path-grader-item">
        <span className="w-label">Item t10, from the action slice</span>
        <p className="evals06-path-grader-q">Look up PEP 20 and open a ticket saying the Zen needs a translation note.</p>
        <p className="evals06-path-grader-fields">
          <code>expected_tools</code>: search_peps, then open_ticket. <code>max_steps</code>: {MAX_STEPS}.
        </p>
      </div>

      <div className="w-row between">
        <span className="w-label">{run.title}</span>
        <span className="evals06-path-grader-count">
          {index + 1} of {RUNS.length}
        </span>
      </div>
      <p className="evals06-path-grader-story">{run.story}</p>

      <ol className="evals06-path-grader-steps" aria-label={`${run.title} trajectory`}>
        {run.trajectory.map((s, i) => (
          <li key={i}>
            <span className="evals06-path-grader-agent">{s.agent}</span>
            <code>{s.name}</code>
            <span className="evals06-path-grader-tag">{s.kind}</span>
            {!s.ok && <span className="evals06-path-grader-tag warn">ok: false</span>}
          </li>
        ))}
      </ol>
      <p className="evals06-path-grader-facts">
        <code>steps</code>: {run.steps}. <code>status</code>: {run.status}.
        {run.stopReason ? (
          <>
            {" "}
            <code>stop_reason</code>: {run.stopReason}.
          </>
        ) : null}
      </p>

      <div className="evals06-path-grader-checks">
        {CHECKS.map((c) => {
          const truth = g.pass[c.id];
          return (
            <div key={c.id} className="evals06-path-grader-check">
              <span className="evals06-path-grader-check-name">{c.label}</span>
              <div className="w-row" role="radiogroup" aria-label={`${c.label} for ${run.title}`}>
                {[true, false].map((v) => {
                  const on = marks[c.id] === v;
                  const cls = resolved && v === truth ? " good" : resolved && on && v !== truth ? " bad" : on ? " is-on" : "";
                  return (
                    <button
                      key={String(v)}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={resolved}
                      className={`w-chip${cls}`}
                      onClick={() => mark(c.id, v)}
                    >
                      {v ? "Passes" : "Fails"}
                    </button>
                  );
                })}
              </div>
              {resolved && (
                <p className="evals06-path-grader-why">
                  <strong>{truth ? "Passes. " : "Fails. "}</strong>
                  {truth ? OK_TEXT[c.id](run) : g.why[c.id] + "."}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="w-row">
        {!resolved && (
          <button type="button" className="w-btn primary" disabled={!ready} onClick={check}>
            Grade this run
          </button>
        )}
        {resolved && !finished && (
          <button type="button" className="w-btn ghost" onClick={next}>
            {index + 1 < RUNS.length ? "Next run" : "Finish"}
          </button>
        )}
      </div>

      {wrongOnce && (
        <div className="w-verdict bad" role="status">
          {lastRight} of 3 checks marked right. Re-read the rule for each check, then mark again.
        </div>
      )}

      {resolved && (
        <div className={`w-verdict ${g.passed ? "good" : "bad"}`} role="status">
          <strong>
            The score is {g.value.toFixed(2)}, {g.passed ? "and the run passes." : "and the run fails."}
          </strong>{" "}
          {g.passed ? "All three checks passed, so the reason is empty." : `The reason reads: ${g.reason}.`}
        </div>
      )}

      {finished && (
        <div className="w-verdict good" role="status">
          You graded {firstTry} of {RUNS.length} runs right on the first try. Only run 1 passes. Runs 2 and 4 also reached the ticket, and only a grader of the path sees what was wrong with them.
        </div>
      )}
    </div>
  );
}
