import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Architecture02CheapestPassing.css";

// Four runs of `cheapest_passing` on the 16 item routing slice. Every score is illustrative, because the
// learner measures their own with `askpep eval run --slice routing`. The prices are the placeholders in pricing.json.
// CHECK: replace the placeholder prices with the provider's current prices before you trust a cost figure.

const ITEMS = 16;
const TOKENS_IN = 1000;
const TOKENS_OUT = 300;

type Price = { input: number; output: number };
type Candidate = { name: string; right: number; price: Price | null };
type Case = {
  id: string;
  title: string;
  floor: number;
  candidates: Candidate[];
  answer: string;
  why: string;
};

const FLASH35: Price = { input: 0.3, output: 2.5 };
const FLASH38: Price = { input: 0.5, output: 3.0 };
const ARGON: Price = { input: 2.0, output: 12.0 };
const SONNET: Price = { input: 3.0, output: 15.0 };

const KEY_ERROR = "KeyError";
const VALUE_ERROR = "ValueError";

const CASES: Case[] = [
  {
    id: "c1",
    title: "A cheaper model one item short",
    floor: 0.9,
    candidates: [
      { name: "gemini-3.5-flash", right: 14, price: FLASH35 },
      { name: "gemini-3.8-flash", right: 15, price: FLASH38 },
      { name: "gemini-4-argon", right: 16, price: ARGON },
      { name: "claude-sonnet-5-5", right: 16, price: SONNET },
    ],
    answer: "gemini-3.8-flash",
    why: "14 of 16 is 0.875, which is under the floor of 0.90, so gemini-3.5-flash drops out. Of the three that remain, gemini-3.8-flash costs least. It is also the desk's default, so routing saves nothing for this role.",
  },
  {
    id: "c2",
    title: "The same scores, a lower floor",
    floor: 0.85,
    candidates: [
      { name: "gemini-3.5-flash", right: 14, price: FLASH35 },
      { name: "gemini-3.8-flash", right: 15, price: FLASH38 },
      { name: "gemini-4-argon", right: 16, price: ARGON },
      { name: "claude-sonnet-5-5", right: 16, price: SONNET },
    ],
    answer: "gemini-3.5-flash",
    why: "Now all four clear the floor, and the function takes the cheapest, not the best scorer. gemini-3.5-flash is 25 percent cheaper per call than gemini-3.8-flash. The edge over the floor is one item out of 16, so run the slice again before you trust it.",
  },
  {
    id: "c3",
    title: "Nobody reaches the floor",
    floor: 0.95,
    candidates: [
      { name: "gemini-3.5-flash", right: 13, price: FLASH35 },
      { name: "gemini-3.8-flash", right: 14, price: FLASH38 },
      { name: "gemini-4-argon", right: 15, price: ARGON },
      { name: "claude-sonnet-5-5", right: 15, price: SONNET },
    ],
    answer: VALUE_ERROR,
    why: "The best score is 15 of 16, which is 0.9375, and the floor is 0.95. Nothing passes, so the function raises ValueError. Keep the desk's default model for this role. Do not lower the floor to get an answer.",
  },
  {
    id: "c4",
    title: "A passing model with no price",
    floor: 0.9,
    candidates: [
      { name: "gemini-3.5-flash-lite", right: 15, price: null },
      { name: "gemini-3.8-flash", right: 15, price: FLASH38 },
      { name: "claude-sonnet-5-5", right: 16, price: SONNET },
    ],
    answer: KEY_ERROR,
    why: "gemini-3.5-flash-lite scores 15 of 16, so it passes, and it has no entry in pricing.json. The function raises KeyError and does not guess. Add the price from the provider's page, then run it again.",
  },
];

const fmt = (n: number, digits: number) => n.toLocaleString("en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const callCost = (p: Price) => (TOKENS_IN * p.input + TOKENS_OUT * p.output) / 1_000_000;

// The same rule as cheapest_passing: the cheapest passing model, ties to the higher score and then the name.
function pick(c: Case): string {
  const passing = c.candidates.filter((m) => m.right / ITEMS >= c.floor);
  if (passing.length === 0) return VALUE_ERROR;
  if (passing.some((m) => m.price === null)) return KEY_ERROR;
  const ordered = [...passing].sort(
    (a, b) => callCost(a.price as Price) - callCost(b.price as Price) || b.right - a.right || a.name.localeCompare(b.name),
  );
  return ordered[0].name;
}

export default function Architecture02CheapestPassing({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);

  const c = CASES[index];
  const answer = pick(c);
  const last = index === CASES.length - 1;
  const options = [...c.candidates.map((m) => m.name), VALUE_ERROR, KEY_ERROR];
  const right = choice === answer;

  const check = () => {
    if (choice === null) return;
    const k = attempts + 1;
    setAttempts(k);
    if (choice === answer || k >= 2) {
      setResolved(true);
      const hits = firstTry + (choice === answer && k === 1 ? 1 : 0);
      setFirstTry(hits);
      if (last) complete(`${hits} of ${CASES.length} cases right on the first try`);
    }
  };
  const next = () => {
    setIndex(index + 1);
    setChoice(null);
    setAttempts(0);
    setResolved(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel architecture02-cheapest-passing">
        <div className="w-row between">
          <span className="w-label">
            Case {index + 1} of {CASES.length}: {c.title}
          </span>
          <span className="architecture02-cheapest-passing-note">Illustrative figures</span>
        </div>
        <p className="architecture02-cheapest-passing-ask">
          Role: triage, scored on the {ITEMS} item routing slice. The floor is {fmt(c.floor, 2)}. A call is {fmt(TOKENS_IN, 0)} tokens in and {TOKENS_OUT} out, at placeholder prices. What does{" "}
          <span className="w-mono">cheapest_passing</span> return?
        </p>

        <div className="architecture02-cheapest-passing-table" role="table" aria-label="Candidate models">
          {c.candidates.map((m) => {
            const passes = m.right / ITEMS >= c.floor;
            const winner = resolved && answer === m.name;
            return (
              <div
                key={m.name}
                role="row"
                className={`architecture02-cheapest-passing-row${resolved && passes ? " pass" : ""}${winner ? " win" : ""}`}
              >
                <span role="cell" className="architecture02-cheapest-passing-name w-mono">
                  {m.name}
                </span>
                <span role="cell">
                  {m.right} of {ITEMS}, {fmt(m.right / ITEMS, 4)}
                </span>
                <span role="cell">{m.price ? `${fmt(callCost(m.price), 5)} USD a call` : "no price in pricing.json"}</span>
                {resolved && (
                  <span role="cell" className="architecture02-cheapest-passing-flag">
                    {passes ? "clears the floor" : "under the floor"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {!resolved && (
          <>
            <div className="architecture02-cheapest-passing-opts" role="radiogroup" aria-label="Your prediction">
              {options.map((o) => (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={choice === o}
                  className={`architecture02-cheapest-passing-opt w-mono${choice === o ? " on" : ""}`}
                  onClick={() => setChoice(o)}
                >
                  {o}
                </button>
              ))}
            </div>
            <div className="w-row">
              <button type="button" className="w-btn primary" disabled={choice === null} onClick={check}>
                Check my prediction
              </button>
            </div>
            {attempts > 0 && (
              <div className="w-verdict bad" role="status">
                Not quite. Drop the models under the floor first, then look at the prices of those that remain. Watch for a model with no price.
              </div>
            )}
          </>
        )}

        {resolved && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="architecture02-cheapest-passing-result">
            <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
              <strong>{right ? "Correct. " : "Not quite. "}</strong>
              The result is <span className="w-mono">{answer}</span>. {c.why}
            </div>
            <div className="w-row">
              {!last ? (
                <button type="button" className="w-btn primary" onClick={next}>
                  Next case
                </button>
              ) : (
                <span className="w-chip good">All four cases done: {firstTry} right on the first try</span>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </MotionConfig>
  );
}
