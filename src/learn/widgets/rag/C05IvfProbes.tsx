import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import type { WidgetProps } from "../types";
import { clamp, useCompleteOnce } from "./c04-06-shared";
import { buildIvf, ivfSearch, nearestCell, IW, IH, NLIST, N, K } from "./c05-ivf-core";
import "./Ch05.css";

const COLOURS = ["var(--accent)", "var(--teal)", "var(--amber)", "var(--rose)", "var(--muted)", "var(--ink)"];
const PRESETS = [
  { name: "Inside a cell", x: 5, y: 15 },
  { name: "On a border", x: 25, y: 35 },
  { name: "Where three cells meet", x: 65, y: 35 },
];
const GRID = 2.5;

export default function C05IvfProbes({ onComplete }: WidgetProps) {
  const complete = useCompleteOnce(onComplete);
  const ix = useMemo(() => buildIvf(5), []);
  const [q, setQ] = useState({ x: PRESETS[1].x, y: PRESETS[1].y });
  const [nprobe, setNprobe] = useState(1);
  const [guess, setGuess] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const [drag, setDrag] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const bg = useMemo(() => {
    const out: { x: number; y: number; c: number }[] = [];
    for (let x = 0; x < IW; x += GRID) for (let y = 0; y < IH; y += GRID) {
      out.push({ x, y, c: nearestCell(ix.cents, { x: x + GRID / 2, y: y + GRID / 2 }) });
    }
    return out;
  }, [ix]);

  const r = ivfSearch(ix, q, nprobe);
  const minProbe = useMemo(() => {
    for (let n = 1; n <= NLIST; n++) if (ivfSearch(ix, q, n).hits === K) return n;
    return NLIST;
  }, [ix, q]);
  const atFirst = ivfSearch(ix, q, 1).hits;
  const bucket = (h: number) => (h >= 5 ? "all" : h >= 3 ? "mid" : "low");

  function svgPoint(e: PointerEvent) {
    const b = svgRef.current!.getBoundingClientRect();
    return { x: clamp(((e.clientX - b.left) / b.width) * IW, 1, IW - 1), y: clamp(((e.clientY - b.top) / b.height) * IH, 1, IH - 1) };
  }
  function onKey(e: KeyboardEvent) {
    const s = e.shiftKey ? 6 : 2;
    const d: Record<string, [number, number]> = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] };
    const v = d[e.key];
    if (!v) return;
    e.preventDefault();
    moveTo({ x: clamp(q.x + v[0], 1, IW - 1), y: clamp(q.y + v[1], 1, IH - 1) });
  }
  function moveTo(p: { x: number; y: number }) {
    setQ(p);
    setSolved(false);
  }
  function setProbe(n: number) {
    setNprobe(n);
    if (guess && !solved && ivfSearch(ix, q, n).hits === K && n === minProbe && minProbe > 1) {
      setSolved(true);
      complete(`Found full recall at nprobe ${n}, scanning ${ivfSearch(ix, q, n).scanned.length} of ${N} points.`);
    }
  }

  const guessRight = guess !== null && guess === bucket(atFirst);

  return (
    <div className="w-panel">
      <svg
        ref={svgRef}
        className="c05-ivf-probes-svg"
        viewBox={`0 0 ${IW} ${IH}`}
        role="group"
        aria-label="Points grouped into six cells. Click to move the query."
        onPointerMove={(e) => drag && moveTo(svgPoint(e))}
        onPointerUp={() => setDrag(false)}
        onPointerCancel={() => setDrag(false)}
        onPointerDown={(e) => {
          if ((e.target as Element).closest(".c05-ivf-probes-handle")) return;
          moveTo(svgPoint(e));
        }}
      >
        <g shapeRendering="crispEdges">
          {bg.map((b) => (
            <rect key={`${b.x}-${b.y}`} x={b.x} y={b.y} width={GRID} height={GRID} fill={COLOURS[b.c]}
              opacity={r.probed.has(b.c) ? 0.2 : 0.06} />
          ))}
        </g>
        {ix.pts.map((p) => {
          const c = ix.cell[p.id];
          const scanned = r.probed.has(c);
          const isTruth = r.truth.includes(p.id);
          const found = r.top.includes(p.id);
          return (
            <g key={p.id}>
              <circle cx={p.x} cy={p.y} r={1.25} fill={COLOURS[c]} opacity={scanned ? 1 : 0.4} />
              {isTruth && (
                <circle cx={p.x} cy={p.y} r={2.7} fill="none" stroke={found ? "var(--teal)" : "var(--rose)"} strokeWidth={0.7}
                  strokeDasharray={found ? undefined : "1 0.8"} />
              )}
            </g>
          );
        })}
        {ix.cents.map((c, i) => (
          <g key={i}>
            <rect x={c.x - 1.6} y={c.y - 1.6} width={3.2} height={3.2} fill="var(--surface)" stroke={COLOURS[i]} strokeWidth={0.7} />
          </g>
        ))}
        <g className="c05-ivf-probes-handle" tabIndex={0} role="slider" aria-label="Query point. Arrow keys move it."
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(q.x)} aria-valuetext={`x ${Math.round(q.x)}, y ${Math.round(q.y)}`}
          onKeyDown={onKey}
          onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); setDrag(true); e.stopPropagation(); }}>
          <circle className="c05-ivf-probes-qring" cx={q.x} cy={q.y} r={3.6} fill="none" stroke="var(--ink)" strokeWidth={0.4} />
          <path d={`M${q.x} ${q.y - 2.4} L${q.x + 2.4} ${q.y} L${q.x} ${q.y + 2.4} L${q.x - 2.4} ${q.y} Z`} fill="var(--ink)" />
        </g>
      </svg>
      <p className="c05-ivf-probes-note">
        Squares are cell centres, called centroids. Dots take their cell's colour. Teal rings are true top five that the
        search found. Dashed rose rings are true top five it missed.
      </p>

      <div className="w-row" style={{ flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {PRESETS.map((p) => (
          <button key={p.name} className="w-btn ghost" onClick={() => { moveTo({ x: p.x, y: p.y }); setNprobe(1); setGuess(null); }}>
            {p.name}
          </button>
        ))}
      </div>

      {guess === null ? (
        <>
          <p style={{ margin: "12px 0 4px", fontSize: "0.95rem" }}>
            <strong>Predict.</strong> The index probes only the nearest cell (nprobe 1). Of the true five nearest points,
            how many will it find?
          </p>
          <div className="c05-ivf-probes-opts" role="group" aria-label="Your prediction">
            <button className="w-btn" onClick={() => setGuess("all")}>All five</button>
            <button className="w-btn" onClick={() => setGuess("mid")}>Three or four</button>
            <button className="w-btn" onClick={() => setGuess("low")}>One or two</button>
          </div>
        </>
      ) : (
        <>
          <div className={`w-verdict ${guessRight ? "good" : "bad"}`} style={{ marginTop: 10 }}>
            {guessRight ? "Right. " : "Not quite. "}
            At nprobe 1 the search finds {atFirst} of 5 for this query. The missing neighbours sit just over a cell
            border, in a list the search never opens.
          </div>
          <p className="c05-ivf-probes-note">
            Task: raise nprobe to the smallest value that finds all five. Then try the other presets.
          </p>
        </>
      )}

      <div className="c05-ivf-probes-controls">
        <label>
          <span>nprobe</span>
          <input type="range" min={1} max={NLIST} value={nprobe} onChange={(e) => setProbe(Number(e.target.value))} aria-label="Cells to probe" />
          <b>{nprobe}</b>
        </label>
      </div>
      <div className="c05-ivf-probes-stats" aria-live="polite">
        <span>Found <b>{r.hits}</b> of <b>{K}</b> true neighbours</span>
        <span>Scanned <b>{r.scanned.length}</b> of <b>{N}</b> points ({Math.round((r.scanned.length / N) * 100)} percent)</span>
      </div>
      {guess && nprobe > minProbe && r.hits === K && (
        <p className="c05-ivf-probes-note">That works, but nprobe {minProbe} was enough. You are scanning more than you need to.</p>
      )}
      {solved && (
        <div className="w-verdict good">
          Full recall at nprobe {nprobe}, scanning {r.scanned.length} of {N} points. This is the whole IVF trade: every
          extra probe buys recall and costs latency. At nprobe {NLIST} you would scan everything, which is brute force
          plus overhead.
        </div>
      )}
    </div>
  );
}
