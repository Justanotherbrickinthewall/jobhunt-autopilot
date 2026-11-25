import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Evals04ToolPicker.css";

// The four tools are the rows of the chapter's table, in the same order. The jobs are illustrative.
const TOOLS = ["Your pytest harness", "DeepEval", "Ragas", "promptfoo"];

type Job = { name: string; needs: string[]; limits: string[]; best: number; reasons: string[] };
const JOBS: Job[] = [
  {
    name: "The desk must refuse questions about topics outside the PEPs",
    needs: ["A test that fails when the desk answers one", "A yes or no that code can check"],
    limits: ["Runs offline in CI", "No judge anywhere"],
    best: 0,
    reasons: [
      "Best fit. The refusal grader from chapter 2 is a few lines of code. There is nothing to calibrate and nothing to pay for.",
      "It adds a framework and judge calls to a question that has a plain yes or no answer.",
      "Wrong job. It scores answer quality and doesn't check that a refusal happened.",
      "Possible, but it adds a Node tool and a config file to a check that pytest already does.",
    ],
  },
  {
    name: "Every push must fail if the desk's answers stop resting on their cited passages",
    needs: ["A judge metric for groundedness", "A failing metric must fail the build"],
    limits: ["A Python project with pytest in CI", "The judge is Claude"],
    best: 1,
    reasons: [
      "Possible, but you would write the judge prompts and the scoring yourself. The judge from chapter 3 is the start of that.",
      "Best fit. GEval and faithfulness come ready-made, and assert_test fails the pytest run when a score drops under its threshold.",
      "It has faithfulness too, but it scores. It doesn't fail a build by itself, so you would add the gate.",
      "Wrong job. It compares prompts and models from a config file and doesn't sit inside your pytest run.",
    ],
  },
  {
    name: "A teammate who writes prompts, not Python, wants three wordings of the writer's prompt compared on two models",
    needs: ["A side-by-side table", "A config file kept in the repo"],
    limits: ["No Python code", "Results this afternoon"],
    best: 3,
    reasons: [
      "Slower to start. You would build the matrix and the report yourself.",
      "It is built for tests that fail a build, not for a quick comparison, and it assumes Python code.",
      "Wrong job. Its focus is RAG metrics, not a matrix of prompts and models.",
      "Best fit. It runs a matrix of prompts and models from a config file and shows the results side by side.",
    ],
  },
  {
    name: "A teammate has a notebook that runs the retrieval pipeline over 30 questions and wants standard RAG numbers this afternoon",
    needs: ["Ready-made faithfulness and context metrics", "No test runner and no build gate yet"],
    limits: ["A Python notebook", "First numbers, not a gate"],
    best: 2,
    reasons: [
      "A sound default, but you would write each metric yourself when ready-made ones exist.",
      "A close second. It has the same metrics, but it brings a pytest layer that a notebook doesn't need.",
      "Best fit. It is a library of ready-made RAG metrics that you call from a script or a notebook.",
      "Wrong job. It compares prompts and models, and it has no focus on retrieval metrics.",
    ],
  },
];

export default function Evals04ToolPicker({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<(number | null)[]>(JOBS.map(() => null));
  const [revealed, setRevealed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const ready = picks.every((p) => p !== null);
  const correct = picks.filter((p, i) => p === JOBS[i].best).length;
  const done = revealed && (correct === JOBS.length || attempt >= 2);

  const reveal = () => {
    const n = attempt + 1;
    setAttempt(n);
    setRevealed(true);
    if (correct === JOBS.length || n >= 2) complete(`${correct} of ${JOBS.length} tool choices matched on attempt ${n}`);
  };

  const retry = () => {
    setPicks((ps) => ps.map((x, i) => (x === JOBS[i].best ? x : null)));
    setRevealed(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel evals04-tool-picker">
        <p className="evals04-tool-picker-hint">
          Illustrative jobs. Read the needs and the limits, then pick the tool you would start with. The reasons for every tool appear after you check.
        </p>
        {JOBS.map((job, i) => {
          const p = picks[i];
          return (
            <section key={job.name} className="evals04-tool-picker-card" aria-label={`Job ${i + 1}`}>
              <p className="evals04-tool-picker-name">{job.name}</p>
              <div className="w-label">Needs</div>
              <ul className="evals04-tool-picker-list">
                {job.needs.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <div className="w-label">Limits</div>
              <ul className="evals04-tool-picker-list">
                {job.limits.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <div className="evals04-tool-picker-opts" role="radiogroup" aria-label="Tool">
                {TOOLS.map((t, ti) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={p === ti}
                    disabled={revealed || (attempt > 0 && p === job.best)}
                    className={`w-chip evals04-tool-picker-opt${p === ti ? " is-on" : ""}${done && ti === job.best ? " good" : ""}`}
                    onClick={() => setPicks((ps) => ps.map((x, j) => (j === i ? ti : x)))}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <AnimatePresence>
                {revealed && (
                  <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="evals04-tool-picker-reasons">
                    {TOOLS.map((t, ti) => (
                      <li key={t} className={ti === job.best ? "best" : ""}>
                        <span className="w-mono">{t}</span>. {job.reasons[ti]}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </section>
          );
        })}
        {!revealed && (
          <button type="button" className="w-btn primary" disabled={!ready} onClick={reveal}>
            Check my picks
          </button>
        )}
        {revealed && !done && (
          <button type="button" className="w-btn primary" onClick={retry}>
            Try the missed ones again
          </button>
        )}
        {done && (
          <div className={`w-verdict ${correct >= 3 ? "good" : "bad"}`} role="status">
            {correct} of {JOBS.length} matched. Start from the job. A question that code can check points to your own harness. A judge metric that must fail the build points to DeepEval. Quick RAG numbers point to Ragas. A config-driven comparison points to promptfoo.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
