import { useState } from "react";
import type { ReactNode } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Architecture07WaitBudget.css";

// Worked-example figures, in seconds. Each one names the chapter on main that gives it.
const TRIAGE_TOOLS = 2; // course 3: triage and tools take 2 seconds
const WRITER = 4; // course 3: the writer takes 4 seconds, with its first token 1 second in
const REASK = 3; // course 3: one model call takes 3 seconds
const ARMOR = 0.38; // course 3: the p95 of its 20 made-up Model Armor calls is 380 milliseconds
const LIMIT = 10; // course 5: 95 percent of requests finish within 10 seconds
const AXIS = 11; // the bar runs to 11 seconds, so the limit sits near its right end

type Kind = "work" | "guard" | "reask";
type Seg = { label: string; s: number; kind: Kind };
type Option = { id: string; label: string };

type Case = {
  title: string;
  setup: string;
  question: string;
  options: Option[];
  answer: string;
  explain: string;
  segs: Seg[];
  firstToken: number | null; // seconds into the request, or null when no stream reaches a user
};

const DESK: Seg[] = [
  { label: "Triage and tools", s: TRIAGE_TOOLS, kind: "work" },
  { label: "Writer", s: WRITER, kind: "work" },
];

const CASES: Case[] = [
  {
    title: "Case 1: the output guards, no Model Armor",
    setup:
      "A desk request on /agent. Triage and tools take 2 seconds and the writer takes 4. The writer's first token comes 1 second in. The output guards are on, and they hold the stream.",
    question: "When does the user see the first token?",
    options: [
      { id: "a", label: "At 3 seconds, as before the guard." },
      { id: "b", label: "At 6 seconds, when the answer is finished and checked." },
      { id: "c", label: "At 6 seconds plus the time of one reask." },
    ],
    answer: "b",
    explain:
      "The check needs the whole answer, so no token leaves until the writer finishes. The first token arrives at 6 seconds in place of 3. The check itself takes milliseconds, so the bar leaves it out.",
    segs: DESK,
    firstToken: TRIAGE_TOOLS + WRITER,
  },
  {
    title: "Case 2: add Model Armor on both stages",
    setup:
      "The same request, with MODEL_ARMOR_TEMPLATE set. One Model Armor call screens the question before the run. A second screens the answer after the other output guards. Take 380 milliseconds as the p95 of one call.",
    question: "About how much does Model Armor add to the wait?",
    options: [
      { id: "a", label: "About 380 milliseconds, because the two calls overlap." },
      { id: "b", label: "About 760 milliseconds, because the two calls run one after the other." },
      { id: "c", label: "About 3 seconds, as one model call does." },
    ],
    answer: "b",
    explain:
      "The answer can't be screened before it exists, and the question is screened before the run starts. So the times add, and 2 times 380 is 760 milliseconds. This is a planning figure, and 380 is made up. Replace it with the p95 of your own audit.latency_ms.",
    segs: [{ label: "Armor on the question", s: ARMOR, kind: "guard" }, ...DESK, { label: "Armor on the answer", s: ARMOR, kind: "guard" }],
    firstToken: ARMOR + TRIAGE_TOOLS + WRITER + ARMOR,
  },
  {
    title: "Case 3: the citation check fails once",
    setup:
      "Same settings, but the citation check finds a marker that points nowhere. The guard asks the model again, once, and OUTPUT_MAX_REASKS stops there. The SLO is that 95 percent of requests finish within 10 seconds.",
    question: "Does this request still finish inside 10 seconds?",
    options: [
      { id: "a", label: "Yes, with about a quarter of a second to spare." },
      { id: "b", label: "Yes, with about 3 seconds to spare." },
      { id: "c", label: "No, it runs about 2 seconds over." },
    ],
    answer: "a",
    explain:
      "The reask adds one 3 second model call, so the request takes 9.76 seconds. It fits by 0.24 seconds. One slow Model Armor call in the tail would break it. Stage p95s don't add up, so read the real total from your traces.",
    segs: [
      { label: "Armor on the question", s: ARMOR, kind: "guard" },
      ...DESK,
      { label: "Reask: one more model call", s: REASK, kind: "reask" },
      { label: "Armor on the answer", s: ARMOR, kind: "guard" },
    ],
    firstToken: ARMOR + TRIAGE_TOOLS + WRITER + REASK + ARMOR,
  },
  {
    title: "Case 4: the same run on /jobs/agent",
    setup:
      "Now the question arrives through the queue. POST /jobs/agent answers 202 at once. A worker runs the desk with no stream, and the caller polls GET /agent/{thread_id} for the finished run.",
    question: "What does the held stream cost this caller?",
    options: [
      { id: "a", label: "A wait of 9.76 seconds before the first token." },
      { id: "b", label: "Nothing it can see. No stream reaches it, and it polls for the result." },
      { id: "c", label: "The same as on /agent, plus the queue's delay." },
    ],
    answer: "b",
    explain:
      "The worker calls run_desk, which returns the finished run. There are no tokens to hold. The reask still costs money and still lengthens the run, but nobody watches a blank screen. The desk does not put the reask's tokens in `cost_usd` yet. Slow checks hurt least on the async path.",
    segs: [
      { label: "Armor on the question", s: ARMOR, kind: "guard" },
      ...DESK,
      { label: "Reask: one more model call", s: REASK, kind: "reask" },
      { label: "Armor on the answer", s: ARMOR, kind: "guard" },
    ],
    firstToken: null,
  },
  {
    title: "Case 5: a cache hit on /ask",
    setup:
      "The response cache is on, and a repeat question hits it. Model Armor is still set. The stored answer passed the output guards when it was first written.",
    question: "Which Model Armor calls does the hit make?",
    options: [
      { id: "a", label: "None. A hit skips every guard." },
      { id: "b", label: "One, on the question. The hit skips the output guards." },
      { id: "c", label: "Two, one on the question and one on the stored answer." },
    ],
    answer: "b",
    explain:
      "A hit runs the input guards, so the question is still screened. It skips the output guards, so the answer call never happens. That is safe because the cache stores only a cited answer that already passed them. No model runs either, so the hit spends no tokens.",
    segs: [{ label: "Armor on the question", s: ARMOR, kind: "guard" }],
    firstToken: ARMOR,
  },
];

const fmt = (s: number) => (s < 1 ? `${Math.round(s * 1000)} ms` : `${Number(s.toFixed(2))} s`);
const sum = (segs: Seg[]) => segs.reduce((t, g) => t + g.s, 0);

function code(text: string): ReactNode[] {
  return text.split("`").map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : part));
}

function Timeline({ c }: { c: Case }) {
  const total = sum(c.segs);
  const over = total > LIMIT;
  return (
    <div className="architecture07-wait-budget-tl">
      <div
        className="architecture07-wait-budget-bar"
        role="img"
        aria-label={`The request takes ${fmt(total)}. The limit is ${LIMIT} seconds.${
          c.firstToken === null ? " No stream reaches a user." : ` The first token reaches the user at ${fmt(c.firstToken)}.`
        }`}
      >
        {c.segs.map((g, i) => (
          <span
            key={i}
            className={`architecture07-wait-budget-seg ${g.kind}`}
            style={{ width: `${(g.s / AXIS) * 100}%` }}
            title={`${g.label}: ${fmt(g.s)}`}
          />
        ))}
        <span className="architecture07-wait-budget-limit" style={{ left: `${(LIMIT / AXIS) * 100}%` }} aria-hidden="true" />
        {c.firstToken !== null && (
          <span className="architecture07-wait-budget-first" style={{ left: `${(c.firstToken / AXIS) * 100}%` }} aria-hidden="true" />
        )}
      </div>
      <div className="architecture07-wait-budget-ticks" aria-hidden="true">
        <span>0 s</span>
        <span style={{ left: `${(LIMIT / AXIS) * 100}%` }}>10 s limit</span>
      </div>
      <ul className="architecture07-wait-budget-legend">
        {c.segs.map((g, i) => (
          <li key={i}>
            <span className={`architecture07-wait-budget-dot ${g.kind}`} aria-hidden="true" />
            {g.label}: {fmt(g.s)}
          </li>
        ))}
      </ul>
      <p className="architecture07-wait-budget-sum">
        Total {fmt(total)}, {over ? `${fmt(total - LIMIT)} over the limit` : `${fmt(LIMIT - total)} under the limit`}.{" "}
        {c.firstToken === null ? "No first token: nothing streams." : `First token at ${fmt(c.firstToken)}.`}
      </p>
    </div>
  );
}

export default function Architecture07WaitBudget({ onComplete }: WidgetProps) {
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
      complete(`Answered ${firstTry} of ${CASES.length} wait-budget questions right on the first try`);
    }
  };

  return (
    <div className="w-panel architecture07-wait-budget">
      <p className="architecture07-wait-budget-note w-mono">
        Worked example. 2 s, 4 s and 3 s are course 3's. 380 ms is course 3's made-up p95. The 10 s limit is course 5's.
      </p>

      <div className="w-row between">
        <span className="w-label">{c.title}</span>
        <span className="architecture07-wait-budget-count">
          {index + 1} of {CASES.length}
        </span>
      </div>

      <p className="architecture07-wait-budget-setup">{c.setup}</p>

      <div className="architecture07-wait-budget-group" role="radiogroup" aria-label="Your answer">
        <span className="architecture07-wait-budget-q">{c.question}</span>
        <div className="architecture07-wait-budget-opts">
          {c.options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={pick === o.id}
              className={`architecture07-wait-budget-opt${pick === o.id ? " on" : ""}`}
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
            {index + 1 < CASES.length ? "Next case" : "Finish"}
          </button>
        )}
      </div>

      {attempts > 0 && !resolved && (
        <div className="w-verdict bad" role="status">
          Not quite. Work out which calls run one after another, and which of them a user can see.
        </div>
      )}

      {resolved && (
        <>
          <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
            <strong>{right ? "Correct. " : "Not quite. "}</strong>
            {code(c.explain)}
          </div>
          <Timeline c={c} />
        </>
      )}

      {finished && (
        <div className="w-verdict good" role="status">
          You answered {firstTry} of {CASES.length} right on the first try. Every figure here is a worked example. In your
          section 6, use the p95 from your own audit rows, and say where each number came from.
        </div>
      )}
    </div>
  );
}
