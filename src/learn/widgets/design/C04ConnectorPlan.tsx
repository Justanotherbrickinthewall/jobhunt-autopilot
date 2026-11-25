import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C04ConnectorPlan.css";

// Illustrative figures. Harbour Supplies is a fictional customer.
// CHECKED 17 Oct 2026: https://learn.microsoft.com/en-us/graph/teams-changenotifications-chatmessage (teams/getAllMessages, application permission ChannelMessage.Read.All, 3-day lifetime) and https://learn.microsoft.com/en-us/graph/metered-api-list (Teams APIs not metered since 25 Aug 2025)
// CHECKED 17 Oct 2026: https://fivetran.com/docs/connectors/applications/servicenow/troubleshooting/required-sysauditdelete-fields (sys_audit_delete lists deletions, only for audited tables, and reading it may need an elevated role)
type Option = {
  label: string;
  staleness: number; // worst case, in minutes
  polls: number; // polls per unit per day
  extraUnits?: number; // extra tables or feeds polled, such as a deletion log
  fullCrawl?: boolean;
  reconcile?: boolean; // a nightly full reconcile on top
  drift?: string; // a flaw that lets the index diverge from the source
  blocked?: string; // a reason the client cannot accept it
  why: string;
};
type Source = {
  name: string;
  facts: string;
  budget: number; // minutes
  units: number;
  unitName: string;
  items: number;
  changes: number;
  options: Option[];
  best: number;
  explain: string;
};

const PAGE = 100;

const SOURCES: Source[] = [
  {
    name: "SharePoint",
    facts: "12 document libraries, 150,000 files, about 1,500 changes a day. Freshness budget: 30 minutes.",
    budget: 30,
    units: 12,
    unitName: "libraries",
    items: 150000,
    changes: 1500,
    options: [
      { label: "Nightly full crawl", staleness: 1440, polls: 0, fullCrawl: true, why: "It reads everything once a day and meets nothing. A change made at 09:00 is invisible until the next morning." },
      { label: "Change query every 15 minutes", staleness: 15, polls: 96, why: "Worst case is 15 minutes against a 30 minute budget, and the change feed reports deletions as well as edits." },
      { label: "Change query every 2 minutes", staleness: 2, polls: 720, why: "It meets the budget by a wide margin and spends about four times the requests of the 15 minute poll." },
      { label: "Change notification, then a change read, plus a nightly full reconcile", staleness: 2, polls: 0, reconcile: true, why: "It meets the budget. It adds a public endpoint and subscription renewals to run, and the budget does not need them." },
      { label: "Change notification only, applied as received", staleness: 2, polls: 0, drift: "A lost notification is never repaired, so the index drifts from the source.", why: "Cheap and fast, and it silently loses changes. A notification is a signal, not a guarantee." },
    ],
    best: 1,
    explain: "Choose the cheapest option that meets the budget and cannot drift. A 30 minute budget does not justify webhooks, so a change poll every 15 minutes wins.",
  },
  {
    name: "Teams",
    facts: "300 channels, 400,000 threads, about 20,000 new messages a day. Freshness budget: 5 minutes.",
    budget: 5,
    units: 300,
    unitName: "channels",
    items: 400000,
    changes: 20000,
    options: [
      { label: "Nightly full crawl", staleness: 1440, polls: 0, fullCrawl: true, why: "It is the cheapest in requests and misses the budget by a day." },
      { label: "Change query every 15 minutes", staleness: 15, polls: 96, why: "Three times the budget. The conversation is over before the copilot can see it." },
      { label: "Change query every 2 minutes", staleness: 2, polls: 720, why: "It meets the budget by polling 300 channels 720 times a day each. Most polls return nothing." },
      { label: "Change notification, then a change read, plus a nightly full reconcile", staleness: 2, polls: 0, reconcile: true, why: "Work happens only when a message arrives. The nightly reconcile repairs any lost notification." },
      { label: "Change notification only, applied as received", staleness: 2, polls: 0, drift: "A lost notification is never repaired, so the index drifts from the source.", why: "It meets the budget and cannot repair itself. Deleted messages would stay searchable." },
    ],
    best: 3,
    explain: "A 5 minute budget over 300 channels makes polling wasteful. Notifications trigger the work, the change read fetches it, and the reconcile covers what the notifications lose.",
  },
  {
    name: "ServiceNow",
    facts: "4 tables, 120,000 tickets, about 3,000 updates a day. Freshness budget: 10 minutes. Harbour changes its ServiceNow instance only in a monthly release window.",
    budget: 10,
    units: 4,
    unitName: "tables",
    items: 120000,
    changes: 3000,
    options: [
      { label: "Nightly full crawl", staleness: 1440, polls: 0, fullCrawl: true, why: "A ticket updated this morning is wrong in the copilot all day." },
      { label: "Poll for records updated since the last run, every 30 minutes", staleness: 30, polls: 48, why: "Three times the budget, and it still cannot see deletions." },
      { label: "Poll for records updated since the last run, every 5 minutes", staleness: 5, polls: 288, drift: "An updated-since query cannot see a deleted record, so deleted tickets stay searchable.", why: "It meets the freshness budget. A confidential ticket that was deleted in ServiceNow would still be quoted." },
      { label: "Poll for updates every 5 minutes, and read the deletion log", staleness: 5, polls: 288, extraUnits: 1, why: "It meets the budget, catches deletions and needs nothing changed inside Harbour's instance." },
      { label: "Push from a ServiceNow business rule, plus a nightly reconcile", staleness: 1, polls: 0, reconcile: true, blocked: "It needs a change inside Harbour's ServiceNow, which waits for the monthly window.", why: "The fastest and cheap in requests. It cannot go live in the pilot, because it needs a change to the client's instance." },
    ],
    best: 3,
    explain: "Reading the deletion log (sys_audit_delete, which covers audited tables only) is what makes polling safe. Push is attractive and is blocked by the release window, so it goes on the roadmap for a later phase.",
  },
];

function requests(s: Source, o: Option): number {
  if (o.fullCrawl) return Math.ceil(s.items / PAGE);
  const polling = (s.units + (o.extraUnits ?? 0)) * o.polls;
  const reconcile = o.reconcile ? Math.ceil(s.items / PAGE) : 0;
  return polling + s.changes + reconcile;
}
function meets(s: Source, o: Option): boolean {
  return o.staleness <= s.budget && !o.drift && !o.blocked;
}
const fmt = (n: number) => n.toLocaleString("en-GB");

export default function C04ConnectorPlan({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [shown, setShown] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const s = SOURCES[idx];
  const last = idx === SOURCES.length - 1;
  const o = shown !== null ? s.options[shown] : null;
  const reqs = o ? requests(s, o) : 0;
  const ok = o ? meets(s, o) : false;
  const right = shown === s.best;

  function check() {
    if (picked === null || revealed) return;
    const n = attempts + 1;
    setAttempts(n);
    setShown(picked);
    const hit = picked === s.best;
    if (hit || n >= 2) {
      setRevealed(true);
      const ft = firstTry + (hit && n === 1 ? 1 : 0);
      setFirstTry(ft);
      if (last) {
        setFinished(true);
        complete(`${ft} of ${SOURCES.length} sync plans right on the first try`);
      }
    }
  }
  function next() {
    setIdx(idx + 1);
    setPicked(null);
    setAttempts(0);
    setShown(null);
    setRevealed(false);
  }

  const planTotal = SOURCES.reduce((sum, src) => sum + requests(src, src.options[src.best]), 0);

  return (
    <div className="w-panel design-connector-plan">
      <div className="w-row design-connector-plan-head">
        <span className="w-label">Source {idx + 1} of {SOURCES.length}</span>
        <span className="w-mono">{s.name}</span>
      </div>
      <p className="design-connector-plan-facts">{s.facts}</p>
      <fieldset className="design-connector-plan-opts" disabled={revealed}>
        <legend className="w-label">How does this source reach the index?</legend>
        {s.options.map((opt, i) => (
          <label key={i} className={`design-connector-plan-opt${picked === i ? " is-on" : ""}`}>
            <input type="radio" name={`design-connector-plan-${idx}`} checked={picked === i} onChange={() => setPicked(i)} />
            <span>{opt.label}</span>
          </label>
        ))}
      </fieldset>
      {!revealed && (
        <button type="button" className="w-btn" onClick={check} disabled={picked === null}>
          {attempts === 0 ? "Check the plan" : "Try again"}
        </button>
      )}

      {o && (
        <div className="design-connector-plan-out" role="status">
          <dl className="design-connector-plan-grid">
            <div>
              <dt className="w-label">Worst-case staleness</dt>
              <dd className={`w-mono ${o.staleness <= s.budget ? "is-ok" : "is-bad"}`}>{fmt(o.staleness)} min of {s.budget}</dd>
            </div>
            <div>
              <dt className="w-label">Requests a day</dt>
              <dd className="w-mono">{fmt(reqs)}</dd>
            </div>
            <div>
              <dt className="w-label">Can it drift?</dt>
              <dd className={`w-mono ${o.drift ? "is-bad" : "is-ok"}`}>{o.drift ? "Yes" : "No"}</dd>
            </div>
          </dl>
          {o.drift && <p className="design-connector-plan-flag">{o.drift}</p>}
          {o.blocked && <p className="design-connector-plan-flag">{o.blocked}</p>}
          <div className={`w-verdict ${right ? "good" : "bad"}`}>
            <strong>{right ? "Correct. " : ok ? "Meets the budget, but not the cheapest safe plan. " : "Misses a requirement. "}</strong>
            {o.why}
          </div>
        </div>
      )}

      {revealed && (
        <>
          <div className="w-inset design-connector-plan-explain">
            <b>{right ? "Why this plan wins." : `The plan to choose was: ${s.options[s.best].label}.`}</b> {s.explain}
          </div>
          {!last && (
            <button type="button" className="w-btn" onClick={next}>
              Next source
            </button>
          )}
        </>
      )}

      {finished && (
        <div className="design-connector-plan-total">
          <p className="w-label">Reference plan</p>
          <ul className="design-connector-plan-plan">
            {SOURCES.map((src) => (
              <li key={src.name}>
                <b>{src.name}:</b> {src.options[src.best].label}. {fmt(requests(src, src.options[src.best]))} requests a day.
              </li>
            ))}
          </ul>
          <p className="design-connector-plan-foot">
            Total: {fmt(planTotal)} requests a day. {firstTry} of {SOURCES.length} right on the first try. Illustrative figures. Harbour Supplies is a fictional customer.
          </p>
        </div>
      )}
    </div>
  );
}
