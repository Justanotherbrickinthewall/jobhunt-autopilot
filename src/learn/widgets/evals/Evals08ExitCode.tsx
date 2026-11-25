import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Evals08ExitCode.css";

type Code = 0 | 1 | 2 | 3;
type Case = { title: string; what: string; code: Code; report: boolean; why: string };

// The order and the catch list follow the eval gate command in askpep/cli.py.
const CASES: Case[] = [
  {
    title: "Every slice meets its limit",
    what: "All five slices pass. The command prints the report.",
    code: 0,
    report: true,
    why: "Exit 0 means every slice passed. The report also goes to stdout.",
  },
  {
    title: "The action slice is under its floor",
    what: "The action slice is at 0.75 against a floor of 0.80. The other four pass.",
    code: 1,
    report: true,
    why: "Exit 1 means the gate ran, decided and said no. The action entry in the report holds the reason.",
  },
  {
    title: "A baseline file that is not there",
    what: "You pass --baseline evals/baselines/old.json, and the file does not exist.",
    code: 2,
    report: false,
    why: "A missing file is an OSError, which the command counts as bad input. It exits 2 and writes no report, because no slice was judged.",
  },
  {
    title: "A provider rejects the call",
    what: "A call to Voyage fails while the retrieval slice runs, and the error reaches the command as a ProviderError.",
    code: 2,
    report: false,
    why: "A provider error is an input problem for the gate, because nothing was wrong with the change. It exits 2 with the message on stderr and no report.",
  },
  {
    title: "A bug in your own code",
    what: "run_gate raises an AttributeError, because a variable is None where you expected an object.",
    code: 3,
    report: false,
    why: "AttributeError is not one of the four expected errors. Python alone would exit 1 for an uncaught error, which reads as a failed slice. The command catches it, prints the type and exits 3.",
  },
  {
    title: "Too many attacks get through",
    what: "Two of 25 attacks succeed, a rate of 0.08 against a ceiling of 0.05.",
    code: 1,
    report: true,
    why: "A ceiling that is crossed fails the slice, so the exit code is 1.",
  },
];

const CHOICES: Code[] = [0, 1, 2, 3];

export default function Evals08ExitCode({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picks, setPicks] = useState<(Code | null)[]>(CASES.map(() => null));

  const pick = (i: number, said: Code) => {
    if (picks[i] !== null) return;
    const next = picks.map((p, j) => (j === i ? said : p));
    setPicks(next);
    if (next.every((p) => p !== null)) {
      const right = next.filter((p, j) => p === CASES[j].code).length;
      complete(`${right} of ${CASES.length} exit codes predicted`);
    }
  };

  const answered = picks.filter((p) => p !== null).length;

  return (
    <div className="w-panel evals08-exit-code">
      <p className="evals08-exit-code-hint">
        Each card is one run of <span className="w-mono">askpep eval gate</span>. Pick the exit code. {answered} of {CASES.length} answered.
      </p>
      {CASES.map((c, i) => {
        const picked = picks[i];
        const done = picked !== null;
        return (
          <section key={c.title} className="evals08-exit-code-card" aria-label={`Run ${i + 1}: ${c.title}`}>
            <h4 className="evals08-exit-code-title">{c.title}</h4>
            <p className="evals08-exit-code-what">{c.what}</p>
            <div className="evals08-exit-code-choices" role="radiogroup" aria-label="Exit code">
              {CHOICES.map((code) => (
                <button
                  key={code}
                  type="button"
                  role="radio"
                  aria-checked={picked === code}
                  disabled={done}
                  className={`w-chip w-mono evals08-exit-code-choice${picked === code ? " on" : ""}${done && code === c.code ? " right" : ""}`}
                  onClick={() => pick(i, code)}
                >
                  Exit {code}
                </button>
              ))}
            </div>
            {done && (
              <p className={`evals08-exit-code-why ${picked === c.code ? "ok" : "miss"}`} role="status">
                <strong>{picked === c.code ? "Correct. " : `Missed. The exit code is ${c.code}. `}</strong>
                {c.why} {c.report ? "A report file is written." : "No report file is written."}
              </p>
            )}
          </section>
        );
      })}
      {answered === CASES.length && (
        <div className="w-verdict good" role="status">
          CI treats every non-zero code as a red build, and the code tells you where to look. Exit 1 sends you to the report, exit 2 to your inputs and your keys, and exit 3 to your own code.
        </div>
      )}
    </div>
  );
}
