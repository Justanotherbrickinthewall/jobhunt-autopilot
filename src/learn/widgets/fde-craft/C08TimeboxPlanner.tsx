import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C08TimeboxPlanner.css";

const TOTAL = 45;

type Block = { id: string; name: string; min: number; max: number; why: string };
const BLOCKS: Block[] = [
  { id: "read", name: "Read the data", min: 8, max: 12, why: "Every later step depends on what you find here. Under 8 minutes and you parse the format on row 1. Over 12 and you have no time to build." },
  { id: "parse", name: "Parse and clean", min: 16, max: 24, why: "This is where the mess lives: dates, amounts, duplicates and unreadable rows. It is the biggest block because most of the marks are earned here." },
  { id: "extract", name: "Extract with a schema, reconcile and check a sample", min: 8, max: 14, why: "One narrow model task, validated in code, then a count against the ledger. Under 8 and there is no sample check. Over 14 and you are tuning a prompt." },
  { id: "report", name: "Numbers and a short report", min: 4, max: 8, why: "The interviewer asks what you found. Four minutes is the least that gets every count into one paragraph. Skipping it leaves a program that prints nothing useful." },
  { id: "extras", name: "Tidy the code and add extras", min: 0, max: 3, why: "A working small result beats a tidy unfinished one. Extras come only from slack, and a refactor does not earn marks in 45 minutes." },
];

const START: Record<string, number> = { read: 3, parse: 12, extract: 20, report: 2, extras: 8 };

function state(b: Block, v: number): "low" | "high" | "ok" {
  return v < b.min ? "low" : v > b.max ? "high" : "ok";
}

export default function C08TimeboxPlanner({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [mins, setMins] = useState<Record<string, number>>(START);
  const [attempts, setAttempts] = useState(0);
  const [done, setDone] = useState(false);
  const [checked, setChecked] = useState(false);

  const used = Object.values(mins).reduce((a, b) => a + b, 0);
  const left = TOTAL - used;
  const off = BLOCKS.filter((b) => state(b, mins[b.id]) !== "ok");

  function bump(id: string, d: number) {
    if (done) return;
    const v = mins[id] + d;
    if (v < 0 || (d > 0 && left <= 0)) return;
    setChecked(false);
    setMins((m) => ({ ...m, [id]: v }));
  }

  function check() {
    const n = attempts + 1;
    setAttempts(n);
    setChecked(true);
    if (off.length === 0) {
      setDone(true);
      complete(`Plan within range: ${BLOCKS.map((b) => mins[b.id]).join(", ")}`);
    } else if (n >= 2) {
      setDone(true);
      complete(`${off.length} blocks out of range after two tries`);
    }
  }

  const good = off.length === 0;

  return (
    <div className="w-panel fde-craft-timebox-planner">
      <p className="fde-craft-timebox-planner-lede">
        You have {TOTAL} minutes. Spread them across the five blocks so that no block is starved or bloated. Use the buttons to move a minute at a time. The start plan is a common bad one.
      </p>
      <div className="fde-craft-timebox-planner-left w-mono" role="status" aria-live="polite">
        {left} minutes left to place
      </div>
      <ul className="fde-craft-timebox-planner-list">
        {BLOCKS.map((b) => {
          const s = state(b, mins[b.id]);
          const flag = checked && s !== "ok";
          return (
            <li key={b.id} className={flag ? "is-off" : ""}>
              <div className="fde-craft-timebox-planner-name">
                {b.name}
                {flag && !done && <span className="fde-craft-timebox-planner-flag"> {s === "low" ? "Too little time." : "Too much time."}</span>}
                {done && (
                  <span className="fde-craft-timebox-planner-why">
                    <b>{b.min} to {b.max} minutes.</b> {b.why}
                  </span>
                )}
              </div>
              <div className="fde-craft-timebox-planner-ctl">
                <button type="button" className="w-btn small ghost" onClick={() => bump(b.id, -1)} disabled={done || mins[b.id] <= 0} aria-label={`One minute less for ${b.name}`}>-</button>
                <span className="w-mono fde-craft-timebox-planner-val">{mins[b.id]}</span>
                <button type="button" className="w-btn small ghost" onClick={() => bump(b.id, 1)} disabled={done || left <= 0} aria-label={`One minute more for ${b.name}`}>+</button>
              </div>
            </li>
          );
        })}
      </ul>
      {!done && (
        <button type="button" className="w-btn" onClick={check} disabled={left !== 0}>
          Check the plan
        </button>
      )}
      {!done && left !== 0 && <p className="fde-craft-timebox-planner-note">Place every minute before you check.</p>}
      {checked && !done && !good && (
        <p className="fde-craft-timebox-planner-note" role="status">
          {off.length} {off.length === 1 ? "block is" : "blocks are"} outside the range. Move minutes from a bloated block to a starved one and check again.
        </p>
      )}
      {done && (
        <div className={`w-verdict ${good ? "good" : "bad"}`} role="status">
          <strong>{good ? "A plan that finishes." : `${off.length} blocks out of range.`}</strong>{" "}
          {good ? "Every block has enough time and none has too much." : "Compare each range above with your plan."} The lab uses 10, 20, 10 and 5 minutes for the first four blocks and nothing for extras. Each block has a cut line so you can lose a feature and keep the schedule.
        </div>
      )}
      <p className="fde-craft-timebox-planner-foot">Ranges are the author's judgement from the lab's time-box, not a published standard.</p>
    </div>
  );
}
