import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents10WhoPicks.css";

type Bucket = "code" | "set" | "model";

const BUCKETS: { id: Bucket; label: string }[] = [
  { id: "code", label: "Code picks" },
  { id: "set", label: "Model picks a label from a fixed set" },
  { id: "model", label: "Model picks, and decides when to stop" },
];

const ITEMS: { id: string; name: string; answer: Bucket; why: string }[] = [
  { id: "chain", name: "A prompt chain: summarise the PEP, then extract its claims, then format them", answer: "code", why: "The order is written in code. The model never chooses a step." },
  { id: "fan", name: "Fan-out: read each of 18 PEPs at once, then merge", answer: "code", why: "Code splits the list, runs the calls and merges. The model answers each call and nothing else." },
  { id: "queue", name: "A process that takes one mail from a work queue and runs a fixed pipeline", answer: "code", why: "The work queue and the pipeline decide what runs. A schedule or an arriving mail starts it." },
  { id: "router", name: "A router that labels a question as research, code or refuse", answer: "set", why: "The model returns one label from a list that code owns. Code does the rest." },
  { id: "critic", name: "A review call that returns pass or revise, inside a loop code runs", answer: "set", why: "The verdict is a label from a fixed set. Code owns the loop and the retry limit." },
  { id: "branch", name: "A workflow where the model picks one of three prepared branches", answer: "set", why: "The branches are written in advance. The model only chooses between them." },
  { id: "react", name: "A tool loop that searches, reads, searches again and answers", answer: "model", why: "The model picks each tool and says when it has enough to answer." },
  { id: "sup", name: "A supervisor that calls worker agents as tools until it is satisfied", answer: "model", why: "The model chooses the worker, reads the result and decides whether to go on." },
  { id: "swarm", name: "Agents that hand the task to each other, with no agent in charge", answer: "model", why: "Each agent chooses the next agent, or ends the run. Nothing above them decides." },
];

export default function Agents10WhoPicks({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, Bucket | undefined>>({});
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);
  const answered = ITEMS.filter((i) => picks[i.id]).length;
  const hits = ITEMS.filter((i) => picks[i.id] === i.answer).length;

  return (
    <div className="w-panel agents10-who-picks">
      <p className="agents10-who-picks-note">Sort each design by who picks the next step. Predict first, then check all nine.</p>
      <div className="w-stack">
        {ITEMS.map((it) => {
          const pick = picks[it.id];
          const right = checked && pick === it.answer;
          const wrong = checked && pick !== it.answer;
          return (
            <fieldset key={it.id} className={`agents10-who-picks-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
              <legend className="agents10-who-picks-legend">Design</legend>
              <p className="agents10-who-picks-text">{it.name}</p>
              <div className="agents10-who-picks-opts" role="radiogroup" aria-label={it.name}>
                {BUCKETS.map((b) => (
                  <label key={b.id} className={`agents10-who-picks-opt${pick === b.id ? " on" : ""}`}>
                    <input
                      type="radio"
                      name={`agents10-who-picks-${it.id}`}
                      value={b.id}
                      checked={pick === b.id}
                      disabled={checked}
                      onChange={() => setPicks((p) => ({ ...p, [it.id]: b.id }))}
                    />
                    <span>{b.label}</span>
                  </label>
                ))}
              </div>
              {checked && (
                <p className="agents10-who-picks-why" role="status">
                  {right ? "Matched. " : `Better fit: ${BUCKETS.find((b) => b.id === it.answer)?.label}. `}
                  {it.why}
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
            disabled={answered < ITEMS.length}
            onClick={() => {
              setChecked(true);
              complete(`${hits} of ${ITEMS.length} matched`);
            }}
          >
            Check my sort ({answered} of {ITEMS.length})
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
        <div className={`w-verdict ${hits >= 7 ? "good" : "bad"}`} role="status">
          You matched {hits} of {ITEMS.length}. The test: does the model only label, or does it also decide when the run ends? Labelling keeps code in charge. Deciding when to stop hands the model the path.
        </div>
      )}
    </div>
  );
}
