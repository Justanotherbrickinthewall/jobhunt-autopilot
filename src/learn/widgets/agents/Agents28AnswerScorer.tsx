import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents28AnswerScorer.css";

const ITEMS: { id: string; test: string; fix: string }[] = [
  { id: "clarify", test: "I asked about the task, the users and the risk, and I said my assumptions out loud.", fix: "Stage 1. Ask two questions that change the design, and state the rest as assumptions." },
  { id: "arch", test: "I said who picks the next step, and why a simpler design would not do.", fix: "Stage 2. Use chapter 10's map. Name the least autonomy that does the job." },
  { id: "state", test: "I named the state and the one owner of each part, with the task ID as the key.", fix: "Stage 3. Say what is saved, when it is saved and who may write it." },
  { id: "guards", test: "I put the rules in code on tools, data and actions, and I did not rely on the prompt.", fix: "Stage 4. Chapters 22 and 23: an allow-list, a schema, redaction, a risk class and an approval." },
  { id: "evals", test: "I gave a golden set, the metrics and a regression gate that fails the build.", fix: "Stage 5. Chapter 21: score the path as well as the answer, and set thresholds." },
  { id: "run", test: "I said what happens on a redelivered event and on a stuck run.", fix: "Stage 6. Chapters 20, 25 and 27: a key on every effect, a force-close and a nightly recovery sweep." },
  { id: "cost", test: "I gave model calls per task, rough latency and a monthly figure, with my assumptions.", fix: "Stage 7. Count calls, multiply by a stated latency and volume, and compare the options." },
];

export default function Agents28AnswerScorer({ onComplete }: WidgetProps) {
  const [on, setOn] = useState<Record<string, boolean>>({});
  const [scored, setScored] = useState(false);
  const complete = useComplete(onComplete);
  const hits = ITEMS.filter((i) => on[i.id]).length;
  const missing = ITEMS.filter((i) => !on[i.id]);

  return (
    <div className="w-panel agents28-scorer">
      <p className="agents28-scorer-note">Say your answer to the practice prompt aloud, then tick only what you really said.</p>
      <div className="w-stack">
        {ITEMS.map((it) => (
          <label key={it.id} className={`agents28-scorer-item${on[it.id] ? " on" : ""}`}>
            <input type="checkbox" checked={!!on[it.id]} onChange={() => { setOn((p) => ({ ...p, [it.id]: !p[it.id] })); setScored(false); }} />
            <span>{it.test}</span>
          </label>
        ))}
      </div>
      <div className="w-row">
        <button type="button" className="w-btn primary" onClick={() => { setScored(true); complete(`${hits} of ${ITEMS.length}`); }}>
          Score my answer
        </button>
      </div>
      {scored && (
        <div className={`w-verdict ${hits >= 6 ? "good" : "bad"}`} role="status">
          <p className="agents28-scorer-line">You covered {hits} of {ITEMS.length}.</p>
          {missing.length > 0 ? (
            <ul className="agents28-scorer-list">
              {missing.map((m) => <li key={m.id}>{m.fix}</li>)}
            </ul>
          ) : (
            <p className="agents28-scorer-line">Every stage is there. Now time it. The whole answer should fit in 10 minutes.</p>
          )}
        </div>
      )}
    </div>
  );
}
