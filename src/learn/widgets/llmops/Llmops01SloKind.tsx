import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Llmops01SloKind.css";

type Kind = "success" | "latency" | "guard_block" | "cost";

const KINDS: { id: Kind; hint: string }[] = [
  { id: "success", hint: "share that got an answer" },
  { id: "latency", hint: "share within a time limit" },
  { id: "guard_block", hint: "share a guard did not block" },
  { id: "cost", hint: "spend per successful task" },
];

type Case = { id: string; complaint: string; kind: Kind; hint: string; why: string; slo: string };

// Four made-up complaints. Each names the SLO from the chapter's slos.json that would have caught it.
const CASES: Case[] = [
  {
    id: "slow",
    complaint: "A person waits 14 seconds, then gets a correct answer with its citations.",
    kind: "latency",
    hint: "The answer is right and it arrived. What did the person feel?",
    why: "The answer is fine, so a success count would stay green. The wait is the complaint, which a latency SLO on the stage total measures.",
    slo: "total-latency: 95% of requests finish within 10 seconds.",
  },
  {
    id: "bill",
    complaint: "The bill for this week is 40% above last week's, and the number of questions has not moved.",
    kind: "cost",
    hint: "Nothing is slower, and nobody is blocked. What changed?",
    why: "Each question costs more, which no count of requests shows. Only spend per successful task catches it.",
    slo: "cost-per-success: spend per successful task stays at or below 2 cents.",
  },
  {
    id: "blocked",
    complaint: "Ordinary questions get \"I can't help with that question, because a safety check blocked it.\" You want a number that says whether a guard has become too strict.",
    kind: "guard_block",
    hint: "The model never saw these questions. Which kind counts what a guard did?",
    why: "A guard block ends the request before any model runs. The success share counts it as a failure too, but it mixes blocks with errors. Only the guard block share keeps them apart, and it moves when a guard gets too strict or someone attacks.",
    slo: "guard-block-rate: at most 3% of requests are blocked by a guard.",
  },
  {
    id: "error",
    complaint: "About one request in ten ends in an error, and the person sees no answer at all.",
    kind: "success",
    hint: "The person got nothing back. Which kind counts answers?",
    why: "An error is the plainest failure. The success share counts every request that gave an answer, so one in ten failing puts it at 0.90 against a target of 0.95.",
    slo: "answer-success: 95% of requests give an answer.",
  },
];

type Phase = "pick" | "hint" | "done";

export default function Llmops01SloKind({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState<Kind | null>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const c = CASES[idx];

  const check = () => {
    if (!pick) return;
    if (pick === c.kind) {
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
      complete(`Matched ${firstTry} of ${CASES.length} complaints to an SLO kind first time`);
      return;
    }
    setIdx(idx + 1);
    setPick(null);
    setPhase("pick");
  };

  return (
    <div className="w-panel llmops01-slo-kind">
      <p className="w-label">Four made-up complaints</p>
      {!finished && (
        <>
          <p className="llmops01-slo-kind-count w-label" aria-live="polite">
            Complaint {idx + 1} of {CASES.length}
          </p>
          <p className="llmops01-slo-kind-complaint">{c.complaint}</p>
          <fieldset className="llmops01-slo-kind-pick" disabled={phase === "done"}>
            <legend>Which kind of SLO would catch this?</legend>
            <div className="llmops01-slo-kind-opts" role="radiogroup" aria-label="SLO kind">
              {KINDS.map((k) => {
                const right = phase === "done" && k.id === c.kind;
                return (
                  <button
                    key={k.id}
                    type="button"
                    role="radio"
                    aria-checked={pick === k.id}
                    className={`llmops01-slo-kind-opt${pick === k.id ? " on" : ""}${right ? " right" : ""}`}
                    onClick={() => setPick(k.id)}
                  >
                    <span className="w-mono llmops01-slo-kind-name">{k.id}</span>
                    <span className="llmops01-slo-kind-sub">{k.hint}</span>
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
              That kind would not catch it. {c.hint} You have one more try.
            </div>
          )}
          {phase === "done" && (
            <div className="w-stack">
              <div className={`w-verdict ${pick === c.kind ? "good" : "bad"}`} role="status">
                {pick === c.kind ? "Correct. " : `The kind is ${c.kind}. `}
                {c.why}
                <span className="llmops01-slo-kind-slo w-mono">{c.slo}</span>
              </div>
              <button type="button" className="w-btn" onClick={next}>
                {idx === CASES.length - 1 ? "See the result" : "Next complaint"}
              </button>
            </div>
          )}
        </>
      )}
      {finished && (
        <div className="w-verdict good" role="status">
          You matched {firstTry} of {CASES.length} on the first try. Each complaint had its own kind, and none of the four would have shown in another kind's number. That is why AskPEP needs all four, and why one dashboard of request counts would have caught none of them.
        </div>
      )}
    </div>
  );
}
