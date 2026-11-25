import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents24Rebalance.css";

const PLANS: number[][] = [[25, 30, 30, 15], [40, 30, 30], [50, 50], [20, 20, 20, 20, 20]];
const VALUE = 800_000; // pence

const money = (p: number) => `£${(p / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// The same maths as models.split_value, allocate and rebalance in the reference.
function split(value: number, weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  const parts = weights.map((w) => Math.floor((value * w) / total));
  parts[parts.length - 1] += value - parts.reduce((a, b) => a + b, 0);
  return parts;
}

function rebalance(amounts: number[], paidCount: number, newValue: number): number[] {
  const keep = amounts.slice(0, paidCount).reduce((a, b) => a + b, 0);
  const spread = split(newValue - keep, amounts.slice(paidCount));
  return [...amounts.slice(0, paidCount), ...spread];
}

export default function Agents24Rebalance({ onComplete }: WidgetProps) {
  const [plan, setPlan] = useState(0);
  const [paid, setPaid] = useState(1);
  const [uplift, setUplift] = useState(120);
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);

  const weights = PLANS[plan];
  const before = split(VALUE, weights);
  const newValue = Math.floor((VALUE * uplift) / 100);
  const paidCount = Math.min(paid, before.length - 1);
  const after = rebalance(before, paidCount, newValue);
  const untouched = after.slice(0, paidCount).every((a, i) => a === before[i]);
  const summed = after.reduce((a, b) => a + b, 0) === newValue;
  const unpaidBefore = before.slice(paidCount);
  const unpaidAfter = after.slice(paidCount);
  const sb = unpaidBefore.reduce((a, b) => a + b, 0);
  const sa = unpaidAfter.reduce((a, b) => a + b, 0);
  const shares = unpaidBefore.map((b, i) => `${((b / sb) * 100).toFixed(1)}% to ${((unpaidAfter[i] / sa) * 100).toFixed(1)}%`);

  return (
    <div className="w-panel agents24-rebalance">
      <p className="agents24-rebalance-note">An itinerary of {money(VALUE)} gains an add-on. Choose the plan, how many instalments are paid and the new value. Predict the unpaid amounts, then check the rule.</p>
      <div className="agents24-rebalance-controls">
        <label className="agents24-rebalance-field">
          <span>Plan split</span>
          <select value={plan} onChange={(e) => { setPlan(Number(e.target.value)); setPaid(1); setChecked(false); }}>
            {PLANS.map((p, i) => (<option key={i} value={i}>{p.join("/")}</option>))}
          </select>
        </label>
        <label className="agents24-rebalance-field">
          <span>Instalments already paid</span>
          <select value={paidCount} onChange={(e) => { setPaid(Number(e.target.value)); setChecked(false); }}>
            {before.slice(0, -1).map((_, i) => (<option key={i} value={i}>{i}</option>))}
            <option value={before.length - 1}>{before.length - 1}</option>
          </select>
        </label>
        <label className="agents24-rebalance-field">
          <span>New value: {uplift}% of the old one, {money(newValue)}</span>
          <input type="range" min={100} max={130} step={1} value={uplift} onChange={(e) => { setUplift(Number(e.target.value)); setChecked(false); }} />
        </label>
      </div>
      <div className="agents24-rebalance-table" role="table" aria-label="Instalments before and after the rebalance">
        {before.map((b, i) => (
          <div role="row" key={i} className={`agents24-rebalance-row${i < paidCount ? " paid" : ""}`}>
            <span role="cell">Instalment {i + 1}</span>
            <span role="cell">{money(b)}</span>
            <span role="cell">{money(after[i])}</span>
            <span role="cell">{i < paidCount ? "paid, untouched" : "unpaid, rescaled"}</span>
          </div>
        ))}
      </div>
      <p className="agents24-rebalance-sum">Unpaid shares, before to after: {shares.length ? shares.join(", ") : "none"}.</p>
      <div className="w-row">
        <button
          type="button"
          className="w-btn primary"
          onClick={() => {
            setChecked(true);
            complete(untouched && summed ? "rule holds" : "rule broken");
          }}
        >
          Check the rule
        </button>
      </div>
      {checked && (
        <div className={`w-verdict ${untouched && summed ? "good" : "bad"}`} role="status">
          {untouched ? "The paid instalments did not move. " : "A paid instalment moved. "}
          {summed ? `The new amounts add up to ${money(newValue)}, to the penny. ` : "The new amounts do not add up. "}
          The unpaid ones keep their proportions, and the last one absorbs the pennies lost to rounding.
        </div>
      )}
    </div>
  );
}
