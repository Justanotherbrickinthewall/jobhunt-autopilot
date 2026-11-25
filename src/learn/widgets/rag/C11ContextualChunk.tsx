import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { useOnce } from "./c1012shared";
import "./C11ContextualChunk.css";

const QUERY = "Was the walrus operator proposal accepted?";
const STOP = new Set(["was", "the", "a", "of", "is", "it", "to"]);
const terms = (t: string) =>
  Array.from(new Set(t.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w))));
const QTERMS = terms(QUERY);

type Chunk = { id: "A" | "B" | "C"; text: string; ctx: string };
const CHUNKS: Chunk[] = [
  { id: "A", text: "The proposal was accepted after a long discussion. It lands in the next feature release.", ctx: "From PEP 572, which adds assignment expressions written with the colon-equals operator, nicknamed the walrus operator." },
  { id: "B", text: "The proposal was rejected. The authors judged the added syntax too heavy for the benefit.", ctx: "From PEP 3103, a proposal for a switch statement in Python." },
  { id: "C", text: "The proposal was accepted. The module is added as provisional, so its interface may still change.", ctx: "From PEP 484, which introduces type hints." },
];

function score(text: string) {
  const set = new Set(terms(text));
  const hit = QTERMS.filter((q) => set.has(q));
  return { n: hit.length, hit };
}

type Guess = "A" | "B" | "C" | "tie";

export default function C11ContextualChunk({ onComplete }: WidgetProps) {
  const reduce = useReducedMotion();
  const complete = useOnce(onComplete);
  const [guess, setGuess] = useState<Guess | null>(null);
  const [on, setOn] = useState<Record<string, boolean>>({});
  const [verdict, setVerdict] = useState<string | null>(null);

  const rows = useMemo(() => {
    const r = CHUNKS.map((c) => {
      const full = on[c.id] ? c.ctx + " " + c.text : c.text;
      return { c, full, ...score(full) };
    });
    return r.sort((a, b) => b.n - a.n || a.c.id.localeCompare(b.c.id));
  }, [on]);

  const topScore = rows[0].n;
  const leaders = rows.filter((r) => r.n === topScore);
  const tie = leaders.length > 1;
  const allOn = CHUNKS.every((c) => on[c.id]);

  function judge() {
    const guessOk = guess === "tie";
    const text = `${guessOk ? "Your prediction was right: without context, A and C tie, so search cannot tell them apart." : "Without context, chunks A and C tie at the same score, so search cannot tell them apart."} With context prepended, chunk A names the walrus operator and ranks first on its own merit. Cost: one LLM call per chunk at indexing.`;
    setVerdict(text);
    complete(guessOk ? "Predicted the tie and saw context fix it." : "Saw context fix the ranking.");
  }

  return (
    <div className="w-panel c11cc-root">
      <p className="c11cc-q">
        Query: <strong>{QUERY}</strong>
      </p>
      <p className="c11cc-note">
        The scorer is a toy that counts query words found in the chunk, so you can see the effect. Real systems use BM25 and embeddings, and the principle is the same. Chunk text is paraphrased.
      </p>

      <fieldset className="c11cc-fs">
        <legend>Step 1. Without context, which chunk does search rank first?</legend>
        <div className="w-row c11cc-chips">
          {(["A", "B", "C", "tie"] as Guess[]).map((g) => (
            <button
              key={g}
              type="button"
              className={"w-chip c11cc-chip" + (guess === g ? " is-on" : "")}
              aria-pressed={guess === g}
              disabled={guess !== null}
              onClick={() => setGuess(g)}
            >
              {g === "tie" ? "A and C tie, it cannot tell" : `Chunk ${g}`}
            </button>
          ))}
        </div>
        {guess && (
          <p className={"c11cc-fb " + (guess === "tie" ? "ok" : "no")} role="status">
            {guess === "tie"
              ? "Yes. Neither chunk says walrus, so A and C both match only proposal and accepted."
              : "Look at the scores below. A and C both match two query words and neither mentions the walrus operator, so they tie."}
          </p>
        )}
      </fieldset>

      <div className="c11cc-list" role="list" aria-label="Chunks ranked by score">
        {rows.map((r, idx) => (
          <motion.div
            key={r.c.id}
            layout={!reduce}
            transition={{ duration: 0.28, ease: "easeOut" }}
            role="listitem"
            className={"c11cc-card" + (idx === 0 && !tie ? " lead" : "")}
          >
            <div className="c11cc-head">
              <span className="c11cc-id">Chunk {r.c.id}</span>
              <span className="c11cc-score">score {r.n} of {QTERMS.length}</span>
              <label className="c11cc-toggle">
                <input type="checkbox" checked={!!on[r.c.id]} disabled={!guess} onChange={(e) => setOn({ ...on, [r.c.id]: e.target.checked })} />
                prepend context
              </label>
            </div>
            {on[r.c.id] && <p className="c11cc-ctx">{r.c.ctx}</p>}
            <p className="c11cc-text">{r.c.text}</p>
            <p className="c11cc-hits" aria-label="Matched words">
              {QTERMS.map((t) => (
                <span key={t} className={"c11cc-hit" + (r.hit.includes(t) ? " on" : "")}>
                  {t}
                </span>
              ))}
            </p>
          </motion.div>
        ))}
      </div>

      {guess && (
        <p className={"c11cc-status " + (tie ? "no" : "ok")} role="status">
          {tie ? `Tie at the top (${leaders.map((l) => l.c.id).join(" and ")}). A coin flip decides which the model sees first.` : `Clear winner: chunk ${rows[0].c.id}.`}
        </p>
      )}

      {guess && !verdict && (
        <div className="w-row">
          <button type="button" className="w-btn ghost" onClick={() => setOn({ A: true, B: true, C: true })}>
            Prepend context to all
          </button>
          <button type="button" className="w-btn primary" disabled={!allOn} onClick={judge}>
            Judge the result
          </button>
        </div>
      )}
      {verdict && (
        <p className="w-verdict good" role="status">
          {verdict}
        </p>
      )}
    </div>
  );
}
