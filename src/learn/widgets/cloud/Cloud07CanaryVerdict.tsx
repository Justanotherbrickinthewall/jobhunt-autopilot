import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud07CanaryVerdict.css";

type Outcome = "wait-requests" | "wait-verdicts" | "rollback-slo" | "rollback-judge" | "rollback-both" | "promote";

const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: "wait-requests", label: "Wait for requests" },
  { id: "wait-verdicts", label: "Wait for verdicts" },
  { id: "rollback-slo", label: "Roll back on an SLO" },
  { id: "rollback-judge", label: "Roll back on the judge" },
  { id: "rollback-both", label: "Roll back on both" },
  { id: "promote", label: "Promote" },
];

const MIN_REQUESTS = 20;
const MIN_VERDICTS = 5;
const MIN_PASS_RATE = 0.8;

type Canary = { id: string; requests: number; unmet: string[]; judged: number; passed: number; why: string };

const CANARIES: Canary[] = [
  {
    id: "k1",
    requests: 12,
    unmet: ["answer-success"],
    judged: 6,
    passed: 2,
    why: "The count of finished requests comes first. Twelve is under 20, so the loop waits, and it reads nothing else. The failing objective and the low pass rate both wait for more traffic.",
  },
  {
    id: "k2",
    requests: 40,
    unmet: [],
    judged: 4,
    passed: 4,
    why: "No objective fails, but only 4 answers were judged, one under the floor of 5. With so few, even a bad pass rate could not roll the canary back. The loop waits for more sampled answers.",
  },
  {
    id: "k3",
    requests: 25,
    unmet: ["answer-success"],
    judged: 12,
    passed: 11,
    why: "One unmet objective is enough. The pass rate of 0.92 is above 0.8, so the judge adds no reason. The only reason is the objective.",
  },
  {
    id: "k4",
    requests: 30,
    unmet: [],
    judged: 10,
    passed: 6,
    why: "Every objective holds, but the pass rate is 0.6 over 10 judged answers. That is below 0.8 with at least 5 judged, so the judge adds its reason, and the rule rolls back.",
  },
  {
    id: "k5",
    requests: 30,
    unmet: ["total-latency"],
    judged: 10,
    passed: 6,
    why: "Both rules fire. The unmet objective adds a reason that starts with slo, and the pass rate of 0.6 adds the judge. The decision lists both reasons.",
  },
  {
    id: "k6",
    requests: 30,
    unmet: [],
    judged: 15,
    passed: 12,
    why: "The pass rate is exactly 0.8, and only a rate below 0.8 counts against the canary. The requests clear 20, the judged answers clear 5 and no objective fails. So it promotes.",
  },
];

// The same rule as `judge_canary`, in the same order.
function decide(c: Canary): { outcome: Outcome; decision: string; reasons: string[] } {
  if (c.requests < MIN_REQUESTS) return { outcome: "wait-requests", decision: "wait", reasons: ["requests"] };
  const rate = c.judged > 0 ? c.passed / c.judged : null;
  const slo = c.unmet.map((n) => `slo:${n}`);
  const judge = rate !== null && c.judged >= MIN_VERDICTS && rate < MIN_PASS_RATE;
  const reasons = judge ? [...slo, "judge"] : slo;
  if (reasons.length > 0) {
    const outcome: Outcome = slo.length > 0 && judge ? "rollback-both" : slo.length > 0 ? "rollback-slo" : "rollback-judge";
    return { outcome, decision: "rollback", reasons };
  }
  if (c.judged < MIN_VERDICTS) return { outcome: "wait-verdicts", decision: "wait", reasons: ["verdicts"] };
  return { outcome: "promote", decision: "promote", reasons: [] };
}

type CardState = { pick?: Outcome; tries: number; done: boolean; first: boolean; miss: boolean };
const fresh = (): CardState => ({ tries: 0, done: false, first: false, miss: false });

function ticks(text: string) {
  return text.split("`").map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : <span key={i}>{part}</span>));
}

const rateOf = (c: Canary) => (c.judged > 0 ? (c.passed / c.judged).toFixed(2) : "none");

export default function Cloud07CanaryVerdict({ onComplete }: WidgetProps) {
  const [cards, setCards] = useState<Record<string, CardState>>(() => Object.fromEntries(CANARIES.map((c) => [c.id, fresh()])));
  const complete = useComplete(onComplete);

  const check = (c: Canary) => {
    const s = cards[c.id];
    const right = s.pick === decide(c).outcome;
    const next: CardState = right
      ? { ...s, tries: s.tries + 1, done: true, first: s.tries === 0, miss: false }
      : s.tries === 0
        ? { ...s, tries: 1, miss: true }
        : { ...s, tries: s.tries + 1, done: true, first: false, miss: false };
    const all = { ...cards, [c.id]: next };
    setCards(all);
    if (CANARIES.every((x) => all[x.id].done)) {
      const firsts = CANARIES.filter((x) => all[x.id].first).length;
      complete(`${firsts} of ${CANARIES.length} right at the first try`);
    }
  };

  const reset = () => setCards(Object.fromEntries(CANARIES.map((c) => [c.id, fresh()])));
  const finished = CANARIES.every((c) => cards[c.id].done);
  const firsts = CANARIES.filter((c) => cards[c.id].first).length;

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel cloud07-canary-verdict">
        <p className="cloud07-canary-verdict-note">Say what the loop does for each canary. All figures are invented.</p>
        <div className="w-stack">
          {CANARIES.map((c, i) => {
            const s = cards[c.id];
            const answer = decide(c);
            const right = s.done && s.pick === answer.outcome;
            const wrong = s.done && !right;
            return (
              <fieldset key={c.id} className={`cloud07-canary-verdict-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
                <legend className="cloud07-canary-verdict-legend">Canary {i + 1}</legend>
                <dl className="cloud07-canary-verdict-facts">
                  <div>
                    <dt>Finished requests</dt>
                    <dd>{c.requests}</dd>
                  </div>
                  <div>
                    <dt>SLOs not met</dt>
                    <dd>{c.unmet.length ? c.unmet.join(", ") : "none"}</dd>
                  </div>
                  <div>
                    <dt>Judged answers</dt>
                    <dd>{c.judged}</dd>
                  </div>
                  <div>
                    <dt>Passed</dt>
                    <dd>
                      {c.passed}, rate {rateOf(c)}
                    </dd>
                  </div>
                </dl>
                <div className="cloud07-canary-verdict-opts" role="radiogroup" aria-label={`Canary ${i + 1} outcome`}>
                  {OUTCOMES.map((o) => (
                    <label key={o.id} className={`cloud07-canary-verdict-opt${s.pick === o.id ? " on" : ""}`}>
                      <input
                        type="radio"
                        name={`cloud07-canary-verdict-${c.id}`}
                        value={o.id}
                        checked={s.pick === o.id}
                        disabled={s.done}
                        onChange={() => setCards((all) => ({ ...all, [c.id]: { ...all[c.id], pick: o.id, miss: false } }))}
                      />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
                {!s.done && (
                  <div className="w-row cloud07-canary-verdict-foot">
                    <button type="button" className="w-btn primary small" disabled={!s.pick} onClick={() => check(c)}>
                      Check this answer
                    </button>
                  </div>
                )}
                {s.miss && !s.done && (
                  <p className="cloud07-canary-verdict-why" role="status">
                    Not that one. Read the rule in order, then try once more.
                  </p>
                )}
                {s.done && (
                  <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="cloud07-canary-verdict-why" role="status">
                    {right ? (s.first ? "Right first time. " : "Right on the second try. ") : ""}
                    Decision: {answer.decision}. Reasons: {answer.reasons.length ? answer.reasons.join(", ") : "none"}. {ticks(c.why)}
                  </motion.p>
                )}
              </fieldset>
            );
          })}
        </div>
        {finished && (
          <>
            <div className={`w-verdict ${firsts >= 5 ? "good" : "bad"}`} role="status">
              You got {firsts} of {CANARIES.length} right at the first try. The order does the work: the request count, then the objectives and the pass rate, then the verdict floor.
            </div>
            <div className="w-row">
              <button type="button" className="w-btn ghost" onClick={reset}>
                Try again
              </button>
            </div>
          </>
        )}
      </div>
    </MotionConfig>
  );
}
