import { useState } from "react";
import { MotionConfig } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C02FewshotPicker.css";

const CASES = [
  { id: "credit", name: "Credit note" },
  { id: "missing", name: "Missing PO number" },
  { id: "currency", name: "Euro with comma decimals" },
  { id: "zerovat", name: "VAT charged at zero" },
  { id: "ocr", name: "Scan with OCR noise" },
  { id: "date", name: "Day-first date" },
];
// Illustrative pool for Harbour Supplies.
const POOL: { id: string; text: string; covers: string[] }[] = [
  { id: "e1", text: "Plain pound invoice, one line, 20% VAT.", covers: [] },
  { id: "e2", text: "Plain pound invoice, three lines, 20% VAT.", covers: [] },
  { id: "e3", text: "Credit note with negative amounts and no PO number.", covers: ["credit", "missing"] },
  { id: "e4", text: "Euro invoice with amounts like 1.250,00 and VAT shown as zero.", covers: ["currency", "zerovat"] },
  { id: "e5", text: "Pound invoice dated 03/04/26, due 30 days later.", covers: ["date"] },
  { id: "e6", text: "Invoice with the PO number box left blank.", covers: ["missing"] },
  { id: "e7", text: "Scanned invoice where 10 reads as l0, dated 14/05/26.", covers: ["ocr", "date"] },
  { id: "e8", text: "Export invoice at 0% VAT, pounds.", covers: ["zerovat"] },
];

export default function C02FewshotPicker({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picked, setPicked] = useState<string[]>([]);
  const [guess, setGuess] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const covered = new Set(picked.flatMap((id) => POOL.find((p) => p.id === id)?.covers ?? []));
  const uncovered = CASES.filter((c) => !covered.has(c.id));

  const toggle = (id: string) => {
    if (revealed) return;
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 3 ? [...p, id] : p));
  };
  const reveal = () => {
    setRevealed(true);
    const n = attempts + 1;
    setAttempts(n);
    if (uncovered.length === 0) complete(`All six cases covered, predicted ${guess} uncovered`);
    else if (n >= 2) complete(`${uncovered.length} cases uncovered after two attempts, explanation shown`);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel llm-fewshot-picker">
        <p className="w-label">Illustrative pool</p>
        <p>Pick exactly three examples for the prompt. The six edge cases below break naive extractors.</p>
        <ul className="llm-fewshot-picker-pool">
          {POOL.map((p) => {
            const on = picked.includes(p.id);
            return (
              <li key={p.id}>
                <button type="button" className={`llm-fewshot-picker-ex${on ? " on" : ""}`} aria-pressed={on} disabled={revealed} onClick={() => toggle(p.id)}>
                  {p.text}
                </button>
              </li>
            );
          })}
        </ul>
        {picked.length === 3 && !revealed && (
          <div className="w-row">
            <span>How many of the six edge cases will your three examples leave uncovered?</span>
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <button key={n} type="button" className={`w-chip${guess === n ? " is-on" : ""}`} aria-pressed={guess === n} onClick={() => setGuess(n)}>
                {n}
              </button>
            ))}
            <button type="button" className="w-btn" disabled={guess === null} onClick={reveal}>Show coverage</button>
          </div>
        )}
        {revealed && (
          <>
            <ul className="llm-fewshot-picker-cases">
              {CASES.map((c) => (
                <li key={c.id} className={covered.has(c.id) ? "got" : "miss"}>{covered.has(c.id) ? "Covered" : "Missed"}: {c.name}</li>
              ))}
            </ul>
            <div className={`w-verdict ${uncovered.length === 0 ? "good" : "bad"}`} role="status">
              {uncovered.length} uncovered, and you predicted {guess}. {uncovered.length === 0 ? "You chose examples that each add a new edge case. " : "Plain examples add format but no coverage, so the model has to guess the rest. "}
              Also check the copying risk: three examples that all share one date format will teach the model that format.
            </div>
            <button type="button" className="w-btn ghost" onClick={() => { setPicked([]); setGuess(null); setRevealed(false); }}>Try again</button>
          </>
        )}
      </div>
    </MotionConfig>
  );
}
