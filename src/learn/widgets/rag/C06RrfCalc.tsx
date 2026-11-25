import { useMemo, useState } from "react";
import { motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useCompleteOnce } from "./c04-06-shared";
import "./Ch06.css";

const START_DENSE = ["A", "D", "C"];
const START_SPARSE = ["B", "E", "F", "G", "C"];

function move(list: string[], i: number, d: -1 | 1) {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export default function C06RrfCalc({ onComplete }: WidgetProps) {
  const complete = useCompleteOnce(onComplete);
  const [dense, setDense] = useState(START_DENSE);
  const [sparse, setSparse] = useState(START_SPARSE);
  const [k, setK] = useState(60);
  const [wd, setWd] = useState(1);
  const [ws, setWs] = useState(1);
  const [guess, setGuess] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);

  const fused = useMemo(() => {
    const m = new Map<string, { id: string; score: number; parts: string[] }>();
    const add = (list: string[], w: number, name: string) =>
      list.forEach((id, i) => {
        const e = m.get(id) ?? { id, score: 0, parts: [] };
        e.score += w / (k + i + 1);
        e.parts.push(w === 1 ? `1/${k + i + 1}` : `${w}/${k + i + 1}`);
        m.set(id, e);
        void name;
      });
    add(dense, wd, "dense");
    add(sparse, ws, "sparse");
    return [...m.values()].sort((a, b) => b.score - a.score);
  }, [dense, sparse, k, wd, ws]);

  const topScore = fused[0]?.score ?? 1;
  const winner = fused[0]?.id;
  const defaultAtStart = useMemo(() => "C", []);

  function check(nextK: number, nd = dense, ns = sparse) {
    // Task: make the lone #1 (A) overtake the consensus document (C) by lowering k.
    if (!guess || solved) return;
    const score = (id: string) => {
      let s = 0;
      nd.forEach((x, i) => x === id && (s += wd / (nextK + i + 1)));
      ns.forEach((x, i) => x === id && (s += ws / (nextK + i + 1)));
      return s;
    };
    if (score("A") > score("C") && nextK <= 5 && nd[0] === "A" && ns.includes("C") && !ns.includes("A")) {
      setSolved(true);
      complete(`Predicted ${guess}; found that the lone first place overtakes the consensus chunk only when k is tiny (${nextK}).`);
    }
  }

  const Column = ({ title, list, set, colour }: { title: string; list: string[]; set: (l: string[]) => void; colour: string }) => (
    <div className="c06-rrf-calc-list">
      <h4>{title}</h4>
      <ol>
        {list.map((id, i) => (
          <li key={id} className="c06-rrf-calc-item">
            <span className="c06-rrf-calc-rank">{i + 1}</span>
            <span className="c06-rrf-calc-name"><i className="c06-rrf-calc-tag" style={{ background: colour }} />Chunk {id}</span>
            <span className="c06-rrf-calc-move">
              <button aria-label={`Move Chunk ${id} up in ${title}`} disabled={i === 0} onClick={() => { const n = move(list, i, -1); set(n); }}>↑</button>
              <button aria-label={`Move Chunk ${id} down in ${title}`} disabled={i === list.length - 1} onClick={() => { const n = move(list, i, 1); set(n); }}>↓</button>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );

  return (
    <div className="w-panel">
      <div className="c06-rrf-calc-lists">
        <Column title="Dense ranking" list={dense} set={(l) => { setDense(l); check(k, l, sparse); }} colour="var(--accent)" />
        <Column title="Sparse (BM25) ranking" list={sparse} set={(l) => { setSparse(l); check(k, dense, l); }} colour="var(--teal)" />
      </div>
      <p className="c06-rrf-calc-note">
        Chunk A is first in dense and missing from sparse. Chunk C is third in dense and fifth in sparse. Scores from the
        two legs are not shown, because RRF never looks at them.
      </p>

      <div className="c06-rrf-calc-controls">
        <label>
          <span>k</span>
          <input type="range" min={0} max={100} value={k} onChange={(e) => { const v = Number(e.target.value); setK(v); check(v); }} aria-label="RRF constant k" />
          <b>{k}</b>
        </label>
        <label>
          <span>Dense weight</span>
          <input type="range" min={0} max={3} step={0.5} value={wd} onChange={(e) => setWd(Number(e.target.value))} aria-label="Dense weight" />
          <b>{wd}</b>
        </label>
        <label>
          <span>Sparse weight</span>
          <input type="range" min={0} max={3} step={0.5} value={ws} onChange={(e) => setWs(Number(e.target.value))} aria-label="Sparse weight" />
          <b>{ws}</b>
        </label>
      </div>

      <div className="c06-rrf-calc-fused" aria-live="polite" aria-label="Fused ranking">
        {fused.map((f, i) => (
          <div key={f.id} className="c06-rrf-calc-frow">
            <span className="c06-rrf-calc-rank">{i + 1}</span>
            <span>Chunk {f.id}</span>
            <div className="c06-rrf-calc-track">
              <motion.div className="c06-rrf-calc-fill" initial={false} animate={{ width: `${(f.score / topScore) * 100}%` }} transition={{ duration: 0.2 }}
                style={{ background: i === 0 ? "var(--teal)" : "var(--accent)" }} />
            </div>
            <span className="c06-rrf-calc-val">{f.score.toFixed(4)}</span>
          </div>
        ))}
      </div>
      {fused[0] && <p className="c06-rrf-calc-math">Chunk {fused[0].id} = {fused[0].parts.join(" + ")}</p>}

      {guess === null ? (
        <>
          <p style={{ margin: "12px 0 4px", fontSize: "0.95rem" }}>
            <strong>Predict.</strong> With k at 60 and equal weights, which chunk comes first after fusion?
          </p>
          <div className="c06-rrf-calc-opts" role="group" aria-label="Your prediction">
            <button className="w-btn" onClick={() => setGuess("A")}>Chunk A, because it is first in dense</button>
            <button className="w-btn" onClick={() => setGuess("B")}>Chunk B, because it is first in sparse</button>
            <button className="w-btn" onClick={() => setGuess("C")}>Chunk C, which both legs rank, though low</button>
          </div>
        </>
      ) : (
        <>
          <div className={`w-verdict ${guess === defaultAtStart ? "good" : "bad"}`}>
            {guess === defaultAtStart ? "Right. " : "Not quite. "}
            At k 60 a first-place chunk gets about 0.0164 from its list. Chunk C gets about 0.0159 for third place and
            0.0154 for fifth, about 0.0313 in all, so it scores nearly double. Agreement beats a single high rank. That is
            the whole idea.
          </div>
          {!solved ? (
            <p className="c06-rrf-calc-note">
              Task: lower k until Chunk A, the lone first place, overtakes Chunk C. Reorder the lists too, and watch what
              moves.
            </p>
          ) : (
            <div className="w-verdict good">
              Chunk A overtakes at k {k}. Small k makes the formula obsess over rank one: one over k plus one falls off a
              cliff after the top place. Large k flattens the curve so that agreement across lists decides. The value
              60 comes from the paper that introduced RRF and is a sensible default, not a law. Tune it only against a
              golden set.
            </div>
          )}
        </>
      )}
    </div>
  );
}
