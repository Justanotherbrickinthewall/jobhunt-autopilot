import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud02PlanReader.css";

// Every plan below is sample output. It was written by hand to show the shape Terraform prints, and no plan was run.
// CHECK: the wording of plan lines, such as "must be replaced", "forces replacement" and "Cannot import non-existent
// remote object", comes from memory of Terraform 1.x. Compare each with a real plan on your own project.

type Option = { id: string; label: string };
type Case = {
  title: string;
  setup: string;
  plan: string;
  options: Option[];
  answer: string;
  outcome: string;
  why: string;
};

const CASES: Case[] = [
  {
    title: "Case 1: the registry you built by hand",
    setup:
      "You wrote registry.tf with a description. In course 1 you made the repository with no description. The first plan imports it and shows this.",
    plan: `# google_artifact_registry_repository.askpep will be updated in-place
# (imported from "projects/my-project/locations/europe-west3/repositories/askpep")
~ resource "google_artifact_registry_repository" "askpep" {
    ~ description = "" -> "AskPEP container images, tagged with the git commit."
      id          = "projects/my-project/locations/europe-west3/repositories/askpep"
      # (other attributes hidden)
  }`,
    options: [
      { id: "a", label: "Stop. The repository would be destroyed." },
      { id: "b", label: "Apply. It is an update in place, and the images stay." },
      { id: "c", label: "Stop. An import can't change a description." },
    ],
    answer: "b",
    outcome: "Apply is safe. One text field changes, and the repository and its images are untouched.",
    why: "A tilde marks an update in place. Your file sets a description that the hand-made repository lacked, and nothing else differs.",
  },
  {
    title: "Case 2: four secrets and a region",
    setup:
      "You are in chapter 4. Your secrets.tf asks for replication in one region and has no lifecycle block. The four secrets from course 1 are imported, and they use automatic replication.",
    plan: `# google_secret_manager_secret.askpep["voyage-api-key"] must be replaced
-/+ resource "google_secret_manager_secret" "askpep" {
      ~ id        = "projects/my-project/secrets/voyage-api-key" -> (known after apply)
        secret_id = "voyage-api-key"
        # (other attributes hidden)

      ~ replication { # forces replacement
          - auto {}
          + user_managed {
              + replicas {
                  + location = "europe-west3"
                }
            }
        }
    }`,
    options: [
      { id: "a", label: "Apply. A replace keeps the secret's value." },
      { id: "b", label: "Stop. A replace deletes the secret and its value. Add ignore_changes for replication, then plan again." },
      { id: "c", label: "Apply, then delete the import blocks." },
    ],
    answer: "b",
    outcome: "Stop. The apply would delete four secrets and every value in them. Some of those values may exist nowhere else.",
    why: "The words must be replaced and forces replacement say that replication can't change on a live secret. With ignore_changes set to replication, Terraform leaves the field alone, and each secret keeps its automatic replication.",
  },
  {
    title: "Case 3: an import for an account nobody made",
    setup:
      "You added an import block for askpep-tasks along with the other accounts. No earlier chapter made that account. The plan stops with this error.",
    plan: `Error: Cannot import non-existent remote object

While attempting to import an existing object to
google_service_account.askpep["askpep-tasks"], the provider
detected that no object exists with the given id.`,
    options: [
      { id: "a", label: "Make the account by hand with gcloud, then plan again." },
      { id: "b", label: "Delete that import block. Terraform creates the account on apply." },
      { id: "c", label: "Rename the account in the import block until the plan passes." },
    ],
    answer: "b",
    outcome: "Delete the import block. The next plan lists askpep-tasks as a create.",
    why: "An import adopts an object that already exists. The account askpep-tasks and the queue are new in this course, so Terraform makes them. Making the account by hand first only adds a step.",
  },
  {
    title: "Case 4: the lock on the provider changes",
    setup:
      "Course 4 made the provider with its condition written without spaces. Your file writes it with spaces. The plan shows this update, and your repository is owner/askpep.",
    plan: `# google_iam_workload_identity_pool_provider.askpep_repo will be updated in-place
~ resource "google_iam_workload_identity_pool_provider" "askpep_repo" {
    ~ attribute_condition = "assertion.repository=='owner/askpep'" -> "assertion.repository == 'owner/askpep'"
    ~ display_name        = "" -> "AskPEP repository"
      id                  = "projects/my-project/locations/global/workloadIdentityPools/github/providers/askpep-repo"
  }`,
    options: [
      { id: "a", label: "Stop. Any change to the condition is a break-in." },
      { id: "b", label: "Apply, after you check that the repository name is exactly yours." },
      { id: "c", label: "Apply. The condition is only a label." },
    ],
    answer: "b",
    outcome: "Apply after one check. The two conditions mean the same thing, and the update is in place.",
    why: "The condition is the lock, so read it as carefully as code. Here only spaces and a display name change. A different owner or repository in the new text would be the line to stop on.",
  },
];

function lineClass(line: string): string {
  const t = line.trimStart();
  if (t.startsWith("-/+")) return "replace";
  if (t.startsWith("+")) return "add";
  if (t.startsWith("~")) return "change";
  if (t.startsWith("-")) return "del";
  if (t.startsWith("Error:")) return "del";
  return "";
}

export default function Cloud02PlanReader({ onComplete }: WidgetProps) {
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
      complete(`Read ${firstTry} of ${CASES.length} plans correctly on the first try`);
    }
  };

  const checked = attempts > 0;

  return (
    <div className="w-panel cloud02-plan-reader">
      <div className="w-row between">
        <span className="w-label">{c.title}</span>
        <span className="cloud02-plan-reader-count">
          {index + 1} of {CASES.length}
        </span>
      </div>

      <p className="cloud02-plan-reader-setup">{c.setup}</p>

      <pre className="cloud02-plan-reader-plan" tabIndex={0} aria-label="Sample plan output">
        {c.plan.split("\n").map((line, i) => (
          <span key={i} className={`cloud02-plan-reader-line ${lineClass(line)}`}>
            {line}
            {"\n"}
          </span>
        ))}
      </pre>
      <p className="cloud02-plan-reader-key">
        Sample output, written to show the shape. It is not from a real run. A plus is a create, a tilde is an update in place, and a minus is a destroy.
      </p>

      <div className="cloud02-plan-reader-group" role="radiogroup" aria-label="Your decision">
        <span className="w-label">Predict: what do you do with this plan?</span>
        <div className="cloud02-plan-reader-opts">
          {c.options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={pick === o.id}
              className={`cloud02-plan-reader-opt${pick === o.id ? " on" : ""}`}
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
            Check my decision
          </button>
        )}
        {resolved && !finished && (
          <button type="button" className="w-btn ghost" onClick={next}>
            {index + 1 < CASES.length ? "Next plan" : "Finish"}
          </button>
        )}
      </div>

      {checked && !resolved && (
        <div className="w-verdict bad" role="status">
          Not quite. Look for a tilde, a replace line or an error, and ask what each would do to the real object.
        </div>
      )}

      {resolved && (
        <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
          <strong>{right ? "Correct. " : "Not quite. "}</strong>
          {c.outcome} {c.why}
        </div>
      )}

      {finished && (
        <div className="w-verdict good" role="status">
          You read {firstTry} of {CASES.length} plans correctly on the first try. The rule: never apply a plan that replaces something you can't rebuild.
        </div>
      )}
    </div>
  );
}
