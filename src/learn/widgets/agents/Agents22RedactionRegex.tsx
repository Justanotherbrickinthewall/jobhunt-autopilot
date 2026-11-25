import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents22RedactionRegex.css";

const PATTERN = String.raw`[\w.+-]+@[\w-]+(\.[\w-]+)+`;
const RE = new RegExp(PATTERN);

const CASES: { text: string; why: string }[] = [
  { text: "asker@example.org", why: "This is the shape the pattern was written for." },
  { text: "ASKER@Example.ORG", why: "Letters of either case match the word class, so the capitals make no difference." },
  { text: "asker+desk@mail.example.org", why: "The plus sign and the extra dot are both allowed by the pattern." },
  { text: "asker at example dot org", why: "Spelled out, it has no at sign and no dot. A person reads it as an address and the pattern does not." },
  { text: "asker@example", why: "The pattern wants at least one dot after the at sign. A bare host slips through." },
  { text: "Sam Sample", why: "A name has no fixed shape. No pattern finds it, so keep names out of the prompt, or pass a derived fact." },
];

export default function Agents22RedactionRegex({ onComplete }: WidgetProps) {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<boolean | null>(null);
  const [hits, setHits] = useState(0);
  const [done, setDone] = useState(false);
  const complete = useComplete(onComplete);
  const c = CASES[i];
  const caught = RE.test(c.text);

  function choose(v: boolean) {
    if (pick !== null) return;
    setPick(v);
    if (v === caught) setHits((h) => h + 1);
  }
  function next() {
    if (i + 1 < CASES.length) {
      setI(i + 1);
      setPick(null);
    } else {
      setDone(true);
      complete(`${hits} of ${CASES.length} predictions right`);
    }
  }

  return (
    <div className="w-panel agents22-redaction-regex">
      <p className="agents22-redaction-regex-note">The redactor uses one pattern, shown below. Predict whether it replaces each string with a placeholder.</p>
      <pre className="agents22-redaction-regex-pattern">{PATTERN}</pre>
      {!done && (
        <fieldset className="agents22-redaction-regex-card">
          <legend className="agents22-redaction-regex-legend">String {i + 1} of {CASES.length}</legend>
          <pre className="agents22-redaction-regex-text">{c.text}</pre>
          <div className="w-row" role="group" aria-label="Does the pattern catch it?">
            <button type="button" className="w-btn" disabled={pick !== null} onClick={() => choose(true)}>Caught</button>
            <button type="button" className="w-btn" disabled={pick !== null} onClick={() => choose(false)}>Missed</button>
          </div>
          {pick !== null && (
            <p className={`w-verdict ${pick === caught ? "good" : "bad"}`} role="status">
              {pick === caught ? "Right. " : "Not quite. "}
              The pattern {caught ? "catches" : "misses"} this one. {c.why}
            </p>
          )}
          {pick !== null && (
            <div className="w-row">
              <button type="button" className="w-btn primary" onClick={next}>{i + 1 < CASES.length ? "Next string" : "See my score"}</button>
            </div>
          )}
        </fieldset>
      )}
      {done && (
        <div className={`w-verdict ${hits >= 5 ? "good" : "bad"}`} role="status">
          You got {hits} of {CASES.length}. Redaction removes the shapes you thought of. For anything else, do not fetch the value, or pass a fact derived from it.
        </div>
      )}
      {done && (
        <div className="w-row">
          <button type="button" className="w-btn ghost" onClick={() => { setI(0); setPick(null); setHits(0); setDone(false); }}>Try again</button>
        </div>
      )}
    </div>
  );
}
