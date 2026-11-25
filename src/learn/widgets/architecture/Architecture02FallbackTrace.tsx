import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Architecture02FallbackTrace.css";

// Seven failures of one desk model call. The rule is the one in `is_provider_error`: fall back to Claude when the
// provider is the problem, and raise when the request or our own code is. Every case is illustrative.

type Action = "fallback" | "raise";

const ACTIONS: { id: Action; label: string }[] = [
  { id: "fallback", label: "Fall back to Claude" },
  { id: "raise", label: "Raise it" },
];

type Failure = { id: string; text: string; detail: string; answer: Action; why: string };

const FAILURES: Failure[] = [
  {
    id: "f1",
    text: "Gemini answers with status 429, too many requests.",
    detail: "status 429",
    answer: "fallback",
    why: "A 429 means the provider is out of capacity for you right now. Claude has its own quota, so it can answer.",
  },
  {
    id: "f2",
    text: "Gemini answers with status 503, service unavailable.",
    detail: "status 503",
    answer: "fallback",
    why: "Any 5xx is the provider's fault. The same request may well succeed on another provider.",
  },
  {
    id: "f3",
    text: "The connection drops before Gemini replies.",
    detail: "httpx.ConnectError, a kind of httpx.TransportError",
    answer: "fallback",
    why: "A dropped connection or a timeout says nothing about the request. The provider, or the network to it, is the problem.",
  },
  {
    id: "f4",
    text: "Gemini answers with status 401, the credentials are rejected.",
    detail: "status 401",
    answer: "raise",
    why: "This is our configuration. Falling back would hide it, and the desk would pay Claude's prices every day while looking healthy. Raise it so someone fixes the key.",
  },
  {
    id: "f5",
    text: "Gemini answers with status 400, the request is invalid.",
    detail: "status 400",
    answer: "raise",
    why: "The same request would fail on Claude too, or worse, pass on Claude and hide a bug in our code. Raise it.",
  },
  {
    id: "f6",
    text: "LangChain raises its own error, with no status on it. The error that caused it is a 500.",
    detail: "no status; __cause__ has status 500",
    answer: "fallback",
    why: "LangChain wraps the SDK's error in its own, so the status is often one level down. The function follows the cause chain, up to five deep, and the first status it finds decides.",
  },
  {
    id: "f7",
    text: "A model call raises an error with no status and no cause. Nothing says the provider failed.",
    detail: "no status; no __cause__ or __context__",
    answer: "raise",
    why: "With nothing to point at the provider, the function returns False. Blaming the provider without evidence would hide our own bugs.",
  },
];

export default function Architecture02FallbackTrace({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<Record<string, Action | undefined>>({});
  const [checked, setChecked] = useState(false);

  const answered = FAILURES.filter((f) => picks[f.id]).length;
  const hits = FAILURES.filter((f) => picks[f.id] === f.answer).length;

  const check = () => {
    setChecked(true);
    complete(`${hits} of ${FAILURES.length} failures sorted correctly`);
  };
  const reset = () => {
    setPicks({});
    setChecked(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel architecture02-fallback-trace">
        <p className="architecture02-fallback-trace-note">
          One desk call went to Gemini and failed. Choose what the wrapper does for each failure. Illustrative cases.
        </p>
        <div className="w-stack">
          {FAILURES.map((f, i) => {
            const pick = picks[f.id];
            const right = checked && pick === f.answer;
            const wrong = checked && pick !== f.answer;
            return (
              <fieldset key={f.id} className={`architecture02-fallback-trace-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
                <legend className="architecture02-fallback-trace-legend">Failure {i + 1}</legend>
                <p className="architecture02-fallback-trace-text">{f.text}</p>
                <p className="architecture02-fallback-trace-detail w-mono">{f.detail}</p>
                <div className="architecture02-fallback-trace-opts" role="radiogroup" aria-label={`Failure ${i + 1} action`}>
                  {ACTIONS.map((a) => (
                    <label key={a.id} className={`architecture02-fallback-trace-opt${pick === a.id ? " on" : ""}`}>
                      <input
                        type="radio"
                        name={`architecture02-fallback-trace-${f.id}`}
                        value={a.id}
                        checked={pick === a.id}
                        disabled={checked}
                        onChange={() => setPicks((p) => ({ ...p, [f.id]: a.id }))}
                      />
                      <span>{a.label}</span>
                    </label>
                  ))}
                </div>
                {checked && (
                  <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="architecture02-fallback-trace-why" role="status">
                    {right ? "Matched. " : `Better: ${f.answer === "fallback" ? "fall back to Claude" : "raise it"}. `}
                    {f.why}
                  </motion.p>
                )}
              </fieldset>
            );
          })}
        </div>
        <div className="w-row">
          {!checked ? (
            <button type="button" className="w-btn primary" disabled={answered < FAILURES.length} onClick={check}>
              Check my choices ({answered} of {FAILURES.length})
            </button>
          ) : (
            <button type="button" className="w-btn ghost" onClick={reset}>
              Try again
            </button>
          )}
        </div>
        {checked && (
          <div className={`w-verdict ${hits >= 6 ? "good" : "bad"}`} role="status">
            You matched {hits} of {FAILURES.length}. The rule: fall back when the provider is the problem, which means a 429, a 5xx, a timeout or a dropped connection.
            Raise everything else, because a fallback that fires on our own mistakes hides them.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
