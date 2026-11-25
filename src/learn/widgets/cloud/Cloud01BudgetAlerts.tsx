import { useId, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud01BudgetAlerts.css";

// Three invented months against a budget of 50 units. The alert rules are the ones audit_budget in
// capstone/src/askpep/identity.py demands: 50%, 90% and 100% of actual spend, and a forecast at 100%.
// The forecast here is a straight line.
// CHECK: Google's forecast is its own model, so the real day differs.

const BUDGET = 50;
const DAYS = 30;

type Pick = number | "none";

type Scenario = {
  id: string;
  title: string;
  spend: string;
  daily: (day: number) => number;
  options: { label: string; value: Pick }[];
  lesson: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: "steady",
    title: "A quiet month",
    spend: "1 unit every day.",
    daily: () => 1,
    options: [
      { label: "No alert", value: "none" },
      { label: "Day 15", value: 15 },
      { label: "Day 25", value: 25 },
      { label: "Day 30", value: 30 },
    ],
    lesson: "The month ends at 30 units. The 50% rule fires on day 25, because 25 is half of 50, and nothing else fires. One early email in a normal month is expected.",
  },
  {
    id: "forgotten",
    title: "A forgotten instance",
    spend: "1 unit a day on days 1 to 7, then 5 units a day from day 8.",
    daily: (d) => (d <= 7 ? 1 : 5),
    options: [
      { label: "No alert", value: "none" },
      { label: "Day 9", value: 9 },
      { label: "Day 11", value: 11 },
      { label: "Day 15", value: 15 },
      { label: "Day 16", value: 16 },
    ],
    lesson: "The forecast rule fires first, before spend reaches any threshold. It is the only rule that warns while there is time to act.",
  },
  {
    id: "late",
    title: "A spike in the last week",
    spend: "1 unit a day on days 1 to 24, then 10 units a day from day 25.",
    daily: (d) => (d <= 24 ? 1 : 10),
    options: [
      { label: "No alert", value: "none" },
      { label: "Day 25", value: 25 },
      { label: "Day 26", value: 26 },
      { label: "Day 27", value: 27 },
      { label: "Day 30", value: 30 },
    ],
    lesson: "A late spike leaves no head start. The forecast and the 90% rule fire one day apart, and the month still ends far over the budget.",
  },
];

function cumulative(daily: (day: number) => number): number[] {
  const cum = [0];
  for (let d = 1; d <= DAYS; d++) cum.push(cum[d - 1] + daily(d));
  return cum;
}

// All integer arithmetic, so a boundary day is exact.
function firstDay(test: (d: number) => boolean): number | null {
  for (let d = 1; d <= DAYS; d++) if (test(d)) return d;
  return null;
}

function alerts(cum: number[]) {
  return {
    half: firstDay((d) => cum[d] * 2 >= BUDGET),
    ninety: firstDay((d) => cum[d] * 10 >= BUDGET * 9),
    full: firstDay((d) => cum[d] >= BUDGET),
    forecast: firstDay((d) => cum[d] * DAYS >= BUDGET * d),
    total: cum[DAYS],
  };
}

function firstAlert(a: ReturnType<typeof alerts>): Pick {
  const days = [a.half, a.ninety, a.full, a.forecast].filter((d): d is number => d !== null);
  return days.length ? Math.min(...days) : "none";
}

const W = 320;
const H = 170;
const LEFT = 36;
const RIGHT = 10;
const TOP = 10;
const BOTTOM = 24;

export default function Cloud01BudgetAlerts({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const groupId = useId();
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState<Pick | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [rights, setRights] = useState<boolean[]>([]);

  const sc = SCENARIOS[index];
  const cum = cumulative(sc.daily);
  const a = alerts(cum);
  const answer = firstAlert(a);
  const last = index === SCENARIOS.length - 1;
  const wrongNow = attempts > 0 && !resolved && pick !== null && pick !== answer;

  const check = () => {
    if (pick === null) return;
    const k = attempts + 1;
    setAttempts(k);
    const right = pick === answer;
    if (right || k >= 2) {
      setResolved(true);
      const all = [...rights, right && k === 1];
      setRights(all);
      if (last) complete(`Named the first alert on the first try in ${all.filter(Boolean).length} of ${SCENARIOS.length} months`);
    }
  };

  const next = () => {
    if (last) {
      setIndex(SCENARIOS.length);
      return;
    }
    setIndex(index + 1);
    setPick(null);
    setAttempts(0);
    setResolved(false);
  };

  if (index >= SCENARIOS.length) {
    const firstTry = rights.filter(Boolean).length;
    return (
      <div className="w-panel cloud01-budget-alerts">
        <div className="w-verdict good" role="status">
          <strong>
            {firstTry} of {SCENARIOS.length} months named correctly on the first try.
          </strong>{" "}
          A budget tells you. It never stops the spend. The forecast rule can warn early, and only the kill switch in chapter 8 acts.
        </div>
      </div>
    );
  }

  // Chart geometry.
  const yMax = Math.max(a.total, BUDGET) * 1.08;
  const x = (d: number) => LEFT + ((W - LEFT - RIGHT) * d) / DAYS;
  const y = (v: number) => TOP + (H - TOP - BOTTOM) * (1 - v / yMax);
  const path = cum.map((v, d) => `${d === 0 ? "M" : "L"}${x(d).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const lines: { v: number; label: string }[] = [
    { v: BUDGET * 0.5, label: "50%" },
    { v: BUDGET * 0.9, label: "90%" },
    { v: BUDGET, label: "100%" },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel cloud01-budget-alerts">
        <div className="w-row between">
          <span className="w-label">
            Month {index + 1} of {SCENARIOS.length}: {sc.title}
          </span>
          <span className="cloud01-budget-alerts-count">Budget: {BUDGET} units, over {DAYS} days</span>
        </div>

        <p className="cloud01-budget-alerts-rules">
          Four rules email you. Three fire when the actual spend so far reaches 50%, 90% and 100% of the budget. The fourth fires when the forecast for the month reaches 100%. Here the
          forecast is a straight line, which is spend so far divided by days so far, times {DAYS}.
        </p>
        <p className="cloud01-budget-alerts-spend">
          <strong>Spend:</strong> {sc.spend}
        </p>

        <fieldset className="cloud01-budget-alerts-pick" disabled={resolved}>
          <legend id={groupId}>On which day does the first alert email arrive?</legend>
          <div role="radiogroup" aria-labelledby={groupId} className="cloud01-budget-alerts-opts">
            {sc.options.map((o) => (
              <button
                key={String(o.value)}
                type="button"
                role="radio"
                aria-checked={pick === o.value}
                className={`cloud01-budget-alerts-opt${pick === o.value ? " on" : ""}${resolved && o.value === answer ? " right" : ""}`}
                onClick={() => setPick(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>

        {!resolved && (
          <div className="w-row">
            <button type="button" className="w-btn primary" disabled={pick === null} onClick={check}>
              Check my day
            </button>
            {wrongNow && (
              <span className="cloud01-budget-alerts-hint" role="status">
                Not yet. Work out the day each rule fires, and take the earliest.
              </span>
            )}
          </div>
        )}

        {resolved && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="cloud01-budget-alerts-result">
            <svg
              className="cloud01-budget-alerts-chart"
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-label={`Spend over ${DAYS} days against a budget of ${BUDGET}. The month ends at ${a.total}.`}
            >
              {lines.map((l) => (
                <g key={l.label}>
                  <line x1={LEFT} x2={W - RIGHT} y1={y(l.v)} y2={y(l.v)} className="cloud01-budget-alerts-limit" />
                  <text x={LEFT - 4} y={y(l.v) + 3} textAnchor="end" className="cloud01-budget-alerts-tick">
                    {l.label}
                  </text>
                </g>
              ))}
              <path d={path} className="cloud01-budget-alerts-curve" fill="none" />
              {[a.half, a.ninety, a.full].map((d, i) =>
                d === null ? null : <circle key={i} cx={x(d)} cy={y(cum[d])} r={3.5} className="cloud01-budget-alerts-dot" />,
              )}
              {a.forecast !== null && (
                <rect x={x(a.forecast) - 3.5} y={y(cum[a.forecast]) - 3.5} width={7} height={7} transform={`rotate(45 ${x(a.forecast)} ${y(cum[a.forecast])})`} className="cloud01-budget-alerts-fc" />
              )}
              <text x={LEFT} y={H - 6} className="cloud01-budget-alerts-tick">
                day 1
              </text>
              <text x={W - RIGHT} y={H - 6} textAnchor="end" className="cloud01-budget-alerts-tick">
                day {DAYS}
              </text>
            </svg>

            <ul className="cloud01-budget-alerts-days">
              <li>50% of actual spend: {dayText(a.half)}</li>
              <li>90% of actual spend: {dayText(a.ninety)}</li>
              <li>100% of actual spend: {dayText(a.full)}</li>
              <li>Forecast reaches 100%: {dayText(a.forecast)}</li>
              <li>Spend at the end of day {DAYS}: {a.total} units</li>
            </ul>

            <div className={`w-verdict ${pick === answer ? "good" : "bad"}`} role="status">
              <strong>{pick === answer ? "Right." : `The first alert is ${answer === "none" ? "never" : `on day ${answer}`}.`}</strong> {sc.lesson}
            </div>
            <div className="w-row">
              <button type="button" className="w-btn primary" onClick={next}>
                {last ? "See the result" : "Next month"}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </MotionConfig>
  );
}

function dayText(d: number | null): string {
  return d === null ? "never" : `day ${d}`;
}
