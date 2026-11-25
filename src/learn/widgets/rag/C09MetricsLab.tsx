import { useEffect, useRef, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import "./C09MetricsLab.css";

const RELEVANT = ["PEP 612", "PEP 484"];
const START = ["PEP 526", "PEP 484", "PEP 695", "PEP 604", "PEP 612", "PEP 8", "PEP 257", "PEP 20"];
const KS = [1, 3, 5];

function metrics(order: string[], k: number) {
  const top = order.slice(0, k);
  const found = top.filter((d) => RELEVANT.includes(d)).length;
  const firstRel = order.findIndex((d) => RELEVANT.includes(d));
  let dcg = 0;
  top.forEach((d, i) => {
    if (RELEVANT.includes(d)) dcg += 1 / Math.log2(i + 2);
  });
  let ideal = 0;
  for (let i = 0; i < Math.min(RELEVANT.length, k); i++) ideal += 1 / Math.log2(i + 2);
  return {
    recall: found / RELEVANT.length,
    precision: found / k,
    mrr: firstRel === -1 ? 0 : 1 / (firstRel + 1),
    ndcg: ideal === 0 ? 0 : dcg / ideal,
  };
}

const PREDICT = [
  { label: "1.0", v: 1 },
  { label: "0.5", v: 0.5 },
  { label: "0.33", v: 1 / 3 },
  { label: "0.2", v: 0.2 },
];

export default function C09MetricsLab({ onComplete }: WidgetProps) {
  const [order, setOrder] = useState(START);
  const [k, setK] = useState(3);
  const [guess, setGuess] = useState<number | null>(null);
  const done = useRef(false);

  const m = metrics(order, k);
  const solved = guess !== null && metrics(order, 3).recall === 1 && Math.abs(metrics(order, 3).mrr - 0.5) < 1e-9;

  useEffect(() => {
    if (solved && !done.current) {
      done.current = true;
      onComplete?.("solved: recall@3 = 1 with MRR = 0.5");
    }
  }, [solved, onComplete]);

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  };

  const bars: [string, number][] = [
    [`recall@${k}`, m.recall],
    [`precision@${k}`, m.precision],
    ["MRR", m.mrr],
    [`nDCG@${k}`, m.ndcg],
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel c09-ml">
        <p className="c09-ml-q">
          Question: <strong>How do I type a decorator that keeps the wrapped function&rsquo;s parameters?</strong>
          <br />
          Relevant documents: PEP 612 and PEP 484. Everything else is wrong.
        </p>

        {guess === null ? (
          <div className="c09-ml-predict">
            <p>Before you touch anything: the list below is the retriever&rsquo;s output. What is the reciprocal rank for this question?</p>
            <ol className="c09-ml-list static">
              {order.map((d, i) => (
                <li key={d} className={RELEVANT.includes(d) ? "rel" : ""}>
                  <span className="c09-ml-rank">{i + 1}</span> {d}
                </li>
              ))}
            </ol>
            <div className="w-row">
              {PREDICT.map((p) => (
                <button key={p.label} type="button" className="w-btn" onClick={() => setGuess(p.v)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <p className={`w-verdict ${Math.abs(guess - 0.5) < 1e-9 ? "good" : "bad"}`} role="status">
              {Math.abs(guess - 0.5) < 1e-9
                ? "Right. The first relevant document is at rank 2, so the reciprocal rank is one over two."
                : "The first relevant document (PEP 484) is at rank 2, so the reciprocal rank is 0.5. MRR only looks at the first relevant document."}
            </p>
            <p className="c09-ml-task">
              Challenge: reorder the list so that <strong>recall@3 is 1.0</strong> while <strong>MRR stays exactly 0.5</strong>. Then push nDCG@5 as high as you can and watch which metric notices.
            </p>
            <div className="w-row" role="radiogroup" aria-label="Cut-off k">
              {KS.map((kk) => (
                <button key={kk} type="button" role="radio" aria-checked={k === kk} className={`w-chip c09-ml-k${k === kk ? " on" : ""}`} onClick={() => setK(kk)}>
                  k = {kk}
                </button>
              ))}
            </div>
            <ol className="c09-ml-list">
              {order.map((d, i) => (
                <motion.li layout transition={{ duration: 0.25 }} key={d} className={`${RELEVANT.includes(d) ? "rel " : ""}${i < k ? "in" : "out"}`}>
                  <span className="c09-ml-rank">{i + 1}</span>
                  <span className="c09-ml-doc">{d}</span>
                  <span className="c09-ml-btns">
                    <button type="button" className="w-btn ghost" aria-label={`Move ${d} up`} onClick={() => move(i, -1)} disabled={i === 0}>
                      Up
                    </button>
                    <button type="button" className="w-btn ghost" aria-label={`Move ${d} down`} onClick={() => move(i, 1)} disabled={i === order.length - 1}>
                      Down
                    </button>
                  </span>
                </motion.li>
              ))}
            </ol>
            <svg viewBox="0 0 320 120" className="c09-ml-svg" role="img" aria-label={bars.map(([l, v]) => `${l} ${v.toFixed(2)}`).join(", ")}>
              {bars.map(([label, v], i) => (
                <g key={label} transform={`translate(0 ${i * 28})`}>
                  <text x="0" y="14" fontSize="12" fill="var(--ink)">{label}</text>
                  <rect x="100" y="3" width="170" height="14" rx="7" fill="var(--surface-2)" />
                  <motion.rect x="100" y="3" height="14" rx="7" fill="var(--teal)" initial={false} animate={{ width: 170 * v }} />
                  <text x="276" y="14" fontSize="12" fill="var(--ink)">{v.toFixed(3)}</text>
                </g>
              ))}
            </svg>
            {solved && (
              <div className="w-verdict good" role="status">
                Solved. Recall@3 counts both documents inside the top three, wherever they sit. MRR only sees the first one. nDCG sees both and charges each one for how far down it is. Three metrics, three different questions.
              </div>
            )}
          </>
        )}
      </div>
    </MotionConfig>
  );
}
