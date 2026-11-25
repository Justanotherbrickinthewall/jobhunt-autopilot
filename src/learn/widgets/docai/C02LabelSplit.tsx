import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C02LabelSplit.css";

// 12 labelled invoices, 3 each from 4 suppliers. Illustrative figures.
const SUPPLIERS = ["Acme", "Birch", "Calder", "Dunmore"];
const DOCS = Array.from({ length: 12 }, (_, i) => ({ id: i, sup: Math.floor(i / 3) }));
const SEEN_ACC = 96; // field accuracy on a supplier whose layout the model saw in training
const UNSEEN_ACC = 72; // field accuracy on a supplier it never saw

type Mode = "random" | "supplier";
const RANDOM_TEST = [1, 4, 7, 10]; // one invoice per supplier, so every test supplier was also trained on
const HELD_OUT = 2; // Calder

export default function C02LabelSplit({ onComplete }: WidgetProps) {
  const done = useComplete(onComplete);
  const [mode, setMode] = useState<Mode>("random");
  const [trained, setTrained] = useState(false);
  const [guess, setGuess] = useState<number | null>(null);
  const [firstMiss, setFirstMiss] = useState<number | null>(null);

  const test = mode === "random" ? RANDOM_TEST : DOCS.filter((d) => d.sup === HELD_OUT).map((d) => d.id);
  const trainSup = new Set(DOCS.filter((d) => !test.includes(d.id)).map((d) => d.sup));
  const score = Math.round(test.reduce((a, id) => a + (trainSup.has(DOCS[id].sup) ? SEEN_ACC : UNSEEN_ACC), 0) / test.length);

  function choose(g: number) {
    if (guess !== null) return;
    if (g !== UNSEEN_ACC && firstMiss === null) {
      setFirstMiss(g); // first miss: hint, no explanation yet, no completion
      return;
    }
    setGuess(g);
    done(g === UNSEEN_ACC ? "expected the new-supplier score" : "trusted the leaky score");
  }

  return (
    <div className="w-panel docai-label-split">
      <p className="docai-label-split-lede">Twelve labelled invoices, three from each of four suppliers. Pick a split, train, and read the test score. Illustrative figures.</p>
      <div className="w-row" role="group" aria-label="Split method">
        <button type="button" className={`w-btn small${mode === "random" ? "" : " ghost"}`} aria-pressed={mode === "random"} onClick={() => { setMode("random"); setTrained(false); }}>Random split</button>
        <button type="button" className={`w-btn small${mode === "supplier" ? "" : " ghost"}`} aria-pressed={mode === "supplier"} onClick={() => { setMode("supplier"); setTrained(false); }}>Hold out one supplier</button>
      </div>
      <div className="docai-label-split-grid" aria-label="Invoices, test ones outlined">
        {DOCS.map((d) => {
          const isTest = test.includes(d.id);
          return (
            <div key={d.id} className={`docai-label-split-doc docai-label-split-s${d.sup}${isTest ? " is-test" : ""}`}>
              <span>{SUPPLIERS[d.sup].slice(0, 1)}{(d.id % 3) + 1}</span>
              <small>{isTest ? "test" : "train"}</small>
            </div>
          );
        })}
      </div>
      <button type="button" className="w-btn small" onClick={() => setTrained(true)}>Train and score on the test set</button>
      {trained && (
        <p className="docai-label-split-score" role="status">
          Test field score: <b>{score}%</b>. Test invoices come from {new Set(test.map((id) => DOCS[id].sup)).size === 1 ? `${SUPPLIERS[DOCS[test[0]].sup]} only, a supplier the model never saw` : "all four suppliers, each of which also appears in training"}.
        </p>
      )}
      {trained && guess === null && mode === "random" && <p className="docai-label-split-hint">Now switch to the supplier split, train again and compare, then answer below.</p>}
      <div className="docai-label-split-ask">
        <p><b>Next month a fifth supplier starts sending invoices.</b> Which score should you expect on its invoices?</p>
        <div className="docai-label-split-opts" role="group" aria-label="Your prediction">
          {[SEEN_ACC, UNSEEN_ACC].map((g) => (
            <button key={g} type="button" className={`w-chip${guess === g ? (g === UNSEEN_ACC ? " good" : " bad") : firstMiss === g ? " bad" : ""}`} aria-pressed={guess === g} disabled={guess !== null} onClick={() => choose(g)}>{g}%</button>
          ))}
        </div>
      </div>
      {guess === null && firstMiss !== null && (
        <p className="docai-label-split-hint" role="status">Not quite. Compare the two splits again: which one tests on a supplier the model never saw? Try once more.</p>
      )}
      {guess !== null && (
        <div className={`w-verdict ${guess === UNSEEN_ACC ? "good" : "bad"}`} role="status">
          <b>{guess === UNSEEN_ACC ? "Right. " : "That is the leaky number. "}</b>
          The random split let the model train on the same supplier layouts it was tested on, so it scored {SEEN_ACC}%. Production brings new suppliers, which behaves like the held-out split at {UNSEEN_ACC}%. Always split by supplier, or by whatever varies in production.
        </div>
      )}
    </div>
  );
}
