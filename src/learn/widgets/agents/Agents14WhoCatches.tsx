import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents14WhoCatches.css";

type Who = "critic" | "code";

const WHO: { id: Who; label: string }[] = [
  { id: "critic", label: "The critic can catch it" },
  { id: "code", label: "Only a grounded check catches it" },
];

const ITEMS: { id: string; flaw: string; answer: Who; why: string }[] = [
  { id: "ghost", flaw: "The draft cites PEP 527, and the desk has no PEP 527.", answer: "code", why: "The critic has no list of real PEPs. A lookup in the fake tools answers it with certainty." },
  { id: "half", flaw: "The question asks for a PEP and a version. The draft gives only the PEP.", answer: "critic", why: "Comparing the answer with the question is a judgement a model makes well." },
  { id: "ver", flaw: "The draft says the walrus operator arrived in Python 3.9.", answer: "code", why: "The critic may agree with a confident version. python_feature_version returns 3.8." },
  { id: "ramble", flaw: "The second paragraph repeats the first in different words.", answer: "critic", why: "Repetition and clarity are soft qualities. Code has no rule for them." },
  { id: "wrongpep", flaw: "The draft cites PEP 8, which exists, as the source of the walrus operator.", answer: "code", why: "The number is real, so an existence check passes. Code can still read the PEP and look for the word walrus." },
  { id: "tone", flaw: "The answer is chatty and uses slang.", answer: "critic", why: "Register is a judgement. The critic can flag it if its prompt has a tone rule." },
];

export default function Agents14WhoCatches({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, Who | undefined>>({});
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);
  const answered = ITEMS.filter((i) => picks[i.id]).length;
  const hits = ITEMS.filter((i) => picks[i.id] === i.answer).length;

  return (
    <div className="w-panel agents14-who-catches">
      <p className="agents14-who-catches-note">Each draft has one flaw. Decide what catches it, then check all six.</p>
      <div className="w-stack">
        {ITEMS.map((it) => {
          const pick = picks[it.id];
          const right = checked && pick === it.answer;
          const wrong = checked && pick !== it.answer;
          return (
            <fieldset key={it.id} className={`agents14-who-catches-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
              <legend className="agents14-who-catches-legend">Flaw</legend>
              <p className="agents14-who-catches-text">{it.flaw}</p>
              <div className="agents14-who-catches-opts" role="radiogroup" aria-label={it.flaw}>
                {WHO.map((w) => (
                  <label key={w.id} className={`agents14-who-catches-opt${pick === w.id ? " on" : ""}`}>
                    <input
                      type="radio"
                      name={`agents14-who-catches-${it.id}`}
                      value={w.id}
                      checked={pick === w.id}
                      disabled={checked}
                      onChange={() => setPicks((p) => ({ ...p, [it.id]: w.id }))}
                    />
                    <span>{w.label}</span>
                  </label>
                ))}
              </div>
              {checked && (
                <p className="agents14-who-catches-why" role="status">
                  {right ? "Matched. " : `Better fit: ${WHO.find((w) => w.id === it.answer)?.label}. `}
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
          You matched {hits} of {ITEMS.length}. The rule: facts that a lookup can settle belong to a grounded check. Judgements about the answer as prose belong to the critic.
        </div>
      )}
    </div>
  );
}
