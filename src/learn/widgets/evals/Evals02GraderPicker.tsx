import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Evals02GraderPicker.css";

// Each check below is a real check on one run of the PEP desk. The field names are those of DeskResult.
// The two traps are the checks that read like code checks and are not.

type Kind = "code" | "judge";
type Case = { check: string; answer: Kind; reads?: string; why: string };

const CASES: Case[] = [
  {
    check: "The answer is clear to a beginner.",
    answer: "judge",
    why: "Clarity is a property of the prose. No field of the result holds it, so a model has to read the answer.",
  },
  {
    check: "The answer cites PEP 8.",
    answer: "code",
    reads: "result.citations",
    why: "The citations are a list, and each one carries its PEP number as doc_id. Code compares the list with the item's expected PEPs.",
  },
  {
    check: "The answer says what the reference answer says, in other words.",
    answer: "judge",
    why: "Code can compare two strings. It can't compare two meanings. 'Four spaces' and '4 spaces' differ to a string test and agree to a reader.",
  },
  {
    check: "Triage sent the question to the code advisor.",
    answer: "code",
    reads: "result.route",
    why: "The route is one string on the result. Code compares it with the item's expected route.",
  },
  {
    check: "The answer states the line limit correctly.",
    answer: "judge",
    why: "A search for 79 passes 'PEP 8 does not set 79' and fails 'seventy-nine'. Whether the answer is right depends on what it says, so a reader has to decide.",
  },
  {
    check: "python_feature_version ran with pep set to 634.",
    answer: "code",
    reads: "result.trajectory",
    why: "Each tool step in the trajectory records the tool's name and the arguments it ran with.",
  },
  {
    check: "Every claim in the answer is supported by the passages it cites.",
    answer: "judge",
    why: "This is faithfulness, which your course 1 judge flag scored. It asks whether the claims follow from the text, and only a reader can say.",
  },
  {
    check: "The desk refused 'What is the capital of France?'",
    answer: "code",
    reads: "result.refused",
    why: "The refused flag is a true or false value on the result. Code reads it.",
  },
];

const OPTIONS: { id: Kind; label: string }[] = [
  { id: "code", label: "A code grader can decide it." },
  { id: "judge", label: "It needs a judge." },
];

export default function Evals02GraderPicker({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState<Kind | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const c = CASES[index];
  const right = pick === c.answer;

  const check = () => {
    if (pick === null) return;
    const n = attempts + 1;
    setAttempts(n);
    if (pick === c.answer || n >= 2) {
      setResolved(true);
      if (pick === c.answer && n === 1) setFirstTry((k) => k + 1);
    }
  };

  const next = () => {
    if (index + 1 < CASES.length) {
      setIndex(index + 1);
      setPick(null);
      setAttempts(0);
      setResolved(false);
    } else {
      setFinished(true);
      complete(`Sorted ${firstTry} of ${CASES.length} checks on the first try`);
    }
  };

  return (
    <div className="w-panel evals02-grader-picker">
      <div className="w-row between">
        <span className="w-label">Check {index + 1} of {CASES.length}</span>
        <span className="evals02-grader-picker-count">{firstTry} right on the first try</span>
      </div>

      <div className="evals02-grader-picker-scene">
        <p>
          <strong>The check.</strong> {c.check}
        </p>
      </div>

      <div className="evals02-grader-picker-group" role="radiogroup" aria-label="Your prediction">
        <span className="w-label">Predict: who can decide it?</span>
        <div className="evals02-grader-picker-opts">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={pick === o.id}
              className={`evals02-grader-picker-opt${pick === o.id ? " on" : ""}`}
              disabled={resolved}
              onClick={() => setPick(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-row">
        {!resolved && (
          <button type="button" className="w-btn primary" disabled={pick === null} onClick={check}>
            Check my prediction
          </button>
        )}
        {resolved && !finished && (
          <button type="button" className="w-btn ghost" onClick={next}>
            {index + 1 < CASES.length ? "Next check" : "Finish"}
          </button>
        )}
      </div>

      {attempts > 0 && !resolved && (
        <div className="w-verdict bad" role="status">
          Not quite. Ask whether a field of the result holds the answer, then pick again.
        </div>
      )}

      {resolved && (
        <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
          <strong>{right ? "Correct. " : "Not quite. "}</strong>
          {c.answer === "code" ? `A code grader reads ${c.reads}. ` : "It needs a judge. "}
          {c.why}
        </div>
      )}

      {finished && (
        <div className="w-verdict good" role="status">
          You sorted {firstTry} of {CASES.length} checks on the first try. The rule: if a field of the result holds the
          answer, code can grade it. If the answer sits in the meaning of the prose, spend a judge.
        </div>
      )}
    </div>
  );
}
