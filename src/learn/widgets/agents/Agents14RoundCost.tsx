import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents14RoundCost.css";

// A rough model: one writer call and one critic call per round. Each call re-sends the growing history.
const DRAFT = 300;
const CRITIQUE = 80;
const BASE = 150;

function cost(rounds: number) {
  let tokens = 0;
  let history = BASE;
  for (let r = 1; r <= rounds; r++) {
    tokens += history + DRAFT; // writer reads the history, writes a draft
    history += DRAFT;
    tokens += DRAFT + CRITIQUE + 100; // critic reads the draft and its prompt, writes a verdict
    history += CRITIQUE;
  }
  return { calls: rounds * 2, tokens };
}

export default function Agents14RoundCost({ onComplete }: WidgetProps) {
  const [rounds, setRounds] = useState(2);
  const [shown, setShown] = useState(false);
  const complete = useComplete(onComplete);
  const one = cost(1);
  const now = cost(rounds);

  return (
    <div className="w-panel agents14-round-cost">
      <p className="agents14-round-cost-note">One draft with no critic costs one model call. Move the slider to see what a reflection loop costs when the critic keeps asking for another round.</p>
      <label className="agents14-round-cost-label" htmlFor="agents14-rounds">
        Rounds before the critic passes: <strong>{rounds}</strong>
      </label>
      <input
        id="agents14-rounds"
        className="agents14-round-cost-range"
        type="range"
        min={1}
        max={6}
        value={rounds}
        onChange={(e) => {
          setRounds(Number(e.target.value));
          setShown(false);
        }}
      />
      <table className="agents14-round-cost-table">
        <thead>
          <tr>
            <th scope="col">Design</th>
            <th scope="col">Model calls</th>
            <th scope="col">Rough tokens</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">One draft, no critic</th>
            <td>1</td>
            <td>{BASE + DRAFT}</td>
          </tr>
          <tr>
            <th scope="row">Reflection, {rounds} {rounds === 1 ? "round" : "rounds"}</th>
            <td>{now.calls}</td>
            <td>{now.tokens}</td>
          </tr>
        </tbody>
      </table>
      <div className="w-row">
        <button
          type="button"
          className="w-btn primary"
          onClick={() => {
            setShown(true);
            complete(`${rounds} rounds cost ${now.calls} calls`);
          }}
        >
          Read the verdict
        </button>
      </div>
      {shown && (
        <div className={`w-verdict ${rounds <= 2 ? "good" : "bad"}`} role="status">
          {rounds} rounds make {now.calls} calls and about {(now.tokens / (BASE + DRAFT)).toFixed(1)} times the tokens of one draft. One round costs {one.calls} calls. Each extra round also re-sends the longer history, so cost grows faster than the round count. Cap the rounds, and stop early when a round fixes nothing.
        </div>
      )}
    </div>
  );
}
