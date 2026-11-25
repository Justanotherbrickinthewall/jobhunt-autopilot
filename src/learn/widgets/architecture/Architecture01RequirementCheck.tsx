import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Architecture01RequirementCheck.css";

type Fault = "no-number" | "two-in-one" | "choice" | "fine";

const FAULTS: { id: Fault; label: string; hint: string }[] = [
  { id: "no-number", label: "It has no number", hint: "No test could measure it" },
  { id: "two-in-one", label: "It holds two requirements", hint: "One sentence, two ideas" },
  { id: "choice", label: "It names a choice, not a need", hint: "A way to build, not an outcome" },
  { id: "fine", label: "Nothing is wrong", hint: "A test could fail it" },
];

type Case = { id: string; draft: string; fault: Fault; hint: string; why: string };

// Five made-up drafts. Two are sound. The sound ones use the targets of the chapter's own table.
const CASES: Case[] = [
  {
    id: "quick",
    draft: "AskPEP answers questions quickly.",
    fault: "no-number",
    hint: "Could a test fail this sentence? Which number would it check?",
    why: "No limit is named, so no measurement can ever contradict the sentence. Quickly needs a number, such as 95% of requests finishing within 10 seconds.",
  },
  {
    id: "pair",
    draft: "At least 80% of answers pass the graders, and 95% of requests finish within 10 seconds.",
    fault: "two-in-one",
    hint: "Count the numbers. If a test fails, which half would you fix?",
    why: "The sentence joins a quality number and a speed number. When it fails, nobody knows which half to fix. Split it into one requirement for the answer pass rate and one for the latency.",
  },
  {
    id: "choice",
    draft: "The desk uses the same chat model for every role.",
    fault: "choice",
    hint: "Is this something AskPEP must achieve, or something a team picks?",
    why: "It describes a way of building the desk. The need behind it might be a cost limit or an eval floor. Write the need, and let the options compete to meet it.",
  },
  {
    id: "cost",
    draft: "Spend per successful task stays at or below 2 cents.",
    fault: "fine",
    hint: "Look for one number, one idea and an outcome.",
    why: "It has one number, one idea and an outcome that a test can fail. The cost-per-success objective of course 5 measures it.",
  },
  {
    id: "recall",
    draft: "The right PEP appears in the top six results for at least 80% of the retrieval items.",
    fault: "fine",
    hint: "Look for one number, one idea and an outcome.",
    why: "It states a rate, names one idea and can fail. The retrieval slice of the gate in course 4 measures it as recall at 6.",
  },
];

type Phase = "pick" | "hint" | "done";

export default function Architecture01RequirementCheck({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState<Fault | null>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const c = CASES[idx];

  const check = () => {
    if (!pick) return;
    if (pick === c.fault) {
      if (phase === "pick") setFirstTry((n) => n + 1);
      setPhase("done");
    } else if (phase === "pick") {
      setPhase("hint");
      setPick(null);
    } else {
      setPhase("done");
    }
  };

  const next = () => {
    if (idx === CASES.length - 1) {
      setFinished(true);
      complete(`Judged ${firstTry} of ${CASES.length} draft requirements correctly first time`);
      return;
    }
    setIdx(idx + 1);
    setPick(null);
    setPhase("pick");
  };

  const faultLabel = FAULTS.find((f) => f.id === c.fault)?.label ?? "";

  return (
    <div className="w-panel architecture01-requirement-check">
      <p className="w-label">Five draft requirements</p>
      {!finished && (
        <>
          <p className="architecture01-requirement-check-count w-label" aria-live="polite">
            Draft {idx + 1} of {CASES.length}
          </p>
          <p className="architecture01-requirement-check-draft">{c.draft}</p>
          <fieldset className="architecture01-requirement-check-pick" disabled={phase === "done"}>
            <legend>What is wrong with this draft?</legend>
            <div className="architecture01-requirement-check-opts" role="radiogroup" aria-label="What is wrong">
              {FAULTS.map((f) => {
                const right = phase === "done" && f.id === c.fault;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={pick === f.id}
                    className={`architecture01-requirement-check-opt${pick === f.id ? " on" : ""}${right ? " right" : ""}`}
                    onClick={() => setPick(f.id)}
                  >
                    <span className="architecture01-requirement-check-name">{f.label}</span>
                    <span className="architecture01-requirement-check-sub">{f.hint}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          {phase !== "done" && (
            <button type="button" className="w-btn" disabled={!pick} onClick={check}>
              Check my pick
            </button>
          )}
          {phase === "hint" && (
            <div className="w-verdict bad" role="status">
              That is not the fault. {c.hint} You have one more try.
            </div>
          )}
          {phase === "done" && (
            <div className="w-stack">
              <div className={`w-verdict ${pick === c.fault ? "good" : "bad"}`} role="status">
                {pick === c.fault ? "Correct. " : `The answer is: ${faultLabel.toLowerCase()}. `}
                {c.why}
              </div>
              <button type="button" className="w-btn" onClick={next}>
                {idx === CASES.length - 1 ? "See the result" : "Next draft"}
              </button>
            </div>
          )}
        </>
      )}
      {finished && (
        <div className="w-verdict good" role="status">
          You judged {firstTry} of {CASES.length} drafts correctly on the first try. A requirement worth writing has one number, one idea and an outcome that a test can fail. The two sound drafts had all three. Each of the other three lacked one.
        </div>
      )}
    </div>
  );
}
