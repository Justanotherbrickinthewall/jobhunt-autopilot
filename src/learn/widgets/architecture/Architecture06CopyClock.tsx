import { useId, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Architecture06CopyClock.css";

// One desk request files a ticket on day zero. It leaves five copies. The capstone's own code ends none of the
// Postgres copies. LangSmith's Developer plan keeps a base trace for 14 days (FACTS.md L41, checked 20 October 2026).

type Copy = {
  id: string;
  name: string;
  where: string;
  holds: string;
  expiresAfter: number | null; // days, or null when no code or plan ends it
  note: string;
};

const COPIES: Copy[] = [
  {
    id: "checkpoint",
    name: "Checkpoint",
    where: "The checkpoint tables in Postgres",
    holds: "The whole conversation, the answer and the caller's user id and role.",
    expiresAfter: null,
    note: "No code removes it. The checkpointer has delete_thread and prune, and AskPEP calls neither.",
  },
  {
    id: "trace",
    name: "Trace row",
    where: "The traces table in Postgres",
    holds: "The question after the input guard, and the first 4000 characters of the answer.",
    expiresAfter: null,
    note: "No code removes it.",
  },
  {
    id: "audit",
    name: "Audit rows",
    where: "The audit table in Postgres",
    holds: "The guard decisions and the approval, with the detail redacted.",
    expiresAfter: null,
    note: "Append-only on purpose, so no code removes it.",
  },
  {
    id: "ticket",
    name: "Ticket",
    where: "The tickets table in Postgres",
    holds: "The title and the body.",
    expiresAfter: null,
    note: "No code removes it.",
  },
  {
    id: "langsmith",
    name: "LangSmith run",
    where: "LangSmith, only when tracing is on",
    holds: "The run, with personal data masked before it left the process.",
    expiresAfter: 14,
    note: "A base trace lasts 14 days on the Developer plan.",
  },
];

const PREDICT_DAY = 40;
const MAX_DAY = 60;

const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x));

export default function Architecture06CopyClock({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const sliderId = useId();
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [age, setAge] = useState(PREDICT_DAY);

  const alive = (c: Copy, day: number) => c.expiresAfter === null || day <= c.expiresAfter;
  const truth = new Set(COPIES.filter((c) => alive(c, PREDICT_DAY)).map((c) => c.id));
  const right = sameSet(ticked, truth);

  const toggle = (id: string) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const check = () => {
    const k = attempts + 1;
    setAttempts(k);
    if (right || k >= 2) {
      setResolved(true);
      complete(
        right && k === 1
          ? "Found the four copies that outlive 40 days on the first try"
          : right
            ? "Found the four copies that outlive 40 days on the second try"
            : "Needed the explanation for which copies outlive 40 days",
      );
    }
  };

  const left = COPIES.filter((c) => alive(c, age));
  const postgresLeft = left.filter((c) => c.expiresAfter === null).length;

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel architecture06-copy-clock">
        <div className="w-row between">
          <span className="w-label">One desk request, filed on day zero</span>
          <span className="architecture06-copy-clock-count">Illustrative ages</span>
        </div>
        <p className="architecture06-copy-clock-note">
          The request asks the desk to file a ticket, and a person approves it. Five copies of it exist on day zero. Each one has its own clock.
        </p>

        {!resolved && (
          <fieldset className="architecture06-copy-clock-group">
            <legend className="w-label">Predict: which copies still exist on day {PREDICT_DAY}?</legend>
            {COPIES.map((c) => (
              <label key={c.id} className={`architecture06-copy-clock-opt${ticked.has(c.id) ? " on" : ""}`}>
                <input type="checkbox" checked={ticked.has(c.id)} onChange={() => toggle(c.id)} />
                <span>
                  <strong>{c.name}</strong>
                  <span className="architecture06-copy-clock-where">{c.where}</span>
                </span>
              </label>
            ))}
            <div className="w-row">
              <button type="button" className="w-btn primary" onClick={check}>
                Check my prediction
              </button>
            </div>
            {attempts > 0 && (
              <div className="w-verdict bad" role="status">
                Not quite. For each copy, ask what could end it: a line of AskPEP code, or the plan of an outside service. Then compare that with {PREDICT_DAY} days.
              </div>
            )}
          </fieldset>
        )}

        {resolved && (
          <motion.div className="architecture06-copy-clock-result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
              <strong>{right ? "Correct. " : "Not quite. "}</strong>
              Four copies exist on day {PREDICT_DAY}: the checkpoint, the trace row, the audit rows and the ticket. Nothing in AskPEP ends any of them. Only the LangSmith run has aged out, and a plan
              removed it. A request to delete this conversation has to reach four stores.
            </div>

            <div className="architecture06-copy-clock-slider">
              <label htmlFor={sliderId} className="w-label">
                Age of the request: day {age}
              </label>
              <input id={sliderId} type="range" min={0} max={MAX_DAY} step={1} value={age} onChange={(e) => setAge(Number(e.target.value))} />
            </div>

            <ul className="architecture06-copy-clock-list">
              {COPIES.map((c) => {
                const here = alive(c, age);
                return (
                  <li key={c.id} className={`architecture06-copy-clock-item${here ? " here" : " gone"}`}>
                    <div className="architecture06-copy-clock-head">
                      <strong>{c.name}</strong>
                      <span className={`w-chip ${here ? "good" : "bad"}`}>{here ? "Exists" : "Expired"}</span>
                    </div>
                    <span className="architecture06-copy-clock-where">{c.where}</span>
                    <span className="architecture06-copy-clock-holds">{c.holds}</span>
                    <span className="architecture06-copy-clock-expiry">{c.note}</span>
                  </li>
                );
              })}
            </ul>

            <p className="architecture06-copy-clock-sum" role="status">
              On day {age}, {left.length} of {COPIES.length} copies exist. {postgresLeft} of them are in your own Postgres, where nothing ends them.
            </p>
          </motion.div>
        )}
      </div>
    </MotionConfig>
  );
}
