import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents04EdgeOrCommand.css";

// Every outcome below comes from a scripted run of the desk graph from the lab, with one edge added or not.
// The error text in case 3 is what LangGraph raised in that run.

type Node = "triage" | "researcher" | "code_advisor" | "writer";
type Option = { id: string; label: string };
type Case = {
  title: string;
  edge: boolean;
  wiring: string;
  action: string;
  options: Option[];
  answer: string;
  ran: Node[];
  crashed: boolean;
  outcome: string;
  why: string;
};

const CASES: Case[] = [
  {
    title: "Case 1: no edge out of the researcher",
    edge: false,
    wiring: "The desk graph has no edge out of the researcher.",
    action: "The user asks which Python version added the walrus operator. The researcher calls transfer_to_code_advisor.",
    options: [
      { id: "a", label: "Only the code advisor runs next." },
      { id: "b", label: "The code advisor runs, then the writer." },
      { id: "c", label: "The researcher keeps going." },
    ],
    answer: "a",
    ran: ["triage", "researcher", "code_advisor"],
    crashed: false,
    outcome: "Only the code advisor ran. It answered that the walrus operator came in Python 3.8.",
    why: "The Command makes the code advisor the next node. Nothing else is ready, so the run ends when the advisor answers.",
  },
  {
    title: "Case 2: an edge from the researcher to the writer",
    edge: true,
    wiring: 'You add graph.add_edge("researcher", "writer"), so that the writer always has the last word.',
    action: "The user asks what PEP 572 says. The researcher answers by itself and calls no transfer tool.",
    options: [
      { id: "a", label: "The run ends with the researcher's answer." },
      { id: "b", label: "The writer runs after the researcher, and its text becomes the answer." },
      { id: "c", label: "The run fails." },
    ],
    answer: "b",
    ran: ["triage", "researcher", "writer"],
    crashed: false,
    outcome: "The writer ran as well, and its reply replaced the researcher's answer. That is one extra model call on every question.",
    why: "An edge is unconditional. It fires whenever the researcher finishes, whether the researcher handed over or answered.",
  },
  {
    title: "Case 3: the same edge, and a handoff to the code advisor",
    edge: true,
    wiring: "The edge from the researcher to the writer is still in the graph.",
    action: "The user asks which Python version added the walrus operator. The researcher calls transfer_to_code_advisor.",
    options: [
      { id: "a", label: "Only the code advisor runs." },
      { id: "b", label: "The code advisor runs, then the writer." },
      { id: "c", label: "The code advisor and the writer run in the same round, and the run fails." },
    ],
    answer: "c",
    ran: ["triage", "researcher", "code_advisor", "writer"],
    crashed: true,
    outcome: "The run failed with InvalidUpdateError: At key 'question': Can receive only one value per step. LangGraph's message says step where this course says round.",
    why: "The Command made the code advisor ready. The edge made the writer ready. Both ran in the same round and both wrote question, a key with no reducer.",
  },
];

const POS: Record<Node, { x: number; y: number; w: number }> = {
  triage: { x: 4, y: 56, w: 62 },
  researcher: { x: 100, y: 56, w: 88 },
  code_advisor: { x: 226, y: 8, w: 90 },
  writer: { x: 226, y: 104, w: 90 },
};

function Diagram({ edge, ran, crashed }: { edge: boolean; ran: Node[]; crashed: boolean }) {
  const cls = (n: Node) => {
    if (crashed && (n === "code_advisor" || n === "writer")) return "agents04-edge-or-command-node crash";
    return ran.includes(n) ? "agents04-edge-or-command-node ran" : "agents04-edge-or-command-node";
  };
  const label = `The desk graph. Triage leads to the researcher. The researcher can hand over to the code advisor or the writer.${edge ? " An edge also runs from the researcher to the writer." : ""}`;
  return (
    <svg viewBox="0 0 320 140" className="agents04-edge-or-command-chart" role="img" aria-label={label}>
      <defs>
        <marker id="agents04-eoc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="agents04-edge-or-command-head" />
        </marker>
      </defs>
      <line x1="66" y1="71" x2="100" y2="71" className="agents04-edge-or-command-line" markerEnd="url(#agents04-eoc-arrow)" />
      <line x1="188" y1="64" x2="226" y2="30" className="agents04-edge-or-command-line dotted" markerEnd="url(#agents04-eoc-arrow)" />
      <line x1="188" y1="78" x2="226" y2="112" className="agents04-edge-or-command-line dotted" markerEnd="url(#agents04-eoc-arrow)" />
      {edge && <path d="M170,86 C176,128 206,134 226,126" className="agents04-edge-or-command-line solid" fill="none" markerEnd="url(#agents04-eoc-arrow)" />}
      {(Object.keys(POS) as Node[]).map((n) => (
        <g key={n}>
          <rect x={POS[n].x} y={POS[n].y} width={POS[n].w} height="30" rx="8" className={cls(n)} />
          <text x={POS[n].x + POS[n].w / 2} y={POS[n].y + 19} textAnchor="middle" className="agents04-edge-or-command-text">
            {n}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function Agents04EdgeOrCommand({ onComplete }: WidgetProps) {
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

  const checked = attempts > 0;
  const showResult = resolved;

  return (
    <div className="w-panel agents04-edge-or-command">
      <div className="w-row between">
        <span className="w-label">{c.title}</span>
        <span className="agents04-edge-or-command-count">
          {index + 1} of {CASES.length}
        </span>
      </div>

      <Diagram edge={c.edge} ran={showResult ? c.ran : []} crashed={showResult && c.crashed} />
      <p className="agents04-edge-or-command-key">Dotted lines are handoffs the model can choose. The solid line is an edge.</p>

      <div className="agents04-edge-or-command-scene">
        <p>
          <strong>Wiring.</strong> {c.wiring}
        </p>
        <p>
          <strong>The run.</strong> {c.action}
        </p>
      </div>

      <div className="agents04-edge-or-command-group" role="radiogroup" aria-label="Your prediction">
        <span className="w-label">Predict: what runs after the researcher?</span>
        <div className="agents04-edge-or-command-opts">
          {c.options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={pick === o.id}
              className={`agents04-edge-or-command-opt${pick === o.id ? " on" : ""}`}
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

      {checked && !resolved && (
        <div className="w-verdict bad" role="status">
          Not quite. Ask which nodes the wiring makes ready after the researcher, then pick again.
        </div>
      )}

      {showResult && (
        <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
          <strong>{right ? "Correct. " : "Not quite. "}</strong>
          {c.outcome} {c.why}
        </div>
      )}

      {finished && (
        <div className="w-verdict good" role="status">
          You predicted {firstTry} of {CASES.length} cases on the first try. The rule: give the agents no edges out, and let each handoff name the next node.
        </div>
      )}
    </div>
  );
}
