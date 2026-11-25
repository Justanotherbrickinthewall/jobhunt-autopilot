import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C02IntakeFailure.css";

type Option = { label: string; why: string };
type Case = { title: string; scene: string; options: Option[]; answer: number; reason: string };

const CASES: Case[] = [
  {
    title: "Poison document",
    scene: "One 400-page scan runs the extraction worker out of memory. The queue redelivers it, and the next worker crashes too.",
    options: [
      { label: "Give every worker more memory.", why: "This hides the cause. The next bad file will be larger, and the redelivery loop is still there." },
      { label: "Delete the message after the first crash.", why: "The document is lost with no record. A supplier then chases a payment nobody knows is missing." },
      { label: "Retry for ever, with a longer wait each time.", why: "The message keeps cycling and keeps taking a worker each time. Nothing ever tells a person." },
      { label: "Cap delivery at three attempts, then move it to a dead-letter queue with the error and alert a person.", why: "" },
    ],
    answer: 3,
    reason: "A cap on delivery turns an endless loop into one parked message. The error and the original file stay together, so a person can split the scan or reject it.",
  },
  {
    title: "Duplicate submission",
    scene: "A supplier sends invoice INV-2291 by email, then again through the portal 20 minutes later. The second file was re-exported, so its bytes differ.",
    options: [
      { label: "Compare file hashes only.", why: "A re-exported PDF has different bytes and a different hash. It would slip through and post twice." },
      { label: "Run a duplicate report each night.", why: "Finance finds the duplicate after it has been paid. Detection after posting is a clean-up, not a control." },
      { label: "Ask suppliers to send each invoice once.", why: "You cannot control senders. The design has to be safe when they repeat themselves." },
      { label: "Check the file hash first, then post with a key built from supplier, invoice number and total.", why: "" },
    ],
    answer: 3,
    reason: "The hash is a cheap first filter for exact copies. The business key catches the re-exported copy, and the ledger refuses a second write with the same key.",
  },
  {
    title: "Provider outage",
    scene: "Document AI returns server errors for 40 minutes at 14:00. The arrival rate is low, but the queue is filling.",
    options: [
      { label: "Retry at once in every worker until it answers.", why: "Nine workers hammering a failing service is a retry storm. It slows the recovery and burns quota." },
      { label: "Switch to a cheaper OCR path and post whatever it reads.", why: "Unvalidated text from a weaker extractor lowers accuracy silently. Switching is acceptable only if the same validation gates the output." },
      { label: "Retry with backoff and jitter, stop calling when failures pass a threshold, and let the queue hold the work.", why: "" },
      { label: "Drop the queued messages and ask suppliers to resend.", why: "This breaks the promise to the supplier and creates a flood of resends when the service returns." },
    ],
    answer: 2,
    reason: "Backoff with jitter spreads the retries. The breaker stops wasted calls. The queue holds the work, and the spare capacity clears it after recovery, about 49 minutes at the afternoon rate.",
  },
  {
    title: "Review backlog",
    scene: "A supplier changes its invoice layout. The review rate climbs from 5 to 9 percent, and the review queue grows by 1,950 documents a day.",
    options: [
      { label: "Lower the confidence threshold so fewer documents go to review.", why: "The queue shrinks because errors are posted instead of caught. The backlog is hidden, not cleared." },
      { label: "Auto-approve anything older than one day.", why: "Age says nothing about whether the fields are right. Old documents are exactly the ones nobody has checked." },
      { label: "Stop accepting documents from that supplier.", why: "This turns a layout problem into a supplier dispute. It is a last resort, not a first response." },
      { label: "Rank the queue by due date and amount, add reviewers for now, and fix the cause for that layout.", why: "" },
    ],
    answer: 3,
    reason: "Ranking protects the payments that are due first. Extra reviewers cover the gap. Fixing the layout for that supplier brings the rate back towards 5 percent.",
  },
];

export default function C02IntakeFailure({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<(number | null)[]>(CASES.map(() => null));
  const [idx, setIdx] = useState(0);

  const c = CASES[idx];
  const pick = picks[idx];
  const answered = pick !== null;
  const last = idx === CASES.length - 1;
  const right = picks.filter((p, i) => p === CASES[i].answer).length;

  const choose = (i: number) => {
    if (answered) return;
    const next = picks.map((p, j) => (j === idx ? i : p));
    setPicks(next);
    if (last) {
      const score = next.filter((p, j) => p === CASES[j].answer).length;
      complete(`${score} of ${CASES.length} failure modes handled`);
    }
  };

  return (
    <div className="w-panel design-intake-failure">
      <p className="design-intake-failure-hint">
        Illustrative incidents at Harbour Supplies. For each failure, choose the mitigation a design review would accept.
      </p>
      <div className="design-intake-failure-count">
        Failure {idx + 1} of {CASES.length}
      </div>
      <section className="design-intake-failure-card" aria-label={`Failure ${idx + 1}`}>
        <p className="design-intake-failure-title">{c.title}</p>
        <p className="design-intake-failure-scene">{c.scene}</p>
        <div className="design-intake-failure-options" role="radiogroup" aria-label="Mitigation">
          {c.options.map((o, i) => (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={pick === i}
              disabled={answered}
              className={`w-chip design-intake-failure-opt${pick === i ? " is-on" : ""}${answered && i === c.answer ? " good" : ""}${answered && pick === i && i !== c.answer ? " bad" : ""}`}
              onClick={() => choose(i)}
            >
              {o.label}
            </button>
          ))}
        </div>
        {answered && (
          <p className={`design-intake-failure-why ${pick === c.answer ? "ok" : "miss"}`}>
            {pick === c.answer ? "Correct. " : `${c.options[pick as number].why} `}
            {c.reason}
          </p>
        )}
      </section>
      {answered && !last && (
        <button type="button" className="w-btn" onClick={() => setIdx(idx + 1)}>
          Next failure
        </button>
      )}
      {last && answered && (
        <div className={`w-verdict ${right >= 3 ? "good" : "bad"}`} role="status">
          {right} of {CASES.length} handled. Each mitigation keeps the work and keeps a record: park the poison, key the duplicate, hold the queue through an outage, and rank the review backlog instead of hiding it.
        </div>
      )}
    </div>
  );
}
