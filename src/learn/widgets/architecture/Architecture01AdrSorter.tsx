import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Architecture01AdrSorter.css";

type Part = "context" | "options" | "decision" | "consequences" | "evidence";

const PARTS: { id: Part; label: string; hint: string }[] = [
  { id: "context", label: "Context", hint: "What forced it, with numbers" },
  { id: "options", label: "Options", hint: "Each choice, its cost and its risk" },
  { id: "decision", label: "Decision", hint: "One sentence that starts We will" },
  { id: "consequences", label: "Consequences", hint: "What changes, and what would prove it wrong" },
  { id: "evidence", label: "Evidence", hint: "Commands a reviewer can run again" },
];

type Case = { id: string; line: string; part: Part; hint: string; why: string };

// Six lines from one made-up ADR. The decision is to run the offline attack gate on every pull request.
const CASES: Case[] = [
  {
    id: "need",
    line: "Requirement R5 caps the attack success rate at 5%. The attack slice of course 4 plays 25 attacks offline, so it needs no keys and spends nothing.",
    part: "context",
    hint: "What forced the decision? Look for a requirement and numbers with a source.",
    why: "The line names the requirement that the decision serves, and the numbers that matter with where they came from. That is the context.",
  },
  {
    id: "decide",
    line: "We will run the offline attack gate on every pull request.",
    part: "decision",
    hint: "Look for the sentence that starts with We will.",
    why: "A decision is one sentence that starts with We will. One or two reasons follow it.",
  },
  {
    id: "live",
    line: "A live gate on every pull request also grades answers. It spends money on each run and needs keys. Its main risk is a bill that grows with every change.",
    part: "options",
    hint: "Is this a choice that was weighed, with its cost and its risk?",
    why: "The line describes one option with its cost and its main risk. Each option gets a short paragraph like this one.",
  },
  {
    id: "run",
    line: "Run uv run askpep eval gate --config evals/gate-attack.json and read the attack slice.",
    part: "evidence",
    hint: "Which part lets a reviewer run the numbers again?",
    why: "The evidence lists the commands, traces, eval runs and commits behind the numbers. A reviewer can run them again and check.",
  },
  {
    id: "nothing",
    line: "Doing nothing leaves a weakened guard unchecked until someone runs the gate by hand.",
    part: "options",
    hint: "The template says one particular option must always be listed.",
    why: "Doing nothing is an option, and the template asks you to list it with its cost. It sets the baseline that every other option must beat.",
  },
  {
    id: "wrong",
    line: "If an attack gets through that the 25 did not include, this decision was wrong. We would then add that attack to the set.",
    part: "consequences",
    hint: "Which part names the event that would show the decision was wrong?",
    why: "The consequences say what gets easier and harder, and name the event that would show the decision wrong. Here the event is an attack that the 25 did not cover.",
  },
];

type Phase = "pick" | "hint" | "done";

export default function Architecture01AdrSorter({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState<Part | null>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const c = CASES[idx];

  const check = () => {
    if (!pick) return;
    if (pick === c.part) {
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
      complete(`Placed ${firstTry} of ${CASES.length} ADR lines in the right part first time`);
      return;
    }
    setIdx(idx + 1);
    setPick(null);
    setPhase("pick");
  };

  const partLabel = PARTS.find((p) => p.id === c.part)?.label ?? "";

  return (
    <div className="w-panel architecture01-adr-sorter">
      <p className="w-label">Six lines from one made-up ADR</p>
      {!finished && (
        <>
          <p className="architecture01-adr-sorter-count w-label" aria-live="polite">
            Line {idx + 1} of {CASES.length}
          </p>
          <p className="architecture01-adr-sorter-line">{c.line}</p>
          <fieldset className="architecture01-adr-sorter-pick" disabled={phase === "done"}>
            <legend>Which part of the ADR holds this line?</legend>
            <div className="architecture01-adr-sorter-opts" role="radiogroup" aria-label="Part of the ADR">
              {PARTS.map((p) => {
                const right = phase === "done" && p.id === c.part;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={pick === p.id}
                    className={`architecture01-adr-sorter-opt${pick === p.id ? " on" : ""}${right ? " right" : ""}`}
                    onClick={() => setPick(p.id)}
                  >
                    <span className="architecture01-adr-sorter-name">{p.label}</span>
                    <span className="architecture01-adr-sorter-sub">{p.hint}</span>
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
              That is not the part. {c.hint} You have one more try.
            </div>
          )}
          {phase === "done" && (
            <div className="w-stack">
              <div className={`w-verdict ${pick === c.part ? "good" : "bad"}`} role="status">
                {pick === c.part ? "Correct. " : `The part is ${partLabel}. `}
                {c.why}
              </div>
              <button type="button" className="w-btn" onClick={next}>
                {idx === CASES.length - 1 ? "See the result" : "Next line"}
              </button>
            </div>
          )}
        </>
      )}
      {finished && (
        <div className="w-verdict good" role="status">
          You placed {firstTry} of {CASES.length} lines in the right part on the first try. Two of the six lines were options, and one of those was the option of doing nothing. A reviewer reads the parts in order: what forced the decision, what else was possible, what was chosen, what follows and how to check it.
        </div>
      )}
    </div>
  );
}
