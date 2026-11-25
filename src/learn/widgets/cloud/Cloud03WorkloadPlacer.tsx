import { useState } from "react";
import type { ReactNode } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud03WorkloadPlacer.css";

// Five workloads and four places to run them. The reasons restate the comparison table in the chapter,
// whose Agent Runtime and GKE Autopilot cells carry CHECK comments. The workloads are invented cases.

type Home = "service" | "job" | "gke" | "runtime";

const HOMES: { id: Home; label: string }[] = [
  { id: "service", label: "Cloud Run service" },
  { id: "job", label: "Cloud Run job" },
  { id: "gke", label: "GKE Autopilot" },
  { id: "runtime", label: "Agent Runtime" },
];

type Workload = { id: string; text: string; home: Home; reasons: Record<Home, string> };

const WORKLOADS: Workload[] = [
  {
    id: "ask",
    text: "`POST /ask` streams an answer to a browser for about 10 seconds.",
    home: "service",
    reasons: {
      service: "A service takes requests and can hold one open while it streams. AskPEP already has this shape.",
      job: "A job takes no requests. It runs a command to the end and stops, so a browser has nothing to connect to.",
      gke: "It can serve a stream. You would still write the manifests and the routing for one route that Cloud Run already serves.",
      runtime: "It hosts an agent behind its own interface. It doesn't serve AskPEP's own `/ask` route.",
    },
  },
  {
    id: "ingest",
    text: "The migrations and the ingest run once, to the end, and nobody holds a connection open.",
    home: "job",
    reasons: {
      service: "A service waits for requests. This work is a command with an end, so it doesn't fit a request.",
      job: "A job starts, runs the command to the end and stops. It reports success or failure, and a pipeline can wait on that.",
      gke: "Kubernetes can also run a command to the end, so it could run there. You would keep a cluster to start a command that a Cloud Run job starts.",
      runtime: "Agent Runtime runs an agent. A migration is a database command, and it isn't an agent.",
    },
  },
  {
    id: "task",
    text: "`POST /internal/tasks/agent`, which Cloud Tasks calls and which runs a desk for up to 60 seconds.",
    home: "service",
    reasons: {
      service: "It is an ordinary request with a time limit, so the service that holds `/ask` answers it. No second worker is needed.",
      job: "A job starts from a command and not from a request. The route and its token check already live in the service.",
      gke: "It could run there. The route would still need the token check and the same image, so a cluster adds work and no gain.",
      runtime: "The queue's call needs the route and its token check, which are part of the AskPEP service. Agent Runtime doesn't serve them.",
    },
  },
  {
    id: "platform",
    text: "A client's platform team runs every workload in its own Kubernetes cluster and allows nothing else.",
    home: "gke",
    reasons: {
      service: "Cloud Run is the default, and this client forbids it. A client's rule beats a default.",
      job: "A job runs a command to the end. It is no home for an API that must stay up.",
      gke: "A named need decides it. Autopilot is Kubernetes with Google managing the machines, so AskPEP can join the client's cluster and follow its rules.",
      runtime: "Agent Runtime is a Google managed service and not the client's cluster, so it breaks the rule as Cloud Run does.",
    },
  },
  {
    id: "agent",
    text: "A data team wants Google to host an agent they built with an agent framework, and does not want to build a container.",
    home: "runtime",
    reasons: {
      service: "Cloud Run runs a container. This team wants none, so they would still have to build the image and write the routes.",
      job: "A job runs to the end. An agent that answers users has to stay up.",
      gke: "Kubernetes gives control that this team has said it does not want to take on.",
      runtime: "Agent Runtime is the managed host for this case. The team hands over the agent and Google runs it.",
    },
  },
];

function code(text: string): ReactNode[] {
  return text.split("`").map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : part));
}

export default function Cloud03WorkloadPlacer({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [choice, setChoice] = useState<Record<string, Home | undefined>>({});
  const [solved, setSolved] = useState<string[]>([]);

  const place = (w: Workload, home: Home) => {
    setChoice({ ...choice, [w.id]: home });
    if (home !== w.home || solved.includes(w.id)) return;
    const next = [...solved, w.id];
    setSolved(next);
    if (next.length === WORKLOADS.length) complete("Placed all five workloads");
  };

  return (
    <div className="w-panel cloud03-workload-placer">
      <p className="cloud03-workload-placer-note">
        Pick a home for each workload. A wrong pick tells you why. Placed correctly: {solved.length} of {WORKLOADS.length}.
      </p>
      <div className="w-stack">
        {WORKLOADS.map((w) => {
          const picked = choice[w.id];
          const right = picked === w.home;
          return (
            <div key={w.id} className="cloud03-workload-placer-card">
              <p className="cloud03-workload-placer-text">{code(w.text)}</p>
              <div className="cloud03-workload-placer-homes" role="group" aria-label={`Home for: ${w.text.replace(/`/g, "")}`}>
                {HOMES.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    className={`w-chip${picked === h.id ? (right ? " good" : " bad") : ""}`}
                    aria-pressed={picked === h.id}
                    onClick={() => place(w, h.id)}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
              {picked && (
                <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
                  {code(w.reasons[picked])}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
