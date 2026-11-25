import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Architecture01NumberMeets.css";

// R3 allows 5% of requests to run over 10 seconds. Every /ask request is assumed to finish in time.
const ALLOWED = 5;

type Mix = { id: string; desk: number; slow: number };

// Illustrative traffic mixes, not measurements. The boundary mix is last on purpose.
const MIXES: Mix[] = [
  { id: "small", desk: 8, slow: 50 },
  { id: "large", desk: 12, slow: 60 },
  { id: "edge", desk: 10, slow: 50 },
];

type Choice = "met" | "missed";

// Integer arithmetic keeps the boundary exact: 10 x 50 is 500, which is exactly 5.0%.
const badTimes100 = (desk: number, slow: number) => desk * slow;
const isMet = (desk: number, slow: number) => badTimes100(desk, slow) <= ALLOWED * 100;
const pct = (x: number) => x.toFixed(1);
const badShare = (desk: number, slow: number) => badTimes100(desk, slow) / 100;

function sum(desk: number, slow: number): string {
  const bad = badShare(desk, slow);
  const met = isMet(desk, slow);
  return `Bad share: ${desk}% of requests are desk runs, and ${slow}% of those run over 10 seconds, so ${desk}% times ${slow}% is ${pct(bad)}%. R3 allows ${ALLOWED}%. Attainment is ${pct(100 - bad)}% against a target of 95%. R3 is ${met ? "met" : "missed"}.`;
}

type Phase = "pick" | "hint" | "done";

export default function Architecture01NumberMeets({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState<Choice | null>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);
  const [desk, setDesk] = useState(10);
  const [slow, setSlow] = useState(60);

  const m = MIXES[idx];
  const right: Choice = isMet(m.desk, m.slow) ? "met" : "missed";

  const check = () => {
    if (!pick) return;
    if (pick === right) {
      if (phase === "pick") setFirstTry((n) => n + 1);
      setPhase("done");
    } else if (phase === "pick") {
      setPhase("hint");
      setPick(null);
    } else {
      setPhase("done");
    }
  };

  const next = () => {
    if (idx === MIXES.length - 1) {
      setFinished(true);
      complete(`Predicted ${firstTry} of ${MIXES.length} traffic mixes against R3 first time`);
      return;
    }
    setIdx(idx + 1);
    setPick(null);
    setPhase("pick");
  };

  const calcBad = badShare(desk, slow);
  const calcMet = isMet(desk, slow);
  const maxSlow = desk === 0 ? 100 : Math.min(100, (ALLOWED * 100) / desk);

  return (
    <div className="w-panel architecture01-number-meets">
      <p className="w-label">Three made-up traffic mixes</p>
      {!finished && (
        <>
          <p className="architecture01-number-meets-count w-label" aria-live="polite">
            Mix {idx + 1} of {MIXES.length}
          </p>
          <p className="architecture01-number-meets-mix">
            {m.desk}% of requests are desk runs. {m.slow}% of those desk runs take longer than 10 seconds. Every ask request finishes in time.
          </p>
          <fieldset className="architecture01-number-meets-pick" disabled={phase === "done"}>
            <legend>Is R3 met?</legend>
            <div className="architecture01-number-meets-opts" role="radiogroup" aria-label="Is R3 met">
              {(["met", "missed"] as Choice[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={pick === c}
                  className={`architecture01-number-meets-opt${pick === c ? " on" : ""}${phase === "done" && c === right ? " right" : ""}`}
                  onClick={() => setPick(c)}
                >
                  {c === "met" ? "R3 is met" : "R3 is missed"}
                </button>
              ))}
            </div>
          </fieldset>
          {phase !== "done" && (
            <button type="button" className="w-btn" disabled={!pick} onClick={check}>
              Check my pick
            </button>
          )}
          {phase === "hint" && (
            <div className="w-verdict bad" role="status">
              Not that one. Multiply the two shares, then compare the result with the {ALLOWED}% that R3 allows. A ratio objective is met when attainment is at or above its target. You have one more try.
            </div>
          )}
          {phase === "done" && (
            <div className="w-stack">
              <div className={`w-verdict ${pick === right ? "good" : "bad"}`} role="status">
                {pick === right ? "Correct. " : `R3 is ${right}. `}
                {sum(m.desk, m.slow)}
                {m.id === "edge" ? " The share sits exactly on the limit, so R3 passes with no budget left. One more slow desk run would miss it." : ""}
              </div>
              <button type="button" className="w-btn" onClick={next}>
                {idx === MIXES.length - 1 ? "See the result" : "Next mix"}
              </button>
            </div>
          )}
        </>
      )}
      {finished && (
        <>
          <div className="w-verdict good" role="status">
            You predicted {firstTry} of {MIXES.length} mixes on the first try. The desk budget lets a run take 60 seconds, which is six times the R3 limit. Whether R3 survives depends on two shares, and the design has to say what they are.
          </div>
          <div className="architecture01-number-meets-play" role="group" aria-label="Your own traffic mix">
            <p className="w-label">Try your own mix</p>
            <label className="architecture01-number-meets-slider">
              <span>
                Desk runs: <strong>{desk}%</strong> of requests
              </span>
              <input type="range" min={0} max={30} step={1} value={desk} onChange={(e) => setDesk(Number(e.target.value))} />
            </label>
            <label className="architecture01-number-meets-slider">
              <span>
                Desk runs over 10 seconds: <strong>{slow}%</strong>
              </span>
              <input type="range" min={0} max={100} step={5} value={slow} onChange={(e) => setSlow(Number(e.target.value))} />
            </label>
            <p className="architecture01-number-meets-out w-inset">
              The bad share is {pct(calcBad)}%, so attainment is {pct(100 - calcBad)}%. R3 is {calcMet ? "met" : "missed"}.{" "}
              {desk === 0
                ? "With no desk runs, nothing can push R3 over the limit."
                : `At ${desk}% desk runs, R3 holds only while ${pct(maxSlow)}% or fewer of them run over 10 seconds.`}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
