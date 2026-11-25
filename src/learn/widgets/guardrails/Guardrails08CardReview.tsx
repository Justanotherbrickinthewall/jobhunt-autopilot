import { useState } from "react";
import { useComplete } from "../learn/useComplete";
import type { WidgetProps } from "../types";
import "./Guardrails08CardReview.css";

// The facts behind each line come from the AskPEP code in the lab: the injection and output guards,
// PiiGuard (emails, phone numbers, card numbers and secrets), the ticket approval, the audit table,
// the kill switch, and the 25 attacks of set v1. ArmorGuard is in the chain only when MODEL_ARMOR_TEMPLATE is set.

type Verdict = "keep" | "overclaim" | "noevidence";
type Line = { text: string; answer: Verdict; why: string };

const CHOICES: { id: Verdict; label: string }[] = [
  { id: "keep", label: "Keep it" },
  { id: "overclaim", label: "Over-claim" },
  { id: "noevidence", label: "No evidence" },
];

const LINES: Line[] = [
  {
    text: "AskPEP is immune to prompt injection.",
    answer: "overclaim",
    why: "No guard is perfect. The attack set measures a rate on known attacks, and a new attack can still get through.",
  },
  {
    text: "Guarded attack success rate: 0.0 on the 25 attacks of set v1, in-sample, measured on 21 October 2026.",
    answer: "keep",
    why: "It names the set, its size, that the figure is in-sample, and the date. A reviewer can repeat the run.",
  },
  {
    text: "No personal data is stored.",
    answer: "overclaim",
    why: "Tickets, thread state and the principal id on every audit row are stored. Redaction covers four kinds of text and misses names.",
  },
  {
    text: "The audit trail cannot be edited.",
    answer: "overclaim",
    why: "The application only inserts and reads, but the database role is not yet limited. Until it is, a role with write access can change rows.",
  },
  {
    text: "Every ticket needs a person's approval. Evidence: the approval rows in the audit table.",
    answer: "keep",
    why: "It makes one claim about one action tool, and it names the rows that show it.",
  },
  {
    text: "Model Armor screens every question and answer.",
    answer: "overclaim",
    why: "The Model Armor guard joins the chain only when the template setting is set. The line must say when it is on.",
  },
  {
    text: "Kill switch: actions stops open_ticket and all answers 503 on every route but /health. Evidence: kill_switch rows. A change needs a restart.",
    answer: "keep",
    why: "It says what each value stops, names the evidence and states the limit.",
  },
  {
    text: "Provider terms: our data is not used to train the models.",
    answer: "noevidence",
    why: "The line gives no link and no date. Provider terms change, so the line must name the page and the day you read it.",
  },
];

export default function Guardrails08CardReview({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<Record<number, Verdict>>({});
  const [attempts, setAttempts] = useState(0);
  const [shown, setShown] = useState(false);

  const allPicked = LINES.every((_, i) => picks[i] !== undefined);
  const correct = LINES.filter((l, i) => picks[i] === l.answer).length;
  const revealed = attempts >= 2;
  const finished = shown && (correct === LINES.length || revealed);

  function check() {
    const next = attempts + 1;
    setAttempts(next);
    setShown(true);
    if (correct === LINES.length || next >= 2) {
      complete(`Judged ${correct} of ${LINES.length} card lines correctly on attempt ${next}.`);
    }
  }

  function retry() {
    setShown(false);
    const keep: Record<number, Verdict> = {};
    LINES.forEach((l, i) => {
      if (picks[i] === l.answer) keep[i] = l.answer;
    });
    setPicks(keep);
  }

  return (
    <div className="w-panel guardrails08-card-review">
      <p className="guardrails08-card-review-lead">
        Here are eight lines from a draft card for AskPEP. Keep a line that states a fact with its evidence. Mark an over-claim when the line says more than the evidence shows. Mark no evidence when the line names none.
      </p>
      {LINES.map((l, i) => {
        const pick = picks[i];
        const right = pick === l.answer;
        return (
          <fieldset key={i} className="guardrails08-card-review-fs">
            <legend>Line {i + 1}</legend>
            <p className="guardrails08-card-review-line">{l.text}</p>
            <div className="guardrails08-card-review-opts" role="radiogroup" aria-label={`Your judgement of line ${i + 1}`}>
              {CHOICES.map((c) => (
                <label key={c.id} className={"guardrails08-card-review-opt" + (pick === c.id ? " is-on" : "")}>
                  <input
                    type="radio"
                    name={"guardrails08-card-review-" + i}
                    disabled={finished || (shown && right)}
                    checked={pick === c.id}
                    onChange={() => setPicks({ ...picks, [i]: c.id })}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
            {shown && pick !== undefined && (
              <p className={"w-verdict " + (right ? "good" : "bad")} role="status">
                {right
                  ? l.why
                  : revealed
                    ? `Not quite. The right judgement is ${CHOICES.find((c) => c.id === l.answer)?.label.toLowerCase()}. ${l.why}`
                    : "Not quite. Ask what evidence the line names, and whether the evidence supports every word."}
              </p>
            )}
          </fieldset>
        );
      })}
      {!finished && !shown && (
        <div className="w-row">
          <button type="button" className="w-btn primary" disabled={!allPicked} onClick={check}>
            Check my judgements
          </button>
        </div>
      )}
      {!finished && shown && (
        <div className="w-row">
          <button type="button" className="w-btn primary" onClick={retry}>
            Change my wrong judgements
          </button>
        </div>
      )}
      {finished && (
        <p className={"w-verdict " + (correct === LINES.length ? "good" : "bad")} role="status">
          {correct === LINES.length
            ? "Verdict: all eight right. A line earns its place with a fact, its evidence and a date. A line with an absolute word or no source costs the whole card its credibility."
            : `Verdict: ${correct} of ${LINES.length}. Read an absolute word such as immune, no or cannot as a prompt to ask for the evidence.`}
        </p>
      )}
    </div>
  );
}
