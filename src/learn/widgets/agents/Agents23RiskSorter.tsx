import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents23RiskSorter.css";

const OPTS: { id: string; label: string }[] = [
  { id: "read", label: "Read-only" },
  { id: "reversible", label: "Reversible" },
  { id: "irreversible", label: "Irreversible" },
];

const ITEMS: { id: string; text: string; answer: string; why: string }[] = [
  { id: "a", text: "Read the status section of PEP 703 to answer a question.", answer: "read", why: "Nothing changes anywhere. A schema check and a policy check are enough." },
  { id: "b", text: "Post an answer to a public forum thread.", answer: "reversible", why: "A person can edit or delete the post. Some readers will have seen it, so the text still gets a content check." },
  { id: "c", text: "Email a subscriber that PEP 703 is accepted.", answer: "irreversible", why: "A sent email can't be recalled. It needs the three checks and a person's approval." },
  { id: "d", text: "File a correction to the PEP index, which other sites copy.", answer: "irreversible", why: "Once copied, the correction can't be pulled back from every mirror. Treat it as irreversible." },
  { id: "e", text: "Save a draft answer in the desk's own database.", answer: "reversible", why: "The desk owns the row and can overwrite or delete it. No one outside sees it." },
  { id: "f", text: "Search the PEPs for the word walrus.", answer: "read", why: "A search changes nothing. It needs no content check and no approval." },
];

export default function Agents23RiskSorter({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, string | undefined>>({});
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);
  const answered = ITEMS.filter((i) => picks[i.id]).length;
  const hits = ITEMS.filter((i) => picks[i.id] === i.answer).length;

  return (
    <div className="w-panel agents23-risk-sorter">
      <p className="agents23-risk-sorter-note">Sort each action on the PEP desk by what happens if it is wrong. Predict all six, then check.</p>
      <div className="w-stack">
        {ITEMS.map((it) => {
          const pick = picks[it.id];
          const right = checked && pick === it.answer;
          const wrong = checked && pick !== it.answer;
          return (
            <fieldset key={it.id} className={`agents23-risk-sorter-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
              <legend className="agents23-risk-sorter-legend">Situation</legend>
              <p className="agents23-risk-sorter-text">{it.text}</p>
              <div className="agents23-risk-sorter-opts" role="radiogroup" aria-label={it.text}>
                {OPTS.map((o) => (
                  <label key={o.id} className={`agents23-risk-sorter-opt${pick === o.id ? " on" : ""}`}>
                    <input
                      type="radio"
                      name={`agents23-risk-sorter-${it.id}`}
                      checked={pick === o.id}
                      disabled={checked}
                      onChange={() => setPicks((p) => ({ ...p, [it.id]: o.id }))}
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
              </div>
              {checked && (
                <p className="agents23-risk-sorter-why" role="status">
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
        <div className={`w-verdict ${hits >= ITEMS.length - 1 ? "good" : "bad"}`} role="status">
          You matched {hits} of {ITEMS.length}. The test is one question: can the system take it back before anyone relies on it? If not, the action is irreversible and a person approves it.
        </div>
      )}
    </div>
  );
}
