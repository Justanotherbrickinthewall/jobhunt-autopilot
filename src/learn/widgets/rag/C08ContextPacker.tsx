import { useMemo, useRef, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import "./C08ContextPacker.css";

type Kind = "gold" | "useful" | "noise";
type Chunk = { id: string; rank: number; src: string; text: string; tokens: number; kind: Kind };

// Token counts are illustrative round numbers, not measurements.
const CHUNKS: Chunk[] = [
  { id: "c1", rank: 1, src: "PEP 8, wrapping long lines", text: "Prefer implied line continuation inside parentheses over backslashes.", tokens: 160, kind: "useful" },
  { id: "c2", rank: 2, src: "PEP 8, maximum line length", text: "Limit all lines to 79 characters. Docstrings and comments get 72.", tokens: 130, kind: "gold" },
  { id: "c3", rank: 3, src: "PEP 8, team agreements", text: "A team may agree on a longer limit, up to 99 characters, if they all do.", tokens: 140, kind: "useful" },
  { id: "c4", rank: 4, src: "PEP 8, indentation", text: "Use four spaces per indentation level.", tokens: 110, kind: "noise" },
  { id: "c5", rank: 5, src: "PEP 257, docstrings", text: "A docstring starts with a one-line summary, then a blank line.", tokens: 150, kind: "noise" },
  { id: "c6", rank: 6, src: "PEP 20, the Zen", text: "Readability counts. Simple is better than complex.", tokens: 180, kind: "noise" },
];

type Order = "rank" | "edges" | "reverse";
function arrange(items: Chunk[], order: Order): Chunk[] {
  const byRank = [...items].sort((a, b) => a.rank - b.rank);
  if (order === "rank") return byRank;
  if (order === "reverse") return byRank.reverse();
  const front: Chunk[] = [];
  const back: Chunk[] = [];
  byRank.forEach((c, i) => (i % 2 === 0 ? front : back).push(c));
  return [...front, ...back.reverse()];
}

const KIND_FILL: Record<Kind, string> = { gold: "var(--teal)", useful: "var(--accent)", noise: "var(--rose)" };

export default function C08ContextPacker({ onComplete }: WidgetProps) {
  const [budget, setBudget] = useState(450);
  const [sel, setSel] = useState<string[]>([]);
  const [order, setOrder] = useState<Order>("rank");
  const [checked, setChecked] = useState(false);
  const done = useRef(false);

  const chosen = useMemo(() => arrange(CHUNKS.filter((c) => sel.includes(c.id)), order), [sel, order]);
  const used = chosen.reduce((s, c) => s + c.tokens, 0);
  const over = used > budget;

  const toggle = (id: string) => {
    setChecked(false);
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };
  const autoPack = () => {
    setChecked(false);
    let total = 0;
    const ids: string[] = [];
    for (const c of CHUNKS) {
      if (total + c.tokens <= budget) {
        ids.push(c.id);
        total += c.tokens;
      }
    }
    setSel(ids);
  };

  const goldPos = chosen.findIndex((c) => c.kind === "gold");
  const noiseCount = chosen.filter((c) => c.kind === "noise").length;
  const tests = [
    { ok: !over, label: `Fits the budget (${used} of ${budget} tokens)` },
    { ok: goldPos !== -1, label: "Contains the chunk that states the 79 character limit" },
    { ok: goldPos !== -1 && (goldPos === 0 || goldPos === chosen.length - 1), label: "Puts that chunk at the start or the end of the context" },
    { ok: noiseCount <= 1, label: `At most one irrelevant chunk (you have ${noiseCount})` },
  ];
  const pass = tests.every((t) => t.ok);

  const check = () => {
    setChecked(true);
    if (!done.current) {
      done.current = true;
      onComplete?.(pass ? "packed well" : `${tests.filter((t) => t.ok).length} of 4 checks passed`);
    }
  };

  // Bar geometry
  const W = 600;
  const scale = W / Math.max(budget, used, 1);
  let x = 0;

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel c08-cp">
        <p className="c08-cp-q">
          Question: <strong>What does PEP 8 say about line length?</strong>
        </p>
        <label className="c08-cp-slider">
          <span>Token budget for sources: {budget}</span>
          <input type="range" min={250} max={800} step={50} value={budget} onChange={(e) => { setBudget(Number(e.target.value)); setChecked(false); }} />
        </label>

        <div className="c08-cp-chunks">
          {CHUNKS.map((c) => {
            const on = sel.includes(c.id);
            return (
              <button key={c.id} type="button" aria-pressed={on} onClick={() => toggle(c.id)} className={`c08-cp-chunk${on ? " on" : ""}${checked ? ` ${c.kind}` : ""}`}>
                <span className="c08-cp-meta">
                  Retrieval rank {c.rank} &middot; {c.tokens} tokens
                </span>
                <span className="c08-cp-src">{c.src}</span>
                <span className="c08-cp-text">{c.text}</span>
              </button>
            );
          })}
        </div>

        <div className="w-row" role="radiogroup" aria-label="Order in the prompt">
          {(["rank", "edges", "reverse"] as Order[]).map((o) => (
            <button key={o} type="button" role="radio" aria-checked={order === o} className={`w-chip c08-cp-order${order === o ? " on" : ""}`} onClick={() => { setOrder(o); setChecked(false); }}>
              {o === "rank" ? "Rank order" : o === "edges" ? "Edges order" : "Reverse rank"}
            </button>
          ))}
          <button type="button" className="w-btn ghost" onClick={autoPack}>
            Auto-pack by rank
          </button>
        </div>

        <svg viewBox={`0 0 ${W} 86`} className="c08-cp-svg" role="img" aria-label={`Context: ${used} of ${budget} budget tokens used`}>
          <path d={`M0 8 C ${W * 0.2} 8, ${W * 0.35} 30, ${W * 0.5} 32 C ${W * 0.65} 30, ${W * 0.8} 8, ${W} 8`} fill="none" stroke="var(--amber)" strokeWidth="2" />
          <text x="4" y="46" fontSize="10" fill="var(--muted)">Illustrative attention to position</text>
          <rect x="0" y="52" width={W} height="26" rx="6" fill="var(--surface-2)" />
          {chosen.map((c) => {
            const w = c.tokens * scale;
            const rx = x;
            x += w;
            return (
              <motion.g key={c.id} layout initial={false} animate={{ x: rx }} transition={{ duration: 0.3 }}>
                <rect x="0" y="52" width={Math.max(w - 2, 1)} height="26" rx="4" fill={checked ? KIND_FILL[c.kind] : "var(--accent)"} opacity={0.85} />
                <text x="6" y="69" fontSize="11" fill="var(--bg)">{`r${c.rank}`}</text>
              </motion.g>
            );
          })}
          <line x1={budget * scale} x2={budget * scale} y1="48" y2="82" stroke={over ? "var(--rose)" : "var(--ink)"} strokeWidth="2" />
        </svg>
        <p className="c08-cp-bar-note">{over ? `Over budget by ${used - budget} tokens. The red line is your limit.` : `${budget - used} tokens spare.`}</p>

        <div className="w-row">
          <button type="button" className="w-btn primary" onClick={check} disabled={sel.length === 0}>
            Check my context
          </button>
        </div>
        {checked && (
          <div className={`w-verdict ${pass ? "good" : "bad"}`} role="status">
            <ul className="c08-cp-tests">
              {tests.map((t) => (
                <li key={t.label}>{t.ok ? "Pass" : "Fail"}: {t.label}</li>
              ))}
            </ul>
            {pass
              ? "Good context. Fewer, better chunks beat a full window, and the answer chunk sits where the model reads best."
              : "Not yet. Aim for the answer chunk plus one or two useful neighbours, nothing that only looks similar."}
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
