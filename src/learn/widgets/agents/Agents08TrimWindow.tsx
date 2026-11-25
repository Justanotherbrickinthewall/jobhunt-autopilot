import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents08TrimWindow.css";

// One desk thread with the size of each message in estimated tokens.
type Role = "human" | "call" | "result" | "answer";
type Msg = { role: Role; text: string; tokens: number };

const THREAD: Msg[] = [
  { role: "human", text: "What does PEP 572 say about the walrus operator?", tokens: 15 },
  { role: "call", text: "Calls search_peps", tokens: 12 },
  { role: "result", text: "search_peps result: five hits", tokens: 700 },
  { role: "call", text: "Calls read_pep_section", tokens: 14 },
  { role: "result", text: "read_pep_section result: the Syntax section, 8,000 characters", tokens: 2000 },
  { role: "answer", text: "The answer, with citations", tokens: 180 },
  { role: "human", text: "Which Python version added it?", tokens: 12 },
  { role: "call", text: "Calls search_peps", tokens: 10 },
  { role: "result", text: "search_peps result: the version header", tokens: 500 },
  { role: "answer", text: "Python 3.8 [1].", tokens: 60 },
  { role: "human", text: "Check this code for me: a pasted function", tokens: 350 },
  { role: "answer", text: "The code review", tokens: 420 },
  { role: "human", text: "Does it still work on my version?", tokens: 12 },
];

const ROLE_LABEL: Record<Role, string> = { human: "User", call: "Tool call", result: "Tool result", answer: "Answer" };
const BUDGETS = [6000, 2400, 1345, 5];
const N = THREAD.length;
const fmt = (n: number) => n.toLocaleString("en-GB");
const sum = (from: number) => THREAD.slice(from).reduce((t, m) => t + m.tokens, 0);

type Why = "current" | "fits" | "stop" | "older" | "lead";

// A mirror of trim_to_budget. `reasons` says what happened to each message.
function trim(budget: number) {
  let lastHuman = 0;
  THREAD.forEach((m, i) => {
    if (m.role === "human") lastHuman = i;
  });
  const reasons: Why[] = THREAD.map((_, i) => (i >= lastHuman ? "current" : "older"));
  let start = lastHuman;
  let left = budget - sum(lastHuman);
  for (let i = lastHuman - 1; i >= 0; i -= 1) {
    if (THREAD[i].tokens > left) {
      reasons[i] = "stop";
      break;
    }
    reasons[i] = "fits";
    start = i;
    left -= THREAD[i].tokens;
  }
  while (N - start > 1 && THREAD[start].role !== "human") {
    reasons[start] = "lead";
    start += 1;
  }
  return { start, reasons };
}

const REASON_TEXT: Record<Why, string> = {
  current: "Current turn. It always stays.",
  fits: "Fits the budget.",
  stop: "Does not fit, so the walk back stops here.",
  older: "Older than the stop, so it is never considered.",
  lead: "Fits, but the list cannot start on this message.",
};

const LESSONS = [
  "The whole thread is 4,285 tokens and the budget is 6,000. Everything fits, so nothing is cut.",
  "The 2,000-token section result does not fit, so the walk stops there. The 180-token answer after it did fit. But a list cannot start on an answer, so it is dropped too.",
  "The 500-token search result fits, but the 10-token call before it does not. A result with no call is rejected by the provider. So the result goes, then the answer after it, and the list starts on a user message.",
  "The current turn alone is 12 tokens, over a budget of 5. It stays anyway. Every older message goes.",
];

export default function Agents08TrimWindow({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [round, setRound] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [right, setRight] = useState(0);

  const budget = BUDGETS[round];
  const answer = trim(budget);
  const last = round === BUDGETS.length - 1;
  const seenTokens = pick === null ? null : sum(pick);

  const check = () => {
    if (pick === null) return;
    setChecked(true);
    const ok = pick === answer.start;
    const total = right + (ok ? 1 : 0);
    if (ok) setRight(total);
    if (last) complete(`Predicted ${total} of ${BUDGETS.length} trims correctly`);
  };

  const next = () => {
    setRound((r) => r + 1);
    setPick(null);
    setChecked(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel agents08-trim-window">
        <div className="w-row between">
          <span className="w-label">
            Budget {round + 1} of {BUDGETS.length}
          </span>
          <span className="w-chip is-on">{fmt(budget)} tokens</span>
        </div>

        <p className="agents08-trim-window-note">Click the first message the model will see. The model always sees every message from there to the end.</p>

        <ol className="agents08-trim-window-list">
          {THREAD.map((m, i) => {
            const chosen = pick === i;
            const inView = pick !== null && i >= pick;
            return (
              <li key={i} className={`agents08-trim-window-item ${m.role}${inView ? " in-view" : ""}${chosen ? " chosen" : ""}`}>
                <button type="button" className="agents08-trim-window-btn" disabled={checked} aria-pressed={chosen} onClick={() => setPick(i)}>
                  <span className="agents08-trim-window-n">{i}</span>
                  <span className="agents08-trim-window-text">
                    <span className="agents08-trim-window-role">{ROLE_LABEL[m.role]}</span> {m.text}
                  </span>
                  <span className="agents08-trim-window-tokens w-mono">{fmt(m.tokens)}</span>
                </button>
                {checked && (
                  <span className={`agents08-trim-window-why ${answer.reasons[i]}`}>
                    {i >= answer.start ? "In the model's view. " : "Cut. "}
                    {REASON_TEXT[answer.reasons[i]]}
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        <div className="agents08-trim-window-meter w-inset" role="status">
          {seenTokens === null ? (
            <span>Pick a starting message to see the size of the view.</span>
          ) : (
            <span>
              From message {pick}, the model sees {fmt(seenTokens)} tokens of a {fmt(budget)} budget.
            </span>
          )}
        </div>

        <div className="w-row">
          {!checked && (
            <button type="button" className="w-btn primary" onClick={check} disabled={pick === null}>
              Check
            </button>
          )}
          {checked && !last && (
            <button type="button" className="w-btn primary" onClick={next}>
              Next budget
            </button>
          )}
        </div>

        {checked && (
          <motion.div className={`w-verdict ${pick === answer.start ? "good" : "bad"}`} role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <strong>{pick === answer.start ? "Right." : `The view starts at message ${answer.start}.`}</strong> {LESSONS[round]}
            {last && (
              <span>
                {" "}
                You predicted {right} of {BUDGETS.length} trims correctly.
              </span>
            )}
          </motion.div>
        )}
      </div>
    </MotionConfig>
  );
}
