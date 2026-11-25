import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Evals01PooledOrSliced.css";

// Illustrative figures. Each row is one slice of the desk's golden set: passes before and after a rewrite of
// the triage prompt, out of the slice's item count. The retrieval count is the 20 answerable items that the runner scores. The other counts match the v1 files (16, 14, 12, 25).
// The pooled total is 79 of 87 both times, because the gains in answer and action cancel the loss in routing.

type Row = { id: string; name: string; before: number; after: number; of: number };
type Decision = "ship" | "hold";

const ROWS: Row[] = [
  { id: "retrieval", name: "Retrieval", before: 18, after: 18, of: 20 },
  { id: "routing", name: "Routing", before: 16, after: 12, of: 16 },
  { id: "answer", name: "Answer", before: 11, after: 13, of: 14 },
  { id: "action", name: "Action", before: 9, after: 11, of: 12 },
  { id: "attack", name: "Attack", before: 25, after: 25, of: 25 },
];

const total = (key: "before" | "after" | "of") => ROWS.reduce((n, r) => n + r[key], 0);
const POOLED_BEFORE = total("before");
const POOLED_AFTER = total("after");
const ITEMS = total("of");
const pct = (n: number, of: number) => `${Math.round((n / of) * 1000) / 10}%`;

const change = (r: Row) => {
  const d = r.after - r.before;
  return d === 0 ? "No change" : d > 0 ? `Plus ${d}` : `Minus ${-d}`;
};

const WHY =
  "Routing fell from 16 of 16 to 12 of 16, which is four items. Answer and action gained four items between them, so the pooled score stayed flat. The right call is to hold the change and read the four routing items that now fail.";

export default function Evals01PooledOrSliced({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [opened, setOpened] = useState<string[]>([]);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [checked, setChecked] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const routingOpened = opened.includes("routing");
  const right = decision === "hold" && routingOpened;
  const finished = checked && (right || attempts >= 2);

  const toggle = (id: string) => {
    if (checked) return;
    setOpened((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  };

  const check = () => {
    if (!decision) return;
    const n = attempts + 1;
    setAttempts(n);
    setChecked(true);
    if (decision === "hold" && routingOpened) {
      complete("Held a flat pooled score because routing fell");
    } else if (n >= 2) {
      complete("Saw the explanation after two tries");
    }
  };

  let message: string;
  if (right) {
    message = `Correct. ${WHY}`;
  } else if (attempts >= 2) {
    message = `Not quite. ${WHY}`;
  } else if (decision === "ship" && routingOpened) {
    message =
      "You saw routing lose four items and still shipped. A flat pooled score does not cancel a loss in one slice. Change your decision and try once more.";
  } else if (decision === "ship") {
    message =
      "You shipped on the pooled score alone, and it is flat, so it showed no problem. Open the slices before you decide. Change your decision and try once more.";
  } else {
    message =
      "Holding was cautious, but you never opened routing, where the loss is. Open the slices so you know why you hold. Change your decision and try once more.";
  }

  return (
    <div className="w-panel evals01-pooled-or-sliced">
      <div className="evals01-pooled-or-sliced-scene">
        <span className="w-label">The run</span>
        <p>
          You rewrote the triage prompt and ran the golden set before and after. The pooled score counts all {ITEMS} items together.
        </p>
        <div className="evals01-pooled-or-sliced-pooled">
          <div>
            <span className="w-label">Pooled before</span>
            <strong>
              {POOLED_BEFORE} of {ITEMS}
            </strong>
            <span>{pct(POOLED_BEFORE, ITEMS)}</span>
          </div>
          <div>
            <span className="w-label">Pooled after</span>
            <strong>
              {POOLED_AFTER} of {ITEMS}
            </strong>
            <span>{pct(POOLED_AFTER, ITEMS)}</span>
          </div>
        </div>
      </div>

      <div className="evals01-pooled-or-sliced-group">
        <span className="w-label">Open the slices you want to read</span>
        <table className="evals01-pooled-or-sliced-table">
          <thead>
            <tr>
              <th scope="col">Slice</th>
              <th scope="col">Before</th>
              <th scope="col">After</th>
              <th scope="col">Change</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const open = opened.includes(r.id);
              const dropped = open && r.after < r.before;
              return (
                <tr key={r.id} className={dropped ? "drop" : undefined}>
                  <th scope="row">
                    <button type="button" className="w-chip" aria-pressed={open} disabled={checked} onClick={() => toggle(r.id)}>
                      {r.name}
                    </button>
                  </th>
                  {open ? (
                    <>
                      <td>
                        {r.before} of {r.of}
                        <small>{pct(r.before, r.of)}</small>
                      </td>
                      <td>
                        {r.after} of {r.of}
                        <small>{pct(r.after, r.of)}</small>
                      </td>
                      <td>{change(r)}</td>
                    </>
                  ) : (
                    <td colSpan={3} className="evals01-pooled-or-sliced-closed">
                      Closed
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="evals01-pooled-or-sliced-group" role="group" aria-label="Your decision">
        <span className="w-label">What do you do with the change?</span>
        <div className="w-row">
          <button type="button" className="w-chip" aria-pressed={decision === "ship"} disabled={checked} onClick={() => setDecision("ship")}>
            Ship it
          </button>
          <button type="button" className="w-chip" aria-pressed={decision === "hold"} disabled={checked} onClick={() => setDecision("hold")}>
            Hold it
          </button>
        </div>
      </div>

      <div className="w-row">
        {!checked ? (
          <button type="button" className="w-btn primary" disabled={!decision} onClick={check}>
            Check my decision
          </button>
        ) : (
          !finished && (
            <button type="button" className="w-btn ghost" onClick={() => setChecked(false)}>
              Change my decision
            </button>
          )
        )}
      </div>

      {checked && (
        <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
          {message}
        </div>
      )}

      <p className="evals01-pooled-or-sliced-note">Illustrative figures. The numbers are invented to show the effect. They are not results from your desk.</p>
    </div>
  );
}
