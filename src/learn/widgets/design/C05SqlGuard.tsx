import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C05SqlGuard.css";

type Query = { sql: string; note: string };

// The generated queries are illustrative. Exactly one breaks the policy.
const QUERIES: Query[] = [
  {
    sql: "SELECT s.name, SUM(i.total_gbp) AS owed\nFROM invoices i\nJOIN suppliers s ON s.id = i.supplier_id\nWHERE i.status = 'open'\nGROUP BY s.name\nORDER BY owed DESC\nLIMIT 20",
    note: "Allowed. It reads only permitted columns, it is a single SELECT and it carries its own limit.",
  },
  {
    sql: "SELECT COUNT(*)\nFROM invoices\nWHERE due_date < CURRENT_DATE\n  AND status = 'open'",
    note: "Allowed. An aggregate returns one row, so the missing LIMIT does not matter. The invoices table is small enough for the time-out.",
  },
  {
    sql: "WITH late AS (\n  SELECT supplier_id, COUNT(*) AS n\n  FROM invoices\n  WHERE due_date < CURRENT_DATE - 30\n  GROUP BY supplier_id\n)\nSELECT s.name, late.n\nFROM late\nJOIN suppliers s ON s.id = late.supplier_id\nORDER BY late.n DESC\nLIMIT 10",
    note: "Allowed. The subquery looks complicated, but every table and column in it is permitted. Complexity is not a policy rule.",
  },
  {
    sql: "SELECT s.name, s.iban\nFROM suppliers s\nWHERE s.name ILIKE '%Northern%'\nLIMIT 5",
    note: "Blocked. The suppliers table is allowed, but the iban column is denied. A check on table names alone would miss it, so the parser must check columns.",
  },
  {
    sql: "SELECT invoice_no, total_gbp\nFROM invoices\nWHERE supplier_id = $1\n  AND issued_on >= $2\nLIMIT 200",
    note: "Allowed. The values are bound parameters, the columns are permitted and the limit is under the cap.",
  },
  {
    sql: "SELECT account, SUM(amount_gbp) AS total\nFROM ledger\nWHERE posted_on BETWEEN '2026-09-01' AND '2026-09-30'\nGROUP BY account",
    note: "Allowed. The ledger has a date range, which the policy requires. The runner binds the literals and caps the rows, so the missing LIMIT is harmless.",
  },
];
const BAD = 3;

const REASONS = [
  "It writes or changes data",
  "It reads a denied column",
  "It has no date range on the ledger",
  "It has no row limit",
];
const REASON_ANSWER = 1;
const REASON_WHY = [
  "Every query here is a SELECT, and the role is read-only anyway.",
  "The deny list covers columns as well as tables, and a column can hide inside an allowed table.",
  "Only the last query touches the ledger, and it has a date range.",
  "The runner appends a row cap, and the aggregates return few rows.",
];

export default function C05SqlGuard({ onComplete }: WidgetProps) {
  const [q, setQ] = useState<number | null>(null);
  const [r, setR] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);

  const correct = q === BAD && r === REASON_ANSWER;
  const done = checked && (correct || attempt >= 2);

  const check = () => {
    const n = attempt + 1;
    setAttempt(n);
    setChecked(true);
    const ok = q === BAD && r === REASON_ANSWER;
    if (ok || n >= 2) complete(`${ok ? "Found the unsafe query and its rule" : "Shown the unsafe query and its rule"} on attempt ${n}`);
  };

  const retry = () => setChecked(false);

  let hint = "";
  if (checked && !correct) {
    if (q !== BAD && q !== null) hint = `Query ${q + 1} is safe. ${QUERIES[q].note}`;
    else hint = `Right query, wrong rule. ${r !== null ? REASON_WHY[r] : ""}`;
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel design-sql-guard">
        <p className="design-sql-guard-hint">
          Illustrative queries from the Harbour Supplies finance assistant. One breaks the policy. Pick it, then pick the rule it breaks.
        </p>
        <div className="design-sql-guard-policy w-inset">
          <span className="w-label">Policy</span>
          <ul>
            <li>Read-only role, one SELECT per query.</li>
            <li>
              Denied columns: <code>suppliers.iban</code> and <code>suppliers.sort_code</code>.
            </li>
            <li>Ledger queries need a date range.</li>
            <li>The runner binds literals, adds a row cap of 500 and stops at 10 seconds.</li>
          </ul>
        </div>
        <div role="radiogroup" aria-label="Generated queries" className="design-sql-guard-list">
          {QUERIES.map((qu, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={q === i}
              disabled={done}
              className={`design-sql-guard-card${q === i ? " is-on" : ""}${done && i === BAD ? " is-bad" : ""}`}
              onClick={() => setQ(i)}
            >
              <span className="w-label">Query {i + 1}</span>
              <pre className="design-sql-guard-sql">{qu.sql}</pre>
            </button>
          ))}
        </div>
        <p className="design-sql-guard-ask">Which rule does it break?</p>
        <div className="w-row" role="radiogroup" aria-label="Rule broken">
          {REASONS.map((t, i) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={r === i}
              disabled={done}
              className={`w-chip${r === i ? " is-on" : ""}${done && i === REASON_ANSWER ? " good" : ""}`}
              onClick={() => setR(i)}
            >
              {t}
            </button>
          ))}
        </div>
        {!done && !checked && (
          <button type="button" className="w-btn" disabled={q === null || r === null} onClick={check}>
            Check my answer
          </button>
        )}
        <AnimatePresence>
          {checked && !done && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="design-sql-guard-why miss" role="status">
              <p>{hint}</p>
              <button type="button" className="w-btn" onClick={retry}>
                Try once more
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {done && (
          <div className={`w-verdict ${correct ? "good" : "bad"}`} role="status">
            <p>{correct ? "Correct. " : "The unsafe query is query 4, and it breaks the denied column rule. "}{QUERIES[BAD].note}</p>
            <p>The other five are safe: {QUERIES.filter((_, i) => i !== BAD).map((x) => x.note.replace(/^Allowed\. /, "")).join(" ")}</p>
            <p>The lesson: check every table and column the query touches, including inside subqueries, and back the parser with column grants on the read-only role.</p>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
