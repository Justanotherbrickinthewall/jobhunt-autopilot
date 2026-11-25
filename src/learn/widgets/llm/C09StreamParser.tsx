import { useState } from "react";
import { MotionConfig } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C09StreamParser.css";

type Chunk = { block: number; text: string };
type Case = { id: string; name: string; chunks: Chunk[]; stop: string; options: string[]; answer: number; why: string };

// Illustrative streamed tool-call arguments for Harbour Supplies.
const CASES: Case[] = [
  {
    id: "a",
    name: "A. One tool call, stream ends normally",
    chunks: [
      { block: 0, text: '{"supplier": "North' },
      { block: 0, text: 'field Packaging", ' },
      { block: 0, text: '"total": 240' },
      { block: 0, text: ".00}" },
    ],
    stop: "tool_use (complete)",
    options: ["Parse once and validate", "Retry the same request", "Close the braces and use it"],
    answer: 0,
    why: "The stop event says the call is complete and the joined text parses. It still goes through schema and business checks.",
  },
  {
    id: "b",
    name: "B. The stream ends on the token limit",
    chunks: [
      { block: 0, text: '{"supplier": "Northfield Packaging", ' },
      { block: 0, text: '"lines": [{"desc": "Cartons", "amount": 120.00}, ' },
      { block: 0, text: '{"desc": "Pallets", "am' },
    ],
    stop: "max_tokens (cut off)",
    options: ["Parse once and validate", "Close the braces and use it", "Reject it, then raise the limit or split the input"],
    answer: 2,
    why: "Closing the braces would invent the missing amount. The same request would be cut off again, so change the limit or split the input.",
  },
  {
    id: "c",
    name: "C. Two parallel calls arrive interleaved",
    chunks: [
      { block: 0, text: '{"invoice": "NP-2' },
      { block: 1, text: '{"supplier": "Nor' },
      { block: 0, text: '0417"}' },
      { block: 1, text: 'thfield"}' },
    ],
    stop: "tool_use (complete)",
    options: ["Parse the joined text as received", "Retry the request", "Join the chunks of each block by index, then parse each"],
    answer: 2,
    why: "Parallel calls share one stream. Joining in arrival order mixes two objects. Buffer by block index and parse each call alone.",
  },
];

function parses(s: string): boolean {
  try { JSON.parse(s); return true; } catch { return false; }
}
function joinAll(c: Case): string { return c.chunks.map((k) => k.text).join(""); }
function joinBlock(c: Case, b: number): string { return c.chunks.filter((k) => k.block === b).map((k) => k.text).join(""); }

export default function C09StreamParser({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [pick, setPick] = useState<Record<string, number>>({});
  const [attempts, setAttempts] = useState(0);
  const [checked, setChecked] = useState(false);

  const ready = CASES.every((c) => pick[c.id] !== undefined);
  const score = CASES.filter((c) => pick[c.id] === c.answer).length;
  const perfect = score === CASES.length;
  const final = checked && (perfect || attempts >= 2);

  const check = () => {
    const n = attempts + 1;
    setAttempts(n);
    setChecked(true);
    if (perfect || n >= 2) complete(`${score} of ${CASES.length} buffers handled correctly`);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel llm-stream-parser">
        <p className="w-label">Illustrative streams</p>
        {CASES.map((c) => {
          const blocks = Array.from(new Set(c.chunks.map((k) => k.block)));
          const joined = joinAll(c);
          return (
            <div key={c.id} className="llm-stream-parser-case">
              <strong>{c.name}</strong>
              <ol className="llm-stream-parser-chunks w-mono">
                {c.chunks.map((k, i) => (
                  <li key={i}>block {k.block}: {k.text}</li>
                ))}
              </ol>
              <div className="llm-stream-parser-meta">
                Joined in arrival order: {parses(joined) ? "parses." : "does not parse."} Final event: {c.stop}.
              </div>
              {blocks.length > 1 && (
                <div className="llm-stream-parser-meta">
                  Joined by block: {blocks.map((b) => `block ${b} ${parses(joinBlock(c, b)) ? "parses" : "does not parse"}`).join(", ")}.
                </div>
              )}
              <div className="w-row" role="radiogroup" aria-label={`Action for case ${c.id}`}>
                {c.options.map((o, i) => (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={pick[c.id] === i}
                    disabled={final}
                    className={`w-chip${pick[c.id] === i ? " is-on" : ""}${checked && pick[c.id] === i ? (i === c.answer ? " good" : " bad") : ""}`}
                    onClick={() => { setPick({ ...pick, [c.id]: i }); setChecked(false); }}
                  >
                    {o}
                  </button>
                ))}
              </div>
              {checked && pick[c.id] !== c.answer && <div className="llm-stream-parser-why">{c.why}</div>}
            </div>
          );
        })}
        {!checked && (
          <button type="button" className="w-btn" disabled={!ready || attempts >= 2} onClick={check}>
            Check my choices
          </button>
        )}
        {checked && (
          <div className={`w-verdict ${perfect ? "good" : "bad"}`} role="status">
            {score} of {CASES.length} handled correctly.
            {final ? " Join fragments per call, wait for the stop event, parse once, and reject a cut-off buffer." : " Fix the marked cases and check again."}
          </div>
        )}
        {final && !perfect && (
          <ul className="llm-stream-parser-all">
            {CASES.map((c) => <li key={c.id}>{c.name}: {c.why}</li>)}
          </ul>
        )}
      </div>
    </MotionConfig>
  );
}
