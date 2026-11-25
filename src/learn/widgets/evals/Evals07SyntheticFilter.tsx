import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Evals07SyntheticFilter.css";

type Call = "keep" | "drop";

type Entry = {
  shown: string;
  kind: string; // what the entry is, shown after the check
  byCode: Call; // what synthesise_cases does with it
  codeNote: string;
  right: Call; // the right call for a careful reader
  readerNote: string;
};

const ORIGINAL = "What is the maximum line length PEP 8 recommends for code?";

// Eight entries a model sent when asked for five rewordings of a01. They are made up for this exercise.
const ENTRIES: Entry[] = [
  {
    shown: "How long may a line of code be under PEP 8?",
    kind: "A fair rewording",
    byCode: "keep",
    codeNote: "Passes every filter. It becomes a01-s1.",
    right: "keep",
    readerNote: "It asks for the same limit, so the label 79 characters still holds.",
  },
  {
    shown: "WHAT IS THE MAXIMUM LINE LENGTH PEP 8 RECOMMENDS FOR CODE?",
    kind: "The original in capitals",
    byCode: "drop",
    codeNote: "It matches the item's own question once case is ignored.",
    right: "drop",
    readerNote: "It is the same question, so it adds nothing.",
  },
  {
    shown: "\"\"",
    kind: "A blank entry",
    byCode: "drop",
    codeNote: "It is blank.",
    right: "drop",
    readerNote: "There is no question to keep.",
  },
  {
    shown: "42",
    kind: "A number, not text",
    byCode: "drop",
    codeNote: "It is not text.",
    right: "drop",
    readerNote: "It is not a question.",
  },
  {
    shown: "What line length does PEP 8 allow for code?",
    kind: "A fair rewording",
    byCode: "keep",
    codeNote: "Passes every filter. It becomes a01-s2.",
    right: "keep",
    readerNote: "It asks for the same limit.",
  },
  {
    shown: "How long may a line of code be under PEP 8?",
    kind: "A repeat of entry 1",
    byCode: "drop",
    codeNote: "It repeats an earlier entry.",
    right: "drop",
    readerNote: "A second copy adds nothing.",
  },
  {
    shown: "What is the maximum line length PEP 8 recommends for docstrings?",
    kind: "A changed meaning",
    byCode: "keep",
    codeNote: "Passes every filter. It becomes a01-s3.",
    right: "drop",
    readerNote: "PEP 8 limits docstrings to 72 characters. The label 79 characters is wrong for this question.",
  },
  {
    shown: "Under PEP 8, what is the longest a line of code should be?",
    kind: "A fair rewording",
    byCode: "keep",
    codeNote: "Passes every filter. It becomes a01-s4.",
    right: "keep",
    readerNote: "It asks for the same limit.",
  },
];

export default function Evals07SyntheticFilter({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [calls, setCalls] = useState<(Call | null)[]>(ENTRIES.map(() => null));
  const [checked, setChecked] = useState(false);

  const ready = calls.every((c) => c !== null);
  const rightCount = calls.filter((c, i) => c === ENTRIES[i].right).length;
  const keptByCode = ENTRIES.filter((e) => e.byCode === "keep").length;

  const set = (i: number, c: Call) => setCalls((cur) => cur.map((x, j) => (j === i ? c : x)));
  const check = () => {
    setChecked(true);
    complete(`Made the right call on ${rightCount} of 8 entries; the code filters keep ${keptByCode} and only a reader catches the changed meaning`);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel evals07-synthetic-filter">
        <p className="w-label">Eight made-up entries for item a01</p>
        <dl className="evals07-synthetic-filter-original">
          <div><dt>Original question</dt><dd>{ORIGINAL}</dd></div>
          <div><dt>Label</dt><dd className="w-mono">expected_docs [8], reference answer "79 characters."</dd></div>
        </dl>
        <ol className="evals07-synthetic-filter-list">
          {ENTRIES.map((e, i) => (
            <li key={i}>
              <div className="evals07-synthetic-filter-row">
                <span className="w-mono evals07-synthetic-filter-text">{i + 1}. {e.shown}</span>
                <div className="w-row" role="radiogroup" aria-label={`Entry ${i + 1}`}>
                  {(["keep", "drop"] as Call[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={calls[i] === c}
                      disabled={checked}
                      className={`w-chip${calls[i] === c ? " is-on" : ""}`}
                      onClick={() => set(i, c)}
                    >
                      {c === "keep" ? "Keep" : "Drop"}
                    </button>
                  ))}
                </div>
              </div>
              {checked && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="evals07-synthetic-filter-result">
                  <span className={`w-chip ${calls[i] === e.right ? "good" : "bad"}`}>
                    {calls[i] === e.right ? "Your call is right" : `A reader would ${e.right}`}
                  </span>
                  <span>
                    {e.kind}. Code filters: {e.byCode}. {e.codeNote} {e.readerNote}
                  </span>
                </motion.div>
              )}
            </li>
          ))}
        </ol>
        {!checked && (
          <button type="button" className="w-btn" disabled={!ready} onClick={check}>
            Check my calls
          </button>
        )}
        {checked && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="w-verdict good" role="status">
            You made the right call on {rightCount} of 8. The code filters keep {keptByCode} entries and drop {ENTRIES.length - keptByCode}. Entry 7 gets through because every filter checks the form of a question, and none checks its meaning. It would enter the set with the label 79 characters and a correct answer of 72. Only a person reading the kept items catches it.
          </motion.div>
        )}
      </div>
    </MotionConfig>
  );
}
