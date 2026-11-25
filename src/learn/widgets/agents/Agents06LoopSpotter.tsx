import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents06LoopSpotter.css";

type Call = { tool: string; args: Record<string, string | number> };
type Msg = { who: "human" | "model" | "answer"; text?: string; calls?: Call[] };
type Case = { title: string; thread: Msg[]; why: string };

const REPEATS = 3;
const SEARCH = "search_peps";
const search = (args: Call["args"]): Call => ({ tool: SEARCH, args });

// The same rule as detect_loop in askpep/agents/budget.py. Only the calls after the last human message
// count. Each call is compared as its tool name plus its arguments with sorted keys.
const sortedArgs = (c: Call) => JSON.stringify(Object.fromEntries(Object.entries(c.args).sort(([a], [b]) => a.localeCompare(b))));
const key = (c: Call) => `${c.tool} ${sortedArgs(c)}`;

function currentCalls(thread: Msg[]): Call[] {
  let start = 0;
  thread.forEach((m, i) => {
    if (m.who === "human") start = i + 1;
  });
  return thread.slice(start).flatMap((m) => m.calls ?? []);
}

function detectLoop(thread: Msg[], repeats: number): boolean {
  if (repeats < 1) return false;
  const keys = currentCalls(thread).map(key);
  return keys.length >= repeats && new Set(keys.slice(-repeats)).size === 1;
}

const show = (c: Call) =>
  `${c.tool}(${Object.entries(c.args)
    .map(([k, v]) => `${k}=${typeof v === "string" ? JSON.stringify(v) : v}`)
    .join(", ")})`;

const CASES: Case[] = [
  {
    title: "The same search three times",
    thread: [
      { who: "human", text: "Why was the walrus operator controversial?" },
      { who: "model", calls: [search({ query: "walrus operator", k: 5 })] },
      { who: "model", calls: [search({ query: "walrus operator", k: 5 })] },
      { who: "model", calls: [search({ query: "walrus operator", k: 5 })] },
    ],
    why: "The last three calls match, so the check fires. The tool returned the same result each time, and the model asked again.",
  },
  {
    title: "The same call with its arguments in another order",
    thread: [
      { who: "human", text: "Why was the walrus operator controversial?" },
      { who: "model", calls: [search({ query: "walrus", k: 5 })] },
      { who: "model", calls: [search({ k: 5, query: "walrus" })] },
      { who: "model", calls: [search({ query: "walrus", k: 5 })] },
    ],
    why: "The check sorts the argument keys before it compares, so the order does not matter. All three calls are the same call.",
  },
  {
    title: "A reworded query each time",
    thread: [
      { who: "human", text: "Why was the walrus operator controversial?" },
      { who: "model", calls: [search({ query: "walrus", k: 5 })] },
      { who: "model", calls: [search({ query: "walrus operator", k: 5 })] },
      { who: "model", calls: [search({ query: "walrus operator PEP", k: 5 })] },
    ],
    why: "These are three different calls, so the check stays quiet. The model is stuck all the same. A budget, such as the step budget, has to stop this run.",
  },
  {
    title: "Three repeats, then a new call",
    thread: [
      { who: "human", text: "Why was the walrus operator controversial?" },
      { who: "model", calls: [search({ query: "walrus", k: 5 })] },
      { who: "model", calls: [search({ query: "walrus", k: 5 })] },
      { who: "model", calls: [search({ query: "walrus", k: 5 })] },
      { who: "model", calls: [search({ query: "PEP 572 rejected alternatives", k: 5 })] },
    ],
    why: "Only the last three calls count, and they are not all the same. The model changed course, so this isn't a repeated call.",
  },
  {
    title: "The same question asked twice in one thread",
    thread: [
      { who: "human", text: "What does PEP 572 say?" },
      { who: "model", calls: [search({ query: "PEP 572", k: 5 })] },
      { who: "model", calls: [search({ query: "PEP 572", k: 5 })] },
      { who: "model", calls: [search({ query: "PEP 572", k: 5 })] },
      { who: "answer", text: "PEP 572 adds assignment expressions [1]." },
      { who: "human", text: "What does PEP 572 say?" },
      { who: "model", calls: [search({ query: "PEP 572", k: 5 })] },
    ],
    why: "Only the calls after the last human message count. The three earlier calls belong to the earlier question, and this question has made one call.",
  },
  {
    title: "Two parallel calls in one message",
    thread: [
      { who: "human", text: "Why was the walrus operator controversial?" },
      { who: "model", calls: [search({ query: "walrus", k: 5 }), search({ query: "walrus", k: 5 })] },
      { who: "model", calls: [search({ query: "walrus", k: 5 })] },
    ],
    why: "A model can ask for several tools in one message, and each call counts. Two parallel calls and one more make three identical calls.",
  },
];

export default function Agents06LoopSpotter({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<(boolean | null)[]>(CASES.map(() => null));

  const pick = (i: number, said: boolean) => {
    if (picks[i] !== null) return;
    const next = picks.map((p, j) => (j === i ? said : p));
    setPicks(next);
    if (next.every((p) => p !== null)) {
      const right = next.filter((p, j) => p === detectLoop(CASES[j].thread, REPEATS)).length;
      complete(`${right} of ${CASES.length} repeated-call checks right`);
    }
  };

  const answered = picks.filter((p) => p !== null).length;

  return (
    <div className="w-panel agents06-loop-spotter">
      <p className="agents06-loop-spotter-hint">
        Each card is one thread. <span className="w-mono">detect_loop</span> runs with <span className="w-mono">repeats</span> set to {REPEATS}. Decide what it returns. {answered} of {CASES.length} answered.
      </p>
      {CASES.map((c, i) => {
        const truth = detectLoop(c.thread, REPEATS);
        const picked = picks[i];
        const done = picked !== null;
        const counted = currentCalls(c.thread);
        const tailStart = Math.max(0, counted.length - REPEATS);
        const firstCounted = c.thread.map((m) => m.who).lastIndexOf("human") + 1;
        let callNo = 0;
        return (
          <section key={c.title} className="agents06-loop-spotter-card" aria-label={`Case ${i + 1}: ${c.title}`}>
            <h4 className="agents06-loop-spotter-title">{c.title}</h4>
            <ol className="agents06-loop-spotter-thread">
              {c.thread.map((m, mi) => {
                if (m.who !== "model") {
                  return (
                    <li key={mi} className={`agents06-loop-spotter-msg ${m.who}`}>
                      <span className="w-label">{m.who === "human" ? "User" : "Desk answer"}</span> {m.text}
                    </li>
                  );
                }
                const earlier = mi < firstCounted;
                return (
                  <li key={mi} className={`agents06-loop-spotter-msg model${earlier ? " earlier" : ""}`}>
                    <span className="w-label">Model calls</span>
                    {(m.calls ?? []).map((call, ci) => {
                      const n = earlier ? -1 : callNo++;
                      const inTail = done && n >= tailStart;
                      return (
                        <code key={ci} className={`agents06-loop-spotter-call${inTail ? " tail" : ""}`}>
                          {show(call)}
                        </code>
                      );
                    })}
                  </li>
                );
              })}
            </ol>
            <div className="agents06-loop-spotter-choices" role="radiogroup" aria-label="What detect_loop returns">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  role="radio"
                  aria-checked={picked === v}
                  disabled={done}
                  className={`w-chip agents06-loop-spotter-choice${picked === v ? " on" : ""}${done && v === truth ? " right" : ""}`}
                  onClick={() => pick(i, v)}
                >
                  {v ? "True, a repeated call" : "False, no repeated call"}
                </button>
              ))}
            </div>
            {done && (
              <p className={`agents06-loop-spotter-why ${picked === truth ? "ok" : "miss"}`} role="status">
                <strong>{picked === truth ? "Correct. " : `Missed. It returns ${truth ? "True" : "False"}. `}</strong>
                {c.why}
              </p>
            )}
          </section>
        );
      })}
      {answered === CASES.length && (
        <div className="w-verdict good" role="status">
          The check matches exact calls after the last human message. It can't see a model that rewords its query, so it works beside the step budget and never in place of it.
        </div>
      )}
    </div>
  );
}
