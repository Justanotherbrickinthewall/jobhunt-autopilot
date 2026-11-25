import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "./useComplete";
import "./WeekPlan.css";

type Act = "read" | "lab" | "deck" | "drill" | "teach";
const ACTS: { id: Act; label: string; mins: number; colour: string }[] = [
  { id: "read", label: "Read chapter", mins: 40, colour: "var(--accent)" },
  { id: "lab", label: "Lab", mins: 75, colour: "var(--teal)" },
  { id: "deck", label: "Review deck", mins: 15, colour: "var(--amber)" },
  { id: "drill", label: "Interview drill", mins: 25, colour: "var(--rose)" },
  { id: "teach", label: "Teach-back", mins: 15, colour: "var(--muted)" },
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CAP = 120;

type Plan = Set<Act>[];
const empty = (): Plan => DAYS.map(() => new Set<Act>());
const fromLists = (l: Act[][]): Plan => l.map((a) => new Set(a));

const SUGGESTED: Act[][] = [
  ["read", "deck"],
  ["lab", "deck"],
  ["deck", "drill", "teach"],
  ["read", "deck"],
  ["lab", "deck"],
  ["deck", "drill", "teach"],
  [],
];

const minsOf = (s: Set<Act>) => ACTS.reduce((n, a) => n + (s.has(a.id) ? a.mins : 0), 0);

type Check = { id: string; label: string; ok: boolean; detail: string };

function evaluate(plan: Plan, budgetH: number): Check[] {
  const days = (a: Act) => plan.flatMap((s, i) => (s.has(a) ? [i] : []));
  const reads = days("read");
  const labs = days("lab");
  const drills = days("drill");
  const teaches = days("teach");
  const deckDays = days("deck").length;
  const total = plan.reduce((n, s) => n + minsOf(s), 0);
  const heavy = plan.filter((s) => minsOf(s) > CAP).length;
  const unlabbed = reads.filter((d) => !labs.some((l) => l >= d && l <= d + 2));
  const drillOnRead = drills.filter((d) => reads.includes(d));
  const earlyTeach = teaches.filter((d) => reads.some((r) => r < d));
  const offDays = plan.filter((s) => s.size === 0).length;
  return [
    {
      id: "deck",
      label: "Review deck on at least 4 different days",
      ok: deckDays >= 4,
      detail: `${deckDays} day${deckDays === 1 ? "" : "s"}. Spacing needs many short touches, not one long one.`,
    },
    {
      id: "lab",
      label: "Every chapter read gets a lab within two days",
      ok: reads.length > 0 && unlabbed.length === 0,
      detail: reads.length === 0 ? "No chapter read yet." : unlabbed.length ? `${unlabbed.length} read day${unlabbed.length > 1 ? "s have" : " has"} no lab in time.` : "Build while it is fresh.",
    },
    {
      id: "drill",
      label: "At least 2 interview drills, never on a read day",
      ok: drills.length >= 2 && drillOnRead.length === 0,
      detail: drillOnRead.length ? "A drill on a read day tests nothing but short-term memory." : `${drills.length} drill${drills.length === 1 ? "" : "s"} planned.`,
    },
    {
      id: "teach",
      label: "A teach-back on a day after a read",
      ok: earlyTeach.length >= 1,
      detail: "Explaining from memory is the stage that exposes gaps, so leave a gap first.",
    },
    {
      id: "rest",
      label: "At least one empty rest day",
      ok: offDays >= 1,
      detail: "Consolidation needs time, and so do you.",
    },
    {
      id: "load",
      label: `Within ${budgetH} hours, and no day over ${CAP} minutes`,
      ok: total <= budgetH * 60 && heavy === 0,
      detail: `${(total / 60).toFixed(1)} hours planned${heavy ? `, ${heavy} day${heavy > 1 ? "s" : ""} over the cap` : ""}.`,
    },
  ];
}

export default function WeekPlan({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const reduce = useReducedMotion();
  const [plan, setPlan] = useState<Plan>(empty);
  const [budget, setBudget] = useState(7);
  const [verdict, setVerdict] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const checks = useMemo(() => evaluate(plan, budget), [plan, budget]);
  const passed = checks.filter((c) => c.ok).length;
  const locked = verdict !== null;

  function toggle(d: number, a: Act) {
    if (locked) return;
    setPlan((p) =>
      p.map((s, i) => {
        if (i !== d) return s;
        const n = new Set(s);
        if (n.has(a)) n.delete(a);
        else n.add(a);
        return n;
      }),
    );
  }

  function judge() {
    const failed = checks.filter((c) => !c.ok);
    const good = failed.length === 0;
    setVerdict({
      tone: good ? "good" : "bad",
      text: good
        ? "All six checks pass. This week spaces its reviews, builds while ideas are fresh, retrieves after a gap, and leaves a rest day. Run it for two weeks before you change anything."
        : `${passed} of ${checks.length} checks pass. Fix this first: ${failed[0]?.label}. ${failed[0]?.detail}`,
    });
    complete(`${passed}/${checks.length} checks passed at ${budget} hours`);
  }

  const bw = 36;
  const gap = 12;
  const chartH = 118;
  const base = 100;
  const scale = 82 / CAP;

  return (
    <div className="w-panel week-plan">
      <label className="week-plan-budget">
        <span>Hours you can give this week: <strong>{budget}</strong></span>
        <input type="range" min={3} max={12} step={1} value={budget} onChange={(e) => setBudget(Number(e.target.value))} disabled={locked} />
      </label>

      <div className="week-plan-legend">
        {ACTS.map((a) => (
          <span key={a.id}><i style={{ background: a.colour }} />{a.label} {a.mins} min</span>
        ))}
      </div>

      <div className="week-plan-grid">
        {DAYS.map((day, d) => (
          <div key={day} className="week-plan-day">
            <span className="week-plan-dayname">{day}</span>
            <div className="week-plan-acts">
              {ACTS.map((a) => {
                const on = plan[d]?.has(a.id) ?? false;
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${day}: ${a.label}`}
                    className={"week-plan-act" + (on ? " is-on" : "")}
                    style={on ? { background: a.colour, borderColor: a.colour } : undefined}
                    onClick={() => toggle(d, a.id)}
                    disabled={locked}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <svg viewBox={`0 0 ${DAYS.length * (bw + gap) + gap} ${chartH}`} className="week-plan-svg" role="img" aria-label="Minutes planned per day">
        <line x1={0} x2={DAYS.length * (bw + gap) + gap} y1={base - CAP * scale} y2={base - CAP * scale} className="week-plan-cap" />
        <text x={2} y={base - CAP * scale - 3} className="week-plan-captext">{CAP} min cap</text>
        {DAYS.map((day, d) => {
          let y = base;
          const x = gap + d * (bw + gap);
          const set = plan[d] ?? new Set<Act>();
          return (
            <g key={day}>
              {ACTS.filter((a) => set.has(a.id)).map((a) => {
                const h = a.mins * scale;
                y -= h;
                return (
                  <motion.rect
                    key={a.id}
                    x={x}
                    width={bw}
                    rx={3}
                    fill={a.colour}
                    initial={reduce ? false : { height: 0, y: y + h }}
                    animate={{ height: h - 1, y }}
                    transition={{ duration: reduce ? 0 : 0.25, ease: "easeOut" }}
                  />
                );
              })}
              <text x={x + bw / 2} y={base + 13} textAnchor="middle" className="week-plan-daytext">{day}</text>
            </g>
          );
        })}
      </svg>

      <ul className="week-plan-checks" aria-live="polite">
        {checks.map((c) => (
          <li key={c.id} className={c.ok ? "is-ok" : "is-no"}>
            <span className="week-plan-mark" aria-hidden="true">{c.ok ? "✓" : "✗"}</span>
            <span><strong>{c.label}.</strong> <em>{c.detail}</em></span>
          </li>
        ))}
      </ul>

      <div className="w-row week-plan-actions">
        <button type="button" className="w-btn primary" onClick={judge} disabled={locked}>Judge my week</button>
        <button type="button" className="w-btn ghost" onClick={() => { setPlan(fromLists(SUGGESTED)); setVerdict(null); }}>
          Show the suggested week
        </button>
        <button type="button" className="w-btn ghost" onClick={() => { setPlan(empty()); setVerdict(null); }}>Clear</button>
      </div>

      {verdict && <div className={"w-verdict " + verdict.tone} role="status">{verdict.text}</div>}
    </div>
  );
}
