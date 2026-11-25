import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Llmops06BurnRuleTester.css";

// The two rules of monitoring.py. A rule pages when both of its windows burn above its rate.
type Rule = { name: "fast" | "slow"; rate: number; longMin: number; shortMin: number; longLabel: string; shortLabel: string };
const RULES: Rule[] = [
  { name: "fast", rate: 14.4, longMin: 60, shortMin: 5, longLabel: "1 hour", shortLabel: "5 minutes" },
  { name: "slow", rate: 6, longMin: 360, shortMin: 30, longLabel: "6 hours", shortLabel: "30 minutes" },
];

// Steady traffic fails (or is blocked) 1% of the time. A segment replaces that share for the minutes
// from `start` minutes ago up to `end` minutes ago. Minute 0 is the latest minute.
const BASELINE = 0.01;
type Segment = { start: number; end: number; share: number };
type Scenario = { title: string; slo: string; target: number; bad: string; segments: Segment[]; why: string };

const SCENARIOS: Scenario[] = [
  {
    title: "A total outage, 45 minutes old and still going",
    slo: "answer-success",
    target: 0.95,
    bad: "failing",
    segments: [{ start: 45, end: 0, share: 1 }],
    why: "The one-hour window and the five-minute window are both over 14.4, so the fast rule pages. The outage fills only a small part of six hours, so the six-hour window stays low.",
  },
  {
    title: "A total outage that lasted 50 minutes and ended 10 minutes ago",
    slo: "answer-success",
    target: 0.95,
    bad: "failing",
    segments: [{ start: 60, end: 10, share: 1 }],
    why: "The one-hour window is still high, because the outage fills most of the last hour. The five-minute window is clean. The rule needs both, so it stays quiet. That is the short window doing its job.",
  },
  {
    title: "35% of requests failing for the last six hours",
    slo: "answer-success",
    target: 0.95,
    bad: "failing",
    segments: [{ start: 360, end: 0, share: 0.35 }],
    why: "A 35% failing share is a burn rate of 7.0. That is under the fast limit of 14.4 and over the slow limit of 6, in both slow windows. So only the slow rule pages.",
  },
  {
    title: "8% of requests failing for the last six hours",
    slo: "answer-success",
    target: 0.95,
    bad: "failing",
    segments: [{ start: 360, end: 0, share: 0.08 }],
    why: "An 8% failing share is a burn rate of 1.6. It is under both limits, so nobody is paged. The budget still empties in 17.5 days. This is the gap that two rules leave.",
  },
  {
    title: "A total outage for the last six hours",
    slo: "answer-success",
    target: 0.95,
    bad: "failing",
    segments: [{ start: 360, end: 0, share: 1 }],
    why: "Every window sits at a burn rate of 20, so both rules page. The fast rule fired hours ago, and the slow rule has now caught up.",
  },
  {
    title: "Half of all requests blocked by a guard for the last hour",
    slo: "guard-block-rate",
    target: 0.97,
    bad: "blocked",
    segments: [{ start: 60, end: 0, share: 0.5 }],
    why: "This SLO allows 3% blocked, so half blocked is a burn rate of 16.7 and the fast rule pages. Averaged over six hours it is only 3.1, under the slow limit of 6.",
  },
];

const OPTIONS = ["No page", "Fast rule pages", "Slow rule pages", "Both rules page"];

const shareAt = (s: Scenario, minute: number) => {
  for (const g of s.segments) if (minute >= g.end && minute < g.start) return g.share;
  return BASELINE;
};
const windowShare = (s: Scenario, minutes: number) => {
  let sum = 0;
  for (let m = 0; m < minutes; m++) sum += shareAt(s, m);
  return sum / minutes;
};
const allowed = (s: Scenario) => Math.round((1 - s.target) * 1000) / 1000;

type Windows = { rule: Rule; longShare: number; longBurn: number; shortShare: number; shortBurn: number; fires: boolean };
const evaluate = (s: Scenario): Windows[] =>
  RULES.map((rule) => {
    const longShare = windowShare(s, rule.longMin);
    const shortShare = windowShare(s, rule.shortMin);
    const longBurn = longShare / allowed(s);
    const shortBurn = shortShare / allowed(s);
    return { rule, longShare, longBurn, shortShare, shortBurn, fires: longBurn > rule.rate && shortBurn > rule.rate };
  });
const outcome = (w: Windows[]) => (w[0].fires && w[1].fires ? 3 : w[0].fires ? 1 : w[1].fires ? 2 : 0);

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const burn = (x: number) => x.toFixed(1);

export default function Llmops06BurnRuleTester({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<(number | null)[]>(SCENARIOS.map(() => null));

  const pick = (i: number, said: number) => {
    if (picks[i] !== null) return;
    const next = picks.map((p, j) => (j === i ? said : p));
    setPicks(next);
    if (next.every((p) => p !== null)) {
      const right = next.filter((p, j) => p === outcome(evaluate(SCENARIOS[j]))).length;
      complete(`${right} of ${SCENARIOS.length} pages predicted`);
    }
  };

  const answered = picks.filter((p) => p !== null).length;

  return (
    <div className="w-panel llmops06-burn-rule-tester">
      <p className="w-label">Six replayed incidents</p>
      <p className="llmops06-burn-rule-tester-hint">
        Steady traffic fails, or is blocked, 1% of the time. The fast rule needs a burn rate above 14.4 over 1 hour and over 5 minutes. The slow rule needs one above 6 over 6 hours and over 30 minutes. {answered} of {SCENARIOS.length} answered.
      </p>
      {SCENARIOS.map((s, i) => {
        const picked = picks[i];
        const done = picked !== null;
        const win = evaluate(s);
        const truth = outcome(win);
        return (
          <section key={s.title} className="llmops06-burn-rule-tester-card" aria-label={`Incident ${i + 1}: ${s.title}`}>
            <h4 className="llmops06-burn-rule-tester-title">{s.title}</h4>
            <p className="llmops06-burn-rule-tester-note">
              SLO <span className="w-mono">{s.slo}</span>, target {(s.target * 100).toFixed(0)}%, so {pct(allowed(s))} of requests may be {s.bad}.
            </p>
            <div className="llmops06-burn-rule-tester-choices" role="radiogroup" aria-label="Which rules page">
              {OPTIONS.map((label, k) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={picked === k}
                  disabled={done}
                  className={`w-chip llmops06-burn-rule-tester-choice${picked === k ? " on" : ""}${done && k === truth ? " right" : ""}`}
                  onClick={() => pick(i, k)}
                >
                  {label}
                </button>
              ))}
            </div>
            {done && (
              <>
                <table className="llmops06-burn-rule-tester-table">
                  <thead>
                    <tr>
                      <th scope="col">Window</th>
                      <th scope="col">Share {s.bad}</th>
                      <th scope="col">Burn rate</th>
                      <th scope="col">Limit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {win
                      .flatMap((w) => [
                        { rule: w.rule, label: `${w.rule.name} rule, ${w.rule.longLabel}`, share: w.longShare, b: w.longBurn },
                        { rule: w.rule, label: `${w.rule.name} rule, ${w.rule.shortLabel}`, share: w.shortShare, b: w.shortBurn },
                      ])
                      .map((row) => (
                        <tr key={row.label} className={row.b > row.rule.rate ? "over" : ""}>
                          <th scope="row">{row.label}</th>
                          <td>{pct(row.share)}</td>
                          <td>{burn(row.b)}</td>
                          <td>{row.b > row.rule.rate ? `over ${row.rule.rate}` : `under ${row.rule.rate}`}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <p className={`llmops06-burn-rule-tester-why ${picked === truth ? "ok" : "miss"}`} role="status">
                  <strong>{picked === truth ? "Correct. " : `Missed. The answer is: ${OPTIONS[truth].toLowerCase()}. `}</strong>
                  {s.why}
                </p>
              </>
            )}
          </section>
        );
      })}
      {answered === SCENARIOS.length && (
        <div className="w-verdict good" role="status">
          Two incidents page the fast rule only, one pages the slow rule only, one pages both and two page nobody. The two quiet ones differ. One is over, and the short window said so. The other is a real leak that stays under both limits for as long as it lasts.
        </div>
      )}
    </div>
  );
}
