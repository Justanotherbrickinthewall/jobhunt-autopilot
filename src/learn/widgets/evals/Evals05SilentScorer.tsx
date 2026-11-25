import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Evals05SilentScorer.css";

// Illustrative figures, not from a real run. Items a01 to a10 have an answer, and a06 fails. Items a11 to a14
// have none. A buggy citations scorer crashes on those four, so Braintrust records no score for them.
type Row = { id: string; hasAnswer: boolean; scored: 0 | 1 | null; working: 0 | 1 };

const WORKING_WITHOUT_ANSWER: (0 | 1)[] = [1, 0, 1, 0];

const ROWS: Row[] = Array.from({ length: 14 }, (_, i): Row => {
  const id = `a${String(i + 1).padStart(2, "0")}`;
  if (i < 10) {
    const score: 0 | 1 = id === "a06" ? 0 : 1;
    return { id, hasAnswer: true, scored: score, working: score };
  }
  return { id, hasAnswer: false, scored: null, working: WORKING_WITHOUT_ANSWER[i - 10] };
});

const SCORED = ROWS.filter((r) => r.scored !== null);
const SHOWN = SCORED.reduce((sum, r) => sum + (r.scored ?? 0), 0) / SCORED.length;
const TRUE_MEAN = ROWS.reduce((sum, r) => sum + r.working, 0) / ROWS.length;
const AS_ZERO = ROWS.reduce((sum, r) => sum + (r.scored ?? 0), 0) / ROWS.length;
const CRASHED = ROWS.length - SCORED.length;

const fmt = (n: number) => n.toFixed(2);

type Guess = "zero" | "same" | "drop" | "stop";

const GUESSES: { id: Guess; text: string }[] = [
  { id: "zero", text: `${fmt(AS_ZERO)}. A crashed scorer counts as a zero.` },
  { id: "same", text: `${fmt(TRUE_MEAN)}. The crash changes nothing, so the mean matches a working scorer.` },
  { id: "drop", text: `${fmt(SHOWN)}. The crashed cases have no score, so they leave the mean.` },
  { id: "stop", text: "No mean. The run stops at the first crash." },
];

type View = "eval" | "run";

const W = 320;
const BAR_X = 8;
const BAR_W = 250;
const BARS = [
  { label: "The summary shows", value: SHOWN, cls: "shown" },
  { label: "A working scorer would give", value: TRUE_MEAN, cls: "truth" },
  { label: "If a crash counted as zero", value: AS_ZERO, cls: "zero" },
];

export default function Evals05SilentScorer({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [pick, setPick] = useState<Guess | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [checked, setChecked] = useState(false);
  const [view, setView] = useState<View>("eval");
  const done = checked && (pick === "drop" || attempt >= 2);

  const check = () => {
    const n = attempt + 1;
    setAttempt(n);
    setChecked(true);
    if (pick === "drop" || n >= 2) {
      complete(pick === "drop" ? `Saw that a crashed scorer drops out of the mean, on attempt ${n}` : "Did not predict the dropped cases");
    }
  };

  const retry = () => {
    setChecked(false);
    setPick(null);
  };

  return (
    <div className="w-panel evals05-silent-scorer">
      <fieldset className="evals05-silent-scorer-guess" disabled={checked}>
        <legend className="w-label">Predict first</legend>
        <p className="evals05-silent-scorer-q">
          The citations scorer divides by the number of expected PEPs, so it crashes on a11 to a14, which have no
          answer. Items a01 to a10 run fine. Nine of them score 1 and a06 scores 0. What mean does the summary
          show for citations?
        </p>
        <div className="evals05-silent-scorer-opts" role="radiogroup" aria-label="The mean the summary shows">
          {GUESSES.map((g) => (
            <button
              key={g.id}
              type="button"
              role="radio"
              aria-checked={pick === g.id}
              className={`evals05-silent-scorer-opt${pick === g.id ? " on" : ""}`}
              onClick={() => setPick(g.id)}
            >
              {g.text}
            </button>
          ))}
        </div>
        {!checked && (
          <div className="w-row">
            <button type="button" className="w-btn primary" disabled={!pick} onClick={check}>
              Check my prediction
            </button>
          </div>
        )}
      </fieldset>

      {checked && !done && (
        <div className="w-verdict bad" role="status">
          Not quite. Braintrust averages the cases that have a score. Work out which cases those are, then try once more.{" "}
          <button type="button" className="w-btn small" onClick={retry}>
            Try again
          </button>
        </div>
      )}

      {done && (
        <>
          <div className={`w-verdict ${pick === "drop" ? "good" : "bad"}`} role="status">
            {pick === "drop" ? "Right. " : "Not quite. "}
            The summary shows {fmt(SHOWN)}. Braintrust averages the cases that scored, and {CRASHED} cases have no
            score. So it counts 9 passes in 10 cases. A working scorer gives 11 in 14, which is {fmt(TRUE_MEAN)}.
            The crashed cases are the ones with no answer, which are the hard ones. They leave, and the mean rises.
          </div>

          <div className="evals05-silent-scorer-tablewrap">
            <table className="evals05-silent-scorer-table">
              <caption className="w-label">Illustrative scores for the citations scorer</caption>
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Has an answer</th>
                  <th scope="col">Buggy scorer</th>
                  <th scope="col">Working scorer</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.id} className={r.scored === null ? "crashed" : ""}>
                    <th scope="row" className="w-mono">
                      {r.id}
                    </th>
                    <td>{r.hasAnswer ? "yes" : "no"}</td>
                    <td className="w-mono">{r.scored === null ? "crashed" : r.scored}</td>
                    <td className="w-mono">{r.working}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <svg
            viewBox={`0 0 ${W} ${BARS.length * 40}`}
            className="evals05-silent-scorer-chart"
            role="img"
            aria-label={`Three means for citations. The summary shows ${fmt(SHOWN)}. A working scorer gives ${fmt(TRUE_MEAN)}. If a crash counted as zero it would be ${fmt(AS_ZERO)}.`}
          >
            {BARS.map((b, i) => (
              <g key={b.label} transform={`translate(0 ${i * 40})`}>
                <text x={BAR_X} y={13} className="evals05-silent-scorer-text">
                  {b.label}
                </text>
                <rect x={BAR_X} y={19} width={BAR_W} height={12} rx={3} className="evals05-silent-scorer-track" />
                <rect x={BAR_X} y={19} width={BAR_W * b.value} height={12} rx={3} className={`evals05-silent-scorer-bar ${b.cls}`} />
                <text x={BAR_X + BAR_W + 6} y={29} className="evals05-silent-scorer-text mono">
                  {fmt(b.value)}
                </text>
              </g>
            ))}
          </svg>

          <div className="w-row" role="group" aria-label="What each call shows">
            <span className="w-label">Where it shows up</span>
            <button
              type="button"
              className={`w-chip${view === "eval" ? " is-on" : ""}`}
              aria-pressed={view === "eval"}
              onClick={() => setView("eval")}
            >
              Eval alone
            </button>
            <button
              type="button"
              className={`w-chip${view === "run" ? " is-on" : ""}`}
              aria-pressed={view === "run"}
              onClick={() => setView("run")}
            >
              Through run_experiment
            </button>
          </div>

          {view === "eval" ? (
            <div className="w-inset evals05-silent-scorer-panel" aria-live="polite">
              <p>For case a11, Braintrust's Eval leaves a quiet trail.</p>
              <ul>
                <li>
                  <code>case.error</code> is <code>None</code>. The task ran fine.
                </li>
                <li>
                  <code>case.scores</code> is an empty dict, because no score came back.
                </li>
                <li>
                  <code>{'case.metadata["scorer_errors"]'}</code> holds an entry named <code>citations</code>, with the traceback.
                </li>
                <li>
                  stderr prints one line: Found exceptions for the following scorers: citations
                  [ZeroDivisionError('division by zero')].
                </li>
                <li>The summary still prints a clean 90.00 percent for citations.</li>
              </ul>
            </div>
          ) : (
            <div className="w-inset evals05-silent-scorer-panel" aria-live="polite">
              <p>run_experiment checks every case after Eval returns. For a11 it raises this.</p>
              <pre className="evals05-silent-scorer-pre">
                {`RuntimeError: case a11: the scorer citations failed: Traceback (most recent call last):
  ...
ZeroDivisionError: division by zero`}
              </pre>
              <p>No mean is printed. The bug stops the run, and you fix the scorer before you read any number.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
