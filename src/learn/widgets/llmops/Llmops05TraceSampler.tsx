import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Llmops05TraceSampler.css";

// Illustrative traces. The trace ids are made up and shown as their first eight digits. Each bucket is the real
// result of sample_traces for the full 32 digit id with an empty salt: sha256 of the id, the first eight hex
// digits as a number, divided by 0xFFFFFFFF, rounded to three places.
type TraceRow = { id: string; route: string; bucket: number | null };

// The same set as REQUEST_ROUTES in askpep/telemetry/records.py. load_rows keeps only these routes.
const REQUEST_ROUTES = new Set(["ask", "search", "agent", "cli.ask", "cli.search", "mcp.ask", "mcp.search"]);

const ROWS: TraceRow[] = [
  { id: "e2180e5c", route: "ask", bucket: 0.015 },
  { id: "d30d25da", route: "ask", bucket: 0.926 },
  { id: "8feecbd0", route: "eval", bucket: 0.39 },
  { id: "62e7739a", route: "agent", bucket: 0.428 },
  { id: "651a9471", route: "ask", bucket: 0.534 },
  { id: "", route: "ask", bucket: null },
  { id: "e71b5ee2", route: "ask", bucket: 0.242 },
  { id: "c83bfe21", route: "eval", bucket: 0.181 },
  { id: "5c18863f", route: "search", bucket: 0.785 },
  { id: "d436615d", route: "cli.ask", bucket: 0.447 },
  { id: "7c8a8bbc", route: "mcp.ask", bucket: 0.058 },
  { id: "dbec88b9", route: "ask", bucket: 0.672 },
];

// load_rows drops a route that is not a request. sample_traces then drops a row with no trace id, and keeps a
// row when the rate is 1 or its bucket is below the rate.
const loaded = (r: TraceRow) => REQUEST_ROUTES.has(r.route);
const chosen = (r: TraceRow, rate: number) => loaded(r) && r.bucket !== null && (rate >= 1 || r.bucket < rate);

const START_RATE = 0.25;

type Quiz = { id: string; question: string; options: string[]; answer: number; why: string };

const QUIZZES: Quiz[] = [
  {
    id: "raise",
    question:
      "At a rate of 0.25 the sampler keeps three traces. You raise the rate to 0.5 and keep the salt. What happens to those three?",
    options: [
      "All three stay, and the sampler adds more traces.",
      "The sampler draws again, so one of the three may drop out.",
      "About half of them drop out, to match the new rate.",
    ],
    answer: 0,
    why: "A bucket depends only on the trace id and the salt, so it never changes. A trace is in when its bucket is below the rate. Raising the rate can only add traces.",
  },
  {
    id: "count",
    question: "Now suppose the rate is 1. How many of these twelve rows does the sampler keep?",
    options: ["12", "10", "9", "7"],
    answer: 2,
    why: "A rate of 1 keeps every row that reaches the sampler. Two rows have route eval, so load_rows never returns them. One row has no trace id, so the sampler skips it. Twelve minus three is nine.",
  },
];

const W = 320;
const AXIS_X = 12;
const AXIS_W = W - 2 * AXIS_X;
const xOf = (bucket: number) => AXIS_X + AXIS_W * bucket;

export default function Llmops05TraceSampler({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<(number | null)[]>(QUIZZES.map(() => null));
  const [draft, setDraft] = useState<(number | null)[]>(QUIZZES.map(() => null));
  const [rate, setRate] = useState(START_RATE);

  const current = picks.findIndex((p) => p === null);
  const finished = current === -1;
  const kept = ROWS.filter((r) => chosen(r, rate)).length;
  const eligible = ROWS.filter(loaded).length;

  const check = (i: number) => {
    const pick = draft[i];
    if (pick === null) return;
    const next = picks.map((p, j) => (j === i ? pick : p));
    setPicks(next);
    if (next.every((p) => p !== null)) {
      const right = next.filter((p, j) => p === QUIZZES[j].answer).length;
      complete(`${right} of ${QUIZZES.length} sampler predictions right`);
    }
  };

  return (
    <div className="w-panel llmops05-trace-sampler">
      <p className="llmops05-trace-sampler-note">
        Illustrative traces. Each bucket is the real hash result for its full trace id. Rate {rate.toFixed(2)} keeps{" "}
        {kept} of {ROWS.length} rows.
      </p>

      <svg
        className="llmops05-trace-sampler-strip"
        viewBox={`0 0 ${W} 64`}
        role="img"
        aria-label={`Buckets of the loaded traces on a line from 0 to 1. The rate is ${rate.toFixed(2)}, and ${kept} of ${eligible} loaded traces fall below it.`}
      >
        <rect x={AXIS_X} y={28} width={AXIS_W * Math.min(rate, 1)} height={8} className="llmops05-trace-sampler-fill" />
        <line x1={AXIS_X} y1={32} x2={AXIS_X + AXIS_W} y2={32} className="llmops05-trace-sampler-axis" />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <text key={t} x={xOf(t)} y={58} textAnchor="middle" className="llmops05-trace-sampler-tick">
            {t}
          </text>
        ))}
        {ROWS.filter((r) => loaded(r) && r.bucket !== null).map((r) => (
          <circle
            key={r.id}
            cx={xOf(r.bucket as number)}
            cy={32}
            r={5}
            className={`llmops05-trace-sampler-dot${chosen(r, rate) ? " in" : ""}`}
          />
        ))}
        <line x1={xOf(rate)} y1={10} x2={xOf(rate)} y2={46} className="llmops05-trace-sampler-rate" />
      </svg>

      <div className="llmops05-trace-sampler-scroll">
        <table className="llmops05-trace-sampler-table">
          <thead>
            <tr>
              <th scope="col">Route</th>
              <th scope="col">Trace id</th>
              <th scope="col">Bucket</th>
              <th scope="col">In the sample</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => {
              const isLoaded = loaded(r);
              const isIn = chosen(r, rate);
              let state = "No";
              if (!isLoaded) state = "Never loaded";
              else if (r.bucket === null) state = "No trace id";
              else if (isIn) state = "Yes";
              return (
                <tr key={i} className={isIn ? "in" : ""}>
                  <td className="w-mono">{r.route}</td>
                  <td className="w-mono">{r.id ? `${r.id}…` : "none"}</td>
                  <td className="w-mono">{r.bucket === null ? "none" : r.bucket.toFixed(3)}</td>
                  <td>{state}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {QUIZZES.map((q, i) => {
        if (i > current && !finished) return null;
        const picked = picks[i];
        const done = picked !== null;
        return (
          <fieldset key={q.id} className="llmops05-trace-sampler-quiz" disabled={done}>
            <legend className="w-label">{done ? `Prediction ${i + 1}` : `Predict first, ${i + 1} of ${QUIZZES.length}`}</legend>
            <p className="llmops05-trace-sampler-q">{q.question}</p>
            <div className="llmops05-trace-sampler-opts" role="radiogroup" aria-label={`Prediction ${i + 1}`}>
              {q.options.map((o, oi) => {
                const on = (done ? picked : draft[i]) === oi;
                const right = done && oi === q.answer;
                return (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`llmops05-trace-sampler-opt${on ? " on" : ""}${right ? " right" : ""}`}
                    onClick={() => setDraft(draft.map((d, j) => (j === i ? oi : d)))}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
            {!done && (
              <div className="w-row">
                <button type="button" className="w-btn" disabled={draft[i] === null} onClick={() => check(i)}>
                  Check my prediction
                </button>
              </div>
            )}
            {done && (
              <p className={`llmops05-trace-sampler-why ${picked === q.answer ? "ok" : "miss"}`} role="status">
                <strong>{picked === q.answer ? "Correct. " : "Not quite. "}</strong>
                {q.why}
              </p>
            )}
          </fieldset>
        );
      })}

      {finished && (
        <>
          <label className="llmops05-trace-sampler-slider">
            <span className="w-label">Sample rate, {rate.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              aria-valuetext={`${rate.toFixed(2)}, ${kept} traces kept`}
            />
          </label>
          <div className="w-verdict good" role="status">
            Drag the slider and watch the sample only ever grow. The sampler keeps a trace when its bucket is below the
            rate. Rows the loader leaves out, and rows with no trace id, never get in at any rate.
          </div>
        </>
      )}
    </div>
  );
}
