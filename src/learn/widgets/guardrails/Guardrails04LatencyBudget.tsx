import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Guardrails04LatencyBudget.css";

// Illustrative figures. These 20 times are made up to show a slow tail. Measure your own with latency_ms.

const TIMES = [92, 98, 101, 104, 106, 108, 110, 112, 115, 118, 121, 124, 128, 133, 139, 146, 158, 212, 380, 640];
const SORTED = [...TIMES].sort((a, b) => a - b);
const MEAN = Math.round(SORTED.reduce((a, b) => a + b, 0) / SORTED.length);
const P50 = Math.round((SORTED[9] + SORTED[10]) / 2);
const P95 = SORTED[Math.ceil(0.95 * SORTED.length) - 1]; // the nearest-rank method: the 19th of 20
const MAX = SORTED[SORTED.length - 1];

type Option = { id: string; label: string };
type Case = { title: string; question: string; options: Option[]; answer: string; explain: string };

const CASES: Case[] = [
  {
    title: "Case 1: pick the number for the budget",
    question: "You want to know how long the slow calls take. Which figure do you put in the budget?",
    options: [
      { id: "a", label: `The mean, ${MEAN} ms.` },
      { id: "b", label: `The p50, ${P50} ms.` },
      { id: "c", label: `The p95, ${P95} ms.` },
    ],
    answer: "c",
    explain: `The mean of ${MEAN} ms and the p50 of ${P50} ms both look healthy. Two calls in twenty took ${P95} ms or more, and the slowest took ${MAX} ms. A user waits through those calls as slow requests. The p95 is the figure that shows them.`,
  },
  {
    title: "Case 2: both stages screen",
    question: `A request makes one input call and one output call, one after the other. The p95 of one call is ${P95} ms. What do you plan for?`,
    options: [
      { id: "a", label: `${P95} ms. The two calls overlap.` },
      { id: "b", label: `About ${P95 * 2} ms. The two times add.` },
      { id: "c", label: `${Math.round(P95 / 2)} ms. Each stage gets half.` },
    ],
    answer: "b",
    explain: `The output call waits for the answer, which waits for the input call, so the times add. About ${P95 * 2} ms is a planning figure. Measure the whole request to confirm it.`,
  },
  {
    title: "Case 3: the answer streams",
    question: "Chapter 2 made stream_desk hold the tokens until the output guards pass the answer. When does the user see the first token with Model Armor on the output stage?",
    options: [
      { id: "a", label: "As soon as the model writes its first token." },
      { id: "b", label: "After the whole answer is written and every output guard, Model Armor included, has passed it." },
      { id: "c", label: "Before the output guards run, because Model Armor works in the background." },
    ],
    answer: "b",
    explain: "The first token waits for the whole answer and for every output guard. So the output call adds its full time to the wait for the first token, and not only to the end of the answer.",
  },
];

function Bars() {
  const w = 12;
  const gap = 3;
  const base = 96;
  const h = (ms: number) => (ms / MAX) * 84;
  const x = (i: number) => 8 + i * (w + gap);
  const y50 = base - h(P50);
  const y95 = base - h(P95);
  return (
    <svg
      viewBox="0 0 320 124"
      className="guardrails04-latency-budget-svg"
      role="img"
      aria-label={`The time of 20 calls, sorted. The mean is ${MEAN} milliseconds, the p50 is ${P50}, the p95 is ${P95} and the slowest is ${MAX}.`}
    >
      {SORTED.map((ms, i) => (
        <rect key={i} x={x(i)} y={base - h(ms)} width={w} height={h(ms)} className={"guardrails04-latency-budget-bar" + (ms >= P95 ? " slow" : "")} />
      ))}
      <line x1="4" x2="316" y1={y50} y2={y50} className="guardrails04-latency-budget-ref p50" />
      <line x1="4" x2="316" y1={y95} y2={y95} className="guardrails04-latency-budget-ref p95" />
      <text x="6" y={y50 - 3} className="guardrails04-latency-budget-ax">p50 {P50} ms</text>
      <text x="6" y={y95 - 3} className="guardrails04-latency-budget-ax">p95 {P95} ms</text>
      <text x="6" y="116" className="guardrails04-latency-budget-ax">20 calls, fastest to slowest. Slowest: {MAX} ms</text>
    </svg>
  );
}

export default function Guardrails04LatencyBudget({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
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
      complete(`Answered ${firstTry} of ${CASES.length} latency questions right on the first try`);
    }
  };

  return (
    <div className="w-panel guardrails04-latency-budget">
      <p className="guardrails04-latency-budget-note w-mono">
        Illustrative figures. 20 made-up calls to screen_prompt. Your own run will differ.
      </p>

      <Bars />

      <dl className="guardrails04-latency-budget-stats">
        <div><dt>Mean</dt><dd>{MEAN} ms</dd></div>
        <div><dt>p50</dt><dd>{P50} ms</dd></div>
        <div><dt>p95</dt><dd>{P95} ms</dd></div>
        <div><dt>Slowest</dt><dd>{MAX} ms</dd></div>
      </dl>

      <div className="w-row between">
        <span className="w-label">{c.title}</span>
        <span className="guardrails04-latency-budget-count">
          {index + 1} of {CASES.length}
        </span>
      </div>

      <div className="guardrails04-latency-budget-group" role="radiogroup" aria-label="Your answer">
        <span className="guardrails04-latency-budget-q">{c.question}</span>
        <div className="guardrails04-latency-budget-opts">
          {c.options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={pick === o.id}
              className={`guardrails04-latency-budget-opt${pick === o.id ? " on" : ""}`}
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
            Check my answer
          </button>
        )}
        {resolved && !finished && (
          <button type="button" className="w-btn ghost" onClick={next}>
            {index + 1 < CASES.length ? "Next question" : "Finish"}
          </button>
        )}
      </div>

      {attempts > 0 && !resolved && (
        <div className="w-verdict bad" role="status">
          Not quite. Think about what a user waits for, and in what order the calls run.
        </div>
      )}

      {resolved && (
        <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
          <strong>{right ? "Correct. " : "Not quite. "}</strong>
          {c.explain}
        </div>
      )}

      {finished && (
        <div className="w-verdict good" role="status">
          You answered {firstTry} of {CASES.length} right on the first try. Budget with the p95, count every stage that screens, and read latency_ms from your own runs.
        </div>
      )}
    </div>
  );
}
