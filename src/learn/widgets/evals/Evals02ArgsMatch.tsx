import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Evals02ArgsMatch.css";

// Each verdict below is what grade_tool_args gives for one expected tool. The matching rules are the rules of
// args_match. Cases 1, 2, 3 and 6 come from items of the action slice. The other two are made up and say so.

type Case = {
  item: string;
  tool: string;
  expected: string;
  ran: string | null;
  pass: boolean;
  reason: string;
  why: string;
};

const CASES: Case[] = [
  {
    item: "Item t02: Show me the Indentation section of PEP 8.",
    tool: "read_pep_section",
    expected: '{"pep": 8}',
    ran: '{"pep": 8, "section": "Indentation"}',
    pass: true,
    reason: "",
    why: "Every expected key is there and matches. The extra section key is fine, because the model has to fill it in.",
  },
  {
    item: "Item t03: Which Python version added the match statement?",
    tool: "python_feature_version",
    expected: '{"pep": 634}',
    ran: '{"pep": "634"}',
    pass: false,
    reason: "python_feature_version ran with other arguments",
    why: "The item expects the number 634. The desk sent the text \"634\". A number matches only an equal number.",
  },
  {
    item: "Item t10: Look up PEP 20 and open a ticket saying the Zen needs a translation note.",
    tool: "open_ticket",
    expected: '{"peps": [20]}',
    ran: '{"title": "Zen needs a translation note", "body": "...", "peps": [20, 8]}',
    pass: true,
    reason: "",
    why: "A list matches when every expected element is in the list the desk sent. Extra elements and their order don't matter.",
  },
  {
    item: "A made-up item that expects search_peps with the query walrus.",
    tool: "search_peps",
    expected: '{"query": "walrus"}',
    ran: '{"query": "walrus operator"}',
    pass: false,
    reason: "search_peps ran with other arguments",
    why: "Text must match as a whole. The query walrus operator is longer than walrus, and a substring is not a match.",
  },
  {
    item: "A made-up item that expects search_peps with the query Walrus.",
    tool: "search_peps",
    expected: '{"query": "Walrus"}',
    ran: '{"query": "  walrus "}',
    pass: true,
    reason: "",
    why: "Text matches without regard to case, and spaces at either end are ignored.",
  },
  {
    item: "Item t03 again. This time the desk answered from memory and used no tool.",
    tool: "python_feature_version",
    expected: '{"pep": 634}',
    ran: null,
    pass: false,
    reason: "python_feature_version never ran",
    why: "No tool step has that name. The reason says the tool never ran, which points at the model's choice of tool and not at its arguments.",
  },
];

export default function Evals02ArgsMatch({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const c = CASES[index];
  const right = pick === c.pass;

  const check = () => {
    if (pick === null) return;
    const n = attempts + 1;
    setAttempts(n);
    if (pick === c.pass || n >= 2) {
      setResolved(true);
      if (pick === c.pass && n === 1) setFirstTry((k) => k + 1);
    }
  };

  const next = () => {
    if (index + 1 < CASES.length) {
      setIndex(index + 1);
      setPick(null);
      setAttempts(0);
      setResolved(false);
    } else {
      setFinished(true);
      complete(`Predicted ${firstTry} of ${CASES.length} tool calls on the first try`);
    }
  };

  return (
    <div className="w-panel evals02-args-match">
      <div className="w-row between">
        <span className="w-label">Tool call {index + 1} of {CASES.length}</span>
        <span className="evals02-args-match-count">{firstTry} right on the first try</span>
      </div>

      <div className="evals02-args-match-scene">
        <p>{c.item}</p>
        <dl className="evals02-args-match-facts">
          <dt>Expected for {c.tool}</dt>
          <dd><code>{c.expected}</code></dd>
          <dt>What the desk ran</dt>
          <dd>{c.ran === null ? <em>No call to {c.tool}.</em> : <code>{c.ran}</code>}</dd>
        </dl>
      </div>

      <div className="evals02-args-match-group" role="radiogroup" aria-label="Your prediction">
        <span className="w-label">Predict: does the tool_args score pass?</span>
        <div className="evals02-args-match-opts">
          {[
            { id: true, label: "It passes." },
            { id: false, label: "It fails." },
          ].map((o) => (
            <button
              key={String(o.id)}
              type="button"
              role="radio"
              aria-checked={pick === o.id}
              className={`evals02-args-match-opt${pick === o.id ? " on" : ""}`}
              disabled={resolved}
              onClick={() => setPick(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-row">
        {!resolved && (
          <button type="button" className="w-btn primary" disabled={pick === null} onClick={check}>
            Check my prediction
          </button>
        )}
        {resolved && !finished && (
          <button type="button" className="w-btn ghost" onClick={next}>
            {index + 1 < CASES.length ? "Next tool call" : "Finish"}
          </button>
        )}
      </div>

      {attempts > 0 && !resolved && (
        <div className="w-verdict bad" role="status">
          Not quite. Go through the expected keys one at a time, and apply the matching rule for each value.
        </div>
      )}

      {resolved && (
        <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
          <strong>{right ? "Correct. " : "Not quite. "}</strong>
          {c.pass ? "Score: 1.0, passed. " : `Score: 0.0, failed. Reason: ${c.reason}. `}
          {c.why}
        </div>
      )}

      {finished && (
        <div className="w-verdict good" role="status">
          You predicted {firstTry} of {CASES.length} tool calls on the first try. The rule: extra keys and extra list
          elements are fine. Text must match whole, and a number must be a number.
        </div>
      )}
    </div>
  );
}
