import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents23PauseResume.css";

type Phase = "idle" | "waiting" | "done" | "stopped";
type Edit = "good" | "bad";

const PROPOSED = ["proposed   email_subscriber to ana@example.org", "check      schema, policy, content: pass", "waiting    paused for a person, saved under t-10"];

export default function Agents23PauseResume({ onComplete }: WidgetProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [log, setLog] = useState<string[]>([]);
  const [sent, setSent] = useState(0);
  const [edit, setEdit] = useState<Edit>("good");
  const [guess, setGuess] = useState<string | null>(null);
  const [redelivered, setRedelivered] = useState(false);
  const complete = useComplete(onComplete);

  const reset = () => {
    setPhase("idle");
    setLog([]);
    setSent(0);
    setGuess(null);
    setRedelivered(false);
  };
  const decide = (kind: "approve" | "edit" | "reject") => {
    if (kind === "reject") {
      setLog((l) => [...l, "decision   reject by sam", "rejected   nothing sent"]);
      setPhase("stopped");
    } else if (kind === "edit" && edit === "bad") {
      setLog((l) => [...l, "decision   edit by sam", "check      content: '3.14' did not come from a trusted source", "blocked    nothing sent"]);
      setPhase("stopped");
    } else {
      setLog((l) => [...l, `decision   ${kind} by sam`, ...(kind === "edit" ? ["check      schema, policy, content: pass"] : []), "done       emailed ana@example.org"]);
      setSent(1);
      setPhase("done");
    }
  };
  const redeliver = () => {
    setRedelivered(true);
    setLog((l) => [...l, "proposed   email_subscriber to ana@example.org, reworded", "duplicate  skipped, key already ran"]);
    complete(guess === "one" ? "predicted one email" : "predicted wrong");
  };

  return (
    <div className="w-panel agents23-pause-resume">
      <p className="agents23-pause-resume-note">Run the desk on one email, then answer as the person who decides. Watch what is saved between the two calls.</p>
      <div className="w-row">
        <button type="button" className="w-btn primary" disabled={phase !== "idle"} onClick={() => { setLog(PROPOSED); setPhase("waiting"); }}>
          Call 1: run the agent
        </button>
        <button type="button" className="w-btn ghost" disabled={phase === "idle"} onClick={reset}>
          Start over
        </button>
      </div>
      {phase === "waiting" && (
        <fieldset className="agents23-pause-resume-card">
          <legend className="agents23-pause-resume-legend">Call 2: your decision</legend>
          <div className="agents23-pause-resume-opts" role="radiogroup" aria-label="Edited text">
            <label className={`agents23-pause-resume-opt${edit === "good" ? " on" : ""}`}>
              <input type="radio" name="agents23-edit" checked={edit === "good"} onChange={() => setEdit("good")} />
              <span>Edit text: shorter, facts from code</span>
            </label>
            <label className={`agents23-pause-resume-opt${edit === "bad" ? " on" : ""}`}>
              <input type="radio" name="agents23-edit" checked={edit === "bad"} onChange={() => setEdit("bad")} />
              <span>Edit text: adds Python 3.14 by hand</span>
            </label>
          </div>
          <div className="w-row">
            <button type="button" className="w-btn primary" onClick={() => decide("approve")}>Approve</button>
            <button type="button" className="w-btn" onClick={() => decide("edit")}>Edit</button>
            <button type="button" className="w-btn" onClick={() => decide("reject")}>Reject</button>
          </div>
        </fieldset>
      )}
      <pre className="agents23-pause-resume-log" aria-label="Audit log" role="log">{log.length ? log.join("\n") : "audit log is empty"}</pre>
      <p className="agents23-pause-resume-out" role="status">Emails sent: {sent}</p>
      {phase === "done" && !redelivered && (
        <fieldset className="agents23-pause-resume-card">
          <legend className="agents23-pause-resume-legend">Predict</legend>
          <p className="agents23-pause-resume-text">The topic redelivers the same event, and the model words the email differently. How many emails exist afterwards?</p>
          <div className="agents23-pause-resume-opts" role="radiogroup" aria-label="Emails after the retry">
            {[["one", "One"], ["two", "Two"], ["ask", "One, after asking the person again"]].map(([id, label]) => (
              <label key={id} className={`agents23-pause-resume-opt${guess === id ? " on" : ""}`}>
                <input type="radio" name="agents23-guess" checked={guess === id} onChange={() => setGuess(id)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <div className="w-row">
            <button type="button" className="w-btn primary" disabled={!guess} onClick={redeliver}>Redeliver the event</button>
          </div>
        </fieldset>
      )}
      {redelivered && (
        <div className={`w-verdict ${guess === "one" ? "good" : "bad"}`} role="status">
          {guess === "one" ? "Right. " : "Not quite. "}
          The key is built from the task, the action and the target, not the wording, and the desk checks it before the pause. So the retry is skipped and nobody is asked twice.
        </div>
      )}
      {phase === "stopped" && (
        <div className="w-verdict bad" role="status">
          Nothing left the system. The audit log says why. Start over and approve to see the retry.
        </div>
      )}
    </div>
  );
}
