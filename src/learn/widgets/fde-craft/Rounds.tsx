import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Rounds.css";

export type RoundOption = { label: string; delta: number; feedback: string };
export type Round = { id: string; prompt: string; options: RoundOption[] };

type Props = WidgetProps & {
  className: string;
  lede: string;
  rounds: Round[];
  meterLabel: string;
  start: number;
  passAt: number;
  goodText: string;
  badText: string;
  foot?: string;
  noun: string;
};

// A shared stepper: one prompt at a time, one choice each, a running score, then a verdict.
export default function Rounds({ onComplete, className, lede, rounds, meterLabel, start, passAt, goodText, badText, foot, noun }: Props) {
  const complete = useComplete(onComplete);
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(false);

  const answered = rounds.filter((r) => chosen[r.id] !== undefined);
  const next = rounds.find((r) => chosen[r.id] === undefined);
  const score = answered.reduce((s, r) => s + r.options[chosen[r.id]].delta, start);

  // The last answer ends the sequence: show the verdict and call onComplete once, never mid-sequence.
  function pick(r: Round, i: number) {
    if (finished) return;
    setChosen((c) => ({ ...c, [r.id]: i }));
    if (rounds.filter((x) => chosen[x.id] === undefined).length === 1) {
      setFinished(true);
      complete(`${noun}: ${score + r.options[i].delta}`);
    }
  }

  return (
    <div className={`w-panel ${className}`}>
      <p className="fde-craft-rounds-lede">{lede}</p>
      <div className="w-row fde-craft-rounds-meter" role="status" aria-live="polite">
        <span className="w-label">{meterLabel}</span>
        <span className="w-mono">{score}</span>
        <span className="fde-craft-rounds-bar" aria-hidden="true">
          <span style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
        </span>
      </div>

      <ol className="fde-craft-rounds-done">
        {answered.map((r) => {
          const o = r.options[chosen[r.id]];
          return (
            <li key={r.id} className={o.delta > 0 ? "is-good" : o.delta < 0 ? "is-bad" : "is-flat"}>
              <b>{r.prompt}</b>
              <div>
                You chose: {o.label} <span className="w-mono">({o.delta > 0 ? "+" : ""}{o.delta})</span>
              </div>
              <div className="fde-craft-rounds-fb">{o.feedback}</div>
            </li>
          );
        })}
      </ol>

      {next && (
        <div className="fde-craft-rounds-card">
          <div className="fde-craft-rounds-count">
            Step {answered.length + 1} of {rounds.length}
          </div>
          <p>{next.prompt}</p>
          <div className="fde-craft-rounds-choices" role="group" aria-label="Choose one">
            {next.options.map((o, i) => (
              <button key={o.label} type="button" className="w-btn ghost fde-craft-rounds-choice" onClick={() => pick(next, i)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {finished && (
        <div className={`w-verdict ${score >= passAt ? "good" : "bad"}`} role="status">
          <strong>{meterLabel} {score}.</strong> {score >= passAt ? goodText : badText}
        </div>
      )}
      {foot && <p className="fde-craft-rounds-foot">{foot}</p>}
    </div>
  );
}
