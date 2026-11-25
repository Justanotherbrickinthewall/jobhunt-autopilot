import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents06LimitRace.css";

type Winner = "step_budget" | "recursion_limit";
type Race = { budget: number; limit: number; why: string };

// Illustrative. One tool-calling model call in a desk agent costs about four graph steps. The real count
// moves by a few, because triage and the set-up nodes add some, so every race below keeps a clear gap.
const GRAPH_STEPS_PER_CALL = 4;

const STOP_TEXT: Record<Winner, string> = {
  step_budget: "I stopped before finishing, because I used all the steps this run is allowed.",
  recursion_limit: "I stopped before finishing, because the run went through too many graph steps.",
};

const callsToRecursion = (limit: number) => Math.floor(limit / GRAPH_STEPS_PER_CALL);
const winner = (r: Race): Winner => (r.budget <= callsToRecursion(r.limit) ? "step_budget" : "recursion_limit");

const RACES: Race[] = [
  {
    budget: 12,
    limit: 100,
    why: "The default setting. The budget ends the run at call 12, long before the 100 graph steps run out at about call 25. The user reads a clear reason.",
  },
  {
    budget: 12,
    limit: 40,
    why: "A limit of 40 allows about 10 calls, and the budget allows 12. LangGraph's error fires first, and the user reads the vaguer message about graph steps.",
  },
  {
    budget: 30,
    limit: 100,
    why: "Someone raised the step budget and left the limit alone. Thirty calls need about 120 graph steps, so the limit stops the run at about call 25.",
  },
  {
    budget: 8,
    limit: 64,
    why: "A tight budget and a roomy limit. The budget ends the run at call 8, and the limit would allow about 16.",
  },
  {
    budget: 20,
    limit: 60,
    why: "A limit of 60 allows about 15 calls. The budget of 20 never gets to fire.",
  },
];

export default function Agents06LimitRace({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<(Winner | null)[]>(RACES.map(() => null));

  const pick = (i: number, said: Winner) => {
    if (picks[i] !== null) return;
    const next = picks.map((p, j) => (j === i ? said : p));
    setPicks(next);
    if (next.every((p) => p !== null)) {
      const right = next.filter((p, j) => p === winner(RACES[j])).length;
      complete(`${right} of ${RACES.length} races called right`);
    }
  };

  const answered = picks.filter((p) => p !== null).length;

  return (
    <div className="w-panel agents06-limit-race">
      <p className="agents06-limit-race-hint">
        Each card is a run that never finishes. Assume one model call costs {GRAPH_STEPS_PER_CALL} graph steps. Predict which limit ends the run. {answered} of {RACES.length} answered.
      </p>
      {RACES.map((r, i) => {
        const truth = winner(r);
        const picked = picks[i];
        const done = picked !== null;
        const stopAt = callsToRecursion(r.limit);
        const scale = Math.max(r.budget, stopAt) * 1.05;
        return (
          <section key={`${r.budget}-${r.limit}`} className="agents06-limit-race-card" aria-label={`Race ${i + 1}`}>
            <p className="agents06-limit-race-config">
              <span className="w-mono">DESK_MAX_STEPS={r.budget}</span> and <span className="w-mono">DESK_RECURSION_LIMIT={r.limit}</span>
            </p>
            <div className="agents06-limit-race-choices" role="radiogroup" aria-label="Which limit ends the run">
              {(["step_budget", "recursion_limit"] as Winner[]).map((w) => (
                <button
                  key={w}
                  type="button"
                  role="radio"
                  aria-checked={picked === w}
                  disabled={done}
                  className={`w-chip w-mono agents06-limit-race-choice${picked === w ? " on" : ""}${done && w === truth ? " right" : ""}`}
                  onClick={() => pick(i, w)}
                >
                  {w}
                </button>
              ))}
            </div>
            {done && (
              <>
                <div className="agents06-limit-race-bars" role="img" aria-label={`The step budget ends the run at call ${r.budget}. The recursion limit ends it at about call ${stopAt}.`}>
                  <div className="agents06-limit-race-bar">
                    <span className="agents06-limit-race-name">Step budget, call {r.budget}</span>
                    <span className="agents06-limit-race-track">
                      <span className={`agents06-limit-race-fill${truth === "step_budget" ? " first" : ""}`} style={{ width: `${(r.budget / scale) * 100}%` }} />
                    </span>
                  </div>
                  <div className="agents06-limit-race-bar">
                    <span className="agents06-limit-race-name">Recursion limit, about call {stopAt}</span>
                    <span className="agents06-limit-race-track">
                      <span className={`agents06-limit-race-fill${truth === "recursion_limit" ? " first" : ""}`} style={{ width: `${(stopAt / scale) * 100}%` }} />
                    </span>
                  </div>
                </div>
                <p className={`agents06-limit-race-why ${picked === truth ? "ok" : "miss"}`} role="status">
                  <strong>{picked === truth ? "Correct. " : `Missed. It is ${truth}. `}</strong>
                  {r.why}
                </p>
                <p className="agents06-limit-race-reads">
                  The user reads: <q>{STOP_TEXT[truth]}</q>
                </p>
              </>
            )}
          </section>
        );
      })}
      {answered === RACES.length && (
        <div className="w-verdict good" role="status">
          The recursion limit has to sit well above the step budget times the cost of one call. Then the budget fires first, and the user reads which limit they hit.
        </div>
      )}
    </div>
  );
}
