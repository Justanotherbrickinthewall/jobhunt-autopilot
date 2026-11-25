import { useId, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Architecture06StoreSorter.css";

// Eight things that happen in AskPEP. Each one has exactly one home in the capstone today.
// The homes come from capstone/src/askpep/db.py, services.py, agents/memory.py, cache.py and the migrations.

type StoreId = "checkpoint" | "notes" | "table" | "memory" | "repo";

type Store = { id: StoreId; label: string };

const STORES: Store[] = [
  { id: "checkpoint", label: "The checkpoint tables in Postgres" },
  { id: "notes", label: "The store table in Postgres" },
  { id: "table", label: "An AskPEP table in Postgres" },
  { id: "memory", label: "The memory of one process" },
  { id: "repo", label: "A file in Git" },
];

type Card = { id: string; what: string; answer: StoreId; why: string };

const CARDS: Card[] = [
  {
    id: "paused",
    what: "A desk run pauses and waits for a person to approve a ticket.",
    answer: "checkpoint",
    why: "The desk saves its state after each graph step. The checkpoint tables hold it, and a resume reads it from there.",
  },
  {
    id: "note",
    what: "The desk learns that one user prefers short answers, and should still know it next week.",
    answer: "notes",
    why: "`remember` writes a note to the store table, under the namespace askpep, notes and the user id.",
  },
  {
    id: "ticket",
    what: "The ticket \"Fix the PEP 572 page\", filed once, with its idempotency key.",
    answer: "table",
    why: "`open_ticket` inserts it into the `tickets` table. That table is AskPEP's own, made by a migration.",
  },
  {
    id: "trace",
    what: "The record of which model answered one request, what it cost and why it stopped.",
    answer: "table",
    why: "`Trace.write` inserts one row into `traces` for each request.",
  },
  {
    id: "approval",
    what: "The record that a named person approved a ticket.",
    answer: "table",
    why: "The audit sink inserts it into `audit`. The table is append-only by design.",
  },
  {
    id: "thumbs",
    what: "A thumbs-down on one answer.",
    answer: "table",
    why: "`record_feedback` inserts it into the `feedback` table.",
  },
  {
    id: "cached",
    what: "The answer to \"What does PEP 8 say about line length?\", kept for the next person who asks, with the cache turned on.",
    answer: "memory",
    why: "The cache is an `InMemoryCache`. It lives in one process, expires entries after 3600 seconds, and a restart clears it.",
  },
  {
    id: "golden",
    what: "The golden set of questions that the release gate runs.",
    answer: "repo",
    why: "`evals/golden.jsonl` is a file in Git. A pull request changes it, so its history is the repository's history.",
  },
];

export default function Architecture06StoreSorter({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const baseId = useId();
  const [picks, setPicks] = useState<Record<string, StoreId | "">>({});
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);

  const allPicked = CARDS.every((c) => picks[c.id]);
  const rightCount = CARDS.filter((c) => picks[c.id] === c.answer).length;
  const showMarks = attempts > 0;

  const check = () => {
    if (!allPicked) return;
    const k = attempts + 1;
    setAttempts(k);
    const right = CARDS.every((c) => picks[c.id] === c.answer);
    if (right || k >= 2) {
      setResolved(true);
      complete(
        right && k === 1
          ? "Placed all eight kinds of state on the first try"
          : right
            ? "Placed all eight kinds of state on the second try"
            : "Needed the explanations to place the eight kinds of state",
      );
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel architecture06-store-sorter">
        <div className="w-row between">
          <span className="w-label">Eight pieces of state</span>
          <span className="architecture06-store-sorter-count">{showMarks ? `${rightCount} of ${CARDS.length} placed correctly` : "Predict first"}</span>
        </div>

        <ol className="architecture06-store-sorter-list">
          {CARDS.map((card, i) => {
            const pick = picks[card.id] ?? "";
            const right = pick === card.answer;
            const selectId = `${baseId}-${card.id}`;
            return (
              <li key={card.id} className={`architecture06-store-sorter-card${showMarks && pick ? (right ? " right" : resolved ? " wrong" : " retry") : ""}`}>
                <div className="architecture06-store-sorter-what">
                  <span className="architecture06-store-sorter-n">{i + 1}</span>
                  <label htmlFor={selectId}>{card.what}</label>
                </div>
                <select
                  id={selectId}
                  className="architecture06-store-sorter-select"
                  value={pick}
                  disabled={resolved}
                  onChange={(e) => setPicks((p) => ({ ...p, [card.id]: e.target.value as StoreId }))}
                >
                  <option value="">Choose a store</option>
                  {STORES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {showMarks && pick && !resolved && (
                  <span className={`w-chip ${right ? "good" : "warn"}`}>{right ? "Right" : "Not yet"}</span>
                )}
                {resolved && (
                  <motion.p className="architecture06-store-sorter-why" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                    <span className={`w-chip ${right ? "good" : "bad"}`}>{right ? "Right" : `Should be: ${STORES.find((s) => s.id === card.answer)?.label}`}</span>{" "}
                    {renderTicks(card.why)}
                  </motion.p>
                )}
              </li>
            );
          })}
        </ol>

        {!resolved && (
          <div className="w-row">
            <button type="button" className="w-btn primary" disabled={!allPicked} onClick={check}>
              Check my map
            </button>
            {attempts > 0 && (
              <span className="architecture06-store-sorter-hint" role="status">
                {rightCount} of {CARDS.length} are right. Change the ones marked Not yet.
              </span>
            )}
          </div>
        )}

        {resolved && (
          <div className={`w-verdict ${rightCount === CARDS.length ? "good" : "bad"}`} role="status">
            <strong>{rightCount === CARDS.length ? "Every piece is placed." : `${rightCount} of ${CARDS.length} were right.`}</strong> Six of the eight sit in Postgres, in three different kinds of table.
            One lives in the memory of a process and one in Git. Each has one home, and only the cache has a rule that ends its life.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}

// Turn `code` spans in the explanation into <code> elements.
function renderTicks(text: string) {
  return text.split("`").map((part, i) =>
    i % 2 === 1 ? (
      <code key={i} className="w-mono">
        {part}
      </code>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
