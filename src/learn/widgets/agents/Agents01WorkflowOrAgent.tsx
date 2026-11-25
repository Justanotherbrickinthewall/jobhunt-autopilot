import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents01WorkflowOrAgent.css";

type Design = "workflow" | "agent";
type Task = { id: string; text: string; answer: Design; why: string; lo: number; hi: number };

// Model-call counts are illustrative figures invented for teaching, not measurements.
const TASKS: Task[] = [
  {
    id: "ingest",
    text: "Every night, read the PEP files again, split them into chunks, embed the chunks and store them.",
    answer: "workflow",
    why: "The steps and their order never change, and no chat model is involved. This is the course 1 ingest pipeline.",
    lo: 0,
    hi: 0,
  },
  {
    id: "answer",
    text: "For each question, search the corpus, rerank the passages and write one cited answer.",
    answer: "workflow",
    why: "Every question takes the same path. Code owns the order, and the model writes once. This is AskPEP as course 1 built it.",
    lo: 1,
    hi: 1,
  },
  {
    id: "links",
    text: "Turn each PEP number in a finished answer into a link to its page on peps.python.org.",
    answer: "workflow",
    why: "A pattern match and a template do this the same way every time. A model here only adds a chance of a wrong link.",
    lo: 0,
    hi: 0,
  },
  {
    id: "lint",
    text: "Take the code snippet in a message, run the linter on it and have a model write up the findings.",
    answer: "workflow",
    why: "A model writes the text, but the steps are fixed. A model inside one step does not make the system an agent.",
    lo: 1,
    hi: 1,
  },
  {
    id: "open",
    text: "Answer open questions about PEPs, where one needs a single search and another needs three searches and a read of one section.",
    answer: "agent",
    why: "You cannot list the steps in advance. The number of lookups depends on what each one returns, so the model must choose.",
    lo: 2,
    hi: 7,
  },
  {
    id: "chain",
    text: "Find which earlier PEPs a proposal builds on, by following the PEPs each one mentions until the chain ends.",
    answer: "agent",
    why: "Each finding decides the next search. The length of the chain is unknown until the tools answer.",
    lo: 3,
    hi: 9,
  },
];

const MAX = 10;

export default function Agents01WorkflowOrAgent({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [choices, setChoices] = useState<Record<string, Design>>({});
  const [done, setDone] = useState(false);

  const answered = Object.keys(choices).length;
  const correct = TASKS.filter((t) => choices[t.id] === t.answer).length;

  const pick = (id: string, d: Design) => {
    if (done) return;
    setChoices((c) => ({ ...c, [id]: d }));
  };
  const check = () => {
    setDone(true);
    complete(`${correct} of ${TASKS.length} correct`);
  };
  const reset = () => {
    setChoices({});
    setDone(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel agents01-workflow-or-agent">
        <p className="agents01-workflow-or-agent-hint">Choose a design for each AskPEP task, then check your sort.</p>
        <ul className="agents01-workflow-or-agent-list">
          {TASKS.map((t) => {
            const c = choices[t.id];
            const state = done ? (c === t.answer ? "good" : "bad") : "";
            return (
              <li key={t.id} className={`agents01-workflow-or-agent-item ${state}`}>
                <p className="agents01-workflow-or-agent-text">{t.text}</p>
                <div className="agents01-workflow-or-agent-choices" role="group" aria-label={`Design for: ${t.text}`}>
                  {(["workflow", "agent"] as Design[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`w-chip${c === d ? " is-on" : ""}`}
                      aria-pressed={c === d}
                      disabled={done}
                      onClick={() => pick(t.id, d)}
                    >
                      {d === "workflow" ? "Workflow" : "Agent"}
                    </button>
                  ))}
                </div>
                {done && (
                  <p className="agents01-workflow-or-agent-why" role="status">
                    <strong>{t.answer === "workflow" ? "Workflow." : "Agent."}</strong> {t.why}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        {!done ? (
          <div className="w-row">
            <button type="button" className="w-btn primary" disabled={answered < TASKS.length} onClick={check}>
              Check my sort
            </button>
            <span className="agents01-workflow-or-agent-count">
              {answered} of {TASKS.length} sorted
            </span>
          </div>
        ) : (
          <div className="w-stack">
            <div className={`w-verdict ${correct >= 5 ? "good" : "bad"}`} role="status">
              You sorted {correct} of {TASKS.length} correctly. Most of the work in a real system is a workflow, with a model inside some steps. Only open-ended tasks earn a loop, because autonomy adds model calls and makes their number vary from run to run.
            </div>
            <figure className="agents01-workflow-or-agent-fig">
              <figcaption>Model calls per run in the correct design. Illustrative figures.</figcaption>
              <svg viewBox="0 0 360 190" role="img" aria-label="Range of model calls per task, from zero to ten">
                {TASKS.map((t, i) => {
                  const y = 8 + i * 29;
                  const x0 = 120 + (t.lo / MAX) * 220;
                  const w = Math.max(((t.hi - t.lo) / MAX) * 220, 5);
                  const isAgent = t.answer === "agent";
                  return (
                    <g key={t.id}>
                      <text x="0" y={y + 12} className="agents01-workflow-or-agent-lab">
                        {t.id}
                      </text>
                      <rect x="120" y={y} width="220" height="16" rx="4" fill="var(--surface-2)" />
                      <motion.rect
                        x={x0}
                        y={y}
                        height="16"
                        rx="4"
                        fill={isAgent ? "var(--amber)" : "var(--teal)"}
                        initial={{ width: 0 }}
                        animate={{ width: w }}
                        transition={{ duration: 0.4, delay: i * 0.05 }}
                      />
                    </g>
                  );
                })}
                <text x="120" y="186" className="agents01-workflow-or-agent-lab">0</text>
                <text x="332" y="186" className="agents01-workflow-or-agent-lab">10</text>
              </svg>
              <p className="agents01-workflow-or-agent-key">
                <span className="agents01-workflow-or-agent-dot wf" /> workflow
                <span className="agents01-workflow-or-agent-dot ag" /> agent, wide because the count varies by run
              </p>
            </figure>
            <button type="button" className="w-btn ghost" onClick={reset}>
              Sort again
            </button>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
