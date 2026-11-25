import { useId, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud08KillSwitchDrill.css";

// Four incidents on AskPEP. What each setting stops comes from capstone/src/askpep/api.py (the kill_switch
// middleware) and guards/audit.py (the actions scope). The incidents are invented, so the figures are too.

type Mode = "off" | "actions" | "all";

const MODES: { id: Mode; label: string }[] = [
  { id: "off", label: "Leave the switch off" },
  { id: "actions", label: "Set it to actions" },
  { id: "all", label: "Set it to all" },
];

type Incident = { id: string; what: string; answer: Mode; why: string };

const INCIDENTS: Incident[] = [
  {
    id: "tickets",
    what: "Overnight the desk filed 14 tickets that nobody asked for. The answers it gave look correct.",
    answer: "actions",
    why: "`actions` switches off `open_ticket` and nothing else. `/ask` carries on, so readers keep their answers. `all` would stop answers that were fine.",
  },
  {
    id: "loop",
    what: "A prompt change sent the researcher into loops. Every question now makes many model calls and returns nothing useful.",
    answer: "all",
    why: "The money goes on model calls, on every route. `actions` leaves those running. `all` answers 503 before any model call starts.",
  },
  {
    id: "key",
    what: "A reader's API key was pasted into a public issue. A script is using it to ask thousands of questions.",
    answer: "all",
    why: "`all` stops the model calls at once. It doesn't revoke the key. Replace the key as well, and then switch the desk back on.",
  },
  {
    id: "stale",
    what: "After an index rebuild, a few answers cite an old PEP text. The earlier revision is fine, and the rollback from chapter 7 sends traffic back to it in one patch.",
    answer: "off",
    why: "The harm doesn't grow by the minute, and `all` would refuse every question to fix a few. Roll back, and keep the switch for harm that grows.",
  },
];

export default function Cloud08KillSwitchDrill({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const baseId = useId();
  const [picks, setPicks] = useState<Record<string, Mode | "">>({});
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);

  const allPicked = INCIDENTS.every((c) => picks[c.id]);
  const rightCount = INCIDENTS.filter((c) => picks[c.id] === c.answer).length;
  const showMarks = attempts > 0;

  const check = () => {
    if (!allPicked) return;
    const k = attempts + 1;
    setAttempts(k);
    const right = INCIDENTS.every((c) => picks[c.id] === c.answer);
    if (right || k >= 2) {
      setResolved(true);
      complete(
        right && k === 1
          ? "Chose the right setting for all four incidents on the first try"
          : right
            ? "Chose the right setting for all four incidents on the second try"
            : "Needed the explanations to choose the settings for the four incidents",
      );
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel cloud08-kill-switch-drill">
        <div className="w-row between">
          <span className="w-label">Four incidents, illustrative</span>
          <span className="cloud08-kill-switch-drill-count">{showMarks ? `${rightCount} of ${INCIDENTS.length} right` : "Choose first"}</span>
        </div>

        <ol className="cloud08-kill-switch-drill-list">
          {INCIDENTS.map((incident, i) => {
            const pick = picks[incident.id] ?? "";
            const right = pick === incident.answer;
            const selectId = `${baseId}-${incident.id}`;
            return (
              <li
                key={incident.id}
                className={`cloud08-kill-switch-drill-card${showMarks && pick ? (right ? " right" : resolved ? " wrong" : " retry") : ""}`}
              >
                <div className="cloud08-kill-switch-drill-what">
                  <span className="cloud08-kill-switch-drill-n">{i + 1}</span>
                  <label htmlFor={selectId}>{incident.what}</label>
                </div>
                <select
                  id={selectId}
                  className="cloud08-kill-switch-drill-select"
                  value={pick}
                  disabled={resolved}
                  onChange={(e) => setPicks((p) => ({ ...p, [incident.id]: e.target.value as Mode }))}
                >
                  <option value="">Choose a setting</option>
                  {MODES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                {showMarks && pick && !resolved && <span className={`w-chip ${right ? "good" : "warn"}`}>{right ? "Right" : "Not yet"}</span>}
                {resolved && (
                  <motion.p className="cloud08-kill-switch-drill-why" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                    <span className={`w-chip ${right ? "good" : "bad"}`}>{right ? "Right" : `Should be: ${MODES.find((m) => m.id === incident.answer)?.label}`}</span>{" "}
                    {renderTicks(incident.why)}
                  </motion.p>
                )}
              </li>
            );
          })}
        </ol>

        {!resolved && (
          <div className="w-row">
            <button type="button" className="w-btn primary" disabled={!allPicked} onClick={check}>
              Check my choices
            </button>
            {attempts > 0 && (
              <span className="cloud08-kill-switch-drill-hint" role="status">
                {rightCount} of {INCIDENTS.length} are right. Change the ones marked Not yet.
              </span>
            )}
          </div>
        )}

        {resolved && (
          <div className={`w-verdict ${rightCount === INCIDENTS.length ? "good" : "bad"}`} role="status">
            <strong>{rightCount === INCIDENTS.length ? "Every choice is right." : `${rightCount} of ${INCIDENTS.length} were right.`}</strong> Pick the smallest setting that stops the harm.
            Whatever you pick, the next <code className="w-mono">terraform apply</code> puts back the value of the variable <code className="w-mono">kill_switch</code>. Set the variable to match the live service, or the apply undoes your switch.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}

// Turn `code` spans in the explanation into <code> elements.
function renderTicks(text: string) {
  return text.split("`").map((part, i) =>
    i % 2 === 1 ? (
      <code key={i} className="w-mono">
        {part}
      </code>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
