import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents18GuardJudge.css";

const OPTIONS: { id: string; label: string }[] = [
  {
    "id": "none",
    "label": "None, the run is fine"
  },
  {
    "id": "table",
    "label": "The ALLOWED table"
  },
  {
    "id": "cap",
    "label": "The handoff cap"
  },
  {
    "id": "pingpong",
    "label": "The ping-pong check"
  }
];

const CASES: { id: string; state: string; show: string; answer: string; why: string }[] = [
  {
    "id": "a",
    "state": "Cap 4. ALLOWED: triage to researcher, researcher to writer or triage, writer to researcher.",
    "show": "triage, researcher, writer, then the writer answers",
    "answer": "none",
    "why": "Two handoffs, all allowed, no repeat. The writer answers and the run ends."
  },
  {
    "id": "b",
    "state": "Cap 4. Same table.",
    "show": "triage hands straight to the writer",
    "answer": "table",
    "why": "Triage may hand only to the researcher. ALLOWED is checked before anything moves."
  },
  {
    "id": "c",
    "state": "Cap 6. Same table.",
    "show": "triage, researcher, writer, researcher, writer",
    "answer": "pingpong",
    "why": "The last four agents alternate between researcher and writer after four handoffs. The cap of 6 is still far away."
  },
  {
    "id": "d",
    "state": "Cap 3. Same table.",
    "show": "triage, researcher, triage, researcher",
    "answer": "pingpong",
    "why": "Three handoffs have been made, and the cap is checked before a fourth. The last four agents already alternate, so ping-pong fires first."
  },
  {
    "id": "e",
    "state": "Cap 2. Same table.",
    "show": "triage, researcher, writer, and the writer asks to hand back to the researcher",
    "answer": "cap",
    "why": "The handoff is allowed by the table. Two handoffs are already made, so the cap stops the third."
  }
];

export default function Agents18GuardJudge({ onComplete }: WidgetProps) {
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
    <div className="w-panel agents18-guard-judge">
      <p className="agents18-guard-judge-note">Each case gives the settings and the path. Say which guard stops the run, or none.</p>
      {!done && (
        <fieldset className="agents18-guard-judge-card">
          <legend className="agents18-guard-judge-legend">Case {i + 1} of {CASES.length}</legend>
          <p className="agents18-guard-judge-state">{c.state}</p>
          <pre className="agents18-guard-judge-show">{c.show}</pre>
          <div className="agents18-guard-judge-opts" role="radiogroup" aria-label="Which guard fires first?">
            {OPTIONS.map((a) => (
              <label key={a.id} className={`agents18-guard-judge-opt${pick === a.id ? " on" : ""}`}>
                <input type="radio" name="agents18-guard-judge" value={a.id} checked={pick === a.id} disabled={!!pick} onChange={() => choose(a.id)} />
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
          You matched {hits} of {CASES.length}. In the code, ALLOWED and the status are checked first, then the cap. The ping-pong check runs after a handoff is applied.
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
