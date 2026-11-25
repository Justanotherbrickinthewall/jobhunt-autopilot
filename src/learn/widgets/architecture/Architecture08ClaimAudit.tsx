import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Architecture08ClaimAudit.css";

// Six claims from a sample AskPEP design. The figures are worked examples: the seeded slow_rerank rows, the
// placeholder prices in capstone/pricing.json, and the defaults in capstone/src/askpep/config.py. Each verdict
// is read from the capstone code (routing.py, api.py, cache.py, costmodel.py) and not from a live run.
// CHECK: pricing.json holds placeholder prices (its _checked field says unchecked). Every dollar figure here is a worked example, not a current price.

type VerdictId = "stands" | "assumption" | "contradicted";

const VERDICTS: { id: VerdictId; label: string }[] = [
  { id: "stands", label: "Stands" },
  { id: "assumption", label: "Rests on an assumption" },
  { id: "contradicted", label: "Contradicted" },
];

type Claim = { claim: string; number: string; source: string; answer: VerdictId; why: string };

const CLAIMS: Claim[] = [
  {
    claim: "A month of traffic costs $351.60 in model spend.",
    number: "1,000 requests a day for 30 days, at the placeholder prices.",
    source: "askpep cost-model on the seeded slow_rerank rows.",
    answer: "assumption",
    why: "The token counts are measured on the rows, and the rows are seeded. The prices are placeholders and the volume is a forecast. Section 7 has to say so.",
  },
  {
    claim: "Routing generate to gemini-3.8-flash cuts the bill to $63.82.",
    number: "$63.82 a month, from the reroute option of the command.",
    source: "askpep cost-model with --reroute generate=gemini-3.8-flash.",
    answer: "contradicted",
    why: "The cost model priced a change that the code cannot make. The /ask route is not routed, parse_routes refuses generate as a role, and ClaudeLLM talks to the Anthropic API only.",
  },
  {
    claim: "A thread id that is queued twice runs once.",
    number: "None. The claim rests on the task name and a status check.",
    source: "The task name is a hash of the thread id, and the job handler skips a thread that has finished.",
    answer: "stands",
    why: "The code does what the claim says. A second enqueue with the same task name queues nothing new, and the handler returns the status of a finished thread. A duplicate that arrives mid-run meets the thread's lock and gets a 503. What that lock costs is a question for section 8.",
  },
  {
    claim: "A cheaper model is safe to adopt when the cost per successful task falls.",
    number: "$0.0119 falls to $0.0022 per successful task.",
    source: "askpep cost-model, which holds the success share at the traced 98.75%.",
    answer: "contradicted",
    why: "The command never changes the success share. With these rows a model that fails four requests in five would still lower the figure, at about an 18% success share. The eval floor decides whether a model may serve a role.",
  },
  {
    claim: "A cache hit still runs the input guards and writes their audit event.",
    number: "None.",
    source: "Section 9 of the design, item 1, and the code that serves a hit.",
    answer: "stands",
    why: "On a hit the code runs the input guards before it serves the stored answer. The audit event is written, and a question that is now blocked is refused instead of answered from the cache.",
  },
  {
    claim: "After the answer prompt changes, no caller is served an answer written under the old prompt.",
    number: "None.",
    source: "The cache key.",
    answer: "contradicted",
    why: "The key holds the question, the corpus version and a list of settings such as the answer model. It holds no prompt text, so a stored answer outlives a prompt change until its entry expires, 3,600 seconds by default, or the process restarts.",
  },
];

export default function Architecture08ClaimAudit({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<VerdictId[]>([]);
  const [resolved, setResolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const c = CLAIMS[index];
  const lastPick = picks[picks.length - 1];
  const gotIt = resolved && lastPick === c.answer;

  const choose = (id: VerdictId) => {
    if (resolved) return;
    const next = [...picks, id];
    const ok = id === c.answer;
    setPicks(next);
    if (ok || next.length >= 2) {
      const first = firstTry + (ok && next.length === 1 ? 1 : 0);
      setResolved(true);
      setFirstTry(first);
      if (index + 1 >= CLAIMS.length) {
        setFinished(true);
        complete(`${first} of ${CLAIMS.length} verdicts right on the first pick`);
      }
    }
  };

  const advance = () => {
    setIndex(index + 1);
    setPicks([]);
    setResolved(false);
  };

  return (
    <div className="w-panel architecture08-audit">
      <p className="architecture08-audit-hint">
        Six claims from a sample AskPEP design. Give each one a verdict. A wrong pick shows a nudge, and you get one more try. The figures are
        worked examples on placeholder prices.
      </p>

      <span className="w-label">
        Claim {index + 1} of {CLAIMS.length}
      </span>
      <blockquote className="architecture08-audit-claim">{c.claim}</blockquote>
      <dl className="architecture08-audit-facts">
        <div>
          <dt>Its number</dt>
          <dd>{c.number}</dd>
        </div>
        <div>
          <dt>Where it came from</dt>
          <dd>{c.source}</dd>
        </div>
      </dl>

      <fieldset className="architecture08-audit-ask">
        <legend>What is your verdict?</legend>
        <div className="architecture08-audit-options" role="radiogroup" aria-label="Verdict">
          {VERDICTS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={lastPick === v.id}
              disabled={resolved}
              className={`w-chip architecture08-audit-option${lastPick === v.id ? " on" : ""}${resolved && v.id === c.answer ? " right" : ""}`}
              onClick={() => choose(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </fieldset>

      {picks.length === 1 && !resolved && (
        <p className="architecture08-audit-note miss" role="status">
          Not that verdict. Ask whether a measurement backs the number, and whether the code agrees with the claim.
        </p>
      )}

      {resolved && (
        <div className="architecture08-audit-reveal" role="status">
          <p className={`architecture08-audit-note ${gotIt ? "ok" : "miss"}`}>
            <strong>{gotIt ? "Correct. " : `The verdict is ${VERDICTS.find((v) => v.id === c.answer)?.label.toLowerCase()}. `}</strong>
            {c.why}
          </p>
          {!finished && (
            <button type="button" className="w-btn small" onClick={advance}>
              Next claim
            </button>
          )}
        </div>
      )}

      {finished && (
        <div className="w-verdict good" role="status">
          Two claims stood, one rested on an assumption and three were contradicted. The three came from reading the code against the figures, which
          is the work of a review.
        </div>
      )}
    </div>
  );
}
