import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C04GateOrder.css";

// The reference order runs the cheapest and fastest checks first, and the scarce human last.
type Gate = { id: string; name: string; catches: string; cost: string };
const REF: Gate[] = [
  { id: "fmt", name: "Formatter and linter", catches: "Style drift, unused imports, obvious slips.", cost: "Seconds, no setup." },
  { id: "static", name: "Type check and static analysis", catches: "Wrong argument types, calls to functions that do not exist, dead branches.", cost: "Seconds to a minute." },
  { id: "unit", name: "Unit tests", catches: "Logic errors in one function, such as a rounding slip in a total.", cost: "A minute or two." },
  { id: "scan", name: "Secret and dependency scan", catches: "Hard-coded keys, packages with known flaws, packages that do not exist.", cost: "A minute." },
  { id: "integ", name: "Integration tests", catches: "Two parts that disagree, such as extraction output and the finance posting step.", cost: "Minutes, and needs test data." },
  { id: "human", name: "Human review of the diff", catches: "Missing authorisation, tests that mirror the code, a change that solves the wrong problem.", cost: "Scarce, so spend it last." },
];

function shuffled(): Gate[] {
  const order = ["integ", "human", "fmt", "scan", "unit", "static"];
  return order.map((id) => REF.find((g) => g.id === id)!);
}

export default function C04GateOrder({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [order, setOrder] = useState<Gate[]>(shuffled);
  const [done, setDone] = useState(false);
  const [attempts, setAttempts] = useState(0);

  function move(i: number, d: number) {
    if (done) return;
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  }
  // Adjacent-pair inversions against the reference order.
  const rank = (g: Gate) => REF.findIndex((r) => r.id === g.id);
  let inversions = 0;
  for (let a = 0; a < order.length; a++) for (let b = a + 1; b < order.length; b++) if (rank(order[a]) > rank(order[b])) inversions++;
  const good = inversions <= 1;

  // Completes on a good order, or after the second attempt with the explanation shown.
  function check() {
    const n = attempts + 1;
    setAttempts(n);
    setDone(true);
    if (good || n >= 2) complete(`${inversions} pairs out of order`);
  }
  const locked = done && (good || attempts >= 2);

  return (
    <div className="w-panel fde-craft-gate-order">
      <p className="fde-craft-gate-order-lede">
        A change to the invoice pipeline passes six gates. Put them in the order that finds problems soonest and wastes the least time. Use the arrows to move a gate.
      </p>
      <ol className="fde-craft-gate-order-list">
        {order.map((g, i) => (
          <li key={g.id}>
            <span className="fde-craft-gate-order-pos w-mono">{i + 1}</span>
            <span className="fde-craft-gate-order-name">
              {g.name}
              {done && (
                <span className="fde-craft-gate-order-info">
                  <b>Catches:</b> {g.catches} <b>Cost:</b> {g.cost}
                </span>
              )}
            </span>
            <span className="fde-craft-gate-order-btns">
              <button type="button" className="w-btn small ghost" onClick={() => move(i, -1)} disabled={done || i === 0} aria-label={`Move ${g.name} up`}>Up</button>
              <button type="button" className="w-btn small ghost" onClick={() => move(i, 1)} disabled={done || i === order.length - 1} aria-label={`Move ${g.name} down`}>Down</button>
            </span>
          </li>
        ))}
      </ol>
      {!done && (
        <button type="button" className="w-btn" onClick={check}>
          Check the order
        </button>
      )}
      {done && (
        <div className={`w-verdict ${good ? "good" : "bad"}`} role="status">
          <strong>{inversions} pairs out of order.</strong>{" "}
          {good
            ? "Cheap and fast gates come first, and the human comes last. Each gate removes a class of problem before a person has to see it."
            : "Run the cheap automatic checks first. A person reviewing a diff that does not compile, or leaks a key, has wasted the scarcest hour in the process."}
          {" "}The reference order is: {REF.map((g) => g.name).join(", ")}.
        </div>
      )}
      {done && !locked && (
        <button type="button" className="w-btn ghost" onClick={() => setDone(false)}>
          Reorder and try once more
        </button>
      )}
      <p className="fde-craft-gate-order-foot">Illustrative. Real pipelines vary, and some teams run the secret scan first. The principle is cheap before costly.</p>
    </div>
  );
}
