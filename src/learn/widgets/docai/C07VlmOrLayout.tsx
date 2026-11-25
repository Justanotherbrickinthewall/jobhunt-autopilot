import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C07VlmOrLayout.css";

type Reader = "vlm" | "layout" | "hybrid";
const READERS: { id: Reader; label: string }[] = [
  { id: "vlm", label: "Vision model" },
  { id: "layout", label: "Layout model" },
  { id: "hybrid", label: "Hybrid" },
];

const DOCS: { text: string; answer: Reader; why: string }[] = [
  { text: "150 handwritten delivery notes a month, free-form, different drivers. No labelled set exists.", answer: "vlm", why: "Handwriting, no layout to learn and tiny volume. At about a cent a page the bill is trivial, and a layout model would need labelling for little gain." },
  { text: "40,000 supplier invoices a month from 300 vendors, standard invoice fields.", answer: "layout", why: "A Document AI processor such as Invoice Parser covers these fields. At volume, extra review from invented values costs more than the tokens, so the steady reader wins." },
  { text: "Supplier statements with 200-row tables over six pages. The row totals must reconcile.", answer: "layout", why: "Long tables are where a vision model skips, merges or repeats rows. A layout model returns the cells, and the totals check then means something." },
  { text: "400 customs forms a month in Polish, Turkish and Vietnamese, a document type you have never seen.", answer: "vlm", why: "A new type in mixed languages is a prompt change for a vision model. Labelling and training a custom model for 400 pages is poor value." },
  { text: "10,000 invoices a month where auditors sample pages and need each value highlighted on the page.", answer: "hybrid", why: "Auditors need a box for each value, and a vision model returns none. The layout model supplies the boxes and the vision model reads. Matching the two also flags invented values." },
  { text: "The layout model passes 97 percent of your invoices. The other 3 percent carry handwritten notes in margins.", answer: "hybrid", why: "Keep the cheap reader for the 97 percent. Send the failures to the vision model, and check its values against the layout text so you keep evidence." },
  { text: "25,000 scanned remittance advices a month on one fixed bank template. The review screen needs bounding boxes.", answer: "layout", why: "One stable layout at volume with boxes required is the layout model's home ground. A vision model adds delay and review cost here." },
  { text: "A one-off archive of 1,200 mixed old letters, to be tagged once. Nobody will audit individual values.", answer: "vlm", why: "One run, mixed layouts and no evidence requirement. A prompt and about $12 of tokens beats any setup work." },
];

type Row = { pick?: Reader; tries: number; state: "open" | "right" | "revealed"; miss?: boolean };

export default function C07VlmOrLayout({ onComplete }: WidgetProps) {
  const done = useComplete(onComplete);
  const [rows, setRows] = useState<Row[]>(DOCS.map(() => ({ tries: 0, state: "open" })));
  const resolvedCount = rows.filter((r) => r.state !== "open").length;
  const firstTry = rows.filter((r) => r.state === "right" && r.tries === 1).length;

  function pick(i: number, c: Reader) {
    const r = rows[i];
    if (r.state !== "open") return;
    const tries = r.tries + 1;
    let next: Row;
    if (c === DOCS[i].answer) next = { pick: c, tries, state: "right" };
    else if (tries >= 2) next = { pick: c, tries, state: "revealed" };
    else next = { pick: c, tries, state: "open", miss: true };
    const all = rows.map((x, j) => (j === i ? next : x));
    setRows(all);
    if (all.every((x) => x.state !== "open")) {
      const ft = all.filter((x) => x.state === "right" && x.tries === 1).length;
      done(`${ft} of ${DOCS.length} right on the first try`);
    }
  }

  return (
    <div className="w-panel docai-vlm-or-layout">
      <p className="docai-vlm-or-layout-lede">Eight documents. Choose the reader. A first miss gives you one more try, and a second miss shows the reasoning.</p>
      {DOCS.map((d, i) => {
        const r = rows[i];
        return (
          <div key={i} className="w-inset docai-vlm-or-layout-card">
            <p className="docai-vlm-or-layout-text">{i + 1}. {d.text}</p>
            <div className="docai-vlm-or-layout-opts" role="group" aria-label={`Document ${i + 1}`}>
              {READERS.map((c) => (
                <button key={c.id} type="button" disabled={r.state !== "open"} aria-pressed={r.pick === c.id} className={`w-chip${r.pick === c.id ? (c.id === d.answer ? " good" : " bad") : ""}`} onClick={() => pick(i, c.id)}>{c.label}</button>
              ))}
            </div>
            {r.miss && r.state === "open" && <p className="docai-vlm-or-layout-why"><b>Not that one.</b> Think about volume, layout and whether anyone needs the evidence, then try again.</p>}
            {r.state !== "open" && <p className="docai-vlm-or-layout-why"><b>{r.state === "right" ? "Right. " : "Better choice: " + READERS.find((c) => c.id === d.answer)!.label + ". "}</b>{d.why}</p>}
          </div>
        );
      })}
      {resolvedCount === DOCS.length && (
        <div className={`w-verdict ${firstTry >= 6 ? "good" : "bad"}`} role="status">
          <b>{firstTry} of {DOCS.length} right on the first try.</b> The pattern: the vision model for odd layouts, new types and low volume. The layout model for dense tables, steady volume and anything that needs boxes. The hybrid when you need both the reading and the evidence.
        </div>
      )}
    </div>
  );
}
