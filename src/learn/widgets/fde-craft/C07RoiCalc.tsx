import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C07RoiCalc.css";

// Illustrative Harbour Supplies figures, all worked in chapter 4.
// CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/about-claude/pricing (illustrative prices kept; they match $3 and $15 per million tokens, and the current Sonnet 5.5 list of $2 and $10 would change run cost by under 20 pounds a month).
const RATE = 28; // loaded pounds per clerk hour
const MANUAL_MIN = 6; // minutes to handle one invoice by hand
const ERR = 0.03; // share of invoices needing rework today
const RESIDUAL = 0.01; // share needing rework after the system
const REWORK_MIN = 15;
const REVIEW_MIN = 3;
const TOKEN_COST = (3000 * 2.4 + 500 * 12) / 1_000_000; // pounds per invoice
const INFRA = 400;
const MAINT = 8 * 70;

type Case = { id: string; title: string; brief: string; volume: number; review: number; fee: number };
const CASES: Case[] = [
  { id: "a", title: "Harbour main entity", brief: "4,000 invoices a month. The estimate is that 30 percent will need review. The supplier asks for a build fee of 48,000 pounds.", volume: 4000, review: 30, fee: 48000 },
  { id: "b", title: "Harbour sister entity", brief: "The same system and build fee, offered to a smaller entity with 1,500 invoices a month and the same review share.", volume: 1500, review: 30, fee: 48000 },
  { id: "c", title: "Harbour trading arm", brief: "3,000 invoices a month, the same review share and the same build fee. The sponsor wants an answer today.", volume: 3000, review: 30, fee: 48000 },
];
const VERDICTS = ["Sign as priced", "Renegotiate fee or scope", "Decline"] as const;

function model(volume: number, reviewPct: number) {
  const baseline = (volume * MANUAL_MIN * RATE) / 60 + (volume * ERR * REWORK_MIN * RATE) / 60;
  const tokens = volume * TOKEN_COST;
  const review = (volume * (reviewPct / 100) * REVIEW_MIN * RATE) / 60;
  const residual = (volume * RESIDUAL * REWORK_MIN * RATE) / 60;
  const run = tokens + INFRA + review + MAINT + residual;
  return { baseline, run, saving: baseline - run };
}
function band(months: number) {
  return months <= 6 ? 0 : months <= 9 ? 1 : 2;
}
const gbp = (n: number) => `£${Math.round(n).toLocaleString("en-GB")}`;

export default function C07RoiCalc({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [idx, setIdx] = useState(0);
  const [review, setReview] = useState(CASES[0].review);
  const [fee, setFee] = useState(CASES[0].fee);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [done, setDone] = useState(false);

  const c = CASES[idx];
  const m = model(c.volume, review);
  const months = m.saving > 0 ? fee / m.saving : Infinity;
  const correct = band(months);

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    const r = right + (i === correct ? 1 : 0);
    setRight(r);
    if (idx === CASES.length - 1) {
      setDone(true);
      complete(`${r} of ${CASES.length} verdicts matched the payback rule`);
    }
  }
  function next() {
    const n = CASES[idx + 1];
    setIdx(idx + 1);
    setReview(n.review);
    setFee(n.fee);
    setPicked(null);
  }

  return (
    <div className="w-panel fde-craft-roi-calc">
      <p className="fde-craft-roi-calc-lede">
        The finance director's rule: sign if payback is 6 months or less, renegotiate if it is over 6 and up to 9, decline if it is longer. Work out payback yourself, then give the verdict.
      </p>
      <div className="fde-craft-roi-calc-count">Case {idx + 1} of {CASES.length}: {c.title}</div>
      <p className="fde-craft-roi-calc-brief">{c.brief}</p>

      <div className="fde-craft-roi-calc-sliders">
        <label>
          <span className="w-label">Share reviewed by a person</span> <span className="w-mono">{review}%</span>
          <input type="range" min={10} max={60} step={5} value={review} disabled={picked !== null} onChange={(e) => setReview(Number(e.target.value))} aria-label="Share reviewed by a person" />
        </label>
        <label>
          <span className="w-label">Build fee</span> <span className="w-mono">{gbp(fee)}</span>
          <input type="range" min={24000} max={72000} step={2000} value={fee} disabled={picked !== null} onChange={(e) => setFee(Number(e.target.value))} aria-label="Build fee in pounds" />
        </label>
      </div>

      <table className="fde-craft-roi-calc-table">
        <tbody>
          <tr><th scope="row">Cost baseline a month</th><td className="w-mono">{gbp(m.baseline)}</td></tr>
          <tr><th scope="row">System run cost a month</th><td className="w-mono">{gbp(m.run)}</td></tr>
          <tr><th scope="row">Monthly saving</th><td className="w-mono">{gbp(m.saving)}</td></tr>
          <tr><th scope="row">Build fee</th><td className="w-mono">{gbp(fee)}</td></tr>
        </tbody>
      </table>

      <div className="fde-craft-roi-calc-choices" role="group" aria-label="Your verdict">
        {VERDICTS.map((v, i) => (
          <button key={v} type="button" className={`w-btn ghost${picked === i ? " is-on" : ""}`} onClick={() => pick(i)} disabled={picked !== null}>
            {v}
          </button>
        ))}
      </div>

      {picked !== null && (
        <div className={`w-verdict ${picked === correct ? "good" : "bad"}`} role="status">
          <strong>{picked === correct ? "Right." : `The rule gives: ${VERDICTS[correct]}.`}</strong>{" "}
          Payback is {gbp(fee)} divided by {gbp(m.saving)}, which is {Number.isFinite(months) ? `${months.toFixed(1)} months` : "never"}. {months <= 6 ? "That is inside 6 months." : months <= 9 ? "That is between 6 and 9 months." : "That is over 9 months."}
        </div>
      )}
      {picked !== null && !done && (
        <button type="button" className="w-btn" onClick={next}>Next case</button>
      )}
      {done && (
        <p className="fde-craft-roi-calc-foot">{right} of {CASES.length} verdicts matched the rule. Volume changed the answer more than anything else. The build fee stayed the same. Run cost fell with volume, but the saving fell faster.</p>
      )}
      <p className="fde-craft-roi-calc-foot">Illustrative figures. Clerks cost 28 pounds an hour. Manual handling takes 6 minutes. Review takes 3 minutes.</p>
    </div>
  );
}
