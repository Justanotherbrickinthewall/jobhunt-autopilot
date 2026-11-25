import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents20DrainTime.css";

type Case = { id: string; q: string; meta: string; opts: string[]; answer: number; why: string };

const CASES: Case[] = [
  {
    "id": "a",
    "q": "The schedule publishes 3 events at 02:00. One consumer pulls them.",
    "meta": "One consumer, one minute per event.",
    "opts": [
      "1 minute",
      "3 minutes",
      "9 minutes"
    ],
    "answer": 1,
    "why": "One event per minute and three events make three minutes. Lag falls 3, 2, 1, 0."
  },
  {
    "id": "b",
    "q": "The schedule publishes 12 events at 02:00. One consumer pulls them.",
    "meta": "One consumer, one minute per event.",
    "opts": [
      "1 minute",
      "6 minutes",
      "12 minutes"
    ],
    "answer": 2,
    "why": "The burst is 12 events and one consumer works one at a time. The topic holds the other 11 meanwhile."
  },
  {
    "id": "c",
    "q": "The schedule publishes 12 events. Three consumers in one group share the work.",
    "meta": "The topic has 3 partitions, so each consumer reads one.",
    "opts": [
      "4 minutes",
      "12 minutes",
      "36 minutes"
    ],
    "answer": 0,
    "why": "Three consumers each take four events at once. Twelve events over three consumers is four minutes."
  },
  {
    "id": "d",
    "q": "The schedule publishes 12 events. Four consumers are in one group.",
    "meta": "The topic has only 2 partitions. One consumer reads a partition at a time.",
    "opts": [
      "3 minutes",
      "6 minutes",
      "12 minutes"
    ],
    "answer": 1,
    "why": "Only two consumers get a partition. The other two sit idle. Twelve events over two readers is six minutes."
  },
  {
    "id": "e",
    "q": "The schedule calls the agent service directly with 12 tasks at 02:00. There is no topic.",
    "meta": "The service handles 3 tasks at a time.",
    "opts": [
      "The other 9 wait safely until the service is free.",
      "The other 9 time out or are refused unless the schedule retries.",
      "The service speeds up to take all 12."
    ],
    "answer": 1,
    "why": "With no topic, nothing holds the burst. The caller gets refusals or timeouts. A topic is what makes waiting safe."
  },
  {
    "id": "f",
    "q": "The consumer is down from 02:00 to 02:10. The schedule fired 3 events at 02:00.",
    "meta": "The topic keeps events until a group commits them.",
    "opts": [
      "The 3 events are lost.",
      "The 3 events are still there, and lag is 3 when the consumer returns.",
      "The schedule fires again at 02:10."
    ],
    "answer": 1,
    "why": "Events stay in the topic. The group's offset has not moved, so the consumer resumes from where it stopped."
  }
];

export default function Agents20DrainTime({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, number | undefined>>({});
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);
  const answered = CASES.filter((c) => picks[c.id] !== undefined).length;
  const hits = CASES.filter((c) => picks[c.id] === c.answer).length;

  return (
    <div className="w-panel agents20-drain-time">
      <p className="agents20-drain-time-note">Each consumer takes one minute per event. Predict how long the topic takes to empty, or what happens to the events. Answer all six, then check.</p>
      <div className="w-stack">
        {CASES.map((c) => {
          const pick = picks[c.id];
          const right = checked && pick === c.answer;
          const wrong = checked && pick !== c.answer;
          return (
            <fieldset key={c.id} className={`agents20-drain-time-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
              <legend className="agents20-drain-time-legend">Case</legend>
              <p className="agents20-drain-time-text">{c.q}</p>
              <p className="agents20-drain-time-meta">{c.meta}</p>
              <div className="agents20-drain-time-opts" role="radiogroup" aria-label={c.q}>
                {c.opts.map((o, i) => (
                  <label key={o} className={`agents20-drain-time-opt${pick === i ? " on" : ""}`}>
                    <input
                      type="radio"
                      name={`agents20-drain-time-${c.id}`}
                      checked={pick === i}
                      disabled={checked}
                      onChange={() => setPicks((p) => ({ ...p, [c.id]: i }))}
                    />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
              {checked && (
                <p className="agents20-drain-time-why" role="status">
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
          You matched {hits} of {CASES.length}. The schedule writes the burst in one minute. The consumers set how long it takes to drain it, and the topic keeps the events safe until then. Partitions and the number of consumers both cap the speed.
        </div>
      )}
    </div>
  );
}
