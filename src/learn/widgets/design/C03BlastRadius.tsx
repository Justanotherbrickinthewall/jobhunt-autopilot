import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C03BlastRadius.css";

const TIERS = ["Tier 0: alone", "Tier 1: alone, capped", "Tier 2: person approves", "Tier 3: not a tool"];

type Action = { id: string; name: string; worst: string; reversible: string; answer: number; why: string };
// Listed from the smallest worst case to the largest.
const ACTIONS: Action[] = [
  {
    id: "search",
    name: "search_invoices for the caller's tenant, at most 50 reads a run",
    worst: "No money changes hands and no data leaves the tenant.",
    reversible: "Nothing to undo.",
    answer: 0,
    why: "A tenant-scoped read changes nothing, so it acts alone. The cap on reads is a cost control, not a safety control.",
  },
  {
    id: "supplier",
    name: "get_supplier, with the bank account masked to its last four digits",
    worst: "Four digits of an account number are exposed to the run.",
    reversible: "Nothing to undo.",
    answer: 0,
    why: "The masked value is no use to an attacker. The same tool returning the full number would be a different decision.",
  },
  {
    id: "hold-small",
    name: "place_payment_hold on one invoice under £5,000, at most 10 a run",
    worst: "10 times £5,000 is £50,000 of payments delayed.",
    reversible: "Release the hold and only time is lost.",
    answer: 1,
    why: "The write is reversible and the worst case is finite because of the cap. That is what a capped, logged Tier 1 action looks like.",
  },
  {
    id: "hold-large",
    name: "place_payment_hold on one invoice of £48,000",
    worst: "One call delays £48,000, with late fees and a strained supplier.",
    reversible: "The hold can be released, but the damage may not be undone.",
    answer: 2,
    why: "It is above the cap that made small holds safe. Reversible in the system does not mean harmless to the supplier, so a person approves it.",
  },
  {
    id: "email",
    name: "email_supplier with a status update, at most 5 a run",
    worst: "Five messages go to outside parties in Harbour's name.",
    reversible: "An email cannot be recalled.",
    answer: 2,
    why: "It is external and irreversible. A person approves the exact text, whatever the model's confidence.",
  },
  {
    id: "bank",
    name: "Change a supplier's bank details",
    worst: "Every later payment to that supplier goes to a stranger's account.",
    reversible: "Paid money does not come back.",
    answer: 3,
    why: "One injected instruction could redirect a supplier's payments. Remove the tool. A person makes the change after a call-back to a known number.",
  },
  {
    id: "release",
    name: "Release a payment run",
    worst: "Money leaves the company, in any amount.",
    reversible: "Not reversible once the bank has it.",
    answer: 3,
    why: "The agent's job ends before payment. Removing the capability is stronger than gating it, because there is nothing to call.",
  },
];

export default function C03BlastRadius({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<(number | null)[]>(ACTIONS.map(() => null));
  const [revealed, setRevealed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const ready = picks.every((p) => p !== null);
  const correct = picks.filter((p, i) => p === ACTIONS[i].answer).length;
  const done = revealed && (correct === ACTIONS.length || attempt >= 2);

  const check = () => {
    const n = attempt + 1;
    setAttempt(n);
    setRevealed(true);
    if (correct === ACTIONS.length || n >= 2) complete(`${correct} of ${ACTIONS.length} actions given the right tier on attempt ${n}`);
  };
  const retry = () => {
    setPicks((ps) => ps.map((x, i) => (x === ACTIONS[i].answer ? x : null)));
    setRevealed(false);
  };

  return (
    <div className="w-panel design-blast-radius">
      <p className="design-blast-radius-hint">
        Illustrative figures for Harbour Supplies, a fictional customer. Actions run from the smallest worst case to the largest.
      </p>
      <ul className="design-blast-radius-legend">
        <li><b>Tier 0</b> acts alone: reads that return nothing sensitive and change nothing.</li>
        <li><b>Tier 1</b> acts alone inside a hard cap, with a log: reversible writes.</li>
        <li><b>Tier 2</b> needs a person to approve the exact arguments: irreversible, external or large.</li>
        <li><b>Tier 3</b> is not a tool: a person does it outside the agent.</li>
      </ul>

      {ACTIONS.map((a, i) => {
        const p = picks[i];
        const ok = p === a.answer;
        return (
          <section key={a.id} className="design-blast-radius-card" aria-label={`Action ${i + 1}`}>
            <p className="design-blast-radius-name">
              <span className="w-mono">{i + 1}</span> {a.name}
            </p>
            <p className="design-blast-radius-facts">
              <b>Worst case:</b> {a.worst} <b>Undo:</b> {a.reversible}
            </p>
            <div className="w-row" role="radiogroup" aria-label="Tier">
              {TIERS.map((t, ti) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={p === ti}
                  disabled={revealed || (attempt > 0 && ok)}
                  className={`w-chip${p === ti ? " is-on" : ""}${done && ti === a.answer ? " good" : ""}`}
                  onClick={() => setPicks((ps) => ps.map((x, j) => (j === i ? ti : x)))}
                >
                  {t}
                </button>
              ))}
            </div>
            {revealed && (
              <p className={`design-blast-radius-why ${ok ? "ok" : "miss"}`}>
                {ok ? "Correct. " : done ? `Missed: this is ${TIERS[a.answer]}. ` : "Not that tier. "}
                {(ok || done) && a.why}
              </p>
            )}
          </section>
        );
      })}

      {!revealed && (
        <button type="button" className="w-btn" disabled={!ready} onClick={check}>
          Check my tiers
        </button>
      )}
      {revealed && !done && (
        <button type="button" className="w-btn" onClick={retry}>
          Try the missed ones again
        </button>
      )}
      {done && (
        <div className={`w-verdict ${correct >= 6 ? "good" : "bad"}`} role="status">
          <strong>
            {correct} of {ACTIONS.length} tiers matched.
          </strong>{" "}
          The tier follows the worst case and whether you can undo it. A cap makes a reversible write safe to run alone. An action that is external, irreversible or large gets a person. An action where one injection could send money out should not be a tool.
        </div>
      )}
    </div>
  );
}
