import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C03ApprovalFlow.css";

const STEPS = [
  "The model proposes an email_supplier call.",
  "The run pauses and its state is saved to the resumption store.",
  "An approver reads the request and decides.",
  "The run resumes from the saved state.",
  "The tool layer sends the email.",
  "The result goes back to the model.",
];

// Gap n sits after step n. Gap 0 means the gate does not belong in the flow.
const GAP_LABELS = [
  "Leave it out",
  "Gap 1: after the proposal",
  "Gap 2: after the pause",
  "Gap 3: after the decision",
  "Gap 4: after the resume",
  "Gap 5: after the send",
];

type Gate = { id: string; label: string; short: string; gap: number; why: string };
const GATES: Gate[] = [
  {
    id: "validate",
    label: "Check the arguments against the schema and the policy",
    short: "Schema and policy check",
    gap: 1,
    why: "Cheap, mechanical checks run before a person is asked. A malformed or forbidden call should never reach the queue.",
  },
  {
    id: "request",
    label: "Store the exact arguments, their hash, an expiry and an escalation timer",
    short: "Approval request stored",
    gap: 2,
    why: "The request must be fixed before anyone is notified. The approver then judges the same bytes that will later be sent.",
  },
  {
    id: "fresh",
    label: "Reject the decision if it has expired or the approver lacks rights for this tier",
    short: "Expiry and approver check",
    gap: 3,
    why: "A late or unauthorised yes is discarded as soon as it arrives, before the run wakes up.",
  },
  {
    id: "hash",
    label: "Compare the hash of the arguments about to be sent with the approved hash, and attach the idempotency key",
    short: "Hash match and key",
    gap: 4,
    why: "This is the last step before the side effect. Only the tool layer sees the bytes that will actually leave, and the key makes a repeat harmless.",
  },
  {
    id: "audit",
    label: "Write the audit record with the arguments, the approver, the hash and the result",
    short: "Audit record",
    gap: 5,
    why: "It goes after the send so the record holds the outcome and the failure state. A record without the result cannot say whether the email went.",
  },
  {
    id: "sure",
    label: "Ask the model whether it is sure before it sends",
    short: "Ask the model",
    gap: 0,
    why: "Model confidence is not a control. It costs a call, and a persuasive invoice can talk the model into saying yes. Leave it out.",
  },
];

export default function C03ApprovalFlow({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<(number | null)[]>(GATES.map(() => null));
  const [revealed, setRevealed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const ready = picks.every((p) => p !== null);
  const correct = picks.filter((p, i) => p === GATES[i].gap).length;
  const done = revealed && (correct === GATES.length || attempt >= 2);

  const check = () => {
    const n = attempt + 1;
    setAttempt(n);
    setRevealed(true);
    if (correct === GATES.length || n >= 2) complete(`${correct} of ${GATES.length} gates placed correctly on attempt ${n}`);
  };
  const retry = () => {
    setPicks((ps) => ps.map((x, i) => (x === GATES[i].gap ? x : null)));
    setRevealed(false);
  };

  const placed = (gap: number) => GATES.filter((_, i) => picks[i] === gap && gap > 0);

  return (
    <div className="w-panel design-approval-flow">
      <p className="design-approval-flow-hint">
        One email to a supplier needs a person's approval. Place each gate in the gap where it works best. Illustrative flow for Harbour Supplies, a fictional customer.
      </p>

      <ol className="design-approval-flow-steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <div className="design-approval-flow-step">
              <span className="w-mono">{i + 1}</span> {s}
            </div>
            {i < STEPS.length - 1 && (
              <div className="design-approval-flow-gap" aria-label={`Gap ${i + 1}`}>
                <span className="w-label">Gap {i + 1}</span>
                {placed(i + 1).map((g) => (
                  <span key={g.id} className="w-chip design-approval-flow-placed">
                    {g.short}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>

      {GATES.map((g, i) => {
        const p = picks[i];
        const ok = p === g.gap;
        const locked = revealed || (attempt > 0 && ok);
        return (
          <section key={g.id} className="design-approval-flow-card" aria-label={`Gate ${i + 1}`}>
            <p className="design-approval-flow-gate">{g.label}</p>
            <select
              className="w-input"
              aria-label={`Where does gate ${i + 1} go`}
              value={p === null ? "" : String(p)}
              disabled={locked}
              onChange={(e) => setPicks((ps) => ps.map((x, j) => (j === i ? Number(e.target.value) : x)))}
            >
              <option value="" disabled>
                Choose a place
              </option>
              {GAP_LABELS.map((l, gi) => (
                <option key={l} value={gi}>
                  {l}
                </option>
              ))}
            </select>
            {revealed && (
              <p className={`design-approval-flow-why ${ok ? "ok" : "miss"}`}>
                {ok ? "Correct. " : done ? `Missed: it belongs at "${GAP_LABELS[g.gap]}". ` : "Not there yet. "}
                {(ok || done) && g.why}
              </p>
            )}
          </section>
        );
      })}

      {!revealed && (
        <button type="button" className="w-btn" disabled={!ready} onClick={check}>
          Check my gates
        </button>
      )}
      {revealed && !done && (
        <button type="button" className="w-btn" onClick={retry}>
          Try the missed ones again
        </button>
      )}
      {done && (
        <div className={`w-verdict ${correct >= 5 ? "good" : "bad"}`} role="status">
          <strong>
            {correct} of {GATES.length} placed correctly.
          </strong>{" "}
          The order is cheap checks, then a fixed request, then a fresh decision, then a last check against the bytes being sent, then the record. Every gate sits where the facts it needs already exist and the thing it protects has not yet happened.
        </div>
      )}
    </div>
  );
}
