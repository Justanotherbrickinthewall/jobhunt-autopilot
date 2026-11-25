import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Guardrails08SwitchOrder.css";

// Each case follows the order of check_call in the lab: the kill switch, then authorise, then the tool.
// The HTTP case follows the kill_switch middleware in api.py. The row text matches what the code writes.

type Option = { id: string; label: string };
type Row = { event: string; name: string; action: string; who: string; reason: string };
type Case = {
  title: string;
  setting: string;
  who: string;
  call: string;
  note: string;
  options: Option[];
  answer: string;
  rows: Row[];
  result: string;
  why: string;
};

const CASES: Case[] = [
  {
    title: "Case 1: the switch is off and a reader files a ticket",
    setting: "KILL_SWITCH is empty",
    who: "rita, a reader",
    call: "The desk calls the tool open_ticket.",
    note: "open_ticket needs the staff role.",
    options: [
      { id: "a", label: "No rows, because the call never starts." },
      { id: "b", label: "One authz row with the action denied." },
      { id: "c", label: "One kill_switch row with the action block." },
    ],
    answer: "b",
    rows: [
      {
        event: "authz",
        name: "open_ticket",
        action: "denied",
        who: "rita/reader",
        reason: "open_ticket needs the staff role, and rita is a reader",
      },
    ],
    result: "The call stops at authorisation, and the model reads the reason as an error.",
    why: "An empty switch covers nothing, so the first check passes. Authorisation is the next check, and it writes the row that records the denial.",
  },
  {
    title: "Case 2: the actions switch is on and a reader files a ticket",
    setting: "KILL_SWITCH is actions",
    who: "rita, a reader",
    call: "The desk calls the tool open_ticket.",
    note: "open_ticket is in ACTION_TOOLS, and a reader has no right to call it.",
    options: [
      { id: "a", label: "An authz row with denied, then a kill_switch row." },
      { id: "b", label: "One authz row with the action denied." },
      { id: "c", label: "One kill_switch row with the action block, and no authz row." },
    ],
    answer: "c",
    rows: [
      {
        event: "kill_switch",
        name: "open_ticket",
        action: "block",
        who: "rita/reader",
        reason: "KILL_SWITCH=actions is on, so open_ticket is off",
      },
    ],
    result: "The run ends with the fixed sentence for the kill switch. Nothing waits for an approval.",
    why: "The kill switch is the first check, so the call stops there. Authorisation never runs, which is why no authz row exists.",
  },
  {
    title: "Case 3: the actions switch is on and a member of staff searches",
    setting: "KILL_SWITCH is actions",
    who: "stan, a member of staff",
    call: "The desk calls the tool search_peps.",
    note: "GUARD_STAGES here is input,retrieved,output, so no guard checks the arguments.",
    options: [
      { id: "a", label: "An authz row with allow, then a tool row with executed." },
      { id: "b", label: "One kill_switch row with the action block." },
      { id: "c", label: "Only a tool row with executed." },
    ],
    answer: "a",
    rows: [
      {
        event: "authz",
        name: "search_peps",
        action: "allow",
        who: "stan/staff",
        reason: "staff may use search_peps",
      },
      { event: "tool", name: "search_peps", action: "executed", who: "stan/staff", reason: "" },
    ],
    result: "The search runs and returns passages to the model.",
    why: "The actions scope covers only the tools in ACTION_TOOLS, and search_peps is not one of them. The call passes every check and runs.",
  },
  {
    title: "Case 4: the all switch is on and a caller sends a wrong key",
    setting: "KILL_SWITCH is all",
    who: "a caller whose x-api-key matches no key",
    call: "The caller sends POST /search.",
    note: "With a wrong key, the route would normally answer 401.",
    options: [
      { id: "a", label: "401, and no row, because the key check fails first." },
      { id: "b", label: "503, and one kill_switch row for anonymous with the role none." },
      { id: "c", label: "503, and no row, because an unknown caller has no principal." },
    ],
    answer: "b",
    rows: [
      {
        event: "kill_switch",
        name: "/search",
        action: "block",
        who: "anonymous/none",
        reason: "KILL_SWITCH=all",
      },
    ],
    result: "The caller reads 503 with the body The desk is switched off.",
    why: "The middleware runs before any route and before the key check. It records an unknown caller as anonymous, so every attempt during the incident is on the trail.",
  },
];

function RowsTable({ rows }: { rows: Row[] }) {
  return (
    <ul className="guardrails08-switch-order-rows" aria-label="The audit rows this call writes">
      {rows.map((r, i) => (
        <li key={i} className="w-mono">
          {r.event}:{r.name} {r.action} {r.who}
          {r.reason ? ` "${r.reason}"` : ""}
        </li>
      ))}
    </ul>
  );
}

export default function Guardrails08SwitchOrder({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const c = CASES[index];
  const right = pick === c.answer;

  const check = () => {
    if (pick === null) return;
    const n = attempts + 1;
    setAttempts(n);
    if (pick === c.answer || n >= 2) {
      setResolved(true);
      if (pick === c.answer && n === 1) setFirstTry((k) => k + 1);
    }
  };

  const next = () => {
    if (index + 1 < CASES.length) {
      setIndex(index + 1);
      setPick(null);
      setAttempts(0);
      setResolved(false);
    } else {
      setFinished(true);
      complete(`Predicted ${firstTry} of ${CASES.length} cases on the first try`);
    }
  };

  return (
    <div className="w-panel guardrails08-switch-order">
      <div className="w-row between">
        <span className="w-label">{c.title}</span>
        <span className="guardrails08-switch-order-count">
          {index + 1} of {CASES.length}
        </span>
      </div>

      <div className="guardrails08-switch-order-scene">
        <p>
          <strong>Setting.</strong> {c.setting}
        </p>
        <p>
          <strong>Who.</strong> {c.who}
        </p>
        <p>
          <strong>The call.</strong> {c.call} {c.note}
        </p>
      </div>

      <div className="guardrails08-switch-order-group" role="radiogroup" aria-label="Your prediction">
        <span className="w-label">Predict: what does this call write?</span>
        <div className="guardrails08-switch-order-opts">
          {c.options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={pick === o.id}
              className={`guardrails08-switch-order-opt${pick === o.id ? " on" : ""}`}
              disabled={resolved}
              onClick={() => setPick(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-row">
        {!resolved && (
          <button type="button" className="w-btn primary" disabled={pick === null} onClick={check}>
            Check my prediction
          </button>
        )}
        {resolved && !finished && (
          <button type="button" className="w-btn ghost" onClick={next}>
            {index + 1 < CASES.length ? "Next case" : "Finish"}
          </button>
        )}
      </div>

      {attempts > 0 && !resolved && (
        <div className="w-verdict bad" role="status">
          Not quite. Ask which check runs first, and whether this call gets past it. Then pick again.
        </div>
      )}

      {resolved && (
        <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
          <strong>{right ? "Correct. " : "Not quite. "}</strong>
          {c.result} {c.why}
        </div>
      )}

      {resolved && <RowsTable rows={c.rows} />}

      {finished && (
        <div className="w-verdict good" role="status">
          You predicted {firstTry} of {CASES.length} cases on the first try. The rule: the switch is checked first, so a stopped call leaves one row and never reaches the checks behind it.
        </div>
      )}
    </div>
  );
}
