import { useState } from "react";
import { MotionConfig } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C07ReasonOrNot.css";

type Choice = "standard" | "reasoning" | "code";
const CHOICES: { id: Choice; name: string }[] = [
  { id: "standard", name: "Standard model" },
  { id: "reasoning", name: "Reasoning model" },
  { id: "code", name: "Plain code" },
];

// Illustrative Harbour tasks.
const TASKS: { task: string; answer: Choice; hint: string; why: string }[] = [
  {
    task: "Return the supplier ID for the name on a typed invoice header, from a list of 300 suppliers.",
    answer: "standard",
    hint: "Count the steps. Does a later step need an earlier result?",
    why: "It is one step against a short list. Reasoning adds about four seconds for about one point.",
  },
  {
    task: "Reconcile a 40-line supplier statement with 6 credit notes and 3 part payments against the ledger.",
    answer: "reasoning",
    hint: "Each match changes what the next one means.",
    why: "The steps depend on each other, and a wrong balance means a payment error. This is where reasoning lifts the pass rate most.",
  },
  {
    task: "Add the 40 line amounts on an invoice and compare the sum with the stated total.",
    answer: "code",
    hint: "Is a model needed at all for this check?",
    why: "Arithmetic belongs in code. A function is exact and free, and a model can still slip with or without reasoning.",
  },
  {
    task: "Label an inbound email as invoice, query or spam while the sender waits for a receipt.",
    answer: "standard",
    hint: "Check the latency limit before the accuracy gain.",
    why: "It is a single-step label on a path where someone is waiting. Extra seconds fail the latency check.",
  },
  {
    task: "Choose which of three similar invoices to pay. One is a duplicate, one reverses a credit note and one is a late resubmission.",
    answer: "reasoning",
    hint: "Comparing amounts, dates and reference chains takes several linked steps.",
    why: "The answer depends on a chain of comparisons. A clear prompt alone tends to miss the credit-note link, so reasoning earns its cost.",
  },
  {
    task: "Rewrite the reason a payment is on hold in a polite tone, for a supplier email.",
    answer: "standard",
    hint: "Is there anything to check or compute?",
    why: "Rewriting is a single step with nothing to verify. Reasoning only adds cost and delay.",
  },
];

export default function C07ReasonOrNot({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [i, setI] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [wrong, setWrong] = useState<Choice[]>([]);
  const [resolved, setResolved] = useState<null | boolean>(null);
  const [score, setScore] = useState(0);

  const t = TASKS[i];
  const last = i === TASKS.length - 1;

  const choose = (c: Choice) => {
    if (resolved !== null || wrong.includes(c)) return;
    const n = attempts + 1;
    setAttempts(n);
    if (c === t.answer) {
      setResolved(true);
      const next = score + 1;
      setScore(next);
      if (last) complete(`${next} of ${TASKS.length} routed correctly`);
    } else if (n >= 2) {
      setResolved(false);
      setWrong([...wrong, c]);
      if (last) complete(`${score} of ${TASKS.length} routed correctly`);
    } else {
      setWrong([...wrong, c]);
    }
  };

  const next = () => {
    setI(i + 1);
    setAttempts(0);
    setWrong([]);
    setResolved(null);
  };

  const answerName = CHOICES.find((c) => c.id === t.answer)?.name.toLowerCase();

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel llm-reason-or-not">
        <p className="w-label">Task {i + 1} of {TASKS.length}. Illustrative Harbour tasks.</p>
        <div className="w-inset">{t.task}</div>
        <p>What should do this work?</p>
        <div className="w-row" role="group" aria-label="Choice">
          {CHOICES.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={resolved !== null || wrong.includes(c.id)}
              className={`w-chip${resolved !== null && c.id === t.answer ? " good" : wrong.includes(c.id) ? " bad" : ""}`}
              onClick={() => choose(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
        {resolved === null && wrong.length > 0 && (
          <div className="w-verdict bad" role="status">
            Not quite. {t.hint}
          </div>
        )}
        {resolved !== null && (
          <div className={`w-verdict ${resolved ? "good" : "bad"}`} role="status">
            {resolved ? "Correct. " : `The answer is ${answerName}. `}
            {t.why}
            {last && ` You routed ${score} of ${TASKS.length} correctly. Reasoning needs dependent steps, a failure a clear prompt cannot fix, a gain that repays the cost and room in the latency budget.`}
          </div>
        )}
        {resolved !== null && !last && (
          <button type="button" className="w-btn" onClick={next}>
            Next task
          </button>
        )}
      </div>
    </MotionConfig>
  );
}
