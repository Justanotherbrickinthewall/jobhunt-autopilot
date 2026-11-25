import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C04CrossFieldCheck.css";

const RULES = [
  { id: "sum", label: "Line items sum to net" },
  { id: "total", label: "Net plus VAT equals total" },
  { id: "dates", label: "Due date is on or after invoice date" },
  { id: "required", label: "Required fields are present" },
  { id: "currency", label: "One currency throughout" },
];

type Inv = {
  name: string;
  rows: [string, string][];
  breaks: string[];
  why: string;
};

// Illustrative invoices. Every field here was read with confidence 0.90 or higher.
const INVOICES: Inv[] = [
  { name: "INV-4471", rows: [["Lines", "100.00 + 250.00 + 50.00"], ["Net", "400.00"], ["VAT", "80.00"], ["Total", "480.00"], ["Invoice date", "2026-10-01"], ["Due date", "2026-10-31"], ["Currency", "GBP on every amount"], ["Invoice number", "INV-4471"]], breaks: [], why: "Lines sum to 400, 400 plus 80 is 480, the dates run forward and nothing is missing. This one passes." },
  { name: "INV-5120", rows: [["Lines", "120.00 + 80.00"], ["Net", "200.00"], ["VAT", "40.00"], ["Total", "420.00"], ["Invoice date", "2026-10-03"], ["Due date", "2026-11-02"], ["Currency", "GBP on every amount"], ["Invoice number", "INV-5120"]], breaks: ["total"], why: "200 plus 40 is 240, not 420. Two digits were swapped. Lines still sum, so only the totals rule fires." },
  { name: "INV-6003", rows: [["Lines", "300.00 + 150.00"], ["Net", "405.00"], ["VAT", "81.00"], ["Total", "486.00"], ["Invoice date", "2026-10-05"], ["Due date", "2026-11-04"], ["Currency", "GBP on every amount"], ["Invoice number", "INV-6003"]], breaks: ["sum"], why: "Lines sum to 450 but net reads 405. Net plus VAT is 486, so the totals rule passes. The error would pass a total check alone." },
  { name: "INV-7788", rows: [["Lines", "60.00 + 40.00"], ["Net", "100.00"], ["VAT", "20.00"], ["Total", "120.00"], ["Invoice date", "2026-10-12"], ["Due date", "2026-09-15"], ["Currency", "GBP on every amount"], ["Invoice number", "INV-7788"]], breaks: ["dates"], why: "The due date is a month before the invoice date. The money adds up, so only the date rule fires. A month and day swap is a common cause." },
  { name: "(no number)", rows: [["Lines", "50.00 + 70.00"], ["Net", "120.00"], ["VAT", "24.00"], ["Total", "144.00 USD"], ["Invoice date", "2026-10-14"], ["Due date", "2026-11-13"], ["Currency", "GBP on lines, USD on total"], ["Invoice number", "null"]], breaks: ["required", "currency"], why: "No invoice number was found, and the total carries a different currency from the lines. The arithmetic passes, so only these two rules fire." },
];

export default function C04CrossFieldCheck({ onComplete }: WidgetProps) {
  const done = useComplete(onComplete);
  const [i, setI] = useState(0);
  const [sel, setSel] = useState<Record<number, string[]>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const inv = INVOICES[i];
  const cur = sel[i] ?? [];

  const toggle = (id: string) => {
    if (revealed[i]) return;
    setSel({ ...sel, [i]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  };
  const exact = (k: number) => {
    const a = [...(sel[k] ?? [])].sort().join(","), b = [...INVOICES[k].breaks].sort().join(",");
    return a === b;
  };
  function reveal() {
    const next = { ...revealed, [i]: true };
    setRevealed(next);
    if (INVOICES.every((_, k) => next[k])) {
      done(`${INVOICES.filter((_, k) => exact(k)).length} of ${INVOICES.length} invoices diagnosed exactly`);
    }
  }
  const allDone = INVOICES.every((_, k) => revealed[k]);

  return (
    <div className="w-panel docai-cross-field-check">
      <p className="docai-cross-field-check-lede">Five extracted invoices, every field read with confidence 0.90 or higher. Tick the rules each one breaks, then check. Illustrative data.</p>
      <div className="docai-cross-field-check-tabs" role="tablist" aria-label="Invoice">
        {INVOICES.map((v, k) => (
          <button key={v.name} type="button" role="tab" aria-selected={i === k} className={`w-btn small${i === k ? "" : " ghost"}`} onClick={() => setI(k)}>
            {v.name}{revealed[k] ? (exact(k) ? " ✓" : " ✗") : ""}
          </button>
        ))}
      </div>
      <dl className="w-inset docai-cross-field-check-rows">
        {inv.rows.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd className="w-mono">{v}</dd></div>))}
      </dl>
      <fieldset className="docai-cross-field-check-rules">
        <legend>Rules broken</legend>
        {RULES.map((r) => (
          <label key={r.id} className="docai-cross-field-check-rule">
            <input type="checkbox" checked={cur.includes(r.id)} disabled={!!revealed[i]} onChange={() => toggle(r.id)} /> {r.label}
          </label>
        ))}
      </fieldset>
      {!revealed[i] && <button type="button" className="w-btn small" onClick={reveal}>Check my answer</button>}
      {revealed[i] && (
        <div className={`w-verdict ${exact(i) ? "good" : "bad"}`} role="status">
          <b>{exact(i) ? "Exactly right. " : `Rules actually broken: ${inv.breaks.length ? inv.breaks.map((b) => RULES.find((r) => r.id === b)!.label).join("; ") : "none"}. `}</b>{inv.why}
        </div>
      )}
      {allDone && (
        <p className="docai-cross-field-check-note">High confidence did not protect any of these invoices. Each rule catches a different class of error, which is why you run all of them.</p>
      )}
    </div>
  );
}
