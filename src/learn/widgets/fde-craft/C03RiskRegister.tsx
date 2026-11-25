import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C03RiskRegister.css";

// Illustrative reference ratings, 1 low to 3 high. owner says who can remove the risk.
type Risk = { id: string; text: string; l: number; i: number; owner: "us" | "customer"; note: string };
const RISKS: Risk[] = [
  { id: "r1", text: "The sample invoices have not arrived. The data export request has sat with IT for two weeks.", l: 3, i: 3, owner: "customer", note: "Likely, severe and only the customer can clear it. Raise it now." },
  { id: "r2", text: "One supplier sends invoices as scanned faxes that our extractor reads badly.", l: 3, i: 1, owner: "us", note: "Likely but small, and you can handle it. Log it and move on." },
  { id: "r3", text: "The security review for the Google Cloud project has not been booked.", l: 2, i: 3, owner: "customer", note: "A booking only the customer can make, with a long lead time." },
  { id: "r4", text: "A prompt change last week might have lowered date accuracy.", l: 2, i: 2, owner: "us", note: "Yours to fix. Run the eval set and you will know in an hour." },
  { id: "r5", text: "The finance director who sponsors the pilot may move teams next month.", l: 1, i: 3, owner: "customer", note: "Severe if it happens, but unlikely. Mention it to the sponsor, but it is not this week's fire." },
  { id: "r6", text: "The demo laptop sometimes loses its network connection.", l: 2, i: 1, owner: "us", note: "A small annoyance. Bring a hotspot." },
];

export default function C03RiskRegister({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [likely, setLikely] = useState<Record<string, number>>({});
  const [impact, setImpact] = useState<Record<string, number>>({});
  const [raise, setRaise] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const rated = RISKS.every((r) => likely[r.id] && impact[r.id]);
  const score = (id: string) => (likely[id] ?? 0) * (impact[id] ?? 0);
  const refTop = RISKS.filter((r) => r.owner === "customer").sort((a, b) => b.l * b.i - a.l * a.i)[0];
  // A rating is close when it sits within one step of the reference on both axes.
  const close = (r: Risk) => Math.abs((likely[r.id] ?? 0) - r.l) <= 1 && Math.abs((impact[r.id] ?? 0) - r.i) <= 1;
  const closeCount = RISKS.filter(close).length;
  const raiseOk = raise === refTop.id;
  const right = raiseOk && closeCount >= 5;

  // Completes on a good choice with sound ratings, or after the second attempt with the reference shown.
  function check() {
    const n = attempts + 1;
    setAttempts(n);
    setDone(true);
    if (right || n >= 2) {
      complete(`${raiseOk ? "raised the right risk" : "raised a different risk"}, ${closeCount} of ${RISKS.length} ratings close`);
    }
  }
  const locked = done && (right || attempts >= 2);

  const sel = (id: string, v: Record<string, number>, set: (f: (p: Record<string, number>) => Record<string, number>) => void, label: string) => (
    <label className="fde-craft-risk-register-sel">
      <span>{label}</span>
      <select value={v[id] ?? ""} disabled={done} onChange={(e) => set((p) => ({ ...p, [id]: Number(e.target.value) }))}>
        <option value="" disabled>Rate</option>
        <option value={1}>1 low</option>
        <option value={2}>2 medium</option>
        <option value={3}>3 high</option>
      </select>
    </label>
  );

  return (
    <div className="w-panel fde-craft-risk-register">
      <p className="fde-craft-risk-register-lede">
        Week three of the Harbour Supplies pilot. Rate each risk for likelihood and impact, then choose the one to raise with the sponsor this week.
      </p>
      <ul className="fde-craft-risk-register-list">
        {RISKS.map((r) => (
          <li key={r.id} className={raise === r.id ? "is-raise" : ""}>
            <p>{r.text}</p>
            <div className="w-row">
              {sel(r.id, likely, setLikely, "Likelihood")}
              {sel(r.id, impact, setImpact, "Impact")}
              <span className="w-mono">score {score(r.id) || "-"}</span>
              <button type="button" className={`w-btn small ${raise === r.id ? "is-on" : "ghost"}`} aria-pressed={raise === r.id} disabled={done || !rated} onClick={() => setRaise(r.id)}>
                Raise this week
              </button>
            </div>
            {done && (
              <p className="fde-craft-risk-register-note">
                Your rating was {close(r) ? "close" : "more than a step off"}. Reference: likelihood {r.l}, impact {r.i}, owner {r.owner === "customer" ? "the customer" : "us"}. {r.note}
              </p>
            )}
          </li>
        ))}
      </ul>
      {!rated && <p className="fde-craft-risk-register-hint">Rate every risk to unlock the raise button.</p>}
      {!done && (
        <button type="button" className="w-btn" disabled={!raise} onClick={check}>
          Check my choice
        </button>
      )}
      {done && (
        <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
          <strong>{right ? "Good choice." : !raiseOk ? "A different risk wins." : "Right risk, but your ratings were off."}</strong>{" "}
          {closeCount} of {RISKS.length} ratings were within one step. Raise the risk with the highest score that only the customer can clear. You fix the rest yourself without a meeting.
        </div>
      )}
      {done && !locked && (
        <button type="button" className="w-btn ghost" onClick={() => setDone(false)}>
          Change my ratings and try once more
        </button>
      )}
      <p className="fde-craft-risk-register-foot">Illustrative ratings for a fictional pilot. Reasonable people could rate some of these one step apart.</p>
    </div>
  );
}
