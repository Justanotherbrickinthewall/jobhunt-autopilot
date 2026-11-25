import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Guardrails04ConfidenceLevel.css";

// Illustrative figures. The sample and its confidence bands are made up to show the trade-off.
// Model Armor's real levels are LOW_AND_ABOVE, MEDIUM_AND_ABOVE and HIGH.

const BANDS = ["none", "low", "medium", "high"] as const;
type Band = (typeof BANDS)[number];

type Item = { band: Band; attack: boolean };
const counts = (attack: boolean, per: Record<Band, number>): Item[] =>
  BANDS.flatMap((band) => Array.from({ length: per[band] }, () => ({ band, attack })));

const ITEMS: Item[] = [
  ...counts(true, { none: 1, low: 2, medium: 2, high: 3 }),
  ...counts(false, { none: 7, low: 4, medium: 1, high: 0 }),
];
const ATTACKS = ITEMS.filter((i) => i.attack).length;
const FINE = ITEMS.length - ATTACKS;

type Level = { id: string; label: string; from: number };
const LEVELS: Level[] = [
  { id: "LOW_AND_ABOVE", label: "Low and above", from: 1 },
  { id: "MEDIUM_AND_ABOVE", label: "Medium and above", from: 2 },
  { id: "HIGH", label: "High", from: 3 },
];

type Scenario = { id: string; name: string; blurb: string; miss: number; block: number };
const SCENARIOS: Scenario[] = [
  {
    id: "tickets",
    name: "Questions to /agent, where the writer can call open_ticket",
    blurb: "A missed injection here can file a ticket in the user's name. A wrongly blocked question only makes the user reword it.",
    miss: 20,
    block: 1,
  },
  {
    id: "public",
    name: "Questions to /ask, which answers and calls no tool",
    blurb: "The output guards still check the answer, and no tool can run. A wrongly blocked question sends a user away.",
    miss: 2,
    block: 6,
  },
];

function stats(level: Level) {
  const blocked = ITEMS.filter((i) => BANDS.indexOf(i.band) >= level.from);
  const caught = blocked.filter((i) => i.attack).length;
  return { blocked: blocked.length, caught, fp: blocked.length - caught, missed: ATTACKS - caught };
}
const costOf = (s: Scenario, level: Level) => {
  const r = stats(level);
  return r.missed * s.miss + r.fp * s.block;
};
const bestCost = (s: Scenario) => Math.min(...LEVELS.map((l) => costOf(s, l)));

const X = (i: number) => 74 + i * 64;

function Strip({ level }: { level: Level }) {
  return (
    <svg
      viewBox="0 0 320 206"
      className="guardrails04-confidence-level-svg"
      role="img"
      aria-label={`${ITEMS.length} labelled requests grouped by the confidence band the classifier gave them, with the block line at ${level.label}`}
    >
      <text x="4" y="80" className="guardrails04-confidence-level-ax">Attacks</text>
      <text x="4" y="114" className="guardrails04-confidence-level-ax">Fine</text>
      <line x1="4" x2="316" y1="96" y2="96" className="guardrails04-confidence-level-axis" />
      {BANDS.map((band, i) => {
        const attacks = ITEMS.filter((it) => it.band === band && it.attack).length;
        const fine = ITEMS.filter((it) => it.band === band && !it.attack).length;
        const blocked = i >= level.from;
        return (
          <g key={band}>
            <text x={X(i)} y="12" textAnchor="middle" className="guardrails04-confidence-level-ax">
              {band}
            </text>
            {Array.from({ length: attacks }, (_, k) => (
              <circle key={`a${k}`} cx={X(i)} cy={84 - k * 14} r="5.5" className={"guardrails04-confidence-level-dot bad" + (blocked ? " blocked" : "")} />
            ))}
            {Array.from({ length: fine }, (_, k) => (
              <circle key={`f${k}`} cx={X(i)} cy={108 + k * 14} r="5.5" className={"guardrails04-confidence-level-dot good" + (blocked ? " blocked" : "")} />
            ))}
          </g>
        );
      })}
      <line x1={X(level.from) - 32} x2={X(level.from) - 32} y1="20" y2="202" className="guardrails04-confidence-level-line" />
    </svg>
  );
}

export default function Guardrails04ConfidenceLevel({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [active, setActive] = useState<0 | 1>(0);
  const [pick, setPick] = useState<[number, number]>([1, 1]);
  const [locked, setLocked] = useState<[boolean, boolean]>([false, false]);
  const [misses, setMisses] = useState<[number, number]>([0, 0]);

  const sc = SCENARIOS[active];
  const level = LEVELS[pick[active]];
  const r = stats(level);
  const both = locked[0] && locked[1];

  const choose = (i: number) => {
    const n: [number, number] = [pick[0], pick[1]];
    n[active] = i;
    setPick(n);
  };

  const lock = () => {
    if (costOf(sc, level) !== bestCost(sc) && misses[active] === 0) {
      const m: [number, number] = [misses[0], misses[1]];
      m[active] = 1;
      setMisses(m);
      return;
    }
    const n: [boolean, boolean] = [locked[0], locked[1]];
    n[active] = true;
    setLocked(n);
    if (n[0] && n[1]) {
      const ok = SCENARIOS.map((s, i) => costOf(s, LEVELS[pick[i]]) === bestCost(s));
      complete(
        `Tickets screen at ${LEVELS[pick[0]].id} ${ok[0] ? "cheapest" : "not cheapest"}. Public screen at ${LEVELS[pick[1]].id} ${ok[1] ? "cheapest" : "not cheapest"}.`,
      );
    }
  };

  return (
    <div className="w-panel guardrails04-confidence-level">
      <p className="guardrails04-confidence-level-note w-mono">
        Illustrative figures. {ITEMS.length} labelled requests: {ATTACKS} attacks and {FINE} fine ones. The bands are made up.
      </p>

      <div className="w-row" role="tablist" aria-label="Screen">
        {SCENARIOS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={active === i}
            className={"w-chip" + (active === i ? " is-on" : "")}
            onClick={() => setActive(i as 0 | 1)}
          >
            {s.name}
            {locked[i] ? " (locked)" : ""}
          </button>
        ))}
      </div>

      <p className="guardrails04-confidence-level-blurb">{sc.blurb}</p>
      <p className="guardrails04-confidence-level-blurb">
        A missed attack costs {sc.miss} units. A wrongly blocked request costs {sc.block}.
      </p>

      <Strip level={level} />

      <div className="guardrails04-confidence-level-levels" role="radiogroup" aria-label="Confidence level">
        {LEVELS.map((l, i) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={pick[active] === i}
            disabled={locked[active]}
            className={"guardrails04-confidence-level-lv" + (pick[active] === i ? " on" : "")}
            onClick={() => choose(i)}
          >
            <span className="w-mono">{l.id}</span>
          </button>
        ))}
      </div>

      <dl className="guardrails04-confidence-level-stats">
        <div><dt>Blocked</dt><dd>{r.blocked}</dd></div>
        <div><dt>Attacks caught</dt><dd>{r.caught} of {ATTACKS}</dd></div>
        <div><dt>False positives</dt><dd>{r.fp} of {FINE}</dd></div>
        <div><dt>Missed attacks</dt><dd>{r.missed}</dd></div>
      </dl>

      {!locked[active] && misses[active] > 0 && (
        <p className="w-verdict bad" role="status">
          Another level is cheaper here. A miss costs {sc.miss} and a wrongly blocked request costs {sc.block}. Pick again and lock.
        </p>
      )}

      {!locked[active] && (
        <div className="w-row">
          <button type="button" className="w-btn primary" onClick={lock}>
            Lock this level for the screen
          </button>
          {!both && <span className="guardrails04-confidence-level-hint">Lock both screens to see every cost.</span>}
        </div>
      )}

      {both && (
        <div className="guardrails04-confidence-level-out">
          {SCENARIOS.map((s, i) => {
            const mine = costOf(s, LEVELS[pick[i]]);
            const best = bestCost(s);
            return (
              <div key={s.id} className="guardrails04-confidence-level-card">
                <p className="guardrails04-confidence-level-cap">{s.name}</p>
                <table className="guardrails04-confidence-level-table">
                  <thead>
                    <tr>
                      <th scope="col">Level</th>
                      <th scope="col">Cost in units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LEVELS.map((l, k) => (
                      <tr key={l.id} className={costOf(s, l) === best ? "best" : ""}>
                        <td className="w-mono">{l.id}{k === pick[i] ? " (yours)" : ""}</td>
                        <td>{costOf(s, l)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className={"w-verdict " + (mine === best ? "good" : "bad")} role="status">
                  {mine === best
                    ? `Your level costs ${mine} units, which is the cheapest.`
                    : `Your level costs ${mine} units. The cheapest is ${best}.`}
                </p>
              </div>
            );
          })}
          <p className="guardrails04-confidence-level-blurb">
            The same classifier needs a different level on each screen. When a miss is dear, accept more false positives. When a block is dear and later layers back you up, raise the bar.
          </p>
        </div>
      )}
    </div>
  );
}
