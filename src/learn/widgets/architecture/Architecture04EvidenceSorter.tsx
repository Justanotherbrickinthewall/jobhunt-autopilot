import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Architecture04EvidenceSorter.css";

type Verdict = "cite" | "caveat" | "leave";

const VERDICTS: { id: Verdict; label: string }[] = [
  { id: "cite", label: "Cite it" },
  { id: "caveat", label: "Cite it with its caveat" },
  { id: "leave", label: "Leave it out" },
];

type Figure = { id: string; text: string; answer: Verdict; why: string };

// The figures come from earlier chapters on main, except e5, e6 and e7, which are the kind of claim a runtime ADR is tempted to make.
const FIGURES: Figure[] = [
  {
    id: "e4",
    text: "Handoffs scored 0.75 accuracy on 8 questions, with a mean of 1,251 tokens (course 2).",
    answer: "caveat",
    why: "Fake models produced it, offline. It shows the wiring runs and does not judge answers. Cite it as the baseline a live run must match, and say it was offline.",
  },
  {
    id: "e1",
    text: "95% of requests finish within 10,000 ms. This is the total-latency SLO from course 5.",
    answer: "cite",
    why: "It is a target you set, so every option has to meet it. Nothing needs qualifying.",
  },
  {
    id: "e6",
    text: "Moving to Agent Runtime would save about ten hours of operating work a month.",
    answer: "leave",
    why: "Nobody logged those hours. It is a guess. If the saving matters, write it in Consequences as unmeasured, and log your operating hours for a month.",
  },
  {
    id: "e3",
    text: "The researcher holds 60 percent of the desk's cost (course 5).",
    answer: "caveat",
    why: "The share comes from course 5's cost table, which uses placeholder prices. Cite it as a worked example. It also says a change of host alone leaves the researcher's token cost where it is.",
  },
  {
    id: "e2",
    text: "The desk's limits are 12 steps, 20,000 tokens, 60 seconds and 3 repeats, from `Budget(12, 20000, 60, 3)` (course 2).",
    answer: "cite",
    why: "These are settings in your code. Every option must honour them, so they define the job and need no caveat.",
  },
  {
    id: "e7",
    text: "Agent Runtime bills in vCPU-hours and GiB-hours.",
    answer: "caveat",
    why: "The unit comes from a release note, and nobody has read it on the pricing page. Name the unit, mark it unchecked, and read the pricing page before you rely on it.",
  },
  {
    id: "e5",
    text: "A price per vCPU-hour for Agent Runtime, copied from a blog post.",
    answer: "leave",
    why: "A copied price is unverified and goes stale. Prices are worked examples in this course. Name the billing unit and leave the rate out until you have read it from Google.",
  },
];

export default function Architecture04EvidenceSorter({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, Verdict | undefined>>({});
  const [checked, setChecked] = useState(false);
  const complete = useComplete(onComplete);

  const answered = FIGURES.filter((f) => picks[f.id]).length;
  const hits = FIGURES.filter((f) => picks[f.id] === f.answer).length;

  const check = () => {
    setChecked(true);
    complete(`${hits} of ${FIGURES.length} matched`);
  };
  const reset = () => {
    setPicks({});
    setChecked(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel architecture04-evidence-sorter">
        <p className="architecture04-evidence-sorter-note">Decide what the runtime ADR does with each figure. Some come from earlier chapters. Others are claims an ADR is tempted to make.</p>
        <div className="w-stack">
          {FIGURES.map((f, i) => {
            const pick = picks[f.id];
            const right = checked && pick === f.answer;
            const wrong = checked && pick !== f.answer;
            return (
              <fieldset key={f.id} className={`architecture04-evidence-sorter-card${right ? " right" : ""}${wrong ? " wrong" : ""}`}>
                <legend className="architecture04-evidence-sorter-legend">Figure {i + 1}</legend>
                <p className="architecture04-evidence-sorter-text">{f.text}</p>
                <div className="architecture04-evidence-sorter-opts" role="radiogroup" aria-label={`Figure ${i + 1} verdict`}>
                  {VERDICTS.map((v) => (
                    <label key={v.id} className={`architecture04-evidence-sorter-opt${pick === v.id ? " on" : ""}`}>
                      <input
                        type="radio"
                        name={`architecture04-evidence-sorter-${f.id}`}
                        value={v.id}
                        checked={pick === v.id}
                        disabled={checked}
                        onChange={() => setPicks((p) => ({ ...p, [f.id]: v.id }))}
                      />
                      <span>{v.label}</span>
                    </label>
                  ))}
                </div>
                {checked && (
                  <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="architecture04-evidence-sorter-why" role="status">
                    {right ? "Matched. " : `Better fit: ${VERDICTS.find((v) => v.id === f.answer)?.label}. `}
                    {f.why}
                  </motion.p>
                )}
              </fieldset>
            );
          })}
        </div>
        <div className="w-row">
          {!checked ? (
            <button type="button" className="w-btn primary" disabled={answered < FIGURES.length} onClick={check}>
              Check my picks ({answered} of {FIGURES.length})
            </button>
          ) : (
            <button type="button" className="w-btn ghost" onClick={reset}>
              Try again
            </button>
          )}
        </div>
        {checked && (
          <div className={`w-verdict ${hits >= 6 ? "good" : "bad"}`} role="status">
            You matched {hits} of {FIGURES.length}. The rule: cite a figure your chapters set or measured, and say what it is when it is a target or a worked example. Leave out anything nobody
            measured. Put the missing measurement in Consequences as the next thing to measure.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
