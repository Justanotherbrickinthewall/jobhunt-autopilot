import { useMemo, useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C03ExtractorPicker.css";

type Layout = "simple" | "table" | "complex";
type Cons = { offline: boolean; project: boolean; textLayer: boolean; layout: Layout };

type Ext = { id: string; name: string; local: boolean; inProject: boolean; score: (c: Cons) => number | null; note: string };

// Teaching heuristics, not benchmarks. Higher is a better fit. null means ruled out.
const EXTS: Ext[] = [
  { id: "gdocai", name: "Document AI", local: false, inProject: true, score: (c) => ({ simple: 4, table: 5, complex: 4 }[c.layout]), note: "Harbour's default. Managed layout, tables and invoice fields, run in your own Google Cloud project and in the location you pick." },
  { id: "native", name: "Native PDF parser", local: true, inProject: true, score: (c) => (c.textLayer ? { simple: 6, table: 4, complex: 3 }[c.layout] : null), note: "Needs a real text layer. Exact characters, no cost, weak at reading order on complex pages." },
  { id: "tess", name: "Tesseract", local: true, inProject: true, score: (c) => ({ simple: 3, table: 1, complex: 1 }[c.layout]), note: "Free and offline. Reads text, weak on tables and structure." },
  { id: "docling", name: "Docling", local: true, inProject: true, score: (c) => ({ simple: 3, table: 4, complex: 4 }[c.layout]), note: "Open source layout and table conversion that runs where you host it. You run the compute." },
  { id: "gemini", name: "Gemini on Vertex AI", local: false, inProject: true, score: (c) => ({ simple: 3, table: 4, complex: 5 }[c.layout]), note: "A vision-capable Gemini model in your own Google Cloud project, called through a regional or multi-region endpoint. Reads hard layouts well. Can invent values, so validation is mandatory." },
  { id: "vlm", name: "External vision model API", local: false, inProject: false, score: (c) => ({ simple: 3, table: 4, complex: 5 }[c.layout]), note: "Reads hard layouts well. Can invent values, so validation is mandatory. The page images leave your Google Cloud project." },
  { id: "azure", name: "Azure Document Intelligence", local: false, inProject: false, score: (c) => ({ simple: 4, table: 4, complex: 4 }[c.layout]), note: "An alternate on another cloud. Managed layout, tables and invoice fields. Data leaves your Google Cloud project." },
  { id: "textract", name: "Amazon Textract", local: false, inProject: false, score: (c) => ({ simple: 4, table: 4, complex: 3 }[c.layout]), note: "An alternate on another cloud. Managed OCR, forms and tables on AWS. Data leaves your Google Cloud project." },
];

function rank(c: Cons) {
  return EXTS.filter((e) => !(c.offline && !e.local) && !(c.project && !e.inProject))
    .map((e) => ({ e, s: e.score(c) }))
    .filter((x): x is { e: Ext; s: number } => x.s !== null)
    .sort((a, b) => b.s - a.s);
}

const SCENARIOS: { text: string; c: Cons }[] = [
  { text: "A plant in a secure site with no internet. Scanned delivery notes, plain layout.", c: { offline: true, project: true, textLayer: false, layout: "simple" } },
  { text: "Born-digital invoices from the accounting system export. Plain layout. Cloud is fine.", c: { offline: false, project: false, textLayer: true, layout: "simple" } },
  { text: "Scanned supplier statements with nested tables. Data must stay in our Google Cloud project.", c: { offline: false, project: true, textLayer: false, layout: "table" } },
  { text: "Faxed goods received notes with handwriting over messy layouts. Data must stay in our Google Cloud project.", c: { offline: false, project: true, textLayer: false, layout: "complex" } },
];

export default function C03ExtractorPicker({ onComplete }: WidgetProps) {
  const done = useComplete(onComplete);
  const [c, setC] = useState<Cons>({ offline: false, project: false, textLayer: false, layout: "table" });
  const ranked = useMemo(() => rank(c), [c]);
  const [picks, setPicks] = useState<Record<number, string>>({});
  const set = (p: Partial<Cons>) => setC({ ...c, ...p });

  function pick(i: number, id: string) {
    if (picks[i]) return;
    const next = { ...picks, [i]: id };
    setPicks(next);
    if (Object.keys(next).length === SCENARIOS.length) {
      const r = SCENARIOS.filter((s, j) => {
        const top = rank(s.c);
        return top.length > 0 && top.filter((x) => x.s === top[0].s).some((x) => x.e.id === next[j]);
      }).length;
      done(`${r} of ${SCENARIOS.length} picks matched the top fit`);
    }
  }
  const n = Object.keys(picks).length;

  return (
    <div className="w-panel docai-extractor-picker">
      <p className="docai-extractor-picker-lede">Part one: set constraints and watch the ranking. Part two: pick an extractor for four cases. Scores are teaching heuristics, not benchmarks.</p>
      <div className="docai-extractor-picker-controls">
        <label className="docai-extractor-picker-ck"><input type="checkbox" checked={c.offline} onChange={(e) => set({ offline: e.target.checked })} /> Must run offline</label>
        <label className="docai-extractor-picker-ck"><input type="checkbox" checked={c.project} onChange={(e) => set({ project: e.target.checked })} /> Data stays in our Google Cloud project</label>
        <label className="docai-extractor-picker-ck"><input type="checkbox" checked={c.textLayer} onChange={(e) => set({ textLayer: e.target.checked })} /> Files have a text layer</label>
        <label className="docai-extractor-picker-ck">Layout{" "}
          <select value={c.layout} onChange={(e) => set({ layout: e.target.value as Layout })} aria-label="Layout complexity">
            <option value="simple">Simple</option><option value="table">Tables</option><option value="complex">Complex</option>
          </select>
        </label>
      </div>
      <ol className="docai-extractor-picker-rank" aria-live="polite">
        {ranked.map((x) => (
          <li key={x.e.id}><b>{x.e.name}</b> <span className="w-chip">fit {x.s}</span><br /><small>{x.e.note}</small></li>
        ))}
        {ranked.length === 0 && <li>Nothing fits. Relax a constraint.</li>}
      </ol>

      <p className="docai-extractor-picker-ask">Now pick the best-fitting extractor for each case.</p>
      {SCENARIOS.map((s, i) => {
        const top = rank(s.c);
        const best = top.filter((x) => x.s === top[0].s);
        const p = picks[i];
        const ok = p ? best.some((x) => x.e.id === p) : false;
        return (
          <div key={i} className="w-inset docai-extractor-picker-case">
            <p>{i + 1}. {s.text}</p>
            <div className="docai-extractor-picker-opts" role="group" aria-label={`Case ${i + 1}`}>
              {EXTS.map((e) => (
                <button key={e.id} type="button" disabled={!!p} aria-pressed={p === e.id} className={`w-chip${p === e.id ? (ok ? " good" : " bad") : ""}`} onClick={() => pick(i, e.id)}>{e.name}</button>
              ))}
            </div>
            {p && <p className="docai-extractor-picker-why"><b>{ok ? "Right. " : "Top fit: " + best.map((x) => x.e.name).join(" or ") + ". "}</b>{ok ? EXTS.find((e) => e.id === p)!.note : "The constraints rule others out, or another fits the layout better."}</p>}
          </div>
        );
      })}
      {n === SCENARIOS.length && (
        <div className="w-verdict" role="status">
          Constraints remove options first, then layout and cost choose among what is left. Offline and residency cut the list before accuracy is even discussed.
        </div>
      )}
    </div>
  );
}
