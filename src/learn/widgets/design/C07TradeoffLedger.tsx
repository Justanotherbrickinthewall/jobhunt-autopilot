import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C07TradeoffLedger.css";

// Illustrative ledger. Harbour Supplies is fictional and the figures are made up.
type Row = { id: string; decision: string; cost: string; why: string };

// Listed in the order the designs appear. The cost list is shown in a different order.
const ROWS: Row[] = [
  { id: "review", decision: "Intake: send anything below 0.85 confidence to human review", cost: "Reviewer hours grow with volume: 2,500 reviews a day at a 5 percent rate", why: "Every document under the line costs a person three minutes, so the cost scales with load." },
  { id: "approve", decision: "Agent: require approval before any email to a supplier", cost: "Reply speed: a held email waits for an approver or the time-out", why: "The gate adds a human delay to exactly the actions that carry the most risk." },
  { id: "trim", decision: "Copilot: trim permissions at query time", cost: "Latency and source calls: one permission lookup for every query", why: "Trimming at query time keeps answers fresh and safe, and each query pays for the lookup." },
  { id: "views", decision: "Text to SQL: answer only from an approved set of views", cost: "Coverage: questions outside the views are refused until someone adds a view", why: "A fixed view set makes the SQL safe to run, and it limits what can be asked." },
  { id: "batch", decision: "Batch job: run the job on the batch interface", cost: "Speed: nothing returns before the window closes, and a rerun waits for another window", why: "Batch halves the price in exchange for time. A tight deadline reverses the choice." },
  { id: "tenant", decision: "Copilot: give each tenant its own index", cost: "Storage and sync cost multiply by the number of tenants", why: "Isolation by design removes the leak risk, and every extra tenant adds a full index to keep in sync." },
];

const ORDER = ["tenant", "batch", "review", "views", "trim", "approve"];
const COSTS = ORDER.map((id) => ROWS.find((r) => r.id === id) as Row);

export default function C07TradeoffLedger({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [attempts, setAttempts] = useState(0);
  const [done, setDone] = useState(false);
  const [checked, setChecked] = useState(false);

  const filled = ROWS.every((r) => pairs[r.id]);
  const right = ROWS.filter((r) => pairs[r.id] === r.id).length;

  function choose(id: string, value: string) {
    if (done) return;
    setChecked(false);
    setPairs((p) => ({ ...p, [id]: value }));
  }
  function submit() {
    const n = attempts + 1;
    setAttempts(n);
    setChecked(true);
    if (right === ROWS.length) {
      setDone(true);
      complete(n === 1 ? "Paired all six decisions with their costs on the first try" : "Paired all six decisions with their costs on the second try");
    } else if (n >= 2) {
      setDone(true);
      complete(`${right} of ${ROWS.length} pairings after two tries, explanation read`);
    }
  }

  return (
    <div className="w-panel design-tradeoff-ledger">
      <p className="design-tradeoff-ledger-lede">
        Each decision bought something and gave something up. Choose the cost each one carries. Every cost belongs to one decision.
      </p>
      <ul className="design-tradeoff-ledger-list">
        {ROWS.map((r) => {
          const v = pairs[r.id] ?? "";
          const ok = v === r.id;
          const mark = checked || done ? (ok ? " is-right" : v ? " is-wrong" : "") : "";
          return (
            <li key={r.id} className={`design-tradeoff-ledger-row${mark}`}>
              <label className="design-tradeoff-ledger-decision" htmlFor={`design-tl-${r.id}`}>{r.decision}</label>
              <select
                id={`design-tl-${r.id}`}
                className="w-input design-tradeoff-ledger-select"
                value={v}
                onChange={(e) => choose(r.id, e.target.value)}
                disabled={done}
              >
                <option value="">Choose the cost</option>
                {COSTS.map((c) => (
                  <option key={c.id} value={c.id}>{c.cost}</option>
                ))}
              </select>
              {done && <p className="design-tradeoff-ledger-note">{ok ? "Right. " : `The cost is: ${r.cost}. `}{r.why}</p>}
            </li>
          );
        })}
      </ul>

      {!done && (
        <button type="button" className="w-btn" onClick={submit} disabled={!filled || checked}>
          Check the ledger
        </button>
      )}
      {checked && !done && (
        <div className="w-verdict bad" role="status">
          <strong>{right} of {ROWS.length} pairings are right.</strong> The rows marked in rose are paired with another decision's cost. Change them and check once more. The second check shows every answer with its reason.
        </div>
      )}
      {done && (
        <>
          <div className={`w-verdict ${right === ROWS.length ? "good" : "bad"}`} role="status">
            <strong>{right} of {ROWS.length}.</strong>{" "}
            {right === ROWS.length
              ? "Every decision carries its own cost. In the interview, say the cost in the same breath as the decision."
              : "The correct pairings are shown above. Ask of each decision who waits, or who pays, because of it."}
          </div>
        </>
      )}
      <p className="design-tradeoff-ledger-foot">Illustrative scenario. Harbour Supplies is a fictional customer.</p>
    </div>
  );
}
