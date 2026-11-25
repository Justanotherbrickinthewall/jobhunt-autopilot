import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C01RequirementsProbe.css";

type Q = { id: string; text: string; changes: boolean; note: string };

// Five questions change the diagram. Seven do not. Order is mixed on purpose.
const QUESTIONS: Q[] = [
  { id: "model", text: "Which model vendor do you prefer?", changes: false, note: "A solution question. Pick the model after the targets are known." },
  { id: "volume", text: "How many questions arrive a day, and what is the busiest hour?", changes: true, note: "Volume and peak decide between a script, a live service and a queue." },
  { id: "vector", text: "Which vector database do you already pay for?", changes: false, note: "A tool preference. It swaps one box for another and the diagram stays the same." },
  { id: "wrong", text: "What does a wrong answer cost, and who bears it?", changes: true, note: "It sets the accuracy bar and how much human review you draw." },
  { id: "language", text: "What language is the team's code written in?", changes: false, note: "It changes the code you write, not the shape of the system." },
  { id: "writes", text: "Does any answer change a record, or does it only read one?", changes: true, note: "A write needs a gate, an audit log and an approval path. A read does not." },
  { id: "colour", text: "What colour scheme should the chat window use?", changes: false, note: "Styling changes no component and no data flow." },
  { id: "access", text: "Which suppliers' data may each user see?", changes: true, note: "Permissions must be enforced in retrieval, so they change the data path." },
  { id: "vision", text: "What is the company's AI vision?", changes: false, note: "Pleasant context, but nothing in the diagram depends on the answer." },
  { id: "latency", text: "How quickly must a reply arrive?", changes: true, note: "Two seconds needs a live path. Four hours allows a batch queue." },
  { id: "team", text: "How large is the engineering team?", changes: false, note: "Worth knowing later for rollout. It does not change the first design." },
  { id: "name", text: "What should the assistant be called?", changes: false, note: "A name changes nothing you draw." },
];

const LIMIT = 5;

export default function C01RequirementsProbe({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picked, setPicked] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [done, setDone] = useState(false);
  const [checked, setChecked] = useState(false);

  const right = picked.filter((id) => QUESTIONS.find((q) => q.id === id)?.changes).length;

  function toggle(id: string) {
    if (done) return;
    setChecked(false);
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < LIMIT ? [...p, id] : p));
  }
  function submit() {
    const n = attempts + 1;
    setAttempts(n);
    setChecked(true);
    if (right === LIMIT) {
      setDone(true);
      complete(n === 1 ? "Picked all five design-changing questions on the first try" : "Picked all five design-changing questions on the second try");
    } else if (n >= 2) {
      setDone(true);
      complete(`${right} of 5 design-changing questions after two tries, explanation read`);
    }
  }

  return (
    <div className="w-panel design-requirements-probe">
      <p className="design-requirements-probe-lede">
        The prompt: design an assistant that answers Harbour Supplies suppliers about invoice status and payment. You have five minutes to ask. Pick the {LIMIT} questions whose answers would change what you draw.
      </p>
      <div className="w-row design-requirements-probe-count">
        <span className="w-label">Questions chosen</span>
        <span className="w-mono">{picked.length} of {LIMIT}</span>
      </div>
      <ul className="design-requirements-probe-list">
        {QUESTIONS.map((q) => {
          const on = picked.includes(q.id);
          const mark = checked || done ? (on && q.changes ? " is-right" : on && !q.changes ? " is-wrong" : "") : "";
          return (
            <li key={q.id}>
              <button
                type="button"
                className={`w-chip design-requirements-probe-q${on ? " is-on" : ""}${mark}`}
                aria-pressed={on}
                onClick={() => toggle(q.id)}
                disabled={done || (!on && picked.length >= LIMIT)}
              >
                {q.text}
              </button>
              {done && <p className="design-requirements-probe-note">{q.changes ? "Changes the design. " : "Does not change it. "}{q.note}</p>}
              {!done && checked && on && !q.changes && <p className="design-requirements-probe-note">Would not change what you draw. {q.note}</p>}
            </li>
          );
        })}
      </ul>

      {!done && (
        <button type="button" className="w-btn" onClick={submit} disabled={picked.length !== LIMIT || checked}>
          Ask these five
        </button>
      )}

      {checked && !done && (
        <div className="w-verdict bad" role="status">
          <strong>{right} of 5 would change the design.</strong> The picks marked in rose would not. Swap them and try once more. The second try shows every question with its reason.
        </div>
      )}

      {done && (
        <>
          <div className={`w-verdict ${right === LIMIT ? "good" : "bad"}`} role="status">
            <strong>{right} of 5.</strong>{" "}
            {right === LIMIT
              ? "Every one of your questions would move a box or an arrow. That is the test for a good opening question."
              : "The right five are listed below. Each one picks between two different diagrams. The rest are fine to ask later."}
          </div>
          <p className="design-requirements-probe-foot">Illustrative scenario. Harbour Supplies is a fictional customer.</p>
        </>
      )}
    </div>
  );
}
