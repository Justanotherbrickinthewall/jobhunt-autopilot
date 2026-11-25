import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "./useComplete";
import "./FluencyTrap.css";

type Seg = { t: string; key?: boolean };
const PASSAGE: Seg[][] = [
  [
    { t: "HyperLogLog estimates how many distinct items a stream contains, using a few kilobytes however large the stream grows. It first hashes each item to a string of bits. " },
    { t: "The first few bits of that hash choose one of many registers.", key: true },
    { t: " The remaining bits are scanned for the position of the first 1 bit." },
  ],
  [
    { t: "Each register keeps a single number: " },
    { t: "the largest such position it has seen.", key: true },
    { t: " A hash that starts with a long run of zeros is rare, so " },
    { t: "seeing one hints that many distinct items have passed through.", key: true },
    { t: " A lone register is far too noisy, so " },
    { t: "the registers are combined with a harmonic mean and a correction constant.", key: true },
    { t: " " },
    { t: "Adding the same item twice changes nothing,", key: true },
    { t: " because the same hash lands in the same register with the same value." },
  ],
];

type Q = { q: string; options: string[]; answer: number };
const QUESTIONS: Q[] = [
  { q: "Which part of an item's hash picks its register?", options: ["The last few bits", "The first few bits", "The whole hash, modulo the register count"], answer: 1 },
  { q: "What does each register store?", options: ["A running count of items sent to it", "The smallest hash it has seen", "The largest first-1-bit position it has seen"], answer: 2 },
  { q: "What does a hash with a long run of leading zeros suggest?", options: ["The item is a duplicate", "Many distinct items have probably been seen", "The hash function is broken"], answer: 1 },
  { q: "How are the registers combined into one estimate?", options: ["Summed", "Harmonic mean with a correction constant", "The maximum register wins"], answer: 1 },
  { q: "What happens when you add the same item twice?", options: ["The estimate rises slightly", "The register resets", "Nothing changes"], answer: 2 },
];

type Phase = "read" | "rate1" | "reread" | "rate2" | "test" | "result";

export default function FluencyTrap({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("read");
  const [rate1, setRate1] = useState(3);
  const [rate2, setRate2] = useState(3);
  const [answers, setAnswers] = useState<(number | null)[]>(QUESTIONS.map(() => null));
  const [verdict, setVerdict] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const actual = answers.filter((a, i) => a === QUESTIONS[i]?.answer).length;
  const answered = answers.every((a) => a !== null);
  const showPassage = phase === "read" || phase === "reread";

  function finish() {
    const gap = rate2 - actual;
    const lift = rate2 - rate1;
    let tone: "good" | "bad";
    let text: string;
    if (gap >= 2) {
      tone = "bad";
      text = `You predicted ${rate2} and scored ${actual}. Rereading moved your confidence by ${lift >= 0 ? "+" : ""}${lift}, and it moved your memory by nothing it could measure. That gap is the illusion of fluency, and it will lie to you on every topic you only reread.`;
    } else if (gap <= -2) {
      tone = "good";
      text = `You predicted ${rate2} and scored ${actual}. You underrated yourself. Strange but useful: you know more than it feels like, so trust a test over your gut.`;
    } else {
      tone = "good";
      text = `You predicted ${rate2} and scored ${actual}. Your confidence was close. The material was probably easy to hold. The trap bites hardest on dense, unfamiliar material, so run this check there.`;
    }
    setVerdict({ tone, text });
    setPhase("result");
    complete(`predicted ${rate2}, scored ${actual}`);
  }

  const bars = [
    { label: "Confidence after first read", v: rate1, cls: "is-first" },
    { label: "Confidence after rereading", v: rate2, cls: "is-second" },
    { label: "Actual closed-book score", v: actual, cls: "is-actual" },
  ];

  return (
    <div className="w-panel fluency-trap">
      {showPassage && (
        <motion.div initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="fluency-trap-passage">
          {PASSAGE.map((para, i) => (
            <p key={i}>
              {para.map((s, j) =>
                s.key && phase === "reread" ? <mark key={j}>{s.t}</mark> : <span key={j}>{s.t}</span>,
              )}
            </p>
          ))}
        </motion.div>
      )}

      {phase === "read" && (
        <button type="button" className="w-btn primary" onClick={() => setPhase("rate1")}>I have read it</button>
      )}

      {(phase === "rate1" || phase === "rate2") && (
        <div className="fluency-trap-rate">
          <p className="fluency-trap-lede">
            {phase === "rate1"
              ? "The passage is hidden. A five-question test is coming, closed book. How many will you get right?"
              : "You have reread it with the key phrases marked. Same test, same five questions. How many now?"}
          </p>
          <label className="fluency-trap-slider">
            <span>My prediction: <strong>{phase === "rate1" ? rate1 : rate2} of 5</strong></span>
            <input
              type="range"
              min={0}
              max={5}
              step={1}
              value={phase === "rate1" ? rate1 : rate2}
              onChange={(e) => (phase === "rate1" ? setRate1(Number(e.target.value)) : setRate2(Number(e.target.value)))}
            />
          </label>
          <button
            type="button"
            className="w-btn primary"
            onClick={() => {
              if (phase === "rate1") {
                setRate2(rate1);
                setPhase("reread");
              } else {
                setPhase("test");
              }
            }}
          >
            {phase === "rate1" ? "Lock it in, then let me reread" : "Lock it in and test me"}
          </button>
        </div>
      )}

      {phase === "reread" && (
        <button type="button" className="w-btn primary" onClick={() => setPhase("rate2")}>Done rereading</button>
      )}

      {phase === "test" && (
        <div className="fluency-trap-test">
          {QUESTIONS.map((q, qi) => (
            <fieldset key={qi} className="fluency-trap-q">
              <legend>{qi + 1}. {q.q}</legend>
              {q.options.map((o, oi) => (
                <label key={oi} className={"fluency-trap-opt" + (answers[qi] === oi ? " is-picked" : "")}>
                  <input
                    type="radio"
                    name={`fluency-trap-q${qi}`}
                    checked={answers[qi] === oi}
                    onChange={() => setAnswers((a) => a.map((x, i) => (i === qi ? oi : x)))}
                  />
                  <span>{o}</span>
                </label>
              ))}
            </fieldset>
          ))}
          <button type="button" className="w-btn primary" disabled={!answered} onClick={finish}>Score me</button>
        </div>
      )}

      {phase === "result" && (
        <div className="fluency-trap-result">
          <svg viewBox="0 0 340 130" className="fluency-trap-svg" role="img" aria-label={`Confidence ${rate1}, then ${rate2}, actual score ${actual}, out of 5`}>
            {bars.map((b, i) => (
              <g key={b.label} transform={`translate(0 ${i * 40 + 4})`}>
                <text x={0} y={10} className="fluency-trap-lab">{b.label}</text>
                <rect x={0} y={16} width={300} height={14} rx={7} className="fluency-trap-track" />
                <motion.rect
                  x={0}
                  y={16}
                  height={14}
                  rx={7}
                  className={"fluency-trap-bar " + b.cls}
                  initial={reduce ? false : { width: 0 }}
                  animate={{ width: Math.max(b.v, 0.001) * 60 }}
                  transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : i * 0.25, ease: "easeOut" }}
                />
                <text x={308} y={28} className="fluency-trap-num">{b.v}/5</text>
              </g>
            ))}
          </svg>
          <ul className="fluency-trap-review">
            {QUESTIONS.map((q, i) => (
              <li key={i} className={answers[i] === q.answer ? "is-right" : "is-wrong"}>
                {answers[i] === q.answer ? "Right: " : `Missed (answer: ${q.options[q.answer]}): `}
                {q.q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {verdict && <div className={"w-verdict " + verdict.tone} role="status">{verdict.text}</div>}
    </div>
  );
}
