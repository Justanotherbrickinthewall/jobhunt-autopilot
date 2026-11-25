import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents28ArchPicker.css";

type Answers = { steps: string; start: string; irreversible: string; split: string; special: string };

const QUESTIONS: { key: keyof Answers; text: string; options: { id: string; label: string }[] }[] = [
  { key: "steps", text: "Can you write the steps down before the run starts?", options: [{ id: "all", label: "Yes, all of them" }, { id: "most", label: "Most, with a few branches" }, { id: "no", label: "No, they depend on what it finds" }] },
  { key: "start", text: "What starts a run?", options: [{ id: "user", label: "A user's message" }, { id: "event", label: "An event or a schedule" }] },
  { key: "irreversible", text: "Can any action not be taken back, such as money, mail or a delete?", options: [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }] },
  { key: "split", text: "Does the work split into independent parts?", options: [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }] },
  { key: "special", text: "Does it need several specialities with different tools and rules?", options: [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }] },
];

const PRESETS: { name: string; a: Answers }[] = [
  { name: "The PEP desk", a: { steps: "no", start: "user", irreversible: "no", split: "no", special: "no" } },
  { name: "PayDesk", a: { steps: "all", start: "event", irreversible: "yes", split: "no", special: "no" } },
];

function pick(a: Answers): { arch: string; who: string; why: string; extras: string[] } {
  const extras: string[] = [];
  let arch: string;
  let who: string;
  let why: string;
  if (a.steps === "all") {
    arch = "A deterministic workflow (chapter 12)";
    who = "Code picks. The model fills blanks or picks from a fixed set.";
    why = "You can write the steps down, so an agent would add cost and risk for no gain.";
  } else if (a.steps === "most") {
    arch = "A deterministic workflow with a decision point (chapter 12)";
    who = "Code owns the path. The model picks a branch from a fixed set, and code routes on it.";
    why = "Most of the path is known. Let the model choose only where the branches are.";
  } else if (a.special === "yes") {
    arch = "A supervisor over workers (chapter 17)";
    who = "A model picks which worker runs next and decides when to stop.";
    why = "The path is open and the work needs different tools and rules. Expect more calls than one agent makes.";
    extras.push("Try one tool loop first. Keep the supervisor only if it beats it on your evals.");
  } else {
    arch = "One tool loop with a step budget (chapter 11)";
    who = "The model picks each tool and says when to stop. A step budget in code caps the model calls.";
    why = "The path is open, but one set of tools and rules covers it. A supervisor would only add calls.";
  }
  if (a.split === "yes") extras.push("Fan out the independent parts and merge them in code (chapter 15).");
  if (a.irreversible === "yes") extras.push("Put an action guard in front of the irreversible action, with an idempotency key and, when the risk needs it, an approval (chapters 7 and 23).");
  if (a.start === "event") extras.push("Run it from a topic with pull consumers (chapter 20). Key every effect, and add a force-close and a nightly recovery sweep (chapters 25 and 27).");
  extras.push("Whatever you pick, add a golden set and a regression gate (chapter 21).");
  return { arch, who, why, extras };
}

export default function Agents28ArchPicker({ onComplete }: WidgetProps) {
  const [a, setA] = useState<Partial<Answers>>({});
  const [shown, setShown] = useState(false);
  const complete = useComplete(onComplete);
  const ready = QUESTIONS.every((q) => a[q.key]);
  const result = ready ? pick(a as Answers) : null;

  return (
    <div className="w-panel agents28-arch-picker">
      <div className="w-row agents28-arch-picker-presets">
        {PRESETS.map((p) => (
          <button key={p.name} type="button" className="w-btn ghost" onClick={() => { setA(p.a); setShown(false); }}>
            Load {p.name}
          </button>
        ))}
      </div>
      <div className="w-stack">
        {QUESTIONS.map((q) => (
          <fieldset key={q.key} className="agents28-arch-picker-q">
            <legend className="agents28-arch-picker-legend">{q.text}</legend>
            <div className="agents28-arch-picker-opts" role="radiogroup" aria-label={q.text}>
              {q.options.map((o) => (
                <label key={o.id} className={`agents28-arch-picker-opt${a[q.key] === o.id ? " on" : ""}`}>
                  <input type="radio" name={`agents28-arch-${q.key}`} value={o.id} checked={a[q.key] === o.id} onChange={() => { setA((p) => ({ ...p, [q.key]: o.id })); setShown(false); }} />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="w-row">
        <button type="button" className="w-btn primary" disabled={!ready} onClick={() => { setShown(true); complete("explained"); }}>
          Explain the choice
        </button>
      </div>
      {shown && result && (
        <div className="w-verdict good" role="status">
          <p className="agents28-arch-picker-line"><strong>{result.arch}.</strong> {result.who}</p>
          <p className="agents28-arch-picker-line">{result.why}</p>
          <ul className="agents28-arch-picker-list">
            {result.extras.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
