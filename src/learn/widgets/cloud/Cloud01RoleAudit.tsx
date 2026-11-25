import { useId, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud01RoleAudit.css";

// Ten grants from a made-up project policy. The learner reads each one the way `audit_policy` does.
// The rules and their order come from capstone/src/askpep/identity.py. PROJECT_ID stands for the learner's project.

type Code = "none" | "public_member" | "primitive_role" | "unknown_account" | "outside_allow_list";

const CODES: { id: Code; label: string }[] = [
  { id: "none", label: "No finding" },
  { id: "public_member", label: "public_member" },
  { id: "primitive_role", label: "primitive_role" },
  { id: "unknown_account", label: "unknown_account" },
  { id: "outside_allow_list", label: "outside_allow_list" },
];

const ALLOW: { account: string; roles: string }[] = [
  { account: "askpep-run", roles: "aiplatform.user, cloudsql.client, cloudtrace.agent, logging.logWriter, modelarmor.user" },
  { account: "askpep-job", roles: "cloudsql.client, logging.logWriter" },
  { account: "askpep-eval", roles: "aiplatform.user" },
  { account: "askpep-canary", roles: "cloudsql.client, logging.viewer" },
];

const sa = (id: string) => `serviceAccount:${id}@PROJECT_ID.iam.gserviceaccount.com`;

type Grant = { id: string; role: string; member: string; answer: Code; why: string };

const GRANTS: Grant[] = [
  {
    id: "g1",
    role: "roles/cloudsql.client",
    member: sa("askpep-run"),
    answer: "none",
    why: "`askpep-run` is on the list, and `roles/cloudsql.client` is one of its five roles.",
  },
  {
    id: "g2",
    role: "roles/editor",
    member: sa("askpep-job"),
    answer: "primitive_role",
    why: "Editor is a primitive role. The audit reports it on any service account that you made, whatever the list says about that account.",
  },
  {
    id: "g3",
    role: "roles/run.invoker",
    member: "allUsers",
    answer: "public_member",
    why: "`allUsers` means anyone on the internet, and the first rule catches it with any role. On the project, this grant would open every Cloud Run service in it.",
  },
  {
    id: "g4",
    role: "roles/aiplatform.user",
    member: sa("askpep-scratch"),
    answer: "unknown_account",
    why: "`askpep-scratch` is not a key of the list. Someone made an account that nobody planned, and it can already call Vertex AI.",
  },
  {
    id: "g5",
    role: "roles/storage.admin",
    member: sa("askpep-run"),
    answer: "outside_allow_list",
    why: "`askpep-run` is known, but `roles/storage.admin` is not one of its five roles.",
  },
  {
    id: "g6",
    role: "roles/owner",
    member: "user:you@example.com",
    answer: "none",
    why: "The audit looks at service accounts and public members. A person who owns the project is not a finding.",
  },
  {
    id: "g7",
    role: "roles/editor",
    member: sa("askpep-scratch"),
    answer: "primitive_role",
    why: "A pair is reported once, under the first rule that matches it. The primitive rule comes before the unknown account rule.",
  },
  {
    id: "g8",
    role: "roles/run.developer",
    member: sa("askpep-canary"),
    answer: "outside_allow_list",
    why: "The canary account holds this role on the service `askpep` only. On the project it could redeploy any service in it.",
  },
  {
    id: "g9",
    role: "roles/aiplatform.user",
    member: sa("askpep-eval"),
    answer: "none",
    why: "`askpep-eval` has one role on the list, and this is it.",
  },
  {
    id: "g10",
    role: "roles/editor",
    member: "serviceAccount:123456789@cloudservices.gserviceaccount.com",
    answer: "none",
    why: "This is the Google APIs service agent. Google manages it and grants it Editor by default. The audit skips any member that ends in @cloudservices.gserviceaccount.com, so it is not a finding.",
  },
];

export default function Cloud01RoleAudit({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const baseId = useId();
  const [picks, setPicks] = useState<Record<string, Code | "">>({});
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);

  const allPicked = GRANTS.every((g) => picks[g.id]);
  const rightCount = GRANTS.filter((g) => picks[g.id] === g.answer).length;
  const showMarks = attempts > 0;

  const check = () => {
    if (!allPicked) return;
    const k = attempts + 1;
    setAttempts(k);
    const right = GRANTS.every((g) => picks[g.id] === g.answer);
    if (right || k >= 2) {
      setResolved(true);
      complete(
        right && k === 1
          ? "Read all ten grants correctly on the first try"
          : right
            ? "Read all ten grants correctly on the second try"
            : "Needed the explanations to read the ten grants",
      );
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel cloud01-role-audit">
        <div className="w-row between">
          <span className="w-label">Ten grants to read</span>
          <span className="cloud01-role-audit-count">{showMarks ? `${rightCount} of ${GRANTS.length} right` : "Predict first"}</span>
        </div>

        <dl className="cloud01-role-audit-allow" aria-label="The allow-list for the accounts below">
          {ALLOW.map((a) => (
            <div key={a.account} className="cloud01-role-audit-allow-row">
              <dt className="w-mono">{a.account}</dt>
              <dd className="w-mono">{a.roles}</dd>
            </div>
          ))}
        </dl>

        <ol className="cloud01-role-audit-list">
          {GRANTS.map((g, i) => {
            const pick = picks[g.id] ?? "";
            const right = pick === g.answer;
            const selectId = `${baseId}-${g.id}`;
            return (
              <li key={g.id} className={`cloud01-role-audit-card${showMarks && pick ? (right ? " right" : resolved ? " wrong" : " retry") : ""}`}>
                <div className="cloud01-role-audit-what">
                  <span className="cloud01-role-audit-n">{i + 1}</span>
                  <label htmlFor={selectId}>
                    <code className="w-mono cloud01-role-audit-role">{g.role}</code>
                    <span className="cloud01-role-audit-to">given to</span>
                    <code className="w-mono cloud01-role-audit-member">{g.member}</code>
                  </label>
                </div>
                <select
                  id={selectId}
                  className="cloud01-role-audit-select"
                  value={pick}
                  disabled={resolved}
                  onChange={(e) => setPicks((p) => ({ ...p, [g.id]: e.target.value as Code }))}
                >
                  <option value="">Choose a finding</option>
                  {CODES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {showMarks && pick && !resolved && <span className={`w-chip ${right ? "good" : "warn"}`}>{right ? "Right" : "Not yet"}</span>}
                {resolved && (
                  <motion.p className="cloud01-role-audit-why" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                    <span className={`w-chip ${right ? "good" : "bad"}`}>{right ? "Right" : `Should be: ${CODES.find((c) => c.id === g.answer)?.label}`}</span>{" "}
                    {renderTicks(g.why)}
                  </motion.p>
                )}
              </li>
            );
          })}
        </ol>

        {!resolved && (
          <div className="w-row">
            <button type="button" className="w-btn primary" disabled={!allPicked} onClick={check}>
              Check my reading
            </button>
            {attempts > 0 && (
              <span className="cloud01-role-audit-hint" role="status">
                {rightCount} of {GRANTS.length} are right. Change the ones marked Not yet.
              </span>
            )}
          </div>
        )}

        {resolved && (
          <div className={`w-verdict ${rightCount === GRANTS.length ? "good" : "bad"}`} role="status">
            <strong>{rightCount === GRANTS.length ? "Every grant is read correctly." : `${rightCount} of ${GRANTS.length} were right.`}</strong> Six of the ten grants are findings, and they break four rules. Four are fine. A list of allowed roles
            catches the grant that nobody planned, which a search for the word Editor never would.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}

// Turn `code` spans in the explanation into <code> elements.
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
