import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents21JudgeAudit.css";

// Six hand-labelled answers, with the score a lenient judge gave each.
const ROWS = [
  { text: "Python 3.8, through PEP 572.", score: 5, human: true },
  { text: "Python 3.10.", score: 2, human: false },
  { text: "It lets CPython build without the GIL.", score: 5, human: true },
  { text: "PEP 8 is the style guide for Python code.", score: 4, human: false },
  { text: "PEP 999 sets the release schedule.", score: 4, human: false },
  { text: "The desk answers questions about Python PEPs only.", score: 5, human: true },
];

export default function Agents21JudgeAudit({ onComplete }: WidgetProps) {
  const [t, setT] = useState(4);
  const [sent, setSent] = useState(false);
  const complete = useComplete(onComplete);
  const agree = ROWS.filter((r) => (r.score >= t) === r.human).length;
  const perfect = agree === ROWS.length;

  function check() {
    setSent(true);
    if (perfect) complete(`pass score ${t} gives full agreement`);
  }

  return (
    <div className="w-panel agents21-judge-audit">
      <p className="agents21-judge-audit-note">A lenient LLM judge scored six answers a person had already marked. Move the pass score until the LLM judge and the person agree on all six.</p>
      <label className="agents21-judge-audit-row">
        <span>Pass at a score of {t} or more</span>
        <input type="range" min={1} max={5} value={t} onChange={(e) => { setT(Number(e.target.value)); setSent(false); }} />
      </label>
      <ul className="agents21-judge-audit-list">
        {ROWS.map((r) => {
          const ok = (r.score >= t) === r.human;
          return (
            <li key={r.text} className={ok ? "ok" : "bad"}>
              <span>{r.text}</span>
              <span>score {r.score}, person {r.human ? "pass" : "fail"}, LLM judge {r.score >= t ? "pass" : "fail"}: {ok ? "agree" : "disagree"}</span>
            </li>
          );
        })}
      </ul>
      <div className="w-row"><button type="button" className="w-btn primary" onClick={check}>Check agreement</button></div>
      {sent && (
        <p className={`w-verdict ${perfect ? "good" : "bad"}`} role="status">
          {perfect
            ? `Agreement is ${agree} of 6, but only because the pass score sits at 5. The LLM judge still gave two wrong answers a 4. Raising the bar hides a lenient LLM judge. Fix the rubric so a wrong answer cannot reach 4, then re-run the agreement check.`
            : `Agreement is ${agree} of 6. The LLM judge passes answers a person failed, so it cannot be trusted to grade yet.`}
        </p>
      )}
    </div>
  );
}
