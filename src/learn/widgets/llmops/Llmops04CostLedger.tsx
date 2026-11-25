import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Llmops04CostLedger.css";

// Twelve illustrative requests from one quiet hour. Costs are in tenths of a cent, so the sums stay exact.
// The figures are placeholders. They are not a bill.

type Outcome = "success" | "failure" | "paused";
type Row = { id: number; label: string; outcome: Outcome; tenths: number };

const ROWS: Row[] = [
  { id: 1, label: "Succeeded", outcome: "success", tenths: 3 },
  { id: 2, label: "Succeeded", outcome: "success", tenths: 4 },
  { id: 3, label: "Succeeded", outcome: "success", tenths: 5 },
  { id: 4, label: "Refused", outcome: "failure", tenths: 3 },
  { id: 5, label: "Succeeded", outcome: "success", tenths: 4 },
  { id: 6, label: "Error", outcome: "failure", tenths: 6 },
  { id: 7, label: "Succeeded", outcome: "success", tenths: 4 },
  { id: 8, label: "Blocked by a guard", outcome: "failure", tenths: 4 },
  { id: 9, label: "Succeeded", outcome: "success", tenths: 4 },
  { id: 10, label: "Stopped by the step budget", outcome: "failure", tenths: 11 },
  { id: 11, label: "Waiting for approval", outcome: "paused", tenths: 4 },
  { id: 12, label: "Succeeded", outcome: "success", tenths: 4 },
];

const SPEND = ROWS.reduce((s, r) => s + r.tenths, 0);
const WINS = ROWS.filter((r) => r.outcome === "success");
const WIN_SPEND = WINS.reduce((s, r) => s + r.tenths, 0);
const FAIL_SPEND = ROWS.filter((r) => r.outcome === "failure").reduce((s, r) => s + r.tenths, 0);
const PAUSED_SPEND = ROWS.filter((r) => r.outcome === "paused").reduce((s, r) => s + r.tenths, 0);

const cents = (tenths: number) => (tenths / 10).toFixed(1);
const cents2 = (v: number) => v.toFixed(2);

type Option = { id: string; value: number; label: string; hint: string };

const OPTIONS: Option[] = [
  {
    id: "a",
    value: SPEND / 10 / ROWS.length,
    label: `${cents2(SPEND / 10 / ROWS.length)} cents`,
    hint: "That divides the spend by all twelve requests. It is the price per request, and it ignores which requests worked.",
  },
  {
    id: "b",
    value: SPEND / 10 / WINS.length,
    label: `${cents2(SPEND / 10 / WINS.length)} cents`,
    hint: "",
  },
  {
    id: "c",
    value: WIN_SPEND / 10 / WINS.length,
    label: `${cents2(WIN_SPEND / 10 / WINS.length)} cents`,
    hint: "That counts only the spend on the successes. The failed requests spent money too, and it stays in the sum.",
  },
  {
    id: "d",
    value: (SPEND - PAUSED_SPEND) / 10 / WINS.length,
    label: `${cents2((SPEND - PAUSED_SPEND) / 10 / WINS.length)} cents`,
    hint: "That leaves out the run that is waiting for approval. Its tokens are spent, so they stay in the sum.",
  },
];
const ANSWER = "b";

const OUTCOME_CLASS: Record<Outcome, string> = {
  success: "good",
  failure: "bad",
  paused: "warn",
};

export default function Llmops04CostLedger({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [pick, setPick] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);

  const right = pick === ANSWER;
  const picked = OPTIONS.find((o) => o.id === pick);
  const perTask = SPEND / 10 / WINS.length;
  const notSuccess = FAIL_SPEND + PAUSED_SPEND;
  const share = (v: number) => Math.round((v / SPEND) * 100);

  const check = () => {
    if (pick === null) return;
    const k = attempts + 1;
    setAttempts(k);
    if (pick === ANSWER || k >= 2) {
      setResolved(true);
      complete(
        pick === ANSWER && k === 1
          ? "Worked out cost per successful task on the first try"
          : pick === ANSWER
            ? "Worked out cost per successful task on the second try"
            : "Needed the explanation for cost per successful task",
      );
    }
  };

  return (
    <div className="w-panel llmops04-cost-ledger">
      <div className="w-row between">
        <span className="w-label">One hour of requests</span>
        <span className="llmops04-cost-ledger-count">Illustrative figures</span>
      </div>

      <div className="llmops04-cost-ledger-scroll" role="region" aria-label="Ledger of twelve requests" tabIndex={0}>
        <table className="llmops04-cost-ledger-table">
          <thead>
            <tr>
              <th scope="col">Request</th>
              <th scope="col">How it ended</th>
              <th scope="col">Cost in cents</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>
                  <span className={`w-chip ${OUTCOME_CLASS[r.outcome]}`}>{r.label}</span>
                </td>
                <td className="w-mono">{cents(r.tenths)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!resolved && (
        <>
          <div className="llmops04-cost-ledger-group" role="radiogroup" aria-label="Your prediction">
            <span className="w-label">Predict: the cost per successful task</span>
            <div className="llmops04-cost-ledger-opts">
              {OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={pick === o.id}
                  className={`llmops04-cost-ledger-opt w-mono${pick === o.id ? " on" : ""}`}
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
              Not quite. {picked.hint} Add up the cost of all twelve rows, then divide by the rows that succeeded.
            </div>
          )}
        </>
      )}

      {resolved && (
        <>
          <div className="llmops04-cost-ledger-readouts">
            <div className="w-inset">
              <span className="w-label">Spend on all 12 rows</span>
              <div className="llmops04-cost-ledger-big w-mono">{cents(SPEND)} cents</div>
            </div>
            <div className="w-inset">
              <span className="w-label">Successes</span>
              <div className="llmops04-cost-ledger-big w-mono">{WINS.length}</div>
            </div>
            <div className="w-inset">
              <span className="w-label">Cost per successful task</span>
              <div className="llmops04-cost-ledger-big w-mono">{cents2(perTask)} cents</div>
            </div>
          </div>

          <div
            className="llmops04-cost-ledger-bar"
            role="img"
            aria-label={`Of ${cents(SPEND)} cents spent, ${cents(WIN_SPEND)} went on successes, ${cents(FAIL_SPEND)} on failures and ${cents(PAUSED_SPEND)} on a paused run.`}
          >
            <span className="llmops04-cost-ledger-seg win" style={{ width: `${(WIN_SPEND / SPEND) * 100}%` }} />
            <span className="llmops04-cost-ledger-seg fail" style={{ width: `${(FAIL_SPEND / SPEND) * 100}%` }} />
            <span className="llmops04-cost-ledger-seg pause" style={{ width: `${(PAUSED_SPEND / SPEND) * 100}%` }} />
          </div>
          <p className="llmops04-cost-ledger-key">
            <span className="llmops04-cost-ledger-dot win" /> Successes, {share(WIN_SPEND)}%{" "}
            <span className="llmops04-cost-ledger-dot fail" /> Failures, {share(FAIL_SPEND)}%{" "}
            <span className="llmops04-cost-ledger-dot pause" /> Paused, {share(PAUSED_SPEND)}%
          </p>

          <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
            <strong>{right ? "Correct. " : "Not quite. "}</strong>
            The answer is {cents2(perTask)} cents: {cents(SPEND)} cents of spend over {WINS.length} successes. The price per request is{" "}
            {cents2(SPEND / 10 / ROWS.length)} cents, which hides the problem. {share(notSuccess)} percent of the spend went on rows that are not
            successes, {cents(notSuccess)} cents of {cents(SPEND)}. The cost objective would read {cents2((SPEND - PAUSED_SPEND) / 10 / WINS.length)} cents,
            because it leaves out the paused run.
          </div>
        </>
      )}
    </div>
  );
}
