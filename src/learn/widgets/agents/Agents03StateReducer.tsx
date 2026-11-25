import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents03StateReducer.css";

type Val = number | string | string[];
type Mode = "overwrite" | "add" | "merge" | "max";
type FieldKey = "sources" | "steps" | "question";

type Write = { who: string; value: Val };

type Field = {
  key: FieldKey;
  hint: string;
  init: Val;
  writes: [Write, Write];
  options: Mode[];
  expected: Val;
  why: Partial<Record<Mode, string>>;
};

const MODE_LABEL: Record<Mode, string> = {
  overwrite: "Overwrite (no reducer)",
  add: "Add or append",
  merge: "Merge without duplicates",
  max: "Keep the largest",
};

// Illustrative desk state. Each key receives two writes, one after the other, from nodes that ran in order.
const FIELDS: Field[] = [
  {
    key: "sources",
    hint: "Passages found so far. Each is written as the PEP number, then the chunk number.",
    init: [],
    writes: [
      { who: "First search returns", value: ["PEP 572 #14", "PEP 572 #15"] },
      { who: "Second search returns", value: ["PEP 572 #15", "PEP 8 #2"] },
    ],
    options: ["overwrite", "add", "merge"],
    expected: ["PEP 572 #14", "PEP 572 #15", "PEP 8 #2"],
    why: {
      overwrite: "The second search replaces the first, so PEP 572 chunk 14 is gone and the answer can no longer cite it.",
      add: "Appending keeps PEP 572 chunk 15 twice. The model then reads two numbers for one passage, and the citations drift.",
    },
  },
  {
    key: "steps",
    hint: "The number of model calls so far. Triage made one, and the researcher made three.",
    init: 0,
    writes: [
      { who: "Triage returns", value: 1 },
      { who: "Researcher returns", value: 3 },
    ],
    options: ["overwrite", "add", "max"],
    expected: 4,
    why: {
      overwrite: "Each write replaces the count. Triage's call is lost, so anything that reads the count sees 3 when the real figure is 4.",
      max: "The largest single write wins, so the count stays at 3 and triage's call is never counted.",
    },
  },
  {
    key: "question",
    hint: "The user's latest question. A follow-up in the same thread writes it again.",
    init: "",
    writes: [
      { who: "First question", value: "What is PEP 572?" },
      { who: "Follow-up", value: "Which Python added it?" },
    ],
    options: ["overwrite", "add"],
    expected: "Which Python added it?",
    why: {
      add: "Adding joins the two questions into one string, so the next node reads a question nobody asked.",
    },
  },
];

function reduce(mode: Mode, old: Val, upd: Val): Val {
  if (mode === "overwrite") return upd;
  if (mode === "max") return Math.max(old as number, upd as number);
  if (mode === "add") {
    if (typeof old === "number") return old + (upd as number);
    if (typeof old === "string") return old + (upd as string);
    return [...old, ...(upd as string[])];
  }
  const out = [...(old as string[])];
  for (const x of upd as string[]) if (!out.includes(x)) out.push(x);
  return out;
}

function show(v: Val): string {
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return `"${v}"`;
  return v.length ? `[${v.map((x) => `"${x}"`).join(", ")}]` : "[]";
}

function same(a: Val, b: Val): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => x === b[i]);
  return a === b;
}

function runField(f: Field, mode: Mode) {
  const after = f.writes.reduce<Val>((acc, w) => reduce(mode, acc, w.value), f.init);
  return { after, ok: same(after, f.expected) };
}

const START: Record<FieldKey, Mode> = { sources: "overwrite", steps: "overwrite", question: "overwrite" };

export default function Agents03StateReducer({ onComplete }: WidgetProps) {
  const [modes, setModes] = useState<Record<FieldKey, Mode>>(START);
  const [guess, setGuess] = useState<Record<FieldKey, boolean>>({ sources: false, steps: false, question: false });
  const [ran, setRan] = useState(false);
  const [runs, setRuns] = useState(0);
  const complete = useComplete(onComplete);

  const results = FIELDS.map((f) => ({ f, ...runField(f, modes[f.key]) }));
  const wrongKeys = results.filter((r) => !r.ok).map((r) => r.f.key);
  const guessKeys = FIELDS.filter((f) => guess[f.key]).map((f) => f.key);
  const exact = wrongKeys.length === guessKeys.length && wrongKeys.every((k) => guessKeys.includes(k));

  const doRun = () => {
    setRan(true);
    setRuns((n) => n + 1);
    // A right prediction completes the widget. Otherwise it completes on the second run, with the reasons shown.
    if (exact || runs >= 1) {
      complete(exact ? `Predicted ${wrongKeys.length} wrong keys correctly` : `Predicted ${guessKeys.length} wrong keys, actual ${wrongKeys.length}`);
    }
  };

  const changed = (fn: () => void) => {
    fn();
    setRan(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel agents03-state-reducer">
        <p className="agents03-state-reducer-note">Illustrative state. Each key below receives two writes, one after the other, and a reducer decides what the key holds afterwards.</p>

        <div className="agents03-state-reducer-fields">
          {FIELDS.map((f) => (
            <div key={f.key} className="agents03-state-reducer-field">
              <div className="agents03-state-reducer-head">
                <span className="w-mono agents03-state-reducer-name">{f.key}</span>
                <span className="agents03-state-reducer-hint">{f.hint}</span>
              </div>
              <div className="agents03-state-reducer-writes w-mono">
                <span>starts {show(f.init)}</span>
                {f.writes.map((w) => (
                  <span key={w.who}>
                    {w.who} {show(w.value)}
                  </span>
                ))}
              </div>
              <label className="agents03-state-reducer-pick">
                <span>Reducer</span>
                <select
                  value={modes[f.key]}
                  onChange={(e) => changed(() => setModes((m) => ({ ...m, [f.key]: e.target.value as Mode })))}
                  aria-label={`Reducer for ${f.key}`}
                >
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {MODE_LABEL[o]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </div>

        <div className="agents03-state-reducer-guess">
          <span className="w-label">Which keys will end wrong with the reducers picked now?</span>
          <div className="w-row">
            {FIELDS.map((f) => (
              <button
                key={f.key}
                type="button"
                className="w-chip"
                aria-pressed={guess[f.key]}
                onClick={() => changed(() => setGuess((g) => ({ ...g, [f.key]: !g[f.key] })))}
              >
                {f.key} ends wrong
              </button>
            ))}
          </div>
          <span className="agents03-state-reducer-note">Leave every chip off if you think all three end right.</span>
        </div>

        <div className="w-row">
          <button type="button" className="w-btn primary" onClick={doRun}>
            Run both writes on every key
          </button>
        </div>

        {ran && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="agents03-state-reducer-result">
            <div className="agents03-state-reducer-table" role="table" aria-label="Final value per key">
              <div className="agents03-state-reducer-tr head" role="row">
                <span role="columnheader">Key</span>
                <span role="columnheader">Holds after both writes</span>
                <span role="columnheader">It should hold</span>
                <span role="columnheader">Verdict</span>
              </div>
              {results.map((r) => (
                <div key={r.f.key} className={`agents03-state-reducer-tr ${r.ok ? "ok" : "bad"}`} role="row">
                  <span role="cell" className="w-mono">{r.f.key}</span>
                  <span role="cell" className="w-mono">{show(r.after)}</span>
                  <span role="cell" className="w-mono">{show(r.f.expected)}</span>
                  <span role="cell">{r.ok ? "Right" : "Wrong"}</span>
                </div>
              ))}
            </div>
            <div className={`w-verdict ${exact ? "good" : "bad"}`} role="status">
              <strong>{exact ? "Your prediction was right." : "Your prediction was off."}</strong>{" "}
              {wrongKeys.length === 0
                ? "All three keys end right. Each rule matches what the key means: passages merge without duplicates, a counter adds, and a question is replaced by the latest one."
                : `${wrongKeys.length} of 3 keys end wrong. ${results
                    .filter((r) => !r.ok)
                    .map((r) => `${r.f.key}: ${r.f.why[modes[r.f.key]] ?? "This reducer does not match what the key means."}`)
                    .join(" ")} Pick another reducer, then run again.`}
            </div>
          </motion.div>
        )}
      </div>
    </MotionConfig>
  );
}
