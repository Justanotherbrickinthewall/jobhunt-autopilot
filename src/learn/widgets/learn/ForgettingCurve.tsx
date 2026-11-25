import { useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "./useComplete";
import "./ForgettingCurve.css";

// A toy model. The exponential decay shape follows Ebbinghaus. The constants are invented
// so the trade-offs are visible, and the widget says so on screen.
const S0 = 1.5; // memory stability in days after first learning
const EXAM = 45;
const MAX_REVIEWS = 4;
const DECK = [1, 4, 11, 27]; // the deck's gaps of 1, 3, 7 and 16 days, as days from the start

const W = 340;
const H = 214;
const L = 34;
const R = 10;
const T = 12;
const B = 32;
const px = (d: number) => L + (d / EXAM) * (W - L - R);
const py = (r: number) => T + (1 - r) * (H - T - B);

function gain(r: number) {
  // Reviewing near the point of forgetting adds the most stability.
  // Reviewing after the memory has mostly gone is relearning, which adds little.
  return r >= 0.35 ? 1 + 2.2 * (1 - r) : 1.4;
}

type Built = { d: string; examR: number; avg: number; at: number[] };

function build(reviews: number[]): Built {
  const rs = [...reviews].sort((a, b) => a - b).filter((t) => t < EXAM);
  const pts: [number, number][] = [];
  const at: number[] = [];
  let S = S0;
  let t0 = 0;
  let sum = 0;
  let n = 0;
  const seg = (from: number, to: number) => {
    for (let t = from; t < to; t += 0.25) {
      const r = Math.exp(-(t - t0) / S);
      pts.push([t, r]);
      sum += r;
      n += 1;
    }
  };
  let cursor = 0;
  for (const t of rs) {
    seg(cursor, t);
    const r = Math.exp(-(t - t0) / S);
    at.push(r);
    pts.push([t, r]);
    S *= gain(r);
    t0 = t;
    cursor = t;
    pts.push([t, 1]);
  }
  seg(cursor, EXAM);
  const examR = Math.exp(-(EXAM - t0) / S);
  pts.push([EXAM, examR]);
  const d = pts.map(([t, r], i) => `${i ? "L" : "M"}${px(t).toFixed(1)} ${py(r).toFixed(1)}`).join(" ");
  return { d, examR, avg: n ? sum / n : 0, at };
}

const fmt = (d: number) => (Number.isInteger(d) ? String(d) : d.toFixed(1));
const pct = (r: number) => `${Math.round(r * 100)}%`;

const PRESETS: { label: string; days: number[] }[] = [
  { label: "Cram", days: [0.1, 0.2, 0.3, 0.4] },
  { label: "Weekly", days: [7, 14, 21, 28] },
  { label: "Expanding", days: [1, 4, 11, 27] },
];

export default function ForgettingCurve({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const reduce = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const [reviews, setReviews] = useState<number[]>([]);
  const [day, setDay] = useState(3);
  const [verdict, setVerdict] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const mine = useMemo(() => build(reviews), [reviews]);
  const deck = useMemo(() => build(DECK), []);
  const base = useMemo(() => build([]), []);
  const judged = verdict !== null;

  function add(d: number) {
    if (judged) return;
    setReviews((r) => {
      if (r.length >= MAX_REVIEWS || r.includes(d) || d <= 0 || d >= EXAM) return r;
      return [...r, d].sort((a, b) => a - b);
    });
  }

  function onChartClick(e: ReactMouseEvent<SVGSVGElement>) {
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const raw = ((x - L) / (W - L - R)) * EXAM;
    const d = Math.round(raw * 2) / 2;
    if (d > 0 && d < EXAM) add(d);
  }

  function applyPreset(days: number[]) {
    if (judged) return;
    setReviews([...days]);
  }

  function judge() {
    if (reviews.length < 2) return;
    const beats = mine.examR >= deck.examR - 0.001;
    const span = Math.max(...reviews) - Math.min(...reviews);
    let text = `Your plan holds ${pct(mine.examR)} on exam day. The expanding deck schedule (days 1, 4, 11, 27) holds ${pct(deck.examR)}. `;
    if (beats && Math.max(...reviews) >= EXAM - 7) {
      text += "You matched or beat it with a review close to the exam. That lifts this one score, and it says nothing about the weeks after the exam.";
    } else if (beats) {
      text += "You matched or beat it. You timed reviews for just before the memory fades, which is the whole trick.";
    } else if (span < 3) {
      text += "Your reviews are clumped together. Clumped reviews boost the next hour and add almost no lasting stability.";
    } else if (mine.at.some((r) => r < 0.35)) {
      text += "At least one review came after the memory had mostly gone. The model counts that as relearning, which adds little.";
    } else if (mine.at.some((r) => r > 0.7)) {
      text += "At least one review came while the memory was still strong. Early reviews cost time and add little.";
    } else {
      text += "Your gaps did not grow fast enough. Each successful review should let the next gap stretch.";
    }
    setVerdict({ tone: beats ? "good" : "bad", text });
    complete(`exam-day retention ${pct(mine.examR)} vs deck ${pct(deck.examR)}`);
  }

  function reset() {
    setReviews([]);
    setVerdict(null);
  }

  const gridY = [0, 0.25, 0.5, 0.75, 1];
  const gridX = [0, 10, 20, 30, 40];

  return (
    <div className="w-panel forgetting-curve">
      <p className="forgetting-curve-lede">
        You learn something on day 0 and sit an exam on day {EXAM}. Place up to {MAX_REVIEWS} reviews to keep the memory alive. Click the chart or use the slider.
      </p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="forgetting-curve-svg"
        role="img"
        aria-label={`Retention curve. Exam day retention is ${pct(mine.examR)} with ${reviews.length} reviews.`}
        onClick={onChartClick}
      >
        {gridY.map((g) => (
          <g key={g}>
            <line x1={L} x2={W - R} y1={py(g)} y2={py(g)} className="forgetting-curve-grid" />
            <text x={L - 5} y={py(g) + 3} textAnchor="end" className="forgetting-curve-axis">{Math.round(g * 100)}</text>
          </g>
        ))}
        {gridX.map((g) => (
          <text key={g} x={px(g)} y={H - B + 14} textAnchor="middle" className="forgetting-curve-axis">{g}</text>
        ))}
        <text x={px(EXAM)} y={H - B + 14} textAnchor="middle" className="forgetting-curve-axis forgetting-curve-exam">exam</text>
        <text x={(L + W - R) / 2} y={H - 3} textAnchor="middle" className="forgetting-curve-axis">days</text>
        <line x1={px(EXAM)} x2={px(EXAM)} y1={T} y2={H - B} className="forgetting-curve-examline" />

        <path d={base.d} className="forgetting-curve-base" fill="none" />
        {judged && <path d={deck.d} className="forgetting-curve-deck" fill="none" />}
        <path d={mine.d} className="forgetting-curve-mine" fill="none" />

        {reviews.map((d) => (
          <motion.g
            key={d}
            initial={reduce ? false : { opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ transformOrigin: `${px(d)}px ${py(1)}px` }}
          >
            <line x1={px(d)} x2={px(d)} y1={py(1)} y2={H - B} className="forgetting-curve-mark" />
            <circle cx={px(d)} cy={py(1)} r={4.5} className="forgetting-curve-dot" />
          </motion.g>
        ))}
      </svg>

      <div className="forgetting-curve-legend">
        <span><i className="forgetting-curve-sw is-mine" />Your plan</span>
        <span><i className="forgetting-curve-sw is-base" />No reviews</span>
        {judged && <span><i className="forgetting-curve-sw is-deck" />Deck schedule</span>}
      </div>

      <div className="forgetting-curve-stats" aria-live="polite">
        <div><strong>{pct(mine.examR)}</strong><span>on exam day</span></div>
        <div><strong>{pct(mine.avg)}</strong><span>average over {EXAM} days</span></div>
        <div><strong>{reviews.length}/{MAX_REVIEWS}</strong><span>reviews placed</span></div>
      </div>

      <div className="forgetting-curve-controls">
        <label className="forgetting-curve-slider">
          <span>Review on day {fmt(day)}</span>
          <input
            type="range"
            min={0.5}
            max={EXAM - 1}
            step={0.5}
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            disabled={judged}
          />
        </label>
        <button type="button" className="w-btn" onClick={() => add(day)} disabled={judged || reviews.length >= MAX_REVIEWS}>
          Add review
        </button>
      </div>

      <div className="forgetting-curve-chips">
        {reviews.map((d) => (
          <button
            key={d}
            type="button"
            className="w-chip forgetting-curve-chip"
            onClick={() => !judged && setReviews((r) => r.filter((x) => x !== d))}
            aria-label={`Remove review on day ${fmt(d)}`}
            disabled={judged}
          >
            day {fmt(d)} x
          </button>
        ))}
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className="w-btn ghost forgetting-curve-preset" onClick={() => applyPreset(p.days)} disabled={judged}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="w-row">
        <button type="button" className="w-btn primary" onClick={judge} disabled={judged || reviews.length < 2}>
          Judge my plan
        </button>
        <button type="button" className="w-btn ghost" onClick={reset}>Start over</button>
      </div>

      <p className="forgetting-curve-note">
        Toy model. The decaying curve is Ebbinghaus's shape. The numbers are invented to make the trade-offs visible.
      </p>

      {verdict && <div className={"w-verdict " + verdict.tone} role="status">{verdict.text}</div>}
    </div>
  );
}
