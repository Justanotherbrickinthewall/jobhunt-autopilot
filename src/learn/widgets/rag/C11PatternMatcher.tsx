import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { useOnce } from "./c1012shared";
import "./C11PatternMatcher.css";

type P = { id: string; label: string; fixes: string };
const PATTERNS: P[] = [
  { id: "agentic", label: "Iterative or agentic retrieval", fixes: "dependent multi-hop questions where the next search needs the last result" },
  { id: "graph", label: "GraphRAG", fixes: "whole-corpus and relationship questions that no top-k can answer" },
  { id: "contextual", label: "Contextual retrieval", fixes: "chunks that cannot be found because they never name their subject" },
  { id: "late", label: "Late chunking", fixes: "chunk vectors that lost the document around them, without an LLM call per chunk" },
  { id: "multimodal", label: "Multimodal RAG", fixes: "answers that live in charts, scans and diagrams" },
  { id: "longctx", label: "Long context instead of RAG", fixes: "a small, stable corpus used by a few people" },
  { id: "sql", label: "Text-to-SQL", fixes: "counts, sums and filters over structured rows" },
];

// Shuffled display order, fixed so the layout is stable.
const FAILURES: { id: string; text: string }[] = [
  { id: "sql", text: "Users ask how many tickets closed per region last quarter, and the system returns five similar ticket texts." },
  { id: "contextual", text: "A paragraph says the change was accepted, but never names which proposal. Searching for the proposal's name never finds it." },
  { id: "graph", text: "Asked for the main recurring themes across all eighteen PEPs, the system answers from five random chunks." },
  { id: "multimodal", text: "The figure that answers the question is a bar chart in a PDF, and text extraction dropped it." },
  { id: "agentic", text: "To answer, you must first find which PEP proposes an optional GIL, and only then search for the PEPs it references." },
  { id: "longctx", text: "A 40-page handbook for one team never changes, and six people query it a few times a day." },
  { id: "late", text: "Pronouns in later paragraphs lose their meaning when each chunk is embedded alone, and you want a fix with no extra LLM spend at indexing." },
];

export default function C11PatternMatcher({ onComplete }: WidgetProps) {
  const reduce = useReducedMotion();
  const complete = useOnce(onComplete);
  const [sel, setSel] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, boolean>>({});
  const [firstTry, setFirstTry] = useState<Record<string, boolean>>({});
  const [tried, setTried] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);

  function pickFailure(fid: string) {
    if (!sel || matched[fid]) return;
    if (sel === fid) {
      const next = { ...matched, [fid]: true };
      setMatched(next);
      const ft = { ...firstTry };
      if (!tried[sel]) ft[sel] = true;
      setFirstTry(ft);
      const p = PATTERNS.find((x) => x.id === sel)!;
      setMsg({ ok: true, text: `Correct. ${p.label} targets ${p.fixes}.` });
      setSel(null);
      if (Object.keys(next).length === PATTERNS.length) {
        const n = Object.keys(ft).length;
        const v = `${n} of ${PATTERNS.length} matched on the first try.`;
        setVerdict(v);
        complete(v);
      }
    } else {
      setTried({ ...tried, [sel]: true });
      const p = PATTERNS.find((x) => x.id === sel)!;
      setMsg({ ok: false, text: `Not that one. ${p.label} targets ${p.fixes}.` });
    }
  }

  const done = Object.keys(matched).length;
  const firstCount = Object.keys(firstTry).length;

  return (
    <div className="w-panel c11pm-root">
      <p className="c11pm-lead">
        Select a pattern, then select the failure it fixes. Matched pairs lock. <strong>{done}</strong> of {PATTERNS.length} matched.
      </p>
      <div className="c11pm-grid">
        <div className="c11pm-col" role="group" aria-label="Patterns">
          <p className="c11pm-h">Pattern</p>
          {PATTERNS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={!!matched[p.id]}
              aria-pressed={sel === p.id}
              className={"c11pm-btn" + (sel === p.id ? " sel" : "") + (matched[p.id] ? " done" : "")}
              onClick={() => { setSel(p.id); setMsg(null); }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="c11pm-col" role="group" aria-label="Failures">
          <p className="c11pm-h">Failure</p>
          {FAILURES.map((f) => (
            <motion.button
              key={f.id}
              type="button"
              disabled={!!matched[f.id] || !sel}
              className={"c11pm-btn f" + (matched[f.id] ? " done" : "")}
              onClick={() => pickFailure(f.id)}
              animate={matched[f.id] && !reduce ? { scale: [1, 1.02, 1] } : undefined}
              transition={{ duration: 0.25 }}
            >
              {f.text}
              {matched[f.id] && <span className="c11pm-tag"> matched: {PATTERNS.find((p) => p.id === f.id)!.label}</span>}
            </motion.button>
          ))}
        </div>
      </div>
      {msg && (
        <p className={"c11pm-msg " + (msg.ok ? "ok" : "no")} role="status">
          {msg.text}
        </p>
      )}
      {verdict && (
        <p className={"w-verdict " + (firstCount >= 6 ? "good" : "bad")} role="status">
          {verdict}{" "}
          {firstCount >= 6
            ? "You can prescribe these by symptom. That is the interview skill."
            : "Review the ones you missed first time. The question to ask each time is what exactly failed, retrieval, ranking, context or arithmetic."}
        </p>
      )}
    </div>
  );
}
