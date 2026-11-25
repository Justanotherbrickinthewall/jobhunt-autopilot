import { useMemo, useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C06EstimateLadder.css";

// Illustrative weeks for a fictional distributor. Each milestone has a low (clean run) and a high (usual problems).
type M = { id: string; name: string; lo: number; hi: number; deps: string[] };
const MS: M[] = [
  { id: "m1", name: "Data access and baseline", lo: 1, hi: 2, deps: [] },
  { id: "m2", name: "Extract born-digital invoices", lo: 2, hi: 4, deps: ["m1"] },
  { id: "m3", name: "Eval set and accuracy report", lo: 1, hi: 2, deps: ["m1"] },
  { id: "m4", name: "Review queue for failed checks", lo: 2, hi: 3, deps: ["m2"] },
  { id: "m5", name: "Post approved invoices to the finance system", lo: 3, hi: 6, deps: ["m4", "m3"] },
  { id: "m6", name: "Handover and runbook", lo: 1, hi: 2, deps: ["m4", "m3", "m5"] },
];
const TARGET = 12;

type Sched = Record<string, { sLo: number; eLo: number; sHi: number; eHi: number }>;

// Earliest finish for each milestone, for the low case and the high case. MS is listed in dependency order.
function schedule(list: M[]): Sched {
  const out: Sched = {};
  for (const m of list) {
    const ds = m.deps.filter((d) => out[d]);
    const sLo = Math.max(0, ...ds.map((d) => out[d].eLo));
    const sHi = Math.max(0, ...ds.map((d) => out[d].eHi));
    out[m.id] = { sLo, eLo: sLo + m.lo, sHi, eHi: sHi + m.hi };
  }
  return out;
}

function criticalIds(list: M[], s: Sched): string[] {
  const latest = (ms: M[]): M => ms.reduce((a, b) => (s[b.id].eHi >= s[a.id].eHi ? b : a));
  const path: string[] = [];
  let cur: M | undefined = latest(list);
  while (cur) {
    path.unshift(cur.id);
    const ds: M[] = cur.deps.map((d) => list.find((m) => m.id === d)).filter((m): m is M => !!m);
    cur = ds.length ? latest(ds) : undefined;
  }
  return path;
}

function band(list: M[]) {
  const s = schedule(list);
  return { lo: Math.max(...list.map((m) => s[m.id].eLo)), hi: Math.max(...list.map((m) => s[m.id].eHi)) };
}

const nameOf = (id: string) => MS.find((m) => m.id === id)?.name ?? id;

function firstBreak(order: string[]): string | null {
  for (let i = 0; i < order.length; i++) {
    const m = MS.find((x) => x.id === order[i])!;
    const missing = m.deps.find((d) => order.indexOf(d) === -1 || order.indexOf(d) > i);
    if (missing) return `"${m.name}" cannot start before "${nameOf(missing)}" is done.`;
  }
  return null;
}

export default function C06EstimateLadder({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [order, setOrder] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [msg, setMsg] = useState("");
  const [ordered, setOrdered] = useState(false);
  const [cut, setCut] = useState<string | null>(null);

  const sched = useMemo(() => schedule(MS), []);
  const crit = useMemo(() => criticalIds(MS, sched), [sched]);
  const full = useMemo(() => band(MS), []);
  const options = useMemo(
    () =>
      MS.filter((m) => m.id !== "m1" && m.id !== "m2").map((m) => {
        const rest = MS.filter((x) => x.id !== m.id).map((x) => ({ ...x, deps: x.deps.flatMap((d) => (d === m.id ? m.deps : [d])) }));
        return { m, b: band(rest) };
      }),
    [],
  );

  function check() {
    const broken = firstBreak(order);
    if (!broken) {
      setOrdered(true);
      setMsg("");
      return;
    }
    if (attempts === 0) {
      setAttempts(1);
      setMsg(`${broken} Reset and try again.`);
      return;
    }
    setAttempts(2);
    setOrder(MS.map((m) => m.id));
    setOrdered(true);
    setMsg(`${broken} A valid order is shown below.`);
  }
  function pickCut(id: string) {
    if (cut) return;
    setCut(id);
    const o = options.find((x) => x.m.id === id)!;
    complete(`cut "${o.m.name}", leaving ${o.b.lo} to ${o.b.hi} weeks against a limit of ${TARGET}`);
  }

  const unplaced = MS.filter((m) => !order.includes(m.id));
  const chosen = options.find((o) => o.m.id === cut);
  const axis = full.hi;

  return (
    <div className="w-panel fde-craft-estimate-ladder">
      <p className="fde-craft-estimate-ladder-lede">
        Six milestones, each with a range in weeks. Part one, put them in a valid start order. Part two, find the critical path and choose what to cut so the top of the range fits in {TARGET} weeks.
      </p>

      <ul className="fde-craft-estimate-ladder-facts">
        {MS.map((m) => (
          <li key={m.id}>
            <b>{m.name}</b> <span className="w-mono">{m.lo} to {m.hi} weeks</span>
            <span className="fde-craft-estimate-ladder-dep">{m.deps.length ? `Needs ${m.deps.map(nameOf).join(" and ")}.` : "Needs nothing."}</span>
          </li>
        ))}
      </ul>

      {!ordered && (
        <>
          <p className="w-label">Part one. Your start order ({order.length} of {MS.length} placed)</p>
          <ol className="fde-craft-estimate-ladder-seq">
            {order.map((id) => (
              <li key={id}>{nameOf(id)}</li>
            ))}
          </ol>
          <div className="fde-craft-estimate-ladder-add" role="group" aria-label="Add the next milestone">
            {unplaced.map((m) => (
              <button key={m.id} type="button" className="w-btn ghost small" onClick={() => { setOrder((o) => [...o, m.id]); setMsg(""); }}>
                Add {m.name}
              </button>
            ))}
          </div>
          <div className="w-row">
            <button type="button" className="w-btn" disabled={order.length !== MS.length} onClick={check}>Check the order</button>
            <button type="button" className="w-btn ghost" disabled={order.length === 0} onClick={() => { setOrder([]); setMsg(""); }}>Reset</button>
          </div>
          {msg && <p className="fde-craft-estimate-ladder-msg" role="status">{msg}</p>}
        </>
      )}

      {ordered && (
        <>
          {msg && <p className="fde-craft-estimate-ladder-msg" role="status">{msg}</p>}
          <p className="w-label">The ladder. Solid is the low case, light is the high case, the outline marks the critical path</p>
          <div className="fde-craft-estimate-ladder-chart">
            {order.map((id) => {
              const m = MS.find((x) => x.id === id)!;
              const s = sched[id];
              const left = (s.sLo / axis) * 100;
              const solid = ((s.eLo - s.sLo) / axis) * 100;
              const total = ((s.eHi - s.sLo) / axis) * 100;
              return (
                <div key={id} className={`fde-craft-estimate-ladder-row ${crit.includes(id) ? "is-crit" : ""}`}>
                  <span className="fde-craft-estimate-ladder-name">{m.name}{crit.includes(id) ? " (critical)" : ""}</span>
                  <span className="fde-craft-estimate-ladder-track" aria-hidden="true">
                    <span className="fde-craft-estimate-ladder-hi" style={{ left: `${left}%`, width: `${total}%` }} />
                    <span className="fde-craft-estimate-ladder-lo" style={{ left: `${left}%`, width: `${solid}%` }} />
                  </span>
                  <span className="w-mono fde-craft-estimate-ladder-wk">weeks {s.sLo} to {s.eHi}</span>
                </div>
              );
            })}
          </div>
          <p className="fde-craft-estimate-ladder-sum">
            Critical path: {crit.map(nameOf).join(", then ")}. Add the lows to get {full.lo} weeks and the highs to get {full.hi} weeks. Say the band: {full.lo} to {full.hi} weeks.
          </p>

          <p className="w-label">Part two. The sponsor needs the top of the range at {TARGET} weeks or fewer. What do you cut?</p>
          <ul className="fde-craft-estimate-ladder-opts">
            {options.map(({ m }) => (
              <li key={m.id}>
                <button type="button" className={`w-btn fde-craft-estimate-ladder-opt ${cut === m.id ? "is-on" : "ghost"}`} aria-pressed={cut === m.id} disabled={cut !== null} onClick={() => pickCut(m.id)}>
                  Cut: {m.name}
                </button>
              </li>
            ))}
          </ul>
          {cut && (
            <>
              <ul className="fde-craft-estimate-ladder-res">
                {options.map(({ m, b }) => (
                  <li key={m.id}>
                    Without "{m.name}": <span className="w-mono">{b.lo} to {b.hi} weeks</span>. {b.hi <= TARGET ? "Fits." : "Still over."}
                  </li>
                ))}
              </ul>
              <div className={`w-verdict ${chosen && chosen.b.hi <= TARGET ? "good" : "bad"}`} role="status">
                <strong>{chosen && chosen.b.hi <= TARGET ? "That cut fits." : "That cut does not fit."}</strong>{" "}
                {chosen && chosen.b.hi <= TARGET
                  ? "Posting is on the critical path, has the widest range and writes to a system of record. A clerk can post the approved invoices by hand meanwhile."
                  : "Only a cut on the critical path changes the date, and the review queue is the safety net. Posting is the cut that fits and the one with the most risk."}
              </div>
            </>
          )}
        </>
      )}
      <p className="fde-craft-estimate-ladder-foot">Illustrative weeks for a fictional distributor. Real ranges come from your own team and the customer's lead times.</p>
    </div>
  );
}
