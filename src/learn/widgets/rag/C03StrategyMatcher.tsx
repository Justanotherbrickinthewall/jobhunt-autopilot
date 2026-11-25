import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { useOnce } from "./c01-03-shared";
import "./C03StrategyMatcher.css";

const STRATEGIES = [
  { id: "fixed", label: "Fixed size" },
  { id: "recursive", label: "Recursive" },
  { id: "structure", label: "Structure-aware" },
  { id: "semantic", label: "Semantic" },
  { id: "window", label: "Sentence window" },
  { id: "parent", label: "Parent-child" },
  { id: "record", label: "One chunk per item" },
];
const label = (id: string) => STRATEGIES.find((s) => s.id === id)?.label ?? id;

type Doc = { id: string; text: string; best: string; ok: string[]; why: string };
const DOCS: Doc[] = [
  { id: "d1", text: "A PEP in reStructuredText, with numbered sections, code blocks and tables.", best: "structure", ok: ["recursive"], why: "The headings already say where ideas start and stop. Split on them first, and keep the heading path as metadata. A recursive splitter that tries headings before paragraphs gets you most of the way." },
  { id: "d2", text: "A support FAQ of 300 short question and answer pairs.", best: "record", ok: ["structure"], why: "Each pair is a complete unit. Embed the question with its answer as one chunk. Anything cleverer risks splitting an answer from its question." },
  { id: "d3", text: "A 90-minute meeting transcript with no headings and no paragraphs.", best: "semantic", ok: ["fixed", "recursive"], why: "There is no structure to lean on, so topic shifts are the only signal. Semantic splitting is worth testing here. Fixed windows with overlap are the cheap baseline, and often hard to beat." },
  { id: "d4", text: "A legal contract where each clause leans on defined terms and its neighbours.", best: "parent", ok: ["structure"], why: "Search with small, precise pieces, then hand the model the whole clause or section around the match. Parent-child gives precise matching and enough context." },
  { id: "d5", text: "Python source code in a repository.", best: "structure", ok: [], why: "Split on functions and classes using the syntax tree. A fixed window cuts a function in half and separates a signature from its body." },
  { id: "d6", text: "A long help article where one-line questions need an exact sentence, but the answer needs the paragraph around it.", best: "window", ok: ["parent"], why: "Embed single sentences for sharp matching, then return a window of neighbouring sentences. It is parent-child with the parent defined by position." },
  { id: "d7", text: "A folder of mixed plain-text notes. It is Friday, the demo is Monday, and you have not read them.", best: "recursive", ok: ["fixed"], why: "A recursive strategy degrades gracefully: paragraphs when they exist, sentences when they do not. It is the sensible default until an eval says otherwise." },
];

export default function C03StrategyMatcher({ onComplete }: WidgetProps) {
  const complete = useOnce(onComplete);
  const reduce = !!useReducedMotion();
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);

  const grade = (d: Doc) => (picks[d.id] === d.best ? "best" : d.ok.includes(picks[d.id]) ? "ok" : "miss");
  const points = DOCS.reduce((n, d) => n + (grade(d) === "best" ? 2 : grade(d) === "ok" ? 1 : 0), 0);
  const max = DOCS.length * 2;
  const ready = DOCS.every((d) => picks[d.id]);

  function check() {
    setChecked(true);
    complete(`${points} of ${max} points`);
  }

  return (
    <div className="w-panel c03-strategy-matcher">
      <p className="c03-strategy-matcher-lede">Seven documents. Pick the splitting strategy you would start with. Best earns two points, a defensible alternative earns one.</p>
      {DOCS.map((d) => {
        const g = checked ? grade(d) : null;
        return (
          <div className="c03-strategy-matcher-doc" key={d.id}>
            <p>{d.text}</p>
            <div className="c03-strategy-matcher-picks" role="group" aria-label={`Strategy for: ${d.text}`}>
              {STRATEGIES.map((s) => (
                <button key={s.id} type="button" className={`w-btn${picks[d.id] === s.id ? " primary" : ""}`} disabled={checked} aria-pressed={picks[d.id] === s.id} onClick={() => setPicks((p) => ({ ...p, [d.id]: s.id }))}>{s.label}</button>
              ))}
            </div>
            {g && (
              <p className={`c03-strategy-matcher-note is-${g}`}>
                <b>{g === "best" ? "Best choice. " : g === "ok" ? `Defensible, but ${label(d.best)} is better. ` : `Best is ${label(d.best)}. `}</b>{d.why}
              </p>
            )}
          </div>
        );
      })}
      {!checked && <button type="button" className="w-btn primary" disabled={!ready} onClick={check}>Check my matches</button>}
      {checked && (
        <>
          <svg className="c03-strategy-matcher-svg" viewBox="0 0 340 40" role="img" aria-label={`Score ${points} of ${max}`}>
            <rect x={10} y={8} width={320} height={14} rx={7} fill="var(--surface-2)" />
            <motion.rect x={10} y={8} height={14} rx={7} fill={points >= 10 ? "var(--teal)" : "var(--amber)"} initial={reduce ? false : { width: 0 }} animate={{ width: (320 * points) / max }} transition={{ duration: reduce ? 0 : 0.5 }} />
            <text x={10} y={36} className="c03-strategy-matcher-cap">{points} of {max} points</text>
          </svg>
          <div className={`w-verdict ${points >= 10 ? "good" : "bad"}`} role="status">
            {points >= 10 ? "You matched the strategy to the document's shape. That is most of the skill." : "Close, but check the misses. The rule: use whatever structure the document already has, and pay for cleverness only when there is none."}
          </div>
        </>
      )}
    </div>
  );
}
