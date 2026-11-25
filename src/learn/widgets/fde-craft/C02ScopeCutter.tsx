import { useMemo, useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C02ScopeCutter.css";

// Illustrative figures. Value is what the item earns the customer; risk is how likely it is to sink the pilot.
type Item = { id: string; name: string; value: number; risk: number; must?: boolean; note: string };
const ITEMS: Item[] = [
  { id: "extract", name: "Extract header fields from born-digital PDF invoices", value: 5, risk: 1, must: true, note: "The core of the pilot. Low risk because the text is already clean." },
  { id: "baseline", name: "Measure today's error rate and handling time on 200 invoices", value: 5, risk: 1, must: true, note: "Without a baseline you cannot prove the pilot worked." },
  { id: "review", name: "Send failed checks to the review queue", value: 4, risk: 2, must: true, note: "This is how the system stays safe while it is still learning." },
  { id: "scans", name: "Handle scanned and photographed invoices", value: 3, risk: 4, note: "Valuable, but it adds a second pipeline and a new error pattern. Phase two." },
  { id: "lines", name: "Extract every line item", value: 3, risk: 3, note: "Header fields give most of the value, so the pilot scope stops there. If a fourth slot is free, this is the cheapest first extension. Line items need a harder schema." },
  { id: "post", name: "Post approved invoices straight to the finance system", value: 4, risk: 5, note: "Writes to a system of record. Needs change control. Show the approved result first." },
  { id: "chat", name: "A chat window for finance questions", value: 2, risk: 3, note: "A separate product. It splits the pilot's attention and has no metric yet." },
  { id: "lang", name: "Support invoices in six languages", value: 2, risk: 4, note: "Only a tenth of the volume. Start with the two languages that matter." },
];

const SLOTS = 4;

function score(ids: string[]) {
  const picked = ITEMS.filter((i) => ids.includes(i.id));
  const value = picked.reduce((s, i) => s + i.value, 0);
  const risk = picked.reduce((s, i) => s + i.risk, 0);
  const missingMust = ITEMS.filter((i) => i.must && !ids.includes(i.id)).length;
  return { value, risk, net: value - risk - missingMust * 10 };
}

function best() {
  let top = -Infinity;
  let set: string[] = [];
  const n = ITEMS.length;
  for (let m = 0; m < 1 << n; m++) {
    const ids = ITEMS.filter((_, i) => m & (1 << i)).map((i) => i.id);
    if (ids.length !== SLOTS) continue;
    const s = score(ids).net;
    if (s > top) {
      top = s;
      set = ids;
    }
  }
  return { set, net: top };
}

export default function C02ScopeCutter({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [kept, setKept] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const ref = useMemo(best, []);
  const mine = score(kept);

  function toggle(id: string) {
    if (done) return;
    setKept((k) => (k.includes(id) ? k.filter((x) => x !== id) : k.length < SLOTS ? [...k, id] : k));
  }
  // Completes on the first reference-quality pilot, or after the second attempt with the explanation shown.
  function check() {
    const n = attempts + 1;
    setAttempts(n);
    setDone(true);
    if (mine.net >= ref.net || n >= 2) {
      const same = ref.set.every((id) => kept.includes(id));
      complete(same ? "matched the reference pilot" : `net ${mine.net} against a reference net of ${ref.net}`);
    }
  }
  const locked = done && (mine.net >= ref.net || attempts >= 2);

  return (
    <div className="w-panel fde-craft-scope-cutter">
      <p className="fde-craft-scope-cutter-lede">
        The Harbour Supplies wish list has eight items and the pilot has room for {SLOTS}. Keep the four that give the pilot the best chance of a clear result.
      </p>
      <div className="w-row fde-craft-scope-cutter-meter" role="status" aria-live="polite">
        <span className="w-label">Kept</span>
        <span className="w-mono">{kept.length} of {SLOTS}</span>
        <span className="w-label">Value</span>
        <span className="w-mono">{mine.value}</span>
        <span className="w-label">Risk</span>
        <span className="w-mono">{mine.risk}</span>
      </div>
      <ul className="fde-craft-scope-cutter-list">
        {ITEMS.map((i) => {
          const on = kept.includes(i.id);
          const inRef = ref.set.includes(i.id);
          return (
            <li key={i.id}>
              <button
                type="button"
                className={`w-chip fde-craft-scope-cutter-item${on ? " is-on" : ""}`}
                aria-pressed={on}
                onClick={() => toggle(i.id)}
                disabled={!on && kept.length >= SLOTS && !done}
              >
                <span>{i.name}</span>
                <span className="w-mono fde-craft-scope-cutter-tags">value {i.value} risk {i.risk}</span>
              </button>
              {done && (
                <p className="fde-craft-scope-cutter-note">
                  {on === inRef ? (on ? "Kept, and right to keep. " : "Cut, and right to cut. ") : on ? "Kept, but I would cut it. " : "Cut, but I would keep it. "}
                  {i.note}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {!done && (
        <button type="button" className="w-btn" onClick={check} disabled={kept.length !== SLOTS}>
          Lock the pilot
        </button>
      )}
      {done && (
        <div className={`w-verdict ${mine.net >= ref.net ? "good" : "bad"}`} role="status">
          <strong>Your net score is {mine.net}. The reference is {ref.net}.</strong>{" "}
          {mine.net >= ref.net
            ? "You kept the baseline and the review queue and cut the risky extras. Effort never entered the choice."
            : "The three must-haves are the baseline, the extraction and the review queue. Without them the pilot cannot show a clear result."}
        </div>
      )}
      {done && !locked && (
        <button type="button" className="w-btn ghost" onClick={() => setDone(false)}>
          Change the pilot and try once more
        </button>
      )}
      <p className="fde-craft-scope-cutter-foot">Illustrative figures. Net is value minus risk, minus 10 for each must-have you cut. The weights are a judgement.</p>
    </div>
  );
}
