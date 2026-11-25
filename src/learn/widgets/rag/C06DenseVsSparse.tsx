import { useMemo, useState } from "react";
import { motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useCompleteOnce } from "./c04-06-shared";
import { PASSAGES, bm25, tokenize } from "./c06-data";
import "./Ch06.css";

type Winner = "dense" | "sparse" | "both" | "neither";

type Q = {
  id: string;
  text: string;
  gold: string;
  // Hand-set toy cosine scores. Anything not listed gets 0.25.
  dense: Record<string, number>;
  explain: string;
};

const QUERIES: Q[] = [
  {
    id: "q1",
    text: "PEP 572",
    gold: "p572a",
    dense: { p634: 0.58, p8a: 0.56, p572a: 0.55, p484: 0.54, p572b: 0.52, p20: 0.5, p257: 0.49, p621: 0.47, p518: 0.47, p440: 0.46, p703a: 0.45, p585: 0.44, p8b: 0.43, p703b: 0.3 },
    explain:
      "The term 572 appears in one chunk, so BM25 puts it first with a wide gap. A dense model sees 'PEP' plus a number and returns syntax-flavoured PEPs in a near tie. The toy scores here are hand-set to show that shape; a real model may do better or worse, and you cannot predict which.",
  },
  {
    id: "q2",
    text: "Why doesn't my multithreaded program scale across processors?",
    gold: "p703b",
    dense: { p703b: 0.74, p703a: 0.66, p8a: 0.38, p20: 0.35, p634: 0.3 },
    explain:
      "The right chunk never says 'multithreaded', 'program' or 'processors'. It says threads, bytecode and cores. BM25 finds no shared term, so it returns nothing useful. A dense model maps both onto the same idea. This is vocabulary mismatch, and it is why BM25 alone is not enough.",
  },
  {
    id: "q3",
    text: "line length",
    gold: "p8a",
    dense: { p8a: 0.81, p8b: 0.62, p257: 0.58, p20: 0.4 },
    explain:
      "The chunk uses the exact phrase, and the meaning is plain. Both searches get it right. Many questions look like this one, which is why hybrid search rarely hurts: when both agree, fusion keeps the answer on top.",
  },
  {
    id: "q4",
    text: "How do I make the GIL optional?",
    gold: "p703a",
    dense: { p703a: 0.86, p703b: 0.78, p634: 0.35, p484: 0.28 },
    explain:
      "Both put the right chunk first. Look at the sparse tail instead: PEP 440 ranks second on the single word 'how'. That word is common in English, but only one of these 14 chunks holds it, so IDF treats it as rare. Dense ranks the sibling chunk second, which is a much more useful neighbour. Same winner, different quality of runner-up.",
  },
];

const WINNERS: { id: Winner; label: string }[] = [
  { id: "dense", label: "Dense only" },
  { id: "sparse", label: "Sparse (BM25) only" },
  { id: "both", label: "Both" },
  { id: "neither", label: "Neither" },
];

export default function C06DenseVsSparse({ onComplete }: WidgetProps) {
  const complete = useCompleteOnce(onComplete);
  const [active, setActive] = useState(0);
  const [guesses, setGuesses] = useState<Record<string, Winner>>({});

  const q = QUERIES[active];
  const label = (id: string) => PASSAGES.find((p) => p.id === id)!.label;

  const rankings = useMemo(() => {
    return QUERIES.map((qq) => {
      const dense = PASSAGES.map((p) => ({ id: p.id, score: qq.dense[p.id] ?? 0.25 })).sort((a, b) => b.score - a.score);
      const sparse = bm25(PASSAGES, qq.text).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
      const dWin = dense[0].id === qq.gold;
      const sWin = sparse[0]?.id === qq.gold;
      const truth: Winner = dWin && sWin ? "both" : dWin ? "dense" : sWin ? "sparse" : "neither";
      return { dense, sparse, truth };
    });
  }, []);

  const cur = rankings[active];
  const guess = guesses[q.id];
  const answered = Object.keys(guesses).length;
  const score = QUERIES.filter((qq, i) => guesses[qq.id] === rankings[i].truth).length;

  function pick(w: Winner) {
    if (guess) return;
    const next = { ...guesses, [q.id]: w };
    setGuesses(next);
    if (Object.keys(next).length === QUERIES.length) {
      const s = QUERIES.filter((qq, i) => next[qq.id] === rankings[i].truth).length;
      complete(`Predicted the winner on ${s} of ${QUERIES.length} queries.`);
    }
  }

  const maxS = Math.max(...cur.sparse.map((r) => r.score), 1e-9);
  const maxD = Math.max(...cur.dense.map((r) => r.score));

  return (
    <div className="w-panel">
      <div className="c06-dense-vs-sparse-tabs" role="tablist" aria-label="Queries">
        {QUERIES.map((qq, i) => (
          <button key={qq.id} role="tab" aria-selected={active === i} className={`w-btn ${active === i ? "primary" : "ghost"}`} onClick={() => setActive(i)}>
            {guesses[qq.id] ? (guesses[qq.id] === rankings[i].truth ? "Right: " : "Missed: ") : ""}
            {qq.text.length > 24 ? `${qq.text.slice(0, 22)}...` : qq.text}
          </button>
        ))}
      </div>

      <p className="c06-dense-vs-sparse-q">
        <strong>{q.text}</strong>
      </p>
      <p className="c06-dense-vs-sparse-tok">BM25 terms: {tokenize(q.text).join(", ")}</p>
      <p className="c06-dense-vs-sparse-gold">
        The chunk that answers it: <strong>{label(q.gold)}</strong>
      </p>

      {!guess ? (
        <>
          <p style={{ margin: "10px 0 4px", fontSize: "0.95rem" }}>
            <strong>Predict.</strong> Which search puts that chunk at rank one?
          </p>
          <div className="c06-dense-vs-sparse-opts" role="group" aria-label="Your prediction">
            {WINNERS.map((w) => (
              <button key={w.id} className="w-btn" onClick={() => pick(w.id)}>{w.label}</button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="c06-dense-vs-sparse-cols">
            <div className="c06-dense-vs-sparse-col">
              <h4>Dense, toy scores (hand-set, not measured)</h4>
              <ol>
                {cur.dense.slice(0, 5).map((r, i) => (
                  <li key={r.id} className="c06-dense-vs-sparse-row" data-gold={r.id === q.gold}>
                    <motion.i className="c06-dense-vs-sparse-bar" initial={{ width: 0 }} animate={{ width: `${(r.score / maxD) * 100}%` }} transition={{ duration: 0.3 }} />
                    <span className="c06-dense-vs-sparse-rank">{i + 1}</span>
                    <span>{label(r.id)}</span>
                    <span className="c06-dense-vs-sparse-score">{r.score.toFixed(2)}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="c06-dense-vs-sparse-col">
              <h4>Sparse, live BM25 over these 14 chunks</h4>
              {cur.sparse.length === 0 ? (
                <div className="c06-dense-vs-sparse-empty">No chunk shares a term with this question. BM25 returns nothing.</div>
              ) : (
                <ol>
                  {cur.sparse.slice(0, 5).map((r, i) => (
                    <li key={r.id} className="c06-dense-vs-sparse-row" data-gold={r.id === q.gold}>
                      <motion.i className="c06-dense-vs-sparse-bar" initial={{ width: 0 }} animate={{ width: `${(r.score / maxS) * 100}%` }} transition={{ duration: 0.3 }} />
                      <span className="c06-dense-vs-sparse-rank">{i + 1}</span>
                      <span>{label(r.id)}</span>
                      <span className="c06-dense-vs-sparse-score">{r.score.toFixed(2)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
          <div className={`w-verdict ${guess === cur.truth ? "good" : "bad"}`} style={{ marginTop: 10 }}>
            {guess === cur.truth ? "Right. " : `Not quite: the answer was ${WINNERS.find((w) => w.id === cur.truth)!.label.toLowerCase()}. `}
            {q.explain}
          </div>
        </>
      )}

      <p className="c06-dense-vs-sparse-note">
        Answered {answered} of {QUERIES.length}. {answered === QUERIES.length ? `You called ${score} of ${QUERIES.length} correctly. The pattern: each search has a blind spot, and the blind spots barely overlap.` : "Work through all four."}
      </p>
    </div>
  );
}
