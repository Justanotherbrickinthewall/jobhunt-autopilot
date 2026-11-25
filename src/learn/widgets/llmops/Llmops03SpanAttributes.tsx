import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Llmops03SpanAttributes.css";

// Every value below is made up for the exercise. The sorting rule is the one `OtelTracer` and
// `SpanCallbackHandler` follow in capstone/src/askpep/telemetry/otel.py.

type Bin = "keep" | "mask" | "off";
type Item = { id: string; key: string; value: string; answer: Bin; why: string };

const BINS: { id: Bin; label: string }[] = [
  { id: "keep", label: "Keep as it is" },
  { id: "mask", label: "Mask it first" },
  { id: "off", label: "Keep it off" },
];

const BIN_LABEL: Record<Bin, string> = { keep: "Keep as it is", mask: "Mask it first", off: "Keep it off" };

const ITEMS: Item[] = [
  {
    id: "route",
    key: "askpep.route",
    value: "agent",
    answer: "keep",
    why: "It is a name from a short fixed list. It can't hold anything a user typed.",
  },
  {
    id: "tokens",
    key: "gen_ai.usage.input_tokens",
    value: "863",
    answer: "keep",
    why: "It is a count. It says how large the call was and nothing about what it said.",
  },
  {
    id: "model",
    key: "gen_ai.request.model",
    value: "the name of the answer model",
    answer: "keep",
    why: "It is a name that your own settings chose. A user can't change it.",
  },
  {
    id: "type",
    key: "error.type",
    value: "TimeoutError",
    answer: "keep",
    why: "It is the class name of the exception and carries no message.",
  },
  {
    id: "status",
    key: "the status message of a failed span",
    value: "no account for ada@example.com",
    answer: "mask",
    why: "An exception message holds whatever the code put in it. The span keeps it, and `redact_pii` masks the email first while `TRACE_REDACT` is on.",
  },
  {
    id: "query",
    key: "askpep.query",
    value: "What does PEP 572 change?",
    answer: "off",
    why: "A question can hold personal data. The `traces` table already stores it. With `TRACE_REDACT` off, a span would send it to Cloud Trace as typed, so AskPEP never sets this attribute.",
  },
  {
    id: "args",
    key: "the arguments of a search_peps call",
    value: "the query text the model wrote",
    answer: "off",
    why: "The arguments are the user's words, reshaped by the model. The handler records the tool's name and nothing else.",
  },
  {
    id: "answer",
    key: "the answer",
    value: "The walrus operator names a value inside an expression [1].",
    answer: "off",
    why: "An answer quotes the sources and can repeat the question. The `traces` table keeps it. A span has no use for it, because the backend needs sizes and outcomes.",
  },
];

// `code` in the why text is shown with a mono style. Split on backticks.
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} className="w-mono">
            {part}
          </code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export default function Llmops03SpanAttributes({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<Record<string, Bin>>({});
  const [checked, setChecked] = useState(false);

  const answered = ITEMS.every((i) => picks[i.id]);
  const score = ITEMS.filter((i) => picks[i.id] === i.answer).length;

  const check = () => {
    setChecked(true);
    complete(`sorted ${score} of ${ITEMS.length} span attributes the way the code does`);
  };
  const again = () => {
    setPicks({});
    setChecked(false);
  };

  return (
    <div className="w-panel llmops03-span-attributes">
      <p className="llmops03-span-attributes-note">
        Eight things that someone might put on a span. Sort each one into a bin. The values are made up, and one
        value is a typed email address on purpose.
      </p>

      <ul className="llmops03-span-attributes-list">
        {ITEMS.map((item) => {
          const pick = picks[item.id];
          const right = checked && pick === item.answer;
          return (
            <li key={item.id} className={`llmops03-span-attributes-item${checked ? (right ? " right" : " wrong") : ""}`}>
              <div className="llmops03-span-attributes-what">
                <span className="w-label">Attribute</span>
                <span className="w-mono llmops03-span-attributes-key">{item.key}</span>
                <span className="w-label">Value</span>
                <span className="w-inset w-mono llmops03-span-attributes-value">{item.value}</span>
              </div>
              <div className="llmops03-span-attributes-bins" role="radiogroup" aria-label={`Where does ${item.key} go?`}>
                {BINS.map((bin) => (
                  <button
                    key={bin.id}
                    type="button"
                    role="radio"
                    aria-checked={pick === bin.id}
                    disabled={checked}
                    className={`w-chip${pick === bin.id ? " is-on" : ""}`}
                    onClick={() => setPicks((p) => ({ ...p, [item.id]: bin.id }))}
                  >
                    {bin.label}
                  </button>
                ))}
              </div>
              {checked && (
                <p className="llmops03-span-attributes-why" role="status">
                  <span className={`w-chip ${right ? "good" : "bad"}`}>{right ? "Right" : `Not quite. ${BIN_LABEL[item.answer]}`}</span>{" "}
                  <Rich text={item.why} />
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="w-row">
        {!checked && (
          <button type="button" className="w-btn primary" disabled={!answered} onClick={check}>
            Check my sorting
          </button>
        )}
        {checked && (
          <button type="button" className="w-btn ghost" onClick={again}>
            Sort them again
          </button>
        )}
      </div>

      {checked && (
        <div className={`w-verdict ${score === ITEMS.length ? "good" : "bad"}`} role="status">
          You matched the code on {score} of {ITEMS.length}. The rule behind all of them is short. A span holds sizes,
          names, counts and outcomes. Text that a user typed stays in the <code className="w-mono">traces</code> table.
          Text that the code builds can still carry what a user typed, so it is masked before it leaves the process.
        </div>
      )}
    </div>
  );
}
