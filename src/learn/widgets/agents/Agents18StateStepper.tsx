import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents18StateStepper.css";

const OPTIONS: { id: string; label: string }[] = [
  {
    "id": "triage",
    "label": "Triage"
  },
  {
    "id": "researcher",
    "label": "Researcher"
  },
  {
    "id": "writer",
    "label": "Writer"
  },
  {
    "id": "nobody",
    "label": "Nobody, the task is done"
  }
];

const CASES: { id: string; state: string; show: string; answer: string; why: string }[] = [
  {
    "id": "a",
    "state": "A process loads task T-7 by its ID.",
    "show": "{\"task_id\": \"T-7\", \"status\": \"new\", \"findings\": [], \"draft\": \"\"}",
    "answer": "triage",
    "why": "A new task has not been sorted yet. Triage owns the status new."
  },
  {
    "id": "b",
    "state": "Another process loads task T-8 by its ID.",
    "show": "{\"task_id\": \"T-8\", \"status\": \"triaged\", \"findings\": [], \"draft\": \"\"}",
    "answer": "researcher",
    "why": "Triage has finished, and nothing is researched. The researcher owns the status triaged."
  },
  {
    "id": "c",
    "state": "A restart loads task T-9 by its ID.",
    "show": "{\"task_id\": \"T-9\", \"status\": \"researched\", \"findings\": [\"PEP 572\", \"3.8\"], \"draft\": \"\"}",
    "answer": "writer",
    "why": "The findings are in the state. The writer owns the status researched, and it needs no re-run of the search."
  },
  {
    "id": "d",
    "state": "A late message arrives for task T-9.",
    "show": "{\"task_id\": \"T-9\", \"status\": \"done\", \"findings\": [\"PEP 572\", \"3.8\"], \"draft\": \"The walrus operator came in 3.8.\"}",
    "answer": "nobody",
    "why": "The status is done, and OWNER has no entry for it, so no agent should run. A loop must check for done before it looks up an owner. This chapter's swarm doesn't, so it would raise a KeyError."
  },
  {
    "id": "e",
    "state": "The writer sent T-10 back for a source.",
    "show": "{\"task_id\": \"T-10\", \"status\": \"triaged\", \"findings\": [\"PEP 572\"], \"draft\": \"\"}",
    "answer": "researcher",
    "why": "The writer reset the status to triaged. The state now says that research is open again, so the researcher carries on."
  }
];

export default function Agents18StateStepper({ onComplete }: WidgetProps) {
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
    <div className="w-panel agents18-state-stepper">
      <p className="agents18-state-stepper-note">Each case is a state loaded by its task ID. Read the status and say who carries on.</p>
      {!done && (
        <fieldset className="agents18-state-stepper-card">
          <legend className="agents18-state-stepper-legend">Case {i + 1} of {CASES.length}</legend>
          <p className="agents18-state-stepper-state">{c.state}</p>
          <pre className="agents18-state-stepper-show">{c.show}</pre>
          <div className="agents18-state-stepper-opts" role="radiogroup" aria-label="Which agent carries on?">
            {OPTIONS.map((a) => (
              <label key={a.id} className={`agents18-state-stepper-opt${pick === a.id ? " on" : ""}`}>
                <input type="radio" name="agents18-state-stepper" value={a.id} checked={pick === a.id} disabled={!!pick} onChange={() => choose(a.id)} />
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
        <div className={`w-verdict ${hits >= 4 ? "good" : "bad"}`} role="status">
          You matched {hits} of {CASES.length}. The next agent never asks where the task came from. It loads the state by ID and acts on the status it finds.
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
