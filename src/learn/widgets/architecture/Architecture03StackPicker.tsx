import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Architecture03StackPicker.css";

// The first case is AskPEP as the capstone ships it. The other four are invented customers, so every number
// in them is an illustrative figure. Each answer follows the six-row table in section 2 of the chapter.
// CHECK: the answers to cases 2, 3 and 5 rest on product facts that carry a CHECK in that table.

type Option = { id: string; label: string };
type Case = {
  title: string;
  illustrative: boolean;
  facts: { name: string; value: string }[];
  answer: string;
  why: string;
};

const OPTIONS: Option[] = [
  { id: "cloudsql", label: "Cloud SQL with pgvector" },
  { id: "alloydb", label: "AlloyDB" },
  { id: "vvs", label: "Vertex AI Vector Search" },
  { id: "bq", label: "BigQuery vector search" },
  { id: "managed", label: "A managed search or RAG product" },
];

const CASES: Case[] = [
  {
    title: "Case 1: the PEP desk today",
    illustrative: false,
    facts: [
      { name: "Corpus size", value: "18 documents, a few hundred chunks" },
      { name: "Filters", value: "None set in the request path" },
      { name: "Freshness", value: "A re-ingest after the PEPs change" },
      { name: "Operator", value: "You, then Cloud SQL from course 7" },
    ],
    answer: "cloudsql",
    why: "Nothing here beats the default. Every other option rewrites code to solve a problem the desk does not have.",
  },
  {
    title: "Case 2: a tenant portal",
    illustrative: true,
    facts: [
      { name: "Corpus size", value: "60 million chunks" },
      { name: "Filters", value: "Every query keeps one tenant, about 0.1 percent of the chunks" },
      { name: "Freshness", value: "New text searchable within seconds" },
      { name: "Operator", value: "A platform team with no database administrator" },
    ],
    answer: "vvs",
    why: "Size, a very selective filter and seconds of freshness are three of the four signals. A post-filtered Postgres would need a pool of about a thousand candidates for each result. A managed store with no SQL fits a team with no database administrator.",
  },
  {
    title: "Case 3: similar past tickets",
    illustrative: true,
    facts: [
      { name: "Corpus size", value: "2 million ticket embeddings, already in BigQuery" },
      { name: "Filters", value: "A date range" },
      { name: "Freshness", value: "A nightly batch" },
      { name: "Operator", value: "A data team that writes SQL" },
    ],
    answer: "bq",
    why: "The data sits in the warehouse, the work is a batch job and the team writes SQL. No request waits on the answer, so BigQuery's query latency does not matter.",
  },
  {
    title: "Case 4: chunks beside an orders table",
    illustrative: true,
    facts: [
      { name: "Corpus size", value: "4 million chunks" },
      { name: "Filters", value: "A join to an orders table and a customer id" },
      { name: "Freshness", value: "Minutes" },
      { name: "Operator", value: "A team that already runs AlloyDB" },
    ],
    answer: "alloydb",
    why: "The join is SQL and the team already runs the database. Staying in AlloyDB rewrites the least. The other options move the data or the pipeline.",
  },
  {
    title: "Case 5: PDFs and no pipeline",
    illustrative: true,
    facts: [
      { name: "Corpus size", value: "30,000 PDFs in a storage bucket" },
      { name: "Filters", value: "None" },
      { name: "Freshness", value: "A daily sync" },
      { name: "Operator", value: "Nobody who wants to own an ingest pipeline" },
    ],
    answer: "managed",
    why: "Nobody wants to write parsing, chunking and ingest code, and the managed products do that work. The price is control. You lose the chunk sizes and the content hash.",
  },
];

export default function Architecture03StackPicker({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const c = CASES[index];
  const right = pick === c.answer;

  const check = () => {
    if (pick === null) return;
    const n = attempts + 1;
    setAttempts(n);
    if (pick === c.answer || n >= 2) {
      setResolved(true);
      if (pick === c.answer && n === 1) setFirstTry((k) => k + 1);
    }
  };

  const next = () => {
    if (index + 1 < CASES.length) {
      setIndex(index + 1);
      setPick(null);
      setAttempts(0);
      setResolved(false);
    } else {
      setFinished(true);
      complete(`Picked the cheapest fit on ${firstTry} of ${CASES.length} cases on the first try`);
    }
  };

  return (
    <div className="w-panel architecture03-stack-picker">
      <div className="w-row between">
        <span className="w-label">{c.title}</span>
        <span className="architecture03-stack-picker-count">
          {index + 1} of {CASES.length}
        </span>
      </div>

      {c.illustrative && <span className="w-chip">Illustrative figures</span>}

      <dl className="architecture03-stack-picker-facts">
        {c.facts.map((f) => (
          <div key={f.name} className="architecture03-stack-picker-fact">
            <dt>{f.name}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>

      <div className="architecture03-stack-picker-group" role="radiogroup" aria-label="Your pick">
        <span className="w-label">Pick the cheapest store that fits</span>
        <div className="architecture03-stack-picker-opts">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={pick === o.id}
              className={`architecture03-stack-picker-opt${pick === o.id ? " on" : ""}`}
              disabled={resolved}
              onClick={() => setPick(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-row">
        {!resolved && (
          <button type="button" className="w-btn primary" disabled={pick === null} onClick={check}>
            Check my pick
          </button>
        )}
        {resolved && !finished && (
          <button type="button" className="w-btn ghost" onClick={next}>
            {index + 1 < CASES.length ? "Next case" : "Finish"}
          </button>
        )}
      </div>

      {attempts > 0 && !resolved && (
        <div className="w-verdict bad" role="status">
          Not quite. Ask which row of the table rewrites the least for these four numbers, then pick again.
        </div>
      )}

      {resolved && (
        <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
          <strong>{right ? "Correct. " : "Not quite. "}</strong>
          The cheapest fit is {OPTIONS.find((o) => o.id === c.answer)?.label}. {c.why}
        </div>
      )}

      {finished && (
        <div className="w-verdict good" role="status">
          You picked the cheapest fit on {firstTry} of {CASES.length} cases on the first try. The rule: a bigger store has to repay what it rewrites.
        </div>
      )}
    </div>
  );
}
