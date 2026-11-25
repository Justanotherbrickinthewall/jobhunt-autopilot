import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C04PermissionTrim.css";

// Illustrative scenarios. Harbour Supplies is a fictional customer.
type Chunk = { id: string; title: string; live: boolean };
type Option = { label: string; reach: string[]; flaw?: string; why: string };
type Case = {
  title: string;
  setup: string;
  chunks: Chunk[]; // in relevance order
  options: Option[];
  best: number;
  explain: string;
};

const CASES: Case[] = [
  {
    title: "A salesperson asks about discount bands",
    setup:
      "Priya works in sales. She asks which discount band applies to Marine customers. The index is current, and the pay bands document from HR ranks first for her query. The copilot sends three chunks to the model.",
    chunks: [
      { id: "c1", title: "HR pay bands 2026", live: false },
      { id: "c2", title: "Marine price list", live: true },
      { id: "c3", title: "Marine discount policy", live: true },
      { id: "c4", title: "Finance margin targets", live: false },
      { id: "c5", title: "Discount approval SOP", live: true },
    ],
    options: [
      { label: "Tell the model in the prompt not to reveal restricted content", reach: ["c1", "c2", "c3"], why: "The model read the pay bands before any instruction could stop it. A prompt is a request, not a control." },
      { label: "Retrieve the top three, then drop what she cannot read", reach: ["c2", "c3"], why: "Nothing leaks, but one of her three slots went to a forbidden chunk, so she gets thinner evidence." },
      { label: "Filter on her groups inside the search query", reach: ["c2", "c3", "c5"], why: "The index only ever ranks chunks she may read, so the top three are all usable." },
      { label: "Filter inside the search and also check each result against SharePoint", reach: ["c2", "c3", "c5"], why: "Safe, and it adds a source call to every question. The index is current here, so the call buys nothing." },
    ],
    best: 2,
    explain: "When the index is current, the filter inside the query is enough. It is safe, it fills every slot, and it adds no call to the source.",
  },
  {
    title: "A permission was removed twenty minutes ago",
    setup:
      "Kofi left the Project Falcon site twenty minutes ago. The permission sync runs hourly, so the index still lists Kofi as allowed. Kofi asks about Falcon pricing.",
    chunks: [
      { id: "c1", title: "Falcon pricing sheet", live: false },
      { id: "c2", title: "Falcon contract summary", live: false },
      { id: "c3", title: "Standard price list", live: true },
      { id: "c4", title: "Falcon kickoff notes", live: false },
      { id: "c5", title: "Price list addendum", live: true },
    ],
    options: [
      { label: "Tell the model in the prompt not to reveal restricted content", reach: ["c1", "c2", "c3"], why: "Same failure as before. The model read both Falcon documents." },
      { label: "Retrieve the top three, then drop what the index says Kofi cannot read", reach: ["c1", "c2", "c3"], why: "The index still says Kofi may read them, so the check passes. A stale index defeats every placement that trusts it." },
      { label: "Filter on Kofi's groups inside the search query", reach: ["c1", "c2", "c3"], why: "The filter is correct against stale data. The index lists Kofi as allowed, so the Falcon chunks pass." },
      { label: "Filter inside the search and check the top results against SharePoint", reach: ["c3", "c5"], why: "The live check asks the source, which already knows Kofi was removed. Two chunks reach the model." },
    ],
    best: 3,
    explain: "Permissions change faster than the sync. The only fix is to ask the source about the top results before the model reads them. It costs one batched call per question.",
  },
  {
    title: "A contractor can read almost nothing",
    setup:
      "Amara is a contractor who can read one library, about 50 chunks out of 2,440,000. She asks about the delivery SOP. Her three best chunks sit far down the global ranking.",
    chunks: [
      { id: "c1", title: "Depot safety policy", live: false },
      { id: "c2", title: "Fleet maintenance log", live: false },
      { id: "c3", title: "Delivery exceptions report", live: false },
      { id: "c4", title: "Warehouse layout notes", live: false },
      { id: "c5", title: "Delivery SOP", live: true },
      { id: "c6", title: "Driver checklist", live: true },
      { id: "c7", title: "Depot map", live: true },
    ],
    options: [
      { label: "Tell the model in the prompt not to reveal restricted content", reach: ["c1", "c2", "c3"], why: "Three forbidden chunks reached the model." },
      { label: "Retrieve the top four, then drop what she cannot read", reach: [], flaw: "No leak, but she gets no answer.", why: "All four top chunks were forbidden, so nothing survives the drop. The copilot says it found nothing, and the SOP exists." },
      { label: "Filter on her groups inside the search query", reach: ["c5", "c6", "c7"], why: "The search considers only her 50 chunks, so her best three come back." },
      { label: "Filter inside the search and also check each result against SharePoint", reach: ["c5", "c6", "c7"], why: "Correct result, with a source call the fresh index did not need." },
    ],
    best: 2,
    explain: "A narrow user starves a post-filter. The filter has to sit inside the query. Test it with the smallest group, because that user sees the hardest filter.",
  },
  {
    title: "A second tenant joins the copilot",
    setup:
      "Harbour Ireland is a separate Microsoft tenant with 150 staff. Its data must stay in an EU region under its own keys. A Dublin user asks about UK supplier terms, and the UK tenant also holds an all-staff handbook open to any signed-in user.",
    chunks: [
      { id: "c1", title: "UK supplier terms", live: false },
      { id: "c2", title: "UK all-staff handbook", live: false },
      { id: "c3", title: "Irish supplier terms", live: true },
      { id: "c4", title: "Irish depot rota", live: true },
    ],
    options: [
      { label: "One index, tenant id sent by the browser with each request", reach: ["c1", "c3"], why: "A stale tab or a tampered request names the wrong tenant, and the UK terms come back. The client is not a trusted source for a boundary." },
      { label: "One index, tenant id read from the sign-in token and added on the server", reach: ["c3", "c4"], flaw: "No leak, but the data still shares one index.", why: "The boundary holds. It does not meet the requirement for separate keys and an EU-only store." },
      { label: "One index per tenant, chosen on the server from the token", reach: ["c3", "c4"], why: "The Irish index sits in its own region under its own keys. A bug in the filter cannot cross it, because the other tenant's data is not in the index being searched." },
      { label: "One index, relying on each document's group permissions alone", reach: ["c2", "c3"], why: "The UK handbook is open to every signed-in user, so it matches any caller. Group permissions alone do not separate tenants." },
    ],
    best: 2,
    explain: "A tenant is a boundary stronger than a group. Here the requirement for keys and region settles it, so the Irish data gets its own index, picked on the server from the token.",
  },
];

export default function C04PermissionTrim({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [shown, setShown] = useState<number | null>(null); // option whose outcome is on screen
  const [revealed, setRevealed] = useState(false);
  const [firstTry, setFirstTry] = useState(0);

  const c = CASES[idx];
  const last = idx === CASES.length - 1;
  const byId = (id: string) => c.chunks.find((x) => x.id === id)!;

  function check() {
    if (picked === null || revealed) return;
    const n = attempts + 1;
    setAttempts(n);
    setShown(picked);
    const right = picked === c.best;
    if (right || n >= 2) {
      setRevealed(true);
      const ft = firstTry + (right && n === 1 ? 1 : 0);
      setFirstTry(ft);
      if (last) complete(`${ft} of ${CASES.length} placements right on the first try`);
    }
  }
  function next() {
    setIdx(idx + 1);
    setPicked(null);
    setAttempts(0);
    setShown(null);
    setRevealed(false);
  }

  const out = shown !== null ? c.options[shown] : null;
  const leaked = out ? out.reach.filter((id) => !byId(id).live) : [];
  const right = shown === c.best;

  return (
    <div className="w-panel design-permission-trim">
      <div className="w-row design-permission-trim-head">
        <span className="w-label">Case {idx + 1} of {CASES.length}</span>
        <span className="w-mono">{c.title}</span>
      </div>
      <p className="design-permission-trim-setup">{c.setup}</p>
      <fieldset className="design-permission-trim-opts" disabled={revealed}>
        <legend className="w-label">Where does the permission check sit?</legend>
        {c.options.map((o, i) => (
          <label key={i} className={`design-permission-trim-opt${picked === i ? " is-on" : ""}`}>
            <input type="radio" name={`design-permission-trim-${idx}`} checked={picked === i} onChange={() => setPicked(i)} />
            <span>{o.label}</span>
          </label>
        ))}
      </fieldset>
      {!revealed && (
        <button type="button" className="w-btn" onClick={check} disabled={picked === null}>
          {attempts === 0 ? "Run the query" : "Try again"}
        </button>
      )}

      {out && (
        <div className="design-permission-trim-out" role="status">
          <p className="w-label">What reached the model</p>
          {out.reach.length === 0 ? (
            <p className="design-permission-trim-none">Nothing reached the model.</p>
          ) : (
            <ul className="design-permission-trim-list">
              {out.reach.map((id) => {
                const ch = byId(id);
                return (
                  <li key={id} className={ch.live ? "is-ok" : "is-leak"}>
                    <b>{ch.live ? "Allowed" : "Leaked"}:</b> {ch.title}
                  </li>
                );
              })}
            </ul>
          )}
          <div className={`w-verdict ${right ? "good" : "bad"}`}>
            <strong>
              {leaked.length > 0 ? `${leaked.length} chunk${leaked.length > 1 ? "s" : ""} leaked. ` : out.flaw ? `${out.flaw} ` : right ? "Correct. " : "No leak. "}
            </strong>
            {out.why}
          </div>
        </div>
      )}

      {revealed && (
        <>
          <div className="w-inset design-permission-trim-explain">
            <b>{right ? "Why this placement wins." : `The best placement was: ${c.options[c.best].label}.`}</b> {c.explain}
          </div>
          {!last && (
            <button type="button" className="w-btn" onClick={next}>
              Next case
            </button>
          )}
          {last && (
            <p className="design-permission-trim-foot">
              {firstTry} of {CASES.length} right on the first try. Illustrative scenarios. Harbour Supplies is a fictional customer.
            </p>
          )}
        </>
      )}
    </div>
  );
}
