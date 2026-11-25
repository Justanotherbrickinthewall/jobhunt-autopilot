import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Guardrails06DecisionPaths.css";

// Illustrative request. The 60-minute window is the default of APPROVAL_TIMEOUT_SECONDS (3600).
const OPTIONS = [
  "It files the draft as written, with the approver's name on the ticket.",
  "It files the edited draft.",
  "It files nothing, and the run ends as rejected.",
  "It files nothing, and the run ends as timed out.",
  "It refuses the decision, and the run keeps waiting.",
];

type Case = { text: string; hint: string; answer: number; explain: string };

const CASES: Case[] = [
  {
    text: "Ada, an admin, reads the draft and sends an approve.",
    hint: "Think about which draft an approve refers to.",
    answer: 0,
    explain:
      "An approve says yes to the request as it stands, so the desk files the request's draft. The ticket records Stan as the creator and Ada as the approver.",
  },
  {
    text: "Ada changes the title to 'Fix the walrus docs' and sends an edit.",
    hint: "An edit carries a draft of its own.",
    answer: 1,
    explain:
      "An edit must carry a valid draft, and the desk files that one. An edit with no valid draft raises a ValueError instead, and the run keeps waiting.",
  },
  {
    text: "Ada sends a reject, with the reason 'Duplicate of ticket 41'.",
    hint: "What does the halt middleware do when a tool sets a halting stop reason?",
    answer: 2,
    explain:
      "A reject files nothing. The tool sets approval_rejected, and the halt middleware ends the agent with a fixed message. The model never writes that reply.",
  },
  {
    text: "Ada sends an approve 90 minutes after the request was made. The window was 60 minutes.",
    hint: "Compare the time with expires_at. What does settle_approval do with a late decision?",
    answer: 3,
    explain:
      "A decision after expires_at becomes a timeout, whatever it said. The audit row keeps Ada's name, and its reason says the decision came late.",
  },
  {
    text: "Rita, a reader, sends an approve.",
    hint: "Which role does approve_ticket need?",
    answer: 4,
    explain:
      "A reader ranks below staff. prepare_resume raises PermissionError, the route answers 403, and the denial goes to the audit trail. The run keeps waiting for someone with the right role.",
  },
  {
    text: "Stan asked for the ticket. Stan's role is staff, and Stan sends an approve for it.",
    hint: "Does the policy check the role, the name, or both?",
    answer: 0,
    explain:
      "AskPEP checks the role and nothing else, so Stan may approve the request Stan made. The ticket records Stan as creator and as approver. A stricter desk would compare the two names and refuse a match.",
  },
];

type Phase = "ask" | "retry" | "done";

export default function Guardrails06DecisionPaths({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [tries, setTries] = useState(0);
  const [phase, setPhase] = useState<Phase>("ask");
  const [lastRight, setLastRight] = useState(false);
  const [firstTime, setFirstTime] = useState(0);

  const c = CASES[index];
  const isLast = index === CASES.length - 1;

  const check = () => {
    if (choice === null) return;
    const right = choice === c.answer;
    const n = tries + 1;
    setTries(n);
    setLastRight(right);
    const firstTimeNow = firstTime + (right && n === 1 ? 1 : 0);
    if (right && n === 1) setFirstTime(firstTimeNow);
    if (right || n >= 2) {
      setPhase("done");
      if (isLast) complete(`${firstTimeNow} of ${CASES.length} right first time`);
    } else {
      setPhase("retry");
      setChoice(null);
    }
  };

  const next = () => {
    setIndex(index + 1);
    setChoice(null);
    setTries(0);
    setPhase("ask");
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel guardrails06-decision-paths">
        <div className="w-inset guardrails06-decision-paths-request">
          <span className="w-label">The waiting request</span>
          <p>
            Stan, who has the role staff, asked the desk to open a ticket titled <strong>Fix the PEP 572 page</strong> about PEP 572. The run paused. The
            request expires 60 minutes after it was made. These times are illustrative.
          </p>
        </div>

        <p className="w-label" aria-live="polite">
          Decision {index + 1} of {CASES.length}
        </p>
        <p className="guardrails06-decision-paths-case">{c.text}</p>

        <fieldset className="guardrails06-decision-paths-options" disabled={phase === "done"}>
          <legend className="w-label">What does the desk do next?</legend>
          {OPTIONS.map((option, i) => (
            <label key={option} className={`guardrails06-decision-paths-option${choice === i ? " on" : ""}`}>
              <input
                type="radio"
                name="guardrails06-decision-paths-option"
                checked={choice === i}
                onChange={() => {
                  setChoice(i);
                  if (phase === "retry") setPhase("ask");
                }}
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>

        <div className="w-row">
          {phase !== "done" && (
            <button type="button" className="w-btn primary" onClick={check} disabled={choice === null}>
              Check my answer
            </button>
          )}
          {phase === "done" && !isLast && (
            <button type="button" className="w-btn primary" onClick={next}>
              Next decision
            </button>
          )}
        </div>

        {phase === "retry" && (
          <div className="w-verdict bad" role="status">
            <strong>Not quite.</strong> {c.hint} Choose again.
          </div>
        )}

        {phase === "done" && (
          <motion.div
            className={`w-verdict ${lastRight ? "good" : "bad"}`}
            role="status"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <strong>{lastRight ? "Right." : `Not this time. The answer is: ${OPTIONS[c.answer]}`}</strong> {c.explain}
          </motion.div>
        )}

        {phase === "done" && isLast && (
          <p className="guardrails06-decision-paths-sum" role="status">
            {firstTime} of {CASES.length} right first time. Only an approve or an edit made in time, by someone with the role, files a ticket.
          </p>
        )}
      </div>
    </MotionConfig>
  );
}
