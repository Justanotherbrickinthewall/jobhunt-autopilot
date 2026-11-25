import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Guardrails03AllowList.css";

// The tool lists are ALLOWED_TOOLS in capstone/src/askpep/agents/tools.py, minus the transfer tools.
// Which agents can hand over to which is in the same table. The outcomes follow from those lists.

type Agent = "researcher" | "code_advisor" | "writer";
type Mark = "none" | "fails" | "chain" | "guard";
type Option = { id: string; label: string };
type Case = {
  title: string;
  scene: string;
  question: string;
  options: Option[];
  answer: string;
  mark: Mark;
  outcome: string;
  why: string;
};

const TOOLS: Record<Agent, string[]> = {
  researcher: ["search_peps", "read_pep_section"],
  code_advisor: ["lint_snippet", "python_feature_version", "search_peps"],
  writer: ["open_ticket"],
};

const BOX: Record<Agent, { x: number; w: number }> = {
  researcher: { x: 4, w: 96 },
  code_advisor: { x: 130, w: 100 },
  writer: { x: 260, w: 96 },
};

const CASES: Case[] = [
  {
    title: "Case 1: the researcher obeys the order",
    scene: "The researcher reads the poisoned section and obeys it. It calls open_ticket with the title PWNED.",
    question: "What happens to the call?",
    options: [
      { id: "a", label: "The ticket is filed." },
      { id: "b", label: "The call fails, because the researcher has no tool called open_ticket." },
      { id: "c", label: "A tool call guard removes the order." },
    ],
    answer: "b",
    mark: "fails",
    outcome: "The researcher holds two tools and two handoffs, and open_ticket is not one of them. A call to any other name comes back as an error, and nothing runs.",
    why: "The allow-list works as least privilege. An agent can't use a tool it was never given.",
  },
  {
    title: "Case 2: the researcher passes the order on",
    scene: "The researcher can't call open_ticket, so it hands the conversation to the writer. The writer holds that tool. A handoff carries the whole conversation, order included.",
    question: "Does the allow-list stop the ticket?",
    options: [
      { id: "a", label: "Yes. The researcher's list is the whole defence." },
      { id: "b", label: "No. The writer holds open_ticket, and the order travels with the conversation." },
      { id: "c", label: "Yes, because a handoff clears the history." },
    ],
    answer: "b",
    mark: "chain",
    outcome: "The writer reads the history and may obey the order. An allow-list limits one agent. It does not limit a chain of agents.",
    why: "So the order has to be stopped elsewhere: in the passage before the model reads it, and in the tool before it runs.",
  },
  {
    title: "Case 3: where one check covers every route",
    scene: "Orders can reach open_ticket through the researcher, the code advisor or the writer. You have room for one more check.",
    question: "Where does one check cover every route?",
    options: [
      { id: "a", label: "In the researcher's tool list." },
      { id: "b", label: "In the open_ticket call itself, before the tool runs." },
      { id: "c", label: "In the triage prompt." },
    ],
    answer: "b",
    mark: "guard",
    outcome: "Every route ends at the same tool. A check in front of the tool sees every call, whichever agent made it.",
    why: "Step 6 of the lab puts the tool call guards there. Chapter 5 adds authorisation to the same place, and chapter 6 adds approval.",
  },
];

function Diagram({ mark }: { mark: Mark }) {
  const label =
    "The desk's three agents and their tools. The researcher and the code advisor hold search tools. The code advisor also holds two code tools. The writer holds open_ticket. Handoff lines join the agents.";
  const agents = Object.keys(TOOLS) as Agent[];
  return (
    <svg viewBox="0 0 360 130" className="guardrails03-allow-list-chart" role="img" aria-label={label}>
      <path d="M52,34 C52,2 308,2 308,34" className={`guardrails03-allow-list-line${mark === "chain" ? " hot" : ""}`} />
      <line x1="100" y1="49" x2="130" y2="49" className="guardrails03-allow-list-line" />
      <line x1="230" y1="49" x2="260" y2="49" className="guardrails03-allow-list-line" />
      {agents.map((a) => {
        const box = BOX[a];
        const bad = (mark === "fails" && a === "researcher") || (mark === "chain" && a === "writer");
        return (
          <g key={a}>
            <rect x={box.x} y="34" width={box.w} height="30" rx="8" className={`guardrails03-allow-list-node${bad ? " bad" : ""}`} />
            <text x={box.x + box.w / 2} y="53" textAnchor="middle" className="guardrails03-allow-list-text">
              {a}
            </text>
            {TOOLS[a].map((t, i) => {
              const isTicket = t === "open_ticket";
              const cls = isTicket
                ? `guardrails03-allow-list-tool${mark === "chain" ? " bad" : ""}${mark === "guard" ? " good" : ""}`
                : "guardrails03-allow-list-tool";
              return (
                <text key={t} x={box.x + box.w / 2} y={82 + i * 13} textAnchor="middle" className={cls}>
                  {t}
                </text>
              );
            })}
          </g>
        );
      })}
      {mark === "guard" && (
        <text x={BOX.writer.x + BOX.writer.w / 2} y="116" textAnchor="middle" className="guardrails03-allow-list-tool good">
          check here
        </text>
      )}
    </svg>
  );
}

export default function Guardrails03AllowList({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);

  const c = CASES[index];
  const right = pick === c.answer;

  const check = () => {
    if (pick === null) return;
    const n = attempts + 1;
    setAttempts(n);
    if (pick === c.answer || n >= 2) {
      setResolved(true);
      if (pick === c.answer && n === 1) setFirstTry((k) => k + 1);
    }
  };

  const next = () => {
    if (index + 1 < CASES.length) {
      setIndex(index + 1);
      setPick(null);
      setAttempts(0);
      setResolved(false);
    } else {
      setFinished(true);
      complete(`Predicted ${firstTry} of ${CASES.length} cases on the first try`);
    }
  };

  return (
    <div className="w-panel guardrails03-allow-list">
      <div className="w-row between">
        <span className="w-label">{c.title}</span>
        <span className="guardrails03-allow-list-count">
          {index + 1} of {CASES.length}
        </span>
      </div>

      <Diagram mark={resolved ? c.mark : "none"} />
      <p className="guardrails03-allow-list-key">Each line is a handoff the agents can make. The names under an agent are its other tools.</p>

      <div className="guardrails03-allow-list-scene">
        <p>{c.scene}</p>
      </div>

      <div className="guardrails03-allow-list-group" role="radiogroup" aria-label="Your prediction">
        <span className="w-label">Predict: {c.question}</span>
        <div className="guardrails03-allow-list-opts">
          {c.options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={pick === o.id}
              className={`guardrails03-allow-list-opt${pick === o.id ? " on" : ""}`}
              disabled={resolved}
              onClick={() => setPick(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-row">
        {!resolved && (
          <button type="button" className="w-btn primary" disabled={pick === null} onClick={check}>
            Check my prediction
          </button>
        )}
        {resolved && !finished && (
          <button type="button" className="w-btn ghost" onClick={next}>
            {index + 1 < CASES.length ? "Next case" : "Finish"}
          </button>
        )}
      </div>

      {attempts > 0 && !resolved && (
        <div className="w-verdict bad" role="status">
          Not quite. Ask which tools each agent holds, and what a handoff carries with it. Then pick again.
        </div>
      )}

      {resolved && (
        <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
          <strong>{right ? "Correct. " : "Not quite. "}</strong>
          {c.outcome} {c.why}
        </div>
      )}

      {finished && (
        <div className="w-verdict good" role="status">
          You predicted {firstTry} of {CASES.length} cases on the first try. An allow-list limits each agent, so give each agent only the tools its job needs. A check in front of the dangerous tool covers every route to it.
        </div>
      )}
    </div>
  );
}
