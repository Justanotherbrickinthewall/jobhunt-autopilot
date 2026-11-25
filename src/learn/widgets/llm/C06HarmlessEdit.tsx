import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C06HarmlessEdit.css";

type Case = { id: string; label: string; flips: boolean; why: string };

// Illustrative figures. The cases and their outcomes are hand-authored for teaching.
const CASES: Case[] = [
  { id: "g1", label: "Clean digital invoice, every field present", flips: false, why: "Nothing is missing, so the null rule never fires." },
  { id: "g2", label: "Scan with no purchase order number", flips: true, why: "The model now writes an empty string where the schema wants null." },
  { id: "g3", label: "Credit note with no due date", flips: true, why: "A missing due date comes back as an empty string and fails the schema." },
  { id: "g4", label: "Euro invoice, every field present", flips: false, why: "All fields are found, so the rule never fires." },
  { id: "g5", label: "Blurry scan, supplier's VAT registration number unreadable", flips: true, why: "Unreadable fields are exactly where the null rule applies." },
  { id: "g6", label: "Three-page invoice, every field present", flips: false, why: "Nothing is missing here either." },
  { id: "g7", label: "Clean invoice with a line reading empty pallet return", flips: true, why: "The new word appears in the data. The model drops or rewrites that line item. A one-word edit can change cases that look unrelated." },
  { id: "g8", label: "Pound invoice, every field present", flips: false, why: "All fields are found, so the rule never fires." },
];

export default function C06HarmlessEdit({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picked, setPicked] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [runs, setRuns] = useState(0);

  const actual = CASES.filter((c) => c.flips).map((c) => c.id);
  const hits = picked.filter((id) => actual.includes(id)).length;
  const falseAlarms = picked.length - hits;
  const missed = actual.length - hits;
  const exact = falseAlarms === 0 && missed === 0;
  const after = CASES.length - actual.length;

  const toggle = (id: string) => {
    if (revealed) return;
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };
  const reveal = () => {
    setRevealed(true);
    const n = runs + 1;
    setRuns(n);
    if (exact) complete(`All ${actual.length} flips found, no false alarms`);
    else if (n >= 2) complete(`${hits} of ${actual.length} flips found after two attempts, explanation shown`);
  };
  const reset = () => {
    setRevealed(false);
    setPicked([]);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel llm-harmless-edit">
        <p className="llm-harmless-edit-note">Illustrative figures. Eight golden cases, all passing before the edit.</p>
        <div className="w-inset llm-harmless-edit-diff">
          <div className="llm-harmless-edit-line del w-mono">- Return null for any field you cannot find.</div>
          <div className="llm-harmless-edit-line add w-mono">+ Return empty for any field you cannot find.</div>
        </div>
        <p className="llm-harmless-edit-q">Your prediction: tick every case you think flips from pass to fail.</p>
        <ul className="llm-harmless-edit-list">
          {CASES.map((c) => {
            const on = picked.includes(c.id);
            const state = !revealed ? "" : c.flips ? (on ? " hit" : " miss") : on ? " alarm" : "";
            return (
              <li key={c.id}>
                <label className={`llm-harmless-edit-case${on ? " on" : ""}${state}`}>
                  <input type="checkbox" checked={on} disabled={revealed} onChange={() => toggle(c.id)} />
                  <span>
                    {c.label}
                    {revealed && (
                      <span className="llm-harmless-edit-why">
                        <b>{c.flips ? "Flips to fail. " : "Still passes. "}</b>
                        {c.why}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="w-row">
          {!revealed ? (
            <button type="button" className="w-btn" onClick={reveal}>
              Run the golden set ({picked.length} ticked)
            </button>
          ) : (
            <button type="button" className="w-btn ghost" onClick={reset}>
              Try again
            </button>
          )}
        </div>

        {revealed && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="llm-harmless-edit-result">
            <svg viewBox="0 0 220 44" className="llm-harmless-edit-svg" role="img" aria-label={`Passing cases fell from ${CASES.length} to ${after}`}>
              <text x="0" y="12" className="llm-harmless-edit-t">Before</text>
              <rect x="50" y="3" width={(CASES.length / CASES.length) * 160} height="10" rx="3" className="llm-harmless-edit-ok" />
              <text x="0" y="36" className="llm-harmless-edit-t">After</text>
              <rect x="50" y="27" width={(after / CASES.length) * 160} height="10" rx="3" className="llm-harmless-edit-ok" />
              <rect x={50 + (after / CASES.length) * 160} y="27" width={(actual.length / CASES.length) * 160} height="10" rx="3" className="llm-harmless-edit-bad" />
            </svg>
            <div className={`w-verdict ${exact ? "good" : "bad"}`} role="status">
              {exact ? "Exact match. " : `You found ${hits} of ${actual.length} flips, with ${falseAlarms} false alarm${falseAlarms === 1 ? "" : "s"} and ${missed} missed. `}
              Passing cases fell from {CASES.length} to {after}. A one-word edit changed the contract for every missing field, and one flip came from the word itself appearing in the data. Run the full golden set on every prompt edit, because your intuition will miss the strange one.
            </div>
          </motion.div>
        )}
      </div>
    </MotionConfig>
  );
}
