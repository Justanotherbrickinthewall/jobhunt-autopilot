import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents01LoopStepper.css";

type Msg = { role: "user" | "assistant" | "tool"; label: string; body: string };

type Event = { prompt: string; options: string[]; answer: number; why: string; reveal?: Msg };

// An illustrative run of the PEP desk's researcher. The passages and counts are invented for teaching.
const EVENTS: Event[] = [
  {
    prompt: "The model has the question and the tool list. What is the next message?",
    options: [
      "A final answer written from memory.",
      "An assistant message asking to call search_peps.",
      "An assistant message asking to call open_ticket.",
    ],
    answer: 1,
    why: "The model has no PEP text yet, so it asks for a search first. An answer from memory risks an invented citation. A ticket would act before the question is even settled.",
    reveal: { role: "assistant", label: "tool call", body: 'search_peps(query="walrus operator assignment expression")' },
  },
  {
    prompt: "The model only asked for search_peps. Who runs it?",
    options: [
      "The model, inside the provider's service.",
      "Your code, which then adds the result to the history.",
      "The database, as soon as it sees the message.",
    ],
    answer: 1,
    why: "Your code ran the search and added the result to the history. The model never touched the corpus.",
    reveal: { role: "tool", label: "tool result", body: "3 passages, all from PEP 572. They give the := syntax. None says why people objected." },
  },
  {
    prompt: "The passages do not say why people objected. What is the next message?",
    options: [
      "A final answer that guesses at the objections.",
      "A second call to search_peps with new words.",
      "A call to open_ticket, to be safe.",
    ],
    answer: 1,
    why: "The first result did not answer the question, so the model searches again. The path depends on what the tool returned. That is what makes this an agent.",
    reveal: { role: "assistant", label: "tool call", body: 'search_peps(query="assignment expressions objections readability")' },
  },
  {
    prompt: "Your code runs the second search. What does it do with the result?",
    options: [
      "Adds it to the history, then calls the model again.",
      "Throws it away, because the model already searched once.",
      "Sends it to the user and ends the run.",
    ],
    answer: 0,
    why: "Every result goes into the history as one more message, and the model decides again. The loop has now turned twice.",
    reveal: { role: "tool", label: "tool result", body: "2 passages from the PEP 572 Rationale. Critics said := made code harder to read." },
  },
  {
    prompt: "Both results are in the history. What is the next message?",
    options: [
      "A third call to search_peps with the same words.",
      "A final answer with no tool call.",
      "A call to open_ticket.",
    ],
    answer: 1,
    why: "The model has what it needs, so it answers. A reply with no tool call is the stop signal, and your code ends the loop.",
    reveal: {
      role: "assistant",
      label: "final answer",
      body: "PEP 572 added the walrus operator in Python 3.8. Critics said it made code harder to read. Source: PEP 572.",
    },
  },
  {
    prompt: "That run is over. How many messages did the model receive on its last call?",
    options: ["1, only the newest result.", "3, the question and two calls.", "5, the question, both calls and both results."],
    answer: 2,
    why: "The model keeps nothing between calls. Your code resends the whole history on each model call, so context and cost grow with every step.",
  },
];

export default function Agents01LoopStepper({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [idx, setIdx] = useState(0);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "user", label: "user", body: "Which PEP added the walrus operator, and why was it contested?" },
  ]);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const total = EVENTS.length;
  const finished = idx >= EVENTS.length;
  const ev = EVENTS[Math.min(idx, EVENTS.length - 1)];

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const nextScore = score + (i === ev.answer ? 1 : 0);
    setScore(nextScore);
    if (ev.reveal) setMsgs((m) => [...m, ev.reveal as Msg]);
    // One completion, when the last case is answered.
    if (idx === EVENTS.length - 1) complete(`${nextScore} of ${total} correct`);
  };
  const next = () => {
    setIdx(idx + 1);
    setPicked(null);
  };
  const reset = () => {
    setIdx(0);
    setPicked(null);
    setScore(0);
    setMsgs([msgs[0]]);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel agents01-loop-stepper">
        <p className="agents01-loop-stepper-meta">
          Illustrative run. The model sees <strong>{msgs.length}</strong> message{msgs.length === 1 ? "" : "s"} on its next call.
        </p>
        <ol className="agents01-loop-stepper-log" aria-label="Message history">
          {msgs.map((m, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`agents01-loop-stepper-msg ${m.role}`}
            >
              <span className="agents01-loop-stepper-tag">{m.label}</span>
              <span className="agents01-loop-stepper-body">{m.body}</span>
            </motion.li>
          ))}
        </ol>

        {!finished && (
          <div className="agents01-loop-stepper-turn">
            <p className="agents01-loop-stepper-prompt">{ev.prompt}</p>
            <div className="agents01-loop-stepper-options" role="group" aria-label="Predict the next message">
              {ev.options.map((o, i) => {
                const state = picked === null ? "" : i === ev.answer ? " right" : i === picked ? " wrong" : "";
                return (
                  <button
                    key={o}
                    type="button"
                    className={`agents01-loop-stepper-opt${state}`}
                    aria-pressed={picked === i}
                    disabled={picked !== null}
                    onClick={() => choose(i)}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <p className="agents01-loop-stepper-why" role="status">
                {picked === ev.answer ? "Correct. " : "Not quite. "}
                {ev.why}
              </p>
            )}
            <div className="w-row">
              <button type="button" className="w-btn primary" disabled={picked === null} onClick={next}>
                {idx === EVENTS.length - 1 ? "Finish" : "Next"}
              </button>
              <span className="agents01-loop-stepper-count">
                Prediction {idx + 1} of {EVENTS.length}
              </span>
            </div>
          </div>
        )}

        {finished && (
          <div className="agents01-loop-stepper-end">
            <div className={`w-verdict ${score >= 4 ? "good" : "bad"}`} role="status">
              You predicted {score} of {total} messages. The loop is four moves: the model proposes, your code executes, the result is observed, and the model decides again. This run made three model calls and stopped when the last reply held no tool call. Every turn resends the whole history.
            </div>
            <button type="button" className="w-btn ghost" onClick={reset}>
              Run it again
            </button>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
