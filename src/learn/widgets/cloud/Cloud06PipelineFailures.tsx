import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud06PipelineFailures.css";

type JobName = "test" | "eval-gate" | "build" | "deploy";
type JobState = "passed" | "failed" | "idle";
type Outcome = "nothing" | "image" | "red" | "green";

const JOBS: JobName[] = ["test", "eval-gate", "build", "deploy"];

const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: "nothing", label: "Nothing reached the project." },
  { id: "image", label: "Only an image reached the registry." },
  { id: "red", label: "The migration ran and a revision exists with no traffic. The run is red." },
  { id: "green", label: "The migration ran and a revision exists with no traffic. The run is green." },
];

type Case = {
  id: string;
  what: string;
  jobs: Record<JobName, { state: JobState; note?: string }>;
  answer: Outcome;
  why: string;
};

// Illustrative runs of the deploy.yml from this chapter. No figures, only states.
const CASES: Case[] = [
  {
    id: "c1",
    what: "A unit test fails in the test job.",
    jobs: {
      test: { state: "failed" },
      "eval-gate": { state: "idle" },
      build: { state: "idle" },
      deploy: { state: "idle" },
    },
    answer: "nothing",
    why: "The gate and the build both need the test job, so neither starts. Nothing reaches your project.",
  },
  {
    id: "c2",
    what: "The eval gate fails. One slice falls below its floor.",
    jobs: {
      test: { state: "passed" },
      "eval-gate": { state: "failed" },
      build: { state: "passed" },
      deploy: { state: "idle" },
    },
    answer: "image",
    why: "The build needs only the tests, so it ran beside the gate and pushed its image. The deploy needs the gate as well, so it never started. No migration ran and no revision exists.",
  },
  {
    id: "c3",
    what: "The build fails. The docker build step errors.",
    jobs: {
      test: { state: "passed" },
      "eval-gate": { state: "passed" },
      build: { state: "failed" },
      deploy: { state: "idle" },
    },
    answer: "nothing",
    why: "The push never ran, so no tagged image exists. The deploy needs the build, so it never started. The passing gate changes nothing.",
  },
  {
    id: "c4",
    what: "The smoke test fails. The tagged URL answers 500 on the health check.",
    jobs: {
      test: { state: "passed" },
      "eval-gate": { state: "passed" },
      build: { state: "passed" },
      deploy: { state: "failed" },
    },
    answer: "red",
    why: "The migration ran and the revision exists, but it takes no traffic, so no user sees it. The red run is the signal. Notice what the failure cannot undo. The migration is done, so every migration must keep the old revision working.",
  },
  {
    id: "c5",
    what: "You copied the if line from ci.yml onto both gate steps, and one secret is empty. Both steps skip.",
    jobs: {
      test: { state: "passed" },
      "eval-gate": { state: "passed", note: "both steps skipped" },
      build: { state: "passed" },
      deploy: { state: "passed" },
    },
    answer: "green",
    why: "GitHub counts a skipped step as a success, so the gate job is green and the deploy starts. The revision was graded by nobody, and nothing on screen says so. That is why the gate in deploy.yml has no if line.",
  },
];

const STATE_LABEL: Record<JobState, string> = { passed: "passed", failed: "failed", idle: "did not start" };
const STATE_CLASS: Record<JobState, string> = { passed: "good", failed: "bad", idle: "" };

export default function Cloud06PipelineFailures({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, Outcome | undefined>>({});
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);

  const answered = CASES.filter((c) => picks[c.id]).length;
  const hits = CASES.filter((c) => picks[c.id] === c.answer).length;

  const check = () => {
    setChecked(true);
    complete(`${hits} of ${CASES.length} predicted`);
  };
  const reset = () => {
    setPicks({});
    setChecked(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel cloud06-pipeline-failures">
        <p className="cloud06-pipeline-failures-note">
          Five runs of the four-job pipeline, each with one thing gone wrong. Pick what has reached your project when the run ends. Illustrative runs, with no figures.
        </p>
        <div className="w-stack">
          {CASES.map((c, i) => {
            const pick = picks[c.id];
            const right = checked && pick === c.answer;
            const wrong = checked && pick !== c.answer;
            return (
              <fieldset key={c.id} className={`cloud06-pipeline-failures-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
                <legend className="cloud06-pipeline-failures-legend">Run {i + 1}</legend>
                <p className="cloud06-pipeline-failures-what">{c.what}</p>
                <div className="cloud06-pipeline-failures-opts" role="radiogroup" aria-label={`Run ${i + 1} outcome`}>
                  {OUTCOMES.map((o) => (
                    <label key={o.id} className={`cloud06-pipeline-failures-opt${pick === o.id ? " on" : ""}`}>
                      <input
                        type="radio"
                        name={`cloud06-pipeline-failures-${c.id}`}
                        value={o.id}
                        checked={pick === o.id}
                        disabled={checked}
                        onChange={() => setPicks((p) => ({ ...p, [c.id]: o.id }))}
                      />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
                {checked && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} role="status">
                    <ul className="cloud06-pipeline-failures-jobs" aria-label={`Run ${i + 1} jobs`}>
                      {JOBS.map((j) => {
                        const job = c.jobs[j];
                        return (
                          <li key={j} className={`w-chip ${STATE_CLASS[job.state]}`}>
                            <span className="w-mono">{j}</span> {STATE_LABEL[job.state]}
                            {job.note ? `, ${job.note}` : ""}
                          </li>
                        );
                      })}
                    </ul>
                    <p className="cloud06-pipeline-failures-why">
                      {right ? "Matched. " : `Better fit: ${OUTCOMES.find((o) => o.id === c.answer)?.label} `}
                      {c.why}
                    </p>
                  </motion.div>
                )}
              </fieldset>
            );
          })}
        </div>
        <div className="w-row">
          {!checked ? (
            <button type="button" className="w-btn primary" disabled={answered < CASES.length} onClick={check}>
              Check my picks ({answered} of {CASES.length})
            </button>
          ) : (
            <button type="button" className="w-btn ghost" onClick={reset}>
              Try again
            </button>
          )}
        </div>
        {checked && (
          <div className={`w-verdict ${hits >= 4 ? "good" : "bad"}`} role="status">
            You matched {hits} of {CASES.length}. A red job stops every job that needs it. A skipped step stops nothing, so a green run can still hide a deploy that nobody graded.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
