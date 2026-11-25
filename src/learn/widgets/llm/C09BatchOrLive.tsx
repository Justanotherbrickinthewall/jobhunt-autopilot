import { useState } from "react";
import { MotionConfig } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C09BatchOrLive.css";

type Route = "live" | "batch";
// Illustrative assumptions: batch costs half the live price and completes within 24 hours.
// CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/build-with-claude/batch-processing
const WINDOW_HOURS = 24;
type Job = { id: string; name: string; deadline: string; hours: number; waiting: boolean; liveCost: number };

const JOBS: Job[] = [
  { id: "j1", name: "Clerk uploads an invoice and waits for the fields", deadline: "10 seconds", hours: 0.003, waiting: true, liveCost: 4 },
  { id: "j2", name: "Month-end backfill of 40,000 archived invoices", deadline: "10 days", hours: 240, waiting: false, liveCost: 320 },
  { id: "j3", name: "Re-extract low-confidence invoices for the 08:00 review queue", deadline: "14 hours", hours: 14, waiting: false, liveCost: 60 },
  { id: "j4", name: "Weekly supplier research refresh", deadline: "48 hours", hours: 48, waiting: false, liveCost: 150 },
  { id: "j5", name: "Eval regression run before a release", deadline: "2 hours", hours: 2, waiting: false, liveCost: 25 },
  { id: "j6", name: "Classify 12,000 old emails for a retention audit", deadline: "10 days", hours: 240, waiting: false, liveCost: 90 },
  { id: "j7", name: "Accounts payable clerk asks a question in the chat panel", deadline: "5 seconds", hours: 0.001, waiting: true, liveCost: 8 },
  { id: "j8", name: "Summarise new supplier contracts", deadline: "36 hours", hours: 36, waiting: false, liveCost: 40 },
  { id: "j9", name: "Duplicate-invoice check before the 15:00 payment run, when approved invoices are paid", deadline: "2 hours", hours: 2, waiting: false, liveCost: 12 },
  { id: "j10", name: "Relabel the golden set with a strong model", deadline: "5 days", hours: 120, waiting: false, liveCost: 200 },
];

const best = (j: Job): Route => (!j.waiting && j.hours > WINDOW_HOURS ? "batch" : "live");
const why = (j: Job): string =>
  j.waiting
    ? "Someone is waiting, and batch does not stream. Live."
    : j.hours > WINDOW_HOURS
      ? `The deadline of ${j.deadline} is longer than the ${WINDOW_HOURS} hour window and nobody waits. Batch saves £${j.liveCost / 2}.`
      : `The deadline of ${j.deadline} is shorter than the ${WINDOW_HOURS} hour window. Batch could miss it. Live.`;
const cost = (j: Job, r: Route) => (r === "batch" ? j.liveCost / 2 : j.liveCost);

export default function C09BatchOrLive({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [pick, setPick] = useState<Record<string, Route>>({});
  const [attempts, setAttempts] = useState(0);
  const [checked, setChecked] = useState(false);

  const ready = JOBS.every((j) => pick[j.id]);
  const right = JOBS.filter((j) => pick[j.id] === best(j));
  const wrong = JOBS.filter((j) => pick[j.id] !== best(j));
  const missed = wrong.filter((j) => pick[j.id] === "batch").length;
  const overpaid = wrong.filter((j) => pick[j.id] === "live").reduce((n, j) => n + j.liveCost / 2, 0);
  const spend = JOBS.reduce((n, j) => n + cost(j, pick[j.id] ?? "live"), 0);
  const bestSpend = JOBS.reduce((n, j) => n + cost(j, best(j)), 0);
  const final = checked && (wrong.length === 0 || attempts >= 2);

  const check = () => {
    const n = attempts + 1;
    setAttempts(n);
    setChecked(true);
    if (wrong.length === 0 || n >= 2) complete(`${right.length} of ${JOBS.length} jobs routed correctly`);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel llm-batch-or-live">
        <p className="w-label">Illustrative figures. Assume batch costs half the live price and completes within {WINDOW_HOURS} hours.</p>
        <ul className="llm-batch-or-live-list">
          {JOBS.map((j) => {
            const bad = checked && pick[j.id] !== best(j);
            return (
              <li key={j.id} className="llm-batch-or-live-row">
                <div>
                  <strong>{j.name}</strong>
                  <div className="llm-batch-or-live-meta">Deadline {j.deadline}. Live cost £{j.liveCost}.</div>
                </div>
                <div className="w-row" role="radiogroup" aria-label={`Route for ${j.name}`}>
                  {(["live", "batch"] as Route[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={pick[j.id] === r}
                      disabled={checked && final}
                      className={`w-chip${pick[j.id] === r ? " is-on" : ""}${checked && pick[j.id] === r ? (r === best(j) ? " good" : " bad") : ""}`}
                      onClick={() => { setPick({ ...pick, [j.id]: r }); setChecked(false); }}
                    >
                      {r === "live" ? "Live" : "Batch"}
                    </button>
                  ))}
                </div>
                {bad && <div className="llm-batch-or-live-why">{why(j)}</div>}
              </li>
            );
          })}
        </ul>
        {!checked && (
          <button type="button" className="w-btn" disabled={!ready || attempts >= 2} onClick={check}>
            Check my routing
          </button>
        )}
        {checked && (
          <div className={`w-verdict ${wrong.length === 0 ? "good" : "bad"}`} role="status">
            {right.length} of {JOBS.length} routed correctly. Your spend is £{spend}, and the best routing costs £{bestSpend}.
            {overpaid > 0 && ` You overpaid £${overpaid} on jobs that could wait.`}
            {missed > 0 && ` ${missed} job${missed > 1 ? "s" : ""} could miss a deadline.`}
            {final && " The test is two questions: is anyone waiting, and is the deadline longer than the window?"}
            {!final && " Fix the marked jobs and check again."}
          </div>
        )}
        {final && wrong.length > 0 && (
          <ul className="llm-batch-or-live-all">
            {JOBS.map((j) => <li key={j.id}>{j.name}: {why(j)}</li>)}
          </ul>
        )}
      </div>
    </MotionConfig>
  );
}
