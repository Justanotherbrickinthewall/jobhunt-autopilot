import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { motion } from "motion/react";
import type { WidgetProps } from "../types";
import { clamp, useCompleteOnce } from "./c04-06-shared";
import "./Ch04.css";

type Topic = "style" | "typing" | "syntax" | "concurrency" | "packaging";
type Snippet = { id: string; label: string; text: string; topic: Topic; x: number; y: number };

const TOPIC_COLOUR: Record<Topic, string> = {
  style: "var(--accent)",
  typing: "var(--teal)",
  syntax: "var(--rose)",
  concurrency: "var(--amber)",
  packaging: "var(--muted)",
};

// Hand-placed positions. A real model has 1000 or more dimensions; this is a cartoon
// of the idea that neighbours in the space are neighbours in meaning.
const SNIPPETS: Snippet[] = [
  { id: "p8a", label: "8", topic: "style", x: 14, y: 14, text: "PEP 8: keep code lines to 79 characters" },
  { id: "p8b", label: "8", topic: "style", x: 23, y: 9, text: "PEP 8: indent with four spaces per level" },
  { id: "p257", label: "257", topic: "style", x: 18, y: 25, text: "PEP 257: how to write docstrings" },
  { id: "p20", label: "20", topic: "style", x: 31, y: 20, text: "PEP 20: the Zen of Python, a list of guiding aphorisms" },
  { id: "p484", label: "484", topic: "typing", x: 62, y: 14, text: "PEP 484: the syntax and meaning of type hints" },
  { id: "p3107", label: "3107", topic: "typing", x: 71, y: 22, text: "PEP 3107: function annotations" },
  { id: "p585", label: "585", topic: "typing", x: 73, y: 9, text: "PEP 585: write list[int] instead of typing.List[int]" },
  { id: "p572a", label: "572", topic: "syntax", x: 51, y: 40, text: "PEP 572: assignment expressions and the := walrus operator" },
  { id: "p572b", label: "572", topic: "syntax", x: 62, y: 46, text: "PEP 572: the heated debate over the walrus operator" },
  { id: "p634", label: "634", topic: "syntax", x: 43, y: 51, text: "PEP 634: structural pattern matching with match and case" },
  { id: "p703a", label: "703", topic: "concurrency", x: 20, y: 52, text: "PEP 703: making the GIL optional with a free-threaded build" },
  { id: "p703b", label: "703", topic: "concurrency", x: 29, y: 60, text: "PEP 703: why the GIL stops threads using several cores" },
  { id: "p3156", label: "3156", topic: "concurrency", x: 12, y: 62, text: "PEP 3156: the asyncio event loop" },
  { id: "p440", label: "440", topic: "packaging", x: 82, y: 52, text: "PEP 440: how Python versions are written and compared" },
  { id: "p518", label: "518", topic: "packaging", x: 89, y: 61, text: "PEP 518: build requirements declared in pyproject.toml" },
  { id: "p621", label: "621", topic: "packaging", x: 77, y: 63, text: "PEP 621: project metadata in pyproject.toml" },
];

const PRESETS = [
  { q: "How do I make the GIL optional?", x: 24, y: 54 },
  { q: "What does PEP 8 say about line length?", x: 15, y: 17 },
  { q: "Why was the walrus operator controversial?", x: 60, y: 44 },
  { q: "How do I annotate a list of integers?", x: 67, y: 15 },
];

const W = 100;
const H = 72;
const K = 3;

function neighbours(q: { x: number; y: number }) {
  return SNIPPETS.map((s) => ({ s, d: Math.hypot(s.x - q.x, s.y - q.y) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, K);
}

export default function C04EmbeddingMap({ onComplete }: WidgetProps) {
  const complete = useCompleteOnce(onComplete);
  const [guess, setGuess] = useState<string | null>(null);
  const [q, setQ] = useState<{ x: number; y: number } | null>(null);
  const [label, setLabel] = useState("");
  const [dragging, setDragging] = useState(false);
  const [mixed, setMixed] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const nn = useMemo(() => (q ? neighbours(q) : []), [q]);
  const topics = new Set(nn.map((n) => n.s.topic));
  const correct = guess === "p572b";

  function finish(next: boolean, g: string | null) {
    if (next && g) {
      complete(`Predicted ${g === "p572b" ? "correctly" : "wrongly"}; found a spot where top 3 mixes topics.`);
    }
  }

  function move(next: { x: number; y: number }) {
    const nq = { x: clamp(next.x, 0, W), y: clamp(next.y, 0, H) };
    setQ(nq);
    setLabel("Dragged query");
    const ns = neighbours(nq);
    if (new Set(ns.map((n) => n.s.topic)).size >= 2 && guess) {
      setMixed(true);
      finish(true, guess);
    }
  }

  function toSvg(e: PointerEvent) {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }

  function onKey(e: KeyboardEvent) {
    if (!q) return;
    const step = e.shiftKey ? 6 : 2;
    const d: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
    };
    const v = d[e.key];
    if (!v) return;
    e.preventDefault();
    move({ x: q.x + v[0], y: q.y + v[1] });
  }

  function choose(id: string) {
    setGuess(id);
    setQ({ x: PRESETS[2].x, y: PRESETS[2].y });
    setLabel(PRESETS[2].q);
  }

  const options = ["p572a", "p572b", "p634"].map((id) => SNIPPETS.find((s) => s.id === id)!);

  return (
    <div className="w-panel">
      {!guess && (
        <>
          <p className="c04-embedding-map-q">
            Query: <strong>Why was the walrus operator controversial?</strong> Which snippet will the embedding model
            place closest to it?
          </p>
          <div className="c04-embedding-map-opts" role="group" aria-label="Pick the snippet you expect to be nearest">
            {options.map((o) => (
              <button key={o.id} className="w-btn" onClick={() => choose(o.id)}>
                {o.text}
              </button>
            ))}
          </div>
        </>
      )}

      <svg
        ref={svgRef}
        className="c04-embedding-map-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="group"
        aria-label="Two-dimensional map of PEP snippets by meaning"
        onPointerMove={(e) => dragging && move(toSvg(e))}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        {nn.map((n) => (
          <motion.line
            key={n.s.id}
            x1={q!.x}
            y1={q!.y}
            x2={n.s.x}
            y2={n.s.y}
            stroke="var(--teal)"
            strokeWidth={0.5}
            strokeDasharray="1.2 1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            transition={{ duration: 0.2 }}
          />
        ))}
        {SNIPPETS.map((s) => {
          const isNear = nn.some((n) => n.s.id === s.id);
          return (
            <g key={s.id}>
              <circle cx={s.x} cy={s.y} r={isNear ? 2.3 : 1.7} fill={TOPIC_COLOUR[s.topic]} opacity={q && !isNear ? 0.55 : 1} />
              <text x={s.x} y={s.y - 3} fontSize={2.7} textAnchor="middle" fill="var(--muted)">
                {s.label}
              </text>
            </g>
          );
        })}
        {q && (
          <motion.g
            className="c04-embedding-map-handle"
            tabIndex={0}
            role="slider"
            aria-label="Query point. Arrow keys move it, shift for bigger steps."
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(q.x)}
            aria-valuetext={`x ${Math.round(q.x)}, y ${Math.round(q.y)}`}
            onKeyDown={onKey}
            onPointerDown={(e: PointerEvent) => {
              (e.target as Element).setPointerCapture?.(e.pointerId);
              setDragging(true);
            }}
            initial={false}
            animate={{ x: q.x, y: q.y }}
            transition={dragging ? { duration: 0 } : { duration: 0.35, ease: "easeOut" }}
          >
            <circle className="c04-embedding-map-ring" r={4.6} fill="none" stroke="var(--ink)" strokeWidth={0.4} />
            <circle r={2.4} fill="var(--ink)" />
            <circle r={0.8} fill="var(--bg)" />
          </motion.g>
        )}
      </svg>

      <div className="c04-embedding-map-legend" aria-hidden="true">
        {(Object.keys(TOPIC_COLOUR) as Topic[]).map((t) => (
          <span key={t}>
            <i className="c04-embedding-map-swatch" style={{ background: TOPIC_COLOUR[t] }} />
            {t}
          </span>
        ))}
      </div>

      {q && (
        <>
          <p className="c04-embedding-map-note" aria-live="polite">
            <strong>{label}</strong>. Nearest three, straight-line distance:
          </p>
          <ol className="c04-embedding-map-list">
            {nn.map((n, i) => (
              <li key={n.s.id}>
                <span className="c04-embedding-map-rank">{i + 1}</span>
                <span>{n.s.text}</span>
                <span className="c04-embedding-map-dist">{n.d.toFixed(1)}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      {guess && (
        <>
          <div className={`w-verdict ${correct ? "good" : "bad"}`} style={{ marginTop: 10 }}>
            {correct
              ? "Right. The question is about the argument, so the debate snippet sits closest. The definition snippet is a close second."
              : "Not quite. The question asks why people argued, so the snippet about the debate lands closest. The definition snippet is second."}
          </div>
          <p className="c04-embedding-map-note">Now your turn. Pick a question or drag the query by hand.</p>
          <div className="w-row" style={{ flexWrap: "wrap", gap: 6 }}>
            {PRESETS.map((p) => (
              <button
                key={p.q}
                className="w-btn ghost"
                onClick={() => {
                  setQ({ x: p.x, y: p.y });
                  setLabel(p.q);
                }}
              >
                {p.q}
              </button>
            ))}
          </div>
          <p className="c04-embedding-map-note">
            Task: drag the query to a spot where the top three come from at least two different topics.
            {topics.size >= 2 || mixed ? "" : " Try the gap between two clusters."}
          </p>
          {(mixed || topics.size >= 2) && (
            <div className="w-verdict good">
              Found it. Top three now span {[...topics].join(" and ")}. A question that sits between topics pulls in
              neighbours from both. That is how a vague query retrieves a blend, and why a fixed top k can cut off the
              chunk you wanted.
            </div>
          )}
        </>
      )}
    </div>
  );
}
