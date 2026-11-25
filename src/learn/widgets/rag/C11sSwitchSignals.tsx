import { useState } from "react";
import type { WidgetProps } from "../types";
import { useOnce } from "./c1012shared";
import "./C11sStack.css";

type Call = "stay" | "measure" | "switch";
const LABEL: Record<Call, string> = { stay: "Stay put", measure: "Measure first", switch: "Switch now" };

const CASES: { text: string; answer: Call; why: string }[] = [
  { text: "The team runs pgvector over 400,000 chunks. A colleague says a dedicated vector database is what serious teams use.", answer: "stay", why: "That is taste, not a signal. At this size pgvector is far inside its comfort zone, and a new system adds an operating cost." },
  { text: "Filtered queries on pgvector return fewer than ten results for tenants with small corpora. Unfiltered queries are fine.", answer: "measure", why: "This is the filter trap from chapter 5. First measure recall and result counts under your real filters, and try the iterative scan and partitioning options. If those fail, you have your switch signal." },
  { text: "The p95 vector query is 1.4 seconds, the p95 budget is 400 milliseconds, and the query plan from EXPLAIN shows the HNSW index is not being used.", answer: "measure", why: "The index is not in use, so the engine is not the problem yet. Fix the query or the index first, then re-measure." },
  { text: "The customer has 300 million vectors and a growth plan to a billion. One Postgres node cannot hold the index in memory.", answer: "switch", why: "This is a scale signal with arithmetic behind it. A store designed to shard and distribute the index is the honest answer." },
  { text: "Your framework upgrade changed a retriever default, and retrieval quality dropped silently for a week.", answer: "measure", why: "Measure what changed before you drop the framework. An eval in CI would have caught it. Pinning versions and owning the retrieval step is the likely fix." },
  { text: "The framework's agent abstraction now needs retries, human approval and resumable state, and you are fighting it on every change.", answer: "switch", why: "You are paying the framework's cost without its benefit. Move that layer to an explicit state machine such as LangGraph, or to your own code." },
  { text: "The customer's compliance team requires data to stay in one region and has already approved their existing cloud search service.", answer: "stay", why: "Constraints decide first. Using what is already approved and running beats a better benchmark on a service that needs a fresh review." },
  { text: "Your sparse retrieval is Postgres full text search, and users keep searching exact part numbers with typos and partial strings.", answer: "measure", why: "Build a golden set of those queries and compare the ranking. Trigram matching, which compares three-letter pieces of words, or a BM25 engine may fix it. Switch only when the numbers show full text search is the cap." },
];

export default function C11sSwitchSignals({ onComplete }: WidgetProps) {
  const complete = useOnce(onComplete);
  const [given, setGiven] = useState<Record<number, Call>>({});
  const answered = Object.keys(given).length;
  const correct = CASES.filter((c, i) => given[i] === c.answer).length;

  function pick(i: number, v: Call) {
    if (given[i]) return;
    const next = { ...given, [i]: v };
    setGiven(next);
    if (Object.keys(next).length === CASES.length) {
      const score = CASES.filter((c, j) => next[j] === c.answer).length;
      complete(`${score} of ${CASES.length} calls matched.`);
    }
  }

  return (
    <div className="w-panel c11s-root">
      <p className="c11s-note" style={{ marginTop: 0 }}>For each situation, decide first. The reasoning appears after you commit.</p>
      {CASES.map((c, i) => {
        const g = given[i];
        return (
          <div key={i} className={"c11s-card" + (g ? " is-done" : "")}>
            <p>{c.text}</p>
            <div className="c11s-opts" role="group" aria-label={`Decision for situation ${i + 1}`}>
              {(Object.keys(LABEL) as Call[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={"c11s-pick" + (g ? (k === c.answer ? " is-right" : k === g ? " is-wrong" : "") : "")}
                  disabled={!!g}
                  onClick={() => pick(i, k)}
                >
                  {LABEL[k]}
                </button>
              ))}
            </div>
            {g && <p className="c11s-explain"><strong>{g === c.answer ? "Right. " : `Better call: ${LABEL[c.answer]}. `}</strong>{c.why}</p>}
          </div>
        );
      })}
      {answered === CASES.length && (
        <p className={"w-verdict " + (correct >= 6 ? "good" : "bad")} role="status">
          {correct} of {CASES.length}. {correct >= 6 ? "You separate taste from signal." : "Most misses come from switching on a feeling. Ask what number would change your mind."}
        </p>
      )}
      <div className="w-row">
        {answered > 0 && <button type="button" className="w-btn ghost small" onClick={() => setGiven({})}>Reset</button>}
      </div>
    </div>
  );
}
