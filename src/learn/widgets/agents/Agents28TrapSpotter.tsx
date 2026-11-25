import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents28TrapSpotter.css";

type Trap = "auto" | "super" | "evals" | "prompt" | "recover" | "cost";

const TRAPS: { id: Trap; label: string }[] = [
  { id: "auto", label: "Agent where a workflow would do" },
  { id: "super", label: "Supervisor where code could route" },
  { id: "evals", label: "No evals" },
  { id: "prompt", label: "Guardrails only in the prompt" },
  { id: "recover", label: "No answer for redelivery or a stuck run" },
  { id: "cost", label: "No cost numbers" },
];

const CASES: { text: string; answer: Trap; why: string }[] = [
  { text: "\"Every night the agent decides what to do with each unpaid invoice. It can call any tool it likes.\" The five possible actions are known.", answer: "auto", why: "The steps can be written down. A deterministic workflow where the model picks one of five actions is cheaper, safer and easier to test." },
  { text: "\"A supervisor reads each ticket and sends it to billing, shipping or returns.\" The ticket has a category field.", answer: "super", why: "A field and an if statement route it for free. Spend a model call only where the category is not already in the data." },
  { text: "\"We will watch the first week of production and fix what looks wrong.\"", answer: "evals", why: "Nothing says what wrong means, and nothing stops a regression. Ask for a golden set and a regression gate that fails the build." },
  { text: "\"The system prompt says never refund more than the order total.\"", answer: "prompt", why: "A model can ignore a prompt. Put the limit in the function that issues the refund." },
  { text: "\"The topic guarantees delivery, so each event is handled once.\"", answer: "recover", why: "A consumer that crashes before it commits gets the event again, so delivery is at least once. Without idempotency keys, a force-close and a sweep, a crash means a double action or a stuck run." },
  { text: "\"It uses a supervisor, three workers and a critic. It should be fast enough.\"", answer: "cost", why: "Count the calls. A team makes several model calls per hop, so latency and cost multiply. Give a number per task and per month." },
];

export default function Agents28TrapSpotter({ onComplete }: WidgetProps) {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<Trap | null>(null);
  const [hits, setHits] = useState(0);
  const [done, setDone] = useState(false);
  const complete = useComplete(onComplete);
  const c = CASES[i];

  function next() {
    if (i + 1 < CASES.length) {
      setI(i + 1);
      setPick(null);
    } else {
      setDone(true);
      complete(`${hits} of ${CASES.length} matched`);
    }
  }

  if (done) {
    return (
      <div className="w-panel agents28-trap-spotter">
        <div className={`w-verdict ${hits >= 5 ? "good" : "bad"}`} role="status">
          You matched {hits} of {CASES.length}. Each trap is a missing number, a missing test, a rule in the wrong place or too much autonomy.
        </div>
        <div className="w-row">
          <button type="button" className="w-btn ghost" onClick={() => { setI(0); setPick(null); setHits(0); setDone(false); }}>Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-panel agents28-trap-spotter">
      <p className="agents28-trap-spotter-note">Answer {i + 1} of {CASES.length}. Name the trap an interviewer would test.</p>
      <p className="agents28-trap-spotter-case">{c.text}</p>
      <div className="agents28-trap-spotter-opts" role="radiogroup" aria-label={c.text}>
        {TRAPS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={pick === t.id}
            disabled={pick !== null}
            className={`w-btn ${pick === t.id ? "primary" : "ghost"}`}
            onClick={() => { setPick(t.id); if (t.id === c.answer) setHits((h) => h + 1); }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {pick && (
        <>
          <div className={`w-verdict ${pick === c.answer ? "good" : "bad"}`} role="status">
            {pick === c.answer ? "Matched. " : `Better fit: ${TRAPS.find((t) => t.id === c.answer)!.label}. `}
            {c.why}
          </div>
          <div className="w-row">
            <button type="button" className="w-btn primary" onClick={next}>{i + 1 < CASES.length ? "Next answer" : "See result"}</button>
          </div>
        </>
      )}
    </div>
  );
}
