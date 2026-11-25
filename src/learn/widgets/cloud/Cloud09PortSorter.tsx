import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud09PortSorter.css";

const OPTIONS = ["A rename", "More than a rename"] as const;

type Piece = { id: string; text: string; answer: 0 | 1; why: string };

// CHECK: the Azure and AWS claims in these explanations rest on pages read on 22 October 2026: the Container Apps event jobs through KEDA, Easy Auth and its tenant default, ALB authenticate-oidc and the x-amzn-oidc-data header, the azure.extensions allow-list, federated credentials and the IAM OIDC provider, and the budget pages for both clouds. Not read: Service Bus and Storage queue behaviour, SQS behaviour, ECS RunTask for one-off tasks, and the exact commands that change an environment variable on Container Apps and ECS. Reread before release.
const PIECES: Piece[] = [
  {
    id: "p1",
    text: "The Artifact Registry repository `askpep`, which stores the container image.",
    answer: 0,
    why: "A registry stores images on every cloud. You change the name and the login step, and the design stays.",
  },
  {
    id: "p2",
    text: "The Cloud Run job `askpep-ingest`, a container that runs to the end.",
    answer: 0,
    why: "Container Apps has jobs, and ECS can run a one-off task. You rewrite the start command and keep the design.",
  },
  {
    id: "p3",
    text: "The Cloud Tasks queue, which calls `POST /internal/tasks/agent` with an OIDC token.",
    answer: 1,
    why: "Cloud Tasks pushes an HTTP request at your service. Azure queues and SQS hold messages until a consumer pulls them, or until a scale rule starts one. The endpoint, the retries and the auth all change.",
  },
  {
    id: "p4",
    text: "Identity-Aware Proxy in front of the UI.",
    answer: 1,
    why: "IAP checks a Google identity before the request reaches Cloud Run. Azure uses Easy Auth against an Entra tenant. AWS uses the load balancer's OIDC action. The token your code verifies and the default trust boundary both differ.",
  },
  {
    id: "p5",
    text: "The `KILL_SWITCH` variable and the Cloud Run API patch that sets it.",
    answer: 1,
    why: "The design ports. The flag is read at start, and changing it means a new revision or deployment. The command does not port. You write and test a new one on the client's platform.",
  },
  {
    id: "p6",
    text: "Cloud SQL for PostgreSQL with the `vector` extension.",
    answer: 0,
    why: "It is Postgres on every cloud. Azure adds one step: allow-list `vector` in `azure.extensions` before `CREATE EXTENSION`. Aurora takes the same statement as migration 001.",
  },
  {
    id: "p7",
    text: "Workload Identity Federation, so GitHub deploys without a stored key.",
    answer: 0,
    why: "The idea is the same on all three clouds. GitHub presents a signed token and the cloud trades it for short-lived access. Azure calls it a federated credential, and AWS uses an IAM OIDC provider. Pin the subject on each.",
  },
  {
    id: "p8",
    text: "The billing budget with its alert emails.",
    answer: 0,
    why: "Every cloud's budget is an alert. None of them stops spend by itself. AWS budget actions can apply an IAM policy, but costs can continue after a notification.",
  },
];

export default function Cloud09PortSorter({ onComplete }: WidgetProps) {
  const [locked, setLocked] = useState<Record<string, number>>({});
  const complete = useComplete(onComplete);

  const done = Object.keys(locked).length;
  const hits = PIECES.filter((p) => locked[p.id] === p.answer).length;

  // With two options a wrong pick leaves only the right one, so the first pick locks the case and shows why.
  const pick = (p: Piece, k: number) => {
    if (locked[p.id] !== undefined) return;
    const next = { ...locked, [p.id]: k };
    setLocked(next);
    if (Object.keys(next).length === PIECES.length) {
      const score = PIECES.filter((x) => next[x.id] === x.answer).length;
      complete(`${score} of ${PIECES.length} pieces sorted`);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel cloud09-port-sorter">
        <p className="cloud09-port-sorter-note">
          Each card is a piece of the AskPEP deploy. Decide whether a client on Azure or AWS gets it by a rename, or needs more than that.
        </p>
        <div className="w-stack">
          {PIECES.map((p, i) => {
            const lock = locked[p.id];
            return (
              <div key={p.id} className={`cloud09-port-sorter-card${lock !== undefined ? (lock === p.answer ? " right" : " wrong") : ""}`}>
                <p className="cloud09-port-sorter-tag">Piece {i + 1}</p>
                <p className="cloud09-port-sorter-text">{p.text}</p>
                <div className="cloud09-port-sorter-opts" role="group" aria-label={`Piece ${i + 1}`}>
                  {OPTIONS.map((o, k) => {
                    const isLocked = lock !== undefined;
                    const cls =
                      "cloud09-port-sorter-opt" +
                      (isLocked && k === p.answer ? " is-right" : "") +
                      (isLocked && k === lock && k !== p.answer ? " is-wrong" : "");
                    return (
                      <button key={o} type="button" className={cls} disabled={isLocked} onClick={() => pick(p, k)}>
                        {o}
                      </button>
                    );
                  })}
                </div>
                {lock !== undefined && (
                  <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="cloud09-port-sorter-why" role="status">
                    {lock === p.answer ? "Right. " : `Better call: ${OPTIONS[p.answer]}. `}
                    {p.why}
                  </motion.p>
                )}
              </div>
            );
          })}
        </div>
        {done === PIECES.length && (
          <div className={`w-verdict ${hits >= 6 ? "good" : "bad"}`} role="status">
            You sorted {hits} of {PIECES.length} correctly. Five pieces port by a rename. Three need more: the queue, the user gate and the kill switch. Those three are where a client's questions will land.
          </div>
        )}
        {done > 0 && (
          <div className="w-row">
            <button type="button" className="w-btn ghost small" onClick={() => setLocked({})}>
              Try again
            </button>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
