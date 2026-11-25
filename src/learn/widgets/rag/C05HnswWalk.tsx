import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { motion } from "motion/react";
import type { WidgetProps } from "../types";
import { clamp, useCompleteOnce } from "./c04-06-shared";
import { buildGraph, search, trueNearest, W, H, N_POINTS } from "./c05-hnsw-core";
import "./Ch05.css";

const PRESETS = [
  { name: "Easy", x: 80, y: 20 },
  { name: "Trap", x: 59, y: 29 },
  { name: "Near miss", x: 35, y: 35 },
  { name: "Corner", x: 15, y: 15 },
];
const EF_CHOICES = [1, 2, 4, 8];

export default function C05HnswWalk({ onComplete }: WidgetProps) {
  const complete = useCompleteOnce(onComplete);
  const g = useMemo(() => buildGraph(7), []);
  const [q, setQ] = useState({ x: PRESETS[1].x, y: PRESETS[1].y });
  const [ef, setEf] = useState(1);
  const [pred, setPred] = useState<"yes" | "no" | null>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sawMiss, setSawMiss] = useState(false);
  const [fix, setFix] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState(false);

  const result = useMemo(() => search(g, q, ef), [g, q, ef]);
  const truth = useMemo(() => trueNearest(g, q), [g, q]);
  const steps = result.steps;
  const done = idx >= steps.length;
  const hit = result.found === truth;
  const revealed = steps.slice(0, idx);
  const cur = revealed[revealed.length - 1];
  const layer = cur ? cur.layer : g.top;

  const seen = useMemo(() => {
    const s = new Set<number>();
    for (const st of revealed) {
      s.add(st.node);
      st.checked.forEach((c) => s.add(c));
    }
    return s;
  }, [revealed]);

  // Reset the run whenever the question changes.
  useEffect(() => {
    setIdx(0);
    setPlaying(false);
    setPred(null);
  }, [q.x, q.y, ef]);

  useEffect(() => {
    if (!playing) return;
    if (idx >= steps.length) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setIdx((i) => i + 1), 650);
    return () => clearTimeout(t);
  }, [playing, idx, steps.length]);

  useEffect(() => {
    if (done && idx > 0 && !hit) setSawMiss(true);
  }, [done, idx, hit]);

  function svgPoint(e: PointerEvent) {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: clamp(((e.clientX - r.left) / r.width) * W, 2, W - 2), y: clamp(((e.clientY - r.top) / r.height) * H, 2, H - 2) };
  }
  function onKey(e: KeyboardEvent) {
    const s = e.shiftKey ? 6 : 2;
    const d: Record<string, [number, number]> = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] };
    const v = d[e.key];
    if (!v) return;
    e.preventDefault();
    setQ((p) => ({ x: clamp(p.x + v[0], 2, W - 2), y: clamp(p.y + v[1], 2, H - 2) }));
  }

  const edges = useMemo(() => {
    const out: [number, number][] = [];
    g.layers[layer].forEach((nbs, a) => nbs.forEach((b) => a < b && out.push([a, b])));
    return out;
  }, [g, layer]);

  const hops = revealed.filter((s) => s.from !== null);

  function pickFix(id: string) {
    setFix(id);
    complete(id === "efSearch" ? "Raise efSearch: it widens the query-time beam without a rebuild." : `Chose ${id}; the query-time fix is efSearch.`);
  }

  return (
    <div className="w-panel">
      <div className="c05-hnsw-walk-layers" aria-label="Current layer">
        {[2, 1, 0].map((l) => (
          <span key={l} className="c05-hnsw-walk-layer" data-on={layer === l}>
            Layer {l}
          </span>
        ))}
        <span className="c05-hnsw-walk-layer" style={{ borderStyle: "dashed" }}>
          {layer > 0 ? "greedy, beam of 1" : `beam search, ef ${ef}`}
        </span>
      </div>

      <svg
        ref={svgRef}
        className="c05-hnsw-walk-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="group"
        aria-label="Graph of points. Click to move the query."
        onPointerMove={(e) => drag && setQ(svgPoint(e))}
        onPointerUp={() => setDrag(false)}
        onPointerCancel={() => setDrag(false)}
        onPointerDown={(e) => {
          if ((e.target as Element).closest(".c05-hnsw-walk-handle")) return;
          setQ(svgPoint(e));
        }}
      >
        {edges.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={g.points[a].x} y1={g.points[a].y} x2={g.points[b].x} y2={g.points[b].y}
            stroke="var(--muted)" strokeOpacity={layer === 0 ? 0.25 : 0.5} strokeWidth={layer === 0 ? 0.3 : 0.45} />
        ))}
        {hops.map((s, i) => (
          <motion.line key={`${i}-${s.from}-${s.node}`} x1={g.points[s.from!].x} y1={g.points[s.from!].y}
            x2={g.points[s.node].x} y2={g.points[s.node].y} stroke="var(--accent)" strokeWidth={0.9}
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4 }} />
        ))}
        {g.points.map((p) => {
          const inLayer = p.level >= layer;
          const isSeen = seen.has(p.id);
          const isCur = cur && cur.node === p.id;
          const r = p.level === 2 ? 2.4 : p.level === 1 ? 1.9 : 1.4;
          return (
            <g key={p.id}>
              <circle cx={p.x} cy={p.y} r={r} fill={isSeen ? "var(--amber)" : "var(--muted)"}
                opacity={inLayer ? 1 : 0.22} />
              {isCur && (
                <motion.circle cx={p.x} cy={p.y} r={r + 1.8} fill="none" stroke="var(--accent)" strokeWidth={0.7}
                  initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ transformOrigin: `${p.x}px ${p.y}px` }} />
              )}
              {done && p.id === truth && (
                <circle cx={p.x} cy={p.y} r={r + 3.2} fill="none" stroke="var(--teal)" strokeWidth={0.8} strokeDasharray="1.2 0.8" />
              )}
              {done && p.id === result.found && (
                <circle cx={p.x} cy={p.y} r={r + 1.2} fill="none" stroke={hit ? "var(--teal)" : "var(--rose)"} strokeWidth={0.9} />
              )}
            </g>
          );
        })}
        <g className="c05-hnsw-walk-handle" tabIndex={0} role="slider" aria-label="Query point. Arrow keys move it."
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(q.x)} aria-valuetext={`x ${Math.round(q.x)}, y ${Math.round(q.y)}`}
          onKeyDown={onKey}
          onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); setDrag(true); e.stopPropagation(); }}>
          <circle className="c05-hnsw-walk-qring" cx={q.x} cy={q.y} r={3.4} fill="none" stroke="var(--ink)" strokeWidth={0.4} />
          <path d={`M${q.x} ${q.y - 2.2} L${q.x + 2.2} ${q.y} L${q.x} ${q.y + 2.2} L${q.x - 2.2} ${q.y} Z`} fill="var(--ink)" />
        </g>
      </svg>

      <div className="c05-hnsw-walk-stats" aria-live="polite">
        <span>Step <b>{idx}</b> of <b>{steps.length}</b></span>
        <span>Distances computed <b>{done && idx > 0 ? result.computed : seen.size}</b> of <b>{N_POINTS}</b></span>
      </div>

      <p className="c05-hnsw-walk-note">Query position:</p>
      <div className="c05-hnsw-walk-opts" role="group" aria-label="Preset queries">
        {PRESETS.map((p) => (
          <button key={p.name} className={`w-btn ghost ${q.x === p.x && q.y === p.y ? "primary" : ""}`} onClick={() => setQ({ x: p.x, y: p.y })}>
            {p.name}
          </button>
        ))}
      </div>
      <p className="c05-hnsw-walk-note">Search width, called ef:</p>
      <div className="c05-hnsw-walk-opts" role="group" aria-label="ef search">
        {EF_CHOICES.map((v) => (
          <button key={v} className={`w-btn ${ef === v ? "primary" : "ghost"}`} aria-pressed={ef === v} onClick={() => setEf(v)}>
            ef {v}
          </button>
        ))}
      </div>

      {pred === null && (
        <>
          <p className="c05-hnsw-walk-q"><strong>Predict.</strong> With this query and ef {ef}, will the walk end on the true nearest point?</p>
          <div className="c05-hnsw-walk-opts">
            <button className="w-btn" onClick={() => setPred("yes")}>Yes, it finds it</button>
            <button className="w-btn" onClick={() => setPred("no")}>No, it gets stuck</button>
          </div>
        </>
      )}

      {pred !== null && (
        <div className="w-row" style={{ flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          <button className="w-btn primary" disabled={done} onClick={() => setIdx((i) => i + 1)}>Step</button>
          <button className="w-btn" disabled={done} onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "Play"}</button>
          <button className="w-btn ghost" onClick={() => { setIdx(0); setPlaying(false); }}>Restart</button>
          <button className="w-btn ghost" disabled={done} onClick={() => { setPlaying(false); setIdx(steps.length); }}>Skip to end</button>
        </div>
      )}

      {done && idx > 0 && pred !== null && (
        <div className={`w-verdict ${(pred === "yes") === hit ? "good" : "bad"}`} style={{ marginTop: 10 }}>
          {(pred === "yes") === hit ? "Right. " : "Not quite. "}
          {hit
            ? `The walk ended on the true nearest point after computing ${result.computed} distances instead of ${N_POINTS}.`
            : `The walk stopped on a point that is closer to the query than all its neighbours, but it is not the nearest point overall. That is a local minimum. Greedy search cannot see over the hill. Real HNSW has the same weakness; it is the reason search keeps a beam of ef candidates.`}
        </div>
      )}

      {done && idx > 0 && pred !== null && !sawMiss && (
        <p className="c05-hnsw-walk-note">Try the Trap preset at ef 1 to see a miss, then come back.</p>
      )}

      {sawMiss && (
        <>
          <p className="c05-hnsw-walk-q">
            <strong>Judge.</strong> Your index is built and live, and recall is too low. Which knob raises recall right
            now, without rebuilding?
          </p>
          <div className="c05-hnsw-walk-opts-col" role="group" aria-label="Which knob">
            {[
              { id: "M", t: "M, the number of links per point" },
              { id: "efConstruction", t: "efConstruction, the beam width used while building" },
              { id: "efSearch", t: "efSearch, the beam width used when querying" },
            ].map((o) => (
              <button key={o.id} className={`w-btn ${fix === o.id ? "primary" : ""}`} disabled={fix !== null} onClick={() => pickFix(o.id)}>
                {o.t}
              </button>
            ))}
          </div>
          {fix && (
            <div className={`w-verdict ${fix === "efSearch" ? "good" : "bad"}`}>
              {fix === "efSearch" ? "Right. " : "Not quite. "}
              M and efConstruction shape the graph, so changing them means rebuilding the index. efSearch is a
              query-time setting. Raise it for better recall and pay in latency. Set ef 4 on the Trap query to watch it
              recover.
            </div>
          )}
        </>
      )}
    </div>
  );
}
