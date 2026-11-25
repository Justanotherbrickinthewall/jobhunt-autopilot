import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents24ModelSees.css";

type Side = "model" | "code";

const SIDES: { id: Side; label: string }[] = [
  { id: "model", label: "Reaches the model" },
  { id: "code", label: "Stays in code" },
];

const ITEMS: { id: string; name: string; answer: Side; why: string }[] = [
  { id: "delta", name: "delta_sign: -1, 0 or 1", answer: "model", why: "It is a sign. It says short, on target or ahead, and it holds no amount." },
  { id: "owed", name: "The amount still owed, £1,031.25", answer: "code", why: "Calculate returns it beside the signals. Only the mail filler reads it, after the model has finished." },
  { id: "name", name: "The customer's name", answer: "code", why: "A name in a prompt is a leak. The mail draft carries a placeholder and code fills it." },
  { id: "expired", name: "link_expired: true or false", answer: "model", why: "A flag derived from the provider's expiry time. It holds no money and no identity." },
  { id: "mail", name: "days_since_mail: 99 when never mailed", answer: "model", why: "A small count. It lets the model choose between a reminder and a new link." },
  { id: "value", name: "The itinerary value, £7,150.00", answer: "code", why: "It is an amount. The model never needs it, because plan_changed already says whether it moved." },
  { id: "pos", name: "position: first, middle or last", answer: "model", why: "A label for where the instalment sits. It shapes the wording of the draft." },
  { id: "url", name: "The payment link URL", answer: "code", why: "The provider returns it, and the mail filler puts it in the mail. The model has no use for it." },
  { id: "changed", name: "plan_changed: the value moved and the rebalance has not run", answer: "model", why: "A flag. It tells the model to wait for tonight's rebalance, with no figure attached." },
  { id: "over", name: "days_overdue: 2", answer: "model", why: "A count of days. It is derived from dates and carries no money." },
];

export default function Agents24ModelSees({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, Side | undefined>>({});
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);
  const answered = ITEMS.filter((i) => picks[i.id]).length;
  const hits = ITEMS.filter((i) => picks[i.id] === i.answer).length;

  return (
    <div className="w-panel agents24-model-sees">
      <p className="agents24-model-sees-note">Decide for each field whether it may reach the model. Predict first, then check all ten.</p>
      <div className="w-stack">
        {ITEMS.map((it) => {
          const pick = picks[it.id];
          const right = checked && pick === it.answer;
          const wrong = checked && pick !== it.answer;
          return (
            <fieldset key={it.id} className={`agents24-model-sees-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
              <legend className="agents24-model-sees-legend">Field</legend>
              <p className="agents24-model-sees-text">{it.name}</p>
              <div className="agents24-model-sees-opts" role="radiogroup" aria-label={it.name}>
                {SIDES.map((s) => (
                  <label key={s.id} className={`agents24-model-sees-opt${pick === s.id ? " on" : ""}`}>
                    <input
                      type="radio"
                      name={`agents24-model-sees-${it.id}`}
                      value={s.id}
                      checked={pick === s.id}
                      disabled={checked}
                      onChange={() => setPicks((p) => ({ ...p, [it.id]: s.id }))}
                    />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
              {checked && (
                <p className="agents24-model-sees-why" role="status">
                  {right ? "Matched. " : `Better fit: ${SIDES.find((s) => s.id === it.answer)?.label}. `}
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
        <div className={`w-verdict ${hits >= 8 ? "good" : "bad"}`} role="status">
          You matched {hits} of {ITEMS.length}. The test: is it a sign, a flag or a count derived from the money, or is it the money or the person? Derived signals reach the model. Amounts, names and links stay in code.
        </div>
      )}
    </div>
  );
}
