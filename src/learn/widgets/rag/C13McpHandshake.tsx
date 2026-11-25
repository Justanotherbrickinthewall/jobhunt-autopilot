import { useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import "./C13McpHandshake.css";

type Msg = { dir: "right" | "left"; label: string; body: string };

const HANDSHAKE: Msg[] = [
  { dir: "right", label: "initialize", body: "The client says who it is and which protocol version it speaks." },
  { dir: "left", label: "initialize result", body: "The server answers with its name, askpep, and its instructions." },
  { dir: "right", label: "tools/list", body: "The client asks what the server can do." },
  { dir: "left", label: "tools/list result", body: "Two tools: search_peps and ask_peps, each with a description and an input schema." },
];

type Scenario = {
  prompt: string;
  best: "search_peps" | "ask_peps";
  why: string;
};

const SCENARIOS: Scenario[] = [
  {
    prompt: "You want the exact wording PEP 703 uses about the GIL, so you can quote it in a design doc.",
    best: "search_peps",
    why: "search_peps returns the raw chunks with PEP number, section and text. You quote from the source itself. ask_peps would hand you a paraphrase written by a second model.",
  },
  {
    prompt: "You want a short answer to why the walrus operator was controversial, with sources to follow up.",
    best: "ask_peps",
    why: "ask_peps retrieves, generates a cited answer and returns the source links. It also refuses when the PEPs do not cover the question, which search_peps never does.",
  },
];

const RESULT: Record<string, { call: string; result: string; route: string }> = {
  search_peps: {
    call: 'tools/call search_peps {"query": "...", "k": 6}',
    result: "A list of hits: pep, title, section, text, score.",
    route: "mcp.search",
  },
  ask_peps: {
    call: 'tools/call ask_peps {"question": "..."}',
    result: "An object: answer, refused, sources with n, title and url.",
    route: "mcp.ask",
  },
};

export default function C13McpHandshake({ onComplete }: WidgetProps) {
  const [shown, setShown] = useState(0);
  const [transport, setTransport] = useState<"stdio" | "http">("stdio");
  const [picks, setPicks] = useState<(string | null)[]>(SCENARIOS.map(() => null));
  const fired = useRef(false);

  const handshakeDone = shown >= HANDSHAKE.length;
  const allPicked = picks.every(Boolean);
  const score = picks.filter((p, i) => p === SCENARIOS[i].best).length;

  const pick = (i: number, tool: string) => {
    if (picks[i]) return;
    const next = picks.map((p, j) => (j === i ? tool : p));
    setPicks(next);
    if (next.every(Boolean) && !fired.current) {
      fired.current = true;
      const s = next.filter((p, j) => p === SCENARIOS[j].best).length;
      onComplete?.(`${s} of ${SCENARIOS.length} tool choices matched`);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel c13-mcp">
        <div className="w-row between c13-mcp-head">
          <div className="c13-mcp-lane client">Claude Code or Codex</div>
          <div className="w-row" role="radiogroup" aria-label="Transport">
            {(["stdio", "http"] as const).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={transport === t} className={`w-chip c13-mcp-opt${transport === t ? " on" : ""}`} onClick={() => setTransport(t)}>
                {t === "stdio" ? "stdio" : "HTTP"}
              </button>
            ))}
          </div>
          <div className="c13-mcp-lane server">askpep server</div>
        </div>
        <p className="c13-mcp-transport">
          {transport === "stdio"
            ? "The client starts the server as a child process: uv run askpep mcp. Messages travel over its standard input and output. No key is needed because only the client can reach the process."
            : "The client posts to the /mcp route. Every request carries the X-API-Key header. Without it the gate answers 401 before any MCP code runs."}
        </p>

        <ol className="c13-mcp-seq" aria-label="Message sequence">
          <AnimatePresence initial={false}>
            {HANDSHAKE.slice(0, shown).map((m, i) => (
              <motion.li key={m.label} className={`c13-mcp-msg ${m.dir}`} initial={{ opacity: 0, x: m.dir === "right" ? -16 : 16 }} animate={{ opacity: 1, x: 0 }}>
                <span className="c13-mcp-arrow" aria-hidden="true">{m.dir === "right" ? "→" : "←"}</span>
                <span><strong>{i + 1}. {m.label}.</strong> {m.body}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
        {!handshakeDone && (
          <button type="button" className="w-btn" onClick={() => setShown((s) => s + 1)}>
            {shown === 0 ? "Start the handshake" : "Next message"}
          </button>
        )}

        {handshakeDone && (
          <div className="c13-mcp-tasks">
            <p className="c13-mcp-lead">The client now knows both tools. Pick the one it should call for each job.</p>
            {SCENARIOS.map((s, i) => {
              const p = picks[i];
              const right = p === s.best;
              return (
                <div key={s.prompt} className="c13-mcp-task">
                  <p>{s.prompt}</p>
                  <div className="w-row">
                    {["search_peps", "ask_peps"].map((tool) => (
                      <button key={tool} type="button" disabled={!!p && p !== tool} className={`w-chip c13-mcp-opt${p === tool ? " on" : ""}`} onClick={() => pick(i, tool)}>
                        {tool}
                      </button>
                    ))}
                  </div>
                  <AnimatePresence>
                    {p && (
                      <motion.div className={`c13-mcp-after ${right ? "ok" : "miss"}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <code>{RESULT[p].call}</code>
                        <p>Result: {RESULT[p].result} The server writes a trace row with route {RESULT[p].route}.</p>
                        <p>{right ? "Good choice. " : `Better: ${s.best}. `}{s.why}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {allPicked && (
          <div className={`w-verdict ${score === SCENARIOS.length ? "good" : "bad"}`} role="status">
            You matched {score} of {SCENARIOS.length}. The rule: take search_peps when the agent wants evidence it will read itself, and ask_peps when it wants a finished, cited answer from the service.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
