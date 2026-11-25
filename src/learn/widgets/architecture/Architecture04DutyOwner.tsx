import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Architecture04DutyOwner.css";

type Owner = "you" | "google";

const OWNERS: { id: Owner; label: string }[] = [
  { id: "you", label: "You" },
  { id: "google", label: "Google" },
];

type Duty = { id: string; text: string; answer: Owner; why: string };

// Each answer assumes the desk runs as ADK on Agent Runtime. The session claim in d2 is unchecked.
// CHECK: d1 says Agent Runtime scales the host for you, and d2 says it can hold a thread's history as a session. FACTS.md holds neither. Chapter 4 read both on 22 October 2026 from the Agent Runtime overview, so reread that page before release.
const DUTIES: Duty[] = [
  {
    id: "d1",
    text: "Starting more copies of the desk when traffic rises, and stopping them when it falls.",
    answer: "google",
    why: "Cloud Run and Agent Runtime both scale the host for you. Your part is the limit you set, such as three instances on Cloud Run (rag-14).",
  },
  {
    id: "d2",
    text: "Storing a thread's history between calls, so a new request can continue it.",
    answer: "google",
    why: "ADK sessions can live in Agent Runtime's managed session store, so your checkpoint tables go. On Cloud Run today the saver and its tables are yours (course 2). This answer is unchecked against current docs.",
  },
  {
    id: "d3",
    text: "Stopping a researcher that repeats the same search over and over.",
    answer: "you",
    why: "The limit of 3 repeats is your policy. `BudgetMiddleware` enforces it today (course 2). A host runs the loop and does not judge it. Under ADK you would rewrite the check.",
  },
  {
    id: "d4",
    text: "Writing one ticket, and no more, when a call to `open_ticket` is retried.",
    answer: "you",
    why: "The idempotency key and the unique constraint sit in your tool and your table (course 2). A runtime can retry a call. It cannot know that a second ticket is a harm.",
  },
  {
    id: "d5",
    text: "Keeping the `X-API-Key` check and the `done` or `error` last event that clients rely on.",
    answer: "you",
    why: "That contract is yours (course 2). The platform's endpoint knows nothing of your key or your eight events. A front service of yours keeps the contract, and it runs on Cloud Run.",
  },
  {
    id: "d6",
    text: "Switching to the Claude fallback when the Gemini call fails.",
    answer: "you",
    why: "Routing and the fallback are code in `routing.py` (chapter 2). A host runs your calls and does not pick a model. Under ADK you would rewrite how the router hands a model to the agent.",
  },
];

export default function Architecture04DutyOwner({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, Owner | undefined>>({});
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);

  const answered = DUTIES.filter((d) => picks[d.id]).length;
  const hits = DUTIES.filter((d) => picks[d.id] === d.answer).length;

  const check = () => {
    setChecked(true);
    complete(`${hits} of ${DUTIES.length} matched`);
  };
  const reset = () => {
    setPicks({});
    setChecked(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel architecture04-duty-owner">
        <p className="architecture04-duty-owner-note">Who operates each job if the PEP desk runs as ADK on Agent Runtime? Illustrative jobs from the desk's six duties.</p>
        <div className="w-stack">
          {DUTIES.map((d, i) => {
            const pick = picks[d.id];
            const right = checked && pick === d.answer;
            const wrong = checked && pick !== d.answer;
            return (
              <fieldset key={d.id} className={`architecture04-duty-owner-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
                <legend className="architecture04-duty-owner-legend">Job {i + 1}</legend>
                <p className="architecture04-duty-owner-text">{d.text}</p>
                <div className="architecture04-duty-owner-opts" role="radiogroup" aria-label={`Job ${i + 1} operator`}>
                  {OWNERS.map((o) => (
                    <label key={o.id} className={`architecture04-duty-owner-opt${pick === o.id ? " on" : ""}`}>
                      <input
                        type="radio"
                        name={`architecture04-duty-owner-${d.id}`}
                        value={o.id}
                        checked={pick === o.id}
                        disabled={checked}
                        onChange={() => setPicks((p) => ({ ...p, [d.id]: o.id }))}
                      />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
                {checked && (
                  <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="architecture04-duty-owner-why" role="status">
                    {right ? "Matched. " : `Better fit: ${OWNERS.find((o) => o.id === d.answer)?.label}. `}
                    {d.why}
                  </motion.p>
                )}
              </fieldset>
            );
          })}
        </div>
        <div className="w-row">
          {!checked ? (
            <button type="button" className="w-btn primary" disabled={answered < DUTIES.length} onClick={check}>
              Check my picks ({answered} of {DUTIES.length})
            </button>
          ) : (
            <button type="button" className="w-btn ghost" onClick={reset}>
              Try again
            </button>
          )}
        </div>
        {checked && (
          <div className={`w-verdict ${hits >= 5 ? "good" : "bad"}`} role="status">
            You matched {hits} of {DUTIES.length}. The pattern: Google takes the machines and the stored thread. You keep every rule, which means the limits, the idempotency key, the fallback and
            the contract.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
