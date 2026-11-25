import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C02PrebuiltOrCustom.css";

type Choice = "prebuilt" | "template" | "model";
const CHOICES: { id: Choice; label: string }[] = [
  { id: "prebuilt", label: "Prebuilt processor" },
  { id: "template", label: "Template-based custom extractor" },
  { id: "model", label: "Model-based or Gemini custom extractor" },
];

const SCENARIOS = [
  { text: "Supplier invoices from hundreds of vendors. You need supplier, invoice number, dates, line items and totals.", answer: "prebuilt" as Choice, why: "These fields are in the Invoice Parser schema and the layouts vary a lot. Start with the Invoice Parser and measure it on your own documents before spending on labels." },
  { text: "Staff expense receipts photographed on phones. You need supplier, date and total.", answer: "prebuilt" as Choice, why: "Receipts are a common document type that the Expense Parser reads, and the fields you want are standard." },
  { text: "A customs form that Harbour Supplies files. Always the same printed layout, with fields no prebuilt processor knows.", answer: "template" as Choice, why: "A fixed layout is what a template-based extractor is for. It learns positions and needs only a few labelled documents." },
  { text: "Goods received notes, which record what arrived, from 200 suppliers. Every layout is different, with a custom field for the warehouse bay number.", answer: "model" as Choice, why: "Varied layouts with custom fields need a version that learns from content and context, not from fixed positions. A model-based or Gemini foundation-model extractor does that." },
  { text: "The Invoice Parser reads everything on your held-out invoices, except the purchase order number, which it misses for several large suppliers. A purchase order is the order Harbour placed for the goods.", answer: "model" as Choice, why: "Field-level results justify custom here, and only for one field. A custom extractor trained on your labels can add it. The rest can stay on the Invoice Parser, with your own code merging the two results." },
  { text: "A one-page internal stock count sheet with tick boxes, printed from the same spreadsheet every week.", answer: "template" as Choice, why: "Same layout every time, so position is a reliable signal. A template-based extractor wins on labelling effort." },
];

export default function C02PrebuiltOrCustom({ onComplete }: WidgetProps) {
  const done = useComplete(onComplete);
  const [picks, setPicks] = useState<Record<number, Choice>>({});
  const n = Object.keys(picks).length;

  function pick(i: number, c: Choice) {
    if (picks[i]) return;
    const next = { ...picks, [i]: c };
    setPicks(next);
    if (Object.keys(next).length === SCENARIOS.length) {
      done(`${SCENARIOS.filter((s, j) => next[j] === s.answer).length} of ${SCENARIOS.length} right`);
    }
  }
  const right = SCENARIOS.filter((s, i) => picks[i] === s.answer).length;

  return (
    <div className="w-panel docai-prebuilt-or-custom">
      <p className="docai-prebuilt-or-custom-lede">Six document scenarios. Choose the processor or extractor kind that fits, then read the reason.</p>
      {SCENARIOS.map((s, i) => {
        const p = picks[i];
        return (
          <div key={i} className="w-inset docai-prebuilt-or-custom-card">
            <p className="docai-prebuilt-or-custom-text">{i + 1}. {s.text}</p>
            <div className="docai-prebuilt-or-custom-opts" role="group" aria-label={`Scenario ${i + 1}`}>
              {CHOICES.map((c) => (
                <button key={c.id} type="button" disabled={!!p} aria-pressed={p === c.id} className={`w-chip${p === c.id ? (c.id === s.answer ? " good" : " bad") : ""}`} onClick={() => pick(i, c.id)}>{c.label}</button>
              ))}
            </div>
            {p && <p className="docai-prebuilt-or-custom-why"><b>{p === s.answer ? "Right. " : "Better choice: " + CHOICES.find((c) => c.id === s.answer)!.label + ". "}</b>{s.why}</p>}
          </div>
        );
      })}
      {n === SCENARIOS.length && (
        <div className={`w-verdict ${right >= 5 ? "good" : "bad"}`} role="status">
          <b>{right} of {SCENARIOS.length} right.</b> The pattern: prebuilt for common types, template-based for one fixed layout, model-based or Gemini for varied layouts or custom fields. In every case the final call rests on field-level results on your own documents.
        </div>
      )}
    </div>
  );
}
