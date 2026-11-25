import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents05GapCost.css";

// CHECK: the three token means are from one offline run of `askpep desk compare` on 8 November 2026. It used the reference code's fakes, five fixture PEPs and 8 of the 22 golden questions. The fake model counts characters at four to a token, so a live run will give different means and a different ratio. Type your own means from a live run into the two token boxes before you trust the cost lines.
const OFFLINE_TOKENS = { baseline: 1292, handoffs: 1461, supervisor: 1749 } as const;

const QUESTIONS = 22;
const START_BASELINE = 16;
const START_TEAM = 18;

type Team = "supervisor" | "handoffs";
type Guess = "wins" | "unproven" | "cheaper";

const GUESSES: { id: Guess; text: string }[] = [
  { id: "wins", text: "The supervisor wins, because 18 is more than 16." },
  { id: "unproven", text: "Nothing is proven, because two questions is inside the noise of a 22 question set." },
  { id: "cheaper", text: "The baseline wins, because it costs fewer tokens." },
];

const fmt = (n: number, digits = 0) =>
  n.toLocaleString("en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const points = (k: number) => (k / QUESTIONS) * 100;

// The rough width, in accuracy points, of the gap that chance alone could produce between two designs
// on QUESTIONS questions. It treats the two score sets as independent, which is a cautious simplification:
// both designs answer the same questions, so the true width is somewhat smaller.
function noiseBand(a: number, b: number): number {
  const pa = a / QUESTIONS;
  const pb = b / QUESTIONS;
  return 1.96 * Math.sqrt((pa * (1 - pa)) / QUESTIONS + (pb * (1 - pb)) / QUESTIONS) * 100;
}

function assess(baselinePass: number, teamPass: number) {
  const gap = teamPass - baselinePass;
  const gapPoints = points(gap);
  const band = noiseBand(baselinePass, teamPass);
  return { gap, gapPoints, band, clears: gap > 0 && gapPoints > band };
}

const toNumber = (text: string) => {
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export default function Agents05GapCost({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [guess, setGuess] = useState<Guess | null>(null);
  const [locked, setLocked] = useState(false);
  const [team, setTeam] = useState<Team>("supervisor");
  const [baselinePass, setBaselinePass] = useState(START_BASELINE);
  const [teamPass, setTeamPass] = useState(START_TEAM);
  const [baselineTokens, setBaselineTokens] = useState(String(OFFLINE_TOKENS.baseline));
  const [teamTokens, setTeamTokens] = useState(String(OFFLINE_TOKENS.supervisor));
  const [volume, setVolume] = useState("10000");
  const [price, setPrice] = useState("");

  const a = assess(baselinePass, teamPass);
  const baseTok = toNumber(baselineTokens);
  const teamTok = toNumber(teamTokens);
  const extra = teamTok - baseTok;
  const extraPct = baseTok > 0 ? (extra / baseTok) * 100 : 0;
  const perExtraAnswer = a.gap > 0 && extra > 0 ? (QUESTIONS * extra) / a.gap : null;
  const monthlyExtra = toNumber(volume) * extra;
  const money = toNumber(price) > 0 ? (monthlyExtra / 1_000_000) * toNumber(price) : null;

  const check = (b: number, t: number) => {
    if (locked && assess(b, t).clears) {
      complete(`predicted ${guess}, found a gap that clears the noise: baseline ${b}, team ${t}`);
    }
  };
  const moveBaseline = (value: number) => {
    setBaselinePass(value);
    check(value, teamPass);
  };
  const moveTeam = (value: number) => {
    setTeamPass(value);
    check(baselinePass, value);
  };
  const chooseTeam = (next: Team) => {
    setTeam(next);
    setTeamTokens(String(OFFLINE_TOKENS[next]));
  };

  let verdict: { tone: "good" | "bad" | ""; text: string };
  if (a.gap < 0) {
    verdict = { tone: "bad", text: "The team design scores lower than the baseline. Drop it." };
  } else if (a.gap === 0) {
    verdict =
      extra > 0
        ? { tone: "bad", text: "A tie that costs more. Drop the team design." }
        : { tone: "", text: "A tie. Keep whichever design costs less." };
  } else if (!a.clears) {
    verdict = {
      tone: "bad",
      text: `The gap is ${a.gap} ${a.gap === 1 ? "question" : "questions"}, and the noise band is ${fmt(a.band)} points. Inside the noise, so the team has not proved itself.`,
    };
  } else {
    verdict = {
      tone: "good",
      text: `The gap is ${fmt(a.gapPoints, 1)} points against a noise band of ${fmt(a.band)}. The gain looks real. Now ask whether it is worth the extra cost.`,
    };
  }

  return (
    <div className="w-panel agents05-gap-cost">
      <fieldset className="agents05-gap-cost-guess" disabled={locked}>
        <legend className="w-label">Predict first</legend>
        <p className="agents05-gap-cost-q">
          The baseline passes {START_BASELINE} of the {QUESTIONS} golden questions. The supervisor passes {START_TEAM}.
          The supervisor reads {fmt(OFFLINE_TOKENS.supervisor)} tokens a question against the baseline&apos;s{" "}
          {fmt(OFFLINE_TOKENS.baseline)}. Which conclusion does the evidence support?
        </p>
        <div className="agents05-gap-cost-opts" role="radiogroup" aria-label="Your conclusion">
          {GUESSES.map((g) => (
            <button
              key={g.id}
              type="button"
              role="radio"
              aria-checked={guess === g.id}
              className={`agents05-gap-cost-opt${guess === g.id ? " on" : ""}`}
              onClick={() => setGuess(g.id)}
            >
              {g.text}
            </button>
          ))}
        </div>
        {!locked && (
          <div className="w-row">
            <button type="button" className="w-btn primary" disabled={!guess} onClick={() => setLocked(true)}>
              Lock in my conclusion
            </button>
          </div>
        )}
      </fieldset>

      {locked && (
        <>
          <div className={`w-verdict ${guess === "unproven" ? "good" : "bad"}`} role="status">
            {guess === "unproven"
              ? "Right. Two questions of 22 is a 9 point gap, and a 22 question set cannot separate gaps that small from luck."
              : "Not quite. Two questions of 22 is a 9 point gap, and a 22 question set cannot separate gaps that small from luck. Nothing is proven yet."}{" "}
            Move the sliders to find how big the gap must be before it counts.
          </div>

          <div className="agents05-gap-cost-grid">
            <label className="agents05-gap-cost-slider">
              <span className="w-label">Baseline passes</span>
              <input
                type="range"
                min={0}
                max={QUESTIONS}
                value={baselinePass}
                onChange={(e) => moveBaseline(Number(e.target.value))}
              />
              <span className="w-mono">
                {baselinePass} of {QUESTIONS}, {fmt(points(baselinePass), 1)} points
              </span>
            </label>
            <label className="agents05-gap-cost-slider">
              <span className="w-label">Team design passes</span>
              <input
                type="range"
                min={0}
                max={QUESTIONS}
                value={teamPass}
                onChange={(e) => moveTeam(Number(e.target.value))}
              />
              <span className="w-mono">
                {teamPass} of {QUESTIONS}, {fmt(points(teamPass), 1)} points
              </span>
            </label>
          </div>

          <div className="agents05-gap-cost-team" role="radiogroup" aria-label="Team design">
            <span className="w-label">Team design</span>
            {(["supervisor", "handoffs"] as Team[]).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={team === t}
                className={`w-chip${team === t ? " is-on" : ""}`}
                onClick={() => chooseTeam(t)}
              >
                {t === "supervisor" ? "Supervisor" : "Handoffs"}
              </button>
            ))}
          </div>

          <div className="agents05-gap-cost-meter" aria-hidden="true">
            <div className="agents05-gap-cost-track">
              <span
                className="agents05-gap-cost-band"
                style={{ width: `${Math.min(100, a.band)}%` }}
                title="The noise band"
              />
              <span
                className={`agents05-gap-cost-gap${a.clears ? " clears" : ""}`}
                style={{ width: `${Math.min(100, Math.max(0, a.gapPoints))}%` }}
                title="The gap"
              />
            </div>
            <div className="agents05-gap-cost-legend">
              <span>
                <i className="agents05-gap-cost-key band" /> Noise band {fmt(a.band)} points
              </span>
              <span>
                <i className="agents05-gap-cost-key gap" /> Gap {fmt(Math.max(0, a.gapPoints), 1)} points
              </span>
            </div>
          </div>

          <div className={`w-verdict ${verdict.tone}`} role="status" aria-live="polite">
            {verdict.text}
          </div>

          <div className="agents05-gap-cost-cost w-inset">
            <p className="agents05-gap-cost-note">
              Tokens a question default to the offline run. Replace them with your own live means from{" "}
              <code>askpep desk compare</code>. Leave the price box empty if you want tokens only.
            </p>
            <div className="agents05-gap-cost-fields">
              <label>
                <span className="w-label">Baseline tokens a question</span>
                <input type="number" min={0} value={baselineTokens} onChange={(e) => setBaselineTokens(e.target.value)} />
              </label>
              <label>
                <span className="w-label">Team tokens a question</span>
                <input type="number" min={0} value={teamTokens} onChange={(e) => setTeamTokens(e.target.value)} />
              </label>
              <label>
                <span className="w-label">Questions a month</span>
                <input type="number" min={0} value={volume} onChange={(e) => setVolume(e.target.value)} />
              </label>
              <label>
                <span className="w-label">Price per million tokens</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  placeholder="your own price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
            </div>
            <ul className="agents05-gap-cost-lines">
              <li>
                The team design reads {extra >= 0 ? "" : "minus "}
                <strong>{fmt(Math.abs(extra))}</strong> {extra >= 0 ? "more" : "fewer"} tokens a question than the baseline, a
                change of <strong>{fmt(extraPct, 0)}%</strong>.
              </li>
              <li>
                Over {fmt(toNumber(volume))} questions a month, that is <strong>{fmt(monthlyExtra)}</strong> tokens
                {money !== null ? (
                  <>
                    , or <strong>{fmt(money, 2)}</strong> at your price
                  </>
                ) : null}
                .
              </li>
              <li>
                {perExtraAnswer !== null ? (
                  <>
                    Each extra correct answer on this set costs about <strong>{fmt(perExtraAnswer)}</strong> extra tokens.
                  </>
                ) : (
                  <>There is no extra correct answer to price. The team design is paying for no gain.</>
                )}
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
