import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Guardrails06ResumeTwice.css";

// Round 1: where file_ticket writes its audit rows. Each design is shown as the two passes the node makes for one approval.
type Line = { pass: 1 | 2; text: string; note?: string };
type Design = {
  id: string;
  name: string;
  desc: string;
  lines: Line[];
  rows: string;
  before: string;
  good: boolean;
  verdict: string;
};

const DESIGNS: Design[] = [
  {
    id: "direct",
    name: "Write each row straight to the audit trail",
    desc: "The node writes its authorisation row the moment the check passes.",
    lines: [
      { pass: 1, text: "check_call writes an authz row to the trail", note: "trail: 1 row" },
      { pass: 1, text: "The draft and the key are built" },
      { pass: 1, text: "request_approval stops the run", note: "Nobody has approved anything yet." },
      { pass: 2, text: "check_call writes an authz row to the trail", note: "trail: 2 rows" },
      { pass: 2, text: "The draft and the key are built" },
      { pass: 2, text: "request_approval returns the decision" },
      { pass: 2, text: "open_ticket files the ticket" },
    ],
    rows: "2 authz rows for one ticket",
    before: "A row already says the call was allowed",
    good: false,
    verdict:
      "Pass 1 wrote a row, and pass 2 wrote the same row again. The trail now overstates what happened, and during the pause it already said the call was allowed for a ticket nobody had approved.",
  },
  {
    id: "buffer",
    name: "Hold the rows in an AuditBuffer, and flush after the decision",
    desc: "The node writes to a list in memory. It copies that list to the trail only when the decision is back.",
    lines: [
      { pass: 1, text: "check_call writes an authz row to the buffer", note: "buffer: 1 row. trail: 0 rows" },
      { pass: 1, text: "The draft and the key are built" },
      { pass: 1, text: "request_approval stops the run", note: "The buffer is lost with this pass." },
      { pass: 2, text: "check_call writes an authz row to the buffer", note: "buffer: 1 row" },
      { pass: 2, text: "The draft and the key are built" },
      { pass: 2, text: "request_approval returns the decision" },
      { pass: 2, text: "The buffer is flushed to the trail", note: "trail: 1 row" },
      { pass: 2, text: "open_ticket files the ticket" },
    ],
    rows: "1 authz row for one ticket",
    before: "The trail holds nothing for this ticket",
    good: true,
    verdict:
      "This is the design AskPEP uses. Pass 1 leaves nothing behind, because its buffer is thrown away. Pass 2 writes the row once, after the decision, and the executed row follows the filing.",
  },
  {
    id: "first",
    name: "File the ticket first, and ask a person to confirm afterwards",
    desc: "The node calls open_ticket before the pause, so the approval is a formality.",
    lines: [
      { pass: 1, text: "The draft and the key are built" },
      { pass: 1, text: "open_ticket files the ticket", note: "The ticket exists. Nobody has approved it." },
      { pass: 1, text: "request_approval stops the run" },
      { pass: 2, text: "The draft and the key are built" },
      { pass: 2, text: "open_ticket runs again", note: "The key finds the ticket, so there is no second row." },
      { pass: 2, text: "request_approval returns the decision" },
    ],
    rows: "0 authz rows, and a ticket",
    before: "The ticket is already filed",
    good: false,
    verdict:
      "The key stops a second row, but that is not the problem. The ticket was filed before a person saw it. A reject now arrives after the harm is done, so the gate guards nothing.",
  },
];

// Round 2: the supervisor's worker runs its model again on pass 2 and proposes another ticket.
type Choice = { id: string; name: string; good: boolean; verdict: string };

const CHOICES: Choice[] = [
  {
    id: "second",
    name: "The pass 2 draft, filed under its own key",
    good: false,
    verdict:
      "That draft is the model's second thought, and the approver never saw it. The approval row says one ticket and the tickets table holds another.",
  },
  {
    id: "approved",
    name: "The approved draft, under the request's own key",
    good: true,
    verdict:
      "This is the rule. settle_approval copied the request's draft and key into the decision, so the node files the draft the person saw. It uses the request's key, so a repeat stays harmless.",
  },
  {
    id: "both",
    name: "Both drafts, in case the approver meant either",
    good: false,
    verdict:
      "That files two tickets, and one of them was never approved. An approval covers exactly the request the person read.",
  },
];

const HINT_1 = "Look at each design's two passes. Count the rows in the trail, and look for a row or a ticket that appears before any decision.";
const HINT_2 = "Ask which draft the approver actually read.";

export default function Guardrails06ResumeTwice({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [round, setRound] = useState<1 | 2>(1);
  const [designId, setDesignId] = useState("direct");
  const [choiceId, setChoiceId] = useState("second");
  const [tries, setTries] = useState(0);
  const [state, setState] = useState<"open" | "retry" | "resolved">("open");
  const [shown, setShown] = useState<{ good: boolean; text: string }>({ good: false, text: "" });

  const design = DESIGNS.find((d) => d.id === designId) ?? DESIGNS[0];
  const choice = CHOICES.find((c) => c.id === choiceId) ?? CHOICES[0];
  const current = round === 1 ? design : choice;

  const ship = () => {
    const good = current.good;
    const n = tries + 1;
    setTries(n);
    setShown({ good, text: current.verdict });
    if (good || n >= 2) {
      setState("resolved");
      if (round === 2) complete(good ? "Chose the approved draft" : "Finished with the explanation shown");
    } else {
      setState("retry");
    }
  };

  const reopen = () => {
    if (state === "retry") setState("open");
  };

  const goRound2 = () => {
    setRound(2);
    setTries(0);
    setState("open");
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel guardrails06-resume-twice">
        <p className="guardrails06-resume-twice-note">
          <span className="w-mono">file_ticket</span> runs twice for one approval. The first pass stops at the pause. After the decision, the second pass starts from the top.
        </p>

        {round === 1 ? (
          <>
            <fieldset className="guardrails06-resume-twice-opts">
              <legend className="w-label">Round 1. Where does the node write its audit rows?</legend>
              {DESIGNS.map((d) => (
                <label key={d.id} className={`guardrails06-resume-twice-opt${d.id === designId ? " on" : ""}`}>
                  <input
                    type="radio"
                    name="guardrails06-resume-twice-design"
                    checked={d.id === designId}
                    onChange={() => {
                      setDesignId(d.id);
                      reopen();
                    }}
                  />
                  <span>
                    <strong>{d.name}</strong>
                    <span className="guardrails06-resume-twice-desc">{d.desc}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <ol className="guardrails06-resume-twice-trace" aria-label="The two passes of the node">
              {design.lines.map((l, i) => (
                <motion.li
                  key={`${design.id}-${i}`}
                  className={`guardrails06-resume-twice-line pass${l.pass}`}
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {i > 0 && l.pass !== design.lines[i - 1].pass && (
                    <span className="guardrails06-resume-twice-gap" role="presentation">
                      A person decides, and the node starts again from its first line
                    </span>
                  )}
                  <span className="guardrails06-resume-twice-badge w-chip">pass {l.pass}</span>
                  <span className="guardrails06-resume-twice-text">
                    <span className="w-mono">{l.text}</span>
                    {l.note && <span className="guardrails06-resume-twice-nt">{l.note}</span>}
                  </span>
                </motion.li>
              ))}
            </ol>

            <p className="guardrails06-resume-twice-sum" role="status">
              {design.rows}. {design.before}.
            </p>
          </>
        ) : (
          <>
            <div className="w-inset">
              <p className="guardrails06-resume-twice-case">
                The approver read <strong>Fix the PEP 572 page</strong> and sent an approve. On pass 2, the supervisor&apos;s worker runs its model again, and the model
                proposes <strong>Fix the walrus docs</strong> instead.
              </p>
            </div>
            <fieldset className="guardrails06-resume-twice-opts" disabled={state === "resolved"}>
              <legend className="w-label">Round 2. Which draft does the node file?</legend>
              {CHOICES.map((c) => (
                <label key={c.id} className={`guardrails06-resume-twice-opt${c.id === choiceId ? " on" : ""}`}>
                  <input
                    type="radio"
                    name="guardrails06-resume-twice-choice"
                    checked={c.id === choiceId}
                    onChange={() => {
                      setChoiceId(c.id);
                      reopen();
                    }}
                  />
                  <span>
                    <strong>{c.name}</strong>
                  </span>
                </label>
              ))}
            </fieldset>
          </>
        )}

        <div className="w-row">
          {state !== "resolved" && (
            <button type="button" className="w-btn primary" onClick={ship}>
              {round === 1 ? "Ship this node" : "Ship this rule"}
            </button>
          )}
          {state === "resolved" && round === 1 && (
            <button type="button" className="w-btn primary" onClick={goRound2}>
              Go to round 2
            </button>
          )}
        </div>

        {state === "retry" && (
          <div className="w-verdict bad" role="status">
            <strong>Not yet.</strong> {round === 1 ? HINT_1 : HINT_2} Change your choice and ship again.
          </div>
        )}
        {state === "resolved" && (
          <motion.div
            className={`w-verdict ${shown.good ? "good" : "bad"}`}
            role="status"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <strong>{shown.good ? "Right." : "Not this one."}</strong> {shown.text}
            {!shown.good && round === 1 && " The right design is the buffer. Pick it to see its two passes."}
            {!shown.good && round === 2 && " The right choice is the approved draft, under the request's own key."}
          </motion.div>
        )}
      </div>
    </MotionConfig>
  );
}
