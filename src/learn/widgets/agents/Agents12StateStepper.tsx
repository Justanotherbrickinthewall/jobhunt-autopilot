import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents12StateStepper.css";

// Each row: the state after the previous node, then the next node with two decoys.
const STEPS: { state: string; next: string; decoys: [string, string]; why: string }[] = [
  { state: '{ "request_id": "req-7", "question": "What is PEP 703 about?", "status": "open", "path": [] }', next: "classify", decoys: ["write", "gate"], why: "The start node is fixed in code. The model has not been asked anything yet." },
  { state: '+ "choice": "lookup", path: [classify]', next: "check_route", decoys: ["extract", "search"], why: "The edge after classify is a plain name. The raw choice is never acted on directly." },
  { state: '+ "route": "lookup", path: [classify, check_route]', next: "extract", decoys: ["version", "human_queue"], why: "The choice was in the enum and allowed, so the edge function maps lookup to extract." },
  { state: '+ "query": "GIL", path: [..., extract]', next: "search", decoys: ["read", "write"], why: "The chain's edge for extract is search. Only code sets it." },
  { state: '+ "evidence": ["PEP 703: Making the Global Interpreter Lock Optional"]', next: "gate", decoys: ["read", "write"], why: "GATED puts the gate node straight after search, before any more work is done." },
  { state: 'status is still "open"', next: "read", decoys: ["end", "human_queue"], why: "The gate node found evidence, so its edge function sends the run on to read." },
  { state: '+ "fact": "Lets CPython build without the GIL, so threads can run in parallel."', next: "write", decoys: ["gate", "classify"], why: "Read always feeds write. This is the second and last model call." },
  { state: '+ "answer": "PEP 703 lets CPython build without the GIL.", status: "done"', next: "end", decoys: ["extract", "check_route"], why: "Write leads to end, and the run is over. The path is saved with the state." },
];

export default function Agents12StateStepper({ onComplete }: WidgetProps) {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [hits, setHits] = useState(0);
  const complete = useComplete(onComplete);
  const s = STEPS[i];
  // Fixed order so the options do not move between renders.
  const options = [s.decoys[0], s.next, s.decoys[1]];
  const last = i === STEPS.length - 1;

  const choose = (o: string) => {
    if (pick) return;
    setPick(o);
    if (o === s.next) setHits((h) => h + 1);
  };
  const advance = () => {
    if (last) {
      complete(`${hits} of ${STEPS.length} predicted`);
      return;
    }
    setI(i + 1);
    setPick(null);
  };
  const done = last && pick !== null;

  return (
    <div className="w-panel agents12-state-stepper">
      <p className="agents12-state-stepper-note">
        Edge {i + 1} of {STEPS.length}. This is the state so far. Which node runs next?
      </p>
      <pre className="agents12-state-stepper-state" aria-label="State so far">{s.state}</pre>
      <div className="agents12-state-stepper-opts" role="group" aria-label="Next node">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            className={`w-btn${pick === o ? (o === s.next ? " right" : " wrong") : ""}`}
            disabled={pick !== null}
            onClick={() => choose(o)}
          >
            {o}
          </button>
        ))}
      </div>
      {pick && (
        <p className="agents12-state-stepper-why" role="status">
          {pick === s.next ? "Right. " : `The next node is ${s.next}. `}
          {s.why}
        </p>
      )}
      <div className="w-row">
        <button type="button" className="w-btn primary" disabled={!pick} onClick={advance}>
          {last ? "Finish" : "Next node"}
        </button>
      </div>
      {done && (
        <div className={`w-verdict ${hits >= 6 ? "good" : "bad"}`} role="status">
          You predicted {hits} of {STEPS.length} edges. Every edge was written in code. The model made one choice, at classify, and code checked it at check_route.
        </div>
      )}
    </div>
  );
}
