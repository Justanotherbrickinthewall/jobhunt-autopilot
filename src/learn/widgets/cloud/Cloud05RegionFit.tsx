import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud05RegionFit.css";

type Severity = "error" | "note";
type Finding = { code: string; where: string; message: string; severity: Severity };
type Verdict = "none" | "notes" | "error";

type Config = {
  deskModel: string;
  vertexLocation: string;
  routing: boolean;
  strongModel: string;
  strongLocation: string;
  gcpRegion: string;
  template: boolean;
  judgeModel: string;
  voyage: boolean;
  allowed: string[] | null;
  why: string;
};

// CHECK: these two tables are the FACTS.md tables of 20 October 2026, the same ones as MODEL_LOCATIONS and
// MODEL_ARMOR_REGIONS in residency.py. Model pages and Model Armor pages change, so read the current pages.
const GLOBAL_US_EU = ["global", "us", "eu"];
const MODEL_LOCATIONS: Record<string, string[]> = {
  "gemini-3.8-flash": GLOBAL_US_EU,
  "gemini-3.7-flash": GLOBAL_US_EU,
  "gemini-3.5-flash": [
    ...GLOBAL_US_EU,
    "europe-west2",
    "europe-west3",
    "northamerica-northeast1",
    "asia-northeast1",
    "asia-south1",
    "asia-southeast1",
    "australia-southeast1",
  ],
  "gemini-3.5-flash-lite": GLOBAL_US_EU,
  "gemini-4-argon": GLOBAL_US_EU,
};
const ARMOR_REGIONS = new Set([
  "asia-northeast1",
  "asia-northeast3",
  "asia-south1",
  "asia-southeast1",
  "australia-southeast2",
  "europe-southwest1",
  "europe-west1",
  "europe-west2",
  "europe-west3",
  "europe-west4",
  "europe-west9",
  "northamerica-northeast2",
  "us-central1",
  "us-east1",
  "us-east4",
  "us-west1",
  "us",
  "eu",
]);
const MULTI_REGIONS = new Set(["us", "eu"]);

// The rules of `check_residency`, in order. The settings are plain data and nothing here calls a service.
function check(c: Config): Finding[] {
  const found: Finding[] = [];
  const pairs: [string, string, string][] = [["vertex_location", c.deskModel, c.vertexLocation]];
  // The strong role is read only when routing is on. With routing off it never runs.
  if (c.routing) pairs.push(["strong_location", c.strongModel, c.strongLocation]);
  for (const [where, model, location] of pairs) {
    const served = MODEL_LOCATIONS[model];
    if (!served) {
      found.push({ code: "unknown_model", where: model, message: "not in the table of served locations", severity: "note" });
    } else if (!served.includes(location)) {
      found.push({ code: "model_not_served", where, message: `${model} is not served from ${location}`, severity: "error" });
    }
  }
  if (!c.template) {
    found.push({ code: "armor_missing", where: "model_armor_template", message: "no template, so ArmorGuard is off", severity: "error" });
  } else {
    if (!ARMOR_REGIONS.has(c.gcpRegion)) {
      found.push({ code: "armor_region", where: "gcp_region", message: `Model Armor is not offered in ${c.gcpRegion}`, severity: "error" });
    }
    if (MULTI_REGIONS.has(c.vertexLocation)) {
      found.push({ code: "armor_floor", where: "vertex_location", message: "floor settings skip multi-region endpoints", severity: "note" });
    }
  }
  if (c.allowed !== null) {
    const places: [string, string][] = [["vertex_location", c.vertexLocation]];
    if (c.routing) places.push(["strong_location", c.strongLocation]);
    places.push(["gcp_region", c.gcpRegion]);
    for (const [where, value] of places) {
      if (!c.allowed.includes(value)) found.push({ code: "outside_allowed", where, message: `${value} is not allowed`, severity: "error" });
    }
  }
  if (c.routing && c.strongLocation !== c.vertexLocation) {
    found.push({ code: "leaves_region", where: "strong_location", message: "the strong role runs elsewhere", severity: "note" });
  }
  if (c.judgeModel.startsWith("claude-")) {
    found.push({ code: "judge_outside", where: "judge_model", message: "the judge calls Anthropic's API", severity: "note" });
  }
  if (c.voyage) {
    found.push({ code: "embeddings_outside", where: "embed_provider", message: "text goes to Voyage AI", severity: "note" });
    found.push({ code: "rerank_outside", where: "rerank_provider", message: "text goes to Voyage AI", severity: "note" });
  }
  return found;
}

const verdictOf = (found: Finding[]): Verdict =>
  found.some((f) => f.severity === "error") ? "error" : found.length > 0 ? "notes" : "none";

const CHOICES: { id: Verdict; label: string }[] = [
  { id: "none", label: "No findings" },
  { id: "notes", label: "Notes only" },
  { id: "error", label: "At least one error" },
];

const BASE: Omit<Config, "why"> = {
  deskModel: "gemini-3.5-flash",
  vertexLocation: "europe-west3",
  routing: false,
  strongModel: "gemini-4-argon",
  strongLocation: "global",
  gcpRegion: "europe-west3",
  template: true,
  judgeModel: "claude-sonnet-5-5",
  voyage: true,
  allowed: null,
};

const CASES: Config[] = [
  {
    ...BASE,
    deskModel: "gemini-3.8-flash",
    why: "The newest flash model is served from global, us and eu. A call in europe-west3 has nowhere to go, so this is an error.",
  },
  {
    ...BASE,
    why: "The production values. Routing is off, so the strong role is not read. The model and the guard are both in europe-west3. The notes list the hops that leave: the judge and Voyage.",
  },
  {
    ...BASE,
    vertexLocation: "northamerica-northeast1",
    gcpRegion: "northamerica-northeast1",
    why: "The model is served there, but Model Armor is not offered there. The deploy would have a model and no working guard.",
  },
  {
    ...BASE,
    deskModel: "gemini-3.8-flash",
    vertexLocation: "eu",
    routing: true,
    strongLocation: "eu",
    why: "Routing is on and both models are served from the eu multi-region. The guard is in europe-west3. The one new note is about floor settings, and it never fails a deploy.",
  },
  {
    ...BASE,
    routing: true,
    allowed: ["europe-west3"],
    why: "The production values with routing on and a clause that allows europe-west3 only. The strong role runs in global, so it breaks the clause.",
  },
  {
    ...BASE,
    allowed: ["europe-west3"],
    why: "The same clause with routing off. The strong role never runs, so its location is not read. The notes are the judge and Voyage.",
  },
  {
    ...BASE,
    template: false,
    why: "The model_armor_template variable defaults to an empty string. That deploys with no guard at all, and the check reports it as an error.",
  },
  {
    ...BASE,
    routing: true,
    strongModel: "gemini-3.5-flash",
    strongLocation: "europe-west3",
    judgeModel: "gemini-3.5-flash",
    voyage: false,
    allowed: ["europe-west3"],
    why: "Every model is set to europe-west3, the judge is not a Claude model, and the providers are not Voyage. The check finds nothing. It still cannot see where a Gemini judge runs.",
  },
];

const SEVERITY_CLASS: Record<Severity, string> = { error: "bad", note: "warn" };

export default function Cloud05RegionFit({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<(Verdict | null)[]>(CASES.map(() => null));

  const pick = (i: number, said: Verdict) => {
    if (picks[i] !== null) return;
    const next = picks.map((p, j) => (j === i ? said : p));
    setPicks(next);
    if (next.every((p) => p !== null)) {
      const right = next.filter((p, j) => p === verdictOf(check(CASES[j]))).length;
      complete(`${right} of ${CASES.length} checks called right`);
    }
  };

  const answered = picks.filter((p) => p !== null).length;

  return (
    <div className="w-panel cloud05-region-fit">
      <p className="cloud05-region-fit-hint">
        The tables are as of 20 October 2026, so check the current model and Model Armor pages. Each card is a set of settings. Predict the worst finding that <span className="w-mono">check_residency</span> returns. {answered} of {CASES.length} answered.
      </p>
      {CASES.map((c, i) => {
        const found = check(c);
        const truth = verdictOf(found);
        const picked = picks[i];
        const done = picked !== null;
        return (
          <section key={i} className="cloud05-region-fit-card" aria-label={`Case ${i + 1}`}>
            <dl className="cloud05-region-fit-config">
              <div>
                <dt>desk_model in vertex_location</dt>
                <dd className="w-mono">{c.deskModel} in {c.vertexLocation}</dd>
              </div>
              <div>
                <dt>routing_enabled, then strong_model in strong_location</dt>
                <dd className="w-mono">{c.routing ? "on" : "off"}, {c.strongModel} in {c.strongLocation}</dd>
              </div>
              <div>
                <dt>gcp_region and template</dt>
                <dd className="w-mono">{c.gcpRegion}, template {c.template ? "set" : "empty"}</dd>
              </div>
              <div>
                <dt>judge_model</dt>
                <dd className="w-mono">{c.judgeModel}</dd>
              </div>
              <div>
                <dt>embed_provider and rerank_provider</dt>
                <dd className="w-mono">{c.voyage ? "voyage" : "not voyage"}</dd>
              </div>
              <div>
                <dt>allowed</dt>
                <dd className="w-mono">{c.allowed === null ? "not given" : c.allowed.join(", ")}</dd>
              </div>
            </dl>
            <div className="cloud05-region-fit-choices" role="radiogroup" aria-label="Worst finding">
              {CHOICES.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  role="radio"
                  aria-checked={picked === ch.id}
                  disabled={done}
                  className={`w-chip cloud05-region-fit-choice${picked === ch.id ? " on" : ""}${done && ch.id === truth ? " right" : ""}`}
                  onClick={() => pick(i, ch.id)}
                >
                  {ch.label}
                </button>
              ))}
            </div>
            {done && (
              <>
                <ul className="cloud05-region-fit-findings" aria-label="Findings">
                  {found.length === 0 && <li className="cloud05-region-fit-none">No findings.</li>}
                  {found.map((f) => (
                    <li key={`${f.code}-${f.where}`} className="cloud05-region-fit-finding">
                      <span className={`w-chip ${SEVERITY_CLASS[f.severity]}`}>{f.severity}</span>{" "}
                      <span className="w-mono">{f.code}</span> on <span className="w-mono">{f.where}</span>: {f.message}
                    </li>
                  ))}
                </ul>
                <p className={`cloud05-region-fit-why ${picked === truth ? "ok" : "miss"}`} role="status">
                  <strong>{picked === truth ? "Correct. " : "Missed. "}</strong>
                  {c.why}
                </p>
              </>
            )}
          </section>
        );
      })}
      {answered === CASES.length && (
        <div className="w-verdict good" role="status">
          An error means the settings cannot work or break the clause. A note means text leaves on purpose, and the contract decides whether that is acceptable. Read every note against the clause before a deploy.
        </div>
      )}
    </div>
  );
}
