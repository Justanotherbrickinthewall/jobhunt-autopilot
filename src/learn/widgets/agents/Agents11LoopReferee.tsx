import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents11LoopReferee.css";

type Action = "run" | "feedback" | "answer" | "repeat" | "budget";

const ACTIONS: { id: Action; label: string }[] = [
  { id: "run", label: "Run the tool and go on" },
  { id: "feedback", label: "Feed an error back and go on" },
  { id: "answer", label: "Stop with the answer" },
  { id: "repeat", label: "Stop: repeated call" },
  { id: "budget", label: "Stop: step budget" },
];

const CASES: { id: string; state: string; reply: string; answer: Action; why: string }[] = [
  { id: "fresh", state: "Step 1 of 6. No calls made yet.", reply: '{"thought": "Find the PEP.", "tool": "search_peps", "args": {"query": "walrus"}}', answer: "run", why: "The reply parses, the call is new and the budget has room. The loop runs the tool and appends the result." },
  { id: "final", state: "Step 3 of 6. Two lookups done.", reply: '{"answer": "Python 3.8, through PEP 572."}', answer: "answer", why: "An answer is the one stop the model controls. The loop returns it as it is." },
  { id: "prose", state: "Step 2 of 6.", reply: '{"thought": "Let me think about it."}', answer: "feedback", why: "The reply has neither an answer nor a tool call. The loop writes a FormatError into the history and asks again. The step still counts against the budget." },
  { id: "twice", state: "Step 3 of 6. Step 1 made this exact call.", reply: '{"tool": "search_peps", "args": {"query": "walrus"}}', answer: "repeat", why: "Same tool, same arguments. A second run returns the same result, so the model is stuck. Stop before the tool runs." },
  { id: "badarg", state: "Step 2 of 6.", reply: '{"tool": "python_feature_version", "args": {"feature": "walrus"}}', answer: "run", why: "The reply parses and the call is new. The tool fails on the argument, and the ToolError comes back as the observation. The loop does not treat that as its own error." },
  { id: "last", state: "Step 3 of 3, the last allowed. No answer yet.", reply: '{"tool": "read_pep_section", "args": {"pep": 572, "section": "history"}}', answer: "run", why: "This step is still inside the budget, so the tool runs. The loop stops after it, with no step left to ask the model again." },
];

export default function Agents11LoopReferee({ onComplete }: WidgetProps) {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<Action | null>(null);
  const [hits, setHits] = useState(0);
  const [done, setDone] = useState(false);
  const complete = useComplete(onComplete);
  const c = CASES[i];
  const right = pick === c.answer;

  function choose(a: Action) {
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
      complete(`${hits} of ${CASES.length} calls matched the loop`);
    }
  }

  return (
    <div className="w-panel agents11-loop-referee">
      <p className="agents11-loop-referee-note">Be the loop. For each model reply, say what your code does next. Predict before you pick.</p>
      {!done && (
        <fieldset className="agents11-loop-referee-card">
          <legend className="agents11-loop-referee-legend">Case {i + 1} of {CASES.length}</legend>
          <p className="agents11-loop-referee-state">{c.state}</p>
          <pre className="agents11-loop-referee-reply">{c.reply}</pre>
          <div className="agents11-loop-referee-opts" role="radiogroup" aria-label="What does the loop do next?">
            {ACTIONS.map((a) => (
              <label key={a.id} className={`agents11-loop-referee-opt${pick === a.id ? " on" : ""}`}>
                <input type="radio" name="agents11-loop-referee" value={a.id} checked={pick === a.id} disabled={!!pick} onChange={() => choose(a.id)} />
                <span>{a.label}</span>
              </label>
            ))}
          </div>
          {pick && (
            <p className={`w-verdict ${right ? "good" : "bad"}`} role="status">
              {right ? "Matched. " : `Better fit: ${ACTIONS.find((a) => a.id === c.answer)?.label}. `}
              {c.why}
            </p>
          )}
          {pick && (
            <div className="w-row">
              <button type="button" className="w-btn primary" onClick={next}>
                {i + 1 < CASES.length ? "Next reply" : "See my score"}
              </button>
            </div>
          )}
        </fieldset>
      )}
      {done && (
        <div className={`w-verdict ${hits >= 5 ? "good" : "bad"}`} role="status">
          You matched {hits} of {CASES.length}. The loop checks three things in order: does the reply parse, is the call new, is there budget left. Only the answer is the model's choice. The other stops belong to your code.
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
