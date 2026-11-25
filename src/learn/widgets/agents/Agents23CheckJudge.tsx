import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents23CheckJudge.css";

const OPTS: { id: string; label: string }[] = [
  { id: "schema", label: "Schema check" },
  { id: "policy", label: "Policy check" },
  { id: "content", label: "Content check" },
  { id: "pass", label: "All pass" },
];

const ITEMS: { id: string; text: string; answer: string; why: string }[] = [
  { id: "a", text: "Email to bob@example.org. The state lists only ana@example.org as a subscriber.", answer: "policy", why: "The arguments are well formed, but this state does not allow mail to a stranger." },
  { id: "b", text: "A forum post that says, in full: PEP 703 will ship in Python 3.14.", answer: "content", why: "The number 3.14 did not come from the trusted facts. The model made it up." },
  { id: "c", text: "A correction where the pep field is the string \"703\" and not the integer 703.", answer: "schema", why: "The type is wrong, so the schema check stops it before any other check reads it." },
  { id: "d", text: "A forum post that reads: PEP 703. Lets CPython build without the GIL. Details: https://peps.python.org/pep-0703/", answer: "pass", why: "The only number and link come from the trusted facts, the thread is open and the fields are right." },
  { id: "e", text: "A forum post to thread t-77. The state lists only t-901 as open.", answer: "policy", why: "The thread is not open for answers in this state, even though the arguments are well formed." },
  { id: "f", text: "A forum post that ends with Details: {{link}}. The desk knows only pep, title, status and url.", answer: "content", why: "The model used a placeholder name that code can't fill. The content check catches the unfilled placeholder." },
];

export default function Agents23CheckJudge({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, string | undefined>>({});
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);
  const answered = ITEMS.filter((i) => picks[i.id]).length;
  const hits = ITEMS.filter((i) => picks[i.id] === i.answer).length;

  return (
    <div className="w-panel agents23-check-judge">
      <p className="agents23-check-judge-note">Each case is a proposal after code filled the placeholders. Say which check stops it, or whether all pass.</p>
      <div className="w-stack">
        {ITEMS.map((it) => {
          const pick = picks[it.id];
          const right = checked && pick === it.answer;
          const wrong = checked && pick !== it.answer;
          return (
            <fieldset key={it.id} className={`agents23-check-judge-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
              <legend className="agents23-check-judge-legend">Situation</legend>
              <p className="agents23-check-judge-text">{it.text}</p>
              <div className="agents23-check-judge-opts" role="radiogroup" aria-label={it.text}>
                {OPTS.map((o) => (
                  <label key={o.id} className={`agents23-check-judge-opt${pick === o.id ? " on" : ""}`}>
                    <input
                      type="radio"
                      name={`agents23-check-judge-${it.id}`}
                      checked={pick === o.id}
                      disabled={checked}
                      onChange={() => setPicks((p) => ({ ...p, [it.id]: o.id }))}
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
              </div>
              {checked && (
                <p className="agents23-check-judge-why" role="status">
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
          You matched {hits} of {ITEMS.length}. Order matters. Schema asks if it is well formed, policy asks if it is allowed now, and content asks if the words are safe to send.
        </div>
      )}
    </div>
  );
}
