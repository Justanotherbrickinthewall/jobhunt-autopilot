import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { useOnce } from "./c1012shared";
import "./C14TraceWaterfall.css";

// Stage names match the keys AskPEP writes into traces.timings. The numbers are illustrative.
const STAGES = ["embed", "dense", "sparse", "fuse", "rerank", "generate"] as const;
type Stage = (typeof STAGES)[number];

type Row = { id: string; label: string; query: string; timings: Record<Stage, number>; story: string };

const ROWS: Row[] = [
  {
    id: "healthy",
    label: "A healthy ask",
    query: "What does PEP 572 add to Python?",
    timings: { embed: 110, dense: 28, sparse: 13, fuse: 0.2, rerank: 180, generate: 1900 },
    story: "Generation dominates, as it should. Retrieval is a small part of the wait.",
  },
  {
    id: "rerank",
    label: "A slow ask",
    query: "How would making the GIL optional work?",
    timings: { embed: 120, dense: 31, sparse: 14, fuse: 0.2, rerank: 1250, generate: 1850 },
    story: "The rerank call took over a second. Check how many candidates you send it.",
  },
  {
    id: "dense",
    label: "A search that scans",
    query: "Which operators does the dict merge proposal add?",
    timings: { embed: 115, dense: 940, sparse: 15, fuse: 0.2, rerank: 175, generate: 1880 },
    story: "The dense query took 940 ms. That points at a missing or unused HNSW index.",
  },
];

const W = 600;
const ROW_H = 26;

export default function C14TraceWaterfall({ onComplete }: WidgetProps) {
  const reduce = useReducedMotion();
  const complete = useOnce(onComplete);
  const [rowId, setRowId] = useState("healthy");
  const [guess, setGuess] = useState<Stage | null>(null);
  const [parallel, setParallel] = useState(false);

  const row = ROWS.find((r) => r.id === rowId) ?? ROWS[0];

  const layout = useMemo(() => {
    let t = 0;
    const bars = STAGES.map((s) => {
      const ms = row.timings[s];
      // Sequential, as AskPEP runs them. With parallel on, sparse starts when dense starts.
      const start = parallel && s === "sparse" ? bars0(row, "dense") : t;
      if (!(parallel && s === "sparse")) t += ms;
      return { s, ms, start };
    });
    const sparseSaved = parallel ? Math.min(row.timings.dense, row.timings.sparse) : 0;
    const total = STAGES.reduce((a, s) => a + row.timings[s], 0) - sparseSaved;
    return { bars, total };
  }, [row, parallel]);

  const biggest = [...STAGES].sort((a, b) => row.timings[b] - row.timings[a])[0];
  const domain = Math.max(layout.total, 1);

  function pick(s: Stage) {
    if (guess) return;
    setGuess(s);
    complete(s === biggest ? "Found the slowest stage." : "Missed the slowest stage.");
  }

  function selectRow(id: string) {
    setRowId(id);
    setGuess(null);
    setParallel(false);
  }

  const json = `{"route": "ask", "latency_ms": ${Math.round(layout.total)}, "timings": {${STAGES.map((s) => `"${s}": ${row.timings[s]}`).join(", ")}}}`;

  return (
    <div className="w-panel c14tw-root">
      <p className="c14tw-lead">
        Each row below is a made-up <code>traces</code> row for this exercise. The stage names are the real ones. The milliseconds are not measured.
      </p>
      <div className="w-row c14tw-chips" role="group" aria-label="Choose a trace">
        {ROWS.map((r) => (
          <button key={r.id} type="button" className={"w-chip c14tw-chip" + (rowId === r.id ? " is-on" : "")} aria-pressed={rowId === r.id} onClick={() => selectRow(r.id)}>
            {r.label}
          </button>
        ))}
      </div>
      <p className="c14tw-query">Query: {row.query}</p>
      <pre className="c14tw-json">{json}</pre>

      <fieldset className="c14tw-guess">
        <legend>Which stage is the slowest?</legend>
        <div className="w-row c14tw-chips">
          {STAGES.map((s) => (
            <button key={s} type="button" className={"w-chip c14tw-chip" + (guess === s ? " is-on" : "")} aria-pressed={guess === s} disabled={guess !== null} onClick={() => pick(s)}>
              {s}
            </button>
          ))}
        </div>
      </fieldset>

      {guess && (
        <>
          <svg viewBox={`0 0 ${W} ${STAGES.length * ROW_H + 24}`} className="c14tw-svg" role="img" aria-label={`Waterfall of ${STAGES.length} stages, total ${Math.round(layout.total)} milliseconds`}>
            {layout.bars.map((b, i) => {
              const x = 74 + (b.start / domain) * (W - 80);
              const w = Math.max((b.ms / domain) * (W - 80), 2);
              const isBig = b.s === biggest;
              return (
                <g key={b.s}>
                  <text x="0" y={i * ROW_H + 17} className="c14tw-lbl">
                    {b.s}
                  </text>
                  <motion.rect
                    y={i * ROW_H + 4}
                    height={ROW_H - 8}
                    rx="4"
                    className={isBig ? "c14tw-bar big" : "c14tw-bar"}
                    initial={reduce ? false : { x: 74, width: 0 }}
                    animate={{ x, width: w }}
                    transition={reduce ? { duration: 0 } : { duration: 0.28, ease: "easeOut", delay: i * 0.05 }}
                  />
                  <text x={Math.min(x + w + 6, W - 54)} y={i * ROW_H + 17} className="c14tw-ms">
                    {b.ms} ms
                  </text>
                </g>
              );
            })}
            <text x={W} y={STAGES.length * ROW_H + 18} textAnchor="end" className="c14tw-total">
              total {Math.round(layout.total)} ms
            </text>
          </svg>

          <label className="c14tw-toggle">
            <input type="checkbox" checked={parallel} onChange={(e) => setParallel(e.target.checked)} /> run dense and sparse search in parallel
          </label>

          <p className={"w-verdict " + (guess === biggest ? "good" : "bad")} role="status">
            {guess === biggest ? "Right. " : `Not quite. The slowest stage is ${biggest}. `}
            {row.story}{" "}
            {parallel
              ? `Running the two searches together saves ${Math.round(Math.min(row.timings.dense, row.timings.sparse))} ms here, which barely moves the total.`
              : "Try the parallel toggle and see how little it saves."}
          </p>
        </>
      )}
    </div>
  );
}

function bars0(row: Row, upTo: Stage): number {
  let t = 0;
  for (const s of STAGES) {
    if (s === upTo) return t;
    t += row.timings[s];
  }
  return t;
}
