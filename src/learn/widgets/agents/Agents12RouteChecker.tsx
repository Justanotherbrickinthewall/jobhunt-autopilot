import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents12RouteChecker.css";

type Act = "run" | "queue";

const OPTS: { id: Act; label: string }[] = [
  { id: "run", label: "Run the chosen route" },
  { id: "queue", label: "Send to the review queue" },
];

const CASES: { id: string; q: string; allowed: string; choice: string; answer: Act; why: string }[] = [
  { id: "a", q: "Which Python version added f-strings?", allowed: "lookup, refuse, version", choice: "version", answer: "run", why: "The value is in the enum and the question names a known feature, so version is allowed." },
  { id: "b", q: "Who wrote the GIL PEP?", allowed: "lookup, refuse", choice: "version", answer: "queue", why: "Version is in the enum, and this state does not allow it. No known feature appears in the question." },
  { id: "c", q: "Explain PEP 572.", allowed: "lookup, refuse", choice: "Lookup", answer: "queue", why: "The check is an exact match. A capital L is not in the enum." },
  { id: "d", q: "What is PEP 703 about?", allowed: "lookup, refuse", choice: "lookup", answer: "run", why: "In the enum and allowed. The chain takes over." },
  { id: "e", q: "What is PEP 8 about?", allowed: "lookup, refuse", choice: "I think this is a lookup.", answer: "queue", why: "The model answered in prose. That is not one of the options, so code falls back." },
  { id: "f", q: "What is the capital of France?", allowed: "lookup, refuse", choice: "refuse", answer: "run", why: "Refuse is valid and allowed, so code runs it. A safe route is still a route." },
];

export default function Agents12RouteChecker({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, Act | undefined>>({});
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);
  const answered = CASES.filter((c) => picks[c.id]).length;
  const hits = CASES.filter((c) => picks[c.id] === c.answer).length;

  return (
    <div className="w-panel agents12-route-checker">
      <p className="agents12-route-checker-note">What does code do with the model's choice? Predict all six, then check.</p>
      <div className="w-stack">
        {CASES.map((c) => {
          const pick = picks[c.id];
          const right = checked && pick === c.answer;
          const wrong = checked && pick !== c.answer;
          return (
            <fieldset key={c.id} className={`agents12-route-checker-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
              <legend className="agents12-route-checker-legend">Request</legend>
              <p className="agents12-route-checker-text">{c.q}</p>
              <p className="agents12-route-checker-meta">Allowed here: {c.allowed}</p>
              <p className="agents12-route-checker-meta">
                Model returned: <code>{c.choice}</code>
              </p>
              <div className="agents12-route-checker-opts" role="radiogroup" aria-label={c.q}>
                {OPTS.map((o) => (
                  <label key={o.id} className={`agents12-route-checker-opt${pick === o.id ? " on" : ""}`}>
                    <input
                      type="radio"
                      name={`agents12-route-checker-${c.id}`}
                      checked={pick === o.id}
                      disabled={checked}
                      onChange={() => setPicks((p) => ({ ...p, [c.id]: o.id }))}
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
              </div>
              {checked && (
                <p className="agents12-route-checker-why" role="status">
                  {right ? "Matched. " : `Better fit: ${OPTS.find((o) => o.id === c.answer)?.label}. `}
                  {c.why}
                </p>
              )}
            </fieldset>
          );
        })}
      </div>
      <div className="w-row">
        {!checked ? (
          <button
            type="button"
            className="w-btn primary"
            disabled={answered < CASES.length}
            onClick={() => {
              setChecked(true);
              complete(`${hits} of ${CASES.length} matched`);
            }}
          >
            Check my answers ({answered} of {CASES.length})
          </button>
        ) : (
          <button
            type="button"
            className="w-btn ghost"
            onClick={() => {
              setPicks({});
              setChecked(false);
            }}
          >
            Try again
          </button>
        )}
      </div>
      {checked && (
        <div className={`w-verdict ${hits >= 5 ? "good" : "bad"}`} role="status">
          You matched {hits} of {CASES.length}. Code asks two questions: is the value in the enum, exactly, and is it allowed for this state? A no to either sends the request to the review queue.
        </div>
      )}
    </div>
  );
}
