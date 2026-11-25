import { useState } from "react";
import type { WidgetProps } from "../types";
import { useOnce } from "./c1012shared";
import "./C11sStack.css";

// Relative scores from 0 to 10 for this exercise. They are not measurements.
type Level = { name: string; short: string; speed: number; control: number; debug: number; stable: number; handover: number; hides: string[]; gives: string[] };

const LEVELS: Level[] = [
  { name: "Hand-rolled", short: "Hand-rolled", speed: 3, control: 10, debug: 9, stable: 9, handover: 8,
    gives: ["Every prompt, query and retry is visible in your repository.", "No upgrade can change behaviour under you."],
    hides: ["Nothing. You also write every loader, splitter and retry yourself."] },
  { name: "Framework as a library", short: "Library parts", speed: 6, control: 8, debug: 8, stable: 7, handover: 7,
    gives: ["Loaders, splitters and client wrappers save days of glue.", "You still own the pipeline order and the prompts."],
    hides: ["Default chunking and parsing choices unless you read the source."] },
  { name: "Framework retrieval engine", short: "Query engine", speed: 8, control: 5, debug: 5, stable: 5, handover: 5,
    gives: ["A working query path in a few lines, with sensible defaults.", "Many integrations out of the box."],
    hides: ["The prompt templates, the retrieval parameters and the response synthesis steps."] },
  { name: "Framework orchestration", short: "Graphs and agents", speed: 7, control: 6, debug: 5, stable: 4, handover: 4,
    gives: ["State, branching, retries and human approval as built-in features.", "Resumable runs without writing your own state machine."],
    hides: ["Control flow lives in the framework's model. Debugging needs its tracing tools."] },
  { name: "Everything in the framework", short: "All in", speed: 9, control: 3, debug: 3, stable: 3, handover: 3,
    gives: ["The fastest first demo.", "A shared vocabulary across the team."],
    hides: ["Prompts, retries, chunking, ranking and callbacks, all behind abstractions that move between versions."] },
];

const SCENARIOS: { id: string; title: string; brief: string; ok: number[]; why: string }[] = [
  { id: "demo", title: "A two day demo for a sales call", brief: "Nothing ships. The goal is a believable demo by Friday.", ok: [2, 3, 4], why: "Speed to a first answer is the whole job. A framework earns its cost here, because you throw the code away." },
  { id: "bank", title: "A regulated bank with an in-house Python team", brief: "The team will own and audit this for years. Every prompt must be reviewable.", ok: [0, 1], why: "Auditability and stable behaviour dominate. Own the prompts and the retrieval path, and take library parts only where they are well understood." },
  { id: "agent", title: "A multi-step agent with human approval and resumable runs", brief: "Retrieval is one tool among several. Runs can pause for days.", ok: [1, 3], why: "Orchestration is the hard part, and an explicit graph model beats hand-built state. Keep retrieval itself simple and visible." },
];

function Bar({ value, risk }: { value: number; risk?: boolean }) {
  return (
    <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="c11s-bar" aria-hidden="true">
      <rect x="0" y="0" width="100" height="8" rx="4" className="c11s-bar-track" />
      <rect x="0" y="0" width={value * 10} height="8" rx="4" className={"c11s-bar-fill" + (risk ? " is-risk" : "")} />
    </svg>
  );
}

export default function C11sFrameworkCost({ onComplete }: WidgetProps) {
  const complete = useOnce(onComplete);
  const [level, setLevel] = useState(1);
  const [sc, setSc] = useState(0);
  const [checked, setChecked] = useState<Record<string, { level: number; good: boolean }>>({});
  const L = LEVELS[level];
  const S = SCENARIOS[sc];
  const res = checked[S.id];

  function check() {
    const good = S.ok.includes(level);
    const next = { ...checked, [S.id]: { level, good } };
    setChecked(next);
    if (Object.keys(next).length === SCENARIOS.length) {
      const n = Object.values(next).filter((x) => x.good).length;
      complete(`${n} of ${SCENARIOS.length} scenarios matched.`);
    }
  }

  const meters: [string, number, boolean?][] = [
    ["Speed to first demo", L.speed],
    ["Control over behaviour", L.control],
    ["Ease of debugging", L.debug],
    ["Stability across upgrades", L.stable],
    ["Ease of handover", L.handover],
  ];

  return (
    <div className="w-panel c11s-root">
      <p className="c11s-h" style={{ marginTop: 0 }}>Scenario</p>
      <div className="c11s-opts" role="group" aria-label="Scenario">
        {SCENARIOS.map((s, i) => (
          <button key={s.id} type="button" className="c11s-pick" aria-pressed={sc === i} onClick={() => setSc(i)}>
            {s.title}{checked[s.id] ? (checked[s.id].good ? " (done)" : " (missed)") : ""}
          </button>
        ))}
      </div>
      <p style={{ margin: "0.6rem 0 0", fontSize: "0.95rem" }}>{S.brief}</p>

      <p className="c11s-h">How much do you hand to the framework?</p>
      <input
        className="c11s-slider"
        type="range"
        min={0}
        max={LEVELS.length - 1}
        step={1}
        value={level}
        onChange={(e) => setLevel(Number(e.target.value))}
        aria-label="Framework share"
        aria-valuetext={L.name}
      />
      <div className="c11s-ticks" aria-hidden="true">
        {LEVELS.map((l, i) => <span key={l.name} data-on={i === level}>{l.short}</span>)}
      </div>

      <div className="c11s-meters">
        {meters.map(([name, v]) => (
          <div key={name}>
            <div className="c11s-mh"><span>{name}</span><b>{v}/10</b></div>
            <Bar value={v} />
          </div>
        ))}
      </div>
      <div className="c11s-two">
        <div><p className="c11s-h" style={{ margin: 0 }}>You gain</p><ul>{L.gives.map((g, i) => <li key={i}>{g}</li>)}</ul></div>
        <div><p className="c11s-h" style={{ margin: 0 }}>What it hides</p><ul>{L.hides.map((g, i) => <li key={i}>{g}</li>)}</ul></div>
      </div>
      <p className="c11s-note">Relative scores for this exercise, not measurements. Real frameworks differ, and so does the version you install.</p>

      <div className="w-row" style={{ marginTop: "0.8rem" }}>
        <button type="button" className="w-btn" onClick={check}>Check this level for the scenario</button>
      </div>
      {res && (
        <p className={"w-verdict " + (res.good ? "good" : "bad")} role="status" style={{ marginTop: "0.8rem" }}>
          <strong>{res.good ? "Defensible. " : `Not for this scenario. Sensible levels: ${S.ok.map((i) => LEVELS[i].short).join(", ")}. `}</strong>
          {S.why}
        </p>
      )}
    </div>
  );
}
