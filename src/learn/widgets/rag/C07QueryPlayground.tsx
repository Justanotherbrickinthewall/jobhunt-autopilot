import { useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import "./C07QueryPlayground.css";

type Tech = "rewrite" | "multi" | "hyde" | "decompose" | "route";
const TECHS: { id: Tech; label: string }[] = [
  { id: "rewrite", label: "Rewriting" },
  { id: "multi", label: "Multi-query" },
  { id: "hyde", label: "HyDE" },
  { id: "decompose", label: "Decomposition" },
  { id: "route", label: "Routing" },
];

type Scenario = { query: string; best: Tech; out: Record<Tech, string[]>; why: string };

const SCENARIOS: Scenario[] = [
  {
    query: "that thing where you assign a variable inside an if condition",
    best: "rewrite",
    out: {
      rewrite: ["assignment expressions walrus operator := in a condition"],
      multi: ["assign variable inside condition", "walrus operator", "named expression in if statement"],
      hyde: ["Assignment expressions bind a name inside a larger expression, for example in an if condition."],
      decompose: ["What is the syntax?", "Where is it allowed?"],
      route: ["PEP corpus (only one index to choose from)"],
    },
    why: "The wording is colloquial, but the intent is one clear question. A single rewrite into the words the PEPs use is the cheapest fix. Multi-query and HyDE would work and cost more.",
  },
  {
    query: "How did PEP 526 build on PEP 484, and how does PEP 695 change generics?",
    best: "decompose",
    out: {
      rewrite: ["PEP 484 PEP 526 PEP 695 differences generics annotations"],
      multi: ["PEP 526 versus PEP 484 and PEP 695 generics", "type hint history 484 526 695", "how generics syntax changed after variable annotations"],
      hyde: ["PEP 526 extended PEP 484 with variable annotations, and PEP 695 introduced a new generics syntax."],
      decompose: ["What did PEP 484 introduce?", "What did PEP 526 add for variables?", "How does PEP 695 change generic syntax?"],
      route: ["PEP corpus"],
    },
    why: "Three facts live in three PEPs. One query blends them and finds a muddle. Splitting gives each fact its own search, and the answer step joins them.",
  },
  {
    query: "free threading",
    best: "hyde",
    out: {
      rewrite: ["free threaded CPython"],
      multi: ["free threading Python", "threads without a global lock", "parallel threads CPython"],
      hyde: ["Free-threaded CPython builds make the global interpreter lock optional, so threads can run Python code on several cores at once."],
      decompose: ["What is threading?", "What is free?"],
      route: ["PEP corpus"],
    },
    why: "Two words embed thinly. A written-out hypothetical answer lands near the real chunks in embedding space. HyDE fails when the model does not know the domain, so check the answer it invents.",
  },
  {
    query: "How do I annotate types?",
    best: "multi",
    out: {
      rewrite: ["Python type annotations"],
      multi: ["How do I annotate function parameters and return types?", "How do I annotate variables?", "How do I write union and generic types?"],
      hyde: ["You annotate types with a colon after the name and an arrow before the return type."],
      decompose: ["What is a type?", "What is an annotation?"],
      route: ["PEP corpus"],
    },
    why: "The question is broad rather than compound. Five PEPs could answer it. Several phrasings cover more ground, and reciprocal rank fusion from chapter six merges the lists.",
  },
  {
    query: "What did our team decide about adopting the walrus operator in our style guide?",
    best: "route",
    out: {
      rewrite: ["team decision walrus operator style guide"],
      multi: ["walrus operator team policy", "style guide assignment expressions", "our decision on :="],
      hyde: ["Our team decided to allow the walrus operator in simple conditions."],
      decompose: ["What is the walrus operator?", "What is our style guide?"],
      route: ["Send to: internal wiki index. Do not search the PEP corpus."],
    },
    why: "The PEPs cannot know your team's decision. Every other transformation would return PEP 572 with confidence and miss the point. Routing decides where to search, or whether to search at all.",
  },
];

export default function C07QueryPlayground({ onComplete }: WidgetProps) {
  const [picks, setPicks] = useState<(Tech | null)[]>(SCENARIOS.map(() => null));
  const done = useRef(false);

  const choose = (i: number, t: Tech) => {
    if (picks[i]) return;
    const next = picks.map((p, j) => (j === i ? t : p));
    setPicks(next);
    if (next.every(Boolean) && !done.current) {
      done.current = true;
      const score = next.filter((p, j) => p === SCENARIOS[j].best).length;
      onComplete?.(`${score} of ${SCENARIOS.length} transformations matched`);
    }
  };
  const answered = picks.filter(Boolean).length;
  const score = picks.filter((p, j) => p === SCENARIOS[j].best).length;

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel c07-qp">
        <p className="c07-qp-hint">Pick the transformation you would try first. You get one pick per question, so commit before you see the output.</p>
        {SCENARIOS.map((s, i) => {
          const pick = picks[i];
          return (
            <section key={s.query} className="c07-qp-card" aria-label={`Question ${i + 1}`}>
              <p className="c07-qp-query">&ldquo;{s.query}&rdquo;</p>
              <div className="c07-qp-chips" role="group" aria-label="Transformation">
                {TECHS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`w-chip c07-qp-chip${pick === t.id ? " chosen" : ""}${pick && t.id === s.best ? " best" : ""}`}
                    aria-pressed={pick === t.id}
                    disabled={!!pick}
                    onClick={() => choose(i, t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <AnimatePresence>
                {pick && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="c07-qp-out">
                    <p className="c07-qp-label">{TECHS.find((t) => t.id === pick)!.label} produces</p>
                    <ul>
                      {s.out[pick].map((o) => (
                        <li key={o}>{o}</li>
                      ))}
                    </ul>
                    <p className={`w-verdict ${pick === s.best ? "good" : "bad"}`} role="status">
                      {pick === s.best ? "Right choice. " : `The better first move is ${TECHS.find((t) => t.id === s.best)!.label}. `}
                      {s.why}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          );
        })}
        <p className="c07-qp-tally" role="status">
          {answered < SCENARIOS.length ? `${answered} of ${SCENARIOS.length} answered` : `Final: ${score} of ${SCENARIOS.length}. Each transformation was the best answer exactly once. None of them fits every question.`}
        </p>
      </div>
    </MotionConfig>
  );
}
