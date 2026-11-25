import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C01DigitalOrScan.css";

type Path = "native" | "ocr" | "mixed";
const PATHS: { id: Path; label: string }[] = [
  { id: "native", label: "Read the text layer" },
  { id: "ocr", label: "Run OCR" },
  { id: "mixed", label: "Decide page by page" },
];

const FILES = [
  { name: "invoice-4471.pdf", facts: "3 pages. Text layer present on every page. Extracted words match what the page shows.", answer: "native" as Path, why: "A born-digital file already holds exact characters. OCR would only add misreads." },
  { name: "scan-0098.pdf", facts: "2 pages. Each page is one embedded image. Text layer returns zero words.", answer: "ocr" as Path, why: "There is nothing to read. Only OCR can turn the pixels into characters." },
  { name: "photo-0412.jpg", facts: "Phone photo of an invoice, slightly rotated. No text layer, because it is an image file.", answer: "ocr" as Path, why: "An image has no text layer by definition. Expect lower confidence and plan for review." },
  { name: "invoice-5120.pdf", facts: "1 page. Text layer present, but the extracted words read as nonsense such as (cid:41)(cid:77).", answer: "ocr" as Path, why: "The text layer lies. The font has no usable character map, so the layer is junk. Render the page and OCR it." },
  { name: "statement-0233.pdf", facts: "4 pages. Pages 1 to 3 have a clean text layer. Page 4 is a scanned, signed remittance slip, the note sent back with a payment. It has zero words.", answer: "mixed" as Path, why: "Quality varies inside one file. Test each page and send only the empty one to OCR." },
  { name: "invoice-6003.pdf", facts: "2 pages. Page 1 has a text layer. Page 2 holds a pasted screenshot of the line-item table.", answer: "mixed" as Path, why: "The table is an image inside a digital page. Read the text where it exists and OCR the image region." },
];

export default function C01DigitalOrScan({ onComplete }: WidgetProps) {
  const done = useComplete(onComplete);
  const [picks, setPicks] = useState<Record<number, Path>>({});
  const n = Object.keys(picks).length;

  function pick(i: number, p: Path) {
    if (picks[i]) return;
    const next = { ...picks, [i]: p };
    setPicks(next);
    if (Object.keys(next).length === FILES.length) {
      const r = FILES.filter((f, j) => next[j] === f.answer).length;
      done(`${r} of ${FILES.length} routed correctly`);
    }
  }
  const right = FILES.filter((f, i) => picks[i] === f.answer).length;

  return (
    <div className="w-panel docai-digital-or-scan">
      <p className="docai-digital-or-scan-lede">Six files arrive in the Harbour Supplies inbox. Choose the extraction path for each, then read why.</p>
      {FILES.map((f, i) => {
        const p = picks[i];
        return (
          <div key={f.name} className="w-inset docai-digital-or-scan-file">
            <div className="docai-digital-or-scan-name w-mono">{f.name}</div>
            <p className="docai-digital-or-scan-facts">{f.facts}</p>
            <div className="docai-digital-or-scan-opts" role="group" aria-label={`Path for ${f.name}`}>
              {PATHS.map((o) => (
                <button key={o.id} type="button" disabled={!!p} aria-pressed={p === o.id} className={`w-chip${p === o.id ? (o.id === f.answer ? " good" : " bad") : ""}`} onClick={() => pick(i, o.id)}>{o.label}</button>
              ))}
            </div>
            {p && <p className="docai-digital-or-scan-why"><b>{p === f.answer ? "Right. " : "Not quite. "}</b>{f.why}</p>}
          </div>
        );
      })}
      {n === FILES.length && (
        <div className={`w-verdict ${right >= 5 ? "good" : "bad"}`} role="status">
          <b>{right} of {FILES.length} right.</b> The test that decides is not the file extension. It is whether the text layer exists and whether it matches the page, checked per page.
        </div>
      )}
    </div>
  );
}
