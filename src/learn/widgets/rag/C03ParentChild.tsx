import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { useOnce } from "./c01-03-shared";
import "./C03ParentChild.css";

// Paraphrased from PEP 572. Each parent is a section, each child a sentence inside it.
const PARENTS = [
  { id: "p1", title: "Syntax", kids: [
    { id: "c1", t: "An assignment expression is written NAME := expr." },
    { id: "c2", t: "It binds the name and also gives the value of the expression." },
    { id: "c3", t: "The target must be a plain name, not an attribute or a subscript." },
  ] },
  { id: "p2", title: "Exceptional cases", kids: [
    { id: "c4", t: "At the top level of an expression statement, the bare form is invalid." },
    { id: "c5", t: "Wrap it in parentheses if you really want it there." },
    { id: "c6", t: "As the value of a keyword argument, the unparenthesised form is also invalid." },
  ] },
  { id: "p3", title: "Scope of the target", kids: [
    { id: "c7", t: "Inside a comprehension, the target is bound in the enclosing scope." },
    { id: "c8", t: "The iterable expression of a comprehension may not contain one." },
  ] },
];

type Round = { q: string; match: string; parent: string; need: "parent" | "child"; why: string };
const ROUNDS: Round[] = [
  { q: "Can I write y := f(x) as a bare statement?", match: "c4", parent: "p2", need: "parent", why: "The matched sentence says the bare form is invalid. The fix, parentheses, sits in the next sentence. Child alone gives half an answer." },
  { q: "What can the target of := be?", match: "c3", parent: "p1", need: "child", why: "The matched sentence is the whole answer. Sending the parent adds two sentences the model does not need. Small-to-big costs tokens when the small piece is enough." },
  { q: "What is banned in a comprehension's iterable, and where does the target go?", match: "c8", parent: "p3", need: "parent", why: "The best match answers the first half. The scope rule sits next door. The parent carries both." },
];

const wordsOf = (id: string) => PARENTS.flatMap((p) => p.kids).find((k) => k.id === id)!.t.split(/\s+/).length;
const parentWords = (pid: string) => PARENTS.find((p) => p.id === pid)!.kids.reduce((n, k) => n + k.t.split(/\s+/).length, 0);

export default function C03ParentChild({ onComplete }: WidgetProps) {
  const complete = useOnce(onComplete);
  const reduce = !!useReducedMotion();
  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState<Record<number, "parent" | "child">>({});
  const r = ROUNDS[round];
  const g = guess[round];
  const revealed = g !== undefined;
  const allDone = ROUNDS.every((_, i) => guess[i] !== undefined);
  const right = ROUNDS.filter((x, i) => guess[i] === x.need).length;

  function pick(v: "parent" | "child") {
    if (revealed) return;
    const next = { ...guess, [round]: v };
    setGuess(next);
    if (ROUNDS.every((_, i) => next[i] !== undefined)) {
      complete(`${ROUNDS.filter((x, i) => next[i] === x.need).length} of ${ROUNDS.length} calls right`);
    }
  }

  const cw = wordsOf(r.match);
  const pw = parentWords(r.parent);

  return (
    <div className="w-panel c03-parent-child">
      <p className="c03-parent-child-lede">Search matches single sentences, the children. Pick whether the model can answer from the matched child alone, or needs its whole parent section.</p>
      <div className="c03-parent-child-q">Question {round + 1} of {ROUNDS.length}: {r.q}</div>
      <div className="c03-parent-child-parents">
        {PARENTS.map((p) => (
          <div key={p.id} className={`c03-parent-child-parent${revealed && g === "parent" && p.id === r.parent ? " is-pulled" : ""}`}>
            <h4>{p.title}</h4>
            {p.kids.map((k) => (
              <motion.div key={k.id} className={`c03-parent-child-child${revealed && k.id === r.match ? " is-match" : ""}`} initial={false} animate={{ opacity: revealed && p.id !== r.parent ? 0.45 : 1 }} transition={{ duration: reduce ? 0 : 0.2 }}>
                {k.t}
              </motion.div>
            ))}
          </div>
        ))}
      </div>
      <div className="c03-parent-child-picks" role="group" aria-label="What should the model receive?">
        <button type="button" className={`w-btn${g === "child" ? " primary" : ""}`} disabled={revealed} aria-pressed={g === "child"} onClick={() => pick("child")}>The matched child is enough</button>
        <button type="button" className={`w-btn${g === "parent" ? " primary" : ""}`} disabled={revealed} aria-pressed={g === "parent"} onClick={() => pick("parent")}>It needs the parent</button>
      </div>
      {revealed && (
        <>
          <div className={`w-verdict ${g === r.need ? "good" : "bad"}`} role="status">
            <b>{g === r.need ? "Right. " : "Not quite. "}</b>{r.why}
          </div>
          <div className="c03-parent-child-nums">
            <span>child: about {cw} words</span>
            <span>parent: about {pw} words</span>
          </div>
          <svg className="c03-parent-child-svg" viewBox="0 0 340 44" role="img" aria-label={`Child is ${cw} words, parent is ${pw} words`}>
            <motion.rect x={10} y={4} height={12} rx={4} fill="var(--amber)" initial={false} animate={{ width: (320 * cw) / 40 }} transition={{ duration: reduce ? 0 : 0.3 }} />
            <motion.rect x={10} y={22} height={12} rx={4} fill="var(--accent)" initial={false} animate={{ width: (320 * pw) / 40 }} transition={{ duration: reduce ? 0 : 0.3 }} />
            <text x={10} y={42} className="c03-parent-child-cap">Amber: child sent. Indigo: parent sent. Same scale for both.</text>
          </svg>
        </>
      )}
      <div className="c03-parent-child-picks">
        {revealed && round < ROUNDS.length - 1 && <button type="button" className="w-btn primary" onClick={() => setRound(round + 1)}>Next question</button>}
        {allDone && <div className="w-verdict good" role="status">{right} of {ROUNDS.length} right. The design rule: match on small pieces for precision, then expand when the small piece is only half the answer. It is cheapest when you expand selectively.</div>}
      </div>
    </div>
  );
}
