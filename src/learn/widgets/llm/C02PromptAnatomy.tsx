import { useState } from "react";
import { MotionConfig } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C02PromptAnatomy.css";

type Part = "role" | "context" | "examples" | "contract";
const PARTS: { id: Part; name: string }[] = [
  { id: "role", name: "Role and task" },
  { id: "context", name: "Context" },
  { id: "examples", name: "Examples" },
  { id: "contract", name: "Output contract" },
];
const FRAGMENTS: { id: string; text: string; part: Part }[] = [
  { id: "f1", text: "You read supplier invoices for Harbour Supplies.", part: "role" },
  { id: "f2", text: "Extract the invoice date and the total.", part: "role" },
  { id: "f3", text: "The invoice text sits between invoice tags.", part: "context" },
  { id: "f4", text: "Example: the text Date 03/04/26 gives invoice_date 2026-03-04.", part: "examples" },
  { id: "f5", text: "Reply with JSON only. invoice_date is YYYY-MM-DD and total is a number.", part: "contract" },
];
const FIXES = [
  { text: "Correct the example and add a context line saying UK invoices write the day first.", good: true, why: "The example teaches month first, and the model copies it. Only a corrected example plus a stated convention fixes the cause." },
  { text: "Add the words be careful with dates to the role line.", good: false, why: "A vague warning gives the model nothing to act on. The wrong convention is still taught by the example." },
  { text: "Set temperature to zero.", good: false, why: "Zero makes the same mistake more steady. The model is following the example, not guessing at random." },
  { text: "Add a confidence field to the output contract.", good: false, why: "A new field reports on the mistake without removing it." },
];

export default function C02PromptAnatomy({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [sort, setSort] = useState<Record<string, Part | "">>({});
  const [sortChecked, setSortChecked] = useState(false);
  const [fix, setFix] = useState<number | null>(null);
  const [tries, setTries] = useState(0);

  const allSorted = FRAGMENTS.every((f) => sort[f.id]);
  const right = FRAGMENTS.filter((f) => sort[f.id] === f.part).length;

  const pickFix = (i: number) => {
    setFix(i);
    const n = tries + 1;
    setTries(n);
    if (FIXES[i].good) complete("found the cause");
    else if (n >= 2) complete("chose a wrong fix twice, explanation shown");
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel llm-prompt-anatomy">
        <p>
          This prompt misreads <span className="w-mono">Date 03/04/26</span> as 3 March. The invoice is dated 3 April. First, sort each fragment into its part.
        </p>
        <ul className="llm-prompt-anatomy-list">
          {FRAGMENTS.map((f) => {
            const wrong = sortChecked && sort[f.id] !== f.part;
            const ok = sortChecked && sort[f.id] === f.part;
            return (
              <li key={f.id} className={`llm-prompt-anatomy-row${wrong ? " wrong" : ""}${ok ? " ok" : ""}`}>
                <span>{f.text}</span>
                <select aria-label={`Part for: ${f.text}`} value={sort[f.id] ?? ""} onChange={(e) => { setSort({ ...sort, [f.id]: e.target.value as Part }); setSortChecked(false); }}>
                  <option value="">Choose a part</option>
                  {PARTS.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
        <div className="w-row">
          <button type="button" className="w-btn" disabled={!allSorted} onClick={() => setSortChecked(true)}>
            Check my sorting
          </button>
          {sortChecked && <span aria-live="polite">{right} of {FRAGMENTS.length} placed correctly.</span>}
        </div>
        {sortChecked && right === FRAGMENTS.length && (
          <div className="llm-prompt-anatomy-fix">
            <p><strong>Now judge the fix.</strong> Which single change repairs the failure?</p>
            <div className="w-stack">
              {FIXES.map((f, i) => (
                <button key={f.text} type="button" className={`w-btn ghost llm-prompt-anatomy-opt${fix === i ? " is-on" : ""}`} disabled={fix !== null} onClick={() => pickFix(i)}>
                  {f.text}
                </button>
              ))}
            </div>
          </div>
        )}
        {fix !== null && (
          <div className={`w-verdict ${FIXES[fix].good ? "good" : "bad"}`} role="status">
            {FIXES[fix].why} The failing part is the examples, and the missing part is context.
            {!FIXES[fix].good && tries < 2 && (
              <> <button type="button" className="w-btn ghost" onClick={() => setFix(null)}>Try another fix</button></>
            )}
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
