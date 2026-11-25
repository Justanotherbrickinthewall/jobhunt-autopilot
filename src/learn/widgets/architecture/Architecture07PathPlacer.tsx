import { useState } from "react";
import type { ReactNode } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Architecture07PathPlacer.css";

type PlaceId = "release" | "before" | "run" | "output" | "after";

type Place = { id: PlaceId; label: string };

const PLACES: Place[] = [
  { id: "release", label: "Before release, in CI" },
  { id: "before", label: "In the path, before the model" },
  { id: "run", label: "In the path, inside the run" },
  { id: "output", label: "In the path, on the answer" },
  { id: "after", label: "After the request, off the path" },
];

type Check = {
  id: string;
  name: string;
  hint: string;
  place: PlaceId;
  adds: string; // what it adds to the wait and to the spend, with the chapter the number came from
  why: string;
};

// Every number below comes from a chapter on main, and each line names it. Prices in course 5 are placeholders.
const CHECKS: Check[] = [
  {
    id: "gate",
    name: "The release gate, `askpep eval gate`",
    hint: "It plays five slices of fixed questions and exits with 1 when a slice fails.",
    place: "release",
    adds: "No user waits. A live run calls Gemini and Voyage and costs money. The attack slice plays offline and is free. (course 4)",
    why: "The gate runs in CI on every pull request, before a change ships. It asks one question: did this change break a case we already know about? A user never waits for it.",
  },
  {
    id: "injection",
    name: "The rule guard, `InjectionGuard`, on the question",
    hint: "It scans the question for phrases that try to give the model orders.",
    place: "before",
    adds: "Microseconds. No network call and no spend. (course 3)",
    why: "The question is the input stage. The guard runs before the model reads anything, and a block ends the request there.",
  },
  {
    id: "citation",
    name: "The Guardrails AI citation check",
    hint: "It looks for a marker such as [4] that points at a source the run never used.",
    place: "output",
    adds: "Milliseconds for the check, but it holds the stream. In course 3's example the first token arrives at about 6 seconds instead of 3. Each reask adds one more answer call, at most `OUTPUT_MAX_REASKS`, which is 1 by default. On `/ask` its tokens count in `cost_usd`. On the desk they don't yet. (course 3)",
    why: "The check needs the finished answer, so the tokens wait until it passes. That is the output stage.",
  },
  {
    id: "judge",
    name: "The online judge, `askpep eval online`",
    hint: "It scores a sample of stored traces with the grounded judge.",
    place: "after",
    adds: "Nobody waits. One judge call for each sampled trace that has sources, which is up to 1 request in 10 at the default rate of 0.1. Each verdict writes a trace on the route `eval.judge`, so `askpep cost` shows the spend on its own line. (course 5)",
    why: "The judge reads traces that already exist. It runs as a command over the `traces` table, so it can never delay an answer.",
  },
  {
    id: "approval",
    name: "The approval before `open_ticket`",
    hint: "The run pauses until a person approves, edits or rejects the ticket.",
    place: "run",
    adds: "As long as the person takes, up to `APPROVAL_TIMEOUT_SECONDS`, which is 3,600 by default. A paused run holds a checkpoint and no process. (course 3)",
    why: "The pause sits inside the run, at the tool call. The model has already chosen the action, and the check stands between that choice and its effect.",
  },
  {
    id: "kill",
    name: "The kill switch, `KILL_SWITCH=all`",
    hint: "The API middleware answers 503 on every route except `/health`.",
    place: "before",
    adds: "No lookup and no network. The service reads the setting once, at start, so a change needs a restart. (course 3)",
    why: "The middleware runs before any route, so it is the first check in the path. A switched-off request never reaches a model.",
  },
  {
    id: "armor",
    name: "Model Armor on the answer",
    hint: "It sends the finished answer to a Google Cloud service for screening.",
    place: "output",
    adds: "One network call. Budget about its p95. Course 3's made-up times give 380 milliseconds. Google bills the call, and no course gives the price. (course 3)",
    why: "It runs after the other output guards, on the answer that is about to leave. It is also the one output guard that waits on the network.",
  },
  {
    id: "calibration",
    name: "Judge calibration, `askpep eval calibrate`",
    hint: "It compares the judge's verdicts with the 24 labels you wrote.",
    place: "release",
    adds: "No user waits. 56 calls to Claude: 24 verdicts, then 16 and 16 for the two bias checks. (course 4)",
    why: "You run it when the judge's model, rubric or settings change. It tests the measuring tool, so it belongs before release.",
  },
  {
    id: "retrieved",
    name: "`InjectionGuard` on retrieved passages",
    hint: "It cuts the sentences that give orders. On the desk it also marks each passage as untrusted.",
    place: "run",
    adds: "Microseconds for each passage. No spend. (course 3)",
    why: "Passages arrive in the middle of a desk run, when a tool returns, and the desk's tool wrapper screens them. `/ask` has no wrapper, so `guarded_ask_stream` screens its passages after they are packed and before the model reads them.",
  },
  {
    id: "thumbs",
    name: "The thumbs button, `POST /feedback`",
    hint: "A user rates an answer they have already read.",
    place: "after",
    adds: "Nobody waits. One row in the `feedback` table, and the comment passes through `redact_pii`. (course 5)",
    why: "The user clicks after the answer arrives, so the request is over. The thumb finds its trace by the trace id.",
  },
];

const placeLabel = (id: PlaceId) => PLACES.find((p) => p.id === id)?.label ?? id;

// Turns `code` spans into <code> elements. The only markup the widget text uses.
function rich(text: string): ReactNode[] {
  return text.split("`").map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : part));
}

export default function Architecture07PathPlacer({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState<PlaceId | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const c = CHECKS[index];
  const right = pick === c.place;

  const check = () => {
    if (pick === null) return;
    const n = attempts + 1;
    setAttempts(n);
    if (pick === c.place || n >= 2) {
      setResolved(true);
      if (pick === c.place && n === 1) setFirstTry((k) => k + 1);
    }
  };

  const next = () => {
    if (index + 1 < CHECKS.length) {
      setIndex(index + 1);
      setPick(null);
      setAttempts(0);
      setResolved(false);
    } else {
      setFinished(true);
      complete(`Placed ${firstTry} of ${CHECKS.length} checks correctly on the first try`);
    }
  };

  return (
    <div className="w-panel architecture07-path-placer">
      <div className="w-row between">
        <span className="w-label">Where does it run?</span>
        <span className="architecture07-path-placer-count">
          {index + 1} of {CHECKS.length}
        </span>
      </div>

      <div className="architecture07-path-placer-card">
        <strong className="architecture07-path-placer-name">{rich(c.name)}</strong>
        <span className="architecture07-path-placer-hint">{rich(c.hint)}</span>
      </div>

      <div className="architecture07-path-placer-opts" role="radiogroup" aria-label="Where this check runs">
        {PLACES.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={pick === p.id}
            className={`architecture07-path-placer-opt${pick === p.id ? " on" : ""}`}
            disabled={resolved}
            onClick={() => setPick(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="w-row">
        {!resolved && (
          <button type="button" className="w-btn primary" disabled={pick === null} onClick={check}>
            Check my answer
          </button>
        )}
        {resolved && !finished && (
          <button type="button" className="w-btn ghost" onClick={next}>
            {index + 1 < CHECKS.length ? "Next check" : "See all ten"}
          </button>
        )}
      </div>

      {attempts > 0 && !resolved && (
        <div className="w-verdict bad" role="status">
          Not quite. Ask two questions. Does the user wait for it? And does it run before, during or after the model?
        </div>
      )}

      {resolved && (
        <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
          <strong>{right ? "Correct. " : `Not quite. It runs ${placeLabel(c.place).toLowerCase()}. `}</strong>
          {rich(c.why)}
        </div>
      )}

      {resolved && (
        <p className="architecture07-path-placer-adds">
          <span className="w-label">What it adds</span> {rich(c.adds)}
        </p>
      )}

      {finished && (
        <div className="architecture07-path-placer-summary">
          <div className="w-verdict good" role="status">
            You placed {firstTry} of {CHECKS.length} right on the first try. These ten lines are the start of section 6.
          </div>
          <ol className="architecture07-path-placer-list">
            {PLACES.map((p) => (
              <li key={p.id}>
                <span className="w-label">{p.label}</span>
                <ul>
                  {CHECKS.filter((k) => k.place === p.id).map((k) => (
                    <li key={k.id}>
                      <strong>{rich(k.name)}</strong> {rich(k.adds)}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
