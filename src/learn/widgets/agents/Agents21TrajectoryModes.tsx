import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents21TrajectoryModes.css";

type Outcome = "none" | "any" | "subset" | "all";

const OPTIONS: { id: Outcome; label: string }[] = [
  { id: "none", label: "No mode passes it" },
  { id: "any", label: "Any-order only" },
  { id: "subset", label: "In-order subset and any-order" },
  { id: "all", label: "All three modes" },
];

const WANT = "search_peps, read_pep_section";

const CASES: { id: string; got: string; answer: Outcome; why: string }[] = [
  { id: "same", got: "search_peps, read_pep_section", answer: "all", why: "The calls match one for one, so even the exact mode passes." },
  { id: "extra", got: "search_peps, python_feature_version, read_pep_section", answer: "subset", why: "Both expected calls are there, in order, with one extra between them. Exact fails on the extra call. The other two pass." },
  { id: "swap", got: "read_pep_section, search_peps", answer: "any", why: "Both calls are there, but in the wrong order. Only the any-order mode accepts that." },
  { id: "missing", got: "search_peps", answer: "none", why: "The read never happened. Every mode needs every expected call, so all three fail." },
  { id: "other", got: "read_pep_section", answer: "none", why: "This may be a valid shorter path, but the search is missing, so all three fail. When a valid path exists, put it in the case as a second accepted trajectory." },
];

export default function Agents21TrajectoryModes({ onComplete }: WidgetProps) {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<Outcome | null>(null);
  const [hits, setHits] = useState(0);
  const [done, setDone] = useState(false);
  const complete = useComplete(onComplete);
  const c = CASES[i];

  function choose(o: Outcome) {
    if (pick) return;
    setPick(o);
    if (o === c.answer) setHits((h) => h + 1);
  }
  function next() {
    if (i + 1 < CASES.length) {
      setI(i + 1);
      setPick(null);
    } else {
      setDone(true);
      complete(`${hits} of ${CASES.length} trajectories placed right`);
    }
  }

  return (
    <div className="w-panel agents21-trajectory-modes">
      <p className="agents21-trajectory-modes-note">Expected calls: <code>{WANT}</code>. For each run, say which trajectory modes accept it.</p>
      {!done && (
        <fieldset className="agents21-trajectory-modes-card">
          <legend className="agents21-trajectory-modes-legend">Run {i + 1} of {CASES.length}</legend>
          <pre className="agents21-trajectory-modes-got">{c.got}</pre>
          <div className="agents21-trajectory-modes-opts" role="radiogroup" aria-label="Which modes pass this run?">
            {OPTIONS.map((o) => (
              <label key={o.id} className={`agents21-trajectory-modes-opt${pick === o.id ? " on" : ""}`}>
                <input type="radio" name="agents21-trajectory-modes" checked={pick === o.id} disabled={!!pick} onChange={() => choose(o.id)} />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
          {pick && (
            <p className={`w-verdict ${pick === c.answer ? "good" : "bad"}`} role="status">
              {pick === c.answer ? "Right. " : `Better fit: ${OPTIONS.find((o) => o.id === c.answer)?.label}. `}
              {c.why}
            </p>
          )}
          {pick && (
            <div className="w-row">
              <button type="button" className="w-btn primary" onClick={next}>{i + 1 < CASES.length ? "Next run" : "See my score"}</button>
            </div>
          )}
        </fieldset>
      )}
      {done && (
        <div className={`w-verdict ${hits >= 4 ? "good" : "bad"}`} role="status">
          You placed {hits} of {CASES.length} correctly. The modes nest: exact is inside in-order subset, which is inside any-order. Pick the loosest mode that still catches the failure you care about.
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
