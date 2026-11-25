import { useState } from "react";
import { motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useCompleteOnce } from "./c04-06-shared";
import "./C12SchemaExplorer.css";

type Col = { name: string; type: string; role: string };

const COLUMNS: Col[] = [
  {
    name: "id",
    type: "bigint identity, primary key",
    role: "The chunk's identity. Retrieval returns it, rank fusion merges lists by it, and the trace stores it. Postgres generates it, so ingestion never invents ids.",
  },
  {
    name: "doc_id",
    type: "integer, foreign key to documents, on delete cascade",
    role: "Which PEP the chunk came from. The cascade is what makes pruning work: delete a document and its chunks go with it.",
  },
  {
    name: "idx",
    type: "integer, unique with doc_id",
    role: "The chunk's position inside its document. The unique pair stops two chunks claiming the same slot.",
  },
  {
    name: "heading_path",
    type: "text[]",
    role: "The heading path, the trail of section titles above the chunk: the PEP title, then the section, then the subsection. It labels citations. It is prepended to the text only when embedding.",
  },
  {
    name: "text",
    type: "text",
    role: "The chunk body, always a slice of the document text. The reader sees it, the reranker scores it and full-text search indexes it. The heading path lives in its own column, though a heading line can sit inside the slice when the chunk opens that section.",
  },
  {
    name: "token_count",
    type: "integer",
    role: "A cheap size estimate at four characters per token, rounded up. Ingestion stores it and every hit carries it back, so a sizing check never needs the text.",
  },
  {
    name: "start_offset",
    type: "integer",
    role: "Where the chunk's text begins inside the document's text. With end_offset it makes the chunk a slice you can re-cut and check against the source.",
  },
  {
    name: "end_offset",
    type: "integer",
    role: "Where the chunk's text ends. Two neighbouring chunks overlap when one chunk's start_offset is lower than the previous chunk's end_offset.",
  },
  {
    name: "embedding",
    type: "vector(EMBED_DIM)",
    role: "The dense vector. The width is fixed when the migration runs, so a new embedding dimension needs a new database.",
  },
  {
    name: "tsv",
    type: "tsvector, generated always, stored",
    role: "The searchable form of text. Postgres rebuilds it on every write, so the sparse index can never drift from the text.",
  },
];

type Idx = { id: string; name: string; def: string; serves: string };

const INDEXES: Idx[] = [
  { id: "hnsw", name: "chunks_embedding_hnsw", def: "hnsw (embedding vector_cosine_ops)", serves: "Nearest-neighbour search by cosine distance." },
  { id: "gin", name: "chunks_tsv_gin", def: "gin (tsv)", serves: "Finding chunks whose tsv matches a text query." },
  { id: "uniq", name: "chunks_doc_id_idx_key", def: "btree (doc_id, idx), from the unique constraint", serves: "Lookups and deletes by doc_id, and the one-slot-per-chunk rule." },
  { id: "pkey", name: "chunks_pkey", def: "btree (id)", serves: "Fetching one chunk by its id." },
];

type Scenario = { sql: string; answer: string; why: string };

const SCENARIOS: Scenario[] = [
  {
    sql: "ORDER BY embedding <=> $1 LIMIT 30",
    answer: "hnsw",
    why: "The <=> operator is cosine distance, and the HNSW index was built with the cosine operator class. A mismatched operator would skip the index.",
  },
  {
    sql: "WHERE tsv @@ websearch_to_tsquery('english', $1)",
    answer: "gin",
    why: "The GIN index maps each word to the chunks that contain it. It answers the match. Ranking the matches with ts_rank_cd is separate work.",
  },
  {
    sql: "DELETE FROM chunks WHERE doc_id = 8",
    answer: "uniq",
    why: "The unique constraint made a btree on doc_id then idx. Its first column is doc_id, so it also serves this delete.",
  },
  {
    sql: "SELECT * FROM chunks WHERE id = 4120",
    answer: "pkey",
    why: "Every primary key gets a btree. Looking up one row by id is what it is for.",
  },
];

const OPTIONS = [...INDEXES.map((i) => ({ id: i.id, label: i.name })), { id: "seq", label: "No index, a sequential scan" }];

export default function C12SchemaExplorer({ onComplete }: WidgetProps) {
  const complete = useCompleteOnce(onComplete);
  const [col, setCol] = useState<Col>(COLUMNS[0]);
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<(string | null)[]>(SCENARIOS.map(() => null));

  const done = picks.every((p) => p !== null);
  const score = picks.filter((p, i) => p === SCENARIOS[i].answer).length;
  const current = SCENARIOS[step];
  const picked = picks[step];
  const lit = picked ? current.answer : null;

  function pick(id: string) {
    if (picks[step] !== null) return;
    const next = [...picks];
    next[step] = id;
    setPicks(next);
    if (next.every((p) => p !== null)) {
      const s = next.filter((p, i) => p === SCENARIOS[i].answer).length;
      complete(`Matched ${s} of ${SCENARIOS.length} queries to the structure that serves them.`);
    }
  }

  return (
    <div className="w-panel c12-schema-explorer">
      <h4 className="c12-schema-explorer-h">The chunks table. Pick a column.</h4>
      <div className="c12-schema-explorer-cols" role="group" aria-label="Columns of the chunks table">
        {COLUMNS.map((c) => (
          <button
            key={c.name}
            className={`c12-schema-explorer-col${col.name === c.name ? " is-on" : ""}`}
            aria-pressed={col.name === c.name}
            onClick={() => setCol(c)}
          >
            {c.name}
          </button>
        ))}
      </div>
      <motion.div key={col.name} className="c12-schema-explorer-detail w-inset" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} aria-live="polite">
        <code>{col.name}</code> <span className="c12-schema-explorer-type">{col.type}</span>
        <p>{col.role}</p>
      </motion.div>

      <h4 className="c12-schema-explorer-h">Its four indexes</h4>
      <div className="c12-schema-explorer-idx">
        {INDEXES.map((i) => (
          <motion.div
            key={i.id}
            className="c12-schema-explorer-card"
            data-lit={lit === i.id}
            animate={{ scale: lit === i.id ? 1.02 : 1 }}
            transition={{ duration: 0.2 }}
          >
            <b>{i.name}</b>
            <code>{i.def}</code>
            <span>{i.serves}</span>
          </motion.div>
        ))}
      </div>

      <h4 className="c12-schema-explorer-h">
        Predict. Which structure serves this query? ({Math.min(step + 1, SCENARIOS.length)} of {SCENARIOS.length})
      </h4>
      <pre className="c12-schema-explorer-sql">{current.sql}</pre>
      <div className="c12-schema-explorer-opts" role="group" aria-label="Your prediction">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            className={`w-btn ghost small${picked === o.id ? " is-on" : ""}`}
            disabled={picked !== null}
            onClick={() => pick(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {picked && (
        <div className={`w-verdict ${picked === current.answer ? "good" : "bad"}`}>
          {picked === current.answer ? "Right. " : "Not quite. "}
          {current.why}
        </div>
      )}
      <div className="w-row" style={{ marginTop: 10 }}>
        {picked && step < SCENARIOS.length - 1 && (
          <button className="w-btn small" onClick={() => setStep(step + 1)}>
            Next query
          </button>
        )}
        {done && (
          <span className="c12-schema-explorer-score">
            You matched {score} of {SCENARIOS.length}. Each structure has one job, and a query only gets fast when its operator matches the structure built for it.
          </span>
        )}
      </div>
    </div>
  );
}
