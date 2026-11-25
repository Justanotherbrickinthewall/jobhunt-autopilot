import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents12FitCheck.css";

type Pick = "workflow" | "loop";

const OPTS: { id: Pick; label: string }[] = [
  { id: "workflow", label: "Fixed workflow" },
  { id: "loop", label: "Model-driven loop" },
];

const ITEMS: { id: string; text: string; answer: Pick; why: string }[] = [
  { id: "a", text: "Answer a cited question about one PEP, 10,000 times a day, with the same four steps.", answer: "workflow", why: "The steps are known and repeat. A fixed path is cheaper and its cost is capped." },
  { id: "b", text: "Trace how the typing PEPs changed over ten years. The number of lookups is unknown.", answer: "loop", why: "Each result decides the next query. You can't write the edges in advance." },
  { id: "c", text: "A desk whose every answer must come with a log of the exact steps taken, for an audit.", answer: "workflow", why: "The saved path is the audit trail. A loop gives you a transcript to interpret." },
  { id: "d", text: "Explore an unfamiliar archive with no known layout and find what is in it.", answer: "loop", why: "Open-ended exploration is what a loop is for. A fixed graph has no edge for what you haven't seen." },
  { id: "e", text: "A team that wants a unit test for each class of question, asserting the route taken.", answer: "workflow", why: "Script the model's choice and assert the path. That test is trivial in a workflow." },
  { id: "f", text: "A step that, if wrong, sends an irreversible message to a customer.", answer: "workflow", why: "Where a wrong step is costly, code should own the path and check the choice." },
];

export default function Agents12FitCheck({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, Pick | undefined>>({});
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);
  const answered = ITEMS.filter((i) => picks[i.id]).length;
  const hits = ITEMS.filter((i) => picks[i.id] === i.answer).length;

  return (
    <div className="w-panel agents12-fit-check">
      <p className="agents12-fit-check-note">Which design fits each situation? Predict all six, then check.</p>
      <div className="w-stack">
        {ITEMS.map((it) => {
          const pick = picks[it.id];
          const right = checked && pick === it.answer;
          const wrong = checked && pick !== it.answer;
          return (
            <fieldset key={it.id} className={`agents12-fit-check-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
              <legend className="agents12-fit-check-legend">Situation</legend>
              <p className="agents12-fit-check-text">{it.text}</p>
              <div className="agents12-fit-check-opts" role="radiogroup" aria-label={it.text}>
                {OPTS.map((o) => (
                  <label key={o.id} className={`agents12-fit-check-opt${pick === o.id ? " on" : ""}`}>
                    <input
                      type="radio"
                      name={`agents12-fit-check-${it.id}`}
                      checked={pick === o.id}
                      disabled={checked}
                      onChange={() => setPicks((p) => ({ ...p, [it.id]: o.id }))}
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
              </div>
              {checked && (
                <p className="agents12-fit-check-why" role="status">
                  {right ? "Matched. " : `Better fit: ${OPTS.find((o) => o.id === it.answer)?.label}. `}
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
        <div className={`w-verdict ${hits >= 5 ? "good" : "bad"}`} role="status">
          You matched {hits} of {ITEMS.length}. The test: can you write the steps down in advance? If you can, or if a wrong step is costly, use a workflow. If each result decides the next move, use a loop.
        </div>
      )}
    </div>
  );
}
