import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Guardrails02ActionChooser.css";

// Each case is a failed answer from the output guard. The error text is what CitationsRetrieved
// returns for that answer. The wait is 3 seconds for each model call, as the chapter says.

type Action = "reask" | "fix" | "refuse";
type Outcome = { user: string; calls: number };
type Case = {
  title: string;
  scene: string;
  answer: string;
  error: string;
  best: Action;
  outcomes: Record<Action, Outcome>;
  why: string;
};

const SECONDS_PER_CALL = 3;
const LABEL: Record<Action, string> = { reask: "Reask", fix: "Fix", refuse: "Refuse" };
const ORDER: Action[] = ["reask", "fix", "refuse"];

const CASES: Case[] = [
  {
    title: "Case 1: a stray marker on a quick lookup",
    scene:
      "A user asks how the walrus operator works. Two sources came back. The third sentence is true, and source 2 supports it, but the writer ended it with a marker for a third source.",
    answer:
      "Assignment expressions bind a name inside an expression [1]. The notation is `:=` [1]. They also work in `while` conditions [3].",
    error: "The answer cites [3], but only sources 1 to 2 exist. Cite only those sources, or cite none.",
    best: "fix",
    outcomes: {
      reask: {
        user: "A new answer after a wait. The model most likely writes the same text with [2]. The user paid a model call to move one digit.",
        calls: 1,
      },
      fix: {
        user: "The same answer without [3]. The third sentence is still true, so the user loses only a marker.",
        calls: 0,
      },
      refuse: {
        user: "The block message and no answer. A correct answer is lost over one stray marker.",
        calls: 0,
      },
    },
    why: "Nothing hangs on this error, and the text stays right without the marker. A fix costs nothing. A reask is a wait for no gain, and a refuse throws a good answer away.",
  },
  {
    title: "Case 2: a draft that a person will send outside the company",
    scene:
      "A user asks the desk to draft a note about PEP 572 for a customer. Three sources came back. One sentence ends with [5], and none of the three sources says it.",
    answer:
      "PEP 572 adds the `:=` operator [1]. The steering council approved it unanimously [5]. The Rationale section gives examples [2].",
    error: "The answer cites [5], but only sources 1 to 3 exist. Cite only those sources, or cite none.",
    best: "reask",
    outcomes: {
      reask: {
        user: "A new answer after a wait. The error names the bad number, so the model can cite a real source or drop the claim. If the new answer fails too, a fix applies.",
        calls: 1,
      },
      fix: {
        user: "The draft without [5]. The made-up sentence stays, and it now reads like plain fact in a note that leaves the company.",
        calls: 0,
      },
      refuse: {
        user: "The block message and no draft. The person starts again from nothing.",
        calls: 0,
      },
    },
    why: "A person will send this text to others, so a stripped marker is the worst result. Three seconds is a small price next to a false claim in a customer's inbox. A reask gives the model a chance to drop it.",
  },
  {
    title: "Case 3: markers with no sources behind them",
    scene:
      "A user asks about a PEP that the index doesn't hold. The researcher found no passages. The writer answered from memory and cited two sources anyway.",
    answer: "PEP 9999 limits an expression to three nested assignment expressions [1][2].",
    error: "The answer cites [1], [2], but no sources were retrieved. Cite only those sources, or cite none.",
    best: "refuse",
    outcomes: {
      reask: {
        user: "A new answer after a wait. The model still has no passages, so it can only drop the markers or invent again.",
        calls: 1,
      },
      fix: {
        user: "The answer without its markers. It reads as a confident claim with no evidence behind it, and the user can't tell.",
        calls: 0,
      },
      refuse: {
        user: "The block message and no answer. The audit trail records the block, and no made-up claim leaves the desk.",
        calls: 0,
      },
    },
    why: "With no sources, every marker is out of range, and no repair gives the writer something to cite. Only a refuse stops the claim. The user can ask again once the index holds the PEP.",
  },
];

function waitText(calls: number): string {
  if (calls === 0) return "No extra model calls, so no extra wait.";
  const secs = calls * SECONDS_PER_CALL;
  return `${calls} extra model call, so ${secs} seconds of extra wait.`;
}

export default function Guardrails02ActionChooser({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState<Action | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const c = CASES[index];
  const right = pick === c.best;

  const check = () => {
    if (pick === null) return;
    const n = attempts + 1;
    setAttempts(n);
    if (pick === c.best || n >= 2) {
      setResolved(true);
      if (pick === c.best && n === 1) setFirstTry((k) => k + 1);
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
      complete(`Chose the right action on the first try in ${firstTry} of ${CASES.length} cases`);
    }
  };

  return (
    <div className="w-panel guardrails02-action-chooser">
      <div className="w-row between">
        <span className="w-label">{c.title}</span>
        <span className="guardrails02-action-chooser-count">
          {index + 1} of {CASES.length}
        </span>
      </div>

      <p className="guardrails02-action-chooser-scene">{c.scene}</p>
      <blockquote className="guardrails02-action-chooser-answer">{c.answer}</blockquote>
      <p className="guardrails02-action-chooser-error">
        <span className="w-label">The check says</span>
        <span className="w-mono">{c.error}</span>
      </p>

      <div className="guardrails02-action-chooser-group" role="radiogroup" aria-label="Your choice of action">
        <span className="w-label">Predict: which action fits this case?</span>
        <div className="guardrails02-action-chooser-opts">
          {ORDER.map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={pick === a}
              className={`guardrails02-action-chooser-opt${pick === a ? " on" : ""}`}
              disabled={resolved}
              onClick={() => setPick(a)}
            >
              {LABEL[a]}
            </button>
          ))}
        </div>
      </div>

      <div className="w-row">
        {!resolved && (
          <button type="button" className="w-btn primary" disabled={pick === null} onClick={check}>
            Check my choice
          </button>
        )}
        {resolved && !finished && (
          <button type="button" className="w-btn ghost" onClick={next}>
            {index + 1 < CASES.length ? "Next case" : "Finish"}
          </button>
        )}
      </div>

      {attempts > 0 && !resolved && (
        <div className="w-verdict bad" role="status">
          Not quite. Ask who reads this text next and what a wrong claim would cost them. Then pick again.
        </div>
      )}

      {resolved && (
        <>
          <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
            <strong>{right ? "Correct. " : "Not quite. "}</strong>
            The best action is {LABEL[c.best].toLowerCase()}. {c.why}
          </div>
          <ul className="guardrails02-action-chooser-results" aria-label="What each action would have done">
            {ORDER.map((a) => (
              <li key={a} className={`guardrails02-action-chooser-result${a === c.best ? " best" : ""}`}>
                <span className="w-row between">
                  <strong>{LABEL[a]}</strong>
                  {a === c.best && <span className="w-chip good">Best fit</span>}
                </span>
                <span>{c.outcomes[a].user}</span>
                <span className="guardrails02-action-chooser-cost">{waitText(c.outcomes[a].calls)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {finished && (
        <div className="w-verdict good" role="status">
          You chose the right action on the first try in {firstTry} of {CASES.length} cases. The rule: fix what is cheap and harmless, reask what a person will rely on, and refuse what has no evidence behind it.
        </div>
      )}
    </div>
  );
}
