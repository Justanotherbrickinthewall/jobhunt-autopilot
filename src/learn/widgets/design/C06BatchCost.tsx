import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C06BatchCost.css";

// Illustrative figures. Prices are per million tokens. Batch is half the live price.
const IN_PRICE = 3;
const OUT_PRICE = 15;

type Job = {
  id: string;
  name: string;
  records: number;
  inTok: number;
  outTok: number;
  deadlineH: number;
  budget: number;
  quotaPerMin: number;
  answer: number;
  hint: string;
  explain: string;
};

const OPTIONS = ["Live calls", "Batch API", "Neither fits as asked"];

const JOBS: Job[] = [
  {
    id: "archive",
    name: "Archive re-extraction",
    records: 1_000_000,
    inTok: 900,
    outTok: 150,
    deadlineH: 120,
    budget: 3000,
    quotaPerMin: 200_000,
    answer: 1,
    hint: "Price live first: 900 million input tokens at 3 and 150 million output tokens at 15. Then compare it with the budget.",
    explain:
      "Live costs 900 times 3 plus 150 times 15, which is 2,700 plus 2,250, or 4,950 pounds. That is over the 3,000 budget, although live would take only 75 hours. Batch costs 2,475 pounds and needs at most 72 hours with a pilot and a resubmission pass, inside the 120. Batch is the only mode that meets both limits.",
  },
  {
    id: "audit",
    name: "Regulator request",
    records: 200_000,
    inTok: 900,
    outTok: 150,
    deadlineH: 20,
    budget: 2000,
    quotaPerMin: 200_000,
    answer: 0,
    hint: "Batch is half price, but check its window of up to 24 hours against the deadline before you take the saving.",
    explain:
      "Live costs 180 times 3 plus 30 times 15, which is 540 plus 450, or 990 pounds, and 180 million tokens at 200,000 a minute take 15 hours. Both fit. Batch would cost 495 pounds, but its 24 hour window is longer than the 20 hour deadline, so it can miss. Pay the extra 495 pounds for certainty.",
  },
  {
    id: "rush",
    name: "Archive with a rush deadline",
    records: 1_000_000,
    inTok: 900,
    outTok: 150,
    deadlineH: 20,
    budget: 3000,
    quotaPerMin: 200_000,
    answer: 2,
    hint: "Check live against both limits, then check the batch window against the deadline.",
    explain:
      "Live costs 4,950 pounds against a 3,000 budget, and needs 75 hours against a 20 hour deadline. Batch has a 24 hour window, which is longer than 20. No mode meets the brief. Go back with a choice: extend the deadline to 72 hours and use batch, or cut the scope to fit the budget.",
  },
];

function figures(j: Job) {
  const inM = (j.records * j.inTok) / 1e6;
  const outM = (j.records * j.outTok) / 1e6;
  return { inM, outM, live: inM * IN_PRICE + outM * OUT_PRICE, liveH: (inM * 1e6) / j.quotaPerMin / 60 };
}

const fmt = (n: number) => n.toLocaleString("en-GB");

export default function C06BatchCost({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [idx, setIdx] = useState(0);
  const [tried, setTried] = useState<number[]>([]);
  const [resolved, setResolved] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [firstTime, setFirstTime] = useState(0);

  const job = JOBS[idx];
  const f = figures(job);
  const last = idx === JOBS.length - 1;
  const showHint = tried.length === 1 && !resolved;

  function pick(i: number) {
    if (resolved || tried.includes(i)) return;
    const next = [...tried, i];
    setTried(next);
    const ok = i === job.answer;
    const first = ok && next.length === 1;
    const score = firstTime + (first ? 1 : 0);
    if (ok || next.length >= 2) {
      setResolved(true);
      setCorrect(ok);
      if (first) setFirstTime(score);
      if (last) complete(`${score} of ${JOBS.length} jobs routed right first time`);
    }
  }
  function advance() {
    setIdx(idx + 1);
    setTried([]);
    setResolved(false);
    setCorrect(false);
  }

  return (
    <div className="w-panel design-batch-cost">
      <p className="design-batch-cost-lede">
        Route each Harbour job to live calls, the batch API, or neither. Job {idx + 1} of {JOBS.length}: {job.name}.
      </p>
      <dl className="design-batch-cost-facts">
        <div><dt className="w-label">Records</dt><dd className="w-mono">{fmt(job.records)}</dd></div>
        <div><dt className="w-label">Input tokens</dt><dd className="w-mono">{fmt(f.inM)} million</dd></div>
        <div><dt className="w-label">Output tokens</dt><dd className="w-mono">{fmt(f.outM)} million</dd></div>
        <div><dt className="w-label">Deadline</dt><dd className="w-mono">{job.deadlineH} hours</dd></div>
        <div><dt className="w-label">Budget</dt><dd className="w-mono">£{fmt(job.budget)}</dd></div>
        <div><dt className="w-label">Live quota</dt><dd className="w-mono">{fmt(job.quotaPerMin)} input tokens a minute</dd></div>
      </dl>
      <p className="design-batch-cost-rates">
        Prices per million tokens: £{IN_PRICE} input and £{OUT_PRICE} output live, half of that on batch. Batch window: up to 24 hours a pass, and a pilot plus a resubmission pass need 72 hours in all.
      </p>
      <div className="design-batch-cost-choices" role="group" aria-label="Choose a mode">
        {OPTIONS.map((o, i) => (
          <button
            key={o}
            type="button"
            className={`w-btn ghost design-batch-cost-choice${tried.includes(i) ? (i === job.answer ? " is-right" : " is-wrong") : ""}${resolved && i === job.answer ? " is-right" : ""}`}
            onClick={() => pick(i)}
            disabled={resolved || tried.includes(i)}
          >
            {o}
          </button>
        ))}
      </div>
      {showHint && (
        <div className="w-verdict bad" role="status">
          <strong>Not quite.</strong> {job.hint}
        </div>
      )}
      {resolved && (
        <div className={`w-verdict ${correct ? "good" : "bad"}`} role="status">
          <strong>{correct ? "Right." : `The answer is ${OPTIONS[job.answer].toLowerCase()}.`}</strong> {job.explain}
          <p className="design-batch-cost-live w-mono">Live: £{fmt(Math.round(f.live))} and {Math.round(f.liveH * 10) / 10} hours of quota. Batch: £{fmt(Math.round(f.live / 2))}.</p>
        </div>
      )}
      {resolved && !last && (
        <button type="button" className="w-btn" onClick={advance}>
          Next job
        </button>
      )}
      {resolved && last && (
        <p className="design-batch-cost-foot">All three jobs routed. {firstTime} of {JOBS.length} were right first time.</p>
      )}
      <p className="design-batch-cost-foot">Illustrative figures. The prices, quota and window are assumptions for the exercise.</p>
    </div>
  );
}
