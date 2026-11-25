import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Evals03JudgeGrid.css";

// Grid cells: bothPass, judgePassPersonFail, judgeFailPersonPass, bothFail. Each grid sums to 100.
type Grid = { name: string; note: string; bp: number; jp_pf: number; jf_pp: number; bf: number; agreeOptions: number[] };

const GRIDS: Grid[] = [
  { name: "Judge A", note: "Rubric version 3, with an anchor for each score.", bp: 45, jp_pf: 5, jf_pp: 5, bf: 45, agreeOptions: [70, 80, 90] },
  { name: "Judge B", note: "A quick rubric with no anchors.", bp: 80, jp_pf: 12, jf_pp: 3, bf: 5, agreeOptions: [92, 85, 70] },
  { name: "Judge C", note: "Rubric version 2, with anchors for only the top and bottom scores.", bp: 60, jp_pf: 15, jf_pp: 5, bf: 20, agreeOptions: [65, 80, 90] },
];

const DECISIONS = ["Gate the release", "Trend signal, with spot checks by a person", "Not usable until the rubric is fixed"];

function stats(g: Grid) {
  const n = g.bp + g.jp_pf + g.jf_pp + g.bf;
  const agree = (g.bp + g.bf) / n;
  const judgePass = (g.bp + g.jp_pf) / n;
  const personPass = (g.bp + g.jf_pp) / n;
  const chance = judgePass * personPass + (1 - judgePass) * (1 - personPass);
  const kappa = (agree - chance) / (1 - chance);
  const falsePass = g.jp_pf / (g.bp + g.jp_pf);
  const decision = kappa >= 0.6 && Math.round(falsePass * 100) <= 10 ? 0 : kappa >= 0.4 ? 1 : 2;
  return { agree: Math.round(agree * 100), kappa, falsePass, decision };
}

export default function Evals03JudgeGrid({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [agreePicks, setAgreePicks] = useState<(number | null)[]>(GRIDS.map(() => null));
  const [decPicks, setDecPicks] = useState<(number | null)[]>(GRIDS.map(() => null));
  const [revealed, setRevealed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const ready = agreePicks.every((p) => p !== null) && decPicks.every((p) => p !== null);
  const results = GRIDS.map(stats);
  const decOk = decPicks.filter((p, i) => p === results[i].decision).length;
  const agreeOk = agreePicks.filter((p, i) => p !== null && GRIDS[i].agreeOptions[p] === results[i].agree).length;

  const allRight = decOk === GRIDS.length && agreeOk === GRIDS.length;
  const done = revealed && (allRight || attempt >= 2);
  const agreeRight = (i: number) => agreePicks[i] !== null && GRIDS[i].agreeOptions[agreePicks[i] as number] === results[i].agree;

  const reveal = () => {
    const n = attempt + 1;
    setAttempt(n);
    setRevealed(true);
    if (allRight || n >= 2) complete(`${decOk} of ${GRIDS.length} gating decisions correct, ${agreeOk} agreement figures correct, on attempt ${n}`);
  };

  const retry = () => {
    setAgreePicks((ps) => ps.map((x, i) => (agreeRight(i) ? x : null)));
    setDecPicks((ps) => ps.map((x, i) => (x === results[i].decision ? x : null)));
    setRevealed(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel evals03-judge-grid">
        <p className="evals03-judge-grid-hint">
          Illustrative figures. Each judge ran on its own set of 100 desk answers about the PEPs. You labelled every answer pass or fail. Work out the agreement, then decide what the judge may do.
        </p>
        <p className="evals03-judge-grid-rule w-inset">
          Rule of thumb for this exercise: gate only if kappa is at least 0.6 and no more than 10 percent of the judge&apos;s passes are answers you failed. A kappa from 0.4 up to 0.6 is a trend signal. Below 0.4, fix the rubric.
        </p>
        {GRIDS.map((g, i) => {
          const r = results[i];
          return (
            <section key={g.name} className="evals03-judge-grid-card" aria-label={g.name}>
              <div className="w-label">{g.name}</div>
              <p className="evals03-judge-grid-note">{g.note}</p>
              <table className="evals03-judge-grid-table">
                <caption className="evals03-judge-grid-cap">Counts out of 100 answers</caption>
                <thead>
                  <tr>
                    <th scope="col"></th>
                    <th scope="col">You pass</th>
                    <th scope="col">You fail</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Judge passes</th>
                    <td className="ok w-mono">{g.bp}</td>
                    <td className="bad w-mono">{g.jp_pf}</td>
                  </tr>
                  <tr>
                    <th scope="row">Judge fails</th>
                    <td className="warn w-mono">{g.jf_pp}</td>
                    <td className="ok w-mono">{g.bf}</td>
                  </tr>
                </tbody>
              </table>
              <div className="w-label">Agreement</div>
              <div className="evals03-judge-grid-opts" role="radiogroup" aria-label={`${g.name} agreement`}>
                {g.agreeOptions.map((a, ai) => (
                  <button
                    key={a}
                    type="button"
                    role="radio"
                    aria-checked={agreePicks[i] === ai}
                    disabled={revealed || (attempt > 0 && agreeRight(i))}
                    className={`w-chip evals03-judge-grid-opt${agreePicks[i] === ai ? " is-on" : ""}${done && a === r.agree ? " good" : ""}`}
                    onClick={() => setAgreePicks((ps) => ps.map((x, j) => (j === i ? ai : x)))}
                  >
                    {a} percent
                  </button>
                ))}
              </div>
              <div className="w-label">What may this judge do?</div>
              <div className="evals03-judge-grid-opts" role="radiogroup" aria-label={`${g.name} decision`}>
                {DECISIONS.map((d, di) => (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={decPicks[i] === di}
                    disabled={revealed || (attempt > 0 && decPicks[i] === r.decision)}
                    className={`w-chip evals03-judge-grid-opt${decPicks[i] === di ? " is-on" : ""}${done && di === r.decision ? " good" : ""}`}
                    onClick={() => setDecPicks((ps) => ps.map((x, j) => (j === i ? di : x)))}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <AnimatePresence>
                {revealed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`evals03-judge-grid-fix ${decPicks[i] === r.decision ? "ok" : "miss"}`}
                  >
                    Agreement {r.agree} percent, kappa {r.kappa.toFixed(2)}, false passes {Math.round(r.falsePass * 100)} percent of the judge&apos;s passes.{" "}
                    {decPicks[i] === r.decision ? "Correct. " : `Missed: the answer is "${DECISIONS[r.decision]}". `}
                    {i === 1 ? "The high agreement comes from a lenient judge on a set where most answers are good." : ""}
                  </motion.p>
                )}
              </AnimatePresence>
            </section>
          );
        })}
        {!revealed && (
          <button type="button" className="w-btn primary" disabled={!ready} onClick={reveal}>
            Check my calls
          </button>
        )}
        {revealed && !done && (
          <button type="button" className="w-btn primary" onClick={retry}>
            Fix my wrong calls
          </button>
        )}
        {done && (
          <div className={`w-verdict ${decOk === GRIDS.length ? "good" : "bad"}`} role="status">
            {decOk} of {GRIDS.length} decisions correct. Judge B agrees 85 percent of the time and still has the lowest kappa of the three. Agreement counts the easy passes. Read kappa and the false pass share before you let a judge gate anything.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
