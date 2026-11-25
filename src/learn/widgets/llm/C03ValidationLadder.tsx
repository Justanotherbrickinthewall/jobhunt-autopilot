import { useState } from "react";
import { MotionConfig } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C03ValidationLadder.css";

type Kind = "syntax" | "schema" | "business" | "refusal" | "truncated";
const KINDS: { id: Kind; name: string }[] = [
  { id: "syntax", name: "Syntax" },
  { id: "schema", name: "Schema" },
  { id: "business", name: "Business rule" },
  { id: "refusal", name: "Refusal" },
  { id: "truncated", name: "Truncated" },
];
// Illustrative model outputs for Harbour Supplies.
const CASES: { stop: string; text: string; kind: Kind; why: string }[] = [
  { stop: "max_tokens", text: '{"supplier": "Northfield Packaging", "invoice_number": "NP-2', kind: "truncated", why: "The stop reason says the model ran out of output tokens. Parsing comes after that check, because the cut-off text would also fail to parse." },
  { stop: "end", text: 'Sure! Here is the JSON you asked for: {supplier: "Northfield"}', kind: "syntax", why: "Prose before the object and unquoted keys mean it does not parse at all." },
  { stop: "end", text: '{"supplier": "Northfield", "invoice_number": "NP-20417", ... "total": "240.00"}', kind: "schema", why: "It parses, but total is a string where the schema wants a number." },
  { stop: "end", text: '{ ... "net": 200, "vat": 40, "total": 250 }', kind: "business", why: "Types are right, but net plus VAT is 240 and the total says 250. Only a business rule can see that." },
  { stop: "refusal", text: "I can't help with extracting that document.", kind: "refusal", why: "The model declined. Retrying the same request rarely helps, and the right route is review." },
  { stop: "end", text: '{ "supplier": "Northfield", "invoice_number": "NP-20417", "invoice_date": "2026-03-02" }', kind: "schema", why: "Valid JSON, but due_date and other required fields are missing. That is a schema failure, and nobody should fill them in." },
  { stop: "end", text: '{ ... "invoice_date": "2026-03-02", "due_date": "2026-02-01" ... }', kind: "business", why: "Both dates are well formed. A due date before the invoice date breaks a business rule." },
];

export default function C03ValidationLadder({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<Kind | null>(null);
  const [score, setScore] = useState(0);

  const c = CASES[i];
  const finished = i === CASES.length - 1 && picked !== null;

  const choose = (k: Kind) => {
    if (picked) return;
    setPicked(k);
    const next = score + (k === c.kind ? 1 : 0);
    setScore(next);
    if (i === CASES.length - 1) complete(`Classified ${next} of ${CASES.length} cases correctly`);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel llm-validation-ladder">
        <p className="w-label">Case {i + 1} of {CASES.length}. Illustrative outputs.</p>
        <div className="w-inset llm-validation-ladder-out">
          <div className="w-label">Stop reason: {c.stop}</div>
          <pre className="w-mono">{c.text}</pre>
        </div>
        <p>Which layer rejects this first?</p>
        <div className="w-row" role="group" aria-label="Failure type">
          {KINDS.map((k) => (
            <button key={k.id} type="button" className={`w-chip${picked === k.id ? (k.id === c.kind ? " good" : " bad") : ""}${picked && k.id === c.kind ? " good" : ""}`} disabled={picked !== null} onClick={() => choose(k.id)}>
              {k.name}
            </button>
          ))}
        </div>
        {picked && (
          <div className={`w-verdict ${picked === c.kind ? "good" : "bad"}`} role="status">
            {picked === c.kind ? "Correct. " : `It is ${KINDS.find((k) => k.id === c.kind)?.name.toLowerCase()}. `}
            {c.why}
            {finished && ` You classified ${score} of ${CASES.length} correctly. The order is stop reason, then syntax, then schema, then business rules.`}
          </div>
        )}
        {picked && !finished && (
          <button type="button" className="w-btn" onClick={() => { setI(i + 1); setPicked(null); }}>Next case</button>
        )}
      </div>
    </MotionConfig>
  );
}
