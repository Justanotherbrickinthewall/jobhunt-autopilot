import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "./useComplete";
import "./TeachBack.css";

type Concept = { id: string; name: string; prompt: string; parts: string[] };

const CONCEPTS: Concept[] = [
  {
    id: "testing",
    name: "The testing effect",
    prompt: "Explain the testing effect to a smart colleague who has never heard of it.",
    parts: [
      "Trying to recall something strengthens memory more than studying it again.",
      "It works even when your recall fails, as long as you check the answer afterwards.",
      "Rereading feels better in the moment but fades faster later.",
      "A concrete example, such as a quiz or the review deck.",
      "What to do differently: close the page and retrieve before you reread.",
    ],
  },
  {
    id: "spacing",
    name: "Spaced repetition",
    prompt: "Explain spaced repetition to a smart colleague who has never heard of it.",
    parts: [
      "Memory decays along a curve, which Ebbinghaus measured.",
      "Each successful review makes the curve flatter, so the next gap can be longer.",
      "The best moment to review is just before you would forget.",
      "Cramming helps the next few hours and little after that.",
      "A concrete schedule, such as the deck's 1, 3, 7 and 16 day gaps.",
    ],
  },
  {
    id: "predict",
    name: "Predict, then check",
    prompt: "Explain why you predict before you reveal to a smart colleague who has never heard of it.",
    parts: [
      "A prediction forces you to run your mental model instead of recalling a fact.",
      "A wrong prediction is a precise error signal that points at the missing rule.",
      "You must commit, with a confidence, before looking, or hindsight will convince you that you knew.",
      "Confident errors are the most valuable ones to correct.",
      "A concrete example, such as the cache widget or a lab test that fails first.",
    ],
  },
];

const STALLS = [
  "I used a term I could not define in plain words.",
  "I hedged with sort of or kind of at the key point.",
  "I had no concrete example ready.",
  "I could not say why it matters.",
];

const TARGET = 90;

export default function TeachBack({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const reduce = useReducedMotion();
  const [cid, setCid] = useState(CONCEPTS[0]?.id ?? "testing");
  const [secs, setSecs] = useState(0);
  const [running, setRunning] = useState(false);
  const [text, setText] = useState("");
  const [hit, setHit] = useState<boolean[]>([]);
  const [stalls, setStalls] = useState<boolean[]>([]);
  const [phase, setPhase] = useState<"explain" | "grade" | "done">("explain");
  const [verdict, setVerdict] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const concept = CONCEPTS.find((c) => c.id === cid) ?? (CONCEPTS[0] as Concept);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSecs((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  function pickConcept(id: string) {
    if (phase !== "explain") return;
    setCid(id);
    setSecs(0);
    setRunning(false);
  }

  function toGrade() {
    setRunning(false);
    setHit(concept.parts.map(() => false));
    setStalls(STALLS.map(() => false));
    setPhase("grade");
  }

  function judge() {
    const covered = hit.filter(Boolean).length;
    const stalled = stalls.filter(Boolean).length;
    const missed = concept.parts.filter((_, i) => !hit[i]);
    const ok = covered >= 4 && stalled <= 1;
    let t = `You covered ${covered} of ${concept.parts.length} parts with ${stalled} stall${stalled === 1 ? "" : "s"}. `;
    if (ok) {
      t += "That is a teachable grasp. Now do it again tomorrow, cold. If it holds, it is yours.";
    } else {
      t += "Not teachable yet. Go back to the source for exactly these parts, then explain again: ";
      t += missed.length ? missed.join(" ") : "Your coverage was fine, so fix the stalls by writing one example and one reason it matters.";
    }
    setVerdict({ tone: ok ? "good" : "bad", text: t });
    setPhase("done");
    complete(`${covered}/${concept.parts.length} parts, ${stalled} stalls on ${concept.id}`);
  }

  const covered = hit.filter(Boolean).length;
  const ringR = 26;
  const circ = 2 * Math.PI * ringR;
  const frac = Math.min(secs / TARGET, 1);
  const over = secs > TARGET;
  const mm = Math.floor(secs / 60);
  const ss = String(secs % 60).padStart(2, "0");

  return (
    <div className="w-panel teach-back">
      <div className="teach-back-tabs" role="radiogroup" aria-label="Concept to explain">
        {CONCEPTS.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={c.id === cid}
            disabled={phase !== "explain"}
            className={"teach-back-tab" + (c.id === cid ? " is-on" : "")}
            onClick={() => pickConcept(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <p className="teach-back-prompt">{concept.prompt}</p>

      {phase === "explain" && (
        <>
          <div className="teach-back-timer">
            <svg viewBox="0 0 64 64" className="teach-back-ring" role="img" aria-label={`Timer ${mm} minutes ${ss} seconds of ${TARGET} seconds`}>
              <circle cx={32} cy={32} r={ringR} className="teach-back-ring-track" />
              <motion.circle
                cx={32}
                cy={32}
                r={ringR}
                className={"teach-back-ring-bar" + (over ? " is-over" : "")}
                strokeDasharray={circ}
                animate={{ strokeDashoffset: circ * (1 - frac) }}
                transition={{ duration: reduce ? 0 : 0.3 }}
                transform="rotate(-90 32 32)"
              />
              <text x={32} y={36} textAnchor="middle" className="teach-back-ring-text">{mm}:{ss}</text>
            </svg>
            <div className="teach-back-timer-side">
              <p>Aim for {TARGET} seconds. Say it aloud, or type it below. No notes.</p>
              <div className="w-row">
                <button type="button" className="w-btn" onClick={() => setRunning((r) => !r)}>
                  {running ? "Pause timer" : secs ? "Resume timer" : "Start timer"}
                </button>
                <button type="button" className="w-btn ghost" onClick={() => { setSecs(0); setRunning(false); }}>Reset</button>
              </div>
            </div>
          </div>
          <label className="teach-back-label">
            <span>Optional: type your explanation so you can compare it afterwards</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} />
          </label>
          <button type="button" className="w-btn primary" onClick={toGrade}>I have explained it. Grade me.</button>
        </>
      )}

      {phase !== "explain" && (
        <div className="teach-back-grade">
          <fieldset disabled={phase === "done"} className="teach-back-fs">
            <legend>Tick only what you actually said</legend>
            {concept.parts.map((p, i) => (
              <label key={i} className={"teach-back-check" + (hit[i] ? " is-on" : "")}>
                <input type="checkbox" checked={hit[i] ?? false} onChange={() => setHit((h) => h.map((x, j) => (j === i ? !x : x)))} />
                <span>{p}</span>
              </label>
            ))}
          </fieldset>
          <fieldset disabled={phase === "done"} className="teach-back-fs">
            <legend>Where did you stall</legend>
            {STALLS.map((s, i) => (
              <label key={i} className={"teach-back-check is-stall" + (stalls[i] ? " is-on" : "")}>
                <input type="checkbox" checked={stalls[i] ?? false} onChange={() => setStalls((h) => h.map((x, j) => (j === i ? !x : x)))} />
                <span>{s}</span>
              </label>
            ))}
          </fieldset>
          <div className="teach-back-meter" aria-hidden="true">
            {concept.parts.map((_, i) => (
              <motion.span
                key={i}
                className="teach-back-seg"
                animate={{ backgroundColor: hit[i] ? "var(--teal)" : "var(--line)" }}
                transition={{ duration: reduce ? 0 : 0.2 }}
              />
            ))}
            <span className="teach-back-count">{covered}/{concept.parts.length}</span>
          </div>
          {phase === "grade" && (
            <button type="button" className="w-btn primary" onClick={judge}>Give me the verdict</button>
          )}
        </div>
      )}

      {verdict && <div className={"w-verdict " + verdict.tone} role="status">{verdict.text}</div>}
    </div>
  );
}
