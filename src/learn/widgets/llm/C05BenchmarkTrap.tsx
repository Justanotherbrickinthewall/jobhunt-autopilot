import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C05BenchmarkTrap.css";

type Slice = { id: string; label: string };
type Model = { id: string; name: string; board: number; scores: number[] };

// Illustrative figures, hand-authored for teaching. They are not measurements of any real model.
const SLICES: Slice[] = [
  { id: "clean", label: "Clean digital" },
  { id: "scan", label: "Scanned" },
  { id: "fx", label: "Multi-currency" },
];
const MODELS: Model[] = [
  { id: "p", name: "Model P", board: 91, scores: [98, 70, 60] },
  { id: "q", name: "Model Q", board: 87, scores: [95, 88, 90] },
  { id: "r", name: "Model R", board: 82, scores: [90, 80, 75] },
];
const MIXES: { id: string; label: string; w: number[] }[] = [
  { id: "harbour", label: "Harbour mix: 50 clean, 30 scanned, 20 multi-currency", w: [50, 30, 20] },
  { id: "clean", label: "Mostly clean mix: 90 clean, 5 scanned, 5 multi-currency", w: [90, 5, 5] },
];

const weighted = (m: Model, w: number[]) => m.scores.reduce((s, v, i) => s + (v * w[i]) / 100, 0);

export default function C05BenchmarkTrap({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [guess, setGuess] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [mix, setMix] = useState("harbour");

  const w = MIXES.find((m) => m.id === mix)!.w;
  const scored = MODELS.map((m) => ({ m, total: weighted(m, w) }));
  const winner = [...scored].sort((a, b) => b.total - a.total)[0].m;
  const harbourWinner = [...MODELS].sort((a, b) => weighted(b, MIXES[0].w) - weighted(a, MIXES[0].w))[0];
  const right = guess === harbourWinner.id;

  const reveal = () => {
    setRevealed(true);
    const n = attempts + 1;
    setAttempts(n);
    if (right) complete("Predicted the winner on your own data");
    else if (n >= 2) complete("Trusted the leaderboard order twice, explanation shown");
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel llm-benchmark-trap">
        <p className="llm-benchmark-trap-note">Illustrative figures. Three fictional models. Per-slice scores are the percentage of invoices extracted correctly.</p>

        <div className="llm-benchmark-trap-board">
          <h4 className="llm-benchmark-trap-h">Public leaderboard, general score</h4>
          <ol className="llm-benchmark-trap-list">
            {[...MODELS].sort((a, b) => b.board - a.board).map((m) => (
              <li key={m.id}>
                <span>{m.name}</span>
                <svg viewBox="0 0 100 8" className="llm-benchmark-trap-svg" aria-hidden="true">
                  <rect width="100" height="8" rx="4" className="llm-benchmark-trap-track" />
                  <rect width={m.board} height="8" rx="4" className="llm-benchmark-trap-fill" />
                </svg>
                <b className="w-mono">{m.board}</b>
              </li>
            ))}
          </ol>
        </div>

        <fieldset className="llm-benchmark-trap-guess">
          <legend className="llm-benchmark-trap-h">Your prediction: which model is best on Harbour invoices?</legend>
          <div className="w-row">
            {MODELS.map((m) => (
              <button key={m.id} type="button" className="w-chip" aria-pressed={guess === m.id} disabled={revealed} onClick={() => setGuess(m.id)}>
                {m.name}
              </button>
            ))}
          </div>
        </fieldset>

        {!revealed && (
          <div className="w-row">
            <button type="button" className="w-btn" disabled={guess === null} onClick={reveal}>
              Reveal the per-slice results
            </button>
          </div>
        )}

        {revealed && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="llm-benchmark-trap-slices">
            <h4 className="llm-benchmark-trap-h">Your data, by slice</h4>
            <div className="w-row" aria-label="Invoice mix">
              {MIXES.map((m) => (
                <button key={m.id} type="button" className="w-chip" aria-pressed={mix === m.id} onClick={() => setMix(m.id)}>
                  {m.id === "harbour" ? "Harbour mix" : "Mostly clean mix"}
                </button>
              ))}
            </div>
            <p className="llm-benchmark-trap-note">{MIXES.find((m) => m.id === mix)!.label}</p>
            <div className="llm-benchmark-trap-tablewrap">
              <table className="llm-benchmark-trap-table">
                <thead>
                  <tr>
                    <th scope="col">Model</th>
                    {SLICES.map((s, i) => (
                      <th scope="col" key={s.id}>
                        {s.label} <span className="w-mono">x {w[i]}%</span>
                      </th>
                    ))}
                    <th scope="col">Weighted</th>
                  </tr>
                </thead>
                <tbody>
                  {scored.map(({ m, total }) => (
                    <tr key={m.id} className={m.id === winner.id ? "win" : ""}>
                      <th scope="row">{m.name}</th>
                      {m.scores.map((v, i) => (
                        <td key={i} className="w-mono">
                          {v}
                        </td>
                      ))}
                      <td className="w-mono">
                        <b>{total.toFixed(1)}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {revealed && (
          <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
            {right
              ? `Correct. ${harbourWinner.name} wins on Harbour invoices even though it is second on the leaderboard.`
              : `${harbourWinner.name} wins on Harbour invoices, and it is second on the leaderboard.`}{" "}
            It reads scans and foreign currency far better, and Harbour sends plenty of both. Switch to the mostly clean mix and Model P overtakes it. The ranking depends on the slice weights, so only your own traffic mix can settle it.
            {!right && attempts < 2 && (
              <> <button type="button" className="w-btn ghost" onClick={() => { setRevealed(false); setGuess(null); setMix("harbour"); }}>Try again</button></>
            )}
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
