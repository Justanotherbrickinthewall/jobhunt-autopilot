import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Llmops02RedactJudge.css";

// Every case was run through the real `redact_run` of the capstone, so each right answer is its output.
// The address, the phone number and the card number are made up. 4111 1111 1111 1111 is a published test number.
type Case = { title: string; input: string; options: string[]; answer: number; why: string };

const CASES: Case[] = [
  {
    title: "An email address",
    input: "Reply to rita.shaw@example.com please.",
    options: [
      "Reply to rita.shaw@example.com please.",
      "Reply to [EMAIL] please.",
      "Reply to [REDACTED] please.",
    ],
    answer: 1,
    why: "An email becomes the label [EMAIL]. The mask [REDACTED] is kept for the value of a secret key in a mapping.",
  },
  {
    title: "A phone number",
    input: "Call +44 20 7946 0958 after lunch.",
    options: ["Call +44 20 7946 0958 after lunch.", "Call [PHONE] after lunch.", "Call [CARD] after lunch."],
    answer: 1,
    why: "A run of 9 to 15 digits with the usual spaces and signs is read as a phone number. This one has 12 digits.",
  },
  {
    title: "A card number that passes the Luhn check",
    input: "Card 4111 1111 1111 1111 expires 12/28.",
    options: ["Card [PHONE] expires 12/28.", "Card [CARD] expires 12/28.", "Card 4111 1111 1111 1111 expires 12/28."],
    answer: 1,
    why: "Sixteen digits that pass the Luhn check are masked as a card. Real card numbers satisfy that checksum.",
  },
  {
    title: "Sixteen digits that fail the Luhn check",
    input: "Order 1234 5678 9012 3456 shipped.",
    options: ["Order [CARD] shipped.", "Order [PHONE] shipped.", "Order 1234 5678 9012 3456 shipped."],
    answer: 2,
    why: "The digits fail the check, so they are not a card. There are also too many for a phone number, which has at most 15. The text passes through, so an order number stays readable in a trace.",
  },
  {
    title: "A date and a version",
    input: "Released 2026-10-21 as version 3.12.1.",
    options: [
      "Released [PHONE] as version [PHONE].",
      "Released 2026-10-21 as version [PHONE].",
      "Released 2026-10-21 as version 3.12.1.",
    ],
    answer: 2,
    why: "The redactor hides dates and dotted versions before it looks for phone numbers, so neither is read as one.",
  },
  {
    title: "A secret key in a mapping",
    input: `{"Authorization": "Bearer abc123", "query": "walrus"}`,
    options: [
      `{"Authorization": "Bearer abc123", "query": "walrus"}`,
      `{"Authorization": "[REDACTED]", "query": "walrus"}`,
      `{"Authorization": "[REDACTED]", "query": "[REDACTED]"}`,
    ],
    answer: 1,
    why: "The key name decides. Authorization, in lower case, is on the list of secret keys, so its whole value is masked. The other values are cleaned as text, and walrus has nothing to clean.",
  },
  {
    title: "A name and an address",
    input: "My name is Rita Shaw and I live at 14 Mill Lane, Leeds.",
    options: [
      "My name is [REDACTED] and I live at [REDACTED].",
      "My name is Rita Shaw and I live at 14 Mill Lane, Leeds.",
      "My name is Rita Shaw and I live at [PHONE].",
    ],
    answer: 1,
    why: "A name and a street address have no fixed pattern, so a pattern redactor passes them through. If your traffic holds names, add an entity detector to redact_run, or keep that traffic out of the export.",
  },
];

export default function Llmops02RedactJudge({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [tried, setTried] = useState<number[]>([]);
  const [resolved, setResolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);

  const c = CASES[index];
  const last = index === CASES.length - 1;
  const gotIt = resolved && tried[tried.length - 1] === c.answer;

  const pick = (i: number) => {
    if (resolved || tried.includes(i)) return;
    const next = [...tried, i];
    setTried(next);
    const right = i === c.answer;
    if (right && next.length === 1) setFirstTry((n) => n + 1);
    if (right || next.length >= 2) {
      setResolved(true);
      if (last) complete("Judged all seven cases");
    }
  };

  const advance = () => {
    setIndex((n) => n + 1);
    setTried([]);
    setResolved(false);
  };

  return (
    <div className="w-panel llmops02-redact-judge">
      <div className="llmops02-redact-judge-head">
        <span className="w-label">
          Case {index + 1} of {CASES.length}: {c.title}
        </span>
        <span className="llmops02-redact-judge-score">Right first time: {firstTry}</span>
      </div>

      <div className="llmops02-redact-judge-input">
        <span className="w-label">The text in a run</span>
        <code>{c.input}</code>
      </div>

      <div className="llmops02-redact-judge-group" role="radiogroup" aria-label="What redact_run returns">
        <span className="w-label">What does redact_run return?</span>
        <div className="llmops02-redact-judge-opts">
          {c.options.map((o, i) => {
            const was = tried.includes(i);
            const state = resolved && i === c.answer ? " right" : was ? " wrong" : "";
            return (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={was}
                className={`llmops02-redact-judge-opt${state}`}
                disabled={resolved || was}
                onClick={() => pick(i)}
              >
                <code>{o}</code>
              </button>
            );
          })}
        </div>
      </div>

      {!resolved && tried.length === 1 && (
        <div className="w-verdict bad" role="status">
          Not quite. Read the text again and try once more.
        </div>
      )}

      {resolved && (
        <div className={`w-verdict ${gotIt ? "good" : "bad"}`} role="status">
          {gotIt ? "Right. " : "The answer is the highlighted one. "}
          {c.why}
        </div>
      )}

      {resolved && !last && (
        <div className="w-row">
          <button type="button" className="w-btn primary" onClick={advance}>
            Next case
          </button>
        </div>
      )}

      {resolved && last && (
        <div className="llmops02-redact-judge-end" role="status">
          You were right first time on {firstTry} of {CASES.length}. The redactor finds patterns: emails, phone numbers, cards
          and secrets. It does not find names.
        </div>
      )}
    </div>
  );
}
