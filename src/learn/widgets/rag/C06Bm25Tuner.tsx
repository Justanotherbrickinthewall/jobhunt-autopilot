import { useMemo, useState } from "react";
import { motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useCompleteOnce } from "./c04-06-shared";
import "./Ch06.css";

const DOCS = [
  { n: "A", len: 20, tf: 1, desc: "short note, mentions GIL once" },
  { n: "B", len: 100, tf: 3, desc: "medium section, three mentions" },
  { n: "C", len: 400, tf: 8, desc: "long rambling chunk, eight mentions" },
  { n: "D", len: 30, tf: 2, desc: "short paragraph, two mentions" },
  { n: "E", len: 400, tf: 1, desc: "long chunk, one passing mention" },
];
const AVG = 150;
const IDF = Math.log(1 + (1000 - 50 + 0.5) / (50 + 0.5)); // 1000 docs, 50 contain the term

const factor = (tf: number, k1: number, b: number, len: number) => (tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * len) / AVG));

export default function C06Bm25Tuner({ onComplete }: WidgetProps) {
  const complete = useCompleteOnce(onComplete);
  const [k1, setK1] = useState(1.2);
  const [b, setB] = useState(0.75);
  const [g1, setG1] = useState<string | null>(null);
  const [g2, setG2] = useState<string | null>(null);

  const ranked = useMemo(
    () => DOCS.map((d) => ({ ...d, score: IDF * factor(d.tf, k1, b, d.len) })).sort((a, b2) => b2.score - a.score),
    [k1, b],
  );
  const top = Math.max(...ranked.map((r) => r.score), 1e-9);

  function pick1(id: string) {
    setG1(id);
    setB(0);
  }
  function pick2(id: string) {
    setG2(id);
    setK1(0);
    complete(`Length normalisation: predicted ${g1}, answer C. Saturation at k1 zero: ${id === "tie" ? "correct" : "missed"}.`);
  }

  // Chart geometry.
  const CW = 220;
  const CH = 130;
  const xMax = 12;
  const yMax = 4;
  const px = (t: number) => 28 + (t / xMax) * (CW - 40);
  const py = (v: number) => CH - 22 - (Math.min(v, yMax) / yMax) * (CH - 36);
  const curve = Array.from({ length: 49 }, (_, i) => {
    const t = (i / 48) * xMax;
    return `${i === 0 ? "M" : "L"}${px(t).toFixed(1)} ${py(factor(t, k1, b, AVG)).toFixed(1)}`;
  }).join(" ");

  return (
    <div className="w-panel">
      <p style={{ margin: "0 0 8px", fontSize: "0.9rem" }}>
        Query: <strong>GIL</strong>. Five chunks contain it. The score is the term's inverse document frequency times a saturating
        function of how often it appears.
      </p>
      <div className="c06-bm25-tuner-grid">
        <div>
          <svg className="c06-bm25-tuner-svg" viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label="Curve of term frequency contribution, flattening as frequency rises">
            <line x1={28} y1={CH - 22} x2={CW - 10} y2={CH - 22} stroke="var(--muted)" strokeWidth={0.6} />
            <line x1={28} y1={10} x2={28} y2={CH - 22} stroke="var(--muted)" strokeWidth={0.6} />
            <line x1={28} x2={CW - 12} y1={py(k1 + 1)} y2={py(k1 + 1)} stroke="var(--amber)" strokeWidth={0.8} strokeDasharray="3 3" />
            <text x={CW - 12} y={py(k1 + 1) - 3} fontSize={7} textAnchor="end" fill="var(--amber)">ceiling k1 + 1 = {(k1 + 1).toFixed(1)}</text>
            <motion.path d={curve} fill="none" stroke="var(--accent)" strokeWidth={1.6} initial={false} animate={{ d: curve }} transition={{ duration: 0.2 }} />
            {DOCS.map((d) => (
              <g key={d.n}>
                <circle cx={px(d.tf)} cy={py(factor(d.tf, k1, b, d.len))} r={3.4} fill="var(--teal)" />
                <text x={px(d.tf)} y={py(factor(d.tf, k1, b, d.len)) - 5} fontSize={8} textAnchor="middle" fill="var(--ink)">{d.n}</text>
              </g>
            ))}
            <text x={CW / 2 + 8} y={CH - 6} fontSize={7.5} textAnchor="middle" fill="var(--muted)">times the term appears</text>
            <text x={8} y={CH / 2} fontSize={7.5} textAnchor="middle" fill="var(--muted)" transform={`rotate(-90 8 ${CH / 2})`}>contribution</text>
            {[0, 4, 8, 12].map((t) => (
              <text key={t} x={px(t)} y={CH - 12} fontSize={7} textAnchor="middle" fill="var(--muted)">{t}</text>
            ))}
          </svg>
          <p className="c06-bm25-tuner-note">Blue line: an average-length chunk. Dots: each chunk's real position after length normalisation.</p>
        </div>

        <div>
          <ol className="c06-bm25-tuner-docs" aria-live="polite">
            {ranked.map((r, i) => (
              <li key={r.n} className="c06-bm25-tuner-doc">
                <b>{r.n}</b>
                <div>
                  <div className="c06-bm25-tuner-track">
                    <motion.div className="c06-bm25-tuner-fill" initial={false} animate={{ width: `${(r.score / top) * 100}%` }} transition={{ duration: 0.2 }}
                      style={{ background: i === 0 ? "var(--teal)" : "var(--accent)" }} />
                  </div>
                  <div className="c06-bm25-tuner-meta">{r.desc}; length {r.len}, term count {r.tf}</div>
                </div>
                <span className="c06-bm25-tuner-val">{r.score.toFixed(2)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="c06-bm25-tuner-controls">
        <label>
          <span>k1</span>
          <input type="range" min={0} max={3} step={0.1} value={k1} onChange={(e) => setK1(Number(e.target.value))} aria-label="k1, term frequency saturation" />
          <b>{k1.toFixed(1)}</b>
        </label>
        <label>
          <span>b</span>
          <input type="range" min={0} max={1} step={0.05} value={b} onChange={(e) => setB(Number(e.target.value))} aria-label="b, length normalisation" />
          <b>{b.toFixed(2)}</b>
        </label>
      </div>

      {g1 === null ? (
        <>
          <p style={{ margin: "10px 0 4px", fontSize: "0.95rem" }}>
            <strong>Predict.</strong> Right now D wins. You will switch length normalisation off, so b becomes zero.
            Which chunk takes first place?
          </p>
          <div className="w-row" style={{ gap: 6, flexWrap: "wrap" }} role="group" aria-label="Your prediction">
            {DOCS.map((d) => (
              <button key={d.n} className="w-btn" onClick={() => pick1(d.n)}>{d.n}</button>
            ))}
          </div>
        </>
      ) : (
        <div className={`w-verdict ${g1 === "C" ? "good" : "bad"}`}>
          {g1 === "C" ? "Right. " : `Not quite, it was C, not ${g1}. `}
          With b at zero, length is ignored, so the long chunk that mentions the term eight times wins on raw count,
          even though it is mostly about other things. Length normalisation is what stops long chunks winning
          just because they have more words.
        </div>
      )}

      {g1 !== null && g2 === null && (
        <>
          <p style={{ margin: "12px 0 4px", fontSize: "0.95rem" }}>
            <strong>Predict again.</strong> Now k1 goes to zero. What happens to the ranking?
          </p>
          <div className="c06-bm25-tuner-opts" role="group" aria-label="Your second prediction">
            <button className="w-btn" onClick={() => pick2("more")}>The chunk with the most mentions wins by a bigger margin.</button>
            <button className="w-btn" onClick={() => pick2("tie")}>Counting stops. Every chunk that contains the term scores the same.</button>
            <button className="w-btn" onClick={() => pick2("long")}>Long chunks move up.</button>
          </div>
        </>
      )}
      {g2 !== null && (
        <div className={`w-verdict ${g2 === "tie" ? "good" : "bad"}`}>
          {g2 === "tie" ? "Right. " : "Not quite. "}
          k1 sets how fast repeated mentions stop mattering. At zero the first mention counts and the rest add nothing,
          so all five tie. At three the curve is nearly a straight line for small counts. The default of 1.2 saturates
          quickly: the second mention helps, the tenth barely does. Try k1 = 3 with b = 0 to watch C run away.
        </div>
      )}
    </div>
  );
}
