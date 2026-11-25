import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents09PortMap.css";

type Fate = "keep" | "contract" | "rewrite";

const FATES: { id: Fate; label: string }[] = [
  { id: "keep", label: "Keeps working as it is" },
  { id: "contract", label: "New engine, same contract" },
  { id: "rewrite", label: "Rewritten" },
];

type Part = { id: string; name: string; answer: Fate; why: string };

const PARTS: Part[] = [
  {
    id: "p1",
    name: "search_peps and read_pep_section in tools.py",
    answer: "keep",
    why: "They are plain Python functions over Services. Any framework can call them. Some need a thin wrapper to hide svc from the model.",
  },
  {
    id: "p2",
    name: "make_tools",
    answer: "rewrite",
    why: "It wraps the functions as LangChain tools that return a Command. Another framework has its own tool format.",
  },
  {
    id: "p3",
    name: "DeskState and its reducers",
    answer: "rewrite",
    why: "This is LangGraph state. Every framework keeps its own state and merges updates its own way.",
  },
  {
    id: "p4",
    name: "triage_node and the Command handoffs",
    answer: "rewrite",
    why: "Routing and handing over a thread are what a framework is for. Each one does them in its own way.",
  },
  {
    id: "p5",
    name: "The Postgres checkpointer and thread ids",
    answer: "rewrite",
    why: "They store LangGraph checkpoints. Another framework keeps its own sessions, and saved threads do not move across.",
  },
  {
    id: "p6",
    name: "stream_desk and run_desk",
    answer: "contract",
    why: "Their callers stay as they are. Inside, they must run the new engine and still give the same eight events and a DeskResult.",
  },
  {
    id: "p7",
    name: "POST /agent and ask_desk",
    answer: "keep",
    why: "They only call stream_desk and run_desk. While those keep their contract, these and their clients do not change.",
  },
  {
    id: "p8",
    name: "The golden set and its graders",
    answer: "keep",
    why: "They score a DeskResult. Comparing two engines fairly needs the same questions and the same graders.",
  },
];

export default function Agents09PortMap({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, Fate | undefined>>({});
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);

  const answered = PARTS.filter((p) => picks[p.id]).length;
  const hits = PARTS.filter((p) => picks[p.id] === p.answer).length;

  const check = () => {
    setChecked(true);
    complete(`${hits} of ${PARTS.length} sorted`);
  };
  const reset = () => {
    setPicks({});
    setChecked(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel agents09-port-map">
        <p className="agents09-port-map-note">What happens to each part of AskPEP when the desk moves to another framework?</p>
        <div className="w-stack">
          {PARTS.map((p) => {
            const pick = picks[p.id];
            const right = checked && pick === p.answer;
            const wrong = checked && pick !== p.answer;
            return (
              <fieldset key={p.id} className={`agents09-port-map-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
                <legend className="agents09-port-map-legend w-mono">{p.name}</legend>
                <div className="agents09-port-map-opts" role="radiogroup" aria-label={`What happens to ${p.name}`}>
                  {FATES.map((f) => (
                    <label key={f.id} className={`agents09-port-map-opt${pick === f.id ? " on" : ""}`}>
                      <input
                        type="radio"
                        name={`agents09-port-map-${p.id}`}
                        value={f.id}
                        checked={pick === f.id}
                        disabled={checked}
                        onChange={() => setPicks((prev) => ({ ...prev, [p.id]: f.id }))}
                      />
                      <span>{f.label}</span>
                    </label>
                  ))}
                </div>
                {checked && (
                  <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="agents09-port-map-why" role="status">
                    {right ? "Sorted. " : `Better fit: ${FATES.find((f) => f.id === p.answer)?.label}. `}
                    {p.why}
                  </motion.p>
                )}
              </fieldset>
            );
          })}
        </div>
        <div className="w-row">
          {!checked ? (
            <button type="button" className="w-btn primary" disabled={answered < PARTS.length} onClick={check}>
              Check my sorting ({answered} of {PARTS.length})
            </button>
          ) : (
            <button type="button" className="w-btn ghost" onClick={reset}>
              Try again
            </button>
          )}
        </div>
        {checked && (
          <div className={`w-verdict ${hits >= 6 ? "good" : "bad"}`} role="status">
            You sorted {hits} of {PARTS.length}. The parts that know about LangGraph get rewritten. The parts that speak the contract of eight events and a DeskResult keep working. That contract is what lets you
            change the engine without losing your clients or your measurements.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
