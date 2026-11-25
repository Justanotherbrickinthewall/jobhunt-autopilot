import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents25MailFill.css";

const VALUES: Record<string, string> = { name: "Isla Okafor", amount: "£560.00", link: "https://pay.example/28a5f763", due_date: "day 1" };
const DRAFT = "Dear {name}, your next Meridian Tours instalment of {amount} is due on {due_date}. Pay here: {link}. The link works for 28 hours.";

type Slip = "none" | "dropLink" | "badAmount" | "invent";
const SLIPS: { id: Slip; label: string }[] = [
  { id: "none", label: "The draft is fine" },
  { id: "dropLink", label: "The model drops the link placeholder" },
  { id: "badAmount", label: "The model writes a pound figure of its own" },
  { id: "invent", label: "The model invents a placeholder, {discount}" },
];

function draftFor(slip: Slip): string {
  if (slip === "dropLink") return DRAFT.replace(" Pay here: {link}.", "");
  if (slip === "badAmount") return DRAFT + " Pay £99.00 now.";
  if (slip === "invent") return DRAFT + " Your discount is {discount}.";
  return DRAFT;
}

const fill = (d: string) => d.replace(/\{(\w+)\}/g, (m, k: string) => VALUES[k] ?? m);

export default function Agents25MailFill({ onComplete }: WidgetProps) {
  const [slip, setSlip] = useState<Slip>("none");
  const [seen, setSeen] = useState<Set<Slip>>(new Set());
  const complete = useComplete(onComplete);
  const draft = draftFor(slip);
  const out = fill(draft);
  const problems: string[] = [];
  if (/[{}]/.test(out)) problems.push("a placeholder was left unfilled");
  if (!out.includes(VALUES.link)) problems.push("the link is missing");
  if ((out.match(/£[\d,]+(?:\.\d\d)?/g) ?? []).some((c) => c !== VALUES.amount)) problems.push("an amount is not the one due");

  return (
    <div className="w-panel agents25-mail">
      <div className="agents25-mail-opts" role="radiogroup" aria-label="What the model drafts">
        {SLIPS.map((s) => (
          <label key={s.id} className={`agents25-mail-opt${slip === s.id ? " on" : ""}`}>
            <input type="radio" name="agents25-mail-slip" checked={slip === s.id} onChange={() => { setSlip(s.id); const n = new Set(seen).add(s.id); setSeen(n); if (n.size === SLIPS.length) complete("tried all four drafts"); }} />
            <span>{s.label}</span>
          </label>
        ))}
      </div>
      <div className="w-stack">
        <div className="agents25-mail-box"><span className="agents25-mail-tag">Code values, never sent to the model</span><code>{JSON.stringify(VALUES)}</code></div>
        <div className="agents25-mail-box"><span className="agents25-mail-tag">The model's draft</span><p>{draft}</p></div>
        <div className="agents25-mail-box"><span className="agents25-mail-tag">After code fills the placeholders</span><p>{out}</p></div>
      </div>
      <div className={`w-verdict ${problems.length ? "bad" : "good"}`} role="status">
        {problems.length ? `Fill cannot fix this: ${problems.join(", ")}. In this chapter the mail still goes. The mail check in PayDesk 3 stops it.` : "The mail has the right name, amount and link, and every figure came from code."}
      </div>
    </div>
  );
}
