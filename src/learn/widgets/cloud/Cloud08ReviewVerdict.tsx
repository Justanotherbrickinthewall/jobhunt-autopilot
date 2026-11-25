import { useId, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud08ReviewVerdict.css";

// Seven months and what `monthly_review` in capstone/src/askpep/review.py answers for each. The verdict is
// `over` when spend is above the budget, `watch` when spend is at least WATCH_AT (0.8) of it, `ok` otherwise.
// It ignores the projection. A budget of 0 or less raises ValueError, and a month with no request rows is `ok`.
// The figures are invented.

type Answer = "ok" | "watch" | "over" | "error";

const ANSWERS: { id: Answer; label: string }[] = [
  { id: "ok", label: "ok" },
  { id: "watch", label: "watch" },
  { id: "over", label: "over" },
  { id: "error", label: "ValueError" },
];

type Month = { id: string; budget: number; spend: number | null; projected: number | null; note?: string; answer: Answer; why: string };

const MONTHS: Month[] = [
  {
    id: "calm",
    budget: 50,
    spend: 31,
    projected: 33,
    answer: "ok",
    why: "31 is 62 percent of 50, which is under 80 percent.",
  },
  {
    id: "edge",
    budget: 50,
    spend: 40,
    projected: 42,
    answer: "watch",
    why: "40 is exactly 80 percent of 50. The rule is at least 80 percent, so the month is `watch`.",
  },
  {
    id: "equal",
    budget: 50,
    spend: 50,
    projected: 52,
    answer: "watch",
    why: "`over` means above the budget, and 50 is not above 50. It has used 100 percent, which is past 80, so the month is `watch`.",
  },
  {
    id: "spike",
    budget: 50,
    spend: 22,
    projected: 61,
    answer: "ok",
    why: "22 is 44 percent of 50. The verdict reads the spend and ignores the projection. The review prints 61 on its own line, and a person should read it.",
  },
  {
    id: "gone",
    budget: 50,
    spend: 50.4,
    projected: 50.4,
    answer: "over",
    why: "50.40 is above 50, so the month is `over`. The command exits 1.",
  },
  {
    id: "empty",
    budget: 50,
    spend: null,
    projected: null,
    note: "No request rows in the month.",
    answer: "ok",
    why: "With no request rows the function returns a review with 0 requests, 0.0 spend and the verdict `ok`.",
  },
  {
    id: "zero",
    budget: 0,
    spend: 12,
    projected: 12,
    answer: "error",
    why: "A budget of 0 or less raises `ValueError`, because the ratio of spend to budget has no meaning. The command prints the message and exits 2.",
  },
];

function dollars(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function Cloud08ReviewVerdict({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const baseId = useId();
  const [picks, setPicks] = useState<Record<string, Answer | "">>({});
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);

  const allPicked = MONTHS.every((m) => picks[m.id]);
  const rightCount = MONTHS.filter((m) => picks[m.id] === m.answer).length;
  const showMarks = attempts > 0;

  const check = () => {
    if (!allPicked) return;
    const k = attempts + 1;
    setAttempts(k);
    const right = MONTHS.every((m) => picks[m.id] === m.answer);
    if (right || k >= 2) {
      setResolved(true);
      complete(
        right && k === 1
          ? "Predicted all seven verdicts on the first try"
          : right
            ? "Predicted all seven verdicts on the second try"
            : "Needed the explanations to predict the seven verdicts",
      );
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel cloud08-review-verdict">
        <div className="w-row between">
          <span className="w-label">Seven months, invented figures in dollars</span>
          <span className="cloud08-review-verdict-count">{showMarks ? `${rightCount} of ${MONTHS.length} right` : "Predict first"}</span>
        </div>

        <ol className="cloud08-review-verdict-list">
          {MONTHS.map((month, i) => {
            const pick = picks[month.id] ?? "";
            const right = pick === month.answer;
            const selectId = `${baseId}-${month.id}`;
            return (
              <li
                key={month.id}
                className={`cloud08-review-verdict-card${showMarks && pick ? (right ? " right" : resolved ? " wrong" : " retry") : ""}`}
              >
                <div className="cloud08-review-verdict-what">
                  <span className="cloud08-review-verdict-n">{i + 1}</span>
                  <label htmlFor={selectId}>
                    {month.spend === null ? (
                      <>
                        Budget {dollars(month.budget)}. {month.note}
                      </>
                    ) : (
                      <>
                        Budget {dollars(month.budget)}. Spend so far {dollars(month.spend)}. Projected for the next 30 days {dollars(month.projected ?? month.spend)}.
                      </>
                    )}
                  </label>
                </div>
                <select
                  id={selectId}
                  className="cloud08-review-verdict-select"
                  value={pick}
                  disabled={resolved}
                  onChange={(e) => setPicks((p) => ({ ...p, [month.id]: e.target.value as Answer }))}
                >
                  <option value="">Choose the answer</option>
                  {ANSWERS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
                {showMarks && pick && !resolved && <span className={`w-chip ${right ? "good" : "warn"}`}>{right ? "Right" : "Not yet"}</span>}
                {resolved && (
                  <motion.p className="cloud08-review-verdict-why" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                    <span className={`w-chip ${right ? "good" : "bad"}`}>{right ? "Right" : `Should be: ${ANSWERS.find((a) => a.id === month.answer)?.label}`}</span>{" "}
                    {renderTicks(month.why)}
                  </motion.p>
                )}
              </li>
            );
          })}
        </ol>

        {!resolved && (
          <div className="w-row">
            <button type="button" className="w-btn primary" disabled={!allPicked} onClick={check}>
              Check my verdicts
            </button>
            {attempts > 0 && (
              <span className="cloud08-review-verdict-hint" role="status">
                {rightCount} of {MONTHS.length} are right. Change the ones marked Not yet.
              </span>
            )}
          </div>
        )}

        {resolved && (
          <div className={`w-verdict ${rightCount === MONTHS.length ? "good" : "bad"}`} role="status">
            <strong>{rightCount === MONTHS.length ? "Every verdict is right." : `${rightCount} of ${MONTHS.length} were right.`}</strong> The verdict compares spend with the budget and nothing else. The projection is a second number for a person, and a bad one beside an
            <code className="w-mono">ok</code> is the sign to look at the traffic.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}

// Turn `code` spans in the explanation into <code> elements.
function renderTicks(text: string) {
  return text.split("`").map((part, i) =>
    i % 2 === 1 ? (
      <code key={i} className="w-mono">
        {part}
      </code>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
