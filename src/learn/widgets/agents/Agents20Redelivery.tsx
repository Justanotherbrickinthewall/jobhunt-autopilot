import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents20Redelivery.css";

type Case = { id: string; q: string; meta: string; opts: string[]; answer: number; why: string };

const CASES: Case[] = [
  {
    "id": "a",
    "q": "The consumer commits last. It dies before it does any work.",
    "meta": "No idempotency key.",
    "opts": [
      "0 mails",
      "1 mail",
      "2 mails"
    ],
    "answer": 1,
    "why": "The event comes again and the work runs once, on the second delivery."
  },
  {
    "id": "b",
    "q": "The consumer commits last. It dies after the mail goes out and before the commit.",
    "meta": "No idempotency key.",
    "opts": [
      "0 mails",
      "1 mail",
      "2 mails"
    ],
    "answer": 2,
    "why": "The event comes again and the work runs again. This is the duplicate that at-least-once delivery risks."
  },
  {
    "id": "c",
    "q": "The consumer commits last. It dies after the mail and before the commit.",
    "meta": "An idempotency key is stored with the work.",
    "opts": [
      "0 mails",
      "1 mail",
      "2 mails"
    ],
    "answer": 1,
    "why": "The repeat finds the key and does nothing. One mail went out."
  },
  {
    "id": "d",
    "q": "The consumer commits last. It dies after the commit.",
    "meta": "No idempotency key.",
    "opts": [
      "0 mails",
      "1 mail",
      "2 mails"
    ],
    "answer": 1,
    "why": "The offset moved, so no repeat comes. The work was already done."
  },
  {
    "id": "e",
    "q": "The consumer commits first, then does the work. It dies between the commit and the work.",
    "meta": "No idempotency key.",
    "opts": [
      "0 mails",
      "1 mail",
      "2 mails"
    ],
    "answer": 0,
    "why": "The event is marked done but never ran. That is at-most-once delivery, and it loses the event."
  },
  {
    "id": "f",
    "q": "The consumer commits last. The mail goes out, then the consumer dies before it stores the key.",
    "meta": "The key is stored after the mail, in a separate step.",
    "opts": [
      "0 mails",
      "1 mail",
      "2 mails"
    ],
    "answer": 2,
    "why": "The key never reached storage, so the repeat sends again. Store the key and the effect in one transaction, or hand the key to the mail service."
  }
];

export default function Agents20Redelivery({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, number | undefined>>({});
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);
  const answered = CASES.filter((c) => picks[c.id] !== undefined).length;
  const hits = CASES.filter((c) => picks[c.id] === c.answer).length;

  return (
    <div className="w-panel agents20-redelivery">
      <p className="agents20-redelivery-note">Each case says where the consumer dies and whether an idempotency key is in place. Predict how many mails go out for that one event.</p>
      <div className="w-stack">
        {CASES.map((c) => {
          const pick = picks[c.id];
          const right = checked && pick === c.answer;
          const wrong = checked && pick !== c.answer;
          return (
            <fieldset key={c.id} className={`agents20-redelivery-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
              <legend className="agents20-redelivery-legend">Case</legend>
              <p className="agents20-redelivery-text">{c.q}</p>
              <p className="agents20-redelivery-meta">{c.meta}</p>
              <div className="agents20-redelivery-opts" role="radiogroup" aria-label={c.q}>
                {c.opts.map((o, i) => (
                  <label key={o} className={`agents20-redelivery-opt${pick === i ? " on" : ""}`}>
                    <input
                      type="radio"
                      name={`agents20-redelivery-${c.id}`}
                      checked={pick === i}
                      disabled={checked}
                      onChange={() => setPicks((p) => ({ ...p, [c.id]: i }))}
                    />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
              {checked && (
                <p className="agents20-redelivery-why" role="status">
                  {right ? "Matched. " : `Better fit: ${c.opts[c.answer]}. `}
                  {c.why}
                </p>
              )}
            </fieldset>
          );
        })}
      </div>
      <div className="w-row">
        {!checked ? (
          <button
            type="button"
            className="w-btn primary"
            disabled={answered < CASES.length}
            onClick={() => {
              setChecked(true);
              complete(`${hits} of ${CASES.length} matched`);
            }}
          >
            Check my answers ({answered} of {CASES.length})
          </button>
        ) : (
          <button
            type="button"
            className="w-btn ghost"
            onClick={() => {
              setPicks({});
              setChecked(false);
            }}
          >
            Try again
          </button>
        )}
      </div>
      {checked && (
        <div className={`w-verdict ${hits >= 5 ? "good" : "bad"}`} role="status">
          You matched {hits} of {CASES.length}. Where the commit sits decides what a crash costs. The key decides whether a repeat does anything.
        </div>
      )}
    </div>
  );
}
