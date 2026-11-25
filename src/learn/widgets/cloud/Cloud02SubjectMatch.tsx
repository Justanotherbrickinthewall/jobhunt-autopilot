import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud02SubjectMatch.css";

// Five versions of the provider's attribute_condition in identity.tf. The learner says who gets a token from each.
// The first one is the real condition of the capstone. The others are the changes a teammate might make: widen it to
// the owner, match a prefix, add a branch, or leave it pointing at a repository that was renamed. The repository is
// the made-up owner/askpep, the same one chapter 1 uses.
// CHECK: the claim names repository_owner, ref and sub in GitHub's OIDC token, that ref stays refs/heads/main for a job
// in an environment, and that Google's attribute conditions accept startsWith. Read GitHub's OIDC reference and
// Google's attribute-condition page. Nothing here ran against a live provider.

type Option = { id: string; label: string };
type Token = { from: string; accepted: boolean };
type Case = {
  title: string;
  condition: string;
  story: string;
  answer: string;
  tokens: Token[];
  why: string;
};

const OPTIONS: Option[] = [
  { id: "a", label: "Only your repository, and every job in it" },
  { id: "b", label: "Your repository, and other repositories too" },
  { id: "c", label: "Your repository, but some of its own jobs are turned away" },
  { id: "d", label: "Nobody. Every token is refused" },
];

const CASES: Case[] = [
  {
    title: "Condition 1: the one in identity.tf",
    condition: "assertion.repository == 'owner/askpep'",
    story: "This is the condition the capstone sets, with your repository in place of owner/askpep.",
    answer: "a",
    tokens: [
      { from: "owner/askpep, a push to main", accepted: true },
      { from: "owner/askpep, a pull request from one of its branches", accepted: true },
      { from: "owner/askpep-sandbox, a push to main", accepted: false },
      { from: "mallory/askpep, a push to main", accepted: false },
    ],
    why: "The repository claim must equal the whole name. A longer name fails, and so does another owner. What this condition lets in, the grants then sort between the accounts.",
  },
  {
    title: "Condition 2: the owner only",
    condition: "assertion.repository_owner == 'owner'",
    story: "A teammate wants the pool to serve every repository the team owns, so nothing needs changing for a new one.",
    answer: "b",
    tokens: [
      { from: "owner/askpep, a push to main", accepted: true },
      { from: "owner/askpep-sandbox, a push to main", accepted: true },
      { from: "owner/scratch, a push to a branch", accepted: true },
      { from: "mallory/askpep, a push to main", accepted: false },
    ],
    why: "Every repository of the owner now gets a token. The grants still name owner/askpep, so those tokens act as nothing today. But the condition is the first lock, and the audit in chapter 1 rejects it as wrong_repo.",
  },
  {
    title: "Condition 3: a prefix of the subject",
    condition: "assertion.sub.startsWith('repo:owner/askpep')",
    story: "A teammate matches the start of the subject, so that branches, environments and pull requests all pass. The function startsWith tests the first characters of a string.",
    answer: "b",
    tokens: [
      { from: "owner/askpep, a push to main", accepted: true },
      { from: "owner/askpep-sandbox, a push to main", accepted: true },
      { from: "owner/askpep-v2, a push to main", accepted: true },
      { from: "mallory/askpep, a push to main", accepted: false },
    ],
    why: "The prefix ends at the name and has no colon after it. So repo:owner/askpep-sandbox starts with it too. Equality on the repository claim has no such gap, and the audit in chapter 1 rejects this condition as wrong_repo.",
  },
  {
    title: "Condition 4: the main branch only",
    condition: "assertion.repository == 'owner/askpep' && assertion.ref == 'refs/heads/main'",
    story: "A teammate adds the main branch to the lock, to be safe. The ref claim is the Git ref that started the job.",
    answer: "c",
    tokens: [
      { from: "owner/askpep, a push to main", accepted: true },
      { from: "owner/askpep, the deploy job in production, started by a push to main", accepted: true },
      { from: "owner/askpep, a pull request from one of its branches", accepted: false },
      { from: "mallory/askpep, a push to main", accepted: false },
    ],
    why: "A pull request job carries a ref that starts refs/pull/, so the provider refuses it. The plan job runs on pull requests, so it can no longer sign in. Keep the branch rule where chapter 6 puts it, on the GitHub environment.",
  },
  {
    title: "Condition 5: the real one, after a rename",
    condition: "assertion.repository == 'owner/askpep'",
    story: "Someone renames the repository to owner/askpep-app in GitHub. The variable github_repo still says owner/askpep.",
    answer: "d",
    tokens: [
      { from: "owner/askpep-app, a push to main", accepted: false },
      { from: "owner/askpep-app, a pull request from one of its branches", accepted: false },
      { from: "mallory/askpep, a push to main", accepted: false },
    ],
    why: "The repository claim holds the new name, so the old one matches nothing and every job fails to sign in. Set github_repo to the new name and apply. The deploy bindings name the repository too, so they change with the variable.",
  },
];

export default function Cloud02SubjectMatch({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const c = CASES[index];
  const right = pick === c.answer;

  const check = () => {
    if (pick === null) return;
    const n = attempts + 1;
    setAttempts(n);
    if (pick === c.answer || n >= 2) {
      setResolved(true);
      if (pick === c.answer && n === 1) setFirstTry((k) => k + 1);
    }
  };

  const next = () => {
    if (index + 1 < CASES.length) {
      setIndex(index + 1);
      setPick(null);
      setAttempts(0);
      setResolved(false);
    } else {
      setFinished(true);
      complete(`Predicted ${firstTry} of ${CASES.length} conditions on the first try`);
    }
  };

  const checked = attempts > 0;

  return (
    <div className="w-panel cloud02-subject-match">
      <div className="w-row between">
        <span className="w-label">{c.title}</span>
        <span className="cloud02-subject-match-count">
          {index + 1} of {CASES.length}
        </span>
      </div>

      <div className="cloud02-subject-match-bindings" role="note" aria-label="How to read a condition">
        <p>
          <strong>assertion</strong> is the token. Its claim <code>repository</code> is the repository name, <code>repository_owner</code> is the account that owns it,
          <code>sub</code> is the subject and <code>ref</code> is the Git ref that started the job.
        </p>
        <p>
          <strong>The provider</strong> checks the condition first. A token that fails gets no further, whatever the grants say.
        </p>
      </div>

      <div className="cloud02-subject-match-scene">
        <p>
          <code>{c.condition}</code>
        </p>
        <p>{c.story}</p>
      </div>

      <div className="cloud02-subject-match-group" role="radiogroup" aria-label="Your prediction">
        <span className="w-label">Predict: who gets a token from the provider?</span>
        <div className="cloud02-subject-match-opts">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={pick === o.id}
              className={`cloud02-subject-match-opt${pick === o.id ? " on" : ""}`}
              disabled={resolved}
              onClick={() => setPick(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-row">
        {!resolved && (
          <button type="button" className="w-btn primary" disabled={pick === null} onClick={check}>
            Check my prediction
          </button>
        )}
        {resolved && !finished && (
          <button type="button" className="w-btn ghost" onClick={next}>
            {index + 1 < CASES.length ? "Next condition" : "Finish"}
          </button>
        )}
      </div>

      {checked && !resolved && (
        <div className="w-verdict bad" role="status">
          Not quite. Test the condition against the claims of each kind of job, including a repository with a longer name.
        </div>
      )}

      {resolved && (
        <>
          <ul className="cloud02-subject-match-tokens" aria-label="What the provider does with each token">
            {c.tokens.map((t) => (
              <li key={t.from}>
                <span className={`w-chip ${t.accepted ? "good" : "warn"}`}>{t.accepted ? "Accepted" : "Refused"}</span> {t.from}
              </li>
            ))}
          </ul>
          <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
            <strong>{right ? "Correct. " : "Not quite. "}</strong>
            {c.why}
          </div>
        </>
      )}

      {finished && (
        <div className="w-verdict good" role="status">
          You predicted {firstTry} of {CASES.length} conditions on the first try. The rule: pin the whole repository name with equality. A wider match lets in
          repositories that aren't yours, and a narrower one turns away jobs that are.
        </div>
      )}
    </div>
  );
}
