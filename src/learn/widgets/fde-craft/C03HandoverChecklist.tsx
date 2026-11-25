import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C03HandoverChecklist.css";

type Pkg = { id: string; name: string; has: string[]; ready: boolean; why: string };
const NEEDS = [
  "Source code and deploy steps",
  "Runbook for the five likeliest failures",
  "Labelled eval set with a run command",
  "Named owner and on-call route",
  "Alert thresholds and a rollback step",
];

const PKGS: Pkg[] = [
  { id: "a", name: "Package A", has: [NEEDS[0]], ready: false, why: "Code only. The team can read it, but cannot tell when it breaks or whether a change made it worse." },
  { id: "b", name: "Package B", has: [NEEDS[0], NEEDS[1], NEEDS[2], NEEDS[4]], ready: false, why: "Four of five, and the strongest four. But nobody is named, so an alert fires into the void. Counting items is not the test. Ask who acts on Monday." },
  { id: "c", name: "Package C", has: NEEDS, ready: true, why: "All five. On Monday the owner can fix a known failure, change a prompt, run the evals and roll back." },
];

export default function C03HandoverChecklist({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [judged, setJudged] = useState<Record<string, boolean>>({});
  const [shown, setShown] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const all = PKGS.every((p) => judged[p.id] !== undefined);
  const right = PKGS.filter((p) => judged[p.id] === p.ready).length;

  // Completes when all three are judged correctly, or after the second attempt with the explanations shown.
  function show() {
    const n = attempts + 1;
    setAttempts(n);
    setShown(true);
    if (right === PKGS.length || n >= 2) complete(`${right} of ${PKGS.length} packages judged correctly`);
  }
  const locked = shown && (right === PKGS.length || attempts >= 2);

  return (
    <div className="w-panel fde-craft-handover-checklist">
      <p className="fde-craft-handover-checklist-lede">
        Three handover packages for the invoice pipeline. For each, decide if the Harbour Supplies team could run, change and test the system on Monday.
      </p>
      <div className="fde-craft-handover-checklist-grid">
        {PKGS.map((p) => (
          <div key={p.id} className="fde-craft-handover-checklist-pkg">
            <h4>{p.name}</h4>
            <ul>
              {NEEDS.map((n) => (
                <li key={n} className={p.has.includes(n) ? "is-has" : "is-lacks"}>
                  <span aria-hidden="true">{p.has.includes(n) ? "Has" : "Lacks"}</span> {n}
                </li>
              ))}
            </ul>
            <div className="w-row" role="group" aria-label={`${p.name} verdict`}>
              <button type="button" className={`w-btn small ${judged[p.id] === true ? "is-on" : "ghost"}`} aria-pressed={judged[p.id] === true} disabled={shown} onClick={() => setJudged((j) => ({ ...j, [p.id]: true }))}>
                Ready on Monday
              </button>
              <button type="button" className={`w-btn small ${judged[p.id] === false ? "is-on" : "ghost"}`} aria-pressed={judged[p.id] === false} disabled={shown} onClick={() => setJudged((j) => ({ ...j, [p.id]: false }))}>
                Not ready
              </button>
            </div>
            {shown && (
              <p className={`fde-craft-handover-checklist-why ${judged[p.id] === p.ready ? "is-right" : "is-wrong"}`}>
                {judged[p.id] === p.ready ? "Right. " : "Not quite. "}
                {p.why}
              </p>
            )}
          </div>
        ))}
      </div>
      {!shown && (
        <button type="button" className="w-btn" disabled={!all} onClick={show}>
          Check my verdicts
        </button>
      )}
      {shown && (
        <div className={`w-verdict ${right === PKGS.length ? "good" : "bad"}`} role="status">
          <strong>{right} of {PKGS.length} judged correctly.</strong> The test is not how much was written. It is whether the receiving team can find a fault, fix it and prove the fix.
        </div>
      )}
      {shown && !locked && (
        <button type="button" className="w-btn ghost" onClick={() => { setShown(false); setJudged({}); }}>
          Judge them again
        </button>
      )}
      <p className="fde-craft-handover-checklist-foot">Illustrative packages for a fictional customer. The five needs are a judgement, not a standard.</p>
    </div>
  );
}
