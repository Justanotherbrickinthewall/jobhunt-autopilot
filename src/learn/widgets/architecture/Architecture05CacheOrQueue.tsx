import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Architecture05CacheOrQueue.css";

type Fix = "cache" | "queue" | "leave";

const FIXES: { id: Fix; label: string }[] = [
  { id: "cache", label: "Cache it" },
  { id: "queue", label: "Queue it" },
  { id: "leave", label: "Leave it as it is" },
];

type Scenario = { id: string; text: string; answer: Fix; why: string };

const SCENARIOS: Scenario[] = [
  {
    id: "c1",
    text: "A person asks what PEP 572 changes. One retrieval and one model call take about 3 seconds, and nobody has asked this before.",
    answer: "leave",
    why: "The work fits the wait and nothing repeats. A cache would miss, and a queue would add a poll for no gain.",
  },
  {
    id: "c2",
    text: "A team wiki sends the same ten PEP 8 questions all day. The corpus changes about once a month.",
    answer: "cache",
    why: "Ten questions repeat thousands of times. Each repeat finds its stored answer until the time limit ends or the next ingest changes the corpus version.",
  },
  {
    id: "c3",
    text: "A nightly script sends 200 questions to the desk. Each run takes about 40 seconds, and nobody waits for the results.",
    answer: "queue",
    why: "Nobody holds a connection, and 200 runs of 40 seconds would hold 200 connections open. Queue the jobs and read the results later.",
  },
  {
    id: "c4",
    text: "A ticketing system calls AskPEP and gives up after 5 seconds. A desk run takes about 40 seconds.",
    answer: "queue",
    why: "The caller's timeout is shorter than the run. It needs a receipt inside 5 seconds and the answer later.",
  },
  {
    id: "c5",
    text: "Each question pastes a different code snippet for the desk to lint, so no two questions match. A run takes about 6 seconds.",
    answer: "leave",
    why: "Every question is new, so a cache would never hit. The runs are short, so a queue would only add a poll.",
  },
];

export default function Architecture05CacheOrQueue({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, Fix | undefined>>({});
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
      <div className="w-panel architecture05-cache-or-queue">
        <p className="architecture05-cache-or-queue-note">Pick the fix for each request. Illustrative figures.</p>
        <div className="w-stack">
          {SCENARIOS.map((s, i) => {
            const pick = picks[s.id];
            const right = checked && pick === s.answer;
            const wrong = checked && pick !== s.answer;
            return (
              <fieldset key={s.id} className={`architecture05-cache-or-queue-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
                <legend className="architecture05-cache-or-queue-legend">Request {i + 1}</legend>
                <p className="architecture05-cache-or-queue-text">{s.text}</p>
                <div className="architecture05-cache-or-queue-opts" role="radiogroup" aria-label={`Request ${i + 1} fix`}>
                  {FIXES.map((f) => (
                    <label key={f.id} className={`architecture05-cache-or-queue-opt${pick === f.id ? " on" : ""}`}>
                      <input
                        type="radio"
                        name={`architecture05-cache-or-queue-${s.id}`}
                        value={f.id}
                        checked={pick === f.id}
                        disabled={checked}
                        onChange={() => setPicks((p) => ({ ...p, [s.id]: f.id }))}
                      />
                      <span>{f.label}</span>
                    </label>
                  ))}
                </div>
                {checked && (
                  <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="architecture05-cache-or-queue-why" role="status">
                    {right ? "Matched. " : `Better fit: ${FIXES.find((f) => f.id === s.answer)?.label}. `}
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
            You matched {hits} of {SCENARIOS.length}. Queue work that outlives the caller's wait. Cache work that repeats. Leave the rest alone. A cache needs repeats, and a queue needs a caller who can come back
            later.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
