import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C06ClauseFinder.css";

type Unit = "page" | "clause" | "table" | "whole";
const UNITS: { id: Unit; label: string }[] = [
  { id: "page", label: "One page" },
  { id: "clause", label: "Clause by heading" },
  { id: "table", label: "Table stitched across pages" },
  { id: "whole", label: "Whole document" },
];

const FIELDS: { text: string; answer: Unit; why: string }[] = [
  {
    text: "Effective date and the names of the two parties. They sit in the title block on page 1 of the 48-page contract.",
    answer: "page",
    why: "The fact is on one known page. Reading 1 page is cheaper than finding a clause, and nothing crosses a page break.",
  },
  {
    text: "Payment terms. Clause 6 starts at the foot of page 14. Clause 6.2, on late-payment interest, is on page 15.",
    answer: "clause",
    why: "The clause ignores the page break. Take the span from the heading for clause 6 to the heading for clause 7, and read both pages as one text.",
  },
  {
    text: "The unit price of each product in Schedule 1. The table starts on page 31 with its header and runs onto page 32 with none.",
    answer: "table",
    why: "Page 32's rows have no column names on their own. Join the continuation to the table on page 31 first, then extract the rows.",
  },
  {
    text: "Whether both parties have signed. The signature block is the last page, with ink and a stamp.",
    answer: "page",
    why: "It is one known page, and the question is whether a signature exists, not what it says. Send that page to a reader that can see marks, and flag the answer for review.",
  },
  {
    text: "Whether any clause lets either party hand the agreement to another company, or covers a change of owner. It could sit in the definitions, the general terms or a schedule.",
    answer: "whole",
    why: "The answer is scattered, and saying no means having looked everywhere. Narrow with keyword search first, but the unit of the question is the whole contract.",
  },
];

export default function C06ClauseFinder({ onComplete }: WidgetProps) {
  const done = useComplete(onComplete);
  const [picks, setPicks] = useState<Record<number, Unit>>({});
  const [attempts, setAttempts] = useState(0);
  const [checked, setChecked] = useState(false);
  const [locked, setLocked] = useState(false);

  const all = Object.keys(picks).length === FIELDS.length;
  const right = FIELDS.filter((f, i) => picks[i] === f.answer).length;

  function pick(i: number, u: Unit) {
    if (checked || locked) return;
    // After a failed first check, only the wrong fields can change.
    if (attempts > 0 && picks[i] === FIELDS[i].answer) return;
    setPicks({ ...picks, [i]: u });
  }

  function check() {
    const n = attempts + 1;
    setAttempts(n);
    setChecked(true);
    if (right === FIELDS.length) {
      setLocked(true);
      done(`All ${FIELDS.length} units right on attempt ${n}`);
    } else if (n >= 2) {
      setLocked(true);
      done(`${right} of ${FIELDS.length} units right after 2 attempts`);
    }
  }

  function retry() {
    const next: Record<number, Unit> = {};
    FIELDS.forEach((f, i) => {
      if (picks[i] === f.answer) next[i] = picks[i];
    });
    setPicks(next);
    setChecked(false);
  }

  return (
    <div className="w-panel docai-clause-finder">
      <p className="docai-clause-finder-lede">
        Five fields to pull from one 48-page contract. For each, pick the unit you would hand to the extractor.
      </p>
      {FIELDS.map((f, i) => {
        const p = picks[i];
        const ok = p === f.answer;
        return (
          <div key={i} className="w-inset docai-clause-finder-card">
            <p className="docai-clause-finder-text">{i + 1}. {f.text}</p>
            <div className="docai-clause-finder-opts" role="group" aria-label={`Field ${i + 1}`}>
              {UNITS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  disabled={checked || locked || (attempts > 0 && ok)}
                  aria-pressed={p === u.id}
                  className={`w-chip${checked && p === u.id ? (ok ? " good" : " bad") : ""}`}
                  onClick={() => pick(i, u.id)}
                >
                  {u.label}
                </button>
              ))}
            </div>
            {checked && p && (
              <p className="docai-clause-finder-why">
                <b>{ok ? "Right. " : locked ? "Better unit: " + UNITS.find((u) => u.id === f.answer)!.label + ". " : "Not that one. "}</b>
                {f.why}
              </p>
            )}
          </div>
        );
      })}
      <div className="docai-clause-finder-actions">
        {!checked && (
          <button type="button" className="w-btn" disabled={!all} onClick={check}>
            Check my picks
          </button>
        )}
        {checked && !locked && (
          <button type="button" className="w-btn ghost" onClick={retry}>
            Change the wrong ones
          </button>
        )}
      </div>
      {checked && (
        <div className={`w-verdict ${right === FIELDS.length ? "good" : "bad"}`} role="status">
          <b>{right} of {FIELDS.length} right.</b> The unit follows the fact. Use a page when the fact has a known page, a clause when it follows a heading across a break, a stitched table when rows continue, and the whole document only when the answer is scattered.
        </div>
      )}
    </div>
  );
}
