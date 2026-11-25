import { useId, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud01TrustSubject.css";

// Seven GitHub Actions jobs. The learner says which service accounts each one can act as.
// The trust rules come from capstone/infra/terraform/identity.tf: eval and plan accept the whole repository,
// and deploy accepts two single subjects, the main branch and the production environment.
// CHECK: GitHub's default subject forms (ref, environment, pull_request) and the rule that a job in an
// environment presents the environment and not the branch. Read the sub claim of a real token before relying on them.

type Outcome = "two" | "three" | "none";

const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: "two", label: "askpep-eval and askpep-plan only" },
  { id: "three", label: "All three: askpep-eval, askpep-plan and askpep-deploy" },
  { id: "none", label: "No account" },
];

type Job = { id: string; what: string; answer: Outcome; sub: string; why: string };

const JOBS: Job[] = [
  {
    id: "build",
    what: "The build job. It runs on a push to `main` and declares no environment.",
    answer: "three",
    sub: "repo:owner/askpep:ref:refs/heads/main",
    why: "The repository-wide set accepts it for eval and plan. Deploy has a single identity for exactly this subject.",
  },
  {
    id: "deploy",
    what: "The deploy job. It runs after a push to `main` and declares the environment `production`.",
    answer: "three",
    sub: "repo:owner/askpep:environment:production",
    why: "A job in an environment presents the environment, not the branch. Deploy has a single identity for this subject too.",
  },
  {
    id: "pr",
    what: "The eval gate on a pull request from the branch `fix-typo`. It declares no environment.",
    answer: "two",
    sub: "repo:owner/askpep:pull_request",
    why: "Neither single identity matches a pull request, so deploy refuses. The gate still needs eval, which is why eval keeps the repository-wide set.",
  },
  {
    id: "branch",
    what: "A test workflow that someone pushes on the branch `fix-typo`. It declares no environment.",
    answer: "two",
    sub: "repo:owner/askpep:ref:refs/heads/fix-typo",
    why: "The subject names the branch `fix-typo`. The set still accepts it for eval and plan, and no single identity of deploy matches it.",
  },
  {
    id: "ruled",
    what: "The same test workflow, edited on `fix-typo` to deploy in the environment `production`. The environment allows deployments from `main` only.",
    answer: "none",
    sub: "No token. GitHub stops the job first.",
    why: "The branch rule belongs to GitHub, so the job never starts and never asks Google for anything.",
  },
  {
    id: "unruled",
    what: "The same edited workflow, but the environment `production` has no branch rule.",
    answer: "three",
    sub: "repo:owner/askpep:environment:production",
    why: "The subject names the environment and not the branch, so Google can't tell this job from the real deploy. The branch rule keeps the second identity as narrow as the first.",
  },
  {
    id: "other",
    what: "A workflow in a different repository of the same owner, `owner/other`, on its `main` branch.",
    answer: "none",
    sub: "repo:owner/other:ref:refs/heads/main",
    why: "The provider's condition names `owner/askpep`. Google rejects the token before it reads any binding.",
  },
];

export default function Cloud01TrustSubject({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const baseId = useId();
  const [picks, setPicks] = useState<Record<string, Outcome | "">>({});
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);

  const allPicked = JOBS.every((j) => picks[j.id]);
  const rightCount = JOBS.filter((j) => picks[j.id] === j.answer).length;
  const showMarks = attempts > 0;

  const check = () => {
    if (!allPicked) return;
    const k = attempts + 1;
    setAttempts(k);
    const right = JOBS.every((j) => picks[j.id] === j.answer);
    if (right || k >= 2) {
      setResolved(true);
      complete(
        right && k === 1
          ? "Placed all seven jobs on the first try"
          : right
            ? "Placed all seven jobs on the second try"
            : "Needed the explanations to place the seven jobs",
      );
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel cloud01-trust-subject">
        <div className="w-row between">
          <span className="w-label">Seven jobs, three accounts</span>
          <span className="cloud01-trust-subject-count">{showMarks ? `${rightCount} of ${JOBS.length} right` : "Predict first"}</span>
        </div>

        <ol className="cloud01-trust-subject-list">
          {JOBS.map((job, i) => {
            const pick = picks[job.id] ?? "";
            const right = pick === job.answer;
            const groupId = `${baseId}-${job.id}`;
            return (
              <li key={job.id} className={`cloud01-trust-subject-card${showMarks && pick ? (right ? " right" : resolved ? " wrong" : " retry") : ""}`}>
                <div className="cloud01-trust-subject-what">
                  <span className="cloud01-trust-subject-n">{i + 1}</span>
                  <span id={groupId}>{renderTicks(job.what)}</span>
                </div>
                <div role="radiogroup" aria-labelledby={groupId} className="cloud01-trust-subject-opts">
                  {OUTCOMES.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={pick === o.id}
                      disabled={resolved}
                      className={`cloud01-trust-subject-opt${pick === o.id ? " on" : ""}${resolved && job.answer === o.id ? " right" : ""}`}
                      onClick={() => setPicks((p) => ({ ...p, [job.id]: o.id }))}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                {showMarks && pick && !resolved && <span className={`w-chip ${right ? "good" : "warn"}`}>{right ? "Right" : "Not yet"}</span>}
                {resolved && (
                  <motion.div className="cloud01-trust-subject-why" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                    <p>
                      <span className={`w-chip ${right ? "good" : "bad"}`}>{right ? "Right" : `Should be: ${OUTCOMES.find((o) => o.id === job.answer)?.label}`}</span>
                    </p>
                    <p>
                      The subject: <code className="w-mono cloud01-trust-subject-sub">{job.sub}</code>
                    </p>
                    <p>{renderTicks(job.why)}</p>
                  </motion.div>
                )}
              </li>
            );
          })}
        </ol>

        {!resolved && (
          <div className="w-row">
            <button type="button" className="w-btn primary" disabled={!allPicked} onClick={check}>
              Check my answers
            </button>
            {attempts > 0 && (
              <span className="cloud01-trust-subject-hint" role="status">
                {rightCount} of {JOBS.length} are right. Change the ones marked Not yet.
              </span>
            )}
          </div>
        )}

        {resolved && (
          <div className={`w-verdict ${rightCount === JOBS.length ? "good" : "bad"}`} role="status">
            <strong>{rightCount === JOBS.length ? "Every job is placed." : `${rightCount} of ${JOBS.length} were right.`}</strong> Deploy accepts two subjects, and only a job that presents
            one of them gets in. Eval and plan accept the whole repository, because they must run on pull requests.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}

// Turn `code` spans in the text into <code> elements.
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
