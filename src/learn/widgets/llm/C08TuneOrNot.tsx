import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C08TuneOrNot.css";

type Step = "prompt" | "retrieve" | "tune";
type Req = { id: string; text: string; answer: Step; why: string };

const STEPS: { id: Step; label: string }[] = [
  { id: "prompt", label: "Prompt" },
  { id: "retrieve", label: "Retrieve" },
  { id: "tune", label: "Tune" },
];

const REQS: Req[] = [
  {
    id: "r1",
    text: "The model wraps its JSON in a friendly sentence and writes supplier names in capitals. No one has tightened the output contract yet.",
    answer: "prompt",
    why: "A format miss is a misread task. State the contract, add one example and rerun the eval before you spend on anything else.",
  },
  {
    id: "r2",
    text: "Answers must quote Harbour's payment terms, which finance edits every month.",
    answer: "retrieve",
    why: "Terms change monthly. Training freezes a snapshot, so the model would quote last month. Retrieval reads the current text each time.",
  },
  {
    id: "r3",
    text: "Harbour forecasts 2 million invoice lines a month, each coded to one of 40 ledger codes. A prompted large model is accurate but too dear. You hold 3,000 labelled lines.",
    answer: "tune",
    why: "The task is narrow and stable, the volume is high and the data exists. Tuning a small model lowers the cost per call.",
  },
  {
    id: "r4",
    text: "Staff want answers from a 300-page supplier contract the model has never seen.",
    answer: "retrieve",
    why: "This is a knowledge gap. Tuning is a poor way to add facts, and the contract needs citations. Retrieve the clauses.",
  },
  {
    id: "r5",
    text: "Even with a clear prompt and five examples, replies hit Harbour's house tone about 7 times in 10. You hold 4,000 approved replies.",
    answer: "tune",
    why: "Tone is style, and style is what tuning changes well. The prompt has already been tried and the examples exist.",
  },
  {
    id: "r6",
    text: "Credit notes should show negative totals. The rule is not in the prompt yet, and the model shows them as positive.",
    answer: "prompt",
    why: "The model was never told the rule. Write it into the prompt first. It costs minutes and you can undo it.",
  },
  {
    id: "r7",
    text: "Harbour's staff chat assistant talks about football. Nothing in its system prompt limits it to accounts payable work.",
    answer: "prompt",
    why: "Scope is a prompt job. Add the boundary and a refusal line, then test it with off-topic cases.",
  },
  {
    id: "r8",
    text: "A small model must extract 12 fields from one fixed form on a laptop with no network. The form is a remittance advice, a note saying which invoices a payment covers. You hold 1,500 labelled forms.",
    answer: "tune",
    why: "A fixed layout, a small model and an offline limit rule out calling a large model. Tuning fits a narrow task with data.",
  },
];

export default function C08TuneOrNot({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<Record<string, Step>>({});
  const [attempts, setAttempts] = useState(0);
  const [done, setDone] = useState(false);

  const allPicked = REQS.every((r) => picks[r.id]);
  const wrong = attempts > 0 ? REQS.filter((r) => picks[r.id] !== r.answer) : [];
  const score = REQS.length - wrong.length;
  const reveal = done;

  const check = () => {
    const n = attempts + 1;
    setAttempts(n);
    const miss = REQS.filter((r) => picks[r.id] !== r.answer).length;
    if (miss === 0) {
      setDone(true);
      complete("Sent all eight requests to the right step");
    } else if (n >= 2) {
      setDone(true);
      complete(`Got ${REQS.length - miss} of ${REQS.length}; read the explanations`);
    }
  };

  const pick = (id: string, s: Step) => {
    if (done) return;
    setPicks((p) => ({ ...p, [id]: s }));
  };

  return (
    <div className="w-panel llm-tune-or-not">
      <p className="llm-tune-or-not-note">Illustrative requests from Harbour Supplies. Pick the first step that should be tried.</p>
      <ol className="llm-tune-or-not-list">
        {REQS.map((r, i) => {
          const isWrong = attempts > 0 && picks[r.id] !== r.answer;
          return (
            <li key={r.id} className={`llm-tune-or-not-item${isWrong ? " miss" : ""}${reveal ? " shown" : ""}`}>
              <p className="llm-tune-or-not-text">
                <span className="w-mono">{i + 1}.</span> {r.text}
              </p>
              <div className="w-row" role="group" aria-label={`Request ${i + 1}`}>
                {STEPS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="w-chip"
                    aria-pressed={picks[r.id] === s.id}
                    disabled={done}
                    onClick={() => pick(r.id, s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {reveal && (
                <p className={`llm-tune-or-not-why ${picks[r.id] === r.answer ? "ok" : "no"}`}>
                  {picks[r.id] === r.answer ? "Right. " : `Best first step: ${STEPS.find((s) => s.id === r.answer)!.label}. `}
                  {r.why}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {!done && (
        <div className="w-row">
          <button type="button" className="w-btn" disabled={!allPicked} onClick={check}>
            {attempts === 0 ? "Check my answers" : "Check again"}
          </button>
        </div>
      )}

      {attempts > 0 && !done && (
        <div className="w-verdict bad" role="status">
          {score} of {REQS.length} are right. The highlighted requests need another look. Ask what the model is missing: instructions, facts, or consistency at volume.
        </div>
      )}
      {done && (
        <div className={`w-verdict ${wrong.length === 0 ? "good" : "bad"}`} role="status">
          {wrong.length === 0
            ? "All eight are right. Notice that tuning won only when the task was narrow, stable and backed by labelled data."
            : `${score} of ${REQS.length} right. The explanations above show the question that sends each request to its step.`}
        </div>
      )}
    </div>
  );
}
