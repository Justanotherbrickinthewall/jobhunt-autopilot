import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C05StoryBuilder.css";

// Everything typed here stays in component state. It is never stored or sent.
const PARTS = [
  { id: "answer", label: "Direct answer", hint: "One sentence that answers the question, with your role in it." },
  { id: "flow", label: "Flow in execution order", hint: "What happens first, second and third, from input to output." },
  { id: "controls", label: "Controls", hint: "Validation, security, retries, idempotency and logging you actually had." },
  { id: "metrics", label: "Metrics", hint: "What you measured and how. If you did not measure, write that you did not." },
  { id: "tradeoff", label: "Trade-off", hint: "One choice you made, and what it cost." },
  { id: "fallback", label: "Fallback", hint: "What happens when it fails, or what you would add." },
] as const;

const HAS_NUMBER = /\d/;
// The direct answer is graded: one sentence of at most 25 words.
const sentences = (t: string) => t.split(/[.!?]+\s|[.!?]+$/).filter((x) => x.trim().length > 0).length;
const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

export default function C05StoryBuilder({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [text, setText] = useState<Record<string, string>>({});
  const [proven, setProven] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const filled = PARTS.filter((p) => (text[p.id] ?? "").trim().length > 10);
  const missing = PARTS.filter((p) => !filled.includes(p));
  const numeric = PARTS.filter((p) => HAS_NUMBER.test(text[p.id] ?? ""));
  const unverified = numeric.filter((p) => !proven[p.id]);

  const answer = (text.answer ?? "").trim();
  const answerOk = answer.length > 10 && sentences(answer) === 1 && words(answer) <= 25;
  const good = missing.length === 0 && unverified.length === 0 && answerOk;

  // Completes on a story that passes all three checks, or after the second attempt with the notes shown.
  function check() {
    const n = attempts + 1;
    setAttempts(n);
    setDone(true);
    if (good || n >= 2) {
      complete(`${missing.length} parts missing, ${unverified.length} parts with unverified numbers, direct answer ${answerOk ? "short enough" : "too long"}`);
    }
  }
  const locked = done && (good || attempts >= 2);

  return (
    <div className="w-panel fde-craft-story-builder">
      <p className="fde-craft-story-builder-lede">
        Pick one real project of your own and fill the six parts in short sentences. This stays on your screen and is not saved. The direct answer must be one sentence of at most 25 words. Where a part contains a number, tick the box only if you can prove it.
      </p>
      <div className="w-stack">
        {PARTS.map((p) => {
          const hasNum = HAS_NUMBER.test(text[p.id] ?? "");
          return (
            <div key={p.id} className="fde-craft-story-builder-part">
              <label htmlFor={`fde-craft-story-builder-${p.id}`} className="w-label">{p.label}</label>
              <textarea
                id={`fde-craft-story-builder-${p.id}`}
                rows={2}
                placeholder={p.hint}
                value={text[p.id] ?? ""}
                disabled={done}
                onChange={(e) => setText((t) => ({ ...t, [p.id]: e.target.value }))}
              />
              {hasNum && (
                <label className="fde-craft-story-builder-proof">
                  <input type="checkbox" checked={!!proven[p.id]} disabled={done} onChange={(e) => setProven((x) => ({ ...x, [p.id]: e.target.checked }))} />
                  I can show where this number came from
                </label>
              )}
            </div>
          );
        })}
      </div>
      {!done && (
        <button type="button" className="w-btn" onClick={check}>
          Check my story
        </button>
      )}
      {done && (
        <>
          <div className={`w-verdict ${good ? "good" : "bad"}`} role="status">
            <strong>{filled.length} of {PARTS.length} parts filled. {unverified.length} with an unverified number.</strong>
          </div>
          <ul className="fde-craft-story-builder-result">
            {missing.map((p) => (
              <li key={p.id} className="is-missing"><b>{p.label} is missing.</b> An interviewer will ask for it. Prepare a sentence, or decide to say you did not measure it.</li>
            ))}
            {unverified.map((p) => (
              <li key={p.id} className="is-unverified"><b>{p.label} has a number you cannot prove.</b> Replace it with what you observed, or say you do not have the figure.</li>
            ))}
            {answer.length > 10 && !answerOk && (
              <li className="is-unverified"><b>The direct answer is too long.</b> It should be one sentence of at most 25 words, with your role in it. The interviewer decides in that sentence whether you know the topic.</li>
            )}
            {good && <li className="is-ok">All six parts are present, the answer is one short sentence and every number has a source. Now practise saying it in under two minutes.</li>}
          </ul>
          {!locked && (
            <button type="button" className="w-btn ghost" onClick={() => setDone(false)}>
              Fix my story and check once more
            </button>
          )}
        </>
      )}
    </div>
  );
}
