import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents27SafeguardPicker.css";

type Guard = "key" | "force" | "sweep";

const GUARDS: { id: Guard; label: string }[] = [
  { id: "key", label: "Idempotency key" },
  { id: "force", label: "5-minute force-close" },
  { id: "sweep", label: "Nightly recovery sweep" },
];

const CASES: { text: string; answer: Guard; why: string }[] = [
  { text: "A consumer restarts, and the topic delivers the same payment_due event again.", answer: "key", why: "The repeat asks for the same link and mail keys. The first results come back and nothing is sent twice." },
  { text: "A run has been open for 6 minutes and has saved no new node.", answer: "force", why: "The force-close runs on its own timer. It sees the run is older than 5 minutes and hands it to sales with the reason timeout." },
  { text: "A run was force-closed at 09:10. By midnight the customer has paid.", answer: "sweep", why: "The nightly recovery sweep releases the sales row and publishes a payment_recover event. The fresh signals say the delta is zero, so the run closes." },
  { text: "The midnight job runs twice and finds the same overpayment both times.", answer: "key", why: "The refund key carries the itinerary and the amount. The second insert changes nothing, so one refund goes out." },
  { text: "At midnight a run sits in link_generated and no consumer owns it.", answer: "sweep", why: "It never reached a closed status. The nightly recovery sweep finds every run that never closed and takes it through again." },
  { text: "A model call hangs while the consumer waits on it.", answer: "force", why: "The consumer can't rescue itself. The force-close, on its own timer, notices the age of the run and hands it to sales." },
];

export default function Agents27SafeguardPicker({ onComplete }: WidgetProps) {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<Guard | null>(null);
  const [hits, setHits] = useState(0);
  const [done, setDone] = useState(false);
  const complete = useComplete(onComplete);
  const c = CASES[i];

  function choose(g: Guard) {
    if (pick) return;
    setPick(g);
    if (g === c.answer) setHits((h) => h + 1);
  }
  function next() {
    if (i + 1 < CASES.length) {
      setI(i + 1);
      setPick(null);
    } else {
      setDone(true);
      complete(`${hits} of ${CASES.length} matched`);
    }
  }

  if (done) {
    return (
      <div className="w-panel agents27-safeguard-picker">
        <div className={`w-verdict ${hits >= 5 ? "good" : "bad"}`} role="status">
          You matched {hits} of {CASES.length}. A key guards one effect against a repeat. The force-close guards the clock. The nightly recovery sweep picks up what both of them leave behind.
        </div>
        <div className="w-row">
          <button type="button" className="w-btn ghost" onClick={() => { setI(0); setPick(null); setHits(0); setDone(false); }}>Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-panel agents27-safeguard-picker">
      <p className="agents27-safeguard-picker-note">Case {i + 1} of {CASES.length}. Pick the safeguard that handles it.</p>
      <p className="agents27-safeguard-picker-case">{c.text}</p>
      <div className="agents27-safeguard-picker-opts" role="radiogroup" aria-label={c.text}>
        {GUARDS.map((g) => (
          <button
            key={g.id}
            type="button"
            role="radio"
            aria-checked={pick === g.id}
            disabled={pick !== null}
            className={`w-btn ${pick === g.id ? (g.id === c.answer ? "primary" : "ghost") : "ghost"}`}
            onClick={() => choose(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>
      {pick && (
        <>
          <div className={`w-verdict ${pick === c.answer ? "good" : "bad"}`} role="status">
            {pick === c.answer ? "Matched. " : `Better fit: ${GUARDS.find((g) => g.id === c.answer)!.label}. `}
            {c.why}
          </div>
          <div className="w-row">
            <button type="button" className="w-btn primary" onClick={next}>{i + 1 < CASES.length ? "Next case" : "See result"}</button>
          </div>
        </>
      )}
    </div>
  );
}
