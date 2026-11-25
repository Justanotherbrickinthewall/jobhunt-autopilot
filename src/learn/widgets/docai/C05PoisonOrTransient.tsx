import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C05PoisonOrTransient.css";

type Kind = "transient" | "poison" | "rule";
const KINDS: { id: Kind; label: string }[] = [
  { id: "transient", label: "Transient: retry with backoff" },
  { id: "poison", label: "Poison: quarantine, no retry" },
  { id: "rule", label: "Business rule: send to review" },
];

const FAILURES: { text: string; answer: Kind; why: string }[] = [
  { text: "The extraction service answers 429 too many requests.", answer: "transient", why: "The document is fine. The service is shedding load. Back off with jitter and try again." },
  { text: "The extraction service answers 503 service unavailable.", answer: "transient", why: "A server-side fault that usually clears. Bounded retries fit." },
  { text: "The call times out after 30 seconds on a three page invoice.", answer: "transient", why: "A timeout on a small file points at the network or the service, not the file. Retry within the cap." },
  { text: "The PDF is password protected and no password is on file.", answer: "poison", why: "No number of retries opens it. Quarantine it and ask the sender." },
  { text: "The file ends in .pdf but its first bytes say it is a zip archive.", answer: "poison", why: "File validation should catch this before extraction. It will fail the same way every time." },
  { text: "Document AI rejects the online request with 400 because the file has more than 15 pages.", answer: "poison", why: "The same online request fails every time, so do not retry it. A person decides whether to split the file or run it through batch processing." },
  { text: "Extraction succeeded, but the total is 0.00.", answer: "rule", why: "The extractor did its job. A rule caught a bad value. That is for review, not retry." },
  { text: "Extraction succeeded, but the due date is before the invoice date.", answer: "rule", why: "The output contradicts itself. Review, with the failed rule shown." },
];

export default function C05PoisonOrTransient({ onComplete }: WidgetProps) {
  const done = useComplete(onComplete);
  const [picks, setPicks] = useState<Record<number, Kind>>({});
  const n = Object.keys(picks).length;

  function pick(i: number, k: Kind) {
    if (picks[i]) return;
    const next = { ...picks, [i]: k };
    setPicks(next);
    if (Object.keys(next).length === FAILURES.length) {
      done(`${FAILURES.filter((f, j) => next[j] === f.answer).length} of ${FAILURES.length} failures classified correctly`);
    }
  }
  const right = FAILURES.filter((f, i) => picks[i] === f.answer).length;

  return (
    <div className="w-panel docai-poison-or-transient">
      <p className="docai-poison-or-transient-lede">Eight failures from the Harbour Supplies intake log. Classify each one by what the pipeline should do next.</p>
      {FAILURES.map((f, i) => {
        const p = picks[i];
        return (
          <div key={i} className="w-inset docai-poison-or-transient-item">
            <p>{i + 1}. {f.text}</p>
            <div className="docai-poison-or-transient-opts" role="group" aria-label={`Failure ${i + 1}`}>
              {KINDS.map((k) => (
                <button key={k.id} type="button" disabled={!!p} aria-pressed={p === k.id} className={`w-chip${p === k.id ? (k.id === f.answer ? " good" : " bad") : ""}`} onClick={() => pick(i, k.id)}>{k.label}</button>
              ))}
            </div>
            {p && <p className="docai-poison-or-transient-why"><b>{p === f.answer ? "Right. " : "Not quite. "}</b>{f.why}</p>}
          </div>
        );
      })}
      {n === FAILURES.length && (
        <div className={`w-verdict ${right >= 7 ? "good" : "bad"}`} role="status">
          <b>{right} of {FAILURES.length} right.</b> The test is whether the same request would fail again. If the document is the cause, it is poison. If the service is the cause, it is transient. If the extraction worked but the content is wrong, it is a rule failure.
        </div>
      )}
    </div>
  );
}
