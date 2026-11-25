import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents21PassK.css";

const CHOICES = [
  { id: "at", label: "pass@k", right: false, why: "pass@k says one lucky run in k is enough. An agent that acts on its own does not get to pick the lucky run. Each run is the one that happens." },
  { id: "hat", label: "pass^k", right: true, why: "pass^k asks for success on all k runs. That matches an agent that runs unattended every day, where one bad run is a wrong action in production." },
];

export default function Agents21PassK({ onComplete }: WidgetProps) {
  const [p, setP] = useState(90);
  const [k, setK] = useState(5);
  const [pick, setPick] = useState<string | null>(null);
  const complete = useComplete(onComplete);
  const at = 1 - Math.pow(1 - p / 100, k);
  const hat = Math.pow(p / 100, k);
  const chosen = CHOICES.find((c) => c.id === pick);

  function choose(id: string) {
    if (pick) return;
    setPick(id);
    if (CHOICES.find((c) => c.id === id)?.right) complete("hold an unattended agent to pass^k");
  }

  return (
    <div className="w-panel agents21-pass-k">
      <p className="agents21-pass-k-note">Set how often one run passes, and how many times you repeat the case. Watch the two numbers pull apart.</p>
      <div className="w-stack">
        <label className="agents21-pass-k-row">
          <span>One run passes: {p} percent</span>
          <input type="range" min={50} max={99} value={p} onChange={(e) => setP(Number(e.target.value))} />
        </label>
        <label className="agents21-pass-k-row">
          <span>Runs per case, k: {k}</span>
          <input type="range" min={1} max={10} value={k} onChange={(e) => setK(Number(e.target.value))} />
        </label>
        <div className="agents21-pass-k-bars" aria-live="polite">
          <div className="agents21-pass-k-bar"><span>pass@k {at.toFixed(2)}</span><i style={{ width: `${at * 100}%` }} className="at" /></div>
          <div className="agents21-pass-k-bar"><span>pass^k {hat.toFixed(2)}</span><i style={{ width: `${hat * 100}%` }} className="hat" /></div>
        </div>
        <p className="agents21-pass-k-q">A back-office agent runs alone and moves money. Which number do you hold it to?</p>
        <div className="w-row">
          {CHOICES.map((c) => (
            <button key={c.id} type="button" className={`w-btn ${pick === c.id ? "primary" : "ghost"}`} disabled={!!pick && pick !== c.id} onClick={() => choose(c.id)}>{c.label}</button>
          ))}
        </div>
        {chosen && <p className={`w-verdict ${chosen.right ? "good" : "bad"}`} role="status">{chosen.why}</p>}
        {chosen && !chosen.right && (
          <div className="w-row"><button type="button" className="w-btn ghost" onClick={() => setPick(null)}>Choose again</button></div>
        )}
      </div>
    </div>
  );
}
