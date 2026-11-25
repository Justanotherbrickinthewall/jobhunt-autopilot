import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud04SecretReference.css";

// The outcomes below are reasoned from secrets.tf, from the comments in capstone/DEPLOY.md and from the Terraform
// and Cloud Run docs. Nobody ran these changes against a project, and the card says so.
// CHECK: that Cloud Run refuses a revision when its service account lacks secretAccessor on a referenced secret,
// that it refuses one whose secret has no version, and that it resolves a latest reference when an instance starts.
// CHECK: that Terraform stores the secret_data of a google_secret_manager_secret_version in state even when the
// value is marked sensitive.

type Row = { env: string; secret: string; versions: number; reads: boolean };

type Case = {
  title: string;
  change: string;
  question: string;
  options: string[];
  answer: number;
  tweak: (rows: Row[]) => Row[];
  flag?: string; // the secret whose value the state file holds
  extra?: string; // a last row that appears once the case is revealed
  outcome: string;
  why: string;
};

const BASE: Row[] = [
  { env: "API_KEY", secret: "askpep-api-key", versions: 1, reads: true },
  { env: "PRINCIPALS", secret: "askpep-principals", versions: 1, reads: true },
  { env: "DATABASE_URL", secret: "askpep-database-url", versions: 1, reads: true },
  { env: "VOYAGE_API_KEY", secret: "voyage-api-key", versions: 1, reads: true },
  { env: "ANTHROPIC_API_KEY", secret: "anthropic-api-key", versions: 1, reads: true },
  { env: "LANGSMITH_API_KEY", secret: "langsmith-api-key", versions: 1, reads: true },
];

const edit = (secret: string, patch: Partial<Row>) => (rows: Row[]) =>
  rows.map((r) => (r.secret === secret ? { ...r, ...patch } : r));

const CASES: Case[] = [
  {
    title: "Case 1: one grant is missing",
    change:
      "You made all six secrets and added a version to each. The grant that lets `askpep-run` read `langsmith-api-key` was left out of the Terraform.",
    question: "What happens when Terraform deploys the revision?",
    options: [
      "The revision starts, and `LANGSMITH_API_KEY` is empty.",
      "The deploy fails with a permission error that names the secret.",
      "The revision starts, and Cloud Run asks the person who deployed for the value.",
    ],
    answer: 1,
    tweak: edit("langsmith-api-key", { reads: false }),
    outcome: "The deploy fails with a permission error that names `langsmith-api-key`.",
    why: "Cloud Run checks each reference when it makes the revision. The service account can't read that secret, so Cloud Run refuses the revision. Fix it with the grant, then deploy again.",
  },
  {
    title: "Case 2: a secret with no version",
    change: "Terraform made `askpep-principals`, and nobody added a value to it. The app's own default for `PRINCIPALS` is an empty object.",
    question: "What happens when Terraform deploys the revision?",
    options: [
      "The revision starts, and `PRINCIPALS` takes the app's default.",
      "The revision starts, and the first request that reads `PRINCIPALS` fails.",
      "The revision fails, because the reference has no version to resolve.",
    ],
    answer: 2,
    tweak: edit("askpep-principals", { versions: 0 }),
    outcome: "The revision fails.",
    why: "A reference has to resolve to a version. With none, Cloud Run can't make the revision, and the default in the app never gets a chance to apply. Add every value before the first apply that starts a revision.",
  },
  {
    title: "Case 3: a value written in Terraform",
    change:
      "A teammate adds a `google_secret_manager_secret_version` resource for `voyage-api-key`, with the key in its `secret_data` attribute. The value comes from a variable marked sensitive. They run `terraform apply`.",
    question: "Where does the value of `voyage-api-key` end up?",
    options: [
      "Only in Secret Manager, because Terraform hides sensitive values.",
      "In Secret Manager and in the Terraform state file, as plain text.",
      "In the plan output, and nowhere after the apply.",
    ],
    answer: 1,
    tweak: (rows) => rows,
    flag: "voyage-api-key",
    outcome: "The key sits in the state file as plain text.",
    why: "Marking a value sensitive hides it from the plan output. Terraform still stores it in state, and anyone who can read the state bucket can read the key. That is why the Terraform makes the secrets and never the versions.",
  },
  {
    title: "Case 4: a grant on the whole project",
    change: "To save writing six grants, you give `askpep-run` the role `secretAccessor` on the project instead of on each secret.",
    question: "What happens, and what does the grant allow?",
    options: [
      "The revision starts, and `askpep-run` can read every secret in the project, now and later.",
      "The revision fails, because the grant sits on the project and not on a secret.",
      "The revision starts, and Cloud Run reads only the six secrets it names.",
    ],
    answer: 0,
    tweak: (rows) => rows,
    extra: "Any secret added to the project later",
    outcome: "The revision starts.",
    why: "The grant works, so nothing fails. The cost is reach. `askpep-run` could read any secret in the project, including ones added later. The step 3 test rejects a grant on the project.",
  },
  {
    title: "Case 5: a new version of a key",
    change:
      "The service is running, and one instance is up. You add version 2 of `anthropic-api-key` with a new value, and you disable version 1. The reference says `latest`.",
    question: "Which value does the running instance use?",
    options: [
      "It switches to the new value at once, because `latest` follows the newest version.",
      "It fails, because version 1 is disabled.",
      "It keeps the old value. Instances that start later read the new one.",
    ],
    answer: 2,
    tweak: edit("anthropic-api-key", { versions: 2 }),
    outcome: "The running instance keeps the old value.",
    why: "Cloud Run resolves a reference when an instance starts, and it sets the variable once. Add the version, then deploy a new revision so that every instance restarts. Disable the old version after that.",
  },
];

// Text in backticks renders as code.
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} className="w-mono">
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}

function Table({ c, revealed }: { c: Case; revealed: boolean }) {
  const rows = c.tweak(BASE);
  return (
    <div className="cloud04-secret-reference-wrap">
      <table className="cloud04-secret-reference-table">
        <caption className="cloud04-secret-reference-caption">The six secrets, as this case leaves them</caption>
        <thead>
          <tr>
            <th scope="col">Variable</th>
            <th scope="col">Secret</th>
            <th scope="col">Versions</th>
            <th scope="col">askpep-run may read it</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const noVersion = revealed && r.versions === 0;
            const noRead = revealed && !r.reads;
            const leaked = revealed && c.flag === r.secret;
            return (
              <tr key={r.secret}>
                <td className="w-mono">{r.env}</td>
                <td className="w-mono">
                  {r.secret}
                  {leaked && <span className="cloud04-secret-reference-flag bad"> value in the state file</span>}
                </td>
                <td className={noVersion ? "cloud04-secret-reference-cell bad" : "cloud04-secret-reference-cell"}>{r.versions}</td>
                <td className={noRead ? "cloud04-secret-reference-cell bad" : "cloud04-secret-reference-cell"}>{r.reads ? "yes" : "no"}</td>
              </tr>
            );
          })}
          {revealed && c.extra && (
            <tr>
              <td colSpan={3}>{c.extra}</td>
              <td className="cloud04-secret-reference-cell bad">yes</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function Cloud04SecretReference({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
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
      complete(`Predicted ${firstTry} of ${CASES.length} cases on the first try`);
    }
  };

  return (
    <div className="w-panel cloud04-secret-reference">
      <div className="w-row between">
        <span className="w-label">{c.title}</span>
        <span className="cloud04-secret-reference-count">
          {index + 1} of {CASES.length}
        </span>
      </div>

      <div className="cloud04-secret-reference-scene">
        <p>
          <strong>The change.</strong> <Rich text={c.change} />
        </p>
      </div>

      <Table c={c} revealed={resolved} />

      <div className="cloud04-secret-reference-group" role="radiogroup" aria-label="Your prediction">
        <span className="w-label">Predict: {c.question}</span>
        <div className="cloud04-secret-reference-opts">
          {c.options.map((o, i) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={pick === i}
              className={`cloud04-secret-reference-opt${pick === i ? " on" : ""}`}
              disabled={resolved}
              onClick={() => setPick(i)}
            >
              <Rich text={o} />
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
            {index + 1 < CASES.length ? "Next case" : "Finish"}
          </button>
        )}
      </div>

      {attempts > 0 && !resolved && (
        <div className="w-verdict bad" role="status">
          Not quite. Ask what Cloud Run needs before it can make the revision, and what the value touches on the way.
        </div>
      )}

      {resolved && (
        <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
          <strong>{right ? "Correct. " : "Not quite. "}</strong>
          <Rich text={c.outcome} /> <Rich text={c.why} />
        </div>
      )}

      <p className="cloud04-secret-reference-note">
        These outcomes are reasoned from the Terraform and the Google docs. Nobody ran them against a project.
      </p>

      {finished && (
        <div className="w-verdict good" role="status">
          You predicted {firstTry} of {CASES.length} cases on the first try. The rule: a reference needs a version and a grant before the revision starts, and the value stays out of Terraform.
        </div>
      )}
    </div>
  );
}
