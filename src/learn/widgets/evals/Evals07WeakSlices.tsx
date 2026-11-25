import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Evals07WeakSlices.css";

type Slice = {
  name: string;
  detail: string;
  rate: number; // in points of rate, from the made-up pass counts
  mark: number; // the limit in points
  kind: "floor" | "ceiling";
};

// Made-up pass counts against the real limits in evals/gate.json.
const SLICES: Slice[] = [
  { name: "retrieval", detail: "18 of 20 pass", rate: (18 / 20) * 100, mark: 80, kind: "floor" },
  { name: "routing", detail: "14 of 16 pass", rate: (14 / 16) * 100, mark: 90, kind: "floor" },
  { name: "answer", detail: "12 of 14 pass", rate: (12 / 14) * 100, mark: 80, kind: "floor" },
  { name: "action", detail: "10 of 12 pass", rate: (10 / 12) * 100, mark: 80, kind: "floor" },
  { name: "attack", detail: "1 of 25 got through", rate: (1 / 25) * 100, mark: 5, kind: "ceiling" },
];

const headroom = (s: Slice) => (s.kind === "floor" ? s.rate - s.mark : s.mark - s.rate);
const fmt = (x: number) => (Math.round(x * 10) / 10).toFixed(1);

// The same rule as weak_slices: keep headroom under the margin, thinnest first, ties by name.
const weakAt = (margin: number) =>
  SLICES.filter((s) => headroom(s) < margin).sort((a, b) => {
    const d = headroom(a) - headroom(b);
    if (d !== 0) return d < 0 ? -1 : 1;
    return a.name < b.name ? -1 : 1;
  });

const ROUNDS: { margin: number; note: string }[] = [
  { margin: 5, note: "This is the default margin of 0.05." },
  { margin: 2, note: "A tighter margin lists fewer slices." },
  { margin: 8, note: "A wider margin lists more slices." },
];

export default function Evals07WeakSlices({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [round, setRound] = useState(0);
  const [ticked, setTicked] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [right, setRight] = useState(0);
  const [finished, setFinished] = useState(false);

  const { margin, note } = ROUNDS[round];
  const expected = weakAt(margin).map((s) => s.name);
  const matches = ticked.length === expected.length && expected.every((n) => ticked.includes(n));

  const toggle = (name: string) =>
    setTicked((cur) => (cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]));
  const check = () => {
    setChecked(true);
    if (matches) setRight((n) => n + 1);
  };
  const next = () => {
    if (round === ROUNDS.length - 1) {
      setFinished(true);
      complete(`Predicted the weak slices for ${right} of 3 margins; a wider margin lists more slices`);
      return;
    }
    setRound(round + 1);
    setTicked([]);
    setChecked(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel evals07-weak-slices">
        <p className="w-label">Made-up pass counts, real limits</p>
        {!finished && (
          <>
            <div className="w-row between">
              <span className="w-label" aria-live="polite">Margin {round + 1} of {ROUNDS.length}</span>
              <span className="w-mono">{margin} points</span>
            </div>
            <p className="evals07-weak-slices-note">{note} Tick every slice whose headroom is under {margin} points.</p>
            <ul className="evals07-weak-slices-list">
              {SLICES.map((s) => {
                const on = ticked.includes(s.name);
                const isWeak = expected.includes(s.name);
                return (
                  <li key={s.name}>
                    <button
                      type="button"
                      className={`w-chip${on ? " is-on" : ""}${checked ? (isWeak ? " good" : on ? " bad" : "") : ""}`}
                      aria-pressed={on}
                      disabled={checked}
                      onClick={() => toggle(s.name)}
                    >
                      {s.name}
                    </button>
                    <span className="evals07-weak-slices-detail">
                      {s.detail}, {fmt(s.rate)}%, {s.kind} {s.mark}%
                    </span>
                    {checked && (
                      <span className="w-mono evals07-weak-slices-room">{fmt(headroom(s))} points</span>
                    )}
                  </li>
                );
              })}
            </ul>
            {!checked && (
              <button type="button" className="w-btn" onClick={check}>
                Check my ticks
              </button>
            )}
            {checked && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-stack">
                <div className={`w-verdict ${matches ? "good" : "bad"}`} role="status">
                  {matches ? "Correct. " : "Not quite. "}
                  weak_slices returns {expected.join(", ")}, thinnest first. Headroom is the rate minus the floor, or the ceiling minus the rate.
                </div>
                <button type="button" className="w-btn" onClick={next}>
                  {round === ROUNDS.length - 1 ? "See the result" : "Next margin"}
                </button>
              </motion.div>
            )}
          </>
        )}
        {finished && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="w-verdict good" role="status">
            You matched {right} of 3 margins. Routing is already below its floor, so it leads the list at every margin. Attack and action stay in until the margin drops under their headroom. Answer joins only at 8 points. A wider margin gives a longer list, so the margin sets how much you are willing to write cases for.
          </motion.div>
        )}
      </div>
    </MotionConfig>
  );
}
