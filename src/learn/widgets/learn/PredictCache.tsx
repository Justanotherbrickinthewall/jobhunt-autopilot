import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "./useComplete";
import "./PredictCache.css";

const CAP = 3;

type Option = { cache: string[]; why: string };
type Round = { ops: string[]; options: Option[] };

const ROUNDS: Round[] = [
  {
    ops: ["A", "B", "C", "A", "D"],
    options: [
      { cache: ["D", "C", "B"], why: "That is first in, first out. It forgets that the second request for A refreshed it." },
      { cache: ["D", "A", "C"], why: "Correct. A was used again, so B became the oldest and went." },
      { cache: ["D", "A", "B"], why: "That evicts C, the newest of the old keys. The cache evicts the key unused for longest, and that was B." },
    ],
  },
  {
    ops: ["A", "B", "C", "D", "A"],
    options: [
      { cache: ["A", "D", "B"], why: "That keeps B and drops C. The final request for A was a miss, so it evicted the oldest key, which was B." },
      { cache: ["D", "C", "B"], why: "That treats the last request for A as a hit. A was already evicted when D arrived." },
      { cache: ["A", "D", "C"], why: "Correct. D evicted A, then the miss on A evicted B." },
    ],
  },
  {
    ops: ["A", "B", "A", "C", "B", "D"],
    options: [
      { cache: ["D", "B", "C"], why: "Correct. Both hits refreshed their keys, so A was the oldest when D arrived." },
      { cache: ["D", "C", "B"], why: "That is first in, first out again. It ignores that B was used after C arrived." },
      { cache: ["D", "A", "B"], why: "That evicts C. A was last used before C arrived, so A is the one to go." },
    ],
  },
];

type Step = { op: string; hit: boolean; evicted: string | null; cache: string[] };

function simulate(ops: string[]): Step[] {
  let cache: string[] = [];
  return ops.map((op) => {
    const hit = cache.includes(op);
    let evicted: string | null = null;
    if (hit) {
      cache = [op, ...cache.filter((k) => k !== op)];
    } else {
      if (cache.length >= CAP) evicted = cache[cache.length - 1] ?? null;
      cache = [op, ...cache.slice(0, CAP - 1)];
    }
    return { op, hit, evicted, cache };
  });
}

type Result = { correct: boolean; sure: boolean };

export default function PredictCache({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const reduce = useReducedMotion();
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [locked, setLocked] = useState<"sure" | "guess" | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [step, setStep] = useState(0);
  const [replayKey, setReplayKey] = useState(0);
  const [verdict, setVerdict] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const cur = ROUNDS[round] as Round;
  const steps = useMemo(() => simulate(cur.ops), [cur]);
  const finalKey = (steps[steps.length - 1]?.cache ?? []).join("");
  const correctIdx = cur.options.findIndex((o) => o.cache.join("") === finalKey);

  useEffect(() => {
    if (!locked) return;
    if (reduce) {
      setStep(steps.length);
      return;
    }
    setStep(0);
    const id = window.setInterval(() => {
      setStep((s) => {
        if (s >= steps.length) {
          window.clearInterval(id);
          return s;
        }
        return s + 1;
      });
    }, 650);
    return () => window.clearInterval(id);
  }, [locked, reduce, steps.length, round, replayKey]);

  const shown = step === 0 ? [] : (steps[step - 1]?.cache ?? []);
  const current = step === 0 ? null : (steps[step - 1] ?? null);
  const lastRound = round === ROUNDS.length - 1;
  const pickedOpt = picked === null ? null : (cur.options[picked] ?? null);

  function lock(conf: "sure" | "guess") {
    if (picked === null || locked) return;
    setLocked(conf);
    setResults((r) => [...r, { correct: picked === correctIdx, sure: conf === "sure" }]);
  }

  function next() {
    setRound((r) => r + 1);
    setPicked(null);
    setLocked(null);
    setStep(0);
  }

  function judge() {
    const score = results.filter((r) => r.correct).length;
    const confidentWrong = results.filter((r) => !r.correct && r.sure).length;
    let text: string;
    let tone: "good" | "bad";
    if (score === 3) {
      tone = "good";
      text = "Three out of three, predicted before the reveal. Your model of this cache runs. The real test is doing the same on a system you have never seen.";
    } else if (score === 2) {
      tone = "good";
      text = "Two out of three. The miss points at one rule your model lacks. Name that rule now, because it is the most useful thing you learned here.";
    } else {
      tone = "bad";
      text = `${score} out of 3. You were probably recalling the definition of a cache instead of running one. Replay a round and trace each request by hand.`;
    }
    if (confidentWrong > 0) {
      text += ` You were sure and wrong ${confidentWrong} time${confidentWrong > 1 ? "s" : ""}. Those misses teach most, because they mark where your model is confidently broken.`;
    }
    setVerdict({ tone, text });
    complete(`${score}/3 predicted, ${confidentWrong} confident misses`);
  }

  return (
    <div className="w-panel predict-cache">
      <p className="predict-cache-lede">
        A cache holds {CAP} keys. When full, a miss evicts the key unused for longest. Keys are listed most recent first.
      </p>
      <div className="predict-cache-ops" aria-label="Requests in order">
        <span className="predict-cache-round">Round {round + 1} of {ROUNDS.length}</span>
        {cur.ops.map((op, i) => (
          <span
            key={i}
            className={"predict-cache-op" + (locked && step === i + 1 ? " is-now" : "") + (locked && step > i + 1 ? " is-done" : "")}
          >
            get {op}
          </span>
        ))}
      </div>

      <svg viewBox="0 0 232 96" className="predict-cache-svg" role="img" aria-label={`Cache contents: ${shown.length ? shown.join(", ") : "empty"}`}>
        {[0, 1, 2].map((i) => (
          <rect key={i} x={i * 76 + 2} y={24} width={68} height={52} rx={10} className="predict-cache-slot" />
        ))}
        <text x={36} y={16} textAnchor="middle" className="predict-cache-tag">most recent</text>
        <text x={2 * 76 + 36} y={91} textAnchor="middle" className="predict-cache-tag">next to go</text>
        <AnimatePresence>
          {shown.map((k, i) => (
            <motion.g
              key={k}
              initial={reduce ? false : { opacity: 0, y: -16, x: i * 76 }}
              animate={{ opacity: 1, y: 0, x: i * 76 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: reduce ? 0 : 0.25, ease: "easeOut" }}
            >
              <rect x={2} y={24} width={68} height={52} rx={10} className="predict-cache-key" />
              <text x={36} y={58} textAnchor="middle" className="predict-cache-keytext">{k}</text>
            </motion.g>
          ))}
        </AnimatePresence>
      </svg>

      {!locked && (
        <>
          <p className="predict-cache-q" id="predict-cache-q">What is in the cache after the last request?</p>
          <div className="predict-cache-options" role="radiogroup" aria-labelledby="predict-cache-q">
            {cur.options.map((o, i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={picked === i}
                className={"predict-cache-opt" + (picked === i ? " is-picked" : "")}
                onClick={() => setPicked(i)}
              >
                {o.cache.join("  ")}
              </button>
            ))}
          </div>
          <div className="w-row predict-cache-lock">
            <button type="button" className="w-btn primary" disabled={picked === null} onClick={() => lock("sure")}>
              Lock in: I am sure
            </button>
            <button type="button" className="w-btn ghost" disabled={picked === null} onClick={() => lock("guess")}>
              Lock in: it is a guess
            </button>
          </div>
        </>
      )}

      {locked && (
        <div className="predict-cache-reveal" aria-live="polite">
          <p className="predict-cache-trace">
            {current
              ? `get ${current.op}: ${current.hit ? "hit, refreshed" : "miss"}${current.evicted ? `, evicted ${current.evicted}` : ""}.`
              : "Tracing the requests."}
          </p>
          {step >= steps.length && pickedOpt && (
            <p className={"predict-cache-why " + (picked === correctIdx ? "is-right" : "is-wrong")}>
              {picked === correctIdx ? "You predicted it. " : "Not quite. "}
              {pickedOpt.why}
            </p>
          )}
          <div className="w-row">
            <button type="button" className="w-btn ghost" onClick={() => setReplayKey((k) => k + 1)}>
              Replay trace
            </button>
            {step >= steps.length && !lastRound && (
              <button type="button" className="w-btn primary" onClick={next}>Next round</button>
            )}
            {step >= steps.length && lastRound && !verdict && (
              <button type="button" className="w-btn primary" onClick={judge}>Judge my model</button>
            )}
          </div>
        </div>
      )}

      {verdict && (
        <div className={"w-verdict " + verdict.tone} role="status">{verdict.text}</div>
      )}
    </div>
  );
}
