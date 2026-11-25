import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C06RestartPlan.css";

type Step = { id: string; title: string; prompt: string; options: string[]; answer: number; hint: string; explain: string };

const STEPS: Step[] = [
  {
    id: "key",
    title: "The key for a result write",
    prompt: "The job writes one result row per record. Which key makes a restart overwrite a row and never duplicate it, and keeps results from two prompt versions apart?",
    options: [
      "Batch id plus position in the batch",
      "Record id plus the time of the call",
      "Record id plus the extraction version",
      "A fresh random id for every attempt",
    ],
    answer: 2,
    hint: "Ask which parts of the key stay the same when the same work is attempted a second time.",
    explain:
      "The record id and the extraction version are identical on every attempt at the same work, so an upsert overwrites. A resubmitted chunk gets a new batch id, every call has a new time, and a random id is new each time. Each of those would add a second row.",
  },
  {
    id: "checkpoint",
    title: "The checkpoint",
    prompt: "The process will die at some point in a run of days. What do you commit as the record of progress?",
    options: [
      "A chunk manifest row with the state, the record range and the batch id, committed on every state change",
      "One progress file written when the run finishes",
      "An hourly count of how many records are done",
      "Nothing, because the results table already shows what is finished",
    ],
    answer: 0,
    hint: "The restart needs to know the state of work in flight, which results that have not arrived yet cannot show.",
    explain:
      "A manifest row per chunk records work in flight as well as finished work. A file written at the end is lost with the crash, a bare count cannot say which records are done, and the results table is silent about a batch that is running but has returned nothing.",
  },
  {
    id: "restart",
    title: "The restart action",
    prompt: "The crash left chunk eight as submitted with a batch id, and chunk nine as submitting with no batch id. Chunks one to seven are written. What does the restart do?",
    options: [
      "Resubmit chunks eight and nine, to be safe",
      "Start again from record one, so every row is fresh",
      "Mark chunk nine failed and dead-letter its 50,000 records",
      "Skip chunks one to seven, poll chunk eight by batch id, and look up the provider's batches for chunk nine before any resubmission",
    ],
    answer: 3,
    hint: "Work out which chunks already cost money, and which chunk has an unknown outcome.",
    explain:
      "Written chunks need nothing. Chunk eight is running, so polling it costs nothing, while resubmitting would pay about 124 pounds twice. Chunk nine is an unknown outcome, so check for an existing batch first and submit only if none exists. Starting from record one repeats about 400,000 records of spend.",
  },
];

export default function C06RestartPlan({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [idx, setIdx] = useState(0);
  const [tried, setTried] = useState<number[]>([]);
  const [resolved, setResolved] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [firstTime, setFirstTime] = useState(0);

  const step = STEPS[idx];
  const last = idx === STEPS.length - 1;
  const showHint = tried.length === 1 && !resolved;

  function pick(i: number) {
    if (resolved || tried.includes(i)) return;
    const next = [...tried, i];
    setTried(next);
    const ok = i === step.answer;
    const first = ok && next.length === 1;
    const score = firstTime + (first ? 1 : 0);
    if (ok || next.length >= 2) {
      setResolved(true);
      setCorrect(ok);
      if (first) setFirstTime(score);
      if (last) complete(`restart plan: ${score} of ${STEPS.length} choices right first time`);
    }
  }
  function advance() {
    setIdx(idx + 1);
    setTried([]);
    setResolved(false);
    setCorrect(false);
  }

  return (
    <div className="w-panel design-restart-plan">
      <div className="design-restart-plan-count w-label">
        Decision {idx + 1} of {STEPS.length}: {step.title}
      </div>
      <p className="design-restart-plan-prompt">{step.prompt}</p>
      <div className="design-restart-plan-choices" role="group" aria-label="Choose one">
        {step.options.map((o, i) => (
          <button
            key={o}
            type="button"
            className={`w-btn ghost design-restart-plan-choice${tried.includes(i) && i !== step.answer ? " is-wrong" : ""}${resolved && i === step.answer ? " is-right" : ""}`}
            onClick={() => pick(i)}
            disabled={resolved || tried.includes(i)}
          >
            {o}
          </button>
        ))}
      </div>
      {showHint && (
        <div className="w-verdict bad" role="status">
          <strong>Not quite.</strong> {step.hint}
        </div>
      )}
      {resolved && (
        <div className={`w-verdict ${correct ? "good" : "bad"}`} role="status">
          <strong>{correct ? "Right." : "That one stays unsafe."}</strong> {step.explain}
        </div>
      )}
      {resolved && !last && (
        <button type="button" className="w-btn" onClick={advance}>
          Next decision
        </button>
      )}
      {resolved && last && (
        <p className="design-restart-plan-foot">Plan complete. {firstTime} of {STEPS.length} choices were right first time.</p>
      )}
      <p className="design-restart-plan-foot">Illustrative figures. One chunk is 50,000 records at about £0.002475 a record on batch.</p>
    </div>
  );
}
