import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents05CallTrace.css";

// CHECK: every number in this widget comes from one offline run of the reference code's desk on 8 November 2026. It used the fake desk model (PROVIDERS=fake) and a local store of the five fixture PEPs, and the question "Which operator does the assignment expression proposal add?". The fake counts the characters of every message it is sent, at four characters a token, and its replies are canned. A live Gemini run on the 18 PEPs will give different calls and tokens. Re-capture them with a live run before relying on them.

type DesignId = "handoffs" | "supervisor" | "baseline";
type Call = { agent: string; did: string; tin: number; tout: number };
type Design = { id: DesignId; label: string; blurb: string; calls: Call[]; takeaway: string };

const DESIGNS: Design[] = [
  {
    id: "handoffs",
    label: "Handoffs",
    blurb: "Triage picks an agent, and the agent answers.",
    calls: [
      { agent: "Triage", did: "Picks the route researcher.", tin: 117, tout: 1 },
      { agent: "Researcher", did: "Calls search_peps with the question.", tin: 245, tout: 1 },
      { agent: "Researcher", did: "Reads the search result and answers with [1].", tin: 1046, tout: 10 },
    ],
    takeaway: "Triage adds one call and 117 tokens before any work starts.",
  },
  {
    id: "supervisor",
    label: "Supervisor",
    blurb: "One agent keeps control and calls the researcher as a tool.",
    calls: [
      { agent: "Supervisor", did: "Calls call_researcher with a task.", tin: 191, tout: 1 },
      { agent: "Researcher", did: "Calls search_peps with the task.", tin: 245, tout: 1 },
      { agent: "Researcher", did: "Reads the search result and answers with [1].", tin: 1046, tout: 10 },
      { agent: "Supervisor", did: "Reads the worker's answer and replies with [1].", tin: 201, tout: 10 },
    ],
    takeaway:
      "The supervisor adds two calls. Its second call is short, because the search result stayed inside the worker.",
  },
  {
    id: "baseline",
    label: "Baseline",
    blurb: "One agent holds all five tools.",
    calls: [
      { agent: "Baseline", did: "Calls search_peps with the question.", tin: 220, tout: 1 },
      { agent: "Baseline", did: "Reads the search result and answers with [1].", tin: 1021, tout: 10 },
    ],
    takeaway: "No second agent, so no extra calls. The search result is the biggest cost.",
  },
];

const MAX_IN = Math.max(...DESIGNS.flatMap((d) => d.calls.map((c) => c.tin)));
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const fmt = (n: number) => n.toLocaleString("en-GB");
const total = (d: Design) => sum(d.calls.map((c) => c.tin + c.tout));
const callsWord = (n: number) => (n === 1 ? "1 model call" : `${n} model calls`);

export default function Agents05CallTrace({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [guess, setGuess] = useState<DesignId | null>(null);
  const [locked, setLocked] = useState(false);
  const [design, setDesign] = useState<DesignId>("handoffs");
  const [shown, setShown] = useState<Record<DesignId, number>>({ handoffs: 0, supervisor: 0, baseline: 0 });

  const current = DESIGNS.find((d) => d.id === design) ?? DESIGNS[0];
  const n = shown[design];
  const rows = current.calls.slice(0, n);
  const finished = (d: Design) => shown[d.id] === d.calls.length;
  const currentDone = finished(current);
  const allDone = DESIGNS.every(finished);
  const most = DESIGNS.reduce((a, b) => (b.calls.length > a.calls.length ? b : a));

  const next = () => {
    const updated = { ...shown, [design]: Math.min(n + 1, current.calls.length) };
    setShown(updated);
    if (DESIGNS.every((d) => updated[d.id] === d.calls.length)) {
      complete(`traced all three designs, predicted ${guess ?? "nothing"}, most calls ${most.id}`);
    }
  };
  const restart = () => setShown((s) => ({ ...s, [design]: 0 }));

  return (
    <div className="w-panel agents05-call-trace">
      <p className="agents05-call-trace-note">
        An offline run of the desk with the fake desk model from lab step 6, on the PEP 572 question. The token counts are the fake&apos;s
        own, at four characters a token. Its replies are canned.
      </p>

      <fieldset className="agents05-call-trace-guess" disabled={locked}>
        <legend className="w-label">Predict first</legend>
        <p className="agents05-call-trace-q">Which design makes the most model calls on this question?</p>
        <div className="agents05-call-trace-opts" role="radiogroup" aria-label="Your prediction">
          {DESIGNS.map((d) => (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={guess === d.id}
              className={`agents05-call-trace-opt${guess === d.id ? " on" : ""}`}
              onClick={() => setGuess(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>
        {!locked && (
          <div className="w-row">
            <button type="button" className="w-btn primary" disabled={!guess} onClick={() => setLocked(true)}>
              Lock in my prediction
            </button>
          </div>
        )}
      </fieldset>

      {locked && (
        <>
          <div className="agents05-call-trace-tabs" role="tablist" aria-label="Design">
            {DESIGNS.map((d) => (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={design === d.id}
                className={`agents05-call-trace-tab${design === d.id ? " on" : ""}`}
                onClick={() => setDesign(d.id)}
              >
                {d.label}
                {finished(d) ? " (traced)" : ""}
              </button>
            ))}
          </div>

          <div role="tabpanel" className="agents05-call-trace-panel">
            <p className="agents05-call-trace-blurb">{current.blurb}</p>
            {rows.length === 0 && <p className="agents05-call-trace-empty">No calls yet. Press Next call.</p>}
            <ol className="agents05-call-trace-rows">
              {rows.map((c, i) => (
                <li key={`${design}-${i}`} className={`agents05-call-trace-row${i === n - 1 ? " now" : ""}`}>
                  <span className="agents05-call-trace-num">{i + 1}</span>
                  <span className="w-chip">{c.agent}</span>
                  <span className="agents05-call-trace-did">{c.did}</span>
                  <span className="agents05-call-trace-tok w-mono">
                    {fmt(c.tin)} in, {fmt(c.tout)} out
                  </span>
                  <span className="agents05-call-trace-bar" aria-hidden="true">
                    <span style={{ width: `${Math.max(2, (c.tin / MAX_IN) * 100)}%` }} />
                  </span>
                </li>
              ))}
            </ol>

            <div className="agents05-call-trace-totals w-inset" aria-live="polite">
              <span>
                <span className="w-label">Model calls</span> <strong>{n}</strong>
              </span>
              <span>
                <span className="w-label">Tokens in</span> <strong>{fmt(sum(rows.map((c) => c.tin)))}</strong>
              </span>
              <span>
                <span className="w-label">Tokens out</span> <strong>{fmt(sum(rows.map((c) => c.tout)))}</strong>
              </span>
            </div>

            <div className="w-row">
              <button type="button" className="w-btn primary" disabled={currentDone} onClick={next}>
                Next call
              </button>
              <button type="button" className="w-btn ghost" disabled={n === 0} onClick={restart}>
                Start this design again
              </button>
            </div>

            {currentDone && (
              <div className="w-verdict" role="status">
                {current.takeaway}
              </div>
            )}
          </div>
        </>
      )}

      {allDone && (
        <div className={`w-verdict ${guess === most.id ? "good" : "bad"}`} role="status">
          {guess === most.id ? "Right. " : `You predicted ${DESIGNS.find((d) => d.id === guess)?.label ?? "a design"}. `}
          The {most.label.toLowerCase()} design made the most calls, with {callsWord(most.calls.length)}. In total tokens
          the supervisor read and wrote {fmt(total(DESIGNS[1]))}, the handoffs {fmt(total(DESIGNS[0]))} and the baseline{" "}
          {fmt(total(DESIGNS[2]))}. All three paid once for the same search result. The team designs paid for their own
          calls on top.
        </div>
      )}
    </div>
  );
}
