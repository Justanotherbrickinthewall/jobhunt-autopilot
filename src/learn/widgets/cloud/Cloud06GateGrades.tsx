import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud06GateGrades.css";

type Pick = "same" | "model" | "region" | "both";

const OPTIONS: { id: Pick; label: string }[] = [
  { id: "same", label: "Yes. Same model and same region." },
  { id: "model", label: "No. A different model in the same region." },
  { id: "region", label: "No. The same model in a different region." },
  { id: "both", label: "No. A different model and a different region." },
];

type Case = {
  id: string;
  what: string;
  gateLines: string[];
  production: string;
  graded: string;
  answer: Pick;
  why: string;
};

// The model and region names come from vertex_env in vertex.tf and from the defaults in config.py.
// CHECK: vertex.tf notes that the model page lists gemini-3.5-flash for global, us and eu only, and that nobody has called it from europe-west3 on this account. Make one call there before you rely on these cases.
const CASES: Case[] = [
  {
    id: "g1",
    what: "The gate job sets neither DESK_MODEL nor VERTEX_LOCATION.",
    gateLines: ["GOOGLE_CLOUD_PROJECT is set", "DESK_MODEL is not set", "VERTEX_LOCATION is not set"],
    production: "gemini-3.5-flash in europe-west3",
    graded: "gemini-3.8-flash in global, the defaults in config.py",
    answer: "both",
    why: "With nothing set, the settings class falls back to its defaults. The gate grades a model and a location that production never uses.",
  },
  {
    id: "g2",
    what: "The gate job sets DESK_MODEL and forgets VERTEX_LOCATION.",
    gateLines: ["DESK_MODEL: gemini-3.5-flash", "VERTEX_LOCATION is not set"],
    production: "gemini-3.5-flash in europe-west3",
    graded: "gemini-3.5-flash in global",
    answer: "region",
    why: "The model is right and the location falls back to global. Which models a region serves, and how much quota it gives, differ by region. A pass in global says little about europe-west3.",
  },
  {
    id: "g3",
    what: "The gate job sets both variables to the values in vertex_env.",
    gateLines: ["DESK_MODEL: gemini-3.5-flash", "VERTEX_LOCATION: europe-west3"],
    production: "gemini-3.5-flash in europe-west3",
    graded: "gemini-3.5-flash in europe-west3",
    answer: "same",
    why: "The gate now grades what production runs. The gate still doesn't copy the retry limits or the Model Armor template, so it grades the desk without them.",
  },
  {
    id: "g4",
    what: "Next month someone changes DESK_MODEL in vertex.tf to a newer model and applies it. Nobody edits deploy.yml.",
    gateLines: ["DESK_MODEL: gemini-3.5-flash", "VERTEX_LOCATION: europe-west3"],
    production: "the newer model in europe-west3",
    graded: "gemini-3.5-flash in europe-west3",
    answer: "model",
    why: "Nothing fails. The gate keeps passing on a model that production no longer runs. The lab test that compares vertex_env with the gate's settings fails until deploy.yml agrees, so run it after every model change.",
  },
];

export default function Cloud06GateGrades({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, Pick | undefined>>({});
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);

  const answered = CASES.filter((c) => picks[c.id]).length;
  const hits = CASES.filter((c) => picks[c.id] === c.answer).length;

  const check = () => {
    setChecked(true);
    complete(`${hits} of ${CASES.length} matched`);
  };
  const reset = () => {
    setPicks({});
    setChecked(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel cloud06-gate-grades">
        <p className="cloud06-gate-grades-note">
          Production runs gemini-3.5-flash in europe-west3, as vertex_env sets it. Four versions of the gate job follow. Does the gate grade what production runs?
        </p>
        <div className="w-stack">
          {CASES.map((c, i) => {
            const pick = picks[c.id];
            const right = checked && pick === c.answer;
            const wrong = checked && pick !== c.answer;
            return (
              <fieldset key={c.id} className={`cloud06-gate-grades-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
                <legend className="cloud06-gate-grades-legend">Gate {i + 1}</legend>
                <p className="cloud06-gate-grades-what">{c.what}</p>
                <ul className="cloud06-gate-grades-lines" aria-label={`Gate ${i + 1} settings`}>
                  {c.gateLines.map((line) => (
                    <li key={line} className="w-mono">
                      {line}
                    </li>
                  ))}
                </ul>
                <div className="cloud06-gate-grades-opts" role="radiogroup" aria-label={`Gate ${i + 1} verdict`}>
                  {OPTIONS.map((o) => (
                    <label key={o.id} className={`cloud06-gate-grades-opt${pick === o.id ? " on" : ""}`}>
                      <input
                        type="radio"
                        name={`cloud06-gate-grades-${c.id}`}
                        value={o.id}
                        checked={pick === o.id}
                        disabled={checked}
                        onChange={() => setPicks((p) => ({ ...p, [c.id]: o.id }))}
                      />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
                {checked && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} role="status">
                    <dl className="cloud06-gate-grades-facts">
                      <dt>Production runs</dt>
                      <dd>{c.production}</dd>
                      <dt>The gate grades</dt>
                      <dd>{c.graded}</dd>
                    </dl>
                    <p className="cloud06-gate-grades-why">
                      {right ? "Matched. " : `Better fit: ${OPTIONS.find((o) => o.id === c.answer)?.label} `}
                      {c.why}
                    </p>
                  </motion.div>
                )}
              </fieldset>
            );
          })}
        </div>
        <div className="w-row">
          {!checked ? (
            <button type="button" className="w-btn primary" disabled={answered < CASES.length} onClick={check}>
              Check my picks ({answered} of {CASES.length})
            </button>
          ) : (
            <button type="button" className="w-btn ghost" onClick={reset}>
              Try again
            </button>
          )}
        </div>
        {checked && (
          <div className={`w-verdict ${hits >= 3 ? "good" : "bad"}`} role="status">
            You matched {hits} of {CASES.length}. The gate copies two settings from production. When the two files disagree, the gate passes on a model that nobody uses.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
