import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Guardrails06ExpiryClock.css";

// Illustrative times, in minutes after the first request. Each request lasts 60 minutes, the default of APPROVAL_TIMEOUT_SECONDS (3600).
type Req = { id: string; title: string; made: number; expires: number; decidedAt?: number };

const REQUESTS: Req[] = [
  { id: "A", title: "Fix the PEP 572 page", made: 0, expires: 60 },
  { id: "B", title: "Link PEP 8 and PEP 20", made: 20, expires: 80 },
  { id: "C", title: "Add PEP 703 to the glossary", made: 30, expires: 90, decidedAt: 40 },
  { id: "D", title: "Fix the PEP 8 line-length text", made: 50, expires: 110 },
];

type Round = { now: number; explain: string; hint: string };

const ROUNDS: Round[] = [
  {
    now: 60,
    hint: "Request A expires at minute 60. Is a request expired at the exact minute of its expiry, or only after it?",
    explain:
      "The job resumes nothing. Request A expires at minute 60, and the job runs at minute 60. A request counts as expired only after its expiry has passed, so A is still in time.",
  },
  {
    now: 95,
    hint: "Compare the line with the end of each bar. Then look at who has already decided.",
    explain:
      "A and B are past their expiry and nobody decided them, so both get a timeout. C is past its expiry too, but Ada decided it at minute 40. Its newest audit row is a decision, so the job skips it. D has 15 minutes left.",
  },
  {
    now: 120,
    hint: "Three bars end before the line. One of them has a decision marker.",
    explain: "A, B and D are all past their expiry, so each gets a timeout. C stays skipped, because someone decided it.",
  },
];

const expired = (r: Req, now: number) => r.decidedAt === undefined && r.expires < now;
const answerFor = (round: Round) => REQUESTS.filter((r) => expired(r, round.now)).map((r) => r.id);
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

// Timeline geometry: 0 to 120 minutes across 440 units.
const X0 = 30;
const SCALE = 440 / 120;
const x = (min: number) => X0 + min * SCALE;

type Phase = "ask" | "retry" | "done";

export default function Guardrails06ExpiryClock({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [tries, setTries] = useState(0);
  const [phase, setPhase] = useState<Phase>("ask");
  const [lastRight, setLastRight] = useState(false);
  const [firstTime, setFirstTime] = useState(0);

  const round = ROUNDS[index];
  const answer = answerFor(round);
  const isLast = index === ROUNDS.length - 1;
  const showAnswer = phase === "done";

  const toggle = (id: string) => {
    if (phase === "done") return;
    if (phase === "retry") setPhase("ask");
    setPicked((p) => (p.includes(id) ? p.filter((q) => q !== id) : [...p, id]));
  };

  const check = () => {
    const right = same(picked, answer);
    const n = tries + 1;
    setTries(n);
    setLastRight(right);
    const firstNow = firstTime + (right && n === 1 ? 1 : 0);
    if (right && n === 1) setFirstTime(firstNow);
    if (right || n >= 2) {
      setPhase("done");
      if (isLast) complete(`${firstNow} of ${ROUNDS.length} rounds right first time`);
    } else {
      setPhase("retry");
    }
  };

  const next = () => {
    setIndex(index + 1);
    setPicked([]);
    setTries(0);
    setPhase("ask");
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel guardrails06-expiry-clock">
        <p className="guardrails06-expiry-clock-note">
          Four requests are on the desk. Ada has decided one of them, and the other three wait. The expire job runs once per round, at the minute shown by the dashed line. Each round starts from the same four requests.
          Tick the requests the job resumes with a timeout.
        </p>

        <svg
          className="guardrails06-expiry-clock-svg"
          viewBox="0 0 480 150"
          role="img"
          aria-label={`Four requests on a timeline from 0 to 120 minutes. The expire job runs at minute ${round.now}.`}
        >
          {[0, 30, 60, 90, 120].map((m) => (
            <g key={m}>
              <line x1={x(m)} y1={12} x2={x(m)} y2={128} className="guardrails06-expiry-clock-grid" />
              <text x={x(m)} y={144} textAnchor="middle" className="guardrails06-expiry-clock-tick">
                {m}
              </text>
            </g>
          ))}
          {REQUESTS.map((r, i) => {
            const y = 20 + i * 27;
            const isOut = showAnswer && answer.includes(r.id);
            return (
              <g key={r.id}>
                <text x={X0 - 12} y={y + 12} textAnchor="middle" className="guardrails06-expiry-clock-id">
                  {r.id}
                </text>
                <rect
                  x={x(r.made)}
                  y={y}
                  width={(r.expires - r.made) * SCALE}
                  height={16}
                  rx={4}
                  className={`guardrails06-expiry-clock-bar${r.decidedAt !== undefined ? " decided" : ""}${isOut ? " out" : ""}`}
                />
                {r.decidedAt !== undefined && <circle cx={x(r.decidedAt)} cy={y + 8} r={6} className="guardrails06-expiry-clock-mark" />}
              </g>
            );
          })}
          <line x1={x(round.now)} x2={x(round.now)} y1={6} y2={130} className="guardrails06-expiry-clock-now" />
        </svg>

        <p className="w-label" aria-live="polite">
          Round {index + 1} of {ROUNDS.length}. The job runs at minute {round.now}.
        </p>

        <fieldset className="guardrails06-expiry-clock-list" disabled={phase === "done"}>
          <legend className="w-label">Resume with a timeout</legend>
          {REQUESTS.map((r) => (
            <label key={r.id} className={`guardrails06-expiry-clock-row${picked.includes(r.id) ? " on" : ""}`}>
              <input type="checkbox" checked={picked.includes(r.id)} onChange={() => toggle(r.id)} />
              <span>
                <strong>
                  {r.id}. {r.title}
                </strong>
                <span className="guardrails06-expiry-clock-meta">
                  Made at minute {r.made}, expires at minute {r.expires}.{" "}
                  {r.decidedAt !== undefined ? `Ada approved it at minute ${r.decidedAt}.` : "Nobody has decided it."}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="w-row">
          {phase !== "done" && (
            <button type="button" className="w-btn primary" onClick={check}>
              Check this round
            </button>
          )}
          {phase === "done" && !isLast && (
            <button type="button" className="w-btn primary" onClick={next}>
              Next round
            </button>
          )}
        </div>

        {phase === "retry" && (
          <div className="w-verdict bad" role="status">
            <strong>Not quite.</strong> {round.hint}
          </div>
        )}
        {phase === "done" && (
          <motion.div
            className={`w-verdict ${lastRight ? "good" : "bad"}`}
            role="status"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <strong>{lastRight ? "Right." : `Not this time. The job resumes ${answer.length === 0 ? "nothing" : answer.join(", ")}.`}</strong> {round.explain}
          </motion.div>
        )}
        {phase === "done" && isLast && (
          <p className="guardrails06-expiry-clock-sum" role="status">
            {firstTime} of {ROUNDS.length} rounds right first time. The job skips a request that someone decided, and it waits until the expiry has passed.
          </p>
        )}
      </div>
    </MotionConfig>
  );
}
