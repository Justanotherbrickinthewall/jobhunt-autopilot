import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents22AllowlistDesigner.css";

const TOOLS: { id: string; needed: boolean; risk: string }[] = [
  { id: "search_peps", needed: true, risk: "" },
  { id: "python_feature_version", needed: true, risk: "" },
  { id: "read_pep_section", needed: false, risk: "It reads text a stranger may have edited, so it is the door an injection comes through. This question does not need it." },
  { id: "send_email", needed: false, risk: "A planted instruction could mail the section to anyone." },
  { id: "author_record", needed: false, risk: "It hands the model a raw record with a name and an address." },
  { id: "author_facts", needed: false, risk: "It is safe, but the question never asks about authors." },
];

export default function Agents22AllowlistDesigner({ onComplete }: WidgetProps) {
  const [on, setOn] = useState<Set<string>>(new Set(TOOLS.map((t) => t.id)));
  const [tries, setTries] = useState(0);
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);

  const missing = TOOLS.filter((t) => t.needed && !on.has(t.id));
  const extra = TOOLS.filter((t) => !t.needed && on.has(t.id));
  const perfect = missing.length === 0 && extra.length === 0;

  function toggle(id: string) {
    const n = new Set(on);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setOn(n);
    setChecked(false);
  }
  function check() {
    const t = tries + 1;
    setTries(t);
    setChecked(true);
    if (perfect) complete("least privilege reached");
    else if (t >= 2) complete("explanation shown after two tries");
  }

  return (
    <div className="w-panel agents22-allowlist-designer">
      <p className="agents22-allowlist-designer-note">The agent must answer one question: which Python version added the walrus operator? Allow the tools it needs and no more.</p>
      <div className="agents22-allowlist-designer-list" role="group" aria-label="Tools on the allow-list">
        {TOOLS.map((t) => (
          <label key={t.id} className={`agents22-allowlist-designer-tool${on.has(t.id) ? " on" : ""}`}>
            <input type="checkbox" checked={on.has(t.id)} onChange={() => toggle(t.id)} />
            <code>{t.id}</code>
          </label>
        ))}
      </div>
      <div className="w-row">
        <button type="button" className="w-btn primary" onClick={check}>Check my list</button>
      </div>
      {checked && (
        <div className={`w-verdict ${perfect ? "good" : "bad"}`} role="status">
          {perfect && "That list is the least privilege for this question. If a planted instruction arrives, there is nothing dangerous for it to call."}
          {!perfect && missing.length > 0 && <span>The agent cannot finish without: {missing.map((t) => t.id).join(", ")}. </span>}
          {!perfect && extra.length > 0 && tries >= 2 && (
            <span>Remove what the question does not need. {extra.map((t) => `${t.id}: ${t.risk}`).join(" ")}</span>
          )}
          {!perfect && extra.length > 0 && tries < 2 && <span>The list holds {extra.length} tool{extra.length > 1 ? "s" : ""} this question does not need. Ask what each one lets a planted instruction do.</span>}
        </div>
      )}
    </div>
  );
}
