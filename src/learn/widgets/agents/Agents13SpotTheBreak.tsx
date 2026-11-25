import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents13SpotTheBreak.css";

type Bucket = string;

const BUCKETS: { id: Bucket; label: string }[] = [
  { id: "invented", label: "Invented tool" },
  { id: "hidden", label: "Hidden dependency" },
  { id: "stale", label: "Stale plan" },
  { id: "cap", label: "Replan cap reached" },
  { id: "fine", label: "No break" },
];

const ITEMS: { id: string; name: string; answer: Bucket; why: string }[] = [
  { id: "invent", name: "The plan has a step that calls web_search. The desk has three tools and none is called that.", answer: "invented", why: "The planner named a tool that does not exist. The executor gets a ToolError that lists the real tools." },
  { id: "guess", name: "The plan was written before any lookup. Its third step searches for `3.6`. Step two then returns `3.8`.", answer: "hidden", why: "The planner guessed a value that step two was meant to supply. Step three depended on step two, and the plan hid it." },
  { id: "stale", name: "The plan reads three sections of PEP 703. Step one returns that PEP has no such section, and steps two and three still run.", answer: "stale", why: "Step one found something the plan did not expect, so the later steps no longer fit. Only a replan can fix it." },
  { id: "fine", name: "Three independent reads of PEP 8, PEP 572 and PEP 703 all succeed, and the answer joins them.", answer: "fine", why: "Steps that do not depend on each other suit a fixed plan. Nothing breaks here." },
  { id: "cap", name: "A step fails, the replanner returns the same failing step, and the run goes on after one replan.", answer: "cap", why: "The cap did its job. Without it the run would replan forever. The failed result goes to the writer, which should say so." },
];

export default function Agents13SpotTheBreak({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, Bucket | undefined>>({});
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);
  const answered = ITEMS.filter((i) => picks[i.id]).length;
  const hits = ITEMS.filter((i) => picks[i.id] === i.answer).length;

  return (
    <div className="w-panel agents13-spot-the-break">
      <p className="agents13-spot-the-break-note">Name the failure in each plan, then check all five. One of them is not a failure.</p>
      <div className="w-stack">
        {ITEMS.map((it) => {
          const pick = picks[it.id];
          const right = checked && pick === it.answer;
          const wrong = checked && pick !== it.answer;
          return (
            <fieldset key={it.id} className={`agents13-spot-the-break-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
              <legend className="agents13-spot-the-break-legend">Plan</legend>
              <p className="agents13-spot-the-break-text">{it.name}</p>
              <div className="agents13-spot-the-break-opts" role="radiogroup" aria-label={it.name}>
                {BUCKETS.map((b) => (
                  <label key={b.id} className={`agents13-spot-the-break-opt${pick === b.id ? " on" : ""}`}>
                    <input
                      type="radio"
                      name={`agents13-spot-the-break-${it.id}`}
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
                <p className="agents13-spot-the-break-why" role="status">
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
          You matched {hits} of {ITEMS.length}. A plan breaks where it guessed at something it could not know yet. The cure is a replan, a check on tool names, or a loop step that reads earlier results.
        </div>
      )}
    </div>
  );
}
