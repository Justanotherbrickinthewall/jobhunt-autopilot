import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents15SafeToSplit.css";

type Verdict = "fan" | "order";

const OPTIONS: { id: Verdict; label: string }[] = [
  { id: "fan", label: "Fan out" },
  { id: "order", label: "Run in order" },
];

const CASES: { id: string; text: string; answer: Verdict; why: string }[] = [
  { id: "key-facts", text: "Question: give the key fact from PEP 8, PEP 572 and PEP 703. Split: one sub-question for each PEP.", answer: "fan", why: "Each sub-question reads its own PEP. None needs another one's answer." },
  { id: "feature-version", text: "Question: which Python version added the feature PEP 572 introduced? Split: what PEP 572 adds, and which version added that feature.", answer: "order", why: "Sub-question 2 says 'that feature'. It cannot know which one until sub-question 1 answers." },
  { id: "eighteen", text: "Question: summarise each of the 18 PEPs on the desk. Split: one sub-question for each PEP.", answer: "fan", why: "Eighteen independent reads. Watch the rate limit, and cap the worker count." },
  { id: "replacement", text: "Question: find the PEP that replaced an old one, then summarise the new PEP. Split: find it, then summarise it.", answer: "order", why: "The second sub-question needs the number that the first one finds." },
  { id: "draft", text: "Question: draft an answer, then list its weak claims. Split: write the draft, and list the weak claims.", answer: "order", why: "The second sub-question critiques the first one's output. That is a writer and a critic, from chapter 14." },
  { id: "compare", text: "Question: which is stricter on line length, PEP 8 or a second style guide? Split: look up each rule. Compare after the merge.", answer: "fan", why: "The two lookups are independent. The comparison needs both, so it belongs after the merge." },
];

export default function Agents15SafeToSplit({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, Verdict | undefined>>({});
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);
  const answered = CASES.filter((c) => picks[c.id]).length;
  const hits = CASES.filter((c) => picks[c.id] === c.answer).length;

  return (
    <div className="w-panel agents15-safe-to-split">
      <p className="agents15-safe-to-split-note">For each split, decide whether the sub-questions are independent. Predict first, then check all six.</p>
      <div className="w-stack">
        {CASES.map((c) => {
          const pick = picks[c.id];
          const right = checked && pick === c.answer;
          const wrong = checked && pick !== c.answer;
          return (
            <fieldset key={c.id} className={`agents15-safe-to-split-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
              <legend className="agents15-safe-to-split-legend">Split</legend>
              <p className="agents15-safe-to-split-text">{c.text}</p>
              <div className="agents15-safe-to-split-opts" role="radiogroup" aria-label={c.text}>
                {OPTIONS.map((o) => (
                  <label key={o.id} className={`agents15-safe-to-split-opt${pick === o.id ? " on" : ""}`}>
                    <input
                      type="radio"
                      name={`agents15-safe-${c.id}`}
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
                <p className="agents15-safe-to-split-why" role="status">
                  {right ? "Matched. " : `Better fit: ${OPTIONS.find((o) => o.id === c.answer)?.label}. `}
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
            Check my calls ({answered} of {CASES.length})
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
          You matched {hits} of {CASES.length}. The test: does any sub-question need the text another one will produce? If it does, the sub-questions are not independent. Run them in order, or fan out only the independent lookups.
        </div>
      )}
    </div>
  );
}
