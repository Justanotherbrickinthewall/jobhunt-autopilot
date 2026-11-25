import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Llmops07IncidentDrill.css";

type Kind = "slow_rerank" | "token_bloat" | "empty_retrieval";

// Illustrative figures. They come from one run of `askpep incident seed --kind <kind>` with seed 7 and the
// placeholder prices in pricing.json. Each window is 120 requests. "Before" is the healthy hour.
const CLUES: { label: string; values: Record<Kind, [string, string]> }[] = [
  {
    label: "Requests in each window",
    values: { slow_rerank: ["120", "120"], token_bloat: ["120", "120"], empty_retrieval: ["120", "120"] },
  },
  {
    label: "Share of requests that failed",
    values: { slow_rerank: ["1.7%", "0.8%"], token_bloat: ["1.7%", "0.8%"], empty_retrieval: ["1.7%", "69.2%"] },
  },
  {
    label: "Mean chunks retrieved",
    values: { slow_rerank: ["6.0", "6.0"], token_bloat: ["6.0", "6.0"], empty_retrieval: ["6.0", "1.9"] },
  },
  {
    label: "Rerank p95 in milliseconds",
    values: { slow_rerank: ["155", "1,352"], token_bloat: ["155", "150"], empty_retrieval: ["155", "157"] },
  },
  {
    label: "Generate p95 in milliseconds",
    values: { slow_rerank: ["3,309", "3,095"], token_bloat: ["3,309", "5,261"], empty_retrieval: ["3,309", "3,057"] },
  },
  {
    label: "Mean input tokens in generate",
    values: { slow_rerank: ["2,194", "2,196"], token_bloat: ["2,194", "8,785"], empty_retrieval: ["2,194", "2,128"] },
  },
  {
    label: "Total latency p95 in milliseconds, limit 10,000",
    values: { slow_rerank: ["3,579", "4,309"], token_bloat: ["3,579", "5,523"], empty_retrieval: ["3,579", "3,180"] },
  },
  {
    label: "Mean total latency in milliseconds",
    values: { slow_rerank: ["2,696", "3,652"], token_bloat: ["2,696", "4,358"], empty_retrieval: ["2,696", "1,024"] },
  },
  {
    label: "Cost per successful task, limit $0.02",
    values: { slow_rerank: ["$0.0118", "$0.0119"], token_bloat: ["$0.0118", "$0.0317"], empty_retrieval: ["$0.0118", "$0.0118"] },
  },
  {
    label: "Objectives missed",
    values: { slow_rerank: ["none", "rerank-latency"], token_bloat: ["none", "cost-per-success"], empty_retrieval: ["none", "answer-success"] },
  },
];

const OPTIONS = [
  "The rerank stage got slower.",
  "The generate stage got slower.",
  "The generate stage sends more input tokens.",
  "Retrieval returned too little, so requests were refused.",
  "No stage moved enough to explain it.",
];

type Round = { kind: Kind; answer: number; why: string };

// A fixed order that differs from the order the chapter showed the kinds in.
const ROUNDS: Round[] = [
  {
    kind: "empty_retrieval",
    answer: 3,
    why: "The failed share rose from 1.7% to 69.2%, and the mean chunks fell from 6.0 to 1.9. That is the first rule in diagnose, so it wins. Latency looks better, with a mean of 1,024 ms against 2,696 ms, because a refused request skips generation. Only answer-success broke.",
  },
  {
    kind: "token_bloat",
    answer: 2,
    why: "Mean input tokens in generate went from 2,194 to 8,785, a factor of 4.0. Generate p95 also rose, from 3,309 ms to 5,261 ms. That slowdown follows from the bigger prompt, so blaming generate for the delay finds the symptom and misses the cause. The token rule comes before the latency rule. Only cost-per-success broke.",
  },
  {
    kind: "slow_rerank",
    answer: 0,
    why: "Rerank p95 went from 155 ms to 1,352 ms. Failures, chunks and input tokens barely moved, so the first two rules do not fire. The generate p95 fell a little, which is noise over 120 requests. Only rerank-latency broke, and the total-latency objective stayed met at 4,309 ms.",
  },
];

type RoundState = { opened: number[]; picks: number[]; done: boolean; right: boolean };
const fresh = (): RoundState => ({ opened: [], picks: [], done: false, right: false });
const NEEDED = 3;

export default function Llmops07IncidentDrill({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [current, setCurrent] = useState(0);
  const [states, setStates] = useState<RoundState[]>(ROUNDS.map(fresh));
  const finished = states.every((s) => s.done);

  const round = ROUNDS[current];
  const state = states[current];
  const canPick = state.opened.length >= NEEDED && !state.done;
  const lastPick = state.picks[state.picks.length - 1];

  const change = (next: RoundState) => setStates((all) => all.map((s, i) => (i === current ? next : s)));

  const open = (i: number) => {
    if (state.opened.includes(i)) return;
    change({ ...state, opened: [...state.opened, i] });
  };

  const pick = (i: number) => {
    if (!canPick) return;
    const picks = [...state.picks, i];
    const right = i === round.answer;
    const done = right || picks.length >= 2;
    const next = { ...state, picks, done, right };
    change(next);
    if (done && current === ROUNDS.length - 1) {
      const all = states.map((s, j) => (j === current ? next : s));
      complete(`${all.filter((s) => s.right).length} of ${ROUNDS.length} regressions diagnosed`);
    }
  };

  return (
    <div className="w-panel llmops07-drill">
      <p className="llmops07-drill-hint">
        Illustrative figures from three seeded files, 120 requests before the change and 120 after. Each round hides one regression. Open at least {NEEDED} clues, then name what changed. Round {current + 1} of {ROUNDS.length}.
      </p>

      <div className="llmops07-drill-rounds" aria-label="Progress">
        {ROUNDS.map((r, i) => (
          <span
            key={r.kind}
            className={`w-chip llmops07-drill-step${i === current ? " now" : ""}${states[i].done ? (states[i].right ? " good" : " bad") : ""}`}
          >
            Round {i + 1}
            {states[i].done ? (states[i].right ? ", found" : ", missed") : ""}
          </span>
        ))}
      </div>

      <section className="llmops07-drill-card" aria-label={`Round ${current + 1}`}>
        <div className="llmops07-drill-clues">
          {CLUES.map((c, i) => {
            const shown = state.opened.includes(i);
            const [before, after] = c.values[round.kind];
            return (
              <div key={c.label} className={`llmops07-drill-clue${shown ? " open" : ""}`}>
                <button
                  type="button"
                  className="llmops07-drill-open"
                  aria-expanded={shown}
                  onClick={() => open(i)}
                  disabled={shown}
                >
                  {c.label}
                </button>
                {shown && (
                  <dl className="llmops07-drill-values">
                    <div><dt>Before</dt><dd className="w-mono">{before}</dd></div>
                    <div><dt>After</dt><dd className="w-mono">{after}</dd></div>
                  </dl>
                )}
              </div>
            );
          })}
        </div>

        <fieldset className="llmops07-drill-ask">
          <legend>
            {state.opened.length < NEEDED
              ? `Open ${NEEDED - state.opened.length} more clue${NEEDED - state.opened.length === 1 ? "" : "s"} to unlock the answers.`
              : "What changed in the second window?"}
          </legend>
          <div className="llmops07-drill-options" role="radiogroup" aria-label="Your diagnosis">
            {OPTIONS.map((o, i) => (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={lastPick === i}
                disabled={!canPick}
                className={`w-chip llmops07-drill-option${lastPick === i ? " on" : ""}${state.done && i === round.answer ? " right" : ""}`}
                onClick={() => pick(i)}
              >
                {o}
              </button>
            ))}
          </div>
        </fieldset>

        {state.picks.length === 1 && !state.done && (
          <p className="llmops07-drill-why miss" role="status">Not that one. Open another clue and try once more.</p>
        )}
        {state.done && (
          <p className={`llmops07-drill-why ${state.right ? "ok" : "miss"}`} role="status">
            <strong>{state.right ? "Correct. " : "The marked answer is the one that fits. "}</strong>
            {round.why}
          </p>
        )}
        {state.done && current < ROUNDS.length - 1 && (
          <div className="w-row">
            <button type="button" className="w-btn primary" onClick={() => setCurrent(current + 1)}>Next round</button>
          </div>
        )}
      </section>

      {finished && (
        <div className="w-verdict good" role="status">
          The cause comes before the symptom. Slow generation, cheap fast answers and a high bill each had a different cause, and the order of the rules in diagnose is what separates them.
        </div>
      )}
    </div>
  );
}
