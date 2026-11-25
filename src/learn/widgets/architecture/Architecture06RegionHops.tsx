import { useId, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Architecture06RegionHops.css";

// The hops of one AskPEP desk request. Three are pinned to europe-west3 by AskPEP's settings or the deploy guide.
// Four are not. Sources: capstone/DEPLOY.md, capstone/src/askpep/config.py and setup/revision5/FACTS.md.
// CHECK: the EU endpoint https://eu.api.smith.langchain.com for LangSmith, and which Gemini models serve europe-west3, change over time. Confirm both in the current Google and LangSmith docs before release.

type Pin = "pinned" | "open";

type Hop = { id: string; name: string; holds: string; answer: Pin; why: string };

const HOPS: Hop[] = [
  {
    id: "api",
    name: "The AskPEP API on Cloud Run",
    holds: "Every request and every answer.",
    answer: "pinned",
    why: "RAG chapter 14 sets europe-west3 in the step 'Set the project and region, enable the APIs and create the registry', then deploys Cloud Run there in 'Deploy the service and check the health route'.",
  },
  {
    id: "db",
    name: "The Postgres database on Cloud SQL",
    holds: "Checkpoints, notes, tickets, traces and audit rows.",
    answer: "pinned",
    why: "RAG chapter 14 creates the instance in europe-west3, in the step 'Create the Cloud SQL instance, the database and the user'.",
  },
  {
    id: "armor",
    name: "Model Armor, the screening service from the guardrails course",
    holds: "The question text and the draft answer, for screening.",
    answer: "pinned",
    why: "`GCP_REGION` defaults to europe-west3, and the Model Armor endpoint is built from it.",
  },
  {
    id: "gemini",
    name: "The Gemini models on Vertex AI",
    holds: "The question, the retrieved passages and the history.",
    answer: "open",
    why: "`VERTEX_LOCATION` and `STRONG_LOCATION` both default to global. You can set a region, but only one that serves the model you chose.",
  },
  {
    id: "claude",
    name: "Claude, through the Anthropic API",
    holds: "The same text as Gemini, when routing or the fallback sends it there.",
    answer: "open",
    why: "AskPEP calls the Anthropic API directly and sets no region on the call.",
  },
  {
    id: "voyage",
    name: "Voyage, for embeddings and ranking",
    holds: "The question, and the text of the passages it ranks.",
    answer: "open",
    why: "Voyage is an outside service, and AskPEP sets no region on its calls.",
  },
  {
    id: "langsmith",
    name: "LangSmith, only when tracing is on",
    holds: "The run, with personal data masked before it leaves the process.",
    answer: "open",
    why: "`LANGSMITH_ENDPOINT` is empty by default, so the SDK uses its own default, which is the US region. An EU endpoint exists and you have to set it.",
  },
];

const LABEL: Record<Pin, string> = { pinned: "Pinned to europe-west3", open: "Not pinned" };

export default function Architecture06RegionHops({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const baseId = useId();
  const [picks, setPicks] = useState<Record<string, Pin>>({});
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);

  const allPicked = HOPS.every((h) => picks[h.id]);
  const rightCount = HOPS.filter((h) => picks[h.id] === h.answer).length;
  const showMarks = attempts > 0;

  const check = () => {
    if (!allPicked) return;
    const k = attempts + 1;
    setAttempts(k);
    const right = HOPS.every((h) => picks[h.id] === h.answer);
    if (right || k >= 2) {
      setResolved(true);
      complete(
        right && k === 1
          ? "Sorted the seven hops into pinned and not pinned on the first try"
          : right
            ? "Sorted the seven hops into pinned and not pinned on the second try"
            : "Needed the explanations to sort the seven hops",
      );
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel architecture06-region-hops">
        <div className="w-row between">
          <span className="w-label">Seven hops of one desk request</span>
          <span className="architecture06-region-hops-count">{showMarks ? `${rightCount} of ${HOPS.length} right` : "Predict first"}</span>
        </div>
        <p className="architecture06-region-hops-note">
          A customer in Germany asks you to promise that no personal data leaves the EU. For each hop, say whether AskPEP as shipped pins it to europe-west3.
        </p>

        <ol className="architecture06-region-hops-list">
          {HOPS.map((hop, i) => {
            const pick = picks[hop.id];
            const right = pick === hop.answer;
            const name = `${baseId}-${hop.id}`;
            return (
              <li key={hop.id} className={`architecture06-region-hops-hop${showMarks && pick ? (right ? " right" : resolved ? " wrong" : " retry") : ""}`}>
                <fieldset className="architecture06-region-hops-fields" disabled={resolved}>
                  <legend>
                    <span className="architecture06-region-hops-n">{i + 1}</span> {hop.name}
                  </legend>
                  <span className="architecture06-region-hops-holds">{hop.holds}</span>
                  <div className="architecture06-region-hops-choices">
                    {(["pinned", "open"] as Pin[]).map((p) => (
                      <label key={p} className={`architecture06-region-hops-choice${pick === p ? " on" : ""}`}>
                        <input type="radio" name={name} value={p} checked={pick === p} onChange={() => setPicks((s) => ({ ...s, [hop.id]: p }))} />
                        <span>{LABEL[p]}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                {showMarks && pick && !resolved && <span className={`w-chip ${right ? "good" : "warn"}`}>{right ? "Right" : "Not yet"}</span>}
                {resolved && (
                  <motion.p className="architecture06-region-hops-why" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                    <span className={`w-chip ${right ? "good" : "bad"}`}>{right ? "Right" : `Should be: ${LABEL[hop.answer]}`}</span> {renderTicks(hop.why)}
                  </motion.p>
                )}
              </li>
            );
          })}
        </ol>

        {!resolved && (
          <div className="w-row">
            <button type="button" className="w-btn primary" disabled={!allPicked} onClick={check}>
              Check my sort
            </button>
            {attempts > 0 && (
              <span className="architecture06-region-hops-hint" role="status">
                {rightCount} of {HOPS.length} are right. Change the ones marked Not yet.
              </span>
            )}
          </div>
        )}

        {resolved && (
          <div className={`w-verdict ${rightCount === HOPS.length ? "good" : "bad"}`} role="status">
            <strong>{rightCount === HOPS.length ? "All seven are sorted." : `${rightCount} of ${HOPS.length} were right.`}</strong> Three hops are pinned and four are not. The honest promise is narrow. The API, the
            database and Model Armor sit in europe-west3. The four others carry the question text out of the region unless you change a setting, sign a contract or pick another provider.
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
