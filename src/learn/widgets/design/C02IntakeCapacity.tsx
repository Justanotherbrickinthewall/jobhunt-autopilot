import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C02IntakeCapacity.css";

type Plan = { label: string; why: string };
type Case = {
  title: string;
  volume: number; // documents a day
  share: number; // share of the day's volume that arrives in the peak
  peakHours: number;
  deadline: number; // hours from arrival to posted or queued for review
  secs: number; // seconds per document in the extraction stage
  tokens: number; // model tokens per document
  plans: Plan[];
  answer: number;
};

const HEADROOM = 1.25;

const CASES: Case[] = [
  {
    title: "A normal day",
    volume: 50000,
    share: 0.6,
    peakHours: 3,
    deadline: 4,
    secs: 6,
    tokens: 2000,
    plans: [
      { label: "9 workers, 70,000 tokens a minute", why: "The worker count is right, but 70,000 tokens a minute lets through only 35 documents a minute. The deadline needs 89. The token quota is a second limit, and here it binds first." },
      { label: "4 workers, 70,000 tokens a minute", why: "This is sized for the daily average of 2,083 documents an hour. The peak queue would then never clear inside four hours." },
      { label: "9 workers, 180,000 tokens a minute", why: "" },
      { label: "17 workers, 340,000 tokens a minute", why: "This keeps up with the raw peak of 10,000 an hour, so it passes. It buys nearly twice the capacity the deadline needs, and the extra is idle for 21 hours a day." },
    ],
    answer: 2,
  },
  {
    title: "Month end",
    volume: 50000,
    share: 0.8,
    peakHours: 2,
    deadline: 4,
    secs: 6,
    tokens: 2000,
    plans: [
      { label: "14 workers, 280,000 tokens a minute", why: "" },
      { label: "9 workers, 180,000 tokens a minute", why: "This is the normal-day plan. A sharper peak raises the rate the deadline needs, so the same pool misses it." },
      { label: "14 workers, 180,000 tokens a minute", why: "The workers are right, but the model quota would cap the pool at 90 documents a minute. The deadline needs 139." },
      { label: "34 workers, 670,000 tokens a minute", why: "This sizes for the raw peak of 20,000 an hour. It passes, and it pays for more than twice the capacity the deadline needs." },
    ],
    answer: 0,
  },
  {
    title: "A supplier sends slow scans",
    volume: 50000,
    share: 0.6,
    peakHours: 3,
    deadline: 4,
    secs: 10,
    tokens: 2000,
    plans: [
      { label: "15 workers, 300,000 tokens a minute", why: "Tokens per document did not change, so the quota should not rise. The extra 120,000 tokens a minute is idle." },
      { label: "9 workers, 180,000 tokens a minute", why: "This keeps the old 6 seconds per document. At 10 seconds, nine workers finish only 54 documents a minute against the 89 needed." },
      { label: "15 workers, 180,000 tokens a minute", why: "" },
      { label: "28 workers, 340,000 tokens a minute", why: "This sizes for the raw peak at 10 seconds a document. It passes, and it wastes most of what it buys." },
    ],
    answer: 2,
  },
];

const n0 = (x: number) => Math.round(x).toLocaleString("en-GB");
const up10k = (x: number) => Math.ceil(x / 10000) * 10000;

function working(c: Case) {
  const peakDocs = c.volume * c.share;
  const clearHours = c.peakHours + c.deadline;
  const rate = peakDocs / clearHours; // documents an hour
  const padded = rate * HEADROOM;
  const perSec = padded / 3600;
  const workers = Math.ceil(perSec * c.secs);
  const perMin = padded / 60;
  const tpm = up10k(perMin * c.tokens);
  return { peakDocs, clearHours, rate, padded, perSec, workers, perMin, tpm };
}

export default function C02IntakeCapacity({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<(number | null)[]>(CASES.map(() => null));
  const [idx, setIdx] = useState(0);

  const c = CASES[idx];
  const w = working(c);
  const pick = picks[idx];
  const answered = pick !== null;
  const last = idx === CASES.length - 1;
  const right = picks.filter((p, i) => p === CASES[i].answer).length;
  const finished = last && answered;

  const choose = (i: number) => {
    if (answered) return;
    const next = picks.map((p, j) => (j === idx ? i : p));
    setPicks(next);
    if (last) {
      const score = next.filter((p, j) => p === CASES[j].answer).length;
      complete(`${score} of ${CASES.length} capacity plans right`);
    }
  };

  return (
    <div className="w-panel design-intake-capacity">
      <p className="design-intake-capacity-hint">
        Illustrative figures. Choose the smallest plan that meets the deadline with 25 percent headroom. Each plan sets the worker count and the model quota.
      </p>
      <div className="design-intake-capacity-count">
        Case {idx + 1} of {CASES.length}
      </div>
      <section className="design-intake-capacity-card" aria-label={`Case ${idx + 1}`}>
        <p className="design-intake-capacity-title">{c.title}</p>
        <ul className="design-intake-capacity-inputs">
          <li>{n0(c.volume)} documents a day, {Math.round(c.share * 100)} percent arriving in {c.peakHours} hours.</li>
          <li>Every document must be posted or queued for review within {c.deadline} hours of arrival.</li>
          <li>The extraction stage takes {c.secs} seconds a document and {n0(c.tokens)} model tokens.</li>
        </ul>
        <div className="design-intake-capacity-options" role="radiogroup" aria-label="Capacity plan">
          {c.plans.map((p, i) => (
            <button
              key={p.label}
              type="button"
              role="radio"
              aria-checked={pick === i}
              disabled={answered}
              className={`w-chip design-intake-capacity-opt${pick === i ? " is-on" : ""}${answered && i === c.answer ? " good" : ""}${answered && pick === i && i !== c.answer ? " bad" : ""}`}
              onClick={() => choose(i)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {answered && (
          <>
            <p className={`design-intake-capacity-why ${pick === c.answer ? "ok" : "miss"}`}>
              {pick === c.answer ? "Correct. " : `Not that one. The right plan is ${c.plans[c.answer].label}. `}
              {pick !== c.answer && c.plans[pick as number].why}
            </p>
            <p className="design-intake-capacity-work w-mono">
              {n0(w.peakDocs)} documents clear in {w.clearHours} hours is {n0(w.rate)} an hour. With headroom, {n0(w.padded)} an hour, or {w.perSec.toFixed(2)} a second.
              Workers: {w.perSec.toFixed(2)} x {c.secs} seconds = {(w.perSec * c.secs).toFixed(1)}, so {w.workers}. Tokens: {n0(w.perMin)} documents a minute x {n0(c.tokens)} = {n0(w.perMin * c.tokens)}, so {n0(w.tpm)} a minute.
            </p>
          </>
        )}
      </section>
      {answered && !last && (
        <button type="button" className="w-btn" onClick={() => setIdx(idx + 1)}>
          Next case
        </button>
      )}
      {finished && (
        <div className={`w-verdict ${right >= 2 ? "good" : "bad"}`} role="status">
          {right} of {CASES.length} plans right. The deadline sets the rate, the seconds per document set the workers, and the tokens per document set the quota. Re-measure the seconds whenever the mix of documents changes.
        </div>
      )}
    </div>
  );
}
