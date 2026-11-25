import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud09ServiceMatcher.css";

type Matcher = { id: string; gcp: string; cloud: "Azure" | "AWS"; options: string[]; answer: number; why: string };

// CHECK: every correct name below was read on 22 October 2026 on learn.microsoft.com or docs.aws.amazon.com: ECS Express Mode and the App Runner closure, Key Vault references and the Key Vault Secrets User role, the IAM OIDC identity provider, Container Apps jobs and their triggers, pgvector on Aurora PostgreSQL (read on the Bedrock Knowledge Bases page), Prompt Shields and its off-by-default document attack detection in Foundry, Bedrock AgentCore Runtime, and Cost Management budgets. The wrong options are real service names written from memory. They were not read. Service names and preview status change, so reread the pages before release.
const CASES: Matcher[] = [
  {
    id: "m1",
    gcp: "The Cloud Run service `askpep`, which runs the API image and scales between 0 and 3 instances.",
    cloud: "AWS",
    options: ["AWS App Runner", "Amazon ECS Express Mode", "Amazon ECR"],
    answer: 1,
    why: "AWS App Runner is closed to new customers, and AWS points new work to ECS Express Mode. It runs your image on Fargate behind a load balancer. Amazon ECR only stores images.",
  },
  {
    id: "m2",
    gcp: "Secret Manager, whose six secrets reach the service as environment variables.",
    cloud: "Azure",
    options: ["Azure Monitor", "Azure Key Vault", "Azure Container Registry"],
    answer: 1,
    why: "Container Apps can reference a Key Vault secret through a managed identity. That identity needs the Key Vault Secrets User role, the way `askpep-run` holds the secret accessor role.",
  },
  {
    id: "m3",
    gcp: "Workload Identity Federation, where GitHub presents a token and `askpep-deploy` is impersonated.",
    cloud: "AWS",
    options: ["Amazon Cognito user pool", "AWS Secrets Manager", "IAM OIDC identity provider"],
    answer: 2,
    why: "You register GitHub's token issuer as an IAM OIDC identity provider. A role trust policy then pins the token's subject. The pin plays the part of the repository condition on `askpep-repo`.",
  },
  {
    id: "m4",
    gcp: "The Cloud Run job `askpep-ingest`, which runs once and exits.",
    cloud: "Azure",
    options: ["Container Apps job", "Container Apps revision label", "Azure Key Vault"],
    answer: 0,
    why: "A Container Apps job runs a container to the end. It starts on a manual, schedule or event trigger. A revision label names a revision for traffic, and a vault holds secrets.",
  },
  {
    id: "m5",
    gcp: "Cloud SQL for PostgreSQL 17, where migration 001 runs `CREATE EXTENSION IF NOT EXISTS vector`.",
    cloud: "AWS",
    options: ["Amazon SQS", "Amazon Aurora PostgreSQL", "AWS Budgets"],
    answer: 1,
    why: "Aurora PostgreSQL supports pgvector, and the statement is the same line as migration 001. Amazon RDS for PostgreSQL probably does too, but read its page before you say so.",
  },
  {
    id: "m6",
    gcp: "The Model Armor template that screens prompts and replies.",
    cloud: "Azure",
    options: ["Azure Container Registry", "Key Vault reference", "Prompt Shields in Azure AI Content Safety"],
    answer: 2,
    // CHECK: that document attack detection is off by default in Foundry. The default was read on learn.microsoft.com on 22 October 2026 and can change, so reread the Prompt Shields page before release.
    why: "Prompt Shields checks for user prompt attacks and for attacks hidden in documents you pass to the model. In Foundry, document attack detection is off by default, so a client may need you to switch it on.",
  },
  {
    id: "m7",
    gcp: "Agent Runtime, the managed host for an agent loop.",
    cloud: "AWS",
    options: ["Amazon Bedrock Guardrails", "Amazon Bedrock AgentCore Runtime", "AWS Budgets"],
    answer: 1,
    why: "AgentCore Runtime hosts agents built with frameworks such as LangGraph, with any model. Guardrails filters content and hosts nothing.",
  },
  {
    id: "m8",
    gcp: "The billing budget with a notification channel.",
    cloud: "Azure",
    options: ["Cost Management budget", "Managed identity", "Container Apps traffic weights"],
    answer: 0,
    why: "A Cost Management budget sends alerts. Microsoft says resources are not affected and spend does not stop. The same is true of the GCP budget.",
  },
];

export default function Cloud09ServiceMatcher({ onComplete }: WidgetProps) {
  // Per case: the options already tried, and whether the case is locked.
  const [tried, setTried] = useState<Record<string, number[]>>({});
  const [locked, setLocked] = useState<Record<string, number>>({});
  const complete = useComplete(onComplete);

  const done = Object.keys(locked).length;
  const firstTry = CASES.filter((c) => locked[c.id] === c.answer && (tried[c.id]?.length ?? 0) === 0).length;
  const solved = CASES.filter((c) => locked[c.id] === c.answer).length;

  const pick = (c: Matcher, k: number) => {
    if (locked[c.id] !== undefined) return;
    const before = tried[c.id] ?? [];
    // The first wrong pick disables that option and asks again. The second pick locks the case and shows why.
    if (k !== c.answer && before.length === 0) {
      setTried((t) => ({ ...t, [c.id]: [k] }));
      return;
    }
    const nextLocked = { ...locked, [c.id]: k };
    setLocked(nextLocked);
    if (Object.keys(nextLocked).length === CASES.length) {
      const hits = CASES.filter((x) => nextLocked[x.id] === x.answer).length;
      complete(`${hits} of ${CASES.length} names matched`);
    }
  };

  const reset = () => {
    setTried({});
    setLocked({});
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel cloud09-service-matcher">
        <p className="cloud09-service-matcher-note">Each card names a GCP piece of the AskPEP deploy. Pick the service that does the same job on the other cloud.</p>
        <div className="w-stack">
          {CASES.map((c, i) => {
            const lock = locked[c.id];
            const wrongFirst = tried[c.id]?.[0];
            return (
              <div key={c.id} className={`cloud09-service-matcher-card${lock !== undefined ? (lock === c.answer ? " right" : " wrong") : ""}`}>
                <p className="cloud09-service-matcher-tag">
                  Piece {i + 1} on {c.cloud}
                </p>
                <p className="cloud09-service-matcher-text">{c.gcp}</p>
                <div className="cloud09-service-matcher-opts" role="group" aria-label={`Piece ${i + 1} on ${c.cloud}`}>
                  {c.options.map((o, k) => {
                    const isLocked = lock !== undefined;
                    const cls =
                      "cloud09-service-matcher-opt" +
                      (isLocked && k === c.answer ? " is-right" : "") +
                      (isLocked && k === lock && k !== c.answer ? " is-wrong" : "") +
                      (!isLocked && k === wrongFirst ? " is-wrong" : "");
                    return (
                      <button key={o} type="button" className={cls} disabled={isLocked || k === wrongFirst} onClick={() => pick(c, k)}>
                        {o}
                      </button>
                    );
                  })}
                </div>
                {lock === undefined && wrongFirst !== undefined && (
                  <p className="cloud09-service-matcher-why" role="status">
                    Not that one. Pick again.
                  </p>
                )}
                {lock !== undefined && (
                  <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="cloud09-service-matcher-why" role="status">
                    {lock === c.answer ? "Right. " : `Better fit: ${c.options[c.answer]}. `}
                    {c.why}
                  </motion.p>
                )}
              </div>
            );
          })}
        </div>
        {done === CASES.length && (
          <div className={`w-verdict ${solved >= 6 ? "good" : "bad"}`} role="status">
            You matched {solved} of {CASES.length}, and {firstTry} on the first pick. The names change on every cloud. The job each service does stays the same, so name the job first and look the service up second.
          </div>
        )}
        {(done > 0 || Object.keys(tried).length > 0) && (
          <div className="w-row">
            <button type="button" className="w-btn ghost small" onClick={reset}>
              Try again
            </button>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
