import { useState } from "react";
import { answerReview } from "../../engine/review.ts";
import { useDeck } from "../../engine/useDeck.ts";
import type { PracticeQuestion } from "./api.ts";

// The phone build's question card: the question, a reveal of the model answer and a self-rating. No grading, no server.
// The rating goes into the Leitner deck of engine/review.ts under bank:<id>, so it is the same store the chapter quizzes use.
export const bankCardId = (id: string) => `bank:${id}`;

// The extra props are the grading ones Bank passes to either card. This one ignores them.
export function PhonePractice({ q }: { q: PracticeQuestion; [ignored: string]: unknown }) {
  const [revealed, setRevealed] = useState(false);
  const deck = useDeck();
  const card = q.id ? deck[bankCardId(q.id)] : undefined;
  return (
    <div className="practice w-panel">
      <div className="w-row">
        {q.category && <span className="w-chip">{q.category}</span>}
        {q.level && <span className={`w-chip ${q.level === "senior" ? "warn" : q.level === "deep" ? "is-on" : ""}`}>{q.level}</span>}
        {q.source === "asked" && <span className="w-chip good">Asked in a real interview</span>}
      </div>
      <h3 className="practice-q">{q.question}</h3>
      {q.idealAnswer && (
        revealed ? (
          <div className="w-inset ideal inner">
            <div className="w-label">Ideal answer</div>
            <p>{q.idealAnswer}</p>
            {q.keywords && q.keywords.length > 0 && <div className="chip-row">{q.keywords.map((k) => <span key={k} className="w-chip">{k}</span>)}</div>}
            {q.id && (
              <div className="w-row" style={{ marginTop: "0.8rem" }}>
                <button type="button" className="btn fill" onClick={() => answerReview(bankCardId(q.id!), true)}>I knew it</button>
                <button type="button" className="btn ghost" onClick={() => answerReview(bankCardId(q.id!), false)}>I missed it</button>
                <span className="muted" style={{ fontSize: "var(--fs-sm)" }}>{card ? `Box ${card.box} of 5` : "Not rated"}</span>
              </div>
            )}
          </div>
        ) : (
          <button type="button" className="btn ghost small" onClick={() => setRevealed(true)}>Reveal ideal answer</button>
        )
      )}
    </div>
  );
}
