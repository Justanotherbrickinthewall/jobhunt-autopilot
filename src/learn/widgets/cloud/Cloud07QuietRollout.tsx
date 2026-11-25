import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud07QuietRollout.css";

type Outcome = "fast" | "slow" | "timeout";

const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: "fast", label: "Promoted in about 15 minutes" },
  { id: "slow", label: "Promoted, but later" },
  { id: "timeout", label: "Rolled back at 10 per cent" },
];

const TAG = "sha-3c4d5e6";

// One line the job prints after a wait: the share, the decision, the reasons and the request count.
type Wait = { percent: number; decision: "wait" | "promote"; requests: number };

type Quiet = { id: string; title: string; text: string; answer: Outcome; waits: Wait[]; end: string; why: string };

const six = (requests: number): Wait[] => Array.from({ length: 6 }, () => ({ percent: 10, decision: "wait", requests }));

const SCENARIOS: Quiet[] = [
  {
    id: "q1",
    title: "A project nobody uses",
    text: "Nobody uses the project, and nobody sends the canary anything.",
    answer: "timeout",
    waits: six(0),
    end: "rolled_back at 10% ['timeout']",
    why: "No request arrives, so every wait answers `wait` for `requests`. Six waits of five minutes make 30 minutes, and then the loop rolls back with the reason `timeout`. Nothing judged the canary bad. Nothing judged it at all.",
  },
  {
    id: "q2",
    title: "Questions to the tagged URL",
    text: "Three minutes into the rollout, you send 25 questions to the tagged URL.",
    answer: "fast",
    waits: [
      { percent: 10, decision: "promote", requests: 25 },
      { percent: 50, decision: "promote", requests: 25 },
      { percent: 100, decision: "promote", requests: 25 },
    ],
    end: "promoted at 100% []",
    why: "The 25 requests land inside the window and clear the floor of 20. About half are judged, which clears the floor of 5. Each step promotes at its first wait, so the rollout takes three soaks of five minutes.",
  },
  {
    id: "q3",
    title: "Questions to the service URL",
    text: "Three minutes in, you send 25 questions to the service URL. The canary has 10 per cent of the traffic, so about 3 of them reach it.",
    answer: "timeout",
    waits: six(3),
    end: "rolled_back at 10% ['timeout']",
    why: "About 3 requests reach the canary, far under 20. The count stays there, because the loop does not move to 50 per cent until the first step promotes. Send the questions to the tagged URL instead.",
  },
  {
    id: "q4",
    title: "Real users on the service URL",
    text: "Nobody sends the tagged URL anything. Real users send 15 requests a minute to the service URL.",
    answer: "slow",
    waits: [
      { percent: 10, decision: "wait", requests: 7 },
      { percent: 10, decision: "wait", requests: 15 },
      { percent: 10, decision: "promote", requests: 22 },
      { percent: 50, decision: "promote", requests: 59 },
      { percent: 100, decision: "promote", requests: 134 },
    ],
    end: "promoted at 100% []",
    why: "At 10 per cent the canary sees about 1.5 requests a minute. The count passes 20 at the third wait. The next two steps get more traffic and clear the floor at once. The rollout takes 25 minutes.",
  },
  {
    id: "q5",
    title: "Questions sent too early",
    text: "Ten minutes before you start the rollout you send 25 questions to the tagged URL. Then you start it and send nothing more.",
    answer: "timeout",
    waits: six(0),
    end: "rolled_back at 10% ['timeout']",
    why: "The job counts requests from one minute before it starts. Questions sent ten minutes earlier fall outside that window, so the canary has none. Send the questions after the job starts.",
  },
];

function ticks(text: string) {
  return text.split("`").map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : <span key={i}>{part}</span>));
}

type CardState = { pick?: Outcome; tries: number; done: boolean; first: boolean; miss: boolean };
const fresh = (): CardState => ({ tries: 0, done: false, first: false, miss: false });

export default function Cloud07QuietRollout({ onComplete }: WidgetProps) {
  const [cards, setCards] = useState<Record<string, CardState>>(() => Object.fromEntries(SCENARIOS.map((s) => [s.id, fresh()])));
  const complete = useComplete(onComplete);

  const check = (q: Quiet) => {
    const s = cards[q.id];
    const right = s.pick === q.answer;
    const next: CardState = right
      ? { ...s, tries: s.tries + 1, done: true, first: s.tries === 0, miss: false }
      : s.tries === 0
        ? { ...s, tries: 1, miss: true }
        : { ...s, tries: s.tries + 1, done: true, first: false, miss: false };
    const all = { ...cards, [q.id]: next };
    setCards(all);
    if (SCENARIOS.every((x) => all[x.id].done)) {
      const firsts = SCENARIOS.filter((x) => all[x.id].first).length;
      complete(`${firsts} of ${SCENARIOS.length} right at the first try`);
    }
  };

  const reset = () => setCards(Object.fromEntries(SCENARIOS.map((s) => [s.id, fresh()])));
  const finished = SCENARIOS.every((q) => cards[q.id].done);
  const firsts = SCENARIOS.filter((q) => cards[q.id].first).length;

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel cloud07-quiet-rollout">
        <p className="cloud07-quiet-rollout-note">
          Assume every request finishes, every objective holds, the judge passes what it scores and about half the answers are judged. Figures are invented.
        </p>
        <div className="w-stack">
          {SCENARIOS.map((q, i) => {
            const s = cards[q.id];
            const right = s.done && s.pick === q.answer;
            const wrong = s.done && !right;
            return (
              <fieldset key={q.id} className={`cloud07-quiet-rollout-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
                <legend className="cloud07-quiet-rollout-legend">
                  Situation {i + 1}: {q.title}
                </legend>
                <p className="cloud07-quiet-rollout-text">{q.text}</p>
                <div className="cloud07-quiet-rollout-opts" role="radiogroup" aria-label={`Situation ${i + 1} outcome`}>
                  {OUTCOMES.map((o) => (
                    <label key={o.id} className={`cloud07-quiet-rollout-opt${s.pick === o.id ? " on" : ""}`}>
                      <input
                        type="radio"
                        name={`cloud07-quiet-rollout-${q.id}`}
                        value={o.id}
                        checked={s.pick === o.id}
                        disabled={s.done}
                        onChange={() => setCards((all) => ({ ...all, [q.id]: { ...all[q.id], pick: o.id, miss: false } }))}
                      />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
                {!s.done && (
                  <div className="w-row cloud07-quiet-rollout-foot">
                    <button type="button" className="w-btn primary small" disabled={!s.pick} onClick={() => check(q)}>
                      Check this answer
                    </button>
                  </div>
                )}
                {s.miss && !s.done && (
                  <p className="cloud07-quiet-rollout-why" role="status">
                    Not that one. Ask how many requests the canary has at each wait, then try once more.
                  </p>
                )}
                {s.done && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} role="status">
                    <p className="cloud07-quiet-rollout-why">
                      {right ? (s.first ? "Right first time. " : "Right on the second try. ") : ""}
                      {ticks(q.why)}
                    </p>
                    <p className="cloud07-quiet-rollout-label">Sample log, invented</p>
                    <pre className="cloud07-quiet-rollout-log">
                      {q.waits.map((w) => `${TAG} at ${w.percent}%: ${w.decision} ${w.decision === "wait" ? "['requests']" : "[]"} (${w.requests} requests)`).join("\n")}
                      {"\n"}
                      {q.end}
                    </pre>
                  </motion.div>
                )}
              </fieldset>
            );
          })}
        </div>
        {finished && (
          <>
            <div className={`w-verdict ${firsts >= 4 ? "good" : "bad"}`} role="status">
              You got {firsts} of {SCENARIOS.length} right at the first try. A quiet canary reaches 20 requests only when you send them to the tagged URL after the job has started.
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
