import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { useOnce } from "./c1012shared";
import "./C12TradeoffPicker.css";

// Meters are relative scores from 0 to 10 for this exercise. They are not measurements.
const METERS = ["Speed", "Cheapness", "Quality", "Safety"] as const;
type D = [number, number, number, number];
type Opt = { id: string; label: string; d: D; why: string };
type Decision = { id: string; title: string; opts: Opt[] };

const DECISIONS: Decision[] = [
  {
    id: "retrieval",
    title: "Retrieval",
    opts: [
      { id: "dense", label: "Embedding search only", d: [2, 2, 0, 0], why: "Fast and cheap, but exact product codes and error strings are the weak spot of embedding search." },
      { id: "hybrid", label: "Hybrid retrieval: embedding plus keyword search", d: [1, 1, 1, 0], why: "Catches both meaning and exact codes for a small cost." },
      { id: "rerank", label: "Hybrid retrieval plus a reranker", d: [-1, -1, 2, 1], why: "Best precision, and a better-grounded draft, at the price of added latency and spend." },
    ],
  },
  {
    id: "tickets",
    title: "What to index from past tickets",
    opts: [
      { id: "raw", label: "All tickets, raw threads", d: [1, 1, -2, -3], why: "Cheap to build, but it indexes unresolved guesses, duplicates and personal data." },
      { id: "resolved", label: "Resolved tickets only, scrubbed and summarised", d: [-1, -1, 2, 2], why: "More ingestion work. In return, you retrieve proven fixes and keep personal data out of embeddings." },
      { id: "kb", label: "Knowledge base articles only", d: [2, 2, -1, 1], why: "Authoritative and cheap, but it misses the long tail of problems that only tickets cover." },
    ],
  },
  {
    id: "output",
    title: "Who sees the generated reply",
    opts: [
      { id: "draft", label: "A draft for the agent to review and send", d: [0, 0, 0, 3], why: "A human gate catches wrong answers, and the agent's edits become labels." },
      { id: "auto", label: "Send automatically above a confidence threshold", d: [1, 2, 0, -4], why: "Saves agent time, but a confidently wrong reply reaches the customer." },
    ],
  },
  {
    id: "fresh",
    title: "Freshness",
    opts: [
      { id: "nightly", label: "Nightly batch re-index", d: [1, 1, -1, 0], why: "Simple. Answers can lag a product release by up to a day." },
      { id: "events", label: "Event-driven updates plus a nightly reconcile", d: [-1, -1, 1, 1], why: "Answers track releases closely, with more moving parts to run." },
    ],
  },
];

const BASE = 5;
const clamp = (n: number) => Math.max(0, Math.min(10, n));

export default function C12TradeoffPicker({ onComplete }: WidgetProps) {
  const reduce = useReducedMotion();
  const complete = useOnce(onComplete);
  const [sel, setSel] = useState<Record<string, string>>({});
  const [verdict, setVerdict] = useState<{ good: boolean; text: string } | null>(null);

  const values = useMemo(() => {
    const v: number[] = [BASE, BASE, BASE, BASE];
    DECISIONS.forEach((dec) => {
      const o = dec.opts.find((x) => x.id === sel[dec.id]);
      if (o) o.d.forEach((x, i) => (v[i] += x));
    });
    return v.map(clamp);
  }, [sel]);

  const complete_ = DECISIONS.every((d) => sel[d.id]);
  const lastPicked = DECISIONS.map((d) => d.opts.find((o) => o.id === sel[d.id])).filter(Boolean) as Opt[];

  function submit() {
    const [speed, cheap, quality, safety] = values;
    if (sel.output === "auto") {
      const t = "Rejected. The customer said a wrong reply sent to a customer is far worse than a slow one. Automatic sending puts the failure they fear on the fast path. Keep a human in the loop until draft acceptance earns more.";
      setVerdict({ good: false, text: t });
      complete("Failed: auto-send against stated risk.");
      return;
    }
    if (safety >= 8 && quality >= 7 && cheap >= 2 && speed >= 2) {
      setVerdict({ good: true, text: `Accepted. Safety ${safety} and quality ${quality} match what the customer prioritised, and speed ${speed} and cheapness ${cheap} stay workable. Several combinations pass, so be ready to say what you gave up.` });
      complete("Design matches customer priorities.");
    } else {
      const why = [safety < 8 ? "safety is below 8" : "", quality < 7 ? "quality is below 7" : "", cheap < 2 ? "it is too costly" : "", speed < 2 ? "it is too slow" : ""].filter(Boolean).join(", ");
      setVerdict({ good: false, text: `Not yet: ${why}. The customer weights safety and quality above speed. Revisit the choices whose consequences push those meters down.` });
      complete("Design did not match customer priorities.");
    }
  }

  return (
    <div className="w-panel c12tp-root">
      <div className="c12tp-brief">
        <p className="c12tp-bt">Customer brief</p>
        <p className="c12tp-bb">
          A regulated insurer. A wrong reply sent to a customer is far worse than a slow one. The budget is moderate. Product versions change every quarter. Agents will review everything at first.
        </p>
      </div>

      <div className="c12tp-meters" role="group" aria-label="Design meters, relative scores from zero to ten">
        {METERS.map((m, i) => (
          <div key={m} className="c12tp-meter">
            <div className="c12tp-mh">
              <span>{m}</span>
              <span className="c12tp-mv">{values[i]}/10</span>
            </div>
            <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="c12tp-mb" aria-hidden="true">
              <rect x="0" y="0" width="100" height="8" rx="4" className="c12tp-mt" />
              <motion.rect
                x="0"
                y="0"
                height="8"
                rx="4"
                className={"c12tp-mf m" + i}
                initial={false}
                animate={{ width: values[i] * 10 }}
                transition={reduce ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }}
              />
            </svg>
          </div>
        ))}
      </div>
      <p className="c12tp-note">Relative scores for this exercise, not measurements. Each choice moves them by a fixed amount.</p>

      {DECISIONS.map((dec) => (
        <fieldset key={dec.id} className="c12tp-fs">
          <legend>{dec.title}</legend>
          {dec.opts.map((o) => (
            <label key={o.id} className={"c12tp-opt" + (sel[dec.id] === o.id ? " is-on" : "")}>
              <input
                type="radio"
                name={"c12tp-" + dec.id}
                checked={sel[dec.id] === o.id}
                onChange={() => { setSel({ ...sel, [dec.id]: o.id }); setVerdict(null); }}
              />
              <span>
                {o.label}
                {sel[dec.id] === o.id && <span className="c12tp-why">{o.why}</span>}
              </span>
            </label>
          ))}
        </fieldset>
      ))}

      <div className="w-row">
        <button type="button" className="w-btn primary" disabled={!complete_} onClick={submit}>
          Submit my design
        </button>
        {!complete_ && <span className="c12tp-note">Choose one option in every group.</span>}
      </div>

      {verdict && (
        <div className="c12tp-v">
          <p className={"w-verdict " + (verdict.good ? "good" : "bad")} role="status">
            {verdict.text}
          </p>
          <p className="c12tp-note">Your choices: {lastPicked.map((o) => o.label).join("; ")}.</p>
        </div>
      )}
    </div>
  );
}
