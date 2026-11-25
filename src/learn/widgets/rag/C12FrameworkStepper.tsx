import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { useOnce } from "./c1012shared";
import "./C12FrameworkStepper.css";

type Q = "strong" | "ok" | "weak";
type Opt = { q: Q; text: string; react: string; mins: number };
type Step = { name: string; ideal: number; ask: string; listens: string; opts: Opt[] };

const STEPS: Step[] = [
  {
    name: "Clarify",
    ideal: 5,
    ask: "Build an internal assistant over our company documents. Go ahead.",
    listens: "Whether your questions would change the design.",
    opts: [
      { q: "weak", mins: 9, text: "I'd use a vector database with embeddings and an LLM. Which cloud are you on?", react: "You started with technology. I still do not know who this is for." },
      { q: "strong", mins: 5, text: "Before I draw: do people have different access to documents, and where does that truth live? What does a wrong answer cost? How fresh must answers be? I'll assume the rest and say so.", react: "Good. Permissions and cost of error fork the design, and you stated your assumptions." },
      { q: "ok", mins: 6, text: "How many users and documents are there, and which file types?", react: "Useful, but you have not asked about permissions or the cost of a wrong answer yet." },
    ],
  },
  {
    name: "Size",
    ideal: 5,
    ask: "Say 5,000 employees. How big is this system?",
    listens: "Arithmetic, and a conclusion drawn from it.",
    opts: [
      { q: "ok", mins: 6, text: "Maybe a few thousand queries a day and a lot of documents. We should plan for scale.", react: "That is a guess with no sum behind it, and it draws no design consequence." },
      { q: "weak", mins: 9, text: "At 5,000 users we need a sharded, multi-region cluster with autoscaling.", react: "You designed for scale the numbers do not show. Where did that come from?" },
      { q: "strong", mins: 5, text: "About a thousand daily users at five questions is 5,000 a day, under two queries per second at peak. A couple of million chunks is single-digit gigabytes. So scale is modest, and the hard parts are permissions, freshness and quality.", react: "That is what I wanted. You turned the numbers into a priority." },
    ],
  },
  {
    name: "Sketch",
    ideal: 10,
    ask: "Show me the system.",
    listens: "A complete happy path with both flows and permissions.",
    opts: [
      { q: "ok", mins: 11, text: "Documents go into a vector database. The question goes in, the top chunks go to the LLM, and it answers.", react: "It works as a demo. Where are permissions, keyword search, citations and deletion?" },
      { q: "weak", mins: 14, text: "I'd use a framework with an agent that chooses its own tools and a memory layer.", react: "That is a list of parts, and I cannot see the data flow. Why an agent for a lookup assistant?" },
      { q: "strong", mins: 10, text: "Two paths meeting at an index. Indexing: connectors, parse, chunk with allowed-group metadata, embed, store. A separate permission sync. Query: authenticate, resolve groups, hybrid retrieval with a permission filter, rerank, prompt with citations, stream. Tracing and a deletion path across both.", react: "Complete and coherent. I can see where each risk lives." },
    ],
  },
  {
    name: "Deep-dive",
    ideal: 15,
    ask: "Where is the riskiest part, and how would you handle it?",
    listens: "Depth in the right place, with a stated trade-off.",
    opts: [
      { q: "ok", mins: 16, text: "Retrieval quality. I'd tune chunk size and add a reranker.", react: "Sensible, but a quality miss is annoying and a permission leak is a breach. Which is riskier?" },
      { q: "weak", mins: 17, text: "The prompt. I'd tell the model not to reveal documents the user cannot access.", react: "That puts the control where the model can be talked out of it." },
      { q: "strong", mins: 15, text: "Permissions. Allowed groups on every chunk, filtered inside the search before the top k is chosen, a separate fast permission sync, and cache keys scoped by group set. The cost is more metadata and a recall test per group size. I'd revisit if group counts exploded.", react: "Choice, reason, cost, and when it changes. That is the shape I look for." },
    ],
  },
  {
    name: "Evaluate",
    ideal: 5,
    ask: "How do you know it works?",
    listens: "A golden set, named metrics, and a trigger to run them.",
    opts: [
      { q: "weak", mins: 8, text: "We'll test it manually and fix whatever people complain about.", react: "That is waiting to be told you are wrong." },
      { q: "strong", mins: 5, text: "A golden set of real questions, around 150 to 200 from the help desk, each with its answering chunks. Recall at k and faithfulness reported separately, plus permission tests, run on every index, prompt or model change.", react: "Source, size, metrics, trigger. I would hire that." },
      { q: "ok", mins: 6, text: "We'd run some sample questions and ask users to rate the answers.", react: "Better than nothing, but I cannot tell retrieval from generation failures with ratings alone." },
    ],
  },
  {
    name: "Operate",
    ideal: 5,
    ask: "It is live. What do you do now?",
    listens: "That you have run something past launch.",
    opts: [
      { q: "ok", mins: 6, text: "We'd monitor uptime and latency.", react: "A start. What would tell you answers are getting worse while the system stays up?" },
      { q: "weak", mins: 7, text: "Once it's launched, maintenance is an IT matter.", react: "Indexes drift, permissions change and models update. Someone owns that." },
      { q: "strong", mins: 5, text: "Pilot with one department first. Alerts on p95 latency, freshness and failed permission tests. Sampled traces feed the golden set. A kill switch falls back to keyword search if the model provider is down. Token caps control cost.", react: "That is a real operations plan. Thank you." },
    ],
  },
];

const PTS: Record<Q, number> = { strong: 2, ok: 1, weak: 0 };

export default function C12FrameworkStepper({ onComplete }: WidgetProps) {
  const reduce = useReducedMotion();
  const complete = useOnce(onComplete);
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<(number | null)[]>(() => STEPS.map(() => null));
  const [done, setDone] = useState(false);

  const step = STEPS[idx];
  const pick = picks[idx];
  const used = picks.reduce<number>((a, p, i) => a + (p === null ? 0 : STEPS[i].opts[p].mins), 0);
  const score = picks.reduce<number>((a, p, i) => a + (p === null ? 0 : PTS[STEPS[i].opts[p].q]), 0);
  const max = STEPS.length * 2;

  function choose(n: number) {
    if (pick !== null) return;
    const next = [...picks];
    next[idx] = n;
    setPicks(next);
  }
  function advance() {
    if (idx < STEPS.length - 1) setIdx(idx + 1);
    else {
      setDone(true);
      const s = picks.reduce<number>((a, p, i) => a + (p === null ? 0 : PTS[STEPS[i].opts[p].q]), 0);
      complete(`Scored ${s} of ${max} across the six moves.`);
    }
  }

  const bar = (
    <div className="c12fs-clock" aria-label={`Interview clock: ${used} of 45 minutes used`}>
      <svg viewBox="0 0 300 18" className="c12fs-svg" aria-hidden="true">
        <rect x="0" y="4" width="300" height="10" rx="5" className="c12fs-bg" />
        <motion.rect x="0" y="4" height="10" rx="5" className={used > 45 ? "c12fs-over" : "c12fs-fill"} initial={false} animate={{ width: Math.min(300, (used / 45) * 300) }} transition={reduce ? { duration: 0 } : { duration: 0.3 }} />
      </svg>
      <span className={"c12fs-mins" + (used > 45 ? " over" : "")}>
        {used} of 45 min
      </span>
    </div>
  );

  if (done) {
    const weakest = STEPS.map((s, i) => ({ s, pts: PTS[s.opts[picks[i]!].q] })).sort((a, b) => a.pts - b.pts)[0];
    return (
      <div className="w-panel c12fs-root">
        {bar}
        <p className={"w-verdict " + (score >= 10 && used <= 45 ? "good" : "bad")} role="status">
          Score {score} of {max}, using {used} of 45 minutes.{" "}
          {score === max && used <= 45
            ? "A clean run. Every move was strong and the clock held."
            : `Your weakest move was ${weakest.s.name}. ${used > 45 ? "You also overran the clock, which is what happens when early moves are vague." : ""} Replay it and aim for the choice, reason, cost, revisit form.`}
        </p>
        <button type="button" className="w-btn ghost" onClick={() => { setPicks(STEPS.map(() => null)); setIdx(0); setDone(false); }}>
          Replay
        </button>
      </div>
    );
  }

  return (
    <div className="w-panel c12fs-root">
      <ol className="c12fs-steps" aria-label="Framework progress">
        {STEPS.map((s, i) => (
          <li key={s.name} className={"c12fs-pill" + (i === idx ? " cur" : "") + (picks[i] !== null ? " done" : "")} aria-current={i === idx ? "step" : undefined}>
            <span className="c12fs-n">{i + 1}</span>
            <span className="c12fs-pn">{s.name}</span>
          </li>
        ))}
      </ol>
      {bar}

      <motion.div key={idx} className="c12fs-ask" initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <svg viewBox="0 0 32 32" className="c12fs-av" aria-hidden="true">
          <circle cx="16" cy="16" r="15" className="c12fs-avbg" />
          <circle cx="16" cy="13" r="5" className="c12fs-avfg" />
          <path d="M6 27c1-6 5-8 10-8s9 2 10 8" className="c12fs-avfg" />
        </svg>
        <div>
          <p className="c12fs-who">Interviewer, step {idx + 1}: {step.name}</p>
          <p className="c12fs-say">{step.ask}</p>
        </div>
      </motion.div>

      <fieldset className="c12fs-fs">
        <legend>What do you say?</legend>
        {step.opts.map((o, n) => (
          <button
            key={n}
            type="button"
            disabled={pick !== null}
            aria-pressed={pick === n}
            className={"c12fs-opt" + (pick === n ? " picked " + o.q : "") + (pick !== null && pick !== n && o.q === "strong" ? " best" : "")}
            onClick={() => choose(n)}
          >
            {o.text}
          </button>
        ))}
      </fieldset>

      {pick !== null && (
        <motion.div className="c12fs-fb" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
          <p className={"w-verdict " + (step.opts[pick].q === "strong" ? "good" : "bad")} role="status">
            {step.opts[pick].react}
          </p>
          <p className="c12fs-listens">The interviewer is listening for: {step.listens} The dashed option was the strongest.</p>
          <button type="button" className="w-btn primary" onClick={advance}>
            {idx < STEPS.length - 1 ? `Next move: ${STEPS[idx + 1].name}` : "See my result"}
          </button>
        </motion.div>
      )}
    </div>
  );
}
