import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents20PullPush.css";

type Case = { id: string; q: string; meta: string; opts: string[]; answer: number; why: string };

const CASES: Case[] = [
  {
    "id": "a",
    "q": "A log-based stream. The consumer asks for the next batch when it is free.",
    "meta": "Consumer group: summaries.",
    "opts": [
      "Pull, each event to one worker",
      "Pull, every group gets every event",
      "Push, the sender calls one receiver",
      "Push, the sender calls every subscriber"
    ],
    "answer": 0,
    "why": "The consumer asks, so it is pull. Inside one group, each event goes to one worker."
  },
  {
    "id": "b",
    "q": "A second group, audit, reads the same stream from offset 0.",
    "meta": "It has its own offset and asks when ready.",
    "opts": [
      "Pull, each event to one worker",
      "Pull, every group gets every event",
      "Push, the sender calls one receiver",
      "Push, the sender calls every subscriber"
    ],
    "answer": 1,
    "why": "Each group keeps its own offset, so every group sees every event. The consumers still ask, so it is pull."
  },
  {
    "id": "c",
    "q": "A managed message queue. Workers ask for a message, and each message goes to one worker.",
    "meta": "A worker that fails to acknowledge gets it again.",
    "opts": [
      "Pull, each event to one worker",
      "Pull, every group gets every event",
      "Push, the sender calls one receiver",
      "Push, the sender calls every subscriber"
    ],
    "answer": 0,
    "why": "Workers ask, and one worker gets each message. That is pull with point-to-point delivery."
  },
  {
    "id": "d",
    "q": "A webhook. The sender posts to one URL the moment the event happens.",
    "meta": "The receiver does not choose when.",
    "opts": [
      "Pull, each event to one worker",
      "Pull, every group gets every event",
      "Push, the sender calls one receiver",
      "Push, the sender calls every subscriber"
    ],
    "answer": 2,
    "why": "The sender starts the call, so it is push. One URL means one receiver."
  },
  {
    "id": "e",
    "q": "A sender posts the same event to three subscriber URLs.",
    "meta": "Each subscriber receives its own call.",
    "opts": [
      "Pull, each event to one worker",
      "Pull, every group gets every event",
      "Push, the sender calls one receiver",
      "Push, the sender calls every subscriber"
    ],
    "answer": 3,
    "why": "The sender starts every call, so it is push. Every subscriber gets a copy. Push can be publish-subscribe too."
  },
  {
    "id": "f",
    "q": "A consumer sleeps for 30 seconds when the topic is empty, then asks again.",
    "meta": "It never takes more than one event at a time.",
    "opts": [
      "Pull, each event to one worker",
      "Pull, every group gets every event",
      "Push, the sender calls one receiver",
      "Push, the sender calls every subscriber"
    ],
    "answer": 0,
    "why": "The consumer controls the pace, so it is pull. A free consumer takes one event, which suits slow agent calls."
  }
];

export default function Agents20PullPush({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, number | undefined>>({});
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);
  const answered = CASES.filter((c) => picks[c.id] !== undefined).length;
  const hits = CASES.filter((c) => picks[c.id] === c.answer).length;

  return (
    <div className="w-panel agents20-pull-push">
      <p className="agents20-pull-push-note">Pick the delivery style for each system. Two questions decide it: who starts the exchange, and whether each event goes to one worker or to every group.</p>
      <div className="w-stack">
        {CASES.map((c) => {
          const pick = picks[c.id];
          const right = checked && pick === c.answer;
          const wrong = checked && pick !== c.answer;
          return (
            <fieldset key={c.id} className={`agents20-pull-push-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
              <legend className="agents20-pull-push-legend">Case</legend>
              <p className="agents20-pull-push-text">{c.q}</p>
              <p className="agents20-pull-push-meta">{c.meta}</p>
              <div className="agents20-pull-push-opts" role="radiogroup" aria-label={c.q}>
                {c.opts.map((o, i) => (
                  <label key={o} className={`agents20-pull-push-opt${pick === i ? " on" : ""}`}>
                    <input
                      type="radio"
                      name={`agents20-pull-push-${c.id}`}
                      checked={pick === i}
                      disabled={checked}
                      onChange={() => setPicks((p) => ({ ...p, [c.id]: i }))}
                    />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
              {checked && (
                <p className="agents20-pull-push-why" role="status">
                  {right ? "Matched. " : `Better fit: ${c.opts[c.answer]}. `}
                  {c.why}
                </p>
              )}
            </fieldset>
          );
        })}
      </div>
      <div className="w-row">
        {!checked ? (
          <button
            type="button"
            className="w-btn primary"
            disabled={answered < CASES.length}
            onClick={() => {
              setChecked(true);
              complete(`${hits} of ${CASES.length} matched`);
            }}
          >
            Check my answers ({answered} of {CASES.length})
          </button>
        ) : (
          <button
            type="button"
            className="w-btn ghost"
            onClick={() => {
              setPicks({});
              setChecked(false);
            }}
          >
            Try again
          </button>
        )}
      </div>
      {checked && (
        <div className={`w-verdict ${hits >= 5 ? "good" : "bad"}`} role="status">
          You matched {hits} of {CASES.length}. Pull or push says who starts the exchange. One worker or every group says who gets a copy. A system sits on both axes at once.
        </div>
      )}
    </div>
  );
}
