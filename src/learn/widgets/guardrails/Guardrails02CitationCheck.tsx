import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Guardrails02CitationCheck.css";

// The check below uses the same rule as CITATION and CitationsRetrieved in the capstone's
// askpep/guards/output.py. The pattern, the range test and the error message are the same.
// The source gists are paraphrases, written for this widget.

const CITATION = /[ \t]*(?<![\w)])\[(\d+)\]/g;

type Source = { n: number; heading: string; gist: string };
const SOURCES: Source[] = [
  { n: 1, heading: "PEP 572 > Abstract", gist: "Proposes the notation NAME := expr, which assigns to a name inside an expression." },
  { n: 2, heading: "PEP 572 > Rationale", gist: "Explains why the operator helps, with examples in if statements and while loops." },
];

type Case = { answer: string; note: string };
const CASES: Case[] = [
  {
    answer: "Assignment expressions bind a name inside an expression [1].",
    note: "Every citation names a retrieved source, and source 1 says this. The check passes, and it should.",
  },
  {
    answer: "Assignment expressions bind a name inside an expression [1]. They use `:=` [4].",
    note: "Source 4 doesn't exist. The check catches it, and the fix keeps the sentence and drops the marker.",
  },
  {
    answer: "Assignment expressions bind a name inside an expression.",
    note: "The answer has no citation, so there is no number to test. The check passes. It can't tell whether this sentence needed a source.",
  },
  {
    answer: "It also works in `while` conditions [2][0].",
    note: "Two markers sit side by side, and [0] is never a source, because sources count from 1. The check fails the answer, and the fix removes only the bad marker.",
  },
  {
    answer: "It also changes how `for` loops scope their variables [2].",
    note: "Source 2 is about if statements and while loops, and it says nothing about for loops. The sentence is wrong, and the check passes it, because [2] is in range. The check reads numbers, not meaning.",
  },
];

type Verdict = { pass: boolean; message: string; fixed: string };

function check(text: string, count: number): Verdict {
  const cited = [...new Set([...text.matchAll(CITATION)].map((m) => Number(m[1])))];
  const bad = cited.filter((n) => n < 1 || n > count);
  if (bad.length === 0) return { pass: true, message: "", fixed: text };
  const named = bad.map((n) => `[${n}]`).join(", ");
  const have = count ? `only sources 1 to ${count} exist` : "no sources were retrieved";
  const fixed = text.replace(CITATION, (m, d: string) => (Number(d) >= 1 && Number(d) <= count ? m : ""));
  return { pass: false, message: `The answer cites ${named}, but ${have}. Cite only those sources, or cite none.`, fixed };
}

export default function Guardrails02CitationCheck({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState<"pass" | "fail" | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const c = CASES[index];
  const verdict = check(c.answer, SOURCES.length);
  const right = pick !== null && (pick === "pass") === verdict.pass;

  const reveal = () => {
    if (pick === null) return;
    setRevealed(true);
    if (right) setFirstTry((k) => k + 1);
  };

  const next = () => {
    if (index + 1 < CASES.length) {
      setIndex(index + 1);
      setPick(null);
      setRevealed(false);
    } else {
      setFinished(true);
      complete(`Predicted ${firstTry} of ${CASES.length} verdicts correctly`);
    }
  };

  return (
    <div className="w-panel guardrails02-citation-check">
      <div className="w-row between">
        <span className="w-label">Answer {index + 1} of {CASES.length}</span>
      </div>

      <ul className="guardrails02-citation-check-sources" aria-label="The two retrieved sources">
        {SOURCES.map((s) => (
          <li key={s.n}>
            <span className="w-mono guardrails02-citation-check-n">[{s.n}]</span>
            <span>
              <strong>{s.heading}.</strong> {s.gist}
            </span>
          </li>
        ))}
      </ul>

      <blockquote className="guardrails02-citation-check-answer">{c.answer}</blockquote>

      <div className="guardrails02-citation-check-group" role="radiogroup" aria-label="Your prediction">
        <span className="w-label">Predict: what does CitationsRetrieved do?</span>
        <div className="guardrails02-citation-check-opts">
          {(["pass", "fail"] as const).map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={pick === o}
              className={`guardrails02-citation-check-opt${pick === o ? " on" : ""}`}
              disabled={revealed}
              onClick={() => setPick(o)}
            >
              {o === "pass" ? "It passes the answer" : "It fails the answer"}
            </button>
          ))}
        </div>
      </div>

      <div className="w-row">
        {!revealed && (
          <button type="button" className="w-btn primary" disabled={pick === null} onClick={reveal}>
            Check my prediction
          </button>
        )}
        {revealed && !finished && (
          <button type="button" className="w-btn ghost" onClick={next}>
            {index + 1 < CASES.length ? "Next answer" : "Finish"}
          </button>
        )}
      </div>

      {revealed && (
        <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
          <strong>{right ? "Correct. " : "Not quite. "}</strong>
          The check {verdict.pass ? "passes" : "fails"} this answer. {c.note}
          {!verdict.pass && (
            <span className="guardrails02-citation-check-out">
              <span className="w-label">Error message</span>
              <span className="w-mono">{verdict.message}</span>
              <span className="w-label">Fix value</span>
              <span className="w-mono">{verdict.fixed}</span>
            </span>
          )}
        </div>
      )}

      {finished && (
        <div className="w-verdict good" role="status">
          You predicted {firstTry} of {CASES.length} verdicts. The check failed two answers. It passed one answer with no
          citation and one whose citation points at the wrong source. Section 7 says where those get caught.
        </div>
      )}
    </div>
  );
}
