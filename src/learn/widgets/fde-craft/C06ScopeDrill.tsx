import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C06ScopeDrill.css";

// Illustrative drill. The brief, the customer and the figures are made up.
type Q = { id: string; text: string; good: boolean; why: string };
const QUESTIONS: Q[] = [
  { id: "vol", text: "How many invoices arrive each month, and from how many suppliers?", good: true, why: "Volume sizes the prize. Without it you cannot tell whether a pipeline pays back." },
  { id: "model", text: "Which model would you like us to use?", good: false, why: "A design choice you make later. The answer changes nothing in the plan." },
  { id: "data", text: "Who can release 50 real invoices this week, and what must I sign first?", good: true, why: "Data access is the commonest hidden delay. It fixes the date of the first milestone." },
  { id: "dash", text: "Do you want a dashboard for the results?", good: false, why: "A solution before the problem is sized. It adds a milestone with no stated value." },
  { id: "review", text: "Who checks the doubtful invoices, and how fast must they clear?", good: true, why: "It sets the size of the review queue, and whether full automation is even wanted." },
  { id: "bar", text: "What error rate would make the finance team trust it?", good: true, why: "It gives the success bar. Without one, no demo can pass or fail." },
  { id: "stack", text: "Can we build it with the newest agent framework?", good: false, why: "It serves the builder, not the customer, and has no effect on scope." },
  { id: "owner", text: "Who runs it after we leave?", good: true, why: "It changes the handover work and the tools you can pick." },
];

const CRITERIA = ["Pilot first", "A demo after each milestone", "Riskiest assumption tested first", "Safe to stop after any milestone"];
type Plan = { id: string; text: string; meets: boolean[]; note: string };
const PLANS: Plan[] = [
  { id: "a", text: "Build the whole pipeline with scans, posting and a chat window. Show one demo in week ten.", meets: [false, false, false, false], note: "One demo at the end hides every risk until the last week." },
  { id: "b", text: "Get data and a baseline. Then extract born-digital invoices, then add the review queue, then posting. Demo after each step.", meets: [true, true, true, true], note: "Each step proves one thing on the customer's own invoices, and the customer can stop after any of them." },
  { id: "c", text: "Choose the model and build an evaluation harness first. Show the harness in week four, then start on extraction.", meets: [false, true, false, false], note: "The harness is useful, but the customer sees nothing of their own problem for a month." },
];

const PICKS = 4;

export default function C06ScopeDrill({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picked, setPicked] = useState<string[]>([]);
  const [graded, setGraded] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);

  const score = QUESTIONS.filter((q) => picked.includes(q.id) && q.good).length;

  function toggle(id: string) {
    if (graded) return;
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < PICKS ? [...p, id] : p));
  }
  function choosePlan(id: string) {
    if (plan) return;
    setPlan(id);
    const right = PLANS.find((p) => p.id === id)?.meets.every(Boolean);
    complete(`${score} of ${PICKS} questions changed the scope; plan ${right ? "met every criterion" : "missed a criterion"}`);
  }

  const chosen = PLANS.find((p) => p.id === plan);

  return (
    <div className="w-panel fde-craft-scope-drill">
      <p className="fde-craft-scope-drill-lede">
        The brief: a distributor says, "We want to stop keying invoices by hand." Part one, pick four of the five questions that change the plan. Part two, pick the milestone plan.
      </p>

      <p className="w-label">Part one. Pick {PICKS} questions ({picked.length} picked)</p>
      <ul className="fde-craft-scope-drill-list">
        {QUESTIONS.map((q) => {
          const on = picked.includes(q.id);
          return (
            <li key={q.id}>
              <button type="button" className={`w-btn fde-craft-scope-drill-item ${on ? "is-on" : "ghost"}`} aria-pressed={on} disabled={graded} onClick={() => toggle(q.id)}>
                {q.text}
              </button>
              {graded && (
                <p className="fde-craft-scope-drill-note">
                  <b>{q.good ? "Changes the scope." : "Does not change the plan."}</b> {on ? "You picked it. " : ""}{q.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {!graded && (
        <button type="button" className="w-btn" disabled={picked.length !== PICKS} onClick={() => setGraded(true)}>
          Grade my questions
        </button>
      )}
      {graded && (
        <div className={`w-verdict ${score >= 3 ? "good" : "bad"}`} role="status">
          <strong>{score} of {PICKS} questions change the plan.</strong> {score >= 3 ? "You are asking for facts, not features." : "Swap the solution-led questions for volume, data access, review, the success bar and ownership."}
        </div>
      )}

      {graded && (
        <>
          <p className="w-label fde-craft-scope-drill-gap">Part two. Which plan do you propose?</p>
          <ul className="fde-craft-scope-drill-list">
            {PLANS.map((p) => (
              <li key={p.id}>
                <button type="button" className={`w-btn fde-craft-scope-drill-item ${plan === p.id ? "is-on" : "ghost"}`} aria-pressed={plan === p.id} disabled={plan !== null} onClick={() => choosePlan(p.id)}>
                  {p.text}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {chosen && (
        <>
          <div className="fde-craft-scope-drill-table" role="table" aria-label="Rubric by plan">
            <div role="row" className="fde-craft-scope-drill-row is-head">
              <span role="columnheader">Rubric</span>
              {PLANS.map((p) => (
                <span role="columnheader" key={p.id}>Plan {p.id.toUpperCase()}</span>
              ))}
            </div>
            {CRITERIA.map((c, i) => (
              <div role="row" className="fde-craft-scope-drill-row" key={c}>
                <span role="cell">{c}</span>
                {PLANS.map((p) => (
                  <span role="cell" key={p.id} className="w-mono">{p.meets[i] ? "Yes" : "No"}</span>
                ))}
              </div>
            ))}
          </div>
          <div className={`w-verdict ${chosen.meets.every(Boolean) ? "good" : "bad"}`} role="status">
            <strong>{chosen.meets.every(Boolean) ? "Plan B meets every criterion." : `Plan ${chosen.id.toUpperCase()} misses ${chosen.meets.filter((m) => !m).length} of ${CRITERIA.length}.`}</strong> {chosen.note}
            {!chosen.meets.every(Boolean) && " Plan B is the one to propose: " + PLANS[1].note}
          </div>
        </>
      )}
      <p className="fde-craft-scope-drill-foot">Illustrative drill. The distributor and its brief are fictional.</p>
    </div>
  );
}
