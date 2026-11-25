import { useRef, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import "./C07RerankBeforeAfter.css";

type Cand = { id: string; src: string; text: string; bi: number; cross: number };

// Scores are illustrative, hand-authored for teaching. They are not measured from any model.
const CANDS: Cand[] = [
  { id: "A", src: "PEP 572", text: "Describes assignment expressions, written with := , which bind a name inside a larger expression.", bi: 0.79, cross: 0.71 },
  { id: "B", src: "PEP 8", text: "Surround binary operators such as assignment and comparison with a single space on either side.", bi: 0.81, cross: 0.09 },
  { id: "C", src: "PEP 572", text: "Critics argued that := adds a second way to assign and can make code harder to read. The PEP answers with examples where it reads better.", bi: 0.7, cross: 0.93 },
  { id: "D", src: "PEP 20", text: "Readability counts. There should be one obvious way to do it.", bi: 0.74, cross: 0.21 },
  { id: "E", src: "PEP 572", text: "A bare unparenthesised assignment expression is not allowed as a statement. Use parentheses or a normal assignment.", bi: 0.66, cross: 0.55 },
  { id: "F", src: "PEP 634", text: "The match statement compares a subject against patterns and binds names when a pattern matches.", bi: 0.52, cross: 0.04 },
  { id: "G", src: "PEP 1", text: "A PEP author must build consensus and record dissenting opinions.", bi: 0.72, cross: 0.38 },
  { id: "H", src: "PEP 572", text: "Example: if (n := len(a)) > 10 then print how long the list is.", bi: 0.77, cross: 0.33 },
];
const biOrder = [...CANDS].sort((a, b) => b.bi - a.bi);
const crossOrder = [...CANDS].sort((a, b) => b.cross - a.cross);

export default function C07RerankBeforeAfter({ onComplete }: WidgetProps) {
  const [picked, setPicked] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const done = useRef(false);

  const list = revealed ? crossOrder : biOrder;
  const actualTop = crossOrder.slice(0, 3).map((c) => c.id);
  const hits = picked.filter((id) => actualTop.includes(id)).length;

  const toggle = (id: string) => {
    if (revealed) return;
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 3 ? [...p, id] : p));
  };
  const reveal = () => {
    setRevealed(true);
    if (!done.current) {
      done.current = true;
      onComplete?.(`${hits} of 3 correct`);
    }
  };
  const reset = () => {
    setRevealed(false);
    setPicked([]);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel c07-rba">
        <p className="c07-rba-q">
          Query: <strong>Why was the walrus operator controversial?</strong>
        </p>
        <p className="c07-rba-note">
          {revealed ? "Order after the cross-encoder." : "Order from the bi-encoder. Pick the three chunks you think a cross-encoder will rank highest."}
        </p>
        <ol className="c07-rba-list">
          {list.map((c, i) => {
            const before = biOrder.findIndex((x) => x.id === c.id);
            const move = before - i;
            const isPick = picked.includes(c.id);
            const isTop = revealed && i < 3;
            return (
              <motion.li layout transition={{ duration: 0.45, ease: "easeOut" }} key={c.id} className={`c07-rba-item${isTop ? " top" : ""}`}>
                <button
                  type="button"
                  className={`c07-rba-btn${isPick ? " picked" : ""}`}
                  aria-pressed={isPick}
                  disabled={revealed}
                  onClick={() => toggle(c.id)}
                >
                  <span className="c07-rba-rank">{i + 1}</span>
                  <span className="c07-rba-body">
                    <span className="c07-rba-src">{c.src}</span>
                    <span className="c07-rba-text">{c.text}</span>
                  </span>
                  <span className="c07-rba-score">
                    <svg viewBox="0 0 60 8" width="60" height="8" aria-hidden="true">
                      <rect width="60" height="8" rx="4" fill="var(--surface-2)" />
                      <motion.rect height="8" rx="4" fill={revealed ? "var(--teal)" : "var(--accent)"} initial={false} animate={{ width: 60 * (revealed ? c.cross : c.bi) }} />
                    </svg>
                    <span>{(revealed ? c.cross : c.bi).toFixed(2)}</span>
                    {revealed && move !== 0 && <span className={move > 0 ? "c07-rba-up" : "c07-rba-down"}>{move > 0 ? `up ${move}` : `down ${-move}`}</span>}
                  </span>
                </button>
              </motion.li>
            );
          })}
        </ol>
        <div className="w-row">
          {!revealed ? (
            <button type="button" className="w-btn primary" disabled={picked.length !== 3} onClick={reveal}>
              Rerank ({picked.length} of 3 picked)
            </button>
          ) : (
            <button type="button" className="w-btn ghost" onClick={reset}>
              Try again
            </button>
          )}
        </div>
        {revealed && (
          <div className={`w-verdict ${hits >= 2 ? "good" : "bad"}`} role="status">
            You got {hits} of 3. The cross-encoder read the query and each chunk together, so the chunk about critics jumped to the top. The bi-encoder ranked the PEP 8 chunk first because it is about operators and assignment, which sit near the walrus operator in meaning. Scores here are illustrative and are not comparable across the two models.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
