import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Architecture05Redelivery.css";

type Outcome = "once" | "twice" | "conflict" | "resume" | "retry";

const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: "once", label: "One run in total" },
  { id: "twice", label: "A second run" },
  { id: "conflict", label: "A 409 answer" },
  { id: "resume", label: "A resumed run" },
  { id: "retry", label: "A 503 and a retry later" },
];

type Scenario = { id: string; state: string; text: string; answer: Outcome; why: string };

const SCENARIOS: Scenario[] = [
  {
    id: "r1",
    state: "Thread walrus-1 has no checkpoint yet.",
    text: "A client posts `/jobs/agent` with the thread id walrus-1. The worker has not started. The client times out and posts the identical body again.",
    answer: "once",
    why: "No checkpoint exists, so the route doesn't answer 409. The task name is the same, so the queue treats the second create as the first. It still counts as one task.",
  },
  {
    id: "r2",
    state: "Thread walrus-1 is done.",
    text: "The run finished and the answer is stored. The client posts `/jobs/agent` again with the thread id walrus-1.",
    answer: "conflict",
    why: "The thread has a status, so the route answers 409 and tells the client to use a new thread id. Nothing is queued.",
  },
  {
    id: "r3",
    state: "Thread walrus-1 is done.",
    text: "The worker finished the run, but its reply to Cloud Tasks was lost. Cloud Tasks sends the task again.",
    answer: "once",
    why: "`run_job` reads the status, finds done and returns. The model is not called a second time.",
  },
  {
    id: "r4",
    state: "Thread walrus-1 reads as stopped, because a run is in progress.",
    text: "The first run is 40 seconds in. Cloud Tasks gives up waiting and sends the task again. The model is still working on the first delivery.",
    answer: "retry",
    why: "A run in progress still reads as stopped. But `run_job` takes the thread's lock before it reads the status, and the first worker holds it. The second delivery runs nothing, and the route answers 503. The queue sends the task again later.",
  },
  {
    id: "r5",
    state: "Thread walrus-1 is stopped, with a checkpoint after the retrieval step.",
    text: "The worker crashed halfway through the run. Cloud Tasks sends the task again.",
    answer: "resume",
    why: "`run_job` sees a stopped thread and calls `continue_desk`. The run carries on from its checkpoint, and the finished steps are not paid for again.",
  },
  {
    id: "r6",
    state: "Thread walrus-2 has no checkpoint, because an input guard blocked its question.",
    text: "The worker ran the job, the guard blocked the question, and the run ended. The client posts `/jobs/agent` again with the thread id walrus-2.",
    answer: "conflict",
    why: "A block writes no checkpoint, so the status check finds nothing. The route also reads the audit trail, finds the block, and answers 409. Without that read, Cloud Tasks would answer 409 to the repeated task name, `enqueue` would count it as success, and the client would get a 202 for a job that never runs.",
  },
];

function ticks(text: string) {
  return text.split("`").map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : <span key={i}>{part}</span>));
}

export default function Architecture05Redelivery({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, Outcome | undefined>>({});
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
      <div className="w-panel architecture05-redelivery">
        <p className="architecture05-redelivery-note">Predict what AskPEP does. Illustrative figures.</p>
        <div className="w-stack">
          {SCENARIOS.map((s, i) => {
            const pick = picks[s.id];
            const right = checked && pick === s.answer;
            const wrong = checked && pick !== s.answer;
            return (
              <fieldset key={s.id} className={`architecture05-redelivery-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
                <legend className="architecture05-redelivery-legend">Situation {i + 1}</legend>
                <p className="architecture05-redelivery-state">{s.state}</p>
                <p className="architecture05-redelivery-text">{ticks(s.text)}</p>
                <div className="architecture05-redelivery-opts" role="radiogroup" aria-label={`Situation ${i + 1} outcome`}>
                  {OUTCOMES.map((o) => (
                    <label key={o.id} className={`architecture05-redelivery-opt${pick === o.id ? " on" : ""}`}>
                      <input
                        type="radio"
                        name={`architecture05-redelivery-${s.id}`}
                        value={o.id}
                        checked={pick === o.id}
                        disabled={checked}
                        onChange={() => setPicks((p) => ({ ...p, [s.id]: o.id }))}
                      />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
                {checked && (
                  <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="architecture05-redelivery-why" role="status">
                    {right ? "Matched. " : `What happens: ${OUTCOMES.find((o) => o.id === s.answer)?.label}. `}
                    {ticks(s.why)}
                  </motion.p>
                )}
              </fieldset>
            );
          })}
        </div>
        <div className="w-row">
          {!checked ? (
            <button type="button" className="w-btn primary" disabled={answered < SCENARIOS.length} onClick={check}>
              Check my predictions ({answered} of {SCENARIOS.length})
            </button>
          ) : (
            <button type="button" className="w-btn ghost" onClick={reset}>
              Try again
            </button>
          )}
        </div>
        {checked && (
          <div className={`w-verdict ${hits >= 5 ? "good" : "bad"}`} role="status">
            You matched {hits} of {SCENARIOS.length}. The task name, the 409 and the status check cover a repeat before and after a run, and across a crash. The lock covers a repeat that overlaps a run that is still going. It holds one database connection for the whole run.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
