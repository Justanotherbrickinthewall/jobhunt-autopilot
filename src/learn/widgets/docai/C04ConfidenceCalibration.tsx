import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C04ConfidenceCalibration.css";

// Illustrative figures: 50 reviewed fields, 10 per confidence bucket.
const BUCKETS = [
  { label: "below 0.50", claimed: 0.25, n: 10, right: 2 },
  { label: "0.50 to 0.70", claimed: 0.6, n: 10, right: 4 },
  { label: "0.70 to 0.90", claimed: 0.8, n: 10, right: 6 },
  { label: "0.90 to 0.95", claimed: 0.925, n: 10, right: 8 },
  { label: "0.95 and above", claimed: 0.975, n: 10, right: 9 },
];
const TARGET_BUCKET = 3;
const MAX_ERR = 0.1;

export default function C04ConfidenceCalibration({ onComplete }: WidgetProps) {
  const done = useComplete(onComplete);
  const [guess, setGuess] = useState<number | null>(null);
  const [from, setFrom] = useState<number | null>(null); // lowest bucket auto-accepted
  const [final, setFinal] = useState(false);
  const [tries, setTries] = useState(0);
  const [miss, setMiss] = useState(false);

  const accepted = from === null ? [] : BUCKETS.slice(from);
  const n = accepted.reduce((a, b) => a + b.n, 0);
  const wrong = accepted.reduce((a, b) => a + (b.n - b.right), 0);
  const err = n ? wrong / n : 0;
  const ok = from !== null && err <= MAX_ERR;

  function submit() {
    if (from !== BUCKETS.length - 1 && tries === 0) {
      // First miss: a nudge only. The explanation follows the second attempt.
      setTries(1);
      setMiss(true);
      return;
    }
    setMiss(false);
    setFinal(true);
    done(`predicted ${guess} of 10 in the 0.90 bucket (actual ${BUCKETS[TARGET_BUCKET].right}); chose to auto-accept from "${BUCKETS[from!].label}"`);
  }

  return (
    <div className="w-panel docai-confidence-calibration">
      <p className="docai-confidence-calibration-lede">Fifty extracted fields were reviewed by a person, ten per confidence bucket. Illustrative figures. First predict, then pick an auto-accept rule.</p>
      <p className="docai-confidence-calibration-q"><b>Step one.</b> In the bucket 0.90 to 0.95, the model claims about nine in ten are right. How many of the 10 fields were actually right?</p>
      <div className="docai-confidence-calibration-opts" role="group" aria-label="Your prediction">
        {[5, 6, 7, 8, 9, 10].map((g) => (
          <button key={g} type="button" disabled={guess !== null} aria-pressed={guess === g} className={`w-chip${guess === g ? (g === BUCKETS[TARGET_BUCKET].right ? " good" : " bad") : ""}`} onClick={() => setGuess(g)}>{g}</button>
        ))}
      </div>
      {guess !== null && (
        <>
          <div className="docai-confidence-calibration-chart" role="img" aria-label="Claimed confidence against observed accuracy per bucket">
            {BUCKETS.map((b, k) => (
              <div key={b.label} className="docai-confidence-calibration-row">
                <span className="docai-confidence-calibration-lab">{b.label}</span>
                <span className="docai-confidence-calibration-track">
                  <i className="docai-confidence-calibration-obs" style={{ width: `${(b.right / b.n) * 100}%` }} />
                  <i className="docai-confidence-calibration-claim" style={{ left: `${b.claimed * 100}%` }} />
                </span>
                <span className="docai-confidence-calibration-num">{b.right}/{b.n}</span>
                {k === TARGET_BUCKET && <span className="w-chip">your bucket</span>}
              </div>
            ))}
          </div>
          <p className="docai-confidence-calibration-key"><i className="docai-confidence-calibration-obs-key" /> observed share right &nbsp; <i className="docai-confidence-calibration-claim-key" /> claimed confidence. Where the bar stops short of the marker, the score is overconfident.</p>
          <div className="w-verdict" role="status"><b>{guess === BUCKETS[TARGET_BUCKET].right ? "Right: eight of ten. " : `Eight of ten were right, not ${guess}. `}</b>A claimed 0.925 delivered 0.8. The score ranks fields well, since higher buckets are better, but its value is not a probability until you calibrate it on reviewed data.</div>

          <p className="docai-confidence-calibration-q"><b>Step two.</b> Auto-accept every field from a bucket upward. Pick the lowest bucket that keeps wrong accepted fields at 1 in 10 or fewer.</p>
          <div className="docai-confidence-calibration-opts" role="group" aria-label="Auto-accept from">
            {BUCKETS.map((b, k) => (
              <button key={b.label} type="button" disabled={final} aria-pressed={from === k} className={`w-chip${from === k ? " is-on" : ""}`} onClick={() => { setFrom(k); setMiss(false); }}>{b.label}</button>
            ))}
          </div>
          {from !== null && (
            <p className="docai-confidence-calibration-stats" aria-live="polite">Accepted {n} of 50 fields. Wrong among them: {wrong}. Error rate {Math.round(err * 100)} percent.{" "}
              <span className={`w-chip ${ok ? "good" : "bad"}`}>{ok ? "within 1 in 10" : "too many wrong"}</span></p>
          )}
          {miss && !final && <p className="w-verdict bad" role="status">{ok ? "That reads the table loosely. Add up the wrong fields across every bucket you accept, then divide by the fields accepted. Try again." : "That lets through too many wrong fields. Recount the errors among everything you would accept. Try again."}</p>}
          {!final && from !== null && <button type="button" className="w-btn small" onClick={submit}>Lock in this rule</button>}
          {final && (
            <div className={`w-verdict ${from === BUCKETS.length - 1 ? "good" : "bad"}`} role="status">
              {from === BUCKETS.length - 1 ? <><b>Only the top bucket qualifies.</b> </> : ok ? <><b>That meets the limit, but check your reading of the table.</b> </> : <><b>That lets through too many wrong fields.</b> </>}
              Holding errors to 1 in 10 automates only 10 of 50 fields. Calibrate on far more reviewed data, then add cross-field checks to catch what the score misses.
            </div>
          )}
        </>
      )}
    </div>
  );
}
