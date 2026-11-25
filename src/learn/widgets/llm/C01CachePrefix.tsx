import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C01CachePrefix.css";

// Illustrative figures: token counts and the cached-read price are hand-set.
type Part = { id: string; name: string; tokens: number; varies: boolean };
const START: Part[] = [
  { id: "date", name: "Today's date and time", tokens: 20, varies: true },
  { id: "rules", name: "System rules", tokens: 800, varies: false },
  { id: "schema", name: "Invoice schema", tokens: 400, varies: false },
  { id: "shots", name: "Worked examples", tokens: 1200, varies: false },
  { id: "invoice", name: "This invoice's text", tokens: 600, varies: true },
];
// CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
// Illustrative ratio from the chapter: a cache read costs 0.1 times the base input price, and a cache write 1.25 times.
const CACHED_PRICE = 0.1;

function cachedTokens(order: Part[]) {
  let n = 0;
  for (const p of order) {
    if (p.varies) break;
    n += p.tokens;
  }
  return n;
}

export default function C01CachePrefix({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [order, setOrder] = useState<Part[]>(START);
  const [guess, setGuess] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [checks, setChecks] = useState(0);

  const total = order.reduce((a, p) => a + p.tokens, 0);
  const cached = cachedTokens(order);
  const cost = (total - cached) + cached * CACHED_PRICE;
  const options = [0, 800, 2400];

  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  };
  const check = () => {
    setChecked(true);
    const n = checks + 1;
    setChecks(n);
    if (guess === cached) complete("predicted correctly");
    else if (n >= 2) complete("predicted wrongly twice, explanation shown");
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel llm-cache-prefix">
        <p className="w-label">Illustrative figures</p>
        <p>
          Request two arrives with a new date and a new invoice. With the order below, how many of the {total} tokens come from the cache?
        </p>
        <div className="w-row" role="radiogroup" aria-label="Your prediction">
          {options.map((n) => (
            <button key={n} type="button" role="radio" aria-checked={guess === n} className={`w-chip${guess === n ? " is-on" : ""}`} onClick={() => { setGuess(n); setChecked(false); }}>
              {n} tokens
            </button>
          ))}
          <button type="button" className="w-btn" disabled={guess === null} onClick={check}>
            Check
          </button>
        </div>
        <ol className="llm-cache-prefix-list">
          {order.map((p, i) => {
            const hit = i < order.findIndex((x) => x.varies) || (!order.some((x) => x.varies));
            return (
              <motion.li layout key={p.id} className={`llm-cache-prefix-part${hit ? " hit" : ""}${p.varies ? " varies" : ""}`}>
                <span className="llm-cache-prefix-name">{p.name}</span>
                <span className="w-mono">{p.tokens}</span>
                <span className="llm-cache-prefix-tag">{p.varies ? "changes" : "stable"}</span>
                <span className="w-row">
                  <button type="button" className="w-btn ghost small" aria-label={`Move ${p.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>Up</button>
                  <button type="button" className="w-btn ghost small" aria-label={`Move ${p.name} down`} disabled={i === order.length - 1} onClick={() => move(i, 1)}>Down</button>
                </span>
              </motion.li>
            );
          })}
        </ol>
        <p className="llm-cache-prefix-sum" aria-live="polite">
          Cached on request two: <strong>{cached}</strong> of {total} tokens. Cost units: <strong>{cost.toFixed(0)}</strong> instead of {total}.
        </p>
        {checked && (
          <div className={`w-verdict ${guess === cached ? "good" : "bad"}`} role="status">
            {guess === cached ? "Correct. " : `Not quite, the answer is ${cached}. `}
            A cache matches from the first token and stops at the first difference. The date comes first and changes, so nothing after it can match. Move the date and the invoice text below the stable parts and the cached share rises to 2400 tokens.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
