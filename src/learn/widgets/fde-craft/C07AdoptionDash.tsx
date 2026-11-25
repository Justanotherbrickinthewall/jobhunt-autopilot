import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C07AdoptionDash.css";

const ACTIONS = [
  "Interview the users who stopped, and retrain them",
  "Sample the overridden results and fix the extraction",
  "Audit a random sample of accepted results",
  "Expand to the next supplier",
] as const;

type Case = {
  id: string;
  title: string;
  active: number[]; // of 18 licensed clerks
  completion: number[]; // percent of invoices finished in the tool
  override: number[]; // percent of results changed by a reviewer
  note?: string;
  right: number;
  why: string;
  wrong: string;
};
const CASES: Case[] = [
  {
    id: "d1", title: "Dashboard one", active: [16, 15, 11, 7], completion: [82, 81, 80, 79], override: [9, 9, 10, 9], right: 0,
    why: "Quality is steady: completion and overrides barely move. Only use is falling, from 16 clerks to 7. That is an adoption problem. Ask the people who left why, and retrain them.",
    wrong: "The quality numbers are flat, so a model fix would not change anything. Use is the number that moved.",
  },
  {
    id: "d2", title: "Dashboard two", active: [14, 15, 16, 16], completion: [70, 72, 71, 70], override: [12, 18, 25, 33],
    note: "A new supplier format went live in week two.", right: 1,
    why: "People still use the tool, but they correct a third of its results. Overrides tripled while use held steady. Read the overridden invoices, find the new format, and fix the extraction.",
    wrong: "Use is steady, so training is not the issue. The override rate tripled, and that points at the extraction.",
  },
  {
    id: "d3", title: "Dashboard three", active: [17, 18, 18, 18], completion: [85, 90, 95, 97], override: [8, 4, 2, 0.8],
    note: "Nobody has checked the accepted results since week one.", right: 2,
    why: "An override rate heading to zero looks like success. It can also mean tired reviewers who accept everything. A random audit of accepted results tells you which one it is.",
    wrong: "The numbers look perfect, and that is the warning. Without a sample check you cannot tell quality from rubber-stamping.",
  },
  {
    id: "d4", title: "Dashboard four", active: [15, 16, 17, 17], completion: [78, 84, 88, 91], override: [14, 11, 8, 6],
    note: "A weekly audit of 50 accepted results found 1 error in week four.", right: 3,
    why: "Use is rising, completion is rising, overrides are falling, and an independent audit agrees. Nothing here needs fixing. Move on to the next supplier.",
    wrong: "Every number is healthy and an audit backs it. Holding back now only delays the saving.",
  },
];

export default function C07AdoptionDash({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [done, setDone] = useState(false);
  const c = CASES[idx];

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    const r = right + (i === c.right ? 1 : 0);
    setRight(r);
    if (idx === CASES.length - 1) {
      setDone(true);
      complete(`${r} of ${CASES.length} actions matched the data`);
    }
  }
  function next() {
    setIdx(idx + 1);
    setPicked(null);
  }

  const rows: [string, number[], string][] = [
    ["Active clerks of 18", c.active, ""],
    ["Task completion", c.completion, "%"],
    ["Override rate", c.override, "%"],
  ];

  return (
    <div className="w-panel fde-craft-adoption-dash">
      <p className="fde-craft-adoption-dash-lede">
        Four weeks of metrics from the Harbour rollout. Read the pattern across the weeks, then choose the one action the data supports.
      </p>
      <div className="fde-craft-adoption-dash-count">{c.title}, {idx + 1} of {CASES.length}</div>
      <table className="fde-craft-adoption-dash-table">
        <thead>
          <tr><th scope="col">Metric</th>{[1, 2, 3, 4].map((w) => <th key={w} scope="col">Week {w}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map(([name, vals, unit]) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              {vals.map((v, i) => <td key={i} className="w-mono">{v}{unit}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {c.note && <p className="fde-craft-adoption-dash-note">{c.note}</p>}

      <div className="fde-craft-adoption-dash-choices" role="group" aria-label="Choose the action">
        {ACTIONS.map((a, i) => (
          <button key={a} type="button" className={`w-btn ghost${picked === i ? " is-on" : ""}`} onClick={() => pick(i)} disabled={picked !== null}>
            {a}
          </button>
        ))}
      </div>

      {picked !== null && (
        <div className={`w-verdict ${picked === c.right ? "good" : "bad"}`} role="status">
          <strong>{picked === c.right ? "Right." : `Better action: ${ACTIONS[c.right]}.`}</strong> {picked === c.right ? c.why : `${c.wrong} ${c.why}`}
        </div>
      )}
      {picked !== null && !done && <button type="button" className="w-btn" onClick={next}>Next dashboard</button>}
      {done && <p className="fde-craft-adoption-dash-foot">{right} of {CASES.length} actions matched the data. Each pattern points at a different owner: training, engineering, review or the sponsor.</p>}
      <p className="fde-craft-adoption-dash-foot">Illustrative figures for a fictional rollout.</p>
    </div>
  );
}
