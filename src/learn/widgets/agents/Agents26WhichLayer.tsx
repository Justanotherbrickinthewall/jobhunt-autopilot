import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents26WhichLayer.css";

type Layer = "see" | "choose" | "leave" | "person" | "evals";

const LAYERS: { id: Layer; label: string }[] = [
  { id: "see", label: "What it sees: signals only" },
  { id: "choose", label: "What it may choose: allowed_steps" },
  { id: "leave", label: "What leaves: the mail check" },
  { id: "person", label: "Who decides: the sales queue" },
  { id: "evals", label: "None of them: only the evals notice" },
];

const ITEMS: { id: string; name: string; answer: Layer; why: string }[] = [
  { id: "name", name: "A refactor puts the customer's name into the decide prompt.", answer: "see", why: "The prompt-leak check counts names and currency in every prompt. The fix is in what the prompt is built from, which is signals." },
  { id: "refund", name: "The model proposes a refund for a customer who is still short.", answer: "choose", why: "allowed_steps for a short customer holds no refund. The guard blocks it and asks once more." },
  { id: "nolink", name: "A draft email leaves out the payment link.", answer: "leave", why: "The mail check finds no link in the text and returns missing link. The mail does not go." },
  { id: "amount", name: "A draft adds the line Pay a different amount now.", answer: "leave", why: "The check finds a currency figure that is not the amount due, so the mail is redrafted." },
  { id: "handoff", name: "The model proposes hand_to_sales when a reminder was right.", answer: "evals", why: "hand_to_sales is allowed for every short customer, so the guard lets it through. Action accuracy and trajectory match score it as wrong." },
  { id: "twice", name: "The model proposes a blocked step twice in a row.", answer: "person", why: "After the second block the code stops asking and sends the case to the sales queue." },
  { id: "redraft", name: "Both drafts of an email fail the check.", answer: "person", why: "One redraft is allowed. After that the case goes to the sales queue with the reason mail_check." },
  { id: "flaky", name: "On the same signals the model picks the right step two times in three.", answer: "evals", why: "Every single pick is allowed and each run looks fine. Only pass^k, which repeats the pick, shows the flakiness." },
  { id: "overdue", name: "An instalment is 21 days overdue and the customer has not paid.", answer: "person", why: "No rule can settle whether to chase or write it off. The reference step hands it to sales." },
];

export default function Agents26WhichLayer({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, Layer | undefined>>({});
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);
  const answered = ITEMS.filter((i) => picks[i.id]).length;
  const hits = ITEMS.filter((i) => picks[i.id] === i.answer).length;

  return (
    <div className="w-panel agents26-layers">
      <p className="agents26-layers-note">Name the layer that catches each slip. Predict first, then check all nine.</p>
      <div className="w-stack">
        {ITEMS.map((it) => {
          const pick = picks[it.id];
          const right = checked && pick === it.answer;
          const wrong = checked && pick !== it.answer;
          return (
            <fieldset key={it.id} className={`agents26-layers-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
              <legend className="agents26-layers-legend">Slip</legend>
              <p className="agents26-layers-text">{it.name}</p>
              <div className="agents26-layers-opts" role="radiogroup" aria-label={it.name}>
                {LAYERS.map((l) => (
                  <label key={l.id} className={`agents26-layers-opt${pick === l.id ? " on" : ""}`}>
                    <input
                      type="radio"
                      name={`agents26-layers-${it.id}`}
                      value={l.id}
                      checked={pick === l.id}
                      disabled={checked}
                      onChange={() => setPicks((p) => ({ ...p, [it.id]: l.id }))}
                    />
                    <span>{l.label}</span>
                  </label>
                ))}
              </div>
              {checked && (
                <p className="agents26-layers-why" role="status">
                  {right ? "Matched. " : `Better fit: ${LAYERS.find((l) => l.id === it.answer)?.label}. `}
                  {it.why}
                </p>
              )}
            </fieldset>
          );
        })}
      </div>
      <div className="w-row">
        {!checked ? (
          <button
            type="button"
            className="w-btn primary"
            disabled={answered < ITEMS.length}
            onClick={() => {
              setChecked(true);
              complete(`${hits} of ${ITEMS.length} matched`);
            }}
          >
            Check my sort ({answered} of {ITEMS.length})
          </button>
        ) : (
          <button
            type="button"
            className="w-btn ghost"
            onClick={() => {
              setPicks({});
              setChecked(false);
            }}
          >
            Try again
          </button>
        )}
      </div>
      {checked && (
        <div className={`w-verdict ${hits >= 7 ? "good" : "bad"}`} role="status">
          You matched {hits} of {ITEMS.length}. The guard only blocks what is unsafe. A step that is allowed and wrong passes every layer, so the evals are the only net under it.
        </div>
      )}
    </div>
  );
}
