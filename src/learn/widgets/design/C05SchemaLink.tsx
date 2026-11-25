import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C05SchemaLink.css";

// Illustrative Harbour Supplies warehouse with 20 tables.
const TABLES: [string, string][] = [
  ["suppliers", "name, country, payment terms"],
  ["supplier_bank", "bank details, denied"],
  ["supplier_contacts", "people and email addresses"],
  ["invoices", "one row per invoice, with supplier, dates, total and amount outstanding"],
  ["invoice_lines", "item, quantity and price on an invoice"],
  ["ledger", "postings: account, cost centre, amount, date"],
  ["purchase_orders", "orders placed with suppliers"],
  ["po_lines", "items on an order"],
  ["goods_receipts", "deliveries received"],
  ["payments", "cash sent, one row per payment, with invoice and date"],
  ["payment_runs", "the weekly batch that groups payments"],
  ["credit_notes", "credits issued by suppliers"],
  ["cost_centres", "code and name of each cost centre, the team that spending is charged to"],
  ["gl_accounts", "account code, name and category such as packaging"],
  ["currencies", "currency codes"],
  ["fx_rates", "daily exchange rates"],
  ["approvals", "who approved which invoice"],
  ["users", "staff accounts"],
  ["audit_log", "system events"],
  ["email_inbox", "raw supplier emails"],
];

type Case = { question: string; need: string[]; optional: string[]; why: string };
const CASES: Case[] = [
  {
    question: "How much did we pay Northern Packaging in September 2026?",
    need: ["suppliers", "invoices", "payments"],
    optional: [],
    why: "Payments hold the cash and the date. They link to a supplier only through the invoice, so you need all three. The ledger also records payments, but it is a posting view and the payments table is the direct source. Payment runs only group payments.",
  },
  {
    question: "Which suppliers have invoices more than 30 days overdue, and what do we owe each?",
    need: ["suppliers", "invoices"],
    optional: ["credit_notes"],
    why: "The invoice row already carries the due date and the amount outstanding, so two tables answer it. Credit notes are an acceptable extra if you want the figure net of credits. Purchase orders and payments add joins and no information.",
  },
  {
    question: "Which cost centre spent the most on packaging in the third quarter?",
    need: ["ledger", "gl_accounts", "cost_centres"],
    optional: [],
    why: "Cost centre lives on the ledger posting, and the account category says which postings are packaging. Invoice lines look tempting, but they carry no cost centre, so the answer would need a guess.",
  },
];

const TOKENS_PER_TABLE = 120;
const FULL = TABLES.length * TOKENS_PER_TABLE;

export default function C05SchemaLink({ onComplete }: WidgetProps) {
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const complete = useComplete(onComplete);

  const c = CASES[idx];
  const missing = c.need.filter((t) => !picks.includes(t));
  const extra = picks.filter((t) => !c.need.includes(t) && !c.optional.includes(t));
  const ok = missing.length === 0 && extra.length === 0;
  const resolved = checked && (ok || attempt >= 2);
  const last = idx === CASES.length - 1;

  const toggle = (t: string) => setPicks((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const check = () => {
    const n = attempt + 1;
    setAttempt(n);
    setChecked(true);
    if (ok || n >= 2) {
      const next = [...results, ok];
      setResults(next);
      if (last) complete(`${next.filter(Boolean).length} of ${CASES.length} questions linked to the right tables`);
    }
  };

  const next = () => {
    setIdx(idx + 1);
    setPicks([]);
    setAttempt(0);
    setChecked(false);
  };

  const score = results.filter(Boolean).length;

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel design-schema-link">
        <p className="design-schema-link-hint">
          Illustrative 20-table schema. Question {idx + 1} of {CASES.length}. Choose the tables the query needs and no more.
        </p>
        <p className="design-schema-link-q">{c.question}</p>
        <div className="design-schema-link-grid" role="group" aria-label="Tables">
          {TABLES.map(([name, desc]) => (
            <button
              key={name}
              type="button"
              aria-pressed={picks.includes(name)}
              disabled={resolved}
              className={`design-schema-link-table${picks.includes(name) ? " is-on" : ""}${resolved && c.need.includes(name) ? " good" : ""}`}
              onClick={() => toggle(name)}
            >
              <span className="w-mono">{name}</span>
              <span className="design-schema-link-desc">{desc}</span>
            </button>
          ))}
        </div>
        <p className="design-schema-link-meter" aria-live="polite">
          Schema in the prompt: {picks.length * TOKENS_PER_TABLE} tokens, against {FULL} for all {TABLES.length} tables.
        </p>
        {!resolved && !checked && (
          <button type="button" className="w-btn" disabled={picks.length === 0} onClick={check}>
            Check my tables
          </button>
        )}
        <AnimatePresence>
          {checked && !resolved && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="design-schema-link-why miss" role="status">
              <p>
                Not yet. You are missing {missing.length} needed {missing.length === 1 ? "table" : "tables"} and have {extra.length} that the question does not need.
              </p>
              <button type="button" className="w-btn" onClick={() => setChecked(false)}>
                Try once more
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {resolved && (
          <div className={`design-schema-link-why ${ok ? "ok" : "miss"}`} role="status">
            <p>
              {ok ? "Correct. " : `The needed tables are ${c.need.join(", ")}. `}
              {c.why}
            </p>
            {!last && (
              <button type="button" className="w-btn" onClick={next}>
                Next question
              </button>
            )}
          </div>
        )}
        {resolved && last && (
          <div className={`w-verdict ${score >= 2 ? "good" : "bad"}`} role="status">
            {score} of {CASES.length} linked correctly. Link the smallest set that answers the question, check each join key exists, and never offer a denied table to the model.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
