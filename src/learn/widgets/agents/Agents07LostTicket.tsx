import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents07LostTicket.css";

type Strategy = "retry" | "check" | "cleanup" | "giveup";
type Outcome = "safe" | "repaired" | "bad";

type World = { title: string; steps: string[]; tickets: number; peak: number; wrongReport?: boolean };

const STRATEGIES: { id: Strategy; label: string; detail: string }[] = [
  { id: "retry", label: "Run it again", detail: "Call open_ticket again with the same arguments." },
  { id: "check", label: "Look first, then decide", detail: "List the tickets for this thread and title, then decide." },
  { id: "cleanup", label: "Run it again, then close the extra", detail: "Run it again, list the tickets, close any duplicate." },
  { id: "giveup", label: "Tell the user it failed", detail: "Report that no ticket was filed." },
];

const PREDICTIONS: { id: Outcome; label: string }[] = [
  { id: "safe", label: "Exactly one ticket in both worlds, and never two" },
  { id: "repaired", label: "One ticket at the end, but two at some point" },
  { id: "bad", label: "At least one world ends wrong" },
];

// Teaching model only. Two hidden worlds: the first insert landed (A), or it never reached the table (B).
function simulate(strategy: Strategy, hasKey: boolean, hasLookup: boolean): { a: World; b: World } {
  const lostA = ["The first insert landed. One ticket exists.", "The call died before the result reached the desk."];
  const lostB = ["The first insert never reached the table. No ticket exists.", "The call died before the result reached the desk."];
  const a: World = { title: "World A: the first insert landed", steps: lostA, tickets: 1, peak: 1 };
  const b: World = { title: "World B: the first insert never ran", steps: lostB, tickets: 0, peak: 0 };

  if (strategy === "retry") {
    if (hasKey) {
      a.steps = [...lostA, "You run it again with the same key.", "The table refuses a second row and returns the first ticket."];
      b.steps = [...lostB, "You run it again with the same key.", "The table creates the ticket once."];
      b.tickets = 1;
      b.peak = 1;
    } else {
      a.steps = [...lostA, "You run it again. The table sees a new request.", "A second ticket is created."];
      a.tickets = 2;
      a.peak = 2;
      b.steps = [...lostB, "You run it again.", "One ticket is created."];
      b.tickets = 1;
      b.peak = 1;
    }
  }

  if (strategy === "check") {
    a.steps = [...lostA, "You list the tickets. One matches this thread and title.", "You do not run it again."];
    b.steps = [...lostB, "You list the tickets. None matches.", "You run it again. One ticket is created."];
    b.tickets = 1;
    b.peak = 1;
  }

  if (strategy === "cleanup") {
    if (hasKey) {
      a.steps = [...lostA, "You run it again with the same key.", "The table returns the first ticket.", "Nothing to close."];
      b.steps = [...lostB, "You run it again with the same key.", "One ticket is created.", "Nothing to close."];
      b.tickets = 1;
      b.peak = 1;
    } else if (hasLookup) {
      a.steps = [...lostA, "You run it again. A second ticket is created.", "You list the tickets and find two.", "You close one."];
      a.tickets = 1;
      a.peak = 2;
      b.steps = [...lostB, "You run it again. One ticket is created.", "You list the tickets. One ticket, nothing to close."];
      b.tickets = 1;
      b.peak = 1;
    } else {
      a.steps = [...lostA, "You run it again. A second ticket is created.", "You cannot list tickets, so the duplicate stays."];
      a.tickets = 2;
      a.peak = 2;
      b.steps = [...lostB, "You run it again. One ticket is created."];
      b.tickets = 1;
      b.peak = 1;
    }
  }

  if (strategy === "giveup") {
    a.steps = [...lostA, "You tell the user the ticket failed.", "A ticket exists, but the user believes it does not."];
    a.wrongReport = true;
    b.steps = [...lostB, "You tell the user the ticket failed.", "Nothing is filed until someone asks again."];
  }
  return { a, b };
}

function classify(a: World, b: World): Outcome {
  const wrong = a.tickets !== 1 || b.tickets !== 1 || a.wrongReport;
  if (wrong) return "bad";
  return a.peak > 1 || b.peak > 1 ? "repaired" : "safe";
}

const EXPLAIN: Record<Outcome, string> = {
  safe: "Both worlds end with one ticket and neither passes through two. The key or the lookup removed the guess.",
  repaired: "Both worlds end with one ticket, but world A held two for a while. Anyone who read the tickets table in that window saw a duplicate. Preventing it beats repairing it.",
  bad: "At least one world ends wrong. A duplicate ticket, a missing ticket and a false report each break the run.",
};

function TicketIcons({ tickets, peak }: { tickets: number; peak: number }) {
  return (
    <svg className="agents07-lost-ticket-icons" viewBox="0 0 96 28" role="img" aria-label={`${tickets} tickets at the end, ${peak} at most`}>
      {[0, 1].map((i) => {
        const filled = i < tickets;
        const wasThere = i < peak;
        return (
          <g key={i} transform={`translate(${8 + i * 40} 4)`}>
            <rect width="34" height="20" rx="5" fill={filled ? "var(--teal)" : "none"} stroke={filled ? "var(--teal)" : wasThere ? "var(--amber)" : "var(--line)"} strokeWidth="2" strokeDasharray={filled ? undefined : "4 3"} />
            <text x="17" y="14" textAnchor="middle" fontSize="12" fill={filled ? "var(--on-accent)" : "var(--muted)"}>
              ticket
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Agents07LostTicket({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [hasKey, setHasKey] = useState(false);
  const [hasLookup, setHasLookup] = useState(true);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [prediction, setPrediction] = useState<Outcome | null>(null);
  const [ran, setRan] = useState(false);
  const [runs, setRuns] = useState(0);

  const clear = () => setRan(false);
  const sim = strategy ? simulate(strategy, hasKey, hasLookup) : null;
  const outcome = sim ? classify(sim.a, sim.b) : null;

  const run = () => {
    if (!sim || !outcome || !prediction) return;
    setRan(true);
    setRuns((n) => n + 1);
    // Right answer: the prediction matches. Otherwise complete on the second run, with the explanation shown.
    if (prediction === outcome || runs >= 1) complete(prediction === outcome ? `Predicted ${outcome} correctly` : `Predicted ${prediction}, actual ${outcome}`);
  };

  const toggleLookup = (v: boolean) => {
    setHasLookup(v);
    if (!v && strategy === "check") setStrategy(null);
    clear();
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel agents07-lost-ticket">
        <p className="agents07-lost-ticket-note">
          The writer called <span className="w-mono">open_ticket</span> for a ticket titled Fix the PEP 572 page. The call died before the desk saw a result. Illustrative scenario.
        </p>

        <div className="w-row agents07-lost-ticket-toggles">
          <label className="agents07-lost-ticket-check">
            <input type="checkbox" checked={hasKey} onChange={(e) => { setHasKey(e.target.checked); clear(); }} />
            <span>The call carries an idempotency key, and the table refuses a second row with it</span>
          </label>
          <label className="agents07-lost-ticket-check">
            <input type="checkbox" checked={hasLookup} onChange={(e) => toggleLookup(e.target.checked)} />
            <span>The desk can list tickets by thread and title</span>
          </label>
        </div>

        <fieldset className="agents07-lost-ticket-group">
          <legend className="w-label">Your strategy</legend>
          <div className="agents07-lost-ticket-options">
            {STRATEGIES.map((s) => {
              const off = s.id === "check" && !hasLookup;
              const on = strategy === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`agents07-lost-ticket-opt${on ? " is-on" : ""}`}
                  aria-pressed={on}
                  disabled={off}
                  onClick={() => { setStrategy(s.id); clear(); }}
                >
                  <span className="agents07-lost-ticket-opt-label">{s.label}</span>
                  <span className="agents07-lost-ticket-opt-detail">{off ? "Needs the lookup." : s.detail}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="agents07-lost-ticket-group">
          <legend className="w-label">Predict before you run</legend>
          <div className="agents07-lost-ticket-options">
            {PREDICTIONS.map((p) => {
              const on = prediction === p.id;
              return (
                <button key={p.id} type="button" className={`agents07-lost-ticket-opt${on ? " is-on" : ""}`} aria-pressed={on} onClick={() => { setPrediction(p.id); clear(); }}>
                  <span className="agents07-lost-ticket-opt-label">{p.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="w-row">
          <button type="button" className="w-btn primary" disabled={!strategy || !prediction} onClick={run}>
            Run both worlds
          </button>
        </div>

        {ran && sim && outcome && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="agents07-lost-ticket-result">
            <div className="agents07-lost-ticket-worlds">
              {[sim.a, sim.b].map((w) => (
                <div key={w.title} className="agents07-lost-ticket-world w-inset">
                  <span className="w-label">{w.title}</span>
                  <ol className="agents07-lost-ticket-steps">
                    {w.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                  <TicketIcons tickets={w.tickets} peak={w.peak} />
                  <span className="agents07-lost-ticket-count">
                    Ends with {w.tickets} {w.tickets === 1 ? "ticket" : "tickets"}
                    {w.peak > w.tickets ? `, peaked at ${w.peak}` : ""}.
                  </span>
                </div>
              ))}
            </div>
            <div className={`w-verdict ${prediction === outcome ? "good" : "bad"}`} role="status">
              <strong>{prediction === outcome ? "Your prediction was right." : "Your prediction was off."}</strong> {EXPLAIN[outcome]}{" "}
              {strategy === "check" && !hasKey
                ? "Looking first is safe for one caller. Two callers that look at the same moment both find nothing, and both insert. Only the key closes that gap."
                : outcome !== "safe"
                  ? "Try switching the key on and compare."
                  : "Switch the key and the lookup off one at a time to see what each one protects."}
            </div>
          </motion.div>
        )}
      </div>
    </MotionConfig>
  );
}
