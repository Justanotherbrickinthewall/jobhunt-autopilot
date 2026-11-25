import { useMemo, useState } from "react";
import type { WidgetProps } from "../types";
import { useOnce } from "./c1012shared";
import "./C11sStack.css";

type Stage = "prototype" | "production";
type Scale = "small" | "medium" | "huge";
type Infra = "postgres" | "search" | "none";
type Ops = "none" | "some";
type Filtering = "light" | "heavy";
type Hybrid = "no" | "yes";
type Req = { stage: Stage; scale: Scale; infra: Infra; ops: Ops; filtering: Filtering; hybrid: Hybrid };

const STORES = ["pgvector", "Qdrant", "Pinecone", "Milvus", "OpenSearch or Elasticsearch", "Chroma"] as const;
type Store = (typeof STORES)[number];

type Rec = { pick: Store; alts: Store[]; why: string[] };

// A teaching rule set, not a benchmark. It encodes the default-then-switch method from this chapter.
function recommend(r: Req): Rec {
  const why: string[] = [];
  if (r.stage === "prototype") {
    why.push("It is a prototype, so the cheapest option is the one with no server to run. Chroma runs in process.");
    why.push("Switch signal: the day real users or real permissions arrive, move to a store you can operate.");
    return { pick: "Chroma", alts: ["pgvector"], why };
  }
  let rec: Rec;
  if (r.scale === "huge") {
    if (r.ops === "some") {
      why.push("Past about a hundred million vectors the index no longer fits comfortably on one machine, so you want a store built to distribute.");
      why.push("Your team can run services, which makes a self-hosted distributed store like Milvus realistic. Verify the version and the deployment mode before committing.");
      rec = { pick: "Milvus", alts: ["Pinecone", "Qdrant"], why };
    } else {
      why.push("This scale needs a distributed store, and nobody is free to operate one.");
      why.push("A managed service such as Pinecone turns the operational burden into a bill. Check the cost model at your query volume.");
      rec = { pick: "Pinecone", alts: ["Milvus", "Qdrant"], why };
    }
  } else if (r.infra === "search") {
    why.push("You already run Elasticsearch or OpenSearch. It has BM25, filters and vector kNN in one engine, and your team already knows how to run it.");
    why.push("Adding a second datastore must beat that. At this scale it usually does not.");
    rec = { pick: "OpenSearch or Elasticsearch", alts: r.scale === "small" ? ["pgvector", "Qdrant"] : ["Qdrant"], why };
  } else if (r.infra === "postgres") {
    why.push("You already run Postgres. pgvector keeps vectors beside your rows, so permissions are an ordinary SQL join and deletes are an ordinary transaction.");
    if (r.hybrid === "yes") why.push("Hybrid retrieval is covered by Postgres full text search, which is enough to start. Fuse the two ranked lists in your own code.");
    if (r.filtering === "heavy") why.push("Heavy filtering is the usual reason to leave pgvector. Measure recall and latency under your real filters first. Switch only if the number says so.");
    if (r.scale === "medium") why.push("At a few million vectors pgvector is normally fine, but this is where index build time and memory start to matter. Plan the measurement.");
    rec = { pick: "pgvector", alts: r.filtering === "heavy" || r.scale === "medium" ? ["Qdrant"] : [], why };
  } else if (r.ops === "none") {
    why.push("There is no existing database to extend and nobody to run a new one. A managed service removes the operating work.");
    why.push("Pinecone is the common managed choice. Qdrant Cloud is a managed route to an open source engine, which lowers lock-in. Compare both on your cost model.");
    rec = { pick: "Pinecone", alts: ["Qdrant"], why };
  } else {
    why.push("There is nothing to extend, and your team can run services. Qdrant is a purpose built, open source engine with rich filtering on payload, its word for metadata, and a small operating footprint.");
    if (r.filtering === "heavy") why.push("Heavy filtering and many tenants are where a dedicated engine earns its place. Check how its filtering and tenant features behave at your selectivity.");
    if (r.hybrid === "yes") why.push("Hybrid retrieval is supported through sparse vectors. Verify the current fusion options in the docs.");
    rec = { pick: "Qdrant", alts: r.scale === "small" ? ["pgvector"] : [], why };
  }
  return rec;
}

const FIELDS: { key: keyof Req; label: string; opts: [string, string][] }[] = [
  { key: "stage", label: "Stage", opts: [["prototype", "Prototype for a demo"], ["production", "Production for real users"]] },
  { key: "scale", label: "Vectors at the end of year one", opts: [["small", "Under 1 million"], ["medium", "1 to 20 million"], ["huge", "Over 100 million"]] },
  { key: "infra", label: "What the customer already runs", opts: [["postgres", "Postgres"], ["search", "Elasticsearch or OpenSearch"], ["none", "Neither"]] },
  { key: "ops", label: "Who operates new databases", opts: [["none", "Nobody, buy it managed"], ["some", "A platform team"]] },
  { key: "filtering", label: "Filtering", opts: [["light", "A few simple fields"], ["heavy", "Per user permissions and many tenants"]] },
  { key: "hybrid", label: "Exact term search", opts: [["no", "Not essential"], ["yes", "Essential, for IDs and codes"]] },
];

export default function C11sStoreRecommender({ onComplete }: WidgetProps) {
  const complete = useOnce(onComplete);
  const [req, setReq] = useState<Req>({ stage: "production", scale: "medium", infra: "postgres", ops: "some", filtering: "light", hybrid: "no" });
  const [guess, setGuess] = useState<Store | null>(null);
  const [revealed, setRevealed] = useState(false);
  const rec = useMemo(() => recommend(req), [req]);

  function setField(k: keyof Req, v: string) {
    setReq({ ...req, [k]: v } as Req);
    setRevealed(false);
  }

  function reveal() {
    if (!guess) return;
    setRevealed(true);
    complete(guess === rec.pick ? "Predicted the pick." : rec.alts.includes(guess) ? "Defensible pick." : "Missed the pick.");
  }

  const outcome = !revealed || !guess ? null : guess === rec.pick ? "good" : rec.alts.includes(guess) ? "warn" : "bad";

  return (
    <div className="w-panel c11s-root">
      {FIELDS.map((f) => (
        <fieldset key={f.key} className="c11s-fs">
          <legend>{f.label}</legend>
          <div className="c11s-opts">
            {f.opts.map(([v, l]) => (
              <button key={v} type="button" className="c11s-pick" aria-pressed={req[f.key] === v} onClick={() => setField(f.key, v)}>
                {l}
              </button>
            ))}
          </div>
        </fieldset>
      ))}

      <p className="c11s-h">Your prediction: which store do you reach for first?</p>
      <div className="c11s-opts" role="group" aria-label="Predict the vector store">
        {STORES.map((s) => (
          <button
            key={s}
            type="button"
            className={"c11s-pick" + (revealed ? (s === rec.pick ? " is-right" : s === guess ? " is-wrong" : "") : "")}
            aria-pressed={guess === s}
            onClick={() => { setGuess(s); setRevealed(false); }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="w-row" style={{ marginTop: "0.9rem" }}>
        <button type="button" className="w-btn" disabled={!guess} onClick={reveal}>Reveal the pick</button>
        {!guess && <span className="c11s-note">Choose a store before you reveal.</span>}
      </div>

      {revealed && guess && (
        <div className={"w-verdict " + (outcome === "good" ? "good" : "bad")} role="status" style={{ marginTop: "0.9rem" }}>
          <strong>
            {outcome === "good" ? "Matches. " : outcome === "warn" ? `Defensible, but the default is ${rec.pick}. ` : `The default is ${rec.pick}. `}
          </strong>
          {outcome === "warn" && "Your pick is a reasonable alternative here, as long as you can name the signal that justifies it."}
          <ul className="c11s-reasons">{rec.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}
      <p className="c11s-note">A teaching rule set that encodes the method, not a benchmark. Change one constraint at a time and watch which one flips the answer.</p>
    </div>
  );
}
