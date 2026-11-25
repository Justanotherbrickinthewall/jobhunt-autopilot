import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useCompleteOnce } from "./c04-06-shared";
import "./C12HybridQuery.css";

const K = 60;
const QUERY = "maximum line length";

// Hand-set toy rankings for the running example. They show the mechanism, not a measurement.
const LABEL: Record<string, string> = {
  a: "PEP 8 > Indentation",
  b: "PEP 8 > Maximum Line Length",
  c: "PEP 8 > Maximum Line Length, part 2",
  d: "PEP 257 > Multi-line Docstrings",
  e: "PEP 723 > Reference Implementation",
  f: "PEP 636 > Matching Sequences",
};
const DENSE = ["a", "b", "c", "d", "e"];
const SPARSE = ["b", "c", "d", "f"];
// Invented relevance scores for the toy rerank stage.
const RERANK: [string, number][] = [
  ["b", 0.91],
  ["c", 0.46],
  ["d", 0.12],
];

const STAGES = ["Embed and search dense", "Search sparse", "Fuse with RRF", "Rerank the top few"];

type Fused = { id: string; score: number; parts: string[] };

function fuse(): Fused[] {
  const m = new Map<string, Fused>();
  for (const list of [DENSE, SPARSE]) {
    list.forEach((id, i) => {
      const e = m.get(id) ?? { id, score: 0, parts: [] };
      e.score += 1 / (K + i + 1);
      e.parts.push(`1/${K + i + 1}`);
      m.set(id, e);
    });
  }
  return [...m.values()].sort((x, y) => y.score - x.score);
}

export default function C12HybridQuery({ onComplete }: WidgetProps) {
  const complete = useCompleteOnce(onComplete);
  const [guess, setGuess] = useState<string | null>(null);
  const [stage, setStage] = useState(0); // number of stages already run
  const fused = useMemo(fuse, []);
  const winner = fused[0].id;

  function run() {
    const next = stage + 1;
    setStage(next);
    if (next === 3 && guess) {
      complete(`Predicted ${LABEL[guess]}; fusion ranked ${LABEL[winner]} first because it appears in both lists.`);
    }
  }

  const List = ({ title, ids, show }: { title: string; ids: string[]; show: boolean }) => (
    <div className="c12-hybrid-query-col">
      <h4>{title}</h4>
      <ol>
        <AnimatePresence>
          {show &&
            ids.map((id, i) => (
              <motion.li
                key={id}
                className="c12-hybrid-query-row"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i * 0.08 }}
              >
                <span className="c12-hybrid-query-rank">{i + 1}</span>
                <span className="c12-hybrid-query-name">{LABEL[id]}</span>
              </motion.li>
            ))}
        </AnimatePresence>
        {!show && <li className="c12-hybrid-query-empty">Not run yet.</li>}
      </ol>
    </div>
  );

  const top = fused[0].score;

  return (
    <div className="w-panel c12-hybrid-query">
      <p className="c12-hybrid-query-q">
        Query: <b>{QUERY}</b>, a search for the PEP 8 rule on line length. The rankings below are hand-set toy values, not measurements.
      </p>

      {guess === null ? (
        <>
          <p className="c12-hybrid-query-ask">
            <strong>Predict.</strong> Indentation is first in the dense list and absent from the sparse list. Maximum Line Length is second in dense and first in sparse. With k at {K}, which ranks first after fusion?
          </p>
          <div className="c12-hybrid-query-opts" role="group" aria-label="Your prediction">
            <button className="w-btn ghost small" onClick={() => setGuess("a")}>Indentation, first in dense</button>
            <button className="w-btn ghost small" onClick={() => setGuess("b")}>Maximum Line Length, in both lists</button>
            <button className="w-btn ghost small" onClick={() => setGuess("tie")}>A tie</button>
          </div>
        </>
      ) : (
        <>
          <div className="c12-hybrid-query-cols">
            <List title="Dense, by cosine distance" ids={DENSE} show={stage >= 1} />
            <List title="Sparse, by ts_rank_cd" ids={SPARSE} show={stage >= 2} />
          </div>

          {stage >= 3 && (
            <div className="c12-hybrid-query-fused" aria-label="Fused ranking" aria-live="polite">
              <h4>Fused: each list adds 1 over ({K} plus rank)</h4>
              <ol>
                {fused.map((f, i) => (
                  <motion.li key={f.id} layout transition={{ duration: 0.3 }} className="c12-hybrid-query-frow" data-first={i === 0}>
                    <span className="c12-hybrid-query-rank">{i + 1}</span>
                    <span className="c12-hybrid-query-name">{LABEL[f.id]}</span>
                    <span className="c12-hybrid-query-track">
                      <motion.i initial={{ width: 0 }} animate={{ width: `${(f.score / top) * 100}%` }} transition={{ duration: 0.4, delay: i * 0.05 }} />
                    </span>
                    <span className="c12-hybrid-query-math">{f.parts.join(" + ")} = {f.score.toFixed(4)}</span>
                  </motion.li>
                ))}
              </ol>
            </div>
          )}

          {stage >= 4 && (
            <div className="c12-hybrid-query-rerank">
              <h4>Reranked, with invented toy scores</h4>
              <ol>
                {RERANK.map(([id, s], i) => (
                  <motion.li key={id} className="c12-hybrid-query-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}>
                    <span className="c12-hybrid-query-rank">{i + 1}</span>
                    <span className="c12-hybrid-query-name">{LABEL[id]}</span>
                    <span className="c12-hybrid-query-math">{s.toFixed(2)}</span>
                  </motion.li>
                ))}
              </ol>
              <p className="c12-hybrid-query-note">
                The capstone sends 30 candidates to the reranker and keeps 6. If the best score is under 0.2, the answer step refuses.
              </p>
            </div>
          )}

          <div className="w-row" style={{ marginTop: 10 }}>
            {stage < 4 && (
              <button className="w-btn small" onClick={run}>
                Run: {STAGES[stage]}
              </button>
            )}
            {stage > 0 && (
              <button className="w-btn ghost small" onClick={() => setStage(0)}>
                Reset stages
              </button>
            )}
          </div>

          {stage >= 3 && (
            <div className={`w-verdict ${guess === winner ? "good" : "bad"}`}>
              {guess === winner ? "Right. " : "Not quite. "}
              Maximum Line Length scores 1/62 plus 1/61, about 0.0325. Indentation scores 1/61, about 0.0164. A chunk both lists
              agree on beats a chunk that only one list loves, and RRF reaches that using ranks alone. Neither list's raw scores were looked at.
            </div>
          )}
        </>
      )}
    </div>
  );
}
