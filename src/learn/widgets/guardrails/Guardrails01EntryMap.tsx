import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Guardrails01EntryMap.css";

// Eight pieces of text that reach the PEP desk in one run. The learner picks the stage that should check each one.
// The stages are the four that the chapter introduces just before this widget, plus "no stage" for trusted text.

type Place = "input" | "retrieved" | "tool_call" | "output" | "none";

const PLACES: { id: Place; label: string }[] = [
  { id: "input", label: "Input" },
  { id: "retrieved", label: "Retrieved" },
  { id: "tool_call", label: "Tool call" },
  { id: "output", label: "Output" },
  { id: "none", label: "No stage" },
];

const PLACE_LABEL: Record<Place, string> = {
  input: "Input",
  retrieved: "Retrieved",
  tool_call: "Tool call",
  output: "Output",
  none: "No stage",
};

type Item = { id: string; text: string; by: string; best: Place; why: string };

const ITEMS: Item[] = [
  {
    id: "t1",
    text: "A user types a question into the AskPEP page: which PEP added the walrus operator?",
    by: "the user",
    best: "input",
    why: "A question is text a stranger wrote, and it is the first text the desk sees. The input stage checks it before any model reads it.",
  },
  {
    id: "t2",
    text: "A coding assistant calls the MCP tool ask_peps with a question.",
    by: "someone else's agent",
    best: "input",
    why: "The route changes and the stage does not. A question that comes over HTTP and one that comes over MCP are both text the desk did not write.",
  },
  {
    id: "t3",
    text: "search_peps returns six passages from the PEP corpus for the researcher to read.",
    by: "the PEP authors",
    best: "retrieved",
    why: "A passage can hold a sentence that reads like an instruction. The retrieved stage checks each passage before the model sees it.",
  },
  {
    id: "t4",
    text: "The writer calls open_ticket with a title and a body that it wrote itself.",
    by: "the model",
    best: "tool_call",
    why: "The model wrote these arguments after it read untrusted text. The tool call stage checks them before the ticket is filed.",
  },
  {
    id: "t5",
    text: "The code advisor calls lint_snippet with a block of Python code.",
    by: "the model",
    best: "tool_call",
    why: "Every tool call has this stage, not only the one that changes something. Where a tool is harmless, the guards for it can be few.",
  },
  {
    id: "t6",
    text: "The writer's final answer, with its [1] and [2] citations, before the user reads it.",
    by: "the model",
    best: "output",
    why: "The answer is the last text the desk produces. Only the output stage sees all of it, so only that stage can check that its citations were retrieved.",
  },
  {
    id: "t7",
    text: "The researcher's system prompt, which lives in research.py in your repo.",
    by: "you",
    best: "none",
    why: "You wrote it, and a code review changes it. Trusted text needs no stage. A guard here would only slow every run.",
  },
  {
    id: "t8",
    text: "A saved note, I use Python 3.9, which the desk puts back into the prompt on a later run.",
    by: "the user, in an earlier question",
    best: "input",
    why: "The note came in as a question, so the input stage has already checked it. It belongs to one user and goes back only into that user's runs.",
  },
];

export default function Guardrails01EntryMap({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [pick, setPick] = useState<Record<string, Place>>({});
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);

  const answered = ITEMS.every((i) => pick[i.id]);
  const right = ITEMS.filter((i) => pick[i.id] === i.best).length;
  const checked = attempts > 0;

  const check = () => {
    if (!answered) return;
    const n = attempts + 1;
    setAttempts(n);
    if (right === ITEMS.length || n >= 2) {
      setResolved(true);
      complete(`Placed ${right} of ${ITEMS.length} correctly on ${n === 1 ? "the first check" : "the second check"}`);
    }
  };

  return (
    <div className="w-panel guardrails01-entry-map">
      <p className="guardrails01-entry-map-lead">
        Eight pieces of text reach the PEP desk during one run. Pick the stage that should check each one, or pick no stage if the text is trusted.
      </p>
      <ul className="guardrails01-entry-map-list">
        {ITEMS.map((item) => {
          const chosen = pick[item.id];
          const isRight = chosen === item.best;
          const locked = resolved || (checked && isRight);
          return (
            <li key={item.id} className="guardrails01-entry-map-item">
              <p className="guardrails01-entry-map-text">{item.text}</p>
              <div className="w-row guardrails01-entry-map-opts" role="radiogroup" aria-label={item.text}>
                {PLACES.map((p) => {
                  const on = chosen === p.id;
                  const cls =
                    "w-chip" +
                    (on ? " is-on" : "") +
                    (resolved && p.id === item.best ? " good" : "") +
                    ((resolved || checked) && on && !isRight ? " bad" : "") +
                    (checked && !resolved && on && isRight ? " good" : "");
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={locked}
                      className={cls}
                      onClick={() => setPick({ ...pick, [item.id]: p.id })}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              {resolved && (
                <p className="guardrails01-entry-map-why">
                  <span className="w-mono">Best: {PLACE_LABEL[item.best]}.</span> Written by {item.by}. {item.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {!resolved && (
        <div className="w-row">
          <button type="button" className="w-btn primary" disabled={!answered} onClick={check}>
            {checked ? "Check again" : "Check my placement"}
          </button>
        </div>
      )}

      {checked && !resolved && (
        <p className="w-verdict bad" role="status">
          {right} of {ITEMS.length} are right. The wrong ones are marked. Ask who wrote the text and when it reaches the desk, then change them.
        </p>
      )}

      {resolved && (
        <p className={"w-verdict " + (right === ITEMS.length ? "good" : "bad")} role="status">
          <strong>You placed {right} of {ITEMS.length} correctly. </strong>
          Seven of the eight texts came from outside your repo, or from a model that had read text from outside. Only the system prompt is yours.
        </p>
      )}
    </div>
  );
}
