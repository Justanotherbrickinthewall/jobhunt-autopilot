import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents18SupervisorOrHandoff.css";

const OPTIONS: { id: string; label: string }[] = [
  {
    "id": "supervisor",
    "label": "Supervisor: control returns to the centre"
  },
  {
    "id": "handoff",
    "label": "Handoff: control moves on"
  }
];

const CASES: { id: string; state: string; show: string; answer: string; why: string }[] = [
  {
    "id": "a",
    "state": "A flow on the PEP desk.",
    "show": "Triage asks the researcher for notes. The notes go back to triage. Triage then asks the writer for a draft.",
    "answer": "supervisor",
    "why": "Control comes back to triage after each worker. Triage is the centre here."
  },
  {
    "id": "b",
    "state": "A flow on the PEP desk.",
    "show": "The researcher calls a tool that makes the writer the active agent. Nobody asks the researcher again.",
    "answer": "handoff",
    "why": "Control moved to the writer and did not come back. That is the whole mechanism."
  },
  {
    "id": "c",
    "state": "A design note.",
    "show": "One model decides after every result which agent runs next. No other agent can pick.",
    "answer": "supervisor",
    "why": "One agent holds the routing choice at every step. That is a supervisor, even if it has a different name."
  },
  {
    "id": "d",
    "state": "A flow on the PEP desk.",
    "show": "The writer finds a missing source and sends the task back to the researcher.",
    "answer": "handoff",
    "why": "Control returns only because the writer handed it back. A handoff can go backwards, but only when an agent chooses it."
  },
  {
    "id": "e",
    "state": "A failure story.",
    "show": "The researcher crashes. One agent knows the whole plan, so it retries that step.",
    "answer": "supervisor",
    "why": "Only a central agent knows the whole plan. In a handoff swarm, the state and its status are all that remain."
  },
  {
    "id": "f",
    "state": "A design note.",
    "show": "Each agent holds a list of the agents it may pass work to. Nobody holds the whole plan.",
    "answer": "handoff",
    "why": "The routing is spread across the agents, each with a short list. That is the swarm shape."
  }
];

export default function Agents18SupervisorOrHandoff({ onComplete }: WidgetProps) {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [hits, setHits] = useState(0);
  const [done, setDone] = useState(false);
  const complete = useComplete(onComplete);
  const c = CASES[i];
  const right = pick === c.answer;

  function choose(a: string) {
    if (pick) return;
    setPick(a);
    if (a === c.answer) setHits((h) => h + 1);
  }
  function next() {
    if (i + 1 < CASES.length) {
      setI(i + 1);
      setPick(null);
    } else {
      setDone(true);
      complete(`${hits} of ${CASES.length} matched the swarm`);
    }
  }

  return (
    <div className="w-panel agents18-supervisor-or-handoff">
      <p className="agents18-supervisor-or-handoff-note">Sort six flows by where control goes after an agent finishes. Predict before you pick.</p>
      {!done && (
        <fieldset className="agents18-supervisor-or-handoff-card">
          <legend className="agents18-supervisor-or-handoff-legend">Case {i + 1} of {CASES.length}</legend>
          <p className="agents18-supervisor-or-handoff-state">{c.state}</p>
          <pre className="agents18-supervisor-or-handoff-show">{c.show}</pre>
          <div className="agents18-supervisor-or-handoff-opts" role="radiogroup" aria-label="Which pattern is this?">
            {OPTIONS.map((a) => (
              <label key={a.id} className={`agents18-supervisor-or-handoff-opt${pick === a.id ? " on" : ""}`}>
                <input type="radio" name="agents18-supervisor-or-handoff" value={a.id} checked={pick === a.id} disabled={!!pick} onChange={() => choose(a.id)} />
                <span>{a.label}</span>
              </label>
            ))}
          </div>
          {pick && (
            <p className={`w-verdict ${right ? "good" : "bad"}`} role="status">
              {right ? "Matched. " : `Better fit: ${OPTIONS.find((a) => a.id === c.answer)?.label}. `}
              {c.why}
            </p>
          )}
          {pick && (
            <div className="w-row">
              <button type="button" className="w-btn primary" onClick={next}>
                {i + 1 < CASES.length ? "Next case" : "See my score"}
              </button>
            </div>
          )}
        </fieldset>
      )}
      {done && (
        <div className={`w-verdict ${hits >= 5 ? "good" : "bad"}`} role="status">
          You matched {hits} of {CASES.length}. The test is one question: after a worker finishes, does control return to the centre? If it does, it is a supervisor. If it moves on, it is a handoff.
        </div>
      )}
      {done && (
        <div className="w-row">
          <button type="button" className="w-btn ghost" onClick={() => { setI(0); setPick(null); setHits(0); setDone(false); }}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
