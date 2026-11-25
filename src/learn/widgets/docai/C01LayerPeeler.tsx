import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C01LayerPeeler.css";

const LAYERS = [
  { name: "Pixels", out: "A grid of grey values. No characters, no structure." },
  { name: "OCR", out: 'lines: "HARBOUR SUPPLIES LTD" (0.99), "Invoice INV-4471" (0.97), "Due" (0.98), "14 Nov 2026" (0.93), "Total" (0.99), "1,260.00" (0.91)\neach with a bounding region: four corner points on the page' },
  { name: "Layout", out: "paragraph 1: supplier block, top left\ntable 1: 3 rows by 4 columns (Item, Qty, Unit, Amount), cells with row and column index\nparagraph 5: footer with totals" },
  { name: "Key-value pairs", out: 'key "Due" -> value "14 Nov 2026"\nkey "Invoice" -> value "INV-4471"\nkey "Total" -> value "1,260.00"\nlinks between label and value, still plain strings' },
  { name: "Fields", out: 'due_date: date 2026-11-14 (0.93)\ninvoice_id: "INV-4471" (0.97)\ntotal_amount: currency 1260.00 GBP (0.91)\nline_item: 3 typed rows' },
];

const QUESTIONS = [
  { q: 'Where on the page does the word "Total" sit?', answer: 1, why: "OCR returns a bounding region for every word. Nothing above it in the stack is needed to answer a where question." },
  { q: "Which cell belongs under the Qty column in row two?", answer: 2, why: "Row and column membership is layout analysis. OCR alone gives you words in reading order, not a grid." },
  { q: 'Which date goes with the label "Due"?', answer: 3, why: "Pairing a label with its value is the key-value layer. Layout alone knows both are on the page, not that they belong together." },
  { q: "What is the invoice total as a number that finance can post?", answer: 4, why: "Only the field layer names the meaning (total_amount) and gives a typed value. A key-value pair is still the string 1,260.00." },
];

export default function C01LayerPeeler({ onComplete }: WidgetProps) {
  const done = useComplete(onComplete);
  const [view, setView] = useState(1);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const answered = Object.keys(picks).length;

  function pick(qi: number, layer: number) {
    if (picks[qi] !== undefined) return;
    const next = { ...picks, [qi]: layer };
    setPicks(next);
    if (Object.keys(next).length === QUESTIONS.length) {
      const right = QUESTIONS.filter((q, i) => next[i] === q.answer).length;
      done(`${right} of ${QUESTIONS.length} lowest layers right`);
    }
  }

  const right = QUESTIONS.filter((q, i) => picks[i] === q.answer).length;

  return (
    <div className="w-panel docai-layer-peeler">
      <p className="docai-layer-peeler-lede">Harbour Supplies invoice INV-4471. Step through the layers and read what each one returns. Illustrative figures.</p>
      <div className="docai-layer-peeler-tabs" role="tablist" aria-label="Layer">
        {LAYERS.map((l, i) => (
          <button key={l.name} type="button" role="tab" aria-selected={view === i} className={`w-btn small${view === i ? "" : " ghost"}`} onClick={() => setView(i)}>
            {i}. {l.name}
          </button>
        ))}
      </div>
      <pre className="w-inset w-mono docai-layer-peeler-out" aria-live="polite">{LAYERS[view].out}</pre>

      <p className="docai-layer-peeler-ask">For each question, pick the lowest layer that can answer it.</p>
      {QUESTIONS.map((q, qi) => {
        const p = picks[qi];
        return (
          <div key={qi} className="docai-layer-peeler-q">
            <div className="docai-layer-peeler-qtext">{qi + 1}. {q.q}</div>
            <div className="docai-layer-peeler-opts" role="group" aria-label={`Question ${qi + 1}`}>
              {LAYERS.map((l, li) => (
                <button key={l.name} type="button" className={`w-chip${p === li ? (li === q.answer ? " good" : " bad") : ""}`} aria-pressed={p === li} disabled={p !== undefined} onClick={() => pick(qi, li)}>{l.name}</button>
              ))}
            </div>
            {p !== undefined && <p className="docai-layer-peeler-why"><b>{p === q.answer ? "Right. " : `Lowest is ${LAYERS[q.answer].name}. `}</b>{q.why}</p>}
          </div>
        );
      })}
      {answered === QUESTIONS.length && (
        <div className={`w-verdict ${right >= 3 ? "good" : "bad"}`} role="status">
          <b>{right} of {QUESTIONS.length} right.</b> Each layer adds structure on top of the one below. Rule of thumb: the higher the layer you need, the more a wrong guess upstream can mislead you. Fields are the most useful and the easiest to trust too much.
        </div>
      )}
    </div>
  );
}
