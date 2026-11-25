import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents13CountCalls.css";

type Bucket = string;

const BUCKETS: { id: Bucket; label: string }[] = [
  { id: "2", label: "2 calls" },
  { id: "3", label: "3 calls" },
  { id: "4", label: "4 calls" },
  { id: "5", label: "5 calls" },
  { id: "6", label: "6 calls" },
];

const ITEMS: { id: string; name: string; answer: Bucket; why: string }[] = [
  { id: "react3", name: "A tool loop answers after three lookups. How many model calls?", answer: "4", why: "Each lookup is one call that picks the tool, and the answer is the fourth call." },
  { id: "pe3", name: "Plan-and-execute with three direct tool steps and no failure. How many model calls?", answer: "2", why: "One call writes the plan and one writes the answer. Direct steps need no model call." },
  { id: "pe_loop", name: "The same plan, but the third step is a small loop that takes two calls. How many model calls?", answer: "4", why: "Plan, two loop calls and the final write-up make four. This is the clean run in the chapter." },
  { id: "pe_replan", name: "The same run, but step two fails once and the replanner fixes it. How many model calls?", answer: "5", why: "The replan is one extra call, so the clean run's four become five." },
  { id: "rewoo", name: "ReWOO with three tool calls and #E ids. How many model calls?", answer: "2", why: "One call writes every tool call up front and one call writes the answer. The executor needs none." },
];

export default function Agents13CountCalls({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, Bucket | undefined>>({});
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);
  const answered = ITEMS.filter((i) => picks[i.id]).length;
  const hits = ITEMS.filter((i) => picks[i.id] === i.answer).length;

  return (
    <div className="w-panel agents13-count-calls">
      <p className="agents13-count-calls-note">Predict the model calls for each run, then check all five. Direct tool steps cost no model call. Only planning, loops, replans and the final write-up do.</p>
      <div className="w-stack">
        {ITEMS.map((it) => {
          const pick = picks[it.id];
          const right = checked && pick === it.answer;
          const wrong = checked && pick !== it.answer;
          return (
            <fieldset key={it.id} className={`agents13-count-calls-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
              <legend className="agents13-count-calls-legend">Run</legend>
              <p className="agents13-count-calls-text">{it.name}</p>
              <div className="agents13-count-calls-opts" role="radiogroup" aria-label={it.name}>
                {BUCKETS.map((b) => (
                  <label key={b.id} className={`agents13-count-calls-opt${pick === b.id ? " on" : ""}`}>
                    <input
                      type="radio"
                      name={`agents13-count-calls-${it.id}`}
                      value={b.id}
                      checked={pick === b.id}
                      disabled={checked}
                      onChange={() => setPicks((p) => ({ ...p, [it.id]: b.id }))}
                    />
                    <span>{b.label}</span>
                  </label>
                ))}
              </div>
              {checked && (
                <p className="agents13-count-calls-why" role="status">
                  {right ? "Right. " : `Better answer: ${BUCKETS.find((b) => b.id === it.answer)?.label}. `}
                  {it.why}
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
            disabled={answered < ITEMS.length}
            onClick={() => {
              setChecked(true);
              complete(`${hits} of ${ITEMS.length} matched`);
            }}
          >
            Check my answers ({answered} of {ITEMS.length})
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
        <div className={`w-verdict ${hits >= 4 ? "good" : "bad"}`} role="status">
          You matched {hits} of {ITEMS.length}. Count only the calls that need a model. A step that is a plain tool call with fixed arguments costs nothing, and that is where plan-and-execute and ReWOO save calls.
        </div>
      )}
    </div>
  );
}
