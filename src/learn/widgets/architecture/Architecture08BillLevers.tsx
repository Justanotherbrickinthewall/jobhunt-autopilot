import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Architecture08BillLevers.css";

// A worked example. The token counts are the means of the 240 rows that `askpep incident seed --kind slow_rerank`
// writes, and the prices are the placeholders in capstone/pricing.json. The totals match `askpep cost-model` to the
// cent at 1,000 requests a day for 30 days. The limits are the answer-success target and the cost-per-success
// limit in capstone/infra/monitoring/slos.json.
// CHECK: pricing.json holds placeholder prices (its _checked field says unchecked). Every dollar figure here is a worked example, not a current price.
const TOKENS_IN = 2167.7625;
const TOKENS_OUT = 347.7916667;
const REQUESTS_PER_DAY = 1000;
const DAYS = 30;
const TRACED_SUCCESS = 237 / 240;
const SUCCESS_TARGET = 0.95;
const COST_LIMIT = 0.02;

const CANNOT_ROUTE =
  "No. The /ask route is not routed, and its ClaudeLLM client talks to the Anthropic API only, so ROUTES cannot send generate to a Gemini model.";

const MODELS = [
  { id: "claude-sonnet-5-5", input: 3.0, output: 15.0, can: true, note: "Yes. It is the model that /ask uses today." },
  { id: "gemini-3.8-flash", input: 0.5, output: 3.0, can: false, note: CANNOT_ROUTE },
  { id: "gemini-3.5-flash", input: 0.3, output: 2.5, can: false, note: CANNOT_ROUTE },
  { id: "gemini-4-argon", input: 2.0, output: 12.0, can: false, note: CANNOT_ROUTE },
];

const SUCCESS_CHOICES = [
  { label: "As traced, 98.75%", value: TRACED_SUCCESS },
  { label: "90%", value: 0.9 },
  { label: "70%", value: 0.7 },
  { label: "50%", value: 0.5 },
  { label: "18%", value: 0.18 },
  { label: "10%", value: 0.1 },
];

const HEADLINES = [
  {
    text: "$44.67 a month, with the 0.3 cache and the Flash reroute, because it is the lowest.",
    why: "The reroute is a change the code cannot make, and the 0.3 hit rate has no measurement behind it. The lowest figure rests on both.",
  },
  {
    text: "$351.60 a month, for the code as it runs today. The cache saving sits beside it as an assumption, and the reroute is left out.",
    why: "It uses only the traced token counts and changes the code can make. The cache saving is real arithmetic on a guess, so it is labelled one.",
  },
  {
    text: "$246.12 a month, because a 0.3 hit rate is a modest guess.",
    why: "A modest guess is still a guess. Until GET /admin/cache measures the rate, it belongs beside the headline and not in it.",
  },
  {
    text: "$63.82 a month, because the reroute alone is safe.",
    why: "The reroute is the change the code cannot make. /ask is not routed, so no setting turns this figure into a bill.",
  },
];
const ANSWER = 1;

function usd(n: number, digits = 2): string {
  return "$" + n.toLocaleString("en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default function Architecture08BillLevers({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [modelIndex, setModelIndex] = useState(0);
  const [hitPct, setHitPct] = useState(0);
  const [successIndex, setSuccessIndex] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [right, setRight] = useState(false);

  const model = MODELS[modelIndex];
  const success = SUCCESS_CHOICES[successIndex].value;
  const hit = hitPct / 100;
  const perRequest = (TOKENS_IN * model.input + TOKENS_OUT * model.output) / 1_000_000;
  const volume = REQUESTS_PER_DAY * DAYS * (1 - hit);
  const monthly = perRequest * volume;
  const divisor = hit + (1 - hit) * success;
  const perTask = divisor > 0 ? ((1 - hit) * perRequest) / divisor : null;
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
      complete(ok ? "headline chosen" : "headline explained after a second miss");
    }
  };

  return (
    <div className="w-panel architecture08-levers">
      <p className="architecture08-levers-hint">
        A worked example on placeholder prices. It prices the 240 seeded slow_rerank rows at 1,000 requests a day for 30 days, so the totals
        match the command. Change a lever and read the three answers: the bill, whether the code can make the change, and what the
        figure assumes.
      </p>

      <div className="architecture08-levers-controls">
        <div className="architecture08-levers-group" role="radiogroup" aria-label="Model for the generate stage">
          <span className="w-label">Model for generate</span>
          <div className="architecture08-levers-chips">
            {MODELS.map((m, i) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={modelIndex === i}
                className={`w-chip architecture08-levers-chip${modelIndex === i ? " on" : ""}`}
                onClick={() => setModelIndex(i)}
              >
                {m.id}
              </button>
            ))}
          </div>
        </div>

        <div className="architecture08-levers-group">
          <label htmlFor="architecture08-levers-hit" className="w-label">
            Cache hit rate: {hit.toFixed(2)}
          </label>
          <input
            id="architecture08-levers-hit"
            type="range"
            min={0}
            max={60}
            step={5}
            value={hitPct}
            onChange={(e) => setHitPct(Number(e.target.value))}
          />
        </div>

        <div className="architecture08-levers-group" role="radiogroup" aria-label="Success share of the chosen model">
          <span className="w-label">Success share of the chosen model</span>
          <div className="architecture08-levers-chips">
            {SUCCESS_CHOICES.map((s, i) => (
              <button
                key={s.label}
                type="button"
                role="radio"
                aria-checked={successIndex === i}
                className={`w-chip architecture08-levers-chip${successIndex === i ? " on" : ""}`}
                onClick={() => setSuccessIndex(i)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <dl className="architecture08-levers-out">
        <div>
          <dt>Cost per request</dt>
          <dd className="w-mono">{usd(perRequest, 4)}</dd>
        </div>
        <div>
          <dt>Monthly total</dt>
          <dd className="w-mono">{usd(monthly)}</dd>
        </div>
        <div>
          <dt>Cost per successful task</dt>
          <dd className={`w-mono ${perTask !== null && perTask <= COST_LIMIT ? "ok" : "over"}`}>
            {perTask === null ? "none" : usd(perTask, 4)}
          </dd>
        </div>
        <div>
          <dt>Cost-per-success objective, {usd(COST_LIMIT)}</dt>
          <dd className={`w-mono ${perTask !== null && perTask <= COST_LIMIT ? "ok" : "over"}`}>
            {perTask !== null && perTask <= COST_LIMIT ? "met" : "missed"}
          </dd>
        </div>
        <div>
          <dt>Answer-success objective</dt>
          <dd className={`w-mono ${success >= SUCCESS_TARGET ? "ok" : "over"}`}>
            {success >= SUCCESS_TARGET ? "met" : "missed"}, target 95%
          </dd>
        </div>
      </dl>

      <ul className="architecture08-levers-can">
        <li>
          <strong>Model.</strong> {model.note}
        </li>
        <li>
          <strong>Cache.</strong>{" "}
          {hitPct === 0
            ? "Off, as it ships. CACHE_ENABLED is false by default."
            : "Yes, with CACHE_ENABLED=true. The rate is a guess until GET /admin/cache measures it on a running server, and that route reports one instance."}
        </li>
        <li>
          <strong>Success share.</strong>{" "}
          {successIndex === 0
            ? "The command holds the share at the traced value."
            : "Not a setting. The command never changes it, so only an eval run on the model can tell you the real share."}
        </li>
      </ul>

      <fieldset className="architecture08-levers-ask">
        <legend>Which monthly figure heads section 7 of the design?</legend>
        <div className="architecture08-levers-options" role="radiogroup" aria-label="The headline figure">
          {HEADLINES.map((h, i) => (
            <button
              key={h.text}
              type="button"
              role="radio"
              aria-checked={lastPick === i}
              disabled={done}
              className={`w-chip architecture08-levers-option${lastPick === i ? " on" : ""}${done && i === ANSWER ? " right" : ""}`}
              onClick={() => choose(i)}
            >
              {h.text}
            </button>
          ))}
        </div>
      </fieldset>

      {picks.length === 1 && !done && (
        <p className="architecture08-levers-why miss" role="status">
          Not that one. {HEADLINES[picks[0]].why}
        </p>
      )}
      {done && (
        <p className={`architecture08-levers-why ${right ? "ok" : "miss"}`} role="status">
          <strong>{right ? "Correct. " : "The marked figure is the headline. "}</strong>
          {HEADLINES[ANSWER].why}
        </p>
      )}
      {done && (
        <div className="w-verdict good" role="status">
          Head section 7 with the figure for the code as it runs today. List each saving beside it with its assumption, and say which ones the code
          cannot make.
        </div>
      )}
    </div>
  );
}
