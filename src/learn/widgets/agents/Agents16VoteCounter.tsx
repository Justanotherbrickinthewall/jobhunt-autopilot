import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents16VoteCounter.css";

type Case = { question: string; raw: string[]; options: string[]; answer: number; why: string };

const CASES: Case[] = [
  {
    question: "Which Python version added f-strings?",
    raw: ["3.6", "Python 3.6", "version 3.6", "3.7", "3.6."],
    options: ["3.6 wins, four votes to one", "3.7 wins", "A tie"],
    answer: 0,
    why: "Normalising keeps the first number with a dot. All four 3.6 forms collapse to one string, so 3.6 gets four votes.",
  },
  {
    question: "Which Python version added the walrus operator?",
    raw: ["3.8", "3.9", "Python 3.9", "3.8"],
    options: ["3.8 wins outright", "3.9 wins outright", "A tie, and the first answer seen (3.8) wins"],
    answer: 2,
    why: "Two votes each. A majority rule has nothing to say, so code needs a tie-break. The first answer seen is arbitrary but repeatable.",
  },
  {
    question: "Which Python version added the match statement?",
    raw: ["3.10", "3.1", "Python 3.10", "3.10", "3.10"],
    options: ["3.10, four votes to one", "3.1, because it sorts first", "A tie"],
    answer: 0,
    why: "Compare versions as strings, never as numbers. 3.10 and 3.1 are different versions, and the string keeps them apart.",
  },
  {
    question: "Why was the walrus operator debated so bitterly?",
    raw: [
      "The syntax looked like a typo-prone assignment.",
      "People feared harder-to-read code.",
      "It broke the one obvious way rule.",
      "The naming of the operator caused rows.",
      "Core developers disagreed about scope.",
    ],
    options: ["The first sentence wins", "Nothing is countable: every answer is different", "A tie"],
    answer: 1,
    why: "Five sentences, five different strings. A vote needs answers that can be equal. Open prose has no such form, so a critic or a debate judge must read it.",
  },
];

export default function Agents16VoteCounter({ onComplete }: WidgetProps) {
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const complete = useComplete(onComplete);
  const c = CASES[idx];
  const right = checked && pick === c.answer;

  function check() {
    setChecked(true);
    if (pick === c.answer) setScore((s) => s + 1);
  }
  function next() {
    if (idx + 1 === CASES.length) {
      setDone(true);
      complete(`${score} of ${CASES.length} counted correctly`);
      return;
    }
    setIdx(idx + 1);
    setPick(null);
    setChecked(false);
  }
  function again() {
    setIdx(0);
    setPick(null);
    setChecked(false);
    setScore(0);
    setDone(false);
  }

  if (done) {
    return (
      <div className="w-panel agents16-vote-counter">
        <div className={`w-verdict ${score >= 3 ? "good" : "bad"}`} role="status">
          You counted {score} of {CASES.length}. A vote works when answers can be made equal. Normalise first, break ties with a written rule, and do not vote on prose.
        </div>
        <div className="w-row">
          <button type="button" className="w-btn ghost" onClick={again}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-panel agents16-vote-counter">
      <p className="agents16-vote-counter-note">
        Case {idx + 1} of {CASES.length}. Five or four voters answered the same question. Predict the outcome of normalising and counting, then check.
      </p>
      <p className="agents16-vote-counter-q">{c.question}</p>
      <ol className="agents16-vote-counter-raw" aria-label="Raw answers">
        {c.raw.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ol>
      <div className="w-stack" role="radiogroup" aria-label="Predicted outcome">
        {c.options.map((o, i) => (
          <label key={o} className={`agents16-vote-counter-opt${pick === i ? " on" : ""}`}>
            <input type="radio" name="agents16-vote-counter" checked={pick === i} disabled={checked} onChange={() => setPick(i)} />
            <span>{o}</span>
          </label>
        ))}
      </div>
      {checked && (
        <p className={`agents16-vote-counter-why ${right ? "right" : "wrong"}`} role="status">
          {right ? "Matched. " : `Better fit: ${c.options[c.answer]}. `}
          {c.why}
        </p>
      )}
      <div className="w-row">
        {!checked ? (
          <button type="button" className="w-btn primary" disabled={pick === null} onClick={check}>
            Check
          </button>
        ) : (
          <button type="button" className="w-btn primary" onClick={next}>
            {idx + 1 === CASES.length ? "See result" : "Next case"}
          </button>
        )}
      </div>
    </div>
  );
}
