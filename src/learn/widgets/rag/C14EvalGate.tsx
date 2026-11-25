import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { useOnce } from "./c1012shared";
import "./C14EvalGate.css";

// First-guess thresholds from the capstone. Nobody has tuned them against live providers.
const MIN_RECALL = 0.8;
const MIN_MRR = 0.5;
const ANSWERABLE = 20;

type Check = { id: string; label: string; ok: boolean; detail: string };

function runGate(recall: number, mrr: number): Check[] {
  const recallOk = recall >= MIN_RECALL;
  const mrrOk = mrr >= MIN_MRR;
  return [
    { id: "lint", label: "ruff check and format", ok: true, detail: "clean" },
    { id: "tests", label: "pytest", ok: true, detail: "321 passed" },
    { id: "recall", label: `recall at 6 at least ${MIN_RECALL}`, ok: recallOk, detail: recall.toFixed(2) },
    { id: "mrr", label: `MRR at least ${MIN_MRR}`, ok: mrrOk, detail: mrr.toFixed(2) },
  ];
}

export default function C14EvalGate({ onComplete }: WidgetProps) {
  const reduce = useReducedMotion();
  const complete = useOnce(onComplete);
  const [recall, setRecall] = useState(0.95);
  const [mrr, setMrr] = useState(0.83);
  const [guess, setGuess] = useState<"pass" | "fail" | null>(null);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [verdict, setVerdict] = useState<{ good: boolean; text: string } | null>(null);

  const lost = Math.round((1 - recall) * ANSWERABLE);

  function run() {
    if (!guess) return;
    const result = runGate(recall, mrr);
    const passed = result.every((c) => c.ok);
    setChecks(result);
    const right = (guess === "pass") === passed;
    const failing = result.filter((c) => !c.ok).map((c) => c.id);
    let text: string;
    if (passed) {
      text = right
        ? "Right. Both scores clear the gate, so the job exits 0 and the pull request can merge."
        : "It passed. Both scores clear their thresholds, so the job exits 0. Read the two numbers against 0.8 and 0.5 before you run.";
    } else {
      text = right
        ? `Right. ${failing.join(" and ")} fell under the gate, so the job exits 1 and the merge is blocked.`
        : `It failed. ${failing.join(" and ")} fell under the gate, so the job exits 1. A single dropped question moves recall by 0.05, which is enough to cross 0.8.`;
    }
    setVerdict({ good: right, text });
    complete(passed ? "Predicted a passing gate." : "Predicted a failing gate.");
  }

  function reset() {
    setChecks(null);
    setVerdict(null);
    setGuess(null);
  }

  return (
    <div className="w-panel c14eg-root">
      <p className="c14eg-lead">
        A pull request changes the chunker. Set the scores it produces on the golden set, predict the result, then run the gate. The
        thresholds are the capstone's first guesses, not tuned values.
      </p>

      <div className="c14eg-sliders">
        <div className="c14eg-row">
          <label htmlFor="c14eg-recall" className="c14eg-label">
            Recall at 6<span className="c14eg-val">{recall.toFixed(2)}</span>
          </label>
          <input
            id="c14eg-recall"
            type="range"
            min={0.5}
            max={1}
            step={0.05}
            value={recall}
            onChange={(e) => {
              setRecall(Number(e.target.value));
              setChecks(null);
              setVerdict(null);
            }}
          />
          <div className="c14eg-hint">That is {lost} of {ANSWERABLE} answerable questions missing a source. One question is 0.05.</div>
        </div>
        <div className="c14eg-row">
          <label htmlFor="c14eg-mrr" className="c14eg-label">
            Mean reciprocal rank<span className="c14eg-val">{mrr.toFixed(2)}</span>
          </label>
          <input
            id="c14eg-mrr"
            type="range"
            min={0.2}
            max={1}
            step={0.01}
            value={mrr}
            onChange={(e) => {
              setMrr(Number(e.target.value));
              setChecks(null);
              setVerdict(null);
            }}
          />
          <div className="c14eg-hint">An MRR of 0.50 is what you get when every first expected PEP sits at rank two.</div>
        </div>
      </div>

      <fieldset className="c14eg-guess">
        <legend>Predict the gate</legend>
        <div className="w-row c14eg-chips">
          {(["pass", "fail"] as const).map((g) => (
            <button
              key={g}
              type="button"
              className={"w-chip c14eg-chip" + (guess === g ? " is-on" : "")}
              aria-pressed={guess === g}
              onClick={() => {
                setGuess(g);
                setChecks(null);
                setVerdict(null);
              }}
            >
              {g === "pass" ? "It passes" : "It fails"}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="w-row">
        <button type="button" className="w-btn primary" disabled={!guess} onClick={run}>
          Run the CI job
        </button>
        <button type="button" className="w-btn ghost" onClick={reset}>
          Reset
        </button>
      </div>

      {checks && (
        <ol className="c14eg-list" aria-label="CI job steps">
          {checks.map((c, i) => (
            <motion.li
              key={c.id + c.detail}
              className={"c14eg-item " + (c.ok ? "ok" : "no")}
              initial={reduce ? false : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.22, ease: "easeOut", delay: i * 0.18 }}
            >
              <span className="c14eg-mark" aria-hidden="true">
                {c.ok ? "pass" : "fail"}
              </span>
              <span className="c14eg-name">{c.label}</span>
              <span className="c14eg-detail">{c.detail}</span>
            </motion.li>
          ))}
          <motion.li
            className={"c14eg-exit " + (checks.every((c) => c.ok) ? "ok" : "no")}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reduce ? { duration: 0 } : { duration: 0.22, delay: checks.length * 0.18 }}
          >
            exit code {checks.every((c) => c.ok) ? 0 : 1}
          </motion.li>
        </ol>
      )}

      {verdict && (
        <p className={"w-verdict " + (verdict.good ? "good" : "bad")} role="status">
          {verdict.text}
        </p>
      )}
    </div>
  );
}
