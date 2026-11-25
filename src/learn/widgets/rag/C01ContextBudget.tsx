import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { fmtMoney, fmtTokens, useOnce } from "./c01-03-shared";
import "./C01ContextBudget.css";

// What one RAG question costs in this model: five retrieved chunks of 500 tokens, plus 700 tokens
// for the instructions and the question. Illustrative numbers, not a measurement.
const RAG_TOKENS = 5 * 500 + 700;
const WINDOWS = [8_000, 32_000, 128_000, 200_000, 1_000_000];

type Call = "paste" | "rag";
type Case = { id: string; title: string; text: string; corpus: number; window: number; perDay: number; best: Call };

const CASES: Case[] = [
  { id: "a", title: "A small handbook, a few questions", text: "The team handbook is 150 thousand tokens. The model has a 200 thousand token window. Twenty questions arrive each day.", corpus: 150_000, window: 200_000, perDay: 20, best: "paste" },
  { id: "b", title: "A big wiki, a small window", text: "The wiki is 600 thousand tokens. The model has a 200 thousand token window. Questions are rare.", corpus: 600_000, window: 200_000, perDay: 20, best: "rag" },
  { id: "c", title: "It fits, but the bill is huge", text: "The wiki is 600 thousand tokens. The model has a one million token window. Five thousand questions arrive each day.", corpus: 600_000, window: 1_000_000, perDay: 5_000, best: "rag" },
];

export default function C01ContextBudget({ onComplete }: WidgetProps) {
  const complete = useOnce(onComplete);
  const reduce = !!useReducedMotion();
  const [corpusStep, setCorpusStep] = useState(26);
  const [win, setWin] = useState(200_000);
  const [price, setPrice] = useState(3);
  const [perDayStep, setPerDayStep] = useState(20);
  const [picks, setPicks] = useState<Record<string, Call>>({});

  const corpus = Math.round(10_000 * 10 ** (corpusStep / 10));
  const perDay = Math.round(10 ** (perDayStep / 10));
  const cost = (tokens: number, n = 1) => (tokens / 1e6) * price * n;
  const fits = corpus <= win;
  const W = 320;

  function pick(c: Case, call: Call) {
    if (picks[c.id]) return;
    const next = { ...picks, [c.id]: call };
    setPicks(next);
    if (Object.keys(next).length === CASES.length) {
      const score = CASES.filter((k) => next[k.id] === k.best).length;
      complete(`${score} of ${CASES.length} calls right`);
    }
  }

  function why(c: Case): string {
    const pasteDay = cost(c.corpus, c.perDay);
    const ragDay = cost(RAG_TOKENS, c.perDay);
    if (c.id === "a") return `Pasting wins. Twenty questions of ${fmtTokens(c.corpus)} tokens is ${fmtTokens(c.corpus * c.perDay)} tokens a day, about ${fmtMoney(pasteDay)} at your price. There is no index to build and no retrieval to miss. Prompt caching, which reuses a repeated prompt at a discount, makes it cheaper still. Build RAG when this stops being true.`;
    if (c.id === "b") return `RAG is forced. ${fmtTokens(c.corpus)} tokens cannot enter a ${fmtTokens(c.window)} window at all. Truncating would silently drop most of the wiki, so the model would answer from whichever part survived.`;
    return `RAG wins on cost. Pasting is ${fmtTokens(c.corpus * c.perDay)} input tokens a day, about ${fmtMoney(pasteDay)}. Retrieval sends ${fmtTokens(RAG_TOKENS)} per question, about ${fmtMoney(ragDay)} a day. A very long prompt is also slower, and models can miss facts buried in the middle of it.`;
  }

  return (
    <div className="w-panel c01-context-budget">
      <p className="c01-context-budget-lede">Drag the sliders first. Watch what happens to the corpus bar when the window stays put. Then make three calls.</p>
      <div className="c01-context-budget-grid">
        <label className="c01-context-budget-field">
          <span>Corpus size <b>{fmtTokens(corpus)} tokens</b></span>
          <input type="range" min={0} max={40} value={corpusStep} onChange={(e) => setCorpusStep(+e.target.value)} aria-label="Corpus size in tokens, logarithmic" />
        </label>
        <label className="c01-context-budget-field">
          <span>Context window</span>
          <select value={win} onChange={(e) => setWin(+e.target.value)} aria-label="Context window size">
            {WINDOWS.map((w) => <option key={w} value={w}>{fmtTokens(w)} tokens</option>)}
          </select>
        </label>
        <label className="c01-context-budget-field">
          <span>Questions per day <b>{fmtTokens(perDay)}</b></span>
          <input type="range" min={0} max={40} value={perDayStep} onChange={(e) => setPerDayStep(+e.target.value)} aria-label="Questions per day, logarithmic" />
        </label>
        <label className="c01-context-budget-field">
          <span>Example price per million input tokens</span>
          <input type="number" min={0.01} step={0.5} value={price} onChange={(e) => setPrice(Math.max(0.01, +e.target.value || 0.01))} aria-label="Price in dollars per million input tokens" />
        </label>
      </div>

      <svg className="c01-context-budget-svg" viewBox="0 0 340 150" role="img" aria-label={`The window holds ${fmtTokens(win)} tokens. The corpus is ${fmtTokens(corpus)} tokens, which ${fits ? "fits" : "does not fit"}. One RAG question uses ${fmtTokens(RAG_TOKENS)} tokens.`}>
        <text x={10} y={14} className="c01-context-budget-label">Context window ({fmtTokens(win)})</text>
        <rect x={10} y={20} width={W} height={20} rx={4} className="c01-context-budget-frame" />
        <text x={10} y={62} className="c01-context-budget-label">Paste the whole corpus ({fmtTokens(corpus)})</text>
        <motion.rect x={10} y={68} height={20} rx={4} initial={false} animate={{ width: Math.max(2, Math.min(W, (W * corpus) / win)), fill: fits ? "var(--teal)" : "var(--rose)" }} transition={reduce ? { duration: 0 } : { duration: 0.25 }} />
        {!fits && <text x={W + 6} y={82} textAnchor="end" className="c01-context-budget-val" style={{ fill: "var(--bg)" }}>{(corpus / win).toFixed(1)}x window</text>}
        <text x={10} y={110} className="c01-context-budget-label">Retrieve five passages ({fmtTokens(RAG_TOKENS)})</text>
        <motion.rect x={10} y={116} height={20} rx={4} fill="var(--accent)" initial={false} animate={{ width: Math.max(2, (W * RAG_TOKENS) / win) }} transition={reduce ? { duration: 0 } : { duration: 0.25 }} />
      </svg>

      <div className="c01-context-budget-stats">
        <div className={`c01-context-budget-stat ${fits ? "is-good" : "is-bad"}`}>Paste it all<strong>{fits ? `${fmtMoney(cost(corpus))} a question` : "does not fit"}</strong>{fits ? `${fmtMoney(cost(corpus, perDay))} a day` : "needs a bigger window"}</div>
        <div className="c01-context-budget-stat is-good">Retrieve five passages<strong>{fmtMoney(cost(RAG_TOKENS))} a question</strong>{fmtMoney(cost(RAG_TOKENS, perDay))} a day</div>
      </div>

      {CASES.map((c) => {
        const p = picks[c.id];
        return (
          <div className="c01-context-budget-case" key={c.id}>
            <h4>{c.title}</h4>
            <p>{c.text}</p>
            <div className="c01-context-budget-pick" role="group" aria-label={`Your call for ${c.title}`}>
              {(["paste", "rag"] as Call[]).map((call) => (
                <button key={call} type="button" className={`w-btn${p === call ? " primary" : ""}`} disabled={!!p} aria-pressed={p === call} onClick={() => pick(c, call)}>
                  {call === "paste" ? "Paste it all" : "Use RAG"}
                </button>
              ))}
            </div>
            {p && (
              <div className={`w-verdict ${p === c.best ? "good" : "bad"}`} role="status">
                <b>{p === c.best ? "Right call. " : "Not this one. "}</b>
                <span className="c01-context-budget-why">{why(c)}</span>
              </div>
            )}
          </div>
        );
      })}
      {Object.keys(picks).length === CASES.length && (
        <div className="w-verdict good" role="status">You made {CASES.filter((k) => picks[k.id] === k.best).length} of {CASES.length} calls right. The rule: paste when it fits, volume is low and you want zero pipeline. Retrieve when it does not fit or when volume makes every question pay for the whole corpus.</div>
      )}
    </div>
  );
}
