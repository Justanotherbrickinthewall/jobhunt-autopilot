import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Evals07FailureCoder.css";

type Code =
  | "wrong_route"
  | "wrongly_refused"
  | "wrongly_answered"
  | "missed_retrieval"
  | "missed_source"
  | "wrong_args"
  | "wrong_path"
  | "unsupported_answer"
  | "attack_succeeded"
  | "other";

const CODES: Code[] = [
  "wrong_route",
  "wrongly_refused",
  "wrongly_answered",
  "missed_retrieval",
  "missed_source",
  "wrong_args",
  "wrong_path",
  "unsupported_answer",
  "attack_succeeded",
  "other",
];

type Failed = { name: string; reason: string };
type Run = { id: string; question: string; answerable: string; failed: Failed[]; code: Code; hint: string; why: string };

// The questions are real golden items. The failed scores and their reasons are made up for this exercise.
const RUNS: Run[] = [
  {
    id: "a01",
    question: "What is the maximum line length PEP 8 recommends for code?",
    answerable: "answerable",
    failed: [
      { name: "refusal", reason: "refused a question that has an answer" },
      { name: "citations", reason: "cites none of PEP 8" },
    ],
    code: "wrongly_refused",
    hint: "Two scores failed. Which of them comes first in PRIORITY?",
    why: "refusal comes before citations in PRIORITY, and this question has an answer. The desk refused it, so it cited nothing. The citation failure is a result of the refusal.",
  },
  {
    id: "q02",
    question: "How many spaces per indentation level does the Python style guide recommend?",
    answerable: "answerable",
    failed: [{ name: "recall@6", reason: "found 0.00 of the expected documents" }],
    code: "missed_retrieval",
    hint: "Which stage does the one failed score check?",
    why: "The search did not return PEP 8 in its first six results. recall@6 is the only score that failed, so the code is missed_retrieval.",
  },
  {
    id: "r02",
    question: "Why was the assignment expression added in PEP 572?",
    answerable: "answerable",
    failed: [{ name: "route", reason: "routed to code_advisor, expected researcher" }],
    code: "wrong_route",
    hint: "Read the reason. It names two routes.",
    why: "Triage chose the code advisor for a question about the reasons behind a PEP. The researcher should have taken it. The code is wrong_route.",
  },
  {
    id: "a14",
    question: "What does PEP 9999 propose?",
    answerable: "no answer exists",
    failed: [
      { name: "refusal", reason: "answered a question that has no answer" },
      { name: "citations", reason: "cites PEP 1, but the question has no answer" },
    ],
    code: "wrongly_answered",
    hint: "Check whether the question has an answer. refusal and citations both split on it.",
    why: "No PEP 9999 exists, so the desk should have refused. It answered and cited a source. Both failed scores give wrongly_answered for an unanswerable question.",
  },
  {
    id: "a04",
    question: "Which operator does PEP 572 add?",
    answerable: "answerable",
    failed: [{ name: "citations", reason: "cites none of PEP 572" }],
    code: "missed_source",
    hint: "The question has an answer, and only one score failed.",
    why: "The desk answered, so refusal passed. It cited none of the expected PEPs, so citations failed for an answerable question. That gives missed_source.",
  },
  {
    id: "t02",
    question: "Show me the Indentation section of PEP 8.",
    answerable: "answerable",
    failed: [
      { name: "tool_args", reason: "read_pep_section never ran" },
      { name: "trajectory", reason: "tools ['search_peps'] do not contain ['read_pep_section'] in order" },
    ],
    code: "wrong_args",
    hint: "Two scores failed. Which of them comes first in PRIORITY?",
    why: "tool_args comes before trajectory. The desk never ran the tool that reads a section, so both failed. The earliest failed score sets the code, which is wrong_args.",
  },
  {
    id: "t03",
    question: "Which Python version added the match statement?",
    answerable: "answerable",
    failed: [{ name: "trajectory", reason: "took 9 steps, the limit is 6" }],
    code: "wrong_path",
    hint: "The failed score checks the order of the tools and the step count.",
    why: "The tool arguments were right, but the run took 9 steps against a limit of 6. The path was wrong, so the code is wrong_path.",
  },
  {
    id: "a08",
    question: "What does PEP 703 propose for the global interpreter lock?",
    answerable: "answerable",
    failed: [{ name: "judge", reason: "the answer says the lock is removed for all builds, but the cited passage makes it optional" }],
    code: "unsupported_answer",
    hint: "The answer cites the right PEP. What does the judge say about the claim?",
    why: "The desk cited the right PEP and still said something the passage does not support. Only the judge caught it. The code is unsupported_answer.",
  },
];

type Phase = "pick" | "hint" | "done";

export default function Evals07FailureCoder({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState<Code | null>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const run = RUNS[idx];
  const check = () => {
    if (!pick) return;
    if (pick === run.code) {
      if (phase === "pick") setFirstTry((n) => n + 1);
      setPhase("done");
    } else if (phase === "pick") {
      setPhase("hint");
      setPick(null);
    } else {
      setPhase("done");
    }
  };
  const next = () => {
    if (idx === RUNS.length - 1) {
      setFinished(true);
      complete(`Coded ${firstTry} of 8 failed runs right first time; the first failed score in PRIORITY sets the code`);
      return;
    }
    setIdx(idx + 1);
    setPick(null);
    setPhase("pick");
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel evals07-failure-coder">
        <p className="w-label">Failed runs with made-up scores</p>
        {!finished && (
          <>
            <div className="w-row between">
              <span className="w-label" aria-live="polite">Run {idx + 1} of {RUNS.length}</span>
              <span className="w-mono">{run.id}</span>
            </div>
            <p className="evals07-failure-coder-question">{run.question} <em>({run.answerable})</em></p>
            <ul className="evals07-failure-coder-scores" aria-label="Failed scores">
              {run.failed.map((f) => (
                <li key={f.name}>
                  <span className="w-mono evals07-failure-coder-name">{f.name}</span>
                  <span>{f.reason}</span>
                </li>
              ))}
            </ul>
            <fieldset className="evals07-failure-coder-pick" disabled={phase === "done"}>
              <legend>Which code does code_failure give this run?</legend>
              <div className="w-row" role="radiogroup" aria-label="Failure code">
                {CODES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={pick === c}
                    className={`w-chip w-mono${pick === c ? " is-on" : ""}${phase === "done" && c === run.code ? " good" : ""}`}
                    onClick={() => setPick(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </fieldset>
            {phase !== "done" && (
              <button type="button" className="w-btn" disabled={!pick} onClick={check}>
                Check my code
              </button>
            )}
            {phase === "hint" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-verdict bad" role="status">
                That is not the code. {run.hint} You have one more try.
              </motion.div>
            )}
            {phase === "done" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-stack">
                <div className={`w-verdict ${pick === run.code ? "good" : "bad"}`} role="status">
                  {pick === run.code ? "Correct. " : `The code is ${run.code}. `}
                  {run.why}
                </div>
                <button type="button" className="w-btn" onClick={next}>
                  {idx === RUNS.length - 1 ? "See the result" : "Next run"}
                </button>
              </motion.div>
            )}
          </>
        )}
        {finished && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="w-verdict good" role="status">
            You coded {firstTry} of 8 right on the first try. Three runs failed two scores each, and each got one code. The first failed score in PRIORITY order set it. A table of these eight runs would show eight different codes with one run each, so the counts only mean something on a larger set.
          </motion.div>
        )}
      </div>
    </MotionConfig>
  );
}
