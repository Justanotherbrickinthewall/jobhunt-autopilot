import { useState } from "react";
import type { ReactNode } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud03TaskGrants.css";

// The three grants of tasks.tf. What each failure looks like comes from AskPEP's code (jobs_agent, run_job)
// and from Google's documented behaviour. Nobody ran it against a live project.

type Enqueuer = "queue" | "project" | "none";
type Outcome = "ok" | "no-enqueuer" | "no-actas" | "no-invoker";
type HopState = "pass" | "fail" | "skipped";

const OUTCOMES: Outcome[] = ["ok", "no-enqueuer", "no-actas", "no-invoker"];

const HOPS = [
  "The caller sends `POST /jobs/agent` to the service",
  "The service creates a task on the queue `askpep-agent`",
  "The queue calls `POST /internal/tasks/agent` as `askpep-tasks`",
  "The handler runs the desk",
];

function code(text: string): ReactNode[] {
  return text.split("`").map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : part));
}

function run(enqueuer: Enqueuer, actAs: boolean, invoker: boolean) {
  let outcome: Outcome = "ok";
  if (enqueuer === "none") outcome = "no-enqueuer";
  else if (!actAs) outcome = "no-actas";
  else if (!invoker) outcome = "no-invoker";

  const states: HopState[] =
    outcome === "no-enqueuer" || outcome === "no-actas"
      ? ["pass", "fail", "skipped", "skipped"]
      : outcome === "no-invoker"
        ? ["pass", "pass", "fail", "skipped"]
        : ["pass", "pass", "pass", "pass"];

  const says: Record<Outcome, string> = {
    ok: "The caller gets 202 and a thread id. A poll of `GET /agent/{thread_id}` returns the run once the desk finishes.",
    "no-enqueuer":
      "Cloud Tasks refuses the create call, so `jobs_agent` answers 502 with `The queue did not take the job.` The caller knows at once.",
    "no-actas":
      "Google refuses a task that carries a token for an account the service may not act as. The caller sees the same 502 as before.",
    "no-invoker":
      "The queue accepted the task, so the caller already holds its 202 and its thread id. Cloud Run refuses each call from the queue before the app sees it. The queue tries 3 times and gives up. The caller polls `GET /agent/{thread_id}` and gets 404 for ever, because no run left a checkpoint.",
  };

  const lesson: Record<Outcome, string> = {
    ok: "All three grants are in place, and each one is narrow.",
    "no-enqueuer": "The enqueuer grant is on the queue. It fails loudly, which is the better way to fail.",
    "no-actas": "The act-as grant is on `askpep-tasks`. It also fails loudly.",
    "no-invoker": "This one fails silently. Only a live check of the queue and the logs shows it.",
  };

  return { outcome, states, says: says[outcome], lesson: lesson[outcome] };
}

type Choice<T extends string> = { id: T; label: string };

function Radios<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
  help,
}: {
  name: string;
  legend: string;
  value: T;
  options: Choice<T>[];
  onChange: (v: T) => void;
  help: string;
}) {
  return (
    <fieldset className="cloud03-task-grants-card">
      <legend className="cloud03-task-grants-legend">{legend}</legend>
      <p className="cloud03-task-grants-help">{code(help)}</p>
      <div className="cloud03-task-grants-opts" role="radiogroup" aria-label={legend}>
        {options.map((o) => (
          <label key={o.id} className={`cloud03-task-grants-opt${value === o.id ? " on" : ""}`}>
            <input type="radio" name={name} value={o.id} checked={value === o.id} onChange={() => onChange(o.id)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function Cloud03TaskGrants({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [enqueuer, setEnqueuer] = useState<Enqueuer>("queue");
  const [actAs, setActAs] = useState(true);
  const [invoker, setInvoker] = useState(true);
  const [sent, setSent] = useState<ReturnType<typeof run> | null>(null);
  const [seen, setSeen] = useState<Outcome[]>([]);

  const clear = () => setSent(null);

  const send = () => {
    const r = run(enqueuer, actAs, invoker);
    setSent(r);
    const next = seen.includes(r.outcome) ? seen : [...seen, r.outcome];
    setSeen(next);
    if (OUTCOMES.every((o) => next.includes(o))) complete("Saw the working path and each missing grant fail");
  };

  const wide = sent?.outcome === "ok" && enqueuer === "project";

  return (
    <div className="w-panel cloud03-task-grants">
      <p className="cloud03-task-grants-note">Set the three grants, then send a job. Nobody ran this against a live project.</p>

      <div className="w-stack">
        <Radios<Enqueuer>
          name="cloud03-enqueuer"
          legend="Grant 1: enqueue"
          help="`askpep-run` holds `roles/cloudtasks.enqueuer`."
          value={enqueuer}
          options={[
            { id: "queue", label: "On the queue" },
            { id: "project", label: "On the project" },
            { id: "none", label: "Not granted" },
          ]}
          onChange={(v) => {
            setEnqueuer(v);
            clear();
          }}
        />
        <Radios<"yes" | "no">
          name="cloud03-actas"
          legend="Grant 2: act as"
          help="`askpep-run` holds `roles/iam.serviceAccountUser` on `askpep-tasks`."
          value={actAs ? "yes" : "no"}
          options={[
            { id: "yes", label: "Granted" },
            { id: "no", label: "Not granted" },
          ]}
          onChange={(v) => {
            setActAs(v === "yes");
            clear();
          }}
        />
        <Radios<"yes" | "no">
          name="cloud03-invoker"
          legend="Grant 3: invoke"
          help="`askpep-tasks` holds `roles/run.invoker` on the service `askpep`."
          value={invoker ? "yes" : "no"}
          options={[
            { id: "yes", label: "Granted" },
            { id: "no", label: "Not granted" },
          ]}
          onChange={(v) => {
            setInvoker(v === "yes");
            clear();
          }}
        />
      </div>

      <div className="w-row">
        <button type="button" className="w-btn primary" onClick={send}>
          Send a job
        </button>
        <span className="cloud03-task-grants-count">Outcomes seen: {seen.length} of {OUTCOMES.length}</span>
      </div>

      {sent && (
        <>
          <ol className="cloud03-task-grants-hops">
            {HOPS.map((h, i) => (
              <li key={h} className={`cloud03-task-grants-hop ${sent.states[i]}`}>
                <span className="cloud03-task-grants-state">
                  {sent.states[i] === "pass" ? "Passed" : sent.states[i] === "fail" ? "Failed" : "Not reached"}
                </span>
                <span>{code(h)}</span>
              </li>
            ))}
          </ol>
          <div className={`w-verdict ${sent.outcome === "ok" && !wide ? "good" : "bad"}`} role="status">
            {code(sent.says)} {sent.lesson}
            {wide && " The job ran, but the enqueuer is project-wide. The service can now enqueue on every queue the project has, now and later."}
          </div>
        </>
      )}
    </div>
  );
}
