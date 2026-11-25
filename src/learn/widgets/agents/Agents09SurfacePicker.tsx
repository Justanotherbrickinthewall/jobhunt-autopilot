import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents09SurfacePicker.css";

type Surface = "stream" | "status" | "mcp" | "inproc";

const SURFACES: { id: Surface; label: string }[] = [
  { id: "stream", label: "POST /agent" },
  { id: "status", label: "GET /agent/{thread_id}" },
  { id: "mcp", label: "ask_desk over MCP" },
  { id: "inproc", label: "run_desk in process" },
];

type Scenario = { id: string; text: string; answer: Surface; why: string };

const SCENARIOS: Scenario[] = [
  {
    id: "s1",
    text: "A chat page shows the answer as it is written, with the name of each tool the desk calls.",
    answer: "stream",
    why: "Only the event stream carries tool_call, tool_result and token events as they happen.",
  },
  {
    id: "s2",
    text: "A phone app lost its connection halfway through an answer. It still has the thread id and needs the final answer.",
    answer: "status",
    why: "The status route reads the checkpoint, so the answer is there even though the stream is gone.",
  },
  {
    id: "s3",
    text: "A coding assistant that speaks MCP wants one finished answer, with sources, to use in its own plan.",
    answer: "mcp",
    why: "A tool call returns one result. ask_desk runs the whole desk and returns the answer, the sources and a thread id.",
  },
  {
    id: "s4",
    text: "A script in the AskPEP repository runs fixed questions through the desk and checks each result.",
    answer: "inproc",
    why: "The script is Python in the same repository. Calling run_desk gives a DeskResult with no HTTP server to start.",
  },
  {
    id: "s5",
    text: "A support dashboard must show, after the fact, whether a thread ended on its step budget.",
    answer: "status",
    why: "The status route returns the stop_reason saved in the checkpoint, long after the stream has closed.",
  },
];

export default function Agents09SurfacePicker({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, Surface | undefined>>({});
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);

  const answered = SCENARIOS.filter((s) => picks[s.id]).length;
  const hits = SCENARIOS.filter((s) => picks[s.id] === s.answer).length;

  const check = () => {
    setChecked(true);
    complete(`${hits} of ${SCENARIOS.length} matched`);
  };
  const reset = () => {
    setPicks({});
    setChecked(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel agents09-surface-picker">
        <p className="agents09-surface-picker-note">Pick the surface each client should use. Illustrative clients of the PEP desk.</p>
        <div className="w-stack">
          {SCENARIOS.map((s, i) => {
            const pick = picks[s.id];
            const right = checked && pick === s.answer;
            const wrong = checked && pick !== s.answer;
            return (
              <fieldset key={s.id} className={`agents09-surface-picker-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
                <legend className="agents09-surface-picker-legend">Client {i + 1}</legend>
                <p className="agents09-surface-picker-text">{s.text}</p>
                <div className="agents09-surface-picker-opts" role="radiogroup" aria-label={`Client ${i + 1} surface`}>
                  {SURFACES.map((c) => (
                    <label key={c.id} className={`agents09-surface-picker-opt${pick === c.id ? " on" : ""}`}>
                      <input
                        type="radio"
                        name={`agents09-surface-picker-${s.id}`}
                        value={c.id}
                        checked={pick === c.id}
                        disabled={checked}
                        onChange={() => setPicks((p) => ({ ...p, [s.id]: c.id }))}
                      />
                      <span className="w-mono">{c.label}</span>
                    </label>
                  ))}
                </div>
                {checked && (
                  <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="agents09-surface-picker-why" role="status">
                    {right ? "Matched. " : `Better fit: ${SURFACES.find((c) => c.id === s.answer)?.label}. `}
                    {s.why}
                  </motion.p>
                )}
              </fieldset>
            );
          })}
        </div>
        <div className="w-row">
          {!checked ? (
            <button type="button" className="w-btn primary" disabled={answered < SCENARIOS.length} onClick={check}>
              Check my picks ({answered} of {SCENARIOS.length})
            </button>
          ) : (
            <button type="button" className="w-btn ghost" onClick={reset}>
              Try again
            </button>
          )}
        </div>
        {checked && (
          <div className={`w-verdict ${hits >= 4 ? "good" : "bad"}`} role="status">
            You matched {hits} of {SCENARIOS.length}. The pattern: stream for a person watching, status for a client that lost its stream or looks back later, MCP for another agent that wants one
            answer, and a direct call for code in the same repository.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
