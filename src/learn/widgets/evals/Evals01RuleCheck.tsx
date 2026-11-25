import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Evals01RuleCheck.css";

// Every message is the wording of validate_item in askpep/evals/datasets.py, and the chapter's rules table lists each one.
const ID = "id is blank";
const QUESTION = "question is blank";
const SLICE = "slice must be one of retrieval, routing, answer, action, attack";
const SOURCE = "source must be one of golden-v1, human, synthetic, production";
const ANSWERABLE = "an answerable item needs expected_docs";
const UNANSWERABLE = "an unanswerable item has no expected_docs";
const REFERENCE = "reference_answer is blank";
const ROUTE = "expected_route must be one of researcher, code_advisor, writer, refuse";
const NEEDS_TOOLS = "an action item needs expected_tools";
const NOT_A_TOOL = "'open_ticket' is not a tool of the desk";
const STEPS = "max_steps must be an int of 1 or more";
const ARGS = "expected_args names 'search_peps', which is not in expected_tools";

type Case = { title: string; item: string; options: string[]; correct: string[]; why: string };

const CASES: Case[] = [
  {
    title: "A retrieval item that lists no documents",
    item: `{
  "id": "q23",
  "question": "What does PEP 20 say about readability?",
  "slice": "retrieval",
  "expected_docs": [],
  "answerable": true,
  "source": "human"
}`,
    options: [UNANSWERABLE, QUESTION, ANSWERABLE, SOURCE],
    correct: [ANSWERABLE],
    why: "The item says the PEPs can answer the question, and it names no PEP that holds the answer. Retrieval has nothing to score against, so the rule asks for the documents.",
  },
  {
    title: "A routing item with a route the desk does not have",
    item: `{
  "id": "r17",
  "question": "Add a note to PEP 8 about tabs.",
  "answerable": true,
  "slice": "routing",
  "expected_route": "planner",
  "source": "human"
}`,
    options: [ANSWERABLE, SOURCE, ROUTE, SLICE],
    correct: [ROUTE],
    why: "The desk has four routes, and planner is not one. The answerable rule does not apply here, because it covers retrieval and answer items only. A routing item can say answerable with no documents.",
  },
  {
    title: "An action item with two broken fields",
    item: `{
  "id": "t21",
  "question": "Open a ticket for the missing PEP 8 example.",
  "slice": "action",
  "expected_tools": ["open_ticket"],
  "expected_args": {"search_peps": {"query": "PEP 8"}},
  "max_steps": 0,
  "source": "human"
}`,
    options: [NEEDS_TOOLS, ARGS, NOT_A_TOOL, STEPS, ROUTE],
    correct: [ARGS, STEPS],
    why: "The tool list holds open_ticket, which is a real tool, so the two tool rules pass. But expected_args names search_peps, which the list does not hold. And zero is not a step budget. One call returns both messages.",
  },
  {
    title: "An answer item whose reference answer is a space",
    item: `{
  "id": "a15",
  "question": "Which operator does PEP 572 add?",
  "expected_docs": [572],
  "answerable": true,
  "slice": "answer",
  "reference_answer": " ",
  "source": "human"
}`,
    options: [ANSWERABLE, REFERENCE, UNANSWERABLE, SOURCE],
    correct: [REFERENCE],
    why: "The item lists PEP 572, so the answerable rules pass. A reference answer that is only a space gives a grader nothing to compare with. Blank counts after the text is stripped.",
  },
  {
    title: "An item with an unknown slice and a blank question",
    item: `{
  "id": "x1",
  "question": "  ",
  "slice": "ranking",
  "expected_route": "planner",
  "source": "human"
}`,
    options: [ROUTE, QUESTION, ID, SLICE, SOURCE],
    correct: [QUESTION, SLICE],
    why: "The id and source are fine. The blank question is found first, and then the unknown slice stops the check, because the slice decides which rules apply. The planner route is never looked at.",
  },
  {
    title: "A routing item that follows every rule",
    item: `{
  "id": "r30",
  "question": "Which PEP added the walrus operator?",
  "answerable": true,
  "slice": "routing",
  "expected_route": "researcher",
  "source": "human"
}`,
    options: [ROUTE, ANSWERABLE, SOURCE, QUESTION],
    correct: [],
    why: "The route is real, the source is on the list and the question has text. The answerable rule does not apply to routing. A valid item gets an empty list.",
  },
];

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

export default function Evals01RuleCheck({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [checked, setChecked] = useState(false);
  const [right, setRight] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);

  const c = CASES[index];
  const isRight = sameSet(picks, c.correct);
  const resolved = checked && (isRight || attempts >= 2);
  const last = index === CASES.length - 1;

  const toggle = (m: string) => {
    if (checked) return;
    setPicks((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]));
  };

  const check = () => {
    setAttempts((n) => n + 1);
    setChecked(true);
  };

  const next = () => {
    const rights = [...right, isRight];
    setRight(rights);
    if (last) {
      setFinished(true);
      complete(`${rights.filter(Boolean).length} of ${CASES.length} items right`);
      return;
    }
    setIndex(index + 1);
    setPicks([]);
    setAttempts(0);
    setChecked(false);
  };

  const score = right.filter(Boolean).length;

  if (finished) {
    return (
      <div className="w-panel evals01-rule-check">
        <div className="w-verdict good" role="status">
          You got {score} of {CASES.length} items right. A rule applies only to its slice, so read the slice first. The check reports every broken rule in one call, and a valid item reports none.
        </div>
      </div>
    );
  }

  const hit = picks.filter((m) => c.correct.includes(m)).length;

  return (
    <div className="w-panel evals01-rule-check">
      <div className="w-row between">
        <span className="w-label">
          Item {index + 1} of {CASES.length}
        </span>
        <span className="w-label">{c.title}</span>
      </div>
      <pre className="evals01-rule-check-item w-mono" aria-label="The item">
        {c.item}
      </pre>

      <div className="evals01-rule-check-group" role="group" aria-label="Messages validate_item returns">
        <span className="w-label">Select every message validate_item returns. Select none if the item is valid.</span>
        <div className="evals01-rule-check-options">
          {c.options.map((m) => {
            const on = picks.includes(m);
            const state = checked && (isRight || attempts >= 2) ? (c.correct.includes(m) ? " right" : on ? " wrong" : "") : "";
            return (
              <button
                key={m}
                type="button"
                className={`w-chip evals01-rule-check-option${state}`}
                aria-pressed={on}
                disabled={checked}
                onClick={() => toggle(m)}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-row">
        {!checked && (
          <button type="button" className="w-btn primary" onClick={check}>
            Check this item
          </button>
        )}
        {checked && !resolved && (
          <button type="button" className="w-btn ghost" onClick={() => setChecked(false)}>
            Change my picks
          </button>
        )}
        {resolved && (
          <button type="button" className="w-btn primary" onClick={next}>
            {last ? "See the result" : "Next item"}
          </button>
        )}
      </div>

      {checked && (
        <div className={`w-verdict ${isRight ? "good" : "bad"}`} role="status">
          {isRight
            ? `Correct. ${c.why}`
            : attempts >= 2
              ? `Not quite. ${c.correct.length === 0 ? "This item is valid, so no message is right." : c.correct.length === 1 ? "The right message is marked." : "The right messages are marked."} ${c.why}`
              : `Not yet. You picked ${picks.length} and ${hit} of them ${hit === 1 ? "is" : "are"} right, and the item has ${c.correct.length} to find. Change your picks and try once more.`}
        </div>
      )}
    </div>
  );
}
