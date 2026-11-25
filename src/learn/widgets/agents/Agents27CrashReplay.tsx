import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents27CrashReplay.css";

const POINTS = [
  { id: "before", label: "Before the link exists", links: 0, mails: 0 },
  { id: "link", label: "After the link, before the mail", links: 1, mails: 0 },
  { id: "mail", label: "After the mail, before the commit", links: 1, mails: 1 },
];

export default function Agents27CrashReplay({ onComplete }: WidgetProps) {
  const [point, setPoint] = useState("link");
  const [keys, setKeys] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const complete = useComplete(onComplete);
  const p = POINTS.find((x) => x.id === point)!;
  // The event comes back and act runs again from the top: one more link and one more mail.
  const links = keys ? 1 : p.links + 1;
  const mails = keys ? 1 : p.mails + 1;
  const blocked = keys ? p.links + p.mails : 0;
  const bad = links > 1 || mails > 1;

  function mark(nextKeys: boolean) {
    const s = new Set(seen);
    s.add(nextKeys ? "on" : "off");
    setSeen(s);
    if (s.size === 2) complete("saw the replay with and without keys");
  }

  return (
    <div className="w-panel agents27-crash-replay">
      <p className="agents27-crash-replay-note">The consumer dies inside the act node, at the point you pick. The topic delivers the same event again. The act node never saved as done, so it runs again from the top.</p>
      <div className="w-stack">
        <fieldset className="agents27-crash-replay-set">
          <legend>Where the consumer dies</legend>
          {POINTS.map((x) => (
            <label key={x.id} className={`agents27-crash-replay-opt${point === x.id ? " on" : ""}`}>
              <input type="radio" name="agents27-crash-point" checked={point === x.id} onChange={() => { setPoint(x.id); mark(keys); }} />
              <span>{x.label}</span>
            </label>
          ))}
        </fieldset>
        <label className="agents27-crash-replay-opt">
          <input type="checkbox" checked={keys} onChange={(e) => { setKeys(e.target.checked); mark(e.target.checked); }} />
          <span>Idempotency keys on the link and the mail</span>
        </label>
      </div>
      <p className="agents27-crash-replay-out" role="status">
        Links created: {links}. Mails sent: {mails}. Repeats blocked by a key: {blocked}.
      </p>
      <div className={`w-verdict ${bad ? "bad" : "good"}`} role="status">
        {bad
          ? "The customer gets a second live link, a second mail, or both. Nothing in the topic can stop that, because it delivers at least once."
          : keys
            ? "The repeat asks for the same key and gets the first result back. The customer sees one link and one mail."
            : "A crash before anything happened is harmless. Move the crash point later to see the harm."}
      </div>
    </div>
  );
}
