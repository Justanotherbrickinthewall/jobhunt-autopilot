import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C05PipelineStepper.css";

type Action = "pass" | "retry" | "duplicate" | "quarantine" | "dead_letter" | "review" | "post";
const ACTIONS: { id: Action; label: string }[] = [
  { id: "pass", label: "Pass to the next stage" },
  { id: "retry", label: "Wait, then retry" },
  { id: "duplicate", label: "Return the earlier outcome" },
  { id: "quarantine", label: "Quarantine: set aside, never retry" },
  { id: "dead_letter", label: "Dead-letter: park for a person after the last retry" },
  { id: "review", label: "Send to review" },
  { id: "post", label: "Post to the ledger" },
];

const MAX_ATTEMPTS = 3;

type Step = { stage: string; event: string; answer: Action; why: string };
type Doc = { name: string; steps: Step[]; end: string };

// Illustrative batch. The extractor behaviour is scripted. Cap of 3 attempts, base wait 1 second.
const DOCS: Doc[] = [
  {
    name: "acme-4471.pdf",
    end: "Posted. One extractor call, one ledger write.",
    steps: [
      { stage: "Intake guard", event: "The checksum is new.", answer: "pass", why: "No earlier document has these bytes, so the file continues." },
      { stage: "Extract, attempt 1", event: "The extractor returns every field.", answer: "pass", why: "Extraction worked, so nothing is retried." },
      { stage: "Validate", event: "Every rule passes and confidence clears the gate.", answer: "pass", why: "A trusted result goes forward to the ledger stage." },
      { stage: "Ledger", event: "The key doc-acme is not in the ledger yet.", answer: "post", why: "First write with this key. The key makes any replay harmless." },
    ],
  },
  {
    name: "acme-4471-copy.pdf",
    end: "Duplicate. It never reached the extractor or the ledger.",
    steps: [
      { stage: "Intake guard", event: "The checksum matches doc-acme, which is already handled.", answer: "duplicate", why: "Same content, same checksum. Return the first outcome and make no paid call." },
    ],
  },
  {
    name: "birch-5120.pdf",
    end: "Posted after two retries, waits of 1 and 2 seconds.",
    steps: [
      { stage: "Extract, attempt 1", event: "The extractor answers 503. One of three attempts used.", answer: "retry", why: "A 503 is the service, not the file. Wait one second and try again." },
      { stage: "Extract, attempt 2", event: "503 again. Two of three attempts used.", answer: "retry", why: "Still inside the cap. The wait doubles to two seconds." },
      { stage: "Extract, attempt 3", event: "The extractor returns every field.", answer: "pass", why: "It worked on the last allowed attempt, so move on." },
      { stage: "Validate", event: "Every rule passes.", answer: "pass", why: "Retries do not skip validation." },
      { stage: "Ledger", event: "The key doc-birch is new.", answer: "post", why: "One ledger write, however many extractor calls it took." },
    ],
  },
  {
    name: "calder-scan.pdf",
    end: "Quarantined with a reason. A person is told.",
    steps: [
      { stage: "Extract, attempt 1", event: "The file is not a readable PDF.", answer: "quarantine", why: "Poison documents fail the same way every time. Set it aside at once and tell a person." },
    ],
  },
  {
    name: "dunmore-7788.pdf",
    end: "Dead-lettered after three attempts. No wait after the last one.",
    steps: [
      { stage: "Extract, attempt 1", event: "503. One of three attempts used.", answer: "retry", why: "Transient, and attempts remain." },
      { stage: "Extract, attempt 2", event: "503. Two of three attempts used.", answer: "retry", why: "Transient, and one attempt remains. Wait two seconds." },
      { stage: "Extract, attempt 3", event: "503 again. Three of three attempts used.", answer: "dead_letter", why: "The cap is reached. Another retry would never end. The dead-letter queue holds it for a person or a redrive." },
    ],
  },
  {
    name: "eden-1002.pdf",
    end: "Needs review. Extraction worked, a business rule failed.",
    steps: [
      { stage: "Extract, attempt 1", event: "The extractor returns every field.", answer: "pass", why: "The extraction itself worked." },
      { stage: "Validate", event: "The total reads 0.00, and the rule says a total must be positive.", answer: "review", why: "This is a content problem. Retrying gives the same page and the same answer. A person decides." },
    ],
  },
];

const KEYS = DOCS.flatMap((d, di) => d.steps.map((_, si) => `${di}-${si}`));

export default function C05PipelineStepper({ onComplete }: WidgetProps) {
  const done = useComplete(onComplete);
  const [picks, setPicks] = useState<Record<string, Action>>({});
  const total = KEYS.length;

  function pick(di: number, si: number, a: Action) {
    const key = `${di}-${si}`;
    if (picks[key]) return;
    const next = { ...picks, [key]: a };
    setPicks(next);
    // Several cases, so completion fires once, when the last decision is made.
    if (KEYS.every((k) => next[k])) {
      const right = DOCS.reduce((n, d, i) => n + d.steps.filter((s, j) => next[`${i}-${j}`] === s.answer).length, 0);
      done(`${right} of ${total} stage decisions right`);
    }
  }

  const answered = Object.keys(picks).length;
  const right = DOCS.reduce((n, d, i) => n + d.steps.filter((s, j) => picks[`${i}-${j}`] === s.answer).length, 0);

  return (
    <div className="w-panel docai-pipeline-stepper">
      <p className="docai-pipeline-stepper-lede">Six files go through the intake with a cap of {MAX_ATTEMPTS} attempts and a one second base wait. At each stage, decide what the pipeline does next. Illustrative scripts.</p>
      {DOCS.map((d, di) => {
        const firstOpen = d.steps.findIndex((_, si) => !picks[`${di}-${si}`]);
        const shown = firstOpen === -1 ? d.steps.length : firstOpen + 1;
        return (
          <div key={d.name} className="w-inset docai-pipeline-stepper-doc">
            <div className="w-mono docai-pipeline-stepper-name">{d.name}</div>
            {d.steps.slice(0, shown).map((s, si) => {
              const p = picks[`${di}-${si}`];
              return (
                <div key={si} className="docai-pipeline-stepper-step">
                  <p className="docai-pipeline-stepper-script"><b>{s.stage}.</b> {s.event}</p>
                  <div className="docai-pipeline-stepper-opts" role="group" aria-label={`${d.name}, ${s.stage}`}>
                    {ACTIONS.map((a) => (
                      <button key={a.id} type="button" disabled={!!p} aria-pressed={p === a.id} className={`w-chip${p === a.id ? (a.id === s.answer ? " good" : " bad") : ""}`} onClick={() => pick(di, si, a.id)}>{a.label}</button>
                    ))}
                  </div>
                  {p && <p className="docai-pipeline-stepper-why"><b>{p === s.answer ? "Right. " : `Better: ${ACTIONS.find((a) => a.id === s.answer)!.label.toLowerCase()}. `}</b>{s.why}</p>}
                </div>
              );
            })}
            {firstOpen === -1 && <p className="docai-pipeline-stepper-end"><b>End state.</b> {d.end}</p>}
          </div>
        );
      })}
      {answered === total && (
        <div className={`w-verdict ${right >= total - 2 ? "good" : "bad"}`} role="status">
          <b>{right} of {total} right.</b> Every file ended in exactly one state. The ledger holds two entries, because the copy was a duplicate and never reached it. Duplicates, transient failures, poison files and rule failures each have their own exit.
        </div>
      )}
    </div>
  );
}
