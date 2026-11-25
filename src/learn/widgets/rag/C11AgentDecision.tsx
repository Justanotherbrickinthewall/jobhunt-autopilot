import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { useOnce } from "./c1012shared";
import "./C11AgentDecision.css";

type Design = "oneshot" | "parallel" | "iterative" | "sql";

const DESIGNS: { id: Design; label: string; short: string; steps: string[][] }[] = [
  { id: "oneshot", label: "One-shot RAG", short: "One retrieval, one answer", steps: [["R"], ["G"]] },
  { id: "parallel", label: "Decompose, search in parallel", short: "Split the question, run the searches side by side", steps: [["D"], ["R", "R"], ["G"]] },
  { id: "iterative", label: "Iterative loop (agent)", short: "Plan, search, read, plan again", steps: [["D"], ["R"], ["D"], ["R"], ["D"], ["R"], ["G"]] },
  { id: "sql", label: "Text-to-SQL", short: "Write a query, run it, explain the rows", steps: [["W"], ["X"], ["G"]] },
];

const LEGEND: Record<string, string> = { R: "retrieve", G: "generate answer", D: "LLM plans", W: "LLM writes SQL", X: "run SQL" };

const CASES: { q: string; answer: Design; why: string }[] = [
  {
    q: "What does PEP 8 say about line length?",
    answer: "oneshot",
    why: "A single fact in a single place. A loop here only adds latency and a second way to be wrong.",
  },
  {
    q: "Compare how PEP 8 and PEP 20 treat readability.",
    answer: "parallel",
    why: "Two independent lookups. Neither search needs the other's result, so run both at once and answer once.",
  },
  {
    q: "Find the PEP that proposes an optional GIL, then list the PEPs it references and how each relates.",
    answer: "iterative",
    why: "The second search depends on what the first returns. This is a true multi-hop question, and a capped loop earns its cost.",
  },
  {
    q: "How many support tickets did we close in Europe last quarter?",
    answer: "sql",
    why: "It is a count over rows. Similarity search cannot count, so write a query against a read-only, row-secured role.",
  },
  {
    q: "Summarise what PEP 572 says about scope in comprehensions.",
    answer: "oneshot",
    why: "It is tempting to reach for an agent because the document is long. It is still one document and one topic. Retrieve its relevant sections once.",
  },
];

function Timeline({ design, accent }: { design: Design; accent: string }) {
  const d = DESIGNS.find((x) => x.id === design)!;
  const colW = 34;
  const w = Math.max(d.steps.length * colW + 8, 120);
  return (
    <svg viewBox={`0 0 ${w} 62`} className="c11ad-tl" role="img" aria-label={`${d.label}: ${d.steps.length} sequential steps`}>
      {d.steps.map((col, i) =>
        col.map((k, j) => (
          <g key={`${i}-${j}`}>
            <rect x={4 + i * colW} y={4 + j * 26} width={colW - 6} height={22} rx="5" fill={k === "G" ? "var(--teal)" : accent} opacity={k === "G" ? 0.9 : 0.75} />
            <text x={4 + i * colW + (colW - 6) / 2} y={19 + j * 26} textAnchor="middle" className="c11ad-tt">
              {k}
            </text>
          </g>
        )),
      )}
    </svg>
  );
}

export default function C11AgentDecision({ onComplete }: WidgetProps) {
  const reduce = useReducedMotion();
  const complete = useOnce(onComplete);
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<(Design | null)[]>(() => CASES.map(() => null));
  const [finished, setFinished] = useState(false);

  const c = CASES[i];
  const pick = picks[i];
  const correct = picks.filter((p, n) => p === CASES[n].answer).length;
  const overBuilt = picks.filter((p, n) => p === "iterative" && CASES[n].answer !== "iterative").length;

  function choose(d: Design) {
    if (pick) return;
    const next = [...picks];
    next[i] = d;
    setPicks(next);
  }

  function advance() {
    if (i < CASES.length - 1) setI(i + 1);
    else {
      setFinished(true);
      const score = picks.filter((p, n) => p === CASES[n].answer).length;
      complete(`${score} of ${CASES.length} designs matched the question.`);
    }
  }

  if (finished) {
    return (
      <div className="w-panel c11ad-root">
        <p className={"w-verdict " + (correct >= 4 ? "good" : "bad")} role="status">
          {correct} of {CASES.length} designs matched the question.{" "}
          {overBuilt > 0
            ? `You reached for the agent ${overBuilt} time${overBuilt > 1 ? "s" : ""} when a cheaper design worked. That is the common mistake: loops add latency, variance and debugging cost.`
            : correct === CASES.length
              ? "Every call was the cheapest design that works. That is the habit to keep."
              : "No over-built agents, but review the misses. Ask each time whether the second step depends on the first."}
        </p>
        <button type="button" className="w-btn ghost" onClick={() => { setPicks(CASES.map(() => null)); setI(0); setFinished(false); }}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="w-panel c11ad-root">
      <div className="c11ad-top">
        <span className="c11ad-count">
          Question {i + 1} of {CASES.length}
        </span>
        <span className="c11ad-dots" aria-hidden="true">
          {CASES.map((_, n) => (
            <span key={n} className={"c11ad-dot" + (n === i ? " cur" : "") + (picks[n] ? (picks[n] === CASES[n].answer ? " ok" : " no") : "")} />
          ))}
        </span>
      </div>

      <motion.blockquote key={i} className="c11ad-q" initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        {c.q}
      </motion.blockquote>

      <fieldset className="c11ad-fs">
        <legend>Choose the cheapest design that can answer it.</legend>
        {DESIGNS.map((d) => {
          const isPick = pick === d.id;
          const isAns = pick && d.id === c.answer;
          return (
            <button
              key={d.id}
              type="button"
              className={"c11ad-opt" + (isPick ? (d.id === c.answer ? " ok" : " no") : "") + (!isPick && isAns ? " ans" : "")}
              aria-pressed={isPick}
              disabled={!!pick}
              onClick={() => choose(d.id)}
            >
              <span className="c11ad-ol">{d.label}</span>
              <span className="c11ad-os">{d.short}</span>
              {pick && (isPick || isAns) && <Timeline design={d.id} accent={d.id === c.answer ? "var(--teal)" : "var(--rose)"} />}
            </button>
          );
        })}
      </fieldset>

      {pick && (
        <motion.div initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="c11ad-fb">
          <p className={"w-verdict " + (pick === c.answer ? "good" : "bad")} role="status">
            {pick === c.answer ? "Right. " : `The better design here is ${DESIGNS.find((d) => d.id === c.answer)!.label}. `}
            {c.why}
          </p>
          <p className="c11ad-legend">Columns are steps that happen in sequence, and boxes in one column run in parallel. {Object.entries(LEGEND).map(([k, v]) => `${k} is ${v}`).join(", ")}.</p>
          <button type="button" className="w-btn primary" onClick={advance}>
            {i < CASES.length - 1 ? "Next question" : "See my verdict"}
          </button>
        </motion.div>
      )}
    </div>
  );
}
