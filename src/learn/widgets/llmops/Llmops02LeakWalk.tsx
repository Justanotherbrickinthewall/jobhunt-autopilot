import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Llmops02LeakWalk.css";

// The runs and their text come from a scripted offline run of the real AskPEP desk. A fake LangSmith session
// recorded every run that the client sent, once with no hook and once with `redact_run`. The model was scripted
// to search for "walrus operator", so the address did not reach the search. A live model may copy it.
// The address is made up, on the reserved domain example.com.
const ADDRESS = "rita.shaw@example.com";
const QUESTION = `What does := do? Reply to ${ADDRESS} please.`;
const SEARCH = `query: "walrus operator", k: 2`;

type Run = {
  id: string;
  name: string;
  depth: number;
  note: string;
  inputs: string;
  outputs: string;
  inIt: boolean;
  outIt: boolean;
};

const RUNS: Run[] = [
  {
    id: "graph",
    name: "LangGraph",
    depth: 0,
    note: "The whole desk graph",
    inputs: `question: "${QUESTION}"`,
    outputs: `answer: "The walrus operator assigns inside an expression [1]." question: "${QUESTION}"`,
    inIt: true,
    outIt: true,
  },
  {
    id: "triage",
    name: "triage",
    depth: 1,
    note: "Reads the question and picks an agent",
    inputs: `question: "${QUESTION}"`,
    outputs: "the route it chose, and a short reason",
    inIt: true,
    outIt: false,
  },
  {
    id: "triage-model",
    name: "the triage model call",
    depth: 2,
    note: "Asks the model which agent should answer",
    inputs: `the prompt, with the user's message: "${QUESTION}"`,
    outputs: "the route the model chose",
    inIt: true,
    outIt: false,
  },
  {
    id: "researcher",
    name: "researcher",
    depth: 1,
    note: "The agent that searches, then answers",
    inputs: `the user's message: "${QUESTION}"`,
    outputs: `the conversation so far, which still holds: "${QUESTION}"`,
    inIt: true,
    outIt: true,
  },
  {
    id: "researcher-model",
    name: "the researcher's model calls",
    depth: 2,
    note: "Two calls: one asks for a search, one writes the answer",
    inputs: `the conversation, which starts with: "${QUESTION}"`,
    outputs: "a request to search, then the answer",
    inIt: true,
    outIt: false,
  },
  {
    id: "search",
    name: "search_peps",
    depth: 2,
    note: "The tool the model called",
    inputs: SEARCH,
    outputs: "two passages from the PEPs",
    inIt: false,
    outIt: false,
  },
  {
    id: "retrieve",
    name: "askpep.retrieve",
    depth: 3,
    note: "Your decorated retrieval function",
    inputs: SEARCH,
    outputs: "two hits",
    inIt: false,
    outIt: false,
  },
];

const carries = (r: Run) => r.inIt || r.outIt;

function Text({ text, hook }: { text: string; hook: boolean }) {
  const parts = text.split(ADDRESS);
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 &&
            (hook ? (
              <mark className="llmops02-leak-walk-safe">[EMAIL]</mark>
            ) : (
              <mark className="llmops02-leak-walk-leak">{ADDRESS}</mark>
            ))}
        </span>
      ))}
    </>
  );
}

export default function Llmops02LeakWalk({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [ran, setRan] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [hook, setHook] = useState(false);

  const wrong = RUNS.filter((r) => picked.has(r.id) !== carries(r));
  const right = ran && wrong.length === 0;
  const showWhy = ran && (right || attempts >= 2);

  const flip = (id: string) => {
    if (ran) return;
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const open = () => {
    const n = attempts + 1;
    setAttempts(n);
    setRan(true);
    if (wrong.length === 0) {
      complete("Found every run that carries the address");
    } else if (n >= 2) {
      complete("Saw the explanation after two tries");
    }
  };

  const tag = (r: Run) => {
    const is = picked.has(r.id);
    if (is && carries(r)) return { cls: "ok", text: "Right" };
    if (!is && !carries(r)) return { cls: "ok", text: "Right" };
    return is ? { cls: "bad", text: "Has none" } : { cls: "bad", text: "Missed" };
  };

  return (
    <div className="w-panel llmops02-leak-walk">
      <div className="llmops02-leak-walk-scene">
        <span className="w-label">The run</span>
        <ul>
          <li>
            The user asked: <q>{QUESTION}</q>
          </li>
          <li>Triage chose the researcher. The researcher searched for walrus operator, then answered.</li>
          <li>Below is the tree of runs that LangSmith received. Each run holds its inputs and its outputs as text.</li>
        </ul>
      </div>

      <div className="llmops02-leak-walk-group" role="group" aria-label="Runs that carry the address">
        <span className="w-label">Mark every run whose inputs or outputs hold the address.</span>
        <ul className="llmops02-leak-walk-tree">
          {RUNS.map((r) => {
            const t = ran ? tag(r) : null;
            return (
              <li key={r.id} style={{ paddingLeft: `${r.depth * 14}px` }}>
                <div className={`llmops02-leak-walk-run${t ? ` ${t.cls}` : ""}`}>
                  <button
                    type="button"
                    className="w-chip"
                    aria-pressed={picked.has(r.id)}
                    disabled={ran}
                    onClick={() => flip(r.id)}
                  >
                    {r.name}
                  </button>
                  <span className="llmops02-leak-walk-note">{r.note}</span>
                  {t && <span className={`llmops02-leak-walk-tag ${t.cls}`}>{t.text}</span>}
                </div>
                {ran && (
                  <dl className="llmops02-leak-walk-text">
                    <dt>In</dt>
                    <dd>
                      <Text text={r.inputs} hook={hook} />
                    </dd>
                    <dt>Out</dt>
                    <dd>
                      <Text text={r.outputs} hook={hook} />
                    </dd>
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="w-row">
        {!ran ? (
          <button type="button" className="w-btn primary" onClick={open}>
            Open the trace
          </button>
        ) : (
          !right && (
            <button type="button" className="w-btn ghost" onClick={() => setRan(false)}>
              Change my marks
            </button>
          )
        )}
      </div>

      {ran && (
        <div className="llmops02-leak-walk-result">
          <div className="llmops02-leak-walk-switch" role="group" aria-label="Redaction hook">
            <span className="w-label">Redaction hook</span>
            <div className="w-row">
              <button type="button" className="w-chip" aria-pressed={!hook} onClick={() => setHook(false)}>
                Off
              </button>
              <button type="button" className="w-chip" aria-pressed={hook} onClick={() => setHook(true)}>
                On
              </button>
            </div>
          </div>
          <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
            {right
              ? "Correct. Five of the seven runs carry the address, in their inputs or in their outputs. The search runs are clean only because the model wrote a search query without it. Turn the hook on and every one of the five reads [EMAIL]."
              : showWhy
                ? "Not quite. The address enters through the question, so it sits in every run that receives the question or the conversation: the graph, triage, the researcher and the model calls. The two search runs are clean only because the model chose the query."
                : `${wrong.length} ${wrong.length === 1 ? "mark is" : "marks are"} wrong. Change your marks and try once more.`}
          </div>
        </div>
      )}
    </div>
  );
}
