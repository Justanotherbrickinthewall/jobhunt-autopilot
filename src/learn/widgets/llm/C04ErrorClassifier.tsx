import { useState } from "react";
import { MotionConfig } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C04ErrorClassifier.css";

type Verdict = "retry" | "fallback" | "fail" | "review";
const VERDICTS: { id: Verdict; name: string }[] = [
  { id: "retry", name: "Retry" },
  { id: "fallback", name: "Fall back" },
  { id: "fail", name: "Fail" },
  { id: "review", name: "Review" },
];
// Illustrative error reports from the invoice extractor.
const ERRORS: { log: string; verdict: Verdict; why: string }[] = [
  { log: "HTTP 429 rate limited. Header retry-after says 8 seconds.", verdict: "retry", why: "Transient. Wait at least as long as the header says, with jitter, and count the retry." },
  { log: "Request timed out after 60 seconds. No response bytes.", verdict: "retry", why: "A timeout is unknown but usually transient. A bounded retry is reasonable for an idempotent extraction call." },
  { log: "HTTP 400 invalid request: max output tokens exceeds this model's limit.", verdict: "fail", why: "Permanent. The request is wrong, and sending it again, or to another model, repeats the error. Fix the config." },
  { log: "HTTP 401 authentication failed. The API key was rejected.", verdict: "fail", why: "Permanent until someone fixes the credential. Fail loudly and page, because a fallback would hide it." },
  { log: "HTTP 503 service unavailable on every attempt for twenty minutes.", verdict: "fallback", why: "The path is broken, not unlucky. Change the path to another model or provider, and validate its output the same way." },
  { log: "Response arrived. After three repair attempts the totals still disagree.", verdict: "review", why: "The call worked and the content did not. A person decides, as in chapter three." },
];

export default function C04ErrorClassifier({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<Verdict | null>(null);
  const [score, setScore] = useState(0);

  const e = ERRORS[i];
  const last = i === ERRORS.length - 1;

  const choose = (v: Verdict) => {
    if (picked) return;
    setPicked(v);
    const next = score + (v === e.verdict ? 1 : 0);
    setScore(next);
    if (last) complete(`Chose the right reaction for ${next} of ${ERRORS.length} errors`);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel llm-error-classifier">
        <p className="w-label">Error {i + 1} of {ERRORS.length}. Illustrative logs.</p>
        <div className="w-inset"><span className="w-mono">{e.log}</span></div>
        <p>What should the pipeline do?</p>
        <div className="w-row" role="group" aria-label="Action">
          {VERDICTS.map((v) => (
            <button key={v.id} type="button" disabled={picked !== null} className={`w-chip${picked && v.id === e.verdict ? " good" : picked === v.id ? " bad" : ""}`} onClick={() => choose(v.id)}>
              {v.name}
            </button>
          ))}
        </div>
        {picked && (
          <div className={`w-verdict ${picked === e.verdict ? "good" : "bad"}`} role="status">
            {picked === e.verdict ? "Correct. " : `The answer is ${VERDICTS.find((v) => v.id === e.verdict)?.name.toLowerCase()}. `}
            {e.why}
            {last && ` You got ${score} of ${ERRORS.length}. Retry what was unlucky, fall back from what is broken, fail on what is wrong, and send bad content to review.`}
          </div>
        )}
        {picked && !last && <button type="button" className="w-btn" onClick={() => { setI(i + 1); setPicked(null); }}>Next error</button>}
      </div>
    </MotionConfig>
  );
}
