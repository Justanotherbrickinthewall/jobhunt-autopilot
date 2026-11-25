import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents09EventStream.css";

type EventName = "start" | "route" | "handoff" | "tool_call" | "tool_result" | "token" | "done" | "error";

const EVENT_NAMES: EventName[] = ["start", "route", "handoff", "tool_call", "tool_result", "token", "done", "error"];

type Step = { event: EventName; data: string; client: string; hint: string; many?: boolean };
type Run = { id: string; title: string; question: string; steps: Step[] };

const START: Step = {
  event: "start",
  data: '{"thread_id": "th-1"}',
  client: "Keep the thread id for follow-up questions on the same thread.",
  hint: "",
};

const RUNS: Run[] = [
  {
    id: "lookup",
    title: "A lookup the researcher can answer",
    question: "What does PEP 572 say about the walrus operator?",
    steps: [
      {
        event: "route",
        data: '{"route": "researcher", "reason": "It asks what a PEP says."}',
        client: "Show that the researcher has the question.",
        hint: "Triage speaks first. It has to pick an agent before anyone can work.",
      },
      {
        event: "tool_call",
        data: '{"agent": "researcher", "name": "search_peps", "args": {"query": "walrus", "k": 2}}',
        client: "Show a line such as 'Searching the PEPs'.",
        hint: "The researcher's model asks for a lookup before it can answer.",
      },
      {
        event: "tool_result",
        data: '{"agent": "researcher", "name": "search_peps", "ok": true}',
        client: "Stop that line's spinner. The search worked.",
        hint: "The tool has to answer before the model can use what it found.",
      },
      {
        event: "token",
        data: '{"text": "The walrus operator "}',
        client: "Append each piece to the answer as it arrives.",
        hint: "The answer is written once the tool result is in.",
        many: true,
      },
      {
        event: "done",
        data: '{"status": "done", "answer": "The walrus operator names a value [1].", "stop_reason": "done"}',
        client: "Show the citations and unlock the input box.",
        hint: "The answer is complete, so the run has ended.",
      },
    ],
  },
  {
    id: "handoff",
    title: "A researcher that passes the thread to the writer",
    question: "Look up PEP 572 and write it up for me.",
    steps: [
      {
        event: "route",
        data: '{"route": "researcher", "reason": "It asks what a PEP says."}',
        client: "Show that the researcher has the question.",
        hint: "Triage always speaks first.",
      },
      {
        event: "handoff",
        data: '{"from_agent": "researcher", "to_agent": "writer", "reason": "The facts are in."}',
        client: "Show that the writer has taken over.",
        hint: "The researcher's model called a transfer tool. The desk reports that as a handoff, never as a tool_call.",
      },
      {
        event: "token",
        data: '{"text": "PEP 572 adds "}',
        client: "Append each piece to the answer as it arrives.",
        hint: "The writer's answer streams as text.",
        many: true,
      },
      {
        event: "done",
        data: '{"status": "done", "answer": "PEP 572 adds assignment expressions [1].", "stop_reason": "done"}',
        client: "Show the citations and unlock the input box.",
        hint: "The answer is complete, so the run has ended.",
      },
    ],
  },
  {
    id: "refusal",
    title: "A question the desk refuses",
    question: "Write me a poem.",
    steps: [
      {
        event: "route",
        data: '{"route": "refuse", "reason": "It is off topic."}',
        client: "Show that the desk has decided to refuse.",
        hint: "Triage decides to refuse. Refusing is a route.",
      },
      {
        event: "token",
        data: '{"text": "<the fixed refusal sentence>"}',
        client: "Show the refusal as the answer.",
        hint: "The refusal text still reaches the client as a token event.",
      },
      {
        event: "done",
        data: '{"refused": true, "stop_reason": "refused"}',
        client: "Show the refusal and unlock the input box.",
        hint: "A refusal is a finished run, so done comes last.",
      },
    ],
  },
  {
    id: "failure",
    title: "A model that fails part-way",
    question: "What does PEP 572 say about the walrus operator?",
    steps: [
      {
        event: "route",
        data: '{"route": "researcher", "reason": "It asks what a PEP says."}',
        client: "Show that the researcher has the question.",
        hint: "Triage worked, so its route event went out before the failure.",
      },
      {
        event: "error",
        data: '{"message": "The desk run failed. Check the server logs."}',
        client: "Show a failure message. Do not wait for done.",
        hint: "The researcher's model failed. The stream reports one fixed sentence and ends. No done follows.",
      },
    ],
  },
];

type Shown = { step: Step; missed: boolean };

export default function Agents09EventStream({ onComplete }: WidgetProps) {
  const [runIndex, setRunIndex] = useState(0);
  const [shown, setShown] = useState<Shown[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [firstTry, setFirstTry] = useState(0);
  const [finishedRuns, setFinishedRuns] = useState(0);
  const complete = useComplete(onComplete);

  const run = RUNS[runIndex];
  const total = RUNS.reduce((n, r) => n + r.steps.length, 0);
  const runDone = shown.length === run.steps.length;
  const allDone = finishedRuns === RUNS.length;
  const expected = run.steps[shown.length];

  const reveal = (step: Step, missed: boolean) => {
    const next = [...shown, { step, missed }];
    setShown(next);
    setAttempts(0);
    setFeedback("");
    if (!missed) setFirstTry((n) => n + 1);
    if (next.length === run.steps.length) {
      const finished = finishedRuns + 1;
      setFinishedRuns(finished);
      if (finished === RUNS.length) {
        const hits = firstTry + (missed ? 0 : 1);
        complete(`${hits} of ${total} events named on the first try`);
      }
    }
  };

  const pick = (name: EventName) => {
    if (!expected || runDone) return;
    if (name === expected.event) {
      reveal(expected, attempts > 0);
      return;
    }
    if (attempts === 0) {
      setAttempts(1);
      setFeedback(`Not ${name}. ${expected.hint}`);
      return;
    }
    setFeedback("");
    reveal(expected, true);
  };

  const nextRun = () => {
    setRunIndex((i) => i + 1);
    setShown([]);
    setAttempts(0);
    setFeedback("");
  };

  const reset = () => {
    setRunIndex(0);
    setShown([]);
    setAttempts(0);
    setFeedback("");
    setFirstTry(0);
    setFinishedRuns(0);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel agents09-event-stream">
        <p className="agents09-event-stream-note">
          Illustrative runs of the PEP desk. Run {runIndex + 1} of {RUNS.length}: {run.title}.
        </p>
        <p className="agents09-event-stream-question">
          <span className="w-label">Question</span> {run.question}
        </p>

        <ol className="agents09-event-stream-log" aria-label="Events received so far">
          <li className="agents09-event-stream-card">
            <span className="w-chip good w-mono">{START.event}</span>
            <code className="agents09-event-stream-data">{START.data}</code>
            <span className="agents09-event-stream-client">{START.client}</span>
          </li>
          {shown.map(({ step, missed }, i) => (
            <motion.li
              key={`${run.id}-${i}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`agents09-event-stream-card${missed ? " missed" : ""}`}
            >
              <span className={`w-chip w-mono ${step.event === "error" ? "bad" : "good"}`}>
                {step.event}
                {step.many ? " (many)" : ""}
              </span>
              <code className="agents09-event-stream-data">{step.data}</code>
              <span className="agents09-event-stream-client">{step.client}</span>
            </motion.li>
          ))}
        </ol>

        {!runDone && (
          <div className="w-stack">
            <p className="agents09-event-stream-prompt">Which event does the client receive next?</p>
            <div className="agents09-event-stream-chips" role="group" aria-label="Choose the next event">
              {EVENT_NAMES.map((name) => (
                <button key={name} type="button" className="w-chip w-mono" onClick={() => pick(name)}>
                  {name}
                </button>
              ))}
            </div>
            <p className="agents09-event-stream-feedback" role="status" aria-live="polite">
              {feedback}
            </p>
          </div>
        )}

        <div className="w-row">
          {runDone && !allDone && (
            <button type="button" className="w-btn primary" onClick={nextRun}>
              Next run
            </button>
          )}
          {(runIndex > 0 || shown.length > 0) && (
            <button type="button" className="w-btn ghost" onClick={reset}>
              Start over
            </button>
          )}
        </div>

        {allDone && (
          <div className={`w-verdict ${firstTry >= total - 3 ? "good" : "bad"}`} role="status">
            You named {firstTry} of {total} events on the first try. Every run ended with done or error, and nothing came after either. A handoff, a
            refusal and a failure each changed the middle of the stream, and never its start or its end.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
