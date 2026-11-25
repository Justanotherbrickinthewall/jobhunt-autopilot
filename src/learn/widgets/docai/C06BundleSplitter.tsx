import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C06BundleSplitter.css";

type Page = { clue: string };

const PAGES: Page[] = [
  { clue: "Northern Packaging. Invoice INV-4471. Footer: page 1 of 2." },
  { clue: "Line items and totals. Footer: INV-4471, page 2 of 2." },
  { clue: "Northern Packaging again, same logo and layout. Invoice INV-4472. Footer: page 1 of 1." },
  { clue: "Tideway Packaging. Invoice INV-9031. Footer: page 1 of 3." },
  { clue: "A table of lines with no header text. Footer: INV-9031, page 2 of 3." },
  { clue: "Totals and VAT. Footer: INV-9031, page 3 of 3." },
  { clue: "Master supply agreement. Title block with the parties and the date." },
  { clue: "Clauses 1 to 4: definitions and term." },
  { clue: "Clauses 5 to 8, including payment." },
  { clue: "Schedule 1, an appendix to the agreement, begins. A price table with its header row." },
  { clue: "The price table continues. No header row." },
  { clue: "Signature page, signed, with a company stamp." },
];

// Gap i sits between page i+1 and page i+2 (zero-based gap i is after PAGES[i]).
const TRUTH: boolean[] = [false, true, true, false, false, true, false, false, false, false, false];

const WHY: string[] = [
  "Page 1 says page 1 of 2 and page 2 says page 2 of 2, both for INV-4471. One invoice, so keep together.",
  "INV-4471 ends at page 2 of 2. Page 3 is INV-4472. The supplier and the layout match, but a new invoice number starts a new document.",
  "A different supplier and a new invoice number. Split.",
  "Page 5 carries INV-9031 as page 2 of 3. A table with no header is a continuation, so keep together.",
  "INV-9031 page 3 of 3 holds the totals. Same invoice, so keep together.",
  "An invoice ends at page 3 of 3 and a contract title block begins. The document type changes, so split.",
  "Clauses follow the title block of the same agreement. Keep together.",
  "The clause numbering carries on. Keep together.",
  "Schedule 1 has a new heading, but a schedule is part of the agreement. A new heading is not a new document.",
  "The price table continues without a header row. Same table, same document.",
  "The signature page belongs to the agreement. A signature or a stamp does not start a document.",
];

function segments(split: boolean[]): string[] {
  const out: string[] = [];
  let start = 1;
  split.forEach((s, i) => {
    if (s) {
      out.push(`${start}-${i + 1}`);
      start = i + 2;
    }
  });
  out.push(`${start}-${PAGES.length}`);
  return out;
}

const TRUE_SEGMENTS = segments(TRUTH);
const TRUE_COUNT = TRUTH.filter(Boolean).length;

export default function C06BundleSplitter({ onComplete }: WidgetProps) {
  const done = useComplete(onComplete);
  const [split, setSplit] = useState<boolean[]>(() => TRUTH.map(() => false));
  const [attempts, setAttempts] = useState(0);
  const [checked, setChecked] = useState(false);
  const [locked, setLocked] = useState(false);

  const wrong = split.map((s, i) => (s !== TRUTH[i] ? i : -1)).filter((i) => i >= 0);
  const hits = split.filter((s, i) => s && TRUTH[i]).length;
  const predicted = split.filter(Boolean).length;
  const precision = predicted === 0 ? 0 : Math.round((hits / predicted) * 100);
  const recall = Math.round((hits / TRUE_COUNT) * 100);
  const mine = segments(split);
  const docsRight = mine.filter((s) => TRUE_SEGMENTS.includes(s)).length;

  function toggle(i: number) {
    if (checked || locked) return;
    setSplit((prev) => prev.map((v, j) => (j === i ? !v : v)));
  }

  function check() {
    const n = attempts + 1;
    setAttempts(n);
    setChecked(true);
    if (wrong.length === 0) {
      setLocked(true);
      done(`Split exactly right on attempt ${n}`);
    } else if (n >= 2) {
      setLocked(true);
      done(`Boundary precision ${precision}%, recall ${recall}%, ${docsRight} of ${TRUE_SEGMENTS.length} documents right after 2 attempts`);
    }
  }

  return (
    <div className="w-panel docai-bundle-splitter">
      <p className="docai-bundle-splitter-lede">
        One scan, twelve pages. Mark each gap between pages as a split or keep it together. Three invoices and a contract are in here.
      </p>
      <ol className="docai-bundle-splitter-pages">
        {PAGES.map((p, i) => (
          <li key={i} className="docai-bundle-splitter-item">
            <div className="w-inset docai-bundle-splitter-page">
              <span className="docai-bundle-splitter-num">p{i + 1}</span>
              <span>{p.clue}</span>
            </div>
            {i < PAGES.length - 1 && (
              <div className="docai-bundle-splitter-gap">
                <button
                  type="button"
                  disabled={checked || locked}
                  aria-pressed={split[i]}
                  aria-label={`Gap between page ${i + 1} and page ${i + 2}`}
                  className={`w-chip${checked && split[i] !== TRUTH[i] ? " bad" : checked ? " good" : ""}${split[i] ? " is-on" : ""}`}
                  onClick={() => toggle(i)}
                >
                  {split[i] ? "Split here" : "Keep together"}
                </button>
                {checked && split[i] !== TRUTH[i] && <span className="docai-bundle-splitter-why">{WHY[i]}</span>}
              </div>
            )}
          </li>
        ))}
      </ol>
      <div className="docai-bundle-splitter-actions">
        {!checked && (
          <button type="button" className="w-btn" onClick={check}>
            Check my split
          </button>
        )}
        {checked && !locked && (
          <button type="button" className="w-btn ghost" onClick={() => setChecked(false)}>
            Fix and check again
          </button>
        )}
      </div>
      {checked && (
        <div className={`w-verdict ${wrong.length === 0 ? "good" : "bad"}`} role="status">
          <b>
            {wrong.length === 0
              ? "Exactly right."
              : `${wrong.length} gap${wrong.length === 1 ? "" : "s"} wrong.`}
          </b>{" "}
          You marked {predicted} split{predicted === 1 ? "" : "s"} and {hits} {hits === 1 ? "is" : "are"} real, out of {TRUE_COUNT}. Boundary precision is {hits} of {predicted}, {precision}%. Recall is {hits} of {TRUE_COUNT}, {recall}%. Documents right: {docsRight} of {TRUE_SEGMENTS.length}.
          {locked && wrong.length > 0 && (
            <> The right split is after pages 2, 3 and 6, giving four documents: pages 1-2, 3, 4-6 and 7-12. A boundary needs a new document number or a new type. A new heading, a table without a header or a stamp does not make one.</>
          )}
        </div>
      )}
    </div>
  );
}
