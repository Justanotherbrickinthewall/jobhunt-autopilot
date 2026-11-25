import { useMemo, useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C03HybridRouter.css";

// Illustrative figures only. Not benchmarks.
const CLASSES = [
  { id: "digital", name: "Born-digital, clean", n: 60 },
  { id: "scan", name: "Clean scan", n: 25 },
  { id: "complex", name: "Complex layout scan", n: 10 },
  { id: "photo", name: "Poor phone photo", n: 5 },
];
const EXTS = [
  { id: "native", name: "Text layer", cost: 0.1 },
  { id: "docai", name: "Document AI", cost: 1 },
  { id: "vlm", name: "Vision model plus checks", cost: 4 },
  { id: "human", name: "Human review", cost: 20 },
];
// accuracy percent of fields right, by class then extractor
const ACC: Record<string, Record<string, number>> = {
  digital: { native: 97, docai: 95, vlm: 94, human: 99 },
  scan: { native: 0, docai: 94, vlm: 93, human: 99 },
  complex: { native: 0, docai: 85, vlm: 91, human: 99 },
  photo: { native: 0, docai: 70, vlm: 82, human: 99 },
};
const TARGET = 95;

type Route = Record<string, string>;
function evalRoute(r: Route) {
  let cost = 0, acc = 0;
  for (const c of CLASSES) {
    cost += c.n * EXTS.find((e) => e.id === r[c.id])!.cost;
    acc += c.n * ACC[c.id][r[c.id]];
  }
  return { cost: Math.round(cost * 10) / 10, acc: Math.round((acc / 100) * 100) / 100 };
}

function cheapest() {
  let best: { r: Route; cost: number; acc: number } | null = null;
  const ids = EXTS.map((e) => e.id);
  for (const a of ids) for (const b of ids) for (const c of ids) for (const d of ids) {
    const r = { digital: a, scan: b, complex: c, photo: d };
    const v = evalRoute(r);
    if (v.acc >= TARGET && (!best || v.cost < best.cost)) best = { r, ...v };
  }
  return best!;
}

export default function C03HybridRouter({ onComplete }: WidgetProps) {
  const done = useComplete(onComplete);
  const [route, setRoute] = useState<Route>({ digital: "docai", scan: "docai", complex: "docai", photo: "docai" });
  const [checked, setChecked] = useState(false);
  const [tries, setTries] = useState(0);
  const [hint, setHint] = useState(false);
  const v = useMemo(() => evalRoute(route), [route]);
  const best = useMemo(cheapest, []);
  const ok = v.acc >= TARGET;
  const optimal = ok && v.cost <= best.cost;

  function submit() {
    if (!optimal && tries === 0) {
      // First miss: a nudge, not the answer. The explanation follows the second attempt.
      setTries(1);
      setHint(true);
      return;
    }
    setHint(false);
    setChecked(true);
    done(optimal ? "found the cheapest routing that meets the target" : ok ? "met the target but not at lowest cost" : "missed the accuracy target");
  }

  return (
    <div className="w-panel docai-hybrid-router">
      <p className="docai-hybrid-router-lede">A batch of 100 invoices in four classes. Choose an extractor per class. Aim for at least {TARGET} percent field accuracy at the lowest cost. Illustrative figures, not benchmarks.</p>
      <table className="docai-hybrid-router-table">
        <thead><tr><th>Class</th><th>Docs</th><th>Route to</th></tr></thead>
        <tbody>
          {CLASSES.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td><td>{c.n}</td>
              <td>
                <select aria-label={`Route for ${c.name}`} value={route[c.id]} onChange={(e) => { setRoute({ ...route, [c.id]: e.target.value }); setChecked(false); setHint(false); }}>
                  {EXTS.map((e) => <option key={e.id} value={e.id} disabled={e.id === "native" && c.id !== "digital"}>{e.name}{e.id === "native" && c.id !== "digital" ? " (no text layer)" : ""}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="docai-hybrid-router-stats" role="status" aria-live="polite">
        <span className={`w-chip ${ok ? "good" : "bad"}`}>Accuracy {v.acc} percent</span>
        <span className="w-chip">Cost {v.cost} units</span>
      </div>
      <button type="button" className="w-btn small" onClick={submit}>Submit this routing</button>
      {hint && (
        <p className="w-verdict bad" role="status">{ok ? "That meets the target, but it is not the cheapest routing that does. Look at which class is paying for more accuracy than it needs, then submit again." : "That misses the accuracy target. Find the class that drags the average down, change its route and submit again."}</p>
      )}
      {checked && (
        <div className={`w-verdict ${optimal ? "good" : "bad"}`} role="status">
          {optimal ? (
            <><b>Cheapest feasible routing found.</b> Cost {v.cost} units at {v.acc} percent.</>
          ) : ok ? (
            <><b>It meets the target, but a cheaper routing exists.</b> The cheapest feasible one costs {best.cost} units: {CLASSES.map((c) => `${c.name} to ${EXTS.find((e) => e.id === best.r[c.id])!.name}`).join("; ")}.</>
          ) : (
            <><b>Below the target.</b> The cheapest feasible routing costs {best.cost} units at {best.acc} percent: {CLASSES.map((c) => `${c.name} to ${EXTS.find((e) => e.id === best.r[c.id])!.name}`).join("; ")}.</>
          )}
          <br />Give the easiest class the free path and the hardest class to people. The classes in between decide the bill, so measure each one before choosing.
        </div>
      )}
    </div>
  );
}
