import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents25RunWalker.css";

type Step = "send_link" | "send_reminder" | "refund" | "close" | "hand_to_sales";

type Scenario = {
  id: string;
  label: string;
  signals: string;
  reference: Step;
  allowed: Step[];
  slip: Step;
};

const SCENARIOS: Scenario[] = [
  { id: "short", label: "Short, link expired, never mailed", signals: "delta_sign -1, link_expired true, days_since_mail 99", reference: "send_link", allowed: ["send_link", "hand_to_sales"], slip: "refund" },
  { id: "chase", label: "Short, link still valid, mailed yesterday", signals: "delta_sign -1, link_expired false, days_since_mail 1", reference: "send_reminder", allowed: ["send_reminder", "hand_to_sales"], slip: "send_link" },
  { id: "over", label: "Overpaid", signals: "overpaid true, delta_sign 1", reference: "refund", allowed: ["refund", "hand_to_sales"], slip: "send_reminder" },
  { id: "cancel", label: "Itinerary cancelled", signals: "cancelled true", reference: "close", allowed: ["close", "hand_to_sales"], slip: "send_link" },
  { id: "late", label: "21 days overdue, link expired", signals: "delta_sign -1, days_overdue 21, link_expired true", reference: "hand_to_sales", allowed: ["send_link", "hand_to_sales"], slip: "send_reminder" },
  { id: "plan", label: "Value changed, rebalance not yet run", signals: "delta_sign -1, plan_changed true", reference: "close", allowed: ["close", "send_reminder", "hand_to_sales"], slip: "send_link" },
];

const NODES = ["calculate", "decide", "guard", "act", "close"] as const;

function statusAfter(node: (typeof NODES)[number], step: Step): string {
  if (node === "calculate" || node === "decide" || node === "guard") return "calculated";
  if (node === "act") {
    if (step === "send_link" || step === "send_reminder") return "email_sent";
    if (step === "hand_to_sales") return "handed_to_sales";
    return "calculated";
  }
  return step === "hand_to_sales" ? "handed_to_sales" : "closed";
}

export default function Agents25RunWalker({ onComplete }: WidgetProps) {
  const [sid, setSid] = useState(SCENARIOS[0].id);
  const [slips, setSlips] = useState(false);
  const [at, setAt] = useState(0); // nodes finished
  const complete = useComplete(onComplete);
  const sc = SCENARIOS.find((s) => s.id === sid) ?? SCENARIOS[0];
  const proposed: Step = slips ? sc.slip : sc.reference;
  const blocked = !sc.allowed.includes(proposed);
  const final: Step = blocked ? sc.reference : proposed;
  const done = at >= NODES.length;
  const status = at === 0 ? "initialized" : statusAfter(NODES[at - 1], at >= 3 ? final : proposed);

  const note = (n: (typeof NODES)[number]): string => {
    if (n === "calculate") return "Code reads the store and writes the signals. The model sees no amount and no name.";
    if (n === "decide") return `The model picks one step from the fixed set and writes it as proposed: ${proposed}.`;
    if (n === "guard") return blocked ? `Chapter 26's guard checks ${proposed} against the steps these signals allow. It is not allowed, so the guard asks again, and the step is ${final}.` : `In this chapter the guard is trust_model, so ${proposed} passes on unchecked. The model made no slip.`;
    if (n === "act") return final === "send_link" || final === "send_reminder" ? "Code creates the link, saves link_generated, has the model draft the mail, fills the amounts and sends it." : final === "refund" ? "Code asks the provider to refund the overpayment. The refund key carries the amount." : final === "hand_to_sales" ? "Code hands the instalment to sales." : "Nothing to do. Close is a valid step.";
    return "Code ends the run. A handed case keeps its status; every other case becomes closed.";
  };

  const reset = (fn: () => void) => { fn(); setAt(0); };

  return (
    <div className="w-panel agents25-run">
      <fieldset className="agents25-run-box">
        <legend>Instalment IT0001-2 arrives in this state</legend>
        <div className="agents25-run-opts" role="radiogroup" aria-label="Scenario">
          {SCENARIOS.map((s) => (
            <label key={s.id} className={`agents25-run-opt${sid === s.id ? " on" : ""}`}>
              <input type="radio" name="agents25-run-scn" checked={sid === s.id} onChange={() => reset(() => setSid(s.id))} />
              <span>{s.label}</span>
            </label>
          ))}
        </div>
        <label className="agents25-run-check">
          <input type="checkbox" checked={slips} onChange={(e) => reset(() => setSlips(e.target.checked))} />
          <span>Make the model slip, and plug in chapter 26's guard</span>
        </label>
        <p className="agents25-run-sig">Signals: {sc.signals}</p>
      </fieldset>
      <ol className="agents25-run-nodes">
        {NODES.map((n, i) => (
          <li key={n} className={`agents25-run-node${i < at ? " done" : ""}${i === at ? " next" : ""}${n === "guard" ? " guard" : ""}`}>
            <span className="agents25-run-name">{n}</span>
            <span className="agents25-run-who">{n === "decide" ? "model" : "code"}</span>
            {i < at && <span className="agents25-run-note">{note(n)}</span>}
          </li>
        ))}
      </ol>
      <p className="agents25-run-status" role="status">Saved status: <strong>{status}</strong>{at > 0 ? ` after ${NODES[at - 1]}` : ""}</p>
      <div className="w-row">
        <button type="button" className="w-btn primary" disabled={done} onClick={() => { const n = at + 1; setAt(n); if (n === NODES.length) complete(`${sc.label}: ${final}`); }}>
          {at === 0 ? "Run calculate" : done ? "Run finished" : `Run ${NODES[at]}`}
        </button>
        <button type="button" className="w-btn ghost" onClick={() => setAt(0)}>Start again</button>
      </div>
      {done && (
        <div className={`w-verdict ${blocked ? "bad" : "good"}`} role="status">
          {blocked ? `The model proposed ${proposed}. Chapter 26's guard stopped it, and the run went on with ${final}. Code, not the model, kept the path safe.` : `The model proposed ${proposed}, and this chapter's pass-through guard let it through. Code ran the same five nodes whatever the model said.`} The graph is the same for every scenario. Only the step changes.
        </div>
      )}
    </div>
  );
}
