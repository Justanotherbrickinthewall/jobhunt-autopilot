import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents07ResumeReplay.css";

type Crash = "before" | "after";
type Tone = "saved" | "again" | "fresh" | "costly";

type StepRow = { id: string; label: string; note: string; first: string; after: string; tone: Tone };
type Sim = { rows: StepRow[]; modelCalls: number; tickets: number; status: "created" | "existing"; why: string };

const STEPS = [
  { id: "triage", label: "triage", note: "Model call. Sends the question to the writer." },
  { id: "ask", label: "writer asks for the ticket", note: "Model call. Asks for open_ticket with a title, a body and PEP 572." },
  { id: "tool", label: "open_ticket", note: "Tool. Inserts the ticket." },
  { id: "answer", label: "writer answers", note: "Model call. Tells the user the ticket id." },
];

// Teaching model only. One run: the user asks the desk to file a ticket about PEP 572, and the process dies inside open_ticket.
function simulate(crash: Crash, checkpointer: boolean, hasKey: boolean): Sim {
  const landed = crash === "after";
  const toolFirst = landed ? "The insert landed, then the process died." : "The process died before the insert.";
  const rows: StepRow[] = checkpointer
    ? [
        { ...STEPS[0], first: "Ran. State saved.", after: "Skipped. Its result is in the checkpoint.", tone: "saved" },
        { ...STEPS[1], first: "Ran. State saved.", after: "Skipped. The same title and body are in the checkpoint.", tone: "saved" },
        { ...STEPS[2], first: toolFirst, after: "Runs again from its first line.", tone: "again" },
        { ...STEPS[3], first: "Not reached.", after: "Runs for the first time.", tone: "fresh" },
      ]
    : [
        { ...STEPS[0], first: "Ran. Nothing was saved.", after: "Runs again, and is paid for again.", tone: "costly" },
        { ...STEPS[1], first: "Ran. Nothing was saved.", after: "Runs again. The model may word the title differently this time.", tone: "costly" },
        { ...STEPS[2], first: toolFirst, after: "Runs again.", tone: "again" },
        { ...STEPS[3], first: "Not reached.", after: "Runs for the first time.", tone: "fresh" },
      ];
  const modelCalls = checkpointer ? 3 : 5;

  if (!landed) {
    return {
      rows,
      modelCalls,
      tickets: 1,
      status: "created",
      why: checkpointer
        ? "The insert never ran, so running it once is right, with or without a key. The checkpointer saved money here: three model calls, where a restart pays for five."
        : "The insert never ran, so running it once is right. The restart repeated two model calls that the first attempt had already paid for.",
    };
  }
  if (checkpointer && hasKey) {
    return {
      rows,
      modelCalls,
      tickets: 1,
      status: "existing",
      why: "The tool ran again with the same title from the checkpoint, so it built the same key. The table refused the second row and returned the first. The status says existing, though this run made that ticket. The id is right.",
    };
  }
  if (checkpointer) {
    return {
      rows,
      modelCalls,
      tickets: 2,
      status: "created",
      why: "The checkpoint did its job and no model call was repeated. But the tool ran again, and with no key the table saw a new request. The insert had landed before the crash, so now there are two tickets.",
    };
  }
  if (hasKey) {
    return {
      rows,
      modelCalls,
      tickets: 2,
      status: "created",
      why: "Nothing was saved, so the model was asked again and chose other words. The key is built from the title, so it came out different. The table saw a new request. A key needs the saved model message to stay the same.",
    };
  }
  return {
    rows,
    modelCalls,
    tickets: 2,
    status: "created",
    why: "Neither protection was on. The restart repeated the model calls, and it inserted a second ticket.",
  };
}

const CRASHES: { id: Crash; label: string; detail: string }[] = [
  { id: "before", label: "Before the insert", detail: "No ticket exists when the process dies." },
  { id: "after", label: "Right after the insert", detail: "The ticket exists, but nothing recorded the result." },
];

const TICKET_GUESSES = [
  { id: 1, label: "One ticket" },
  { id: 2, label: "Two tickets" },
];

const CALL_GUESSES = [
  { id: 3, label: "Three model calls" },
  { id: 5, label: "Five model calls" },
];

export default function Agents07ResumeReplay({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [crash, setCrash] = useState<Crash>("after");
  const [checkpointer, setCheckpointer] = useState(true);
  const [hasKey, setHasKey] = useState(false);
  const [ticketGuess, setTicketGuess] = useState<number | null>(null);
  const [callGuess, setCallGuess] = useState<number | null>(null);
  const [ran, setRan] = useState(false);
  const [runs, setRuns] = useState(0);

  const sim = simulate(crash, checkpointer, hasKey);
  const clear = () => setRan(false);
  const reset = () => {
    setRan(false);
    setTicketGuess(null);
    setCallGuess(null);
  };

  const ticketsRight = ticketGuess === sim.tickets;
  const callsRight = callGuess === sim.modelCalls;

  const run = () => {
    if (ticketGuess === null || callGuess === null) return;
    setRan(true);
    setRuns((n) => n + 1);
    // Right answer: both guesses match. Otherwise complete on the second run, with the explanation shown.
    const right = ticketGuess === sim.tickets && callGuess === sim.modelCalls;
    if (right || runs >= 1) complete(right ? "Predicted the resumed run correctly" : "Saw the explanation on a second run");
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel agents07-resume-replay">
        <p className="agents07-resume-replay-note">
          A user asks the desk to file a ticket about PEP 572. The run makes three model calls and one tool call, and the process dies inside <span className="w-mono">open_ticket</span>. Illustrative scenario. Set up the crash, predict, then continue the run.
        </p>

        <ol className="agents07-resume-replay-steps-preview">
          {STEPS.map((s) => (
            <li key={s.id}>
              <span className="w-mono">{s.label}</span>
              <span className="agents07-resume-replay-muted">{s.note}</span>
            </li>
          ))}
        </ol>

        <fieldset className="agents07-resume-replay-group">
          <legend className="w-label">Where the process dies</legend>
          <div className="agents07-resume-replay-options">
            {CRASHES.map((c) => (
              <button key={c.id} type="button" className={`agents07-resume-replay-opt${crash === c.id ? " is-on" : ""}`} aria-pressed={crash === c.id} onClick={() => { setCrash(c.id); reset(); }}>
                <span className="agents07-resume-replay-opt-label">{c.label}</span>
                <span className="agents07-resume-replay-opt-detail">{c.detail}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="w-row agents07-resume-replay-toggles">
          <label className="agents07-resume-replay-check">
            <input type="checkbox" checked={checkpointer} onChange={(e) => { setCheckpointer(e.target.checked); reset(); }} />
            <span>A checkpointer saves state after each node</span>
          </label>
          <label className="agents07-resume-replay-check">
            <input type="checkbox" checked={hasKey} onChange={(e) => { setHasKey(e.target.checked); reset(); }} />
            <span>open_ticket uses an idempotency key</span>
          </label>
        </div>

        <fieldset className="agents07-resume-replay-group">
          <legend className="w-label">Predict: when the run finishes, how many tickets are in the table?</legend>
          <div className="agents07-resume-replay-options">
            {TICKET_GUESSES.map((g) => (
              <button key={g.id} type="button" className={`agents07-resume-replay-opt${ticketGuess === g.id ? " is-on" : ""}`} aria-pressed={ticketGuess === g.id} onClick={() => { setTicketGuess(g.id); clear(); }}>
                <span className="agents07-resume-replay-opt-label">{g.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="agents07-resume-replay-group">
          <legend className="w-label">Predict: how many model calls were paid for in total?</legend>
          <div className="agents07-resume-replay-options">
            {CALL_GUESSES.map((g) => (
              <button key={g.id} type="button" className={`agents07-resume-replay-opt${callGuess === g.id ? " is-on" : ""}`} aria-pressed={callGuess === g.id} onClick={() => { setCallGuess(g.id); clear(); }}>
                <span className="agents07-resume-replay-opt-label">{g.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="w-row">
          <button type="button" className="w-btn primary" disabled={ticketGuess === null || callGuess === null} onClick={run}>
            Continue the run
          </button>
        </div>

        {ran && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="agents07-resume-replay-result">
            <ol className="agents07-resume-replay-rows">
              {sim.rows.map((r) => (
                <li key={r.id} className={`agents07-resume-replay-row ${r.tone}`}>
                  <span className="w-mono agents07-resume-replay-row-name">{r.label}</span>
                  <span className="agents07-resume-replay-row-line"><span className="w-label">First attempt</span> {r.first}</span>
                  <span className="agents07-resume-replay-row-line"><span className="w-label">After the crash</span> {r.after}</span>
                </li>
              ))}
            </ol>
            <p className="agents07-resume-replay-totals" role="status">
              <span className={`w-chip ${sim.tickets === 1 ? "good" : "bad"}`}>{sim.tickets} {sim.tickets === 1 ? "ticket" : "tickets"}</span>{" "}
              <span className="w-chip">{sim.modelCalls} model calls</span>{" "}
              <span className="w-chip">ticket status {sim.status}</span>
            </p>
            <div className={`w-verdict ${ticketsRight && callsRight ? "good" : "bad"}`} role="status">
              <strong>
                {ticketsRight && callsRight
                  ? "Both predictions were right."
                  : ticketsRight
                    ? "The ticket count was right and the model calls were off."
                    : callsRight
                      ? "The model calls were right and the ticket count was off."
                      : "Both predictions were off."}
              </strong>{" "}
              {sim.why} Change one setting and predict again.
            </div>
          </motion.div>
        )}
      </div>
    </MotionConfig>
  );
}
