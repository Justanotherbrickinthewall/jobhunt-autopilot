import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Llmops03TwoTraces.css";

// CHECK: every time and id in this widget is made up, to show the shape of the spans. The shape comes from
// capstone/src/askpep/agents/graph.py, agents/tools.py and retrieval.py at the revision 5 merge, where
// `search_peps` calls `search`, and `search` opens its own `Trace` on the route `agent.search`.
// Re-check it if the retrieval spans are ever nested under the desk's request span.

type Row = { name: string; start: number; dur: number; depth: number; note?: string };
type View = { id: "a" | "b"; title: string; route: string; thread: string; traceId: string; rows: Row[] };

const TOTAL = 2600;

const VIEWS: View[] = [
  {
    id: "a",
    title: "Trace A",
    route: "agent",
    thread: "th-1",
    traceId: "7c1e9a04…",
    rows: [
      { name: "askpep.request", start: 0, dur: 2600, depth: 0 },
      { name: "chat <model>", start: 0, dur: 400, depth: 1, note: "agent triage" },
      { name: "chat <model>", start: 400, dur: 700, depth: 1, note: "agent researcher, asks for a search" },
      { name: "execute_tool search_peps", start: 1100, dur: 800, depth: 1, note: "no spans under it" },
      { name: "chat <model>", start: 1900, dur: 700, depth: 1, note: "agent researcher, writes the answer" },
    ],
  },
  {
    id: "b",
    title: "Trace B",
    route: "agent.search",
    thread: "none",
    traceId: "e03b51d8…",
    rows: [
      { name: "askpep.request", start: 1120, dur: 760, depth: 0 },
      { name: "askpep.embed", start: 1130, dur: 120, depth: 1 },
      { name: "askpep.dense", start: 1250, dur: 190, depth: 1 },
      { name: "askpep.sparse", start: 1440, dur: 90, depth: 1 },
      { name: "askpep.fuse", start: 1530, dur: 10, depth: 1 },
      { name: "askpep.rerank", start: 1540, dur: 330, depth: 1 },
    ],
  },
];

const GUESSES = ["One trace", "Two traces", "Four traces"];
const GUESS_RIGHT = 1;

type Q = { id: string; q: string; options: string[]; answer: number; why: string };
const QS: Q[] = [
  {
    id: "where",
    q: "Which trace holds the askpep.dense span of this search?",
    options: [
      "Trace A, under execute_tool search_peps",
      "Trace B, under its own askpep.request",
      "Neither, because the desk never opens it",
    ],
    answer: 1,
    why: "The search made its own trace. Its stage spans sit under its own root. The tool span in trace A shows how long the search took and has nothing under it.",
  },
  {
    id: "match",
    q: "Trace B has no thread id. How do you find it from trace A?",
    options: ["By the thread id", "By the trace id", "By the start time and the route"],
    answer: 2,
    why: "The two traces share no id. Trace B started while the tool span of trace A was open, and its route is agent.search. That is all you have to match them.",
  },
];

const pct = (ms: number) => `${(ms / TOTAL) * 100}%`;
const fmt = (n: number) => n.toLocaleString("en-GB");

export default function Llmops03TwoTraces({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [guess, setGuess] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [ans, setAns] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState(false);

  const allAnswered = QS.every((q) => ans[q.id] !== undefined);
  const score = QS.filter((q) => ans[q.id] === q.answer).length;

  const check = () => {
    setChecked(true);
    complete(
      `predicted ${guess === null ? "nothing" : GUESSES[guess].toLowerCase()}, answered ${score} of ${QS.length} questions about the two traces`,
    );
  };

  return (
    <div className="w-panel llmops03-two-traces">
      <p className="llmops03-two-traces-note">
        One question goes to the PEP desk. The triage agent routes it to the researcher, and the researcher calls
        search_peps once. All times and ids below are made up.
      </p>

      <fieldset className="llmops03-two-traces-guess" disabled={locked}>
        <legend className="w-label">Predict first</legend>
        <p className="llmops03-two-traces-q">How many traces does Cloud Trace hold for this one question?</p>
        <div className="llmops03-two-traces-opts" role="radiogroup" aria-label="Your prediction">
          {GUESSES.map((g, i) => (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={guess === i}
              className={`w-chip${guess === i ? " is-on" : ""}`}
              onClick={() => setGuess(i)}
            >
              {g}
            </button>
          ))}
        </div>
        {!locked && (
          <div className="w-row">
            <button type="button" className="w-btn primary" disabled={guess === null} onClick={() => setLocked(true)}>
              Lock in my prediction
            </button>
          </div>
        )}
      </fieldset>

      {locked && (
        <>
          <div className={`w-verdict ${guess === GUESS_RIGHT ? "good" : "bad"}`} role="status">
            {guess === GUESS_RIGHT ? "Right. " : `You predicted ${GUESSES[guess ?? 0].toLowerCase()}. `}
            The desk makes one trace, and the search makes another. Here they are on one time line.
          </div>

          {VIEWS.map((v) => (
            <section key={v.id} className="llmops03-two-traces-trace" aria-label={v.title}>
              <div className="llmops03-two-traces-head">
                <strong>{v.title}</strong>
                <span className="w-chip">route {v.route}</span>
                <span className="w-chip">thread id {v.thread}</span>
                <span className="w-chip w-mono">trace id {v.traceId}</span>
              </div>
              <ol className="llmops03-two-traces-rows">
                {v.rows.map((r, i) => (
                  <li key={`${v.id}-${i}`} className={`llmops03-two-traces-row depth${r.depth}`}>
                    <span className="llmops03-two-traces-name w-mono">{r.name}</span>
                    <span className="llmops03-two-traces-ms w-mono">{fmt(r.dur)} ms</span>
                    <span className="llmops03-two-traces-track" aria-hidden="true">
                      <span className="llmops03-two-traces-bar" style={{ left: pct(r.start), width: `max(2px, ${pct(r.dur)})` }} />
                    </span>
                    {r.note && <span className="llmops03-two-traces-rownote">{r.note}</span>}
                  </li>
                ))}
              </ol>
            </section>
          ))}

          {QS.map((q) => (
            <div key={q.id} className="llmops03-two-traces-judge">
              <div className="llmops03-two-traces-q">{q.q}</div>
              <div className="llmops03-two-traces-opts" role="radiogroup" aria-label={q.q}>
                {q.options.map((o, i) => (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={ans[q.id] === i}
                    disabled={checked}
                    className={`w-chip${ans[q.id] === i ? " is-on" : ""}`}
                    onClick={() => setAns((a) => ({ ...a, [q.id]: i }))}
                  >
                    {o}
                  </button>
                ))}
              </div>
              {checked && (
                <p className="llmops03-two-traces-why" role="status">
                  {ans[q.id] === q.answer ? "Right. " : "Not quite. "}
                  {q.why}
                </p>
              )}
            </div>
          ))}

          {!checked && (
            <div className="w-row">
              <button type="button" className="w-btn primary" disabled={!allAnswered} onClick={check}>
                Check my answers
              </button>
            </div>
          )}

          {checked && (
            <div className={`w-verdict ${score === QS.length ? "good" : "bad"}`} role="status">
              {score} of {QS.length} right. A desk question that searches once is two traces, and one that searches twice
              is three. The retrieval stages are in the search traces, so the desk trace can't tell you where retrieval
              spent its time. The reports that count requests skip the route agent.search, so a search trace is never a request.
            </div>
          )}
        </>
      )}
    </div>
  );
}
