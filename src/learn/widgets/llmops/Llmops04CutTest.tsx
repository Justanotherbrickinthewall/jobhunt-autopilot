import { useId, useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Llmops04CutTest.css";

// A month of AskPEP traffic with illustrative figures. Spend is in cents for each request.
// Cost per success is spend per request divided by the success rate.

const SPEND = 1.8; // cents for each request, before the cut
const SUCCESS = 0.96; // success rate before the cut
const COST_LIMIT = 2.0; // cents. The cost objective from chapter 1.
const SUCCESS_LIMIT = 0.95; // the success objective

const BASE = SPEND / SUCCESS; // 1.875 cents

type Option = { id: string; label: string; hint: string };

const OPTIONS: Option[] = [
  {
    id: "a",
    label: "96%, so any fall in success makes it worse",
    hint: "The cut lowers the top of the fraction as well. A small fall in success can still leave cost per success lower.",
  },
  {
    id: "b",
    label: "95%, the success objective",
    hint: "The objective is a separate limit. The break-even comes from the cut and the old rate alone.",
  },
  { id: "c", label: "72%", hint: "" },
  {
    id: "d",
    label: "75%, three quarters of the spend",
    hint: "Three quarters is what the spend falls to. The break-even is three quarters of the old success rate, which is 96%.",
  },
];
const ANSWER = "c";

const c3 = (v: number) => v.toFixed(3);
const same = (a: number, b: number) => Math.abs(a - b) < 0.0005;

export default function Llmops04CutTest({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const cutId = useId();
  const successId = useId();
  const [pick, setPick] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [cut, setCut] = useState(25); // percent
  const [after, setAfter] = useState(90); // percent

  const right = pick === ANSWER;
  const picked = OPTIONS.find((o) => o.id === pick);

  const check = () => {
    if (pick === null) return;
    const k = attempts + 1;
    setAttempts(k);
    if (pick === ANSWER || k >= 2) {
      setResolved(true);
      complete(
        pick === ANSWER && k === 1
          ? "Found the break-even success rate on the first try"
          : pick === ANSWER
            ? "Found the break-even success rate on the second try"
            : "Needed the explanation for the break-even success rate",
      );
    }
  };

  const spendAfter = SPEND * (1 - cut / 100);
  const rateAfter = after / 100;
  const perSuccessAfter = spendAfter / rateAfter;
  const breakEven = SUCCESS * (1 - cut / 100);
  const falls = perSuccessAfter < BASE && !same(perSuccessAfter, BASE);
  const flat = same(perSuccessAfter, BASE);
  const holds = rateAfter >= SUCCESS_LIMIT;
  const costOk = perSuccessAfter <= COST_LIMIT;

  let tone: "good" | "bad" = "bad";
  let text: string;
  if (falls && holds) {
    tone = "good";
    text = "Cost per success fell and the success objective holds. This cut passes both checks. Confirm it on the same traffic with the eval gate before you ship.";
  } else if (falls && !holds) {
    text = "Cost per success fell, and the success objective is missed. A review that reads only cost would pass this change. Reject it, or find a cut that keeps the success rate.";
  } else if (flat && holds) {
    text = "Cost per success has not moved. The change saves nothing.";
  } else if (flat) {
    text = "Cost per success has not moved, and the success objective is missed. Reject it.";
  } else if (holds) {
    text = "Cost per success rose, even though the success objective holds. The cut is too small for the fall in success. Reject it.";
  } else {
    text = "Cost per success rose, and the success objective is missed. Both numbers are worse. Reject it.";
  }

  return (
    <div className="w-panel llmops04-cut-test">
      <div className="w-row between">
        <span className="w-label">A month of AskPEP traffic</span>
        <span className="llmops04-cut-test-count">Illustrative figures</span>
      </div>

      <div className="llmops04-cut-test-readouts">
        <div className="w-inset">
          <span className="w-label">Spend per request</span>
          <div className="llmops04-cut-test-big w-mono">{c3(SPEND)} cents</div>
        </div>
        <div className="w-inset">
          <span className="w-label">Success rate</span>
          <div className="llmops04-cut-test-big w-mono">{Math.round(SUCCESS * 100)}%</div>
        </div>
        <div className="w-inset">
          <span className="w-label">Cost per success</span>
          <div className="llmops04-cut-test-big w-mono">{c3(BASE)} cents</div>
        </div>
      </div>
      <p className="llmops04-cut-test-note">
        The objectives: cost per successful task at or below {COST_LIMIT.toFixed(1)} cents, and a success rate at or above {Math.round(SUCCESS_LIMIT * 100)}%.
      </p>

      {!resolved && (
        <>
          <div className="llmops04-cut-test-group" role="radiogroup" aria-label="Your prediction">
            <span className="w-label">Predict: the break-even success rate</span>
            <p className="llmops04-cut-test-ask">
              A change cuts spend per request by 25%. How low can the success rate fall before cost per success gets worse than {c3(BASE)} cents?
            </p>
            <div className="llmops04-cut-test-opts">
              {OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={pick === o.id}
                  className={`llmops04-cut-test-opt${pick === o.id ? " on" : ""}`}
                  onClick={() => setPick(o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="w-row">
            <button type="button" className="w-btn primary" disabled={pick === null} onClick={check}>
              Check my prediction
            </button>
          </div>
          {attempts > 0 && picked && (
            <div className="w-verdict bad" role="status">
              Not quite. {picked.hint} Divide the new spend per request by the new success rate, and ask when it equals {c3(BASE)} cents.
            </div>
          )}
        </>
      )}

      {resolved && (
        <>
          <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
            <strong>{right ? "Correct. " : "Not quite. "}</strong>
            The break-even is 72%. A 25% cut makes spend per request {c3(SPEND * 0.75)} cents, and {c3(SPEND * 0.75)} divided by 0.72 is {c3(BASE)} cents, the old
            figure. Below 72% the cut loses. The trap is that the success objective, 95%, is breached long before that. Try other cuts below.
          </div>

          <div className="llmops04-cut-test-controls">
            <div>
              <label htmlFor={cutId} className="w-label">
                Cut in spend per request: {cut}%
              </label>
              <input id={cutId} type="range" min={0} max={60} step={1} value={cut} onChange={(e) => setCut(Number(e.target.value))} />
            </div>
            <div>
              <label htmlFor={successId} className="w-label">
                Success rate after the cut: {after}%
              </label>
              <input id={successId} type="range" min={50} max={100} step={1} value={after} onChange={(e) => setAfter(Number(e.target.value))} />
            </div>
          </div>

          <div className="llmops04-cut-test-readouts">
            <div className="w-inset">
              <span className="w-label">Spend per request</span>
              <div className="llmops04-cut-test-big w-mono">{c3(spendAfter)} cents</div>
            </div>
            <div className="w-inset">
              <span className="w-label">Cost per success</span>
              <div className="llmops04-cut-test-big w-mono">{c3(perSuccessAfter)} cents</div>
            </div>
            <div className="w-inset">
              <span className="w-label">Break-even success rate</span>
              <div className="llmops04-cut-test-big w-mono">{(breakEven * 100).toFixed(1)}%</div>
            </div>
          </div>

          <div className="w-row" role="group" aria-label="Checks">
            <span className={`w-chip ${falls ? "good" : "bad"}`}>{falls ? "Cost per success falls" : flat ? "Cost per success is flat" : "Cost per success rises"}</span>
            <span className={`w-chip ${holds ? "good" : "bad"}`}>{holds ? "Success objective holds" : "Success objective missed"}</span>
            <span className={`w-chip ${costOk ? "good" : "bad"}`}>{costOk ? "Under the cost objective" : "Over the cost objective"}</span>
          </div>

          <div className={`w-verdict ${tone}`} role="status">
            {text}
          </div>
        </>
      )}
    </div>
  );
}
