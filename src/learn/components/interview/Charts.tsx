import { motion } from "motion/react";
import { DIMENSIONS, type Dimension, type GradeResult } from "./api.ts";

export function ScoreDial({ value, size = 132 }: { value: number; size?: number }) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const tone = value >= 7.5 ? "var(--teal)" : value >= 5 ? "var(--amber)" : "var(--rose)";
  return (
    <div className="dial" style={{ width: size, height: size }} role="img" aria-label={`Overall score ${value.toFixed(1)} out of 10`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={10} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - value / 10) }}
          transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="dial-text"><b>{value.toFixed(1)}</b><span>out of 10</span></div>
    </div>
  );
}

const LABEL: Record<Dimension, string> = { crispness: "Crispness", understanding: "Understanding", keywords: "Keywords", structure: "Structure", depth: "Depth" };

export function Radar({ scores }: { scores: GradeResult["scores"] }) {
  const S = 260;
  const cx = S / 2;
  const R = 90;
  const pt = (i: number, v: number): [number, number] => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / DIMENSIONS.length;
    return [cx + Math.cos(a) * R * v, cx + Math.sin(a) * R * v];
  };
  const poly = (v: (i: number) => number) => DIMENSIONS.map((_, i) => pt(i, v(i)).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="radar" role="img" aria-label="Scores by dimension">
      {[0.25, 0.5, 0.75, 1].map((g) => <polygon key={g} points={poly(() => g)} fill="none" stroke="var(--line)" strokeWidth={1} />)}
      {DIMENSIONS.map((_, i) => { const [x, y] = pt(i, 1); return <line key={i} x1={cx} y1={cx} x2={x} y2={y} stroke="var(--line)" />; })}
      <motion.polygon
        points={poly((i) => scores[DIMENSIONS[i]].score / 10)}
        fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round"
        style={{ transformOrigin: `${cx}px ${cx}px` }} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
      />
      {DIMENSIONS.map((d, i) => {
        const [x, y] = pt(i, 1.2);
        return <text key={d} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="11" fill="var(--muted)" fontFamily="var(--font-body)">{LABEL[d]}</text>;
      })}
    </svg>
  );
}

export function DimensionBars({ scores }: { scores: GradeResult["scores"] }) {
  return (
    <div className="dim-bars">
      {DIMENSIONS.map((d, i) => {
        const s = scores[d];
        const tone = s.score >= 7.5 ? "var(--teal)" : s.score >= 5 ? "var(--amber)" : "var(--rose)";
        return (
          <div key={d} className="dim">
            <div className="w-row between"><strong>{LABEL[d]}</strong><span className="w-mono">{s.score}/10</span></div>
            <div className="dim-track"><motion.i style={{ background: tone }} initial={{ width: 0 }} animate={{ width: `${s.score * 10}%` }} transition={{ duration: 0.7, delay: 0.08 * i, ease: [0.22, 0.61, 0.36, 1] }} /></div>
            <p className="muted">{s.note}</p>
          </div>
        );
      })}
    </div>
  );
}

export function Sparkline({ values, width = 140, height = 36 }: { values: number[]; width?: number; height?: number }) {
  if (values.length === 0) return null;
  const pad = 4;
  const x = (i: number) => (values.length === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (values.length - 1));
  const y = (v: number) => height - pad - (v / 10) * (height - pad * 2);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = values[values.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Score trend, latest ${last.toFixed(1)}`}>
      {values.length > 1 && <path d={d} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
      {values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === values.length - 1 ? 3.5 : 2} fill={i === values.length - 1 ? "var(--accent)" : "var(--surface)"} stroke="var(--accent)" strokeWidth={1.5} />)}
    </svg>
  );
}
