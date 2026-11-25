import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Guardrails05AuditFields.css";

// The stored values for "redact" are the real output of redact_pii on these strings, from the capstone.
// The redactor knows secrets, cards, emails and phone numbers. It does not know a name, and it does not
// know the format of this desk's own API keys, so those two strings pass through it unchanged.

type Choice = "keep" | "redact" | "drop";
type Status = "fine" | "leak" | "loss";
type Outcome = { status: Status; stored: string | null; text: string };
type Field = { id: string; name: string; value: string; outcomes: Record<Choice, Outcome> };

const FIELDS: Field[] = [
  {
    id: "thread",
    name: "thread_id",
    value: "th-5",
    outcomes: {
      keep: { status: "fine", stored: "th-5", text: "Stored as it is. It holds no personal data, and it joins this row to its run." },
      redact: { status: "fine", stored: "th-5", text: "The redactor found nothing, so the value is stored as it is." },
      drop: { status: "loss", stored: null, text: "Dropped. Nobody can join this row to its run any more." },
    },
  },
  {
    id: "principal",
    name: "principal_id",
    value: "rita",
    outcomes: {
      keep: { status: "fine", stored: "rita", text: "Stored. Her id is rita, not an email address, and the row exists to say who acted." },
      redact: { status: "fine", stored: "rita", text: "The redactor found nothing, so the value is stored as it is." },
      drop: { status: "loss", stored: null, text: "Dropped. An audit row that does not say who acted is not an audit row." },
    },
  },
  {
    id: "reason",
    name: "reason",
    value: "open_ticket needs the staff role, and rita is a reader",
    outcomes: {
      keep: { status: "fine", stored: "open_ticket needs the staff role, and rita is a reader", text: "Stored. The reason names a tool and a role, and holds no personal data." },
      redact: { status: "fine", stored: "open_ticket needs the staff role, and rita is a reader", text: "The redactor found nothing, so the value is stored as it is." },
      drop: { status: "loss", stored: null, text: "Dropped. Nobody can see why the call was denied." },
    },
  },
  {
    id: "body",
    name: "body",
    value: "Contact priya.raman@example.com or 020 7946 0958 about the Rationale.",
    outcomes: {
      keep: { status: "leak", stored: "Contact priya.raman@example.com or 020 7946 0958 about the Rationale.", text: "Stored as typed. The row now holds an email address and a phone number." },
      redact: { status: "fine", stored: "Contact [EMAIL] or [PHONE] about the Rationale.", text: "Stored with labels in place of the values. The sentence is still useful." },
      drop: { status: "fine", stored: null, text: "Dropped. The row says who and what, and needs no copy of the body." },
    },
  },
  {
    id: "question",
    name: "question",
    value: "My name is Rita Shaw and my key is sk-example-0123456789abcdef. Please file a ticket about PEP 572.",
    outcomes: {
      keep: { status: "leak", stored: "My name is Rita Shaw and my key is sk-example-0123456789abcdef. Please file a ticket about PEP 572.", text: "Stored as typed. The row holds a name and a secret." },
      redact: { status: "leak", stored: "My name is Rita Shaw and my key is [SECRET]. Please file a ticket about PEP 572.", text: "The secret is gone. The redactor cannot find a name, so Rita Shaw is still in the row." },
      drop: { status: "fine", stored: null, text: "Dropped. The audit needs the length of the question, and the guard rows already record it." },
    },
  },
  {
    id: "apikey",
    name: "api_key",
    value: "k-77b1e2",
    outcomes: {
      keep: { status: "leak", stored: "k-77b1e2", text: "Stored as sent. Anyone who can read the audit table now holds a working key." },
      redact: { status: "leak", stored: "k-77b1e2", text: "The redactor found nothing, because it knows no format for this desk's keys. The key is stored as sent." },
      drop: { status: "fine", stored: null, text: "Dropped. The row already holds principal_id, which says who sent the key." },
    },
  },
];

const CHOICES: { id: Choice; label: string }[] = [
  { id: "keep", label: "Keep" },
  { id: "redact", label: "Redact" },
  { id: "drop", label: "Drop" },
];

const TAG: Record<Status, string> = { fine: "Fine", leak: "Leak", loss: "Lost" };

export default function Guardrails05AuditFields({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<Record<string, Choice>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.id, "keep" as Choice])),
  );
  const [ran, setRan] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const outcomes = FIELDS.map((f) => ({ field: f, out: f.outcomes[picks[f.id]] }));
  const bad = outcomes.filter((o) => o.out.status !== "fine").length;
  const right = ran && bad === 0;
  const showWhy = ran && (right || attempts >= 2);

  const run = () => {
    const n = attempts + 1;
    setAttempts(n);
    setRan(true);
    if (outcomes.every((o) => o.out.status === "fine")) {
      complete("Stored less and redacted the rest");
    } else if (n >= 2) {
      complete("Saw the explanation after two tries");
    }
  };

  return (
    <div className="w-panel guardrails05-audit-fields">
      <div className="guardrails05-audit-fields-scene">
        <span className="w-label">The proposal</span>
        <p>
          A teammate wants each audit row for an open_ticket call to hold the six fields below, so debugging is easier. Rita, a
          reader, tried to open a ticket and was denied. Each card shows what its field would hold for her request. Every card
          starts on Keep, as the teammate asked.
        </p>
      </div>

      <ul className="guardrails05-audit-fields-list">
        {FIELDS.map((f) => (
          <li key={f.id} className="guardrails05-audit-fields-card">
            <span className="guardrails05-audit-fields-name w-mono">{f.name}</span>
            <span className="guardrails05-audit-fields-value w-mono">{f.value}</span>
            <div className="guardrails05-audit-fields-choices" role="radiogroup" aria-label={`What to do with ${f.name}`}>
              {CHOICES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={picks[f.id] === c.id}
                  className={`guardrails05-audit-fields-choice${picks[f.id] === c.id ? " on" : ""}`}
                  disabled={ran}
                  onClick={() => setPicks((p) => ({ ...p, [f.id]: c.id }))}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <div className="w-row">
        {!ran ? (
          <button type="button" className="w-btn primary" onClick={run}>
            Store the row
          </button>
        ) : (
          !right && (
            <button type="button" className="w-btn ghost" onClick={() => setRan(false)}>
              Change the fields
            </button>
          )
        )}
      </div>

      {ran && (
        <div className="guardrails05-audit-fields-result">
          <ul className="guardrails05-audit-fields-rows">
            {outcomes.map(({ field, out }) => (
              <li key={field.id} className={out.status === "fine" ? "ok" : "bad"}>
                <span className="guardrails05-audit-fields-tag">{TAG[out.status]}</span>
                <span>
                  <strong className="w-mono">{field.name}.</strong> {out.text}
                  {out.stored !== null && <span className="guardrails05-audit-fields-stored w-mono">{out.stored}</span>}
                </span>
              </li>
            ))}
          </ul>
          <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
            {right
              ? "Correct. The row keeps who, what and why, redacts the free text it must hold, and drops what it does not need."
              : showWhy
                ? "Not quite. Drop the question and the key, redact the body, and keep the three fields that say who, what and why. The redactor finds formats, so it cannot protect a name or a key it has no format for."
                : `${bad} ${bad === 1 ? "field" : "fields"} leak or lose something. Change the fields and try once more.`}
          </div>
        </div>
      )}
    </div>
  );
}
