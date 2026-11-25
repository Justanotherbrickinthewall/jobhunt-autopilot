import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { useOnce } from "./c01-03-shared";
import "./C03ChunkSlider.css";

// A paraphrase of the "Maximum Line Length" advice in PEP 8, one sentence per entry.
const SENT = [
  "Keep every line of code to at most 79 characters.",
  "For long blocks of text such as docstrings and comments, the limit drops to 72.",
  "A narrow limit lets you keep several files open side by side, and it suits review tools that show two versions in adjacent columns.",
  "Without a limit, an editor's default wrapping disrupts the visual structure of the code and makes it harder to read.",
  "The preferred way to wrap a long line is Python's implied continuation inside parentheses, brackets and braces.",
  "Use that in preference to a backslash.",
  "Backslashes are still fine in a few places, such as long with statements on versions before Python 3.10.",
  "Some teams strongly prefer a longer line length.",
  "A team that agrees on it may raise the limit to 99 characters, provided comments and docstrings still wrap at 72.",
  "The standard library stays conservative and keeps to 79 for code and 72 for comments.",
];
// Ideas are groups of sentences that only make sense together.
const IDEAS = [
  { name: "the two limits", s: [0, 1] },
  { name: "why limit at all", s: [2, 3] },
  { name: "how to wrap", s: [4, 5, 6] },
  { name: "when a team may go longer", s: [7, 8, 9] },
];
const TEXT = SENT.join(" ");
const SPANS: [number, number][] = [];
{
  let p = 0;
  for (const s of SENT) {
    SPANS.push([p, p + s.length]);
    p += s.length + 1;
  }
}
const tok = (chars: number) => Math.ceil(chars / 4);
const CAP = 90; // the exercise's precision cap, in tokens
const COLOURS = ["var(--accent)", "var(--teal)", "var(--amber)", "var(--rose)"];

type Mode = "fixed" | "sentence";

function fixedChunks(max: number, ov: number): [number, number][] {
  const size = max * 4;
  const step = Math.max(1, size - ov * 4);
  const out: [number, number][] = [];
  for (let s = 0; s < TEXT.length; s += step) {
    out.push([s, Math.min(TEXT.length, s + size)]);
    if (s + size >= TEXT.length) break;
  }
  return out;
}

function sentenceChunks(max: number, ov: number): [number, number][] {
  const out: [number, number][] = [];
  const n = SENT.length;
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && tok(SPANS[j + 1][1] - SPANS[i][0]) <= max) j++;
    out.push([SPANS[i][0], SPANS[j][1]]);
    if (j === n - 1) break;
    let k = i + 1;
    while (k <= j && tok(SPANS[j][1] - SPANS[k][0]) > ov) k++;
    i = k;
  }
  return out;
}

const isCut = (chunks: [number, number][], idea: { s: number[] }) => {
  const a = SPANS[idea.s[0]][0];
  const b = SPANS[idea.s[idea.s.length - 1]][1];
  return !chunks.some((c) => c[0] <= a && c[1] >= b);
};

export default function C03ChunkSlider({ onComplete }: WidgetProps) {
  const complete = useOnce(onComplete);
  const reduce = !!useReducedMotion();
  const [mode, setMode] = useState<Mode>("fixed");
  const [max, setMax] = useState(40);
  const [ov, setOv] = useState(0);
  const [guess, setGuess] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  const ovEff = Math.min(ov, max - 5);
  const chunks = useMemo(() => (mode === "fixed" ? fixedChunks(max, ovEff) : sentenceChunks(max, ovEff)), [mode, max, ovEff]);
  const cuts = IDEAS.filter((i) => isCut(chunks, i));
  const biggest = Math.max(...chunks.map((c) => tok(c[1] - c[0])));
  const stored = chunks.reduce((n, c) => n + tok(c[1] - c[0]), 0);
  const overhead = Math.round((stored / tok(TEXT.length) - 1) * 100);
  const goalMet = cuts.length === 0 && biggest <= CAP;

  // The fixed-size, 40 token, no-overlap setting is the prediction target.
  const baseline = IDEAS.filter((i) => isCut(fixedChunks(40, 0), i)).length;

  // Boundaries for rendering.
  const points = Array.from(new Set([0, TEXT.length, ...chunks.flatMap((c) => [c[0], c[1]])])).sort((a, b) => a - b);
  const sentenceStarts = new Set(SPANS.map((s) => s[0]));
  const W = 320;
  const x = (p: number) => 10 + (p / TEXT.length) * W;

  function check() {
    setChecked(true);
    complete(goalMet ? "found a setup that keeps every idea whole" : `ended with ${cuts.length} ideas cut, biggest chunk ${biggest} tokens`);
  }

  return (
    <div className="w-panel c03-chunk-slider">
      <p className="c03-chunk-slider-lede">Ten sentences from the PEP 8 line-length advice, in four ideas. Cuts in rose fall mid-sentence.</p>

      <div className="c03-chunk-slider-q">First, predict. Fixed-size chunks of 40 tokens, no overlap. How many of the four ideas end up split across chunks?</div>
      <div className="c03-chunk-slider-opts" role="group" aria-label="Your prediction">
        {[0, 1, 2, 3, 4].map((n) => (
          <button key={n} type="button" className={`w-btn${guess === n ? " primary" : ""}`} disabled={guess !== null} aria-pressed={guess === n} onClick={() => setGuess(n)}>{n}</button>
        ))}
      </div>
      {guess !== null && (
        <div className={`w-verdict ${guess === baseline ? "good" : "bad"}`} role="status">
          {guess === baseline ? "Right. " : `It is ${baseline}, not ${guess}. `}Fixed-size windows ignore meaning, so most ideas straddle a cut. Now find a setup that keeps all four ideas whole with no chunk above {CAP} tokens.
        </div>
      )}

      <div className="c03-chunk-slider-controls" aria-disabled={guess === null}>
        <div className="c03-chunk-slider-field">
          <span>Strategy</span>
          <div className="c03-chunk-slider-modes" role="group" aria-label="Strategy">
            <button type="button" className={`w-btn${mode === "fixed" ? " primary" : ""}`} disabled={guess === null} aria-pressed={mode === "fixed"} onClick={() => setMode("fixed")}>Fixed size</button>
            <button type="button" className={`w-btn${mode === "sentence" ? " primary" : ""}`} disabled={guess === null} aria-pressed={mode === "sentence"} onClick={() => setMode("sentence")}>Whole sentences</button>
          </div>
        </div>
        <label className="c03-chunk-slider-field">
          <span>Chunk size <b>{max} tokens</b></span>
          <input type="range" min={20} max={160} step={5} value={max} disabled={guess === null} onChange={(e) => setMax(+e.target.value)} />
        </label>
        <label className="c03-chunk-slider-field">
          <span>Overlap <b>{ovEff} tokens</b></span>
          <input type="range" min={0} max={40} step={5} value={ov} disabled={guess === null} onChange={(e) => setOv(+e.target.value)} />
        </label>
      </div>

      <div className="c03-chunk-slider-stats">
        <div className="c03-chunk-slider-stat">Chunks<strong>{chunks.length}</strong></div>
        <div className={`c03-chunk-slider-stat ${cuts.length ? "is-bad" : "is-good"}`}>Ideas cut<strong>{cuts.length} of {IDEAS.length}</strong></div>
        <div className={`c03-chunk-slider-stat ${biggest > CAP ? "is-bad" : ""}`}>Biggest<strong>{biggest} tok</strong></div>
        <div className="c03-chunk-slider-stat">Index size<strong>+{overhead}%</strong></div>
      </div>

      <div className="c03-chunk-slider-text" aria-label="The passage with chunk boundaries">
        {points.slice(0, -1).map((p, idx) => {
          const q = points[idx + 1];
          const covering = chunks.map((c, ci) => (c[0] <= p && c[1] >= q ? ci : -1)).filter((ci) => ci >= 0);
          const first = covering[0] ?? 0;
          const startsChunk = chunks.some((c) => c[0] === p);
          const midSentence = startsChunk && p !== 0 && !sentenceStarts.has(p);
          return (
            <span key={p}>
              {startsChunk && p !== 0 && <span className={`c03-chunk-slider-edge${midSentence ? "" : " is-clean"}`} aria-hidden="true">|</span>}
              <span
                className={`c03-chunk-slider-seg${covering.length > 1 ? " is-overlap" : ""}`}
                style={{ background: `color-mix(in srgb, ${COLOURS[first % 4]} 22%, transparent)` }}
                title={`chunk ${covering.map((c) => c + 1).join(" and ")}`}
              >
                {TEXT.slice(p, q)}
              </span>
            </span>
          );
        })}
      </div>

      <svg className="c03-chunk-slider-svg" viewBox="0 0 340 118" role="img" aria-label={`${chunks.length} chunks, ${cuts.length} ideas cut`}>
        {chunks.map((c, i) => (
          <motion.rect
            key={i}
            className="c03-chunk-slider-chunkrect"
            rx={3}
            height={14}
            initial={false}
            animate={{ x: x(c[0]), width: Math.max(2, x(c[1]) - x(c[0])), y: 6 + (i % 3) * 18, fill: `color-mix(in srgb, ${COLOURS[i % 4]} 30%, transparent)`, stroke: COLOURS[i % 4] }}
            transition={reduce ? { duration: 0 } : { duration: 0.25 }}
          />
        ))}
        {IDEAS.map((idea, i) => {
          const a = SPANS[idea.s[0]][0];
          const b = SPANS[idea.s[idea.s.length - 1]][1];
          const cut = isCut(chunks, idea);
          return (
            <g key={idea.name}>
              <line x1={x(a)} x2={x(b)} y1={72 + (i % 2) * 14} y2={72 + (i % 2) * 14} className={cut ? "c03-chunk-slider-ideacut" : "c03-chunk-slider-ideaok"} />
              <text x={x(a)} y={64 + (i % 2) * 14} className="c03-chunk-slider-cap">{idea.name}</text>
            </g>
          );
        })}
        <text x={10} y={112} className="c03-chunk-slider-cap">Top: chunks. Bottom: ideas, solid when whole, dashed when split.</text>
      </svg>

      {guess !== null && !checked && <button type="button" className="w-btn primary" onClick={check}>Check my setup</button>}
      {checked && (
        <div className={`w-verdict ${goalMet ? "good" : "bad"}`} role="status">
          {goalMet
            ? `Every idea is whole and the biggest chunk is ${biggest} tokens. Note how fragile that is: it works because these ideas happen to be about 65 tokens long. Real ideas vary, so overlap and cutting on the document's structure are more robust than hunting for a magic size.`
            : `${cuts.length} ${cuts.length === 1 ? "idea is" : "ideas are"} still split, and the biggest chunk is ${biggest} tokens. Try whole sentences at 65 tokens with no overlap, or 90 with 35 tokens of overlap. Fixed-size windows rarely get there.`}
        </div>
      )}
    </div>
  );
}
