import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C01DiscoveryQuestions.css";

type Constraint = "data" | "security" | "residency" | "procurement" | "change" | "exceptions";

const CONSTRAINTS: { id: Constraint; label: string; why: string }[] = [
  { id: "data", label: "Data access", why: "Nobody has said who can export the invoice archive, or in what format. Without it the pilot waits for weeks." },
  { id: "security", label: "Security review", why: "Any system that reads supplier bank details goes through a review. It takes weeks to get through." },
  { id: "residency", label: "Data residency", why: "If invoices must stay in one region, some model endpoints are ruled out before you write a line of code." },
  { id: "procurement", label: "Procurement", why: "A new vendor or a new cloud resource may need a purchase order. That can take longer than the build." },
  { id: "change", label: "Change control", why: "Posting to the finance system may only be allowed through a monthly release window." },
  { id: "exceptions", label: "Exception handling", why: "The real work is the odd invoices. Nobody has described who fixes them today, or how fast." },
];

type Q = { id: string; text: string; hits: Constraint[]; note: string };
const QUESTIONS: Q[] = [
  { id: "q1", text: "Take me through what happens to one invoice from the moment it arrives.", hits: ["exceptions"], note: "Strong opener. It maps the workflow and shows where people step in." },
  { id: "q2", text: "Who can give us a sample of last quarter's invoices, and what do we need to sign first?", hits: ["data", "security"], note: "It tests access and approvals in one question." },
  { id: "q3", text: "Are there rules about where invoice data can be processed or stored?", hits: ["residency"], note: "Short, and it can rule out whole architectures." },
  { id: "q4", text: "What would we need to get approved before a new service touches your finance system?", hits: ["security", "change", "procurement"], note: "It surfaces the approval chain before the build starts." },
  { id: "q5", text: "Tell me about the company's AI vision.", hits: [], note: "Pleasant, but it tells you nothing you can build against." },
  { id: "q6", text: "What do you do when an invoice does not match its purchase order, the order Harbour sent the supplier?", hits: ["exceptions"], note: "It finds the exception path, which is where the cost sits." },
  { id: "q7", text: "Which model are you thinking of using?", hits: [], note: "A solution question too early. It anchors the call on tools, not the problem." },
  { id: "q8", text: "How are new vendors and cloud resources bought, and how long does that take?", hits: ["procurement"], note: "Unglamorous and very useful for the timeline." },
  { id: "q9", text: "Can we release to production whenever we are ready?", hits: ["change"], note: "It finds the release window before you promise a date." },
  { id: "q10", text: "How big is your team of engineers?", hits: [], note: "Worth knowing at some point. It does not expose a hidden constraint." },
];

const LIMIT = 5;

export default function C01DiscoveryQuestions({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picked, setPicked] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const covered = new Set<Constraint>();
  picked.forEach((id) => QUESTIONS.find((q) => q.id === id)?.hits.forEach((h) => covered.add(h)));

  function toggle(id: string) {
    if (done) return;
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < LIMIT ? [...p, id] : p));
  }
  // Completes on the first good call, or after the second attempt with the explanation shown.
  function run() {
    const n = attempts + 1;
    setAttempts(n);
    setDone(true);
    if (covered.size >= 4 || n >= 2) {
      complete(`${covered.size} of ${CONSTRAINTS.length} hidden constraints found with ${picked.length} questions`);
    }
  }
  const locked = done && (covered.size >= 4 || attempts >= 2);

  return (
    <div className="w-panel fde-craft-discovery-questions">
      <p className="fde-craft-discovery-questions-lede">
        You have time for {LIMIT} questions on the first call with Harbour Supplies. Pick them. Six constraints are hidden, and you do not know that yet.
      </p>
      <div className="w-row fde-craft-discovery-questions-count">
        <span className="w-label">Questions chosen</span>
        <span className="w-mono">{picked.length} of {LIMIT}</span>
      </div>
      <ul className="fde-craft-discovery-questions-list">
        {QUESTIONS.map((q) => {
          const on = picked.includes(q.id);
          return (
            <li key={q.id}>
              <button
                type="button"
                className={`w-chip fde-craft-discovery-questions-q${on ? " is-on" : ""}`}
                aria-pressed={on}
                onClick={() => toggle(q.id)}
                disabled={!on && picked.length >= LIMIT && !done}
              >
                {q.text}
              </button>
              {done && on && <p className="fde-craft-discovery-questions-note">{q.note}</p>}
            </li>
          );
        })}
      </ul>
      {!done && (
        <button type="button" className="w-btn" onClick={run} disabled={picked.length === 0}>
          Run the call
        </button>
      )}
      {done && (
        <>
          <div className={`w-verdict ${covered.size >= 4 ? "good" : "bad"}`} role="status">
            <strong>{covered.size} of {CONSTRAINTS.length} constraints found.</strong>{" "}
            {covered.size >= 4
              ? "Your questions were about the workflow and the approvals, which is where surprises live."
              : "You asked about the idea more than the obstacles. Each constraint you missed is a delay you will meet in week three."}
          </div>
          <ul className="fde-craft-discovery-questions-result">
            {CONSTRAINTS.map((c) => (
              <li key={c.id} className={covered.has(c.id) ? "is-found" : "is-missed"}>
                <b>{covered.has(c.id) ? "Found" : "Missed"}: {c.label}.</b> {c.why}
              </li>
            ))}
          </ul>
          {!locked && (
            <button type="button" className="w-btn ghost" onClick={() => setDone(false)}>
              Change my questions and try once more
            </button>
          )}
          <p className="fde-craft-discovery-questions-foot">Illustrative scenario. Harbour Supplies is a fictional customer.</p>
        </>
      )}
    </div>
  );
}
