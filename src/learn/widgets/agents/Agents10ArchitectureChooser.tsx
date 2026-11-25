import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents10ArchitectureChooser.css";

type Q = { id: string; text: string; options: { v: string; label: string }[] };

const QUESTIONS: Q[] = [
  {
    id: "path",
    text: "Can you write the steps before the run starts?",
    options: [
      { v: "fixed", label: "Yes, the same steps every time" },
      { v: "branch", label: "Yes, but the branch depends on the input" },
      { v: "open", label: "No, it depends on what the tools return" },
    ],
  },
  {
    id: "parts",
    text: "Can the parts of the work run without each other's results?",
    options: [
      { v: "yes", label: "Yes, no part needs another's result" },
      { v: "no", label: "No, each part needs the one before" },
    ],
  },
  {
    id: "skills",
    text: "Does the work need several specialities, each with its own tools?",
    options: [
      { v: "yes", label: "Yes" },
      { v: "no", label: "No, one set of tools will do" },
    ],
  },
  {
    id: "check",
    text: "Can code or a second model check the result against a written standard?",
    options: [
      { v: "yes", label: "Yes" },
      { v: "no", label: "No" },
    ],
  },
  {
    id: "trigger",
    text: "Does the work arrive as events, on a schedule or from a work queue?",
    options: [
      { v: "yes", label: "Yes" },
      { v: "no", label: "No, a person asks" },
    ],
  },
];

type Verdict = { name: string; chapter: string; why: string; extras: string[] };

export function choose(a: Record<string, string>): Verdict {
  const extras: string[] = [];
  if (a.check === "yes") extras.push("Alternate a draft call and a review call: reflection, chapter 14.");
  if (a.trigger === "yes") extras.push("Let a schedule or a work queue start each run: event-driven, chapter 20. The trigger is separate from the pattern.");
  if (a.path === "fixed" && a.parts === "yes")
    return { name: "Parallel fan-out", chapter: "15", why: "The steps are known and no part needs another's result, so code splits the work, runs it at once and merges it.", extras };
  if (a.path === "fixed")
    return { name: "A fixed workflow", chapter: "12", why: "You can write the steps down, so code owns the path. The model only fills in the blanks.", extras };
  if (a.path === "branch")
    return { name: "A router into a workflow", chapter: "3 and 12", why: "The steps are known but the branch is not. The model picks one label from a fixed set and code does the rest.", extras };
  if (a.skills === "yes")
    return { name: "A supervisor, or handoffs", chapter: "17 and 18", why: "The path is open and the work needs several specialities. A supervisor keeps control. Handoffs let each agent pass it on.", extras };
  if (a.parts === "yes")
    return { name: "Plan, then fan out", chapter: "13 and 15", why: "The path is open, but no part needs another's result. A model writes the plan once, and code runs the parts at once.", extras };
  return { name: "A ReAct tool loop", chapter: "1 and 11", why: "The path is open and one set of tools will do. The model picks every step until it can answer.", extras };
}

export default function Agents10ArchitectureChooser({ onComplete }: WidgetProps) {
  const [ans, setAns] = useState<Record<string, string>>({});
  const [judged, setJudged] = useState<string | null>(null);
  const complete = useComplete(onComplete);
  const done = QUESTIONS.every((q) => ans[q.id]);
  const v = done ? choose(ans) : null;

  const judge = (agree: boolean) => {
    const text = agree ? "Agreed with the verdict" : "Disagreed with the verdict";
    setJudged(text);
    complete(text);
  };

  return (
    <div className="w-panel agents10-architecture-chooser">
      <p className="agents10-architecture-chooser-note">
        Think of one task on the PEP desk, such as answering one question, checking 18 PEPs for a claim or answering mail from a work queue. Answer for that task.
      </p>
      <div className="w-stack">
        {QUESTIONS.map((q) => (
          <fieldset key={q.id} className="agents10-architecture-chooser-q">
            <legend className="agents10-architecture-chooser-legend">{q.text}</legend>
            <div className="agents10-architecture-chooser-opts" role="radiogroup" aria-label={q.text}>
              {q.options.map((o) => (
                <label key={o.v} className={`agents10-architecture-chooser-opt${ans[q.id] === o.v ? " on" : ""}`}>
                  <input
                    type="radio"
                    name={`agents10-architecture-chooser-${q.id}`}
                    value={o.v}
                    checked={ans[q.id] === o.v}
                    onChange={() => {
                      setAns((a) => ({ ...a, [q.id]: o.v }));
                      setJudged(null);
                    }}
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      {v && (
        <div className="agents10-architecture-chooser-result" role="status">
          <h4>
            {v.name} (chapter {v.chapter})
          </h4>
          <p>{v.why}</p>
          {v.extras.map((e) => (
            <p key={e}>{e}</p>
          ))}
          <div className="w-row">
            <button type="button" className="w-btn primary" onClick={() => judge(true)}>
              This fits my task
            </button>
            <button type="button" className="w-btn ghost" onClick={() => judge(false)}>
              It does not fit
            </button>
          </div>
        </div>
      )}
      {judged && (
        <div className="w-verdict good" role="status">
          {judged === "Agreed with the verdict"
            ? "Good. The rule is a start, not a law. Check the cost in model calls before you build it."
            : "That is useful. Find the answer you gave that the rule ignores. It usually shows which axis matters most for your task."}
        </div>
      )}
    </div>
  );
}
