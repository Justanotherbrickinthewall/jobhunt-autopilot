import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Architecture03SwapBreaks.css";

// Each outcome follows from the capstone's own code and from the lab's tests:
// build_providers refuses a size that needs halfvec, migrate fills {{EMBED_DIM}} once, ingest embeds a
// document before it opens the write transaction, and is_thin is true when there are no hits.

type Option = { id: string; label: string };
type Case = {
  title: string;
  setup: string;
  options: Option[];
  answer: string;
  outcome: string;
  why: string;
};

const CASES: Case[] = [
  {
    title: "Case 1: a size that needs halfvec",
    setup: "You set EMBED_PROVIDER=gemini and EMBED_DIM=3072, which is the model's default size. You start the service.",
    options: [
      { id: "a", label: "build_providers raises a ValueError that names halfvec, before any call to Google." },
      { id: "b", label: "Postgres rejects the first insert." },
      { id: "c", label: "The embedder cuts each vector to 2,000 numbers." },
    ],
    answer: "a",
    outcome: "build_providers raised a ValueError. Its message names halfvec, and no call reached Google.",
    why: "A size of 3,072 needs a halfvec column, and the schema has a vector column. index_column says so before the embedder is built.",
  },
  {
    title: "Case 2: a new size and no migration",
    setup:
      "You set EMBED_PROVIDER=gemini, EMBED_MODEL=gemini-embedding-001 and EMBED_DIM=1536, then run askpep ingest. You wrote no migration, so the column is still vector(1024).",
    options: [
      { id: "a", label: "Ingest writes the new vectors, and search quality drops a little." },
      { id: "b", label: "The insert fails and rolls back, so the old chunks stay." },
      { id: "c", label: "Ingest changes the column to vector(1536) on its own." },
    ],
    answer: "b",
    outcome: "Postgres rejected the insert, because the column holds 1,024 numbers and each new vector holds 1,536. The old chunks are still there.",
    why: "Ingest embeds a document before it opens the write transaction, so a failed insert rolls back. It never changes a column. Only a migration does that.",
  },
  {
    title: "Case 3: a migration and no re-ingest",
    setup: "You run migration 007, which empties chunks and resizes the column. You start the service without running askpep ingest.",
    options: [
      { id: "a", label: "Search returns the old Voyage vectors." },
      { id: "b", label: "Every question is refused, because search finds no hits." },
      { id: "c", label: "The service refuses to start." },
    ],
    answer: "b",
    outcome: "Every question got a refusal. Nothing raised an error.",
    why: "The migration emptied chunks, so dense and sparse search return nothing. is_thin is true when there are no hits, so each answer is a refusal. Run askpep ingest to fill the table.",
  },
  {
    title: "Case 4: a new reranker and the old threshold",
    setup: "You set RERANK_PROVIDER=vertex and RERANK_MODEL=semantic-ranker-default@latest, and leave min_rerank_score at 0.2. You run the service.",
    options: [
      { id: "a", label: "It raises an error, because the threshold does not match the reranker." },
      { id: "b", label: "It runs without an error, and only an eval shows whether 0.2 still fits." },
      { id: "c", label: "It rescales the threshold to the new scores." },
    ],
    answer: "b",
    outcome: "It ran without an error. Whether 0.2 refuses too many questions or too few depends on how the new reranker scores.",
    why: "Nothing in the code ties min_rerank_score to a reranker. Run askpep eval, read refusal_rate_unanswerable, and run the retrieval slice for the rate. Then tune the threshold.",
  },
];

export default function Architecture03SwapBreaks({ onComplete }: WidgetProps) {
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
      complete(`Predicted ${firstTry} of ${CASES.length} swaps on the first try`);
    }
  };

  return (
    <div className="w-panel architecture03-swap-breaks">
      <div className="w-row between">
        <span className="w-label">{c.title}</span>
        <span className="architecture03-swap-breaks-count">
          {index + 1} of {CASES.length}
        </span>
      </div>

      <div className="architecture03-swap-breaks-scene">
        <p>
          <strong>The swap.</strong> {c.setup}
        </p>
      </div>

      <div className="architecture03-swap-breaks-group" role="radiogroup" aria-label="Your prediction">
        <span className="w-label">Predict: what happens?</span>
        <div className="architecture03-swap-breaks-opts">
          {c.options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={pick === o.id}
              className={`architecture03-swap-breaks-opt${pick === o.id ? " on" : ""}`}
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
            Check my prediction
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
          Not quite. Ask what the code checks, what it leaves alone, and what the missing step would have done.
        </div>
      )}

      {resolved && (
        <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
          <strong>{right ? "Correct. " : "Not quite. "}</strong>
          {c.outcome} {c.why}
        </div>
      )}

      {finished && (
        <div className="w-verdict good" role="status">
          You predicted {firstTry} of {CASES.length} swaps on the first try. Cases 1 and 2 stop with an error you can see. Cases 3 and 4 fail in silence, so only an eval finds them.
        </div>
      )}
    </div>
  );
}
