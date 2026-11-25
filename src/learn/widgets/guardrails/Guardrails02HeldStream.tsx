import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Guardrails02HeldStream.css";

// The timings are the chapter's example, not measurements. Triage and tools take 2 seconds. The writer
// takes 4 seconds and its first token comes 1 second in. One reask call takes 3 seconds. The check itself
// takes milliseconds, so the widget counts it as zero.

const TOOLS = 2;
const WRITE = 4;
const FIRST_TOKEN_IN = 1;
const REASK_CALL = 3;
const OPTIONS = [3, 6, 9, 12];

type Run = {
  title: string;
  setup: string;
  held: boolean;
  reasks: number;
  outcome: string;
  why: string;
};

const RUNS: Run[] = [
  {
    title: "Run 1: no output guard",
    setup: "The chain has no guard on the output stage, so the desk streams tokens as the model writes them.",
    held: false,
    reasks: 0,
    outcome:
      "The first token reached the user at 3 seconds. Triage and tools took 2 seconds, and the writer's first token came 1 second later.",
    why: "Nothing waits for the full answer, so the user sees only the writer's own delay.",
  },
  {
    title: "Run 2: an output guard, and the answer passes",
    setup:
      "The chain covers the output stage, so the desk holds the tokens. The writer's answer cites only sources that exist.",
    held: true,
    reasks: 0,
    outcome:
      "The first token reached the user at 6 seconds. The writer finished at 6 seconds, the check took milliseconds, and one token event carried the whole answer.",
    why: "The check needs the full answer. Holding costs the writing time that streaming used to hide, which is 3 seconds here.",
  },
  {
    title: "Run 3: an output guard, and one reask that works",
    setup:
      "The first answer cites a source that doesn't exist. The guard asks the model again, and the new answer is clean.",
    held: true,
    reasks: 1,
    outcome: "The first token reached the user at 9 seconds. The reask call added 3 seconds to the 6.",
    why: "A reask is a whole model call that the user waits through. The desk can't send anything until the new answer passes.",
  },
  {
    title: "Run 4: an output guard, and two reasks that fail",
    setup:
      "The guard allows two reasks. The first answer fails, and so do both new answers. Then the fix value is applied.",
    held: true,
    reasks: 2,
    outcome:
      "The first token reached the user at 12 seconds. Two reask calls added 6 seconds, and then the fixed answer went out.",
    why: "Each try costs a model call. When the tries run out, the fix applies, so the user waited 6 extra seconds and still got a fixed answer.",
  },
];

function firstTokenAt(r: Run): number {
  return r.held ? TOOLS + WRITE + r.reasks * REASK_CALL : TOOLS + FIRST_TOKEN_IN;
}

const X0 = 10;
const PX = 22;
const sx = (s: number) => X0 + s * PX;

function Timeline({ run }: { run: Run }) {
  const t = firstTokenAt(run);
  const writeEnd = TOOLS + WRITE;
  const label = run.held
    ? `Timeline. Triage and tools run to 2 seconds. The writer runs to ${writeEnd} seconds.${run.reasks ? ` ${run.reasks} reask call${run.reasks > 1 ? "s" : ""} follow, 3 seconds each.` : ""} The user sees the first token at ${t} seconds.`
    : `Timeline. Triage and tools run to 2 seconds. The writer runs to ${writeEnd} seconds, and tokens reach the user from ${t} seconds.`;
  return (
    <svg viewBox="0 0 330 118" className="guardrails02-held-stream-chart" role="img" aria-label={label}>
      <text x={X0} y="11" className="guardrails02-held-stream-text">Desk work</text>
      <rect x={sx(0)} y="16" width={TOOLS * PX} height="20" rx="4" className="guardrails02-held-stream-bar tools" />
      <rect x={sx(TOOLS)} y="16" width={WRITE * PX} height="20" rx="4" className="guardrails02-held-stream-bar write" />
      {Array.from({ length: run.reasks }, (_, i) => (
        <rect
          key={i}
          x={sx(writeEnd + i * REASK_CALL)}
          y="16"
          width={REASK_CALL * PX}
          height="20"
          rx="4"
          className="guardrails02-held-stream-bar reask"
        />
      ))}
      <text x={sx(0) + 4} y="30" className="guardrails02-held-stream-text small">tools</text>
      <text x={sx(TOOLS) + 4} y="30" className="guardrails02-held-stream-text small">writing</text>
      {run.reasks > 0 && (
        <text x={sx(writeEnd) + 4} y="30" className="guardrails02-held-stream-text small">reask</text>
      )}

      <text x={X0} y="58" className="guardrails02-held-stream-text">What the user sees</text>
      <rect x={sx(0)} y="63" width={t * PX} height="20" rx="4" className="guardrails02-held-stream-bar wait" />
      <text x={sx(0) + 4} y="77" className="guardrails02-held-stream-text small">waiting</text>
      {run.held ? (
        <rect x={sx(t)} y="63" width={PX} height="20" rx="4" className="guardrails02-held-stream-bar shown" />
      ) : (
        <rect x={sx(t)} y="63" width={(writeEnd - t) * PX} height="20" rx="4" className="guardrails02-held-stream-bar shown" />
      )}
      <line x1={sx(t)} y1="40" x2={sx(t)} y2="90" className="guardrails02-held-stream-mark" />

      {[0, 3, 6, 9, 12].map((s) => (
        <g key={s}>
          <line x1={sx(s)} y1="92" x2={sx(s)} y2="96" className="guardrails02-held-stream-tick" />
          <text x={sx(s)} y="108" textAnchor="middle" className="guardrails02-held-stream-text small">{s}</text>
        </g>
      ))}
      <text x={sx(12) + 18} y="108" className="guardrails02-held-stream-text small">seconds</text>
    </svg>
  );
}

export default function Guardrails02HeldStream({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const run = RUNS[index];
  const answer = firstTokenAt(run);
  const right = pick === answer;

  const check = () => {
    if (pick === null) return;
    const n = attempts + 1;
    setAttempts(n);
    if (pick === answer || n >= 2) {
      setResolved(true);
      if (pick === answer && n === 1) setFirstTry((k) => k + 1);
    }
  };

  const next = () => {
    if (index + 1 < RUNS.length) {
      setIndex(index + 1);
      setPick(null);
      setAttempts(0);
      setResolved(false);
    } else {
      setFinished(true);
      complete(`Predicted ${firstTry} of ${RUNS.length} first-token times on the first try`);
    }
  };

  return (
    <div className="w-panel guardrails02-held-stream">
      <div className="w-row between">
        <span className="w-label">{run.title}</span>
        <span className="guardrails02-held-stream-count">
          {index + 1} of {RUNS.length}
        </span>
      </div>

      <p className="guardrails02-held-stream-setup">{run.setup}</p>

      <div className="guardrails02-held-stream-group" role="radiogroup" aria-label="Your prediction">
        <span className="w-label">Predict: when does the first token reach the user?</span>
        <div className="guardrails02-held-stream-opts">
          {OPTIONS.map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={pick === o}
              className={`guardrails02-held-stream-opt${pick === o ? " on" : ""}`}
              disabled={resolved}
              onClick={() => setPick(o)}
            >
              {o} seconds
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
            {index + 1 < RUNS.length ? "Next run" : "Finish"}
          </button>
        )}
      </div>

      {attempts > 0 && !resolved && (
        <div className="w-verdict bad" role="status">
          Not quite. Ask when the desk has the whole answer, and what it does before it sends the first token. Then pick again.
        </div>
      )}

      {resolved && (
        <>
          <Timeline run={run} />
          <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
            <strong>{right ? "Correct. " : "Not quite. "}</strong>
            {run.outcome} {run.why}
          </div>
        </>
      )}

      {finished && (
        <div className="w-verdict good" role="status">
          You predicted {firstTry} of {RUNS.length} times on the first try. The rule: holding adds the writing time, and each reask adds one model call. Keep the number of reasks low.
        </div>
      )}
    </div>
  );
}
