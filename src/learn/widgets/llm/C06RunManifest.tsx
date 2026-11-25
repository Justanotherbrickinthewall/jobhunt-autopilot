import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C06RunManifest.css";

type Field = { id: string; label: string; role: "need" | "help" | "skip"; why: string };

// Illustrative scenario. The incident and its causes are hand-authored for teaching.
const FIELDS: Field[] = [
  { id: "input", label: "Input document hash and storage key", role: "need", why: "Without the same invoice you are replaying a different run." },
  { id: "prompt", label: "Prompt file and git commit", role: "need", why: "The prompt text decides the instructions the model saw." },
  { id: "alias", label: "Model name you asked for", role: "help", why: "Useful, but an alias says nothing about which snapshot answered." },
  { id: "snapshot", label: "Model snapshot the provider returned", role: "need", why: "This is the only field that shows the alias moved." },
  { id: "sampling", label: "Sampling settings: temperature, top-p, output limit", role: "need", why: "Different settings give different completions." },
  { id: "index", label: "Retrieval index version", role: "need", why: "This run looked up supplier terms, so the index state matters." },
  { id: "tools", label: "Tool schema version", role: "need", why: "The chapter versions all six inputs. The tool schema is one of them, even when this run called no tools." },
  { id: "evalset", label: "Eval dataset version", role: "need", why: "The chapter versions all six inputs. The eval set is one of them, and it tells you which tests the release passed." },
  { id: "when", label: "Timestamp and request id", role: "help", why: "Handy for finding the trace and the deploy log. It does not reproduce anything." },
];
const NEEDED = FIELDS.filter((f) => f.role === "need").map((f) => f.id);

export default function C06RunManifest({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [chosen, setChosen] = useState<string[]>([]);
  const [guess, setGuess] = useState<"yes" | "no" | null>(null);
  const [replayed, setReplayed] = useState(false);
  const [replays, setReplays] = useState(0);

  const missing = FIELDS.filter((f) => f.role === "need" && !chosen.includes(f.id));
  const extras = FIELDS.filter((f) => f.role === "skip" && chosen.includes(f.id));
  const canReproduce = missing.length === 0;
  const guessedRight = guess !== null && (guess === "yes") === canReproduce;
  const sawSnapshot = chosen.includes("snapshot");

  const toggle = (id: string) => {
    if (replayed) return;
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  };
  const replay = () => {
    setReplayed(true);
    const n = replays + 1;
    setReplays(n);
    if (guessedRight) complete("Predicted whether the manifest reproduces the run");
    else if (n >= 2) complete("Misjudged what the manifest could reproduce twice, explanation shown");
  };
  const reset = () => {
    setReplayed(false);
    setChosen([]);
    setGuess(null);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel llm-run-manifest">
        <p className="llm-run-manifest-note">Illustrative scenario. Harbour Supplies, last Tuesday.</p>
        <div className="w-inset llm-run-manifest-case">
          <b>The bad answer.</b> A supplier invoice was posted with its due date 30 days early. Nobody changed the prompt. The run looked up the supplier's payment terms and used no tools. You can only debug from what the manifest recorded.
        </div>

        <fieldset className="llm-run-manifest-fields">
          <legend className="llm-run-manifest-h">Step 1. Tick the fields your manifest records on every request</legend>
          <ul className="llm-run-manifest-list">
            {FIELDS.map((f) => {
              const on = chosen.includes(f.id);
              const show = replayed;
              return (
                <li key={f.id}>
                  <label className={`llm-run-manifest-field${on ? " on" : ""}`}>
                    <input type="checkbox" checked={on} disabled={replayed} onChange={() => toggle(f.id)} />
                    <span>
                      {f.label}
                      {show && (
                        <span className={`llm-run-manifest-why ${f.role === "need" ? (on ? "ok" : "no") : on && f.role === "skip" ? "no" : ""}`}>
                          {f.role === "need" ? (on ? "Needed. " : "Needed, and missing. ") : f.role === "skip" ? "Not needed. " : "Helpful. "}
                          {f.why}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <fieldset className="llm-run-manifest-guess">
          <legend className="llm-run-manifest-h">Step 2. Predict: can you reproduce Tuesday's answer from these fields?</legend>
          <div className="w-row">
            {(["yes", "no"] as const).map((g) => (
              <button key={g} type="button" className="w-chip" aria-pressed={guess === g} disabled={replayed} onClick={() => setGuess(g)}>
                {g === "yes" ? "Yes, I can" : "No, something is missing"}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="w-row">
          {!replayed ? (
            <button type="button" className="w-btn" disabled={guess === null || chosen.length === 0} onClick={replay}>
              Replay Tuesday's run
            </button>
          ) : (
            <button type="button" className="w-btn ghost" onClick={reset}>
              Try another manifest
            </button>
          )}
        </div>

        {replayed && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`w-verdict ${guessedRight ? "good" : "bad"}`} role="status">
            {canReproduce
              ? "The replay matches Tuesday's wrong due date. "
              : `The replay cannot be trusted. Missing: ${missing.map((m) => m.label.toLowerCase()).join("; ")}. `}
            {guessedRight ? "Your prediction was right. " : "Your prediction was wrong. "}
            {sawSnapshot
              ? "The returned snapshot differs from the one in the last good manifest, which shows the model alias moved overnight. That is the cause."
              : "Without the returned snapshot you cannot see that the alias moved overnight, which is the real cause here. Replaying against the alias today runs the new model and proves nothing."}
            {extras.length > 0 && ` You also stored ${extras.length} field${extras.length > 1 ? "s" : ""} that cannot help with this run.`}
          </motion.div>
        )}
        <p className="llm-run-manifest-note">Needed to reproduce this run: {NEEDED.length} fields. Everything else is context.</p>
      </div>
    </MotionConfig>
  );
}
