import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents03TriageRouter.css";

type Route = "researcher" | "code_advisor" | "writer" | "refuse";

type Case = {
  id: string;
  failure: boolean;
  shown: string;
  sent?: string;
  route: Route;
  reason: string;
  explain: string;
};

const ROUTES: Route[] = ["researcher", "code_advisor", "writer", "refuse"];

const FALLBACK = "Triage could not read a route from the model, so the researcher takes the question.";

// Scripted model answers. A live model can word its reason differently.
const CASES: Case[] = [
  {
    id: "why",
    failure: false,
    shown: "Why was PEP 572 written?",
    route: "researcher",
    reason: "The user asks why a PEP was written.",
    explain: "A question about what a PEP says, or why it exists, goes to the researcher.",
  },
  {
    id: "code",
    failure: false,
    shown: "Check this for me: def add(a, b) return a + b",
    route: "code_advisor",
    reason: "The user pasted code to check.",
    explain: "Pasted code goes to the code advisor, because it can lint a snippet without running it.",
  },
  {
    id: "version",
    failure: false,
    shown: "Which Python version added the match statement?",
    route: "code_advisor",
    reason: "The user asks which Python version added a feature.",
    explain: "The version comes from a PEP header, and looking it up is the code advisor's job.",
  },
  {
    id: "ticket",
    failure: false,
    shown: "Please open a ticket: the PEP 8 advice on line length is unclear.",
    route: "writer",
    reason: "The user asks for a ticket to be opened.",
    explain: "Only the writer files tickets. Triage picks one route, even when a question could use two agents.",
  },
  {
    id: "off",
    failure: false,
    shown: "What is the capital of France?",
    route: "refuse",
    reason: "The question has nothing to do with Python or PEPs.",
    explain: "No agent should take this. Triage keeps a refusal for itself, so active_agent stays triage.",
  },
  {
    id: "bad",
    failure: true,
    shown: "Which PEP made f-strings legal inside f-strings?",
    sent: 'The model answers with the route "planner". That is not one of the four routes.',
    route: "researcher",
    reason: FALLBACK,
    explain: "The reply fails validation, so parsed is None. Triage falls back to the researcher instead of dropping the question. A model call that raises an error gets the same fallback.",
  },
];

const label = (r: Route) => r.replace("_", " ");

export default function Agents03TriageRouter({ onComplete }: WidgetProps) {
  const [idx, setIdx] = useState(0);
  const [wrong, setWrong] = useState<Route[]>([]);
  const [resolved, setResolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const complete = useComplete(onComplete);

  const c = CASES[idx];
  const last = idx === CASES.length - 1;
  const active = c.route === "refuse" ? "triage" : c.route;

  const pick = (r: Route) => {
    if (resolved) return;
    if (r === c.route) {
      const first = wrong.length === 0 ? firstTry + 1 : firstTry;
      setFirstTry(first);
      setResolved(true);
      if (last) complete(`${first} of ${CASES.length} routed right on the first try`);
      return;
    }
    const w = [...wrong, r];
    setWrong(w);
    if (w.length >= 2) {
      setResolved(true);
      if (last) complete(`${firstTry} of ${CASES.length} routed right on the first try`);
    }
  };

  const next = () => {
    setIdx((i) => i + 1);
    setWrong([]);
    setResolved(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel agents03-triage-router">
        <p className="agents03-triage-router-note">
          Scripted model answers, one case at a time. Case {idx + 1} of {CASES.length}.
        </p>

        <div className="agents03-triage-router-case">
          <span className="w-label">{c.failure ? "Triage asks the model about this question" : "A user asks the desk"}</span>
          <div className="agents03-triage-router-quote w-mono">{c.shown}</div>
          {c.sent && <div className="agents03-triage-router-sent">{c.sent}</div>}
        </div>

        <div className="agents03-triage-router-pick">
          <span className="w-label">{c.failure ? "Where does the thread go?" : "Which route should triage pick?"}</span>
          <div className="w-row">
            {ROUTES.map((r) => {
              const isWrong = wrong.includes(r);
              const isRight = resolved && r === c.route;
              return (
                <button
                  key={r}
                  type="button"
                  className={`w-chip w-mono${isRight ? " good" : isWrong ? " bad" : ""}`}
                  aria-pressed={isRight || isWrong}
                  disabled={resolved || isWrong}
                  onClick={() => pick(r)}
                >
                  {r}
                </button>
              );
            })}
          </div>
          {!resolved && wrong.length === 1 && (
            <span className="agents03-triage-router-note" role="status">
              Not that one. Read the question again and try once more.
            </span>
          )}
        </div>

        {resolved && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="agents03-triage-router-result">
            <div className="agents03-triage-router-block">
              <span className="w-label">What the model returned</span>
              <div className="w-mono agents03-triage-router-code">
                {c.failure ? "parsed = None" : `TriageDecision(route="${c.route}", reason="${c.reason}")`}
              </div>
            </div>
            <div className="agents03-triage-router-block">
              <span className="w-label">What the triage node returns</span>
              <div className="w-mono agents03-triage-router-code">
                {`Command(goto="${c.route}", update=`}
                <br />
                {`  route="${c.route}", route_reason="${c.reason}",`}
                <br />
                {`  active_agent="${active}", steps=1)`}
              </div>
            </div>
            <div className={`w-verdict ${wrong.length === 0 ? "good" : "bad"}`} role="status">
              <strong>
                {wrong.length === 0 ? "Right." : wrong.length === 1 ? "Right on the second try." : `The answer was ${label(c.route)}.`}
              </strong>{" "}
              {c.explain}
            </div>
            {!last && (
              <div className="w-row">
                <button type="button" className="w-btn primary" onClick={next}>
                  Next case
                </button>
              </div>
            )}
            {last && (
              <div className="w-verdict good" role="status">
                <strong>All six cases done.</strong> You routed {firstTry} of {CASES.length} right on the first try. Note that the update always adds one to steps, because triage made one model call.
              </div>
            )}
          </motion.div>
        )}
      </div>
    </MotionConfig>
  );
}
