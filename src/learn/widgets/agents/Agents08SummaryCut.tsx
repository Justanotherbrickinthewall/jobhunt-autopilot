import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents08SummaryCut.css";

// One desk thread. Messages 12 and 13 answer the two calls in message 11, which asked for both tools at once.
type Role = "human" | "call" | "result" | "answer";
type Msg = { role: Role; text: string };

const THREAD: Msg[] = [
  { role: "human", text: "What does PEP 572 say about the walrus operator?" },
  { role: "call", text: "Calls search_peps" },
  { role: "result", text: "search_peps result: five hits" },
  { role: "call", text: "Calls read_pep_section" },
  { role: "result", text: "read_pep_section result: the Syntax section" },
  { role: "answer", text: "PEP 572 adds the := operator [1]." },
  { role: "human", text: "Which Python version added it?" },
  { role: "call", text: "Calls search_peps" },
  { role: "result", text: "search_peps result: the version header" },
  { role: "answer", text: "Python 3.8 [1]." },
  { role: "human", text: "Check this code for me: if (n := len(a)) > 10" },
  { role: "call", text: "Calls search_peps and read_pep_section together" },
  { role: "result", text: "search_peps result: three hits" },
  { role: "result", text: "read_pep_section result: the Examples section" },
  { role: "answer", text: "The code is fine on Python 3.8 or later." },
];

const ROLE_LABEL: Record<Role, string> = { human: "User", call: "Tool call", result: "Tool result", answer: "Answer" };
const ROUNDS = [6, 2, 15];
const DEFAULT_KEEP = 6;
const N = THREAD.length;

// A mirror of the cut in summarise_messages. Returns the naive cut, and the cut after the walk back.
// A result of 0 means the messages come back unchanged and the model is never asked.
function cutFor(keep: number) {
  const naive = N - keep;
  let cut = naive;
  while (cut > 0 && THREAD[cut].role === "result") cut -= 1;
  return { naive, cut: cut <= 0 ? 0 : cut };
}

function describe(cut: number) {
  if (cut === 0) return "Unchanged. The summariser is not asked.";
  const gone = cut === 1 ? "message 0" : `messages 0 to ${cut - 1}`;
  const kept = cut === N - 1 ? `message ${cut}` : `messages ${cut} to ${N - 1}`;
  return `One summary of ${gone}, then ${kept}.`;
}

function optionsFor(keep: number) {
  const { naive, cut } = cutFor(keep);
  const pool = [cut, naive, 0, cut + 1, cut - 1, N - DEFAULT_KEEP, N - 1];
  const seen: number[] = [];
  for (const c of pool) if (c >= 0 && c <= N - 1 && !seen.includes(c)) seen.push(c);
  return seen.slice(0, 4).sort((a, b) => a - b);
}

function lesson(keep: number) {
  const { naive, cut } = cutFor(keep);
  if (cut === 0) {
    return `With keep_last at ${keep}, the cut would fall at ${N - keep}, which leaves nothing before it. There is nothing older than the last ${keep} messages to summarise, so the list comes back unchanged and the model is never asked.`;
  }
  if (cut !== naive) {
    return `With keep_last at ${keep}, the cut first lands on message ${naive}, a tool result. It would leave the result without the call that asked for it. So it walks back to message ${cut}, the call, and keeps ${naive - cut} extra message${naive - cut === 1 ? "" : "s"}.`;
  }
  return `With keep_last at ${keep}, the cut lands on message ${cut}. That message is not a tool result, so the cut stays there. Messages 0 to ${cut - 1} become one summary.`;
}

export default function Agents08SummaryCut({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [round, setRound] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [right, setRight] = useState(0);

  const keep = ROUNDS[round];
  const { naive, cut } = cutFor(keep);
  const options = optionsFor(keep);
  const last = round === ROUNDS.length - 1;
  const shown = checked ? cut : null;

  const check = () => {
    if (pick === null) return;
    setChecked(true);
    const ok = pick === cut;
    const total = right + (ok ? 1 : 0);
    if (ok) setRight(total);
    if (last) complete(`Placed ${total} of ${ROUNDS.length} cuts correctly`);
  };

  const next = () => {
    setRound((r) => r + 1);
    setPick(null);
    setChecked(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel agents08-summary-cut">
        <div className="w-row between">
          <span className="w-label">
            Setting {round + 1} of {ROUNDS.length}
          </span>
          <span className="w-mono agents08-summary-cut-keep">
            keep_last = {keep} of {N} messages
          </span>
        </div>

        <ol className="agents08-summary-cut-list">
          {shown !== null && shown > 0 && (
            <motion.li className="agents08-summary-cut-row summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <span className="agents08-summary-cut-n">S</span>
              <span className="agents08-summary-cut-text">Summary of the earlier conversation: written by the model, one message.</span>
              <span className="w-chip good">new</span>
            </motion.li>
          )}
          {THREAD.map((m, i) => {
            const state = shown === null ? "" : i < shown ? "gone" : "kept";
            const moved = shown !== null && shown > 0 && shown !== naive && i >= shown && i < naive;
            return (
              <li key={i} className={`agents08-summary-cut-row ${m.role} ${state}`}>
                <span className="agents08-summary-cut-n">{i}</span>
                <span className="agents08-summary-cut-text">
                  <span className="agents08-summary-cut-role">{ROLE_LABEL[m.role]}</span> {m.text}
                </span>
                {shown !== null && state === "gone" && <span className="w-chip">becomes the summary</span>}
                {shown !== null && state === "kept" && !moved && <span className="w-chip good">kept</span>}
                {moved && <span className="w-chip warn">kept, the cut moved back</span>}
              </li>
            );
          })}
        </ol>

        <fieldset className="agents08-summary-cut-options" disabled={checked}>
          <legend className="w-label">What does summarise_messages return?</legend>
          {options.map((c) => (
            <label key={c} className={`agents08-summary-cut-option${pick === c ? " on" : ""}`}>
              <input type="radio" name="agents08-summary-cut-option" checked={pick === c} onChange={() => setPick(c)} />
              <span>{describe(c)}</span>
            </label>
          ))}
        </fieldset>

        <div className="w-row">
          {!checked && (
            <button type="button" className="w-btn primary" onClick={check} disabled={pick === null}>
              Check
            </button>
          )}
          {checked && !last && (
            <button type="button" className="w-btn primary" onClick={next}>
              Next setting
            </button>
          )}
        </div>

        {checked && (
          <motion.div className={`w-verdict ${pick === cut ? "good" : "bad"}`} role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <strong>{pick === cut ? "Right." : "Not quite."}</strong> {lesson(keep)}
            {last && (
              <span>
                {" "}
                You placed {right} of {ROUNDS.length} cuts correctly.
              </span>
            )}
          </motion.div>
        )}
      </div>
    </MotionConfig>
  );
}
