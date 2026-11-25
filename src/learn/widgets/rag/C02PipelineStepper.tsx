import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { useOnce } from "./c01-03-shared";
import "./C02PipelineStepper.css";

type Stage = { id: string; name: string; lane: "index" | "query"; takes: string; makes: string; breaks: string };

const STAGES: Stage[] = [
  { id: "load", name: "Load", lane: "index", takes: "pep-0008.rst on disk", makes: "The raw text of the file, with its PEP number", breaks: "Missed files, bad encodings, PDFs read in the wrong order." },
  { id: "parse", name: "Parse", lane: "index", takes: "Raw text with the PEP header on top", makes: "A Document, the loader's record of one PEP: doc_id, title, source, the clean body as text, and the header fields in headers", breaks: "Headers, menus or page footers leak into the content." },
  { id: "chunk", name: "Chunk", lane: "index", takes: "One Document", makes: "Chunks of a few hundred tokens, each with a heading path such as Code Lay-out then Maximum Line Length", breaks: "A rule is cut away from its exception." },
  { id: "embed", name: "Embed", lane: "index", takes: "Chunk text", makes: "A vector: a list of numbers that places the chunk by meaning", breaks: "Text longer than the model accepts is cut off silently." },
  { id: "store", name: "Store", lane: "index", takes: "Vectors plus metadata", makes: "A searchable index", breaks: "Stale records, duplicates after a re-run, missing permission fields." },
  { id: "rewrite", name: "Rewrite", lane: "query", takes: "What does PEP 8 say about line length?", makes: "One or more search queries", breaks: "The rewrite drops the one term that mattered." },
  { id: "qembed", name: "Embed", lane: "query", takes: "The search query", makes: "A query vector from the same model as the index", breaks: "A different model from the one used at index time. Nothing matches." },
  { id: "search", name: "Search", lane: "query", takes: "The query vector", makes: "The top candidates, say 50, by similarity", breaks: "The right chunk is not in the top candidates at all." },
  { id: "rerank", name: "Rerank", lane: "query", takes: "50 candidates", makes: "The best five, reordered by a slower and sharper model", breaks: "Adds latency. A good ranker can also hide a weak search." },
  { id: "pack", name: "Pack", lane: "query", takes: "The best chunks", makes: "A prompt with sources labelled, inside the token budget", breaks: "Over budget, or the best chunk buried in the middle." },
  { id: "answer", name: "Answer", lane: "query", takes: "The prompt", makes: "A reply that cites the chunks it used", breaks: "The model ignores the context or cites the wrong chunk." },
];

type Symptom = { id: string; text: string; good: string[]; why: string };
const SYMPTOMS: Symptom[] = [
  { id: "s1", text: "Answers quote the PEP's Author and Status lines as if they were part of the rules.", good: ["parse"], why: "The header was never separated from the body. That is a parsing fault, and no retrieval tuning will fix it." },
  { id: "s2", text: "PEP 703 was edited yesterday. Answers still give the old wording.", good: ["load", "store"], why: "Nothing detected the change or replaced the old records. Freshness lives in loading and storing: hash the content, upsert by stable id, and delete orphans, the records whose source file is gone." },
  { id: "s3", text: "You switched embedding models last week. Now every search returns junk.", good: ["embed", "qembed"], why: "Index and query must use the same model. Old vectors and new query vectors live in different spaces. Re-embed the whole corpus." },
  { id: "s4", text: "The right chunk is found at rank 7. The model answers from rank 1, which is wrong.", good: ["rerank", "pack"], why: "Retrieval worked. The ordering or the packing did not. A reranker, or a better packing rule, fixes it." },
];

const COLS = [28, 98, 168, 238, 308];
const QCOLS = [20, 76, 132, 188, 244, 300];
const POS = (i: number) => (i < 5 ? { x: COLS[i], y: 44 } : { x: QCOLS[i - 5], y: 160 });

export default function C02PipelineStepper({ onComplete }: WidgetProps) {
  const complete = useOnce(onComplete);
  const reduce = !!useReducedMotion();
  const [step, setStep] = useState(0);
  const [seen, setSeen] = useState(1);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const stage = STAGES[step];
  const toured = seen >= STAGES.length;
  const pos = POS(step);

  function go(to: number) {
    const t = Math.max(0, Math.min(STAGES.length - 1, to));
    setStep(t);
    setSeen((s) => Math.max(s, t + 1));
  }
  const score = SYMPTOMS.filter((s) => s.good.includes(picks[s.id])).length;
  function check() {
    setChecked(true);
    complete(`${score} of ${SYMPTOMS.length} bugs traced to the right stage`);
  }

  return (
    <div className="w-panel c02-pipeline-stepper">
      <p className="c02-pipeline-stepper-lede">Walk one question, about PEP 8's line length rule, through every stage. Then trace four bugs back to the stage that caused them.</p>
      <svg className="c02-pipeline-stepper-svg" viewBox="0 0 340 206" role="img" aria-label={`Pipeline diagram. Current stage: ${stage.name}, ${stage.lane === "index" ? "indexing" : "querying"}.`}>
        <text x={4} y={10} className="c02-pipeline-stepper-lane">INDEXING, OFFLINE</text>
        <text x={4} y={200} className="c02-pipeline-stepper-lane">QUERYING, ONLINE</text>
        <path d="M28 44 H308" className="c02-pipeline-stepper-link" />
        <path d="M20 160 H300" className="c02-pipeline-stepper-link" />
        <path d="M308 58 V98 H230" className="c02-pipeline-stepper-link" />
        <path d="M188 146 V118" className="c02-pipeline-stepper-link" />
        <rect x={110} y={78} width={120} height={40} rx={10} className="c02-pipeline-stepper-index" />
        <text x={170} y={102} className="c02-pipeline-stepper-name">THE INDEX</text>
        {STAGES.map((s, i) => {
          const p = POS(i);
          const cls = `c02-pipeline-stepper-node is-${s.lane === "query" ? "query" : "index"}${i === step ? " is-now" : i < seen ? " is-done" : ""}`;
          return (
            <g key={s.id}>
              <circle cx={p.x} cy={p.y} r={14} className={cls} />
              <text x={p.x} y={p.y + 3} className="c02-pipeline-stepper-name">{i + 1}</text>
              <text x={p.x} y={p.y + 28} className="c02-pipeline-stepper-name">{s.name}</text>
            </g>
          );
        })}
        <motion.circle r={5} className="c02-pipeline-stepper-dot" initial={false} animate={{ cx: pos.x, cy: pos.y - 22 }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 160, damping: 18 }} />
      </svg>

      <div className="c02-pipeline-stepper-card" aria-live="polite">
        <h4>{step + 1}. {stage.name} <span style={{ color: "var(--muted)", fontWeight: "var(--w-text)", fontSize: "0.8rem" }}>({stage.lane === "index" ? "indexing" : "querying"})</span></h4>
        <dl>
          <dt>Takes</dt><dd>{stage.takes}</dd>
          <dt>Makes</dt><dd>{stage.makes}</dd>
          <dt>Breaks</dt><dd>{stage.breaks}</dd>
        </dl>
      </div>
      <div className="c02-pipeline-stepper-nav">
        <button type="button" className="w-btn" onClick={() => go(step - 1)} disabled={step === 0}>Back</button>
        <button type="button" className="w-btn primary" onClick={() => go(step + 1)} disabled={step === STAGES.length - 1}>Next stage</button>
        <span>{toured ? "Tour complete." : `${seen} of ${STAGES.length} stages seen`}</span>
      </div>

      {toured && (
        <div className="c02-pipeline-stepper-triage">
          <h4>Which stage caused it?</h4>
          {SYMPTOMS.map((s) => (
            <div className="c02-pipeline-stepper-symptom" key={s.id}>
              <p>{s.text}</p>
              <div className="c02-pipeline-stepper-picks" role="group" aria-label={`Stage for: ${s.text}`}>
                {STAGES.map((st) => (
                  <button key={st.id} type="button" className={`w-btn${picks[s.id] === st.id ? " primary" : ""}`} aria-pressed={picks[s.id] === st.id} disabled={checked} onClick={() => setPicks((p) => ({ ...p, [s.id]: st.id }))}>
                    {st.lane === "query" && st.name === "Embed" ? "Embed (query)" : st.name}
                  </button>
                ))}
              </div>
              {checked && (
                <p className="c02-pipeline-stepper-note"><b>{s.good.includes(picks[s.id]) ? "Yes. " : "No. "}</b>{s.why}</p>
              )}
            </div>
          ))}
          {!checked && <button type="button" className="w-btn primary" disabled={Object.keys(picks).length < SYMPTOMS.length} onClick={check}>Check my diagnoses</button>}
          {checked && (
            <div className={`w-verdict ${score >= 3 ? "good" : "bad"}`} role="status">
              {score} of {SYMPTOMS.length} traced correctly. {score >= 3 ? "Good. You are debugging the pipeline, not guessing at the model." : "Look at the misses. Ask first whether the bug exists in the index or only at query time."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
