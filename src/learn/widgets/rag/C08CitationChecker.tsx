import { useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import "./C08CitationChecker.css";

const SOURCES = [
  { n: 1, title: "PEP 572, assignment expressions", text: "An assignment expression is written NAME := expression. It binds the name and evaluates to the value. Unparenthesised assignment expressions are prohibited at the top level of an expression statement." },
  { n: 2, title: "PEP 572, scope", text: "In a comprehension, the target of an assignment expression binds in the containing scope, not inside the comprehension." },
  { n: 3, title: "PEP 8, maximum line length", text: "Limit all lines to a maximum of 79 characters. For docstrings and comments, limit the length to 72 characters." },
];

type Claim = { text: string; supported: boolean; tag: string; why: string };
const CLAIMS: Claim[] = [
  { text: "The walrus operator is written NAME := expression and gives the name a value in the middle of an expression [1].", supported: true, tag: "Supported", why: "Source 1 says exactly this." },
  { text: "PEP 572 was accepted in 2018, and Python's creator, Guido van Rossum, stepped down as the language's leader soon after [1].", supported: false, tag: "True but ungrounded", why: "This is true in the world, but source 1 never says it. Faithfulness asks whether the sources support the claim, not whether the claim is true." },
  { text: "Inside a comprehension, the name is bound in the containing scope [2].", supported: true, tag: "Supported", why: "Source 2 states it directly." },
  { text: "PEP 8 asks for lines of at most 79 characters [3].", supported: true, tag: "Supported", why: "Source 3 states the limit." },
  { text: "Every assignment expression must be wrapped in parentheses [1].", supported: false, tag: "Overclaim", why: "Source 1 only prohibits unparenthesised forms at the top level of an expression statement. Every is stronger than the source." },
  { text: "Docstrings and comments are limited to 72 characters [1].", supported: false, tag: "Wrong source", why: "The fact is real and it is in the sources, but in source 3. A citation checker must test the claim against the cited source, not against all sources." },
];

type Mark = "yes" | "no" | null;

export default function C08CitationChecker({ onComplete }: WidgetProps) {
  const [marks, setMarks] = useState<Mark[]>(CLAIMS.map(() => null));
  const [revealed, setRevealed] = useState(false);
  const done = useRef(false);

  const set = (i: number, m: Mark) => !revealed && setMarks((ms) => ms.map((x, j) => (j === i ? m : x)));
  const ready = marks.every(Boolean);
  const correct = marks.filter((m, i) => m !== null && (m === "yes") === CLAIMS[i].supported).length;

  const reveal = () => {
    setRevealed(true);
    if (!done.current) {
      done.current = true;
      onComplete?.(`${correct} of ${CLAIMS.length} claims judged correctly`);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel c08-cc">
        <p className="c08-cc-hint">Mark each claim as supported or not supported by the source it cites. Judge only what the sources say.</p>
        <div className="c08-cc-sources">
          {SOURCES.map((s) => (
            <div key={s.n} className="c08-cc-source">
              <strong>[{s.n}] {s.title}</strong>
              <span>{s.text}</span>
            </div>
          ))}
        </div>
        <ol className="c08-cc-claims">
          {CLAIMS.map((c, i) => {
            const m = marks[i];
            const right = m !== null && (m === "yes") === c.supported;
            return (
              <li key={c.text} className="c08-cc-claim">
                <p>{c.text}</p>
                <div className="w-row" role="radiogroup" aria-label={`Claim ${i + 1}`}>
                  <button type="button" role="radio" aria-checked={m === "yes"} className={`w-chip c08-cc-opt${m === "yes" ? " on" : ""}`} onClick={() => set(i, "yes")}>Supported</button>
                  <button type="button" role="radio" aria-checked={m === "no"} className={`w-chip c08-cc-opt${m === "no" ? " on" : ""}`} onClick={() => set(i, "no")}>Not supported</button>
                </div>
                <AnimatePresence>
                  {revealed && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`c08-cc-why ${right ? "ok" : "miss"}`}>
                      {right ? "Correct. " : "Missed. "}
                      <strong>{c.tag}.</strong> {c.why}
                    </motion.p>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ol>
        {!revealed && (
          <button type="button" className="w-btn primary" disabled={!ready} onClick={reveal}>
            Reveal the answers
          </button>
        )}
        {revealed && (
          <div className={`w-verdict ${correct >= 5 ? "good" : "bad"}`} role="status">
            You judged {correct} of {CLAIMS.length} correctly. Three failures hide behind a tidy bracket: a true but ungrounded claim, an overclaim and a wrong source. A citation tells you where to look. It does not tell you the claim holds.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
