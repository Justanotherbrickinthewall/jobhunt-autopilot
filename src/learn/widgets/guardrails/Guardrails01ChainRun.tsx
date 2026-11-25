import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Guardrails01ChainRun.css";

// Three runs of a chain of three demo guards. Every outcome below follows the rules that the chapter states:
// a guard runs only at its own stages, a modify passes its text on, and the first block stops the chain.
// The guards are plain stand-ins, like the FakeGuard that lab step 2 builds. They are not the real guards of the course.

type Stage = "input" | "retrieved" | "tool_call" | "output";
type Status = "modified" | "allowed" | "blocked" | "skipped" | "never";

type DemoGuard = { stages: Stage[]; rule: string };

const GUARDS: Record<string, DemoGuard> = {
  trim: { stages: ["input", "output"], rule: "Replaces a run of spaces with one space. It changes text, so it modifies." },
  mask_email: { stages: ["input", "output"], rule: "Replaces an email address with [email]. It modifies." },
  no_secrets: { stages: ["input", "tool_call"], rule: "Blocks any text that holds API_KEY." },
};

type Trace = { guard: string; status: Status; passed: string };
type Case = {
  title: string;
  stage: Stage;
  text: string;
  order: string[];
  options: { id: string; label: string }[];
  answer: string;
  trace: Trace[];
  action: "allow" | "modify" | "block";
  final: string;
  why: string;
};

const CASES: Case[] = [
  {
    title: "Case 1: two guards change the same text",
    stage: "input",
    text: "Mail  rita@example.com  about PEP 572",
    order: ["trim", "mask_email", "no_secrets"],
    options: [
      { id: "a", label: "Modify. The spaces are fixed and the address is masked." },
      { id: "b", label: "Modify. Only the address is masked, and the extra spaces stay." },
      { id: "c", label: "Modify. Only the spaces are fixed." },
      { id: "d", label: "Allow, with the text unchanged." },
    ],
    answer: "a",
    trace: [
      { guard: "trim", status: "modified", passed: "Mail rita@example.com about PEP 572" },
      { guard: "mask_email", status: "modified", passed: "Mail [email] about PEP 572" },
      { guard: "no_secrets", status: "allowed", passed: "Mail [email] about PEP 572" },
    ],
    action: "modify",
    final: "Mail [email] about PEP 572",
    why: "Each modify hands its text to the next guard. mask_email saw the trimmed text, so both changes are in the result.",
  },
  {
    title: "Case 2: the first guard blocks",
    stage: "input",
    text: "Remember my API_KEY=abc and mail rita@example.com",
    order: ["no_secrets", "mask_email", "trim"],
    options: [
      { id: "a", label: "Block, after all three guards ran." },
      { id: "b", label: "Block, after only no_secrets ran." },
      { id: "c", label: "Modify. The address is masked and the key is left in." },
      { id: "d", label: "Allow, because the first guard only looked." },
    ],
    answer: "b",
    trace: [
      { guard: "no_secrets", status: "blocked", passed: "The text holds API_KEY." },
      { guard: "mask_email", status: "never", passed: "" },
      { guard: "trim", status: "never", passed: "" },
    ],
    action: "block",
    final: "Remember my API_KEY=abc and mail rita@example.com",
    why: "The first block ends the run of the chain. The two guards after it never run, so they never see the text.",
  },
  {
    title: "Case 3: the blocking guard skips this stage",
    stage: "output",
    text: "The server's API_KEY is abc123.",
    order: ["no_secrets", "mask_email", "trim"],
    options: [
      { id: "a", label: "Block. no_secrets finds the key." },
      { id: "b", label: "Allow. no_secrets does not run at the output stage." },
      { id: "c", label: "Modify. mask_email hides the key." },
    ],
    answer: "b",
    trace: [
      { guard: "no_secrets", status: "skipped", passed: "" },
      { guard: "mask_email", status: "allowed", passed: "The server's API_KEY is abc123." },
      { guard: "trim", status: "allowed", passed: "The server's API_KEY is abc123." },
    ],
    action: "allow",
    final: "The server's API_KEY is abc123.",
    why: "no_secrets was written for the input and tool call stages, so the chain skips it here. A secret in an answer needs its own guard on the output stage.",
  },
];

const STATUS_LABEL: Record<Status, string> = {
  modified: "Modified the text.",
  allowed: "Allowed the text.",
  blocked: "Blocked.",
  skipped: "Skipped. Not a guard for this stage.",
  never: "Never ran. The chain had stopped.",
};

export default function Guardrails01ChainRun({ onComplete }: WidgetProps) {
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
      complete(`Predicted ${firstTry} of ${CASES.length} chain runs on the first try`);
    }
  };

  const traceOf = (name: string) => c.trace.find((t) => t.guard === name);

  return (
    <div className="w-panel guardrails01-chain-run">
      <div className="w-row between">
        <span className="w-label">{c.title}</span>
        <span className="guardrails01-chain-run-count">
          {index + 1} of {CASES.length}
        </span>
      </div>

      <div className="guardrails01-chain-run-scene">
        <p>
          <strong>The call.</strong> The chain runs at the <span className="w-mono">{c.stage}</span> stage.
        </p>
        <p className="guardrails01-chain-run-text w-mono">{c.text}</p>
      </div>

      <ol className="guardrails01-chain-run-guards" aria-label="The guards, in the order the chain runs them">
        {c.order.map((name) => {
          const g = GUARDS[name];
          const t = resolved ? traceOf(name) : undefined;
          return (
            <li key={name} className={"guardrails01-chain-run-guard" + (t ? " " + t.status : "")}>
              <div className="w-row between">
                <span className="w-mono guardrails01-chain-run-name">{name}</span>
                <span className="guardrails01-chain-run-stages">
                  {(["input", "tool_call", "output"] as Stage[])
                    .filter((s) => g.stages.includes(s))
                    .map((s) => (
                      <span key={s} className={"guardrails01-chain-run-stage" + (s === c.stage ? " here" : "")}>
                        {s}
                      </span>
                    ))}
                </span>
              </div>
              <p className="guardrails01-chain-run-rule">{g.rule}</p>
              {t && (
                <p className="guardrails01-chain-run-trace">
                  <strong>{STATUS_LABEL[t.status]}</strong>
                  {t.passed && t.status !== "blocked" ? <> Passed on: <span className="w-mono guardrails01-chain-run-text">{t.passed}</span></> : null}
                  {t.status === "blocked" ? <> {t.passed}</> : null}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="guardrails01-chain-run-group" role="radiogroup" aria-label="Your prediction">
        <span className="w-label">Predict: what does the chain return?</span>
        <div className="guardrails01-chain-run-opts">
          {c.options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={pick === o.id}
              className={`guardrails01-chain-run-opt${pick === o.id ? " on" : ""}`}
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
          Not quite. Go through the guards in order. For each one, ask whether it covers this stage and what it does to the text it is given.
        </div>
      )}

      {resolved && (
        <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
          <strong>{right ? "Correct. " : "Not quite. "}</strong>
          {c.action === "block" ? (
            <>The chain returns block, so the text goes no further. </>
          ) : (
            <>
              The chain returns {c.action}, and the text it passes on is <span className="w-mono guardrails01-chain-run-text">{c.final}</span>{" "}
            </>
          )}
          {c.why}
        </div>
      )}

      {finished && (
        <div className="w-verdict good" role="status">
          You predicted {firstTry} of {CASES.length} runs on the first try. The rules: a guard runs only at its own stages, each modify feeds the next guard, and the first block ends the chain.
        </div>
      )}
    </div>
  );
}
