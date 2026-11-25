import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C01Sequencer.css";

type Step = { id: string; label: string; minutes: number; why: string };

// The template order, which is the answer.
const ORDER: Step[] = [
  { id: "volumes", label: "Users and volumes", minutes: 2, why: "Every later number depends on how many people use it and how many requests arrive in a day." },
  { id: "nfr", label: "Non-functionals", minutes: 3, why: "The targets for latency, cost, accuracy and residency decide which components are allowed." },
  { id: "components", label: "Components", minutes: 6, why: "With the targets fixed, you can choose parts that meet them and say why." },
  { id: "flow", label: "Data flow", minutes: 6, why: "The arrows show where a request waits, fails or costs money." },
  { id: "failure", label: "Failure modes", minutes: 8, why: "You can only break a design that exists, and the breaks decide what you must measure." },
  { id: "evals", label: "Evals", minutes: 5, why: "You measure the failures you have just named." },
  { id: "rollout", label: "Rollout", minutes: 3, why: "You release in stages against those measures." },
];

// A fixed shuffle so the pool never starts in the answer order.
const POOL_ORDER = ["failure", "rollout", "components", "volumes", "evals", "flow", "nfr"];

export default function C01Sequencer({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [placed, setPlaced] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [done, setDone] = useState(false);
  const [checked, setChecked] = useState(false);

  const byId = (id: string) => ORDER.find((s) => s.id === id)!;
  const pool = POOL_ORDER.filter((id) => !placed.includes(id));
  const inPlace = placed.filter((id, i) => ORDER[i].id === id).length;
  const allPlaced = placed.length === ORDER.length;

  function add(id: string) {
    if (done) return;
    setChecked(false);
    setPlaced((p) => [...p, id]);
  }
  function remove(id: string) {
    if (done) return;
    setChecked(false);
    setPlaced((p) => p.filter((x) => x !== id));
  }
  function check() {
    const n = attempts + 1;
    setAttempts(n);
    setChecked(true);
    if (inPlace === ORDER.length) {
      setDone(true);
      complete(n === 1 ? "Ordered all seven steps correctly on the first try" : "Ordered all seven steps correctly on the second try");
    } else if (n >= 2) {
      setDone(true);
      complete(`${inPlace} of 7 steps in place after two tries, explanation read`);
    }
  }

  const perfect = done && inPlace === ORDER.length;

  return (
    <div className="w-panel design-sequencer">
      <p className="design-sequencer-lede">
        The interviewer reads you the prompt: design an assistant that answers Harbour Supplies suppliers about invoice status. You have 45 minutes. Tap the seven steps in the order you would speak them.
      </p>
      <div className="design-sequencer-cols">
        <div>
          <span className="w-label">Steps to place</span>
          <ul className="design-sequencer-list">
            {pool.map((id) => (
              <li key={id}>
                <button type="button" className="w-chip design-sequencer-step" onClick={() => add(id)} disabled={done}>
                  {byId(id).label}
                </button>
              </li>
            ))}
            {pool.length === 0 && <li className="design-sequencer-empty">All placed.</li>}
          </ul>
        </div>
        <div>
          <span className="w-label">Your order</span>
          <ol className="design-sequencer-list design-sequencer-placed">
            {placed.map((id, i) => {
              const right = checked && ORDER[i].id === id;
              const wrong = checked && ORDER[i].id !== id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={`w-chip design-sequencer-step is-on${right ? " is-right" : ""}${wrong ? " is-wrong" : ""}`}
                    onClick={() => remove(id)}
                    disabled={done}
                    aria-label={`Position ${i + 1}: ${byId(id).label}. Tap to remove.`}
                  >
                    <b>{i + 1}.</b> {byId(id).label}
                  </button>
                </li>
              );
            })}
            {placed.length === 0 && <li className="design-sequencer-empty">Nothing placed yet.</li>}
          </ol>
        </div>
      </div>

      {!done && (
        <div className="w-row design-sequencer-actions">
          <button type="button" className="w-btn" onClick={check} disabled={!allPlaced || checked}>
            Check my order
          </button>
          <button type="button" className="w-btn" onClick={() => { setPlaced([]); setChecked(false); }} disabled={placed.length === 0}>
            Clear
          </button>
        </div>
      )}

      {checked && !done && (
        <div className="w-verdict bad" role="status">
          <strong>{inPlace} of 7 are in the right place.</strong> Marked in rose are the ones to move. Tap a step to take it out, then place it again. You have one more try, and the second try shows the reasoning.
        </div>
      )}

      {done && (
        <>
          <div className={`w-verdict ${perfect ? "good" : "bad"}`} role="status">
            <strong>{perfect ? "That is the template order." : `${inPlace} of 7 were in the right place.`}</strong>{" "}
            Each step needs the one before it. The reasoning follows, with a time budget for a 45-minute round.
          </div>
          <ol className="design-sequencer-why">
            {ORDER.map((s) => (
              <li key={s.id}>
                <b>{s.label}, {s.minutes} min.</b> {s.why}
              </li>
            ))}
          </ol>
          <p className="design-sequencer-foot">The remaining 12 minutes are for the interviewer's follow-ups. Illustrative time split.</p>
        </>
      )}
    </div>
  );
}
