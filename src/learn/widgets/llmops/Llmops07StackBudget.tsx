import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Llmops07StackBudget.css";

// Illustrative figures. A plain ask opens at most 7 spans: askpep.request plus embed, dense, sparse, fuse,
// rerank and generate. A refused request opens 6. The LangSmith plan figures are from FACTS, checked on
// 20 October 2026.
const SPANS_PER_REQUEST = 7;
const FREE_TRACES = 5000; // LangSmith Developer plan, base traces a month
const DAYS_IN_MONTH = 30;
const SHARES = [100, 25, 10, 5, 1];

const SETUPS = [
  {
    text: "Send every request to LangSmith, and drop the traces table.",
    why: "At 120 requests an hour the free base traces last under two days, and the capstone switch is all or nothing. The table also found all three regressions with no vendor at all.",
  },
  {
    text: "Keep the traces table, export spans for every request, and open LangSmith for a window when you need the full trees.",
    why: "The table costs nothing to keep and found all three regressions alone. The spans hold only sizes, names and counts, so exporting all of them is safe. LangSmith holds text, so it is opened for a window and then closed.",
  },
  {
    text: "Export spans to Cloud Trace only, and delete the traces table.",
    why: "The table is the local record. The cost, objective and incident commands all read it, and it needs no account, no network and no exporter. Spans are an export on top of it, and deleting the table leaves those commands with nothing to read.",
  },
  {
    text: "Use LangSmith only, with no span export.",
    why: "In the capstone, LangSmith receives the retrieval run and the desk graph runs. A plain ask call to the model is not a LangSmith run, so the generate stage would be missing from the trees you rely on.",
  },
];
const ANSWER = 1;

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-GB");
}

export default function Llmops07StackBudget({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [perHour, setPerHour] = useState(120);
  const [share, setShare] = useState(100);
  const [picks, setPicks] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [right, setRight] = useState(false);

  const perDay = perHour * 24;
  const perMonth = perDay * DAYS_IN_MONTH;
  const spans = perMonth * SPANS_PER_REQUEST;
  const traces = (perMonth * share) / 100;
  const lasts = (FREE_TRACES * DAYS_IN_MONTH) / traces; // days
  const inside = traces <= FREE_TRACES;
  const lastPick = picks[picks.length - 1];

  const choose = (i: number) => {
    if (done) return;
    const next = [...picks, i];
    const ok = i === ANSWER;
    const finished = ok || next.length >= 2;
    setPicks(next);
    if (finished) {
      setDone(true);
      setRight(ok);
      complete(ok ? "stack chosen" : "stack explained after a second miss");
    }
  };

  return (
    <div className="w-panel llmops07-stack">
      <p className="llmops07-stack-hint">
        Illustrative figures. They count spans and traces only, not money. The LangSmith plan figures were checked on 20 October 2026. Move the sliders, then choose a setup.
      </p>

      <div className="llmops07-stack-controls">
        <div className="llmops07-stack-slide">
          <label htmlFor="llmops07-stack-rate" className="w-label">Requests an hour: {perHour}</label>
          <input
            id="llmops07-stack-rate"
            type="range"
            min={20}
            max={600}
            step={20}
            value={perHour}
            onChange={(e) => setPerHour(Number(e.target.value))}
          />
        </div>
        <div className="llmops07-stack-share" role="radiogroup" aria-label="Share of requests sent to LangSmith">
          <span className="w-label">Share sent to LangSmith</span>
          <div className="llmops07-stack-chips">
            {SHARES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={share === s}
                className={`w-chip llmops07-stack-chip${share === s ? " on" : ""}`}
                onClick={() => setShare(s)}
              >
                {s} percent
              </button>
            ))}
          </div>
        </div>
      </div>

      <dl className="llmops07-stack-out">
        <div><dt>Requests a day</dt><dd className="w-mono">{fmt(perDay)}</dd></div>
        <div><dt>Requests a month</dt><dd className="w-mono">{fmt(perMonth)}</dd></div>
        <div><dt>Spans a month, at most {SPANS_PER_REQUEST} a request</dt><dd className="w-mono">{fmt(spans)}</dd></div>
        <div><dt>LangSmith traces a month</dt><dd className="w-mono">{fmt(traces)}</dd></div>
        <div>
          <dt>The {fmt(FREE_TRACES)} free base traces last</dt>
          <dd className={`w-mono llmops07-stack-lasts${inside ? " ok" : " over"}`}>
            {inside ? "the whole month" : `${lasts.toFixed(1)} days`}
          </dd>
        </div>
      </dl>
      <p className="llmops07-stack-price">
        Price the spans on the Cloud Trace pricing page and multiply by the spans a month. This widget shows no price, because the page is the source.
      </p>

      <fieldset className="llmops07-stack-ask">
        <legend>Which setup should the rehearsal team run?</legend>
        <div className="llmops07-stack-options" role="radiogroup" aria-label="Your setup">
          {SETUPS.map((s, i) => (
            <button
              key={s.text}
              type="button"
              role="radio"
              aria-checked={lastPick === i}
              disabled={done}
              className={`w-chip llmops07-stack-option${lastPick === i ? " on" : ""}${done && i === ANSWER ? " right" : ""}`}
              onClick={() => choose(i)}
            >
              {s.text}
            </button>
          ))}
        </div>
      </fieldset>

      {picks.length === 1 && !done && (
        <p className="llmops07-stack-why miss" role="status">
          Not that one. {SETUPS[picks[0]].why}
        </p>
      )}
      {done && (
        <p className={`llmops07-stack-why ${right ? "ok" : "miss"}`} role="status">
          <strong>{right ? "Correct. " : "The marked setup is the better one. "}</strong>
          {SETUPS[ANSWER].why}
        </p>
      )}
      {done && (
        <div className="w-verdict good" role="status">
          Keep the local table, export the spans for every request, and spend the vendor allowance on a window. Each layer answers a question the others cannot.
        </div>
      )}
    </div>
  );
}
