import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud04PrivatePath.css";

// Every outcome below is reasoned from the Terraform in capstone/infra/terraform and from the Cloud Run and
// Cloud SQL docs. Nobody ran these setups against a project, and the card says so.
// CHECK: that Cloud SQL refuses a private network when no peering connection to Google's services exists, and
// that a service with no VPC egress cannot reach an instance that has only a private address.

type Fail = 0 | 1 | 2 | 3 | 4; // 0 means the connection works, otherwise the first stop that is missing

type Case = {
  title: string;
  setup: string;
  fails: Fail;
  result: string;
  why: string;
};

const STOPS = [
  { id: 1, name: "service" },
  { id: 2, name: "peering" },
  { id: 3, name: "instance" },
  { id: 4, name: "URL" },
];

const OPTIONS: { id: string; label: string; fails: Fail }[] = [
  { id: "1", label: "Stop 1: the service never joins the subnet.", fails: 1 },
  { id: "2", label: "Stop 2: the two networks are not peered.", fails: 2 },
  { id: "3", label: "Stop 3: the instance has no private address.", fails: 3 },
  { id: "4", label: "Stop 4: the URL names the wrong place.", fails: 4 },
  { id: "0", label: "No stop fails. The connection works.", fails: 0 },
];

const CASES: Case[] = [
  {
    title: "Case 1: a service with no subnet",
    setup:
      "The network, the peering and the instance's private address are all in place, and the secret holds a URL with that address. You then deploy a service whose Terraform still has `local.vpc = null`.",
    fails: 1,
    result: "The connection never completes. `/health` answers 503 with the detail database unreachable, so the new revision fails its startup probe and the deploy does not finish.",
    why: "The instance exists and the URL is right. The service sits outside your network, and a private address has no route from there.",
  },
  {
    title: "Case 2: no peering connection",
    setup:
      "The network, the subnet and the reserved range exist. You leave `google_service_networking_connection` out of `network.tf`, and you remove the `depends_on` line in `sql.tf` that named it.",
    fails: 2,
    result: "The apply fails when it reaches the instance, and the instance keeps its public address.",
    why: "Cloud SQL runs in a network that Google owns. Without the peering connection, your network has no way to hand the instance an address, so no private address exists to put in a URL.",
  },
  {
    title: "Case 3: an instance with no private network",
    setup:
      "The network, the subnet and the peering are in place, and the service joins the subnet. In `sql.tf`, the `ip_configuration` block still says `ipv4_enabled = true` and names no `private_network`.",
    fails: 3,
    result: "`terraform output database_private_ip` prints nothing, and the instance still has a public address.",
    why: "The path is built, and the instance never joined it. There is no private address to read, so the next stop has nothing to name.",
  },
  {
    title: "Case 4: a URL that still uses the socket",
    setup:
      "Everything is built, and the service joins the subnet. You forget to add a new version of `askpep-database-url`, so `latest` is still the URL from RAG chapter 14, with a host of `/cloudsql/` and the connection name.",
    fails: 4,
    result: "`/health` answers 503 with the detail database unreachable, so the new revision fails its startup probe.",
    why: "Three stops are fine. The new service doesn't mount `/cloudsql`, so the socket path in the URL points at nothing. A new secret version, read by a new instance, fixes it.",
  },
  {
    title: "Case 5: every stop in place",
    setup:
      "The service joins the subnet. The peering exists. The instance has a private address and no public one. The secret `askpep-database-url` names that address.",
    fails: 0,
    result: "`/health` answers with status ok and the revision passes its startup probe. A laptop on the internet can't reach the database at all.",
    why: "Each stop covers the next one. With no public address, the internet has nothing to find, and the VPC has one way in.",
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

type Tone = "ok" | "bad" | "off" | "idle";

function tones(fails: Fail, revealed: boolean): Tone[] {
  if (!revealed) return STOPS.map(() => "idle");
  return STOPS.map((s) => {
    if (fails === 0) return "ok";
    if (s.id < fails) return "ok";
    if (s.id === fails) return "bad";
    return "off";
  });
}

function Path({ fails, revealed }: { fails: Fail; revealed: boolean }) {
  const t = tones(fails, revealed);
  const label = revealed
    ? fails === 0
      ? "The private path from the service to the database. Every stop is in place."
      : `The private path from the service to the database. It stops at stop ${fails}.`
    : "The private path from the service to the database, in four stops.";
  return (
    <svg viewBox="0 0 340 118" className="cloud04-private-path-chart" role="img" aria-label={label}>
      <defs>
        <marker id="cloud04-pp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="cloud04-private-path-head" />
        </marker>
      </defs>
      {STOPS.map((s, i) => {
        const x = 4 + i * 84;
        return (
          <g key={s.id}>
            <rect x={x} y={14} width={74} height={62} rx={8} className={`cloud04-private-path-node ${t[i]}`} />
            <text x={x + 37} y={32} textAnchor="middle" className="cloud04-private-path-num">
              {`Stop ${s.id}`}
            </text>
            <text x={x + 37} y={50} textAnchor="middle" className="cloud04-private-path-text">
              {s.name}
            </text>
            <text x={x + 37} y={66} textAnchor="middle" className="cloud04-private-path-mark">
              {t[i] === "ok" ? "in place" : t[i] === "bad" ? "missing" : t[i] === "off" ? "not reached" : "?"}
            </text>
            {i < STOPS.length - 1 && (
              <line x1={x + 74} y1={45} x2={x + 84} y2={45} className={`cloud04-private-path-line ${t[i + 1] === "off" || t[i] === "bad" ? "dim" : ""}`} markerEnd="url(#cloud04-pp-arrow)" />
            )}
          </g>
        );
      })}
      <text x={170} y={104} textAnchor="middle" className="cloud04-private-path-caption">
        service, then peering, then instance, then URL
      </text>
    </svg>
  );
}

export default function Cloud04PrivatePath({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const c = CASES[index];
  const chosen = OPTIONS.find((o) => o.id === pick);
  const right = chosen !== undefined && chosen.fails === c.fails;

  const check = () => {
    if (!chosen) return;
    const n = attempts + 1;
    setAttempts(n);
    if (right || n >= 2) {
      setResolved(true);
      if (right && n === 1) setFirstTry((k) => k + 1);
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
      complete(`Found the first failing stop on ${firstTry} of ${CASES.length} cases at the first try`);
    }
  };

  return (
    <div className="w-panel cloud04-private-path">
      <div className="w-row between">
        <span className="w-label">{c.title}</span>
        <span className="cloud04-private-path-count">
          {index + 1} of {CASES.length}
        </span>
      </div>

      <Path fails={c.fails} revealed={resolved} />

      <div className="cloud04-private-path-scene">
        <p>
          <strong>The setup.</strong> <Rich text={c.setup} />
        </p>
      </div>

      <div className="cloud04-private-path-group" role="radiogroup" aria-label="Your prediction">
        <span className="w-label">Predict: where does the connection stop?</span>
        <div className="cloud04-private-path-opts">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={pick === o.id}
              className={`cloud04-private-path-opt${pick === o.id ? " on" : ""}`}
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
            {index + 1 < CASES.length ? "Next case" : "Finish"}
          </button>
        )}
      </div>

      {attempts > 0 && !resolved && (
        <div className="w-verdict bad" role="status">
          Not quite. Walk the path from the service to the database, and stop at the first part that is missing.
        </div>
      )}

      {resolved && (
        <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
          <strong>{right ? "Correct. " : "Not quite. "}</strong>
          <Rich text={c.result} /> <Rich text={c.why} />
        </div>
      )}

      <p className="cloud04-private-path-note">
        These outcomes are reasoned from the Terraform and the Google docs. Nobody ran them against a project.
      </p>

      {finished && (
        <div className="w-verdict good" role="status">
          You found the first failing stop on {firstTry} of {CASES.length} cases at the first try. The rule: a private address needs all four stops, and the missing one is always the first one that fails.
        </div>
      )}
    </div>
  );
}
