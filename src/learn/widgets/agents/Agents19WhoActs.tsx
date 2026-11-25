import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents19WhoActs.css";

type Pick = "researcher" | "versioner" | "writer" | "reviewer" | "done" | "stuck";

const OPTIONS: { id: Pick; label: string }[] = [
  { id: "researcher", label: "Researcher" },
  { id: "versioner", label: "Versioner" },
  { id: "writer", label: "Writer" },
  { id: "reviewer", label: "Reviewer" },
  { id: "done", label: "Stop: status is done" },
  { id: "stuck", label: "Stop: no agent can act" },
];

const CASES: { id: string; agents: string; board: string; answer: Pick; why: string }[] = [
  { id: "fresh", agents: "All four agents, in the order researcher, versioner, writer, reviewer.", board: "question", answer: "researcher", why: "Two agents can act, because the board has no findings and no versions section. The controller takes the first whose condition holds, and the researcher comes first." },
  { id: "found", agents: "All four agents.", board: "question, findings", answer: "versioner", why: "The researcher's condition is false now, because findings exist. The versioner still sees no versions section, so it acts." },
  { id: "both", agents: "All four agents.", board: "question, findings, versions", answer: "writer", why: "The writer waits for both sections. Nobody told it to wait. Its condition is just false until the board holds them." },
  { id: "draft", agents: "All four agents.", board: "question, findings, versions, draft", answer: "reviewer", why: "A draft exists and the status is not done, so the reviewer can act. Nobody else's condition holds." },
  { id: "removed", agents: "The versioner is removed. Three agents are left.", board: "question, findings", answer: "stuck", why: "The writer needs versions, and nobody writes them. No condition holds, so the controller stops and reports the sections it can see." },
  { id: "closed", agents: "All four agents.", board: "question, findings, versions, draft, status = done", answer: "done", why: "The controller checks the status before it picks anyone. A finished board stops the loop, even if some condition still holds." },
];

export default function Agents19WhoActs({ onComplete }: WidgetProps) {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<Pick | null>(null);
  const [hits, setHits] = useState(0);
  const [done, setDone] = useState(false);
  const complete = useComplete(onComplete);
  const c = CASES[i];
  const right = pick === c.answer;

  function choose(p: Pick) {
    if (pick) return;
    setPick(p);
    if (p === c.answer) setHits((h) => h + 1);
  }
  function next() {
    if (i + 1 < CASES.length) {
      setI(i + 1);
      setPick(null);
    } else {
      setDone(true);
      complete(`${hits} of ${CASES.length} picks matched the controller`);
    }
  }

  return (
    <div className="w-panel agents19-who-acts">
      <p className="agents19-who-acts-note">Be the controller. The researcher and versioner need a question. The writer needs the findings and versions sections. The reviewer needs a draft. Predict before you pick.</p>
      {!done && (
        <fieldset className="agents19-who-acts-card">
          <legend className="agents19-who-acts-legend">Board {i + 1} of {CASES.length}</legend>
          <p className="agents19-who-acts-line">{c.agents}</p>
          <pre className="agents19-who-acts-board">{c.board}</pre>
          <div className="agents19-who-acts-opts" role="radiogroup" aria-label="What does the controller do next?">
            {OPTIONS.map((o) => (
              <label key={o.id} className={`agents19-who-acts-opt${pick === o.id ? " on" : ""}`}>
                <input type="radio" name="agents19-who-acts" value={o.id} checked={pick === o.id} disabled={!!pick} onChange={() => choose(o.id)} />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
          {pick && (
            <p className={`w-verdict ${right ? "good" : "bad"}`} role="status">
              {right ? "Matched. " : `Better fit: ${OPTIONS.find((o) => o.id === c.answer)?.label}. `}
              {c.why}
            </p>
          )}
          {pick && (
            <div className="w-row">
              <button type="button" className="w-btn primary" onClick={next}>
                {i + 1 < CASES.length ? "Next board" : "See my score"}
              </button>
            </div>
          )}
        </fieldset>
      )}
      {done && (
        <div className={`w-verdict ${hits >= 5 ? "good" : "bad"}`} role="status">
          You matched {hits} of {CASES.length}. The controller does three things in order: stop if the status is done, find the first agent whose condition holds, and stop if there is none.
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
