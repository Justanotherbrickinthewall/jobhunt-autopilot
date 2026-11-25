import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import type { WidgetProps } from "../types";
import { clamp, useCompleteOnce } from "./c04-06-shared";
import { buildDocs, filteredSearch, FW, FH, FN, FK } from "./c05-filter-core";
import type { Mode } from "./c05-filter-core";
import "./Ch05.css";

const MODES: { id: Mode; label: string }[] = [
  { id: "post", label: "Post-filter" },
  { id: "pre", label: "Pre-filter" },
  { id: "during", label: "Filter during search" },
];

export default function C05FilterTrap({ onComplete }: WidgetProps) {
  const complete = useCompleteOnce(onComplete);
  const docs = useMemo(() => buildDocs(9), []);
  const [q, setQ] = useState({ x: 30, y: 20 });
  const [sel, setSel] = useState(10);
  const [cand, setCand] = useState(10);
  const [mode, setMode] = useState<Mode>("post");
  const [guess, setGuess] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [solved, setSolved] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const s = sel / 100;
  const r = filteredSearch(docs, q, s, mode, cand);
  const matching = docs.filter((d) => d.u < s).length;
  const got = r.results.length;
  const visitedIds = new Set(r.visited.map((d) => d.id));
  const resultIds = new Set(r.results.map((d) => d.id));
  const actualBucket = (() => {
    const n = filteredSearch(docs, { x: 30, y: 20 }, 0.1, "post", 10).results.length;
    return n >= 5 ? "five" : n >= 2 ? "some" : "few";
  })();

  function svgPoint(e: PointerEvent) {
    const b = svgRef.current!.getBoundingClientRect();
    return { x: clamp(((e.clientX - b.left) / b.width) * FW, 1, FW - 1), y: clamp(((e.clientY - b.top) / b.height) * FH, 1, FH - 1) };
  }
  function onKey(e: KeyboardEvent) {
    const st = e.shiftKey ? 6 : 2;
    const d: Record<string, [number, number]> = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] };
    const v = d[e.key];
    if (!v) return;
    e.preventDefault();
    setQ((p) => ({ x: clamp(p.x + v[0], 1, FW - 1), y: clamp(p.y + v[1], 1, FH - 1) }));
  }

  function change(next: { sel?: number; cand?: number; mode?: Mode }) {
    const ns = next.sel ?? sel;
    const nc = next.cand ?? cand;
    const nm = next.mode ?? mode;
    if (next.sel !== undefined) setSel(ns);
    if (next.cand !== undefined) setCand(nc);
    if (next.mode !== undefined) setMode(nm);
    if (guess && !solved && nm === "post") {
      const n = filteredSearch(docs, q, ns / 100, "post", nc).results.length;
      if (n >= FK && nc > 10) {
        setSolved(true);
        complete(`Post-filtering needed ${nc} candidates at ${ns} percent selectivity to return ${FK} results.`);
      }
    }
  }

  const right = guess === actualBucket;

  return (
    <div className="w-panel">
      <svg
        ref={svgRef}
        className="c05-filter-trap-svg"
        viewBox={`0 0 ${FW} ${FH}`}
        role="group"
        aria-label="Documents on a plane. Filled dots match the metadata filter."
        onPointerMove={(e) => drag && setQ(svgPoint(e))}
        onPointerUp={() => setDrag(false)}
        onPointerCancel={() => setDrag(false)}
        onPointerDown={(e) => {
          if ((e.target as Element).closest(".c05-filter-trap-handle")) return;
          setQ(svgPoint(e));
        }}
      >
        {docs.map((d) => {
          const isMatch = d.u < s;
          const seen = visitedIds.has(d.id);
          const isRes = resultIds.has(d.id);
          return (
            <g key={d.id}>
              <circle cx={d.x} cy={d.y} r={isMatch ? 1.5 : 1.1} fill={isMatch ? "var(--accent)" : "none"}
                stroke={isMatch ? "none" : "var(--muted)"} strokeWidth={0.35} opacity={seen ? 1 : 0.35} />
              {seen && !isMatch && <circle cx={d.x} cy={d.y} r={2.3} fill="none" stroke="var(--amber)" strokeWidth={0.4} />}
              {isRes && <circle cx={d.x} cy={d.y} r={3} fill="none" stroke="var(--teal)" strokeWidth={0.8} />}
            </g>
          );
        })}
        <g className="c05-filter-trap-handle" tabIndex={0} role="slider" aria-label="Query point. Arrow keys move it."
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(q.x)} aria-valuetext={`x ${Math.round(q.x)}, y ${Math.round(q.y)}`}
          onKeyDown={onKey}
          onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); setDrag(true); e.stopPropagation(); }}>
          <circle className="c05-filter-trap-qring" cx={q.x} cy={q.y} r={3.6} fill="none" stroke="var(--ink)" strokeWidth={0.4} />
          <path d={`M${q.x} ${q.y - 2.4} L${q.x + 2.4} ${q.y} L${q.x} ${q.y + 2.4} L${q.x - 2.4} ${q.y} Z`} fill="var(--ink)" />
        </g>
      </svg>
      <p className="c05-filter-trap-note">
        Filled blue dots carry the tag you filter on (for example one tenant). Amber rings mark documents the search
        looked at. Teal rings are returned results. {matching} of {FN} documents match.
      </p>

      {guess === null ? (
        <>
          <p style={{ margin: "12px 0 4px", fontSize: "0.95rem" }}>
            <strong>Predict.</strong> Ten percent of documents match the filter. The index fetches its ten nearest
            candidates, then applies the filter. You asked for five results. How many come back?
          </p>
          <div className="c05-filter-trap-opts" role="group" aria-label="Your prediction">
            <button className="w-btn" onClick={() => setGuess("five")}>Five, the filter just cleans up</button>
            <button className="w-btn" onClick={() => setGuess("some")}>Two to four</button>
            <button className="w-btn" onClick={() => setGuess("few")}>None or one</button>
          </div>
        </>
      ) : (
        <div className={`w-verdict ${right ? "good" : "bad"}`} style={{ marginTop: 10 }}>
          {right ? "Right. " : "Not quite. "}
          Only about one in ten candidates survives, so ten candidates give about one result, and here none. The index
          did its job and the filter then threw the answer away. Task: raise the candidate pool until post-filtering
          returns five.
        </div>
      )}

      <div className="c05-filter-trap-modes" role="group" aria-label="Filter strategy">
        {MODES.map((m) => (
          <button key={m.id} className={`w-btn ${mode === m.id ? "primary" : "ghost"}`} aria-pressed={mode === m.id} onClick={() => change({ mode: m.id })}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="c05-filter-trap-controls">
        <label>
          <span>Matching share</span>
          <input type="range" min={2} max={50} value={sel} onChange={(e) => change({ sel: Number(e.target.value) })} aria-label="Percent of documents matching the filter" />
          <b>{sel}%</b>
        </label>
        <label>
          <span>Candidates fetched</span>
          <input type="range" min={5} max={FN} value={cand} disabled={mode !== "post"} onChange={(e) => change({ cand: Number(e.target.value) })} aria-label="Candidates fetched before filtering" />
          <b>{cand}</b>
        </label>
      </div>

      <div className="c05-filter-trap-results" aria-live="polite" aria-label={`${got} of ${FK} results`}>
        {Array.from({ length: FK }, (_, i) => (
          <span key={i} className="c05-filter-trap-slot" data-filled={i < got}>{i < got ? `#${i + 1}` : ""}</span>
        ))}
        <span className="c05-filter-trap-note" style={{ margin: 0, alignSelf: "center" }}>
          {got} of {FK} returned, {r.visited.length} documents examined
        </span>
      </div>

      {guess && mode === "pre" && (
        <p className="c05-filter-trap-note">
          Pre-filtering always returns {FK} here because the toy searches by brute force over the survivors. In a real
          graph index the survivors form a sparse, possibly disconnected graph, so the walk can stall. That is its own
          trap.
        </p>
      )}
      {guess && mode === "during" && (
        <p className="c05-filter-trap-note">
          Filtering during search keeps walking outward until it has {FK} matches. Results are full, and the cost grows
          as the filter gets more selective. Stores that do this usually switch to brute force over the matches when
          the filter is very selective.
        </p>
      )}
      {solved && (
        <div className="w-verdict good">
          Post-filtering needed {cand} candidates to fill {FK} slots at {sel} percent. The rule of thumb: candidates need
          to be about k divided by the matching share, so {FK} over {s.toFixed(2)} is {Math.round(FK / s)}. At one
          percent you would need five hundred, and the speed advantage of ANN is gone. Pick pre-filtering or a store
          that filters during the walk.
        </div>
      )}
    </div>
  );
}
