import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCrumbs } from "../../components/crumbs.ts";
import { LearnHead } from "../components/Head.tsx";
import { Inline } from "../components/Narration.tsx";
import { allQuizzes, getChapter } from "../content/courses.ts";
import { getChapterProgress } from "../engine/progress.ts";
import { optionOrder } from "../engine/optionOrder.ts";
import { answerReview, boxCounts, dueIds, DAY_MS } from "../engine/review.ts";
import { useDeck } from "../engine/useDeck.ts";

export default function ReviewPage() {
  const deck = useDeck();
  const opened = useMemo(() => allQuizzes.filter((q) => getChapterProgress(q.chapterId).opened), []);
  const ids = opened.map((q) => q.id);
  const [queue, setQueue] = useState<string[] | null>(null);
  const [pos, setPos] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [tally, setTally] = useState({ right: 0, wrong: 0 });

  const navigate = useNavigate();
  const phone = import.meta.env.VITE_PHONE === "1";
  useCrumbs(queue
    ? [{ label: "Learn", go: () => navigate("/") }, { label: "Review", go: () => setQueue(null) }, { label: "Due cards" }]
    : [{ label: "Learn", go: () => navigate("/") }, { label: "Review" }]);
  const back = phone && <Link className="back" to="/">Back to Learn</Link>;
  const counts = boxCounts(ids, deck);
  const due = dueIds(ids, deck);
  const nextDue = ids.map((id) => deck[id]?.due).filter((d): d is number => !!d && d > Date.now()).sort((a, b) => a - b)[0];

  if (opened.length === 0) {
    return (
      <>
      <LearnHead title="No cards due" />
      <div className="lrn-body page-narrow fade-in">
        {back}
        <div className="lrn-empty">Your deck is empty. Quiz questions from chapters you open land here, and come back when they are due.<br /><Link to="/">Open a chapter</Link></div>
      </div>
      </>
    );
  }

  const active = queue ? queue[pos] : undefined;
  const ref = active ? allQuizzes.find((q) => q.id === active) : undefined;

  if (!queue) {
    return (
      <>
      <LearnHead title={due.length > 0 ? `${due.length} ${due.length === 1 ? "card" : "cards"} due` : "No cards due"}>
        {due.length > 0 && <button type="button" className="btn fill" onClick={() => { setQueue(due); setPos(0); setChoice(null); setTally({ right: 0, wrong: 0 }); }}>Start review</button>}
      </LearnHead>
      <div className="lrn-body page-narrow fade-in">
        {back}
        <p className="muted">A right answer moves a card up a box, and the next review comes later. A wrong answer sends it back to box 1.</p>
        <div className="boxes">
          {counts.map((n, i) => <div key={i} className="box-cell"><b>{n}</b><span>Box {i + 1}</span></div>)}
        </div>
        {due.length === 0 && <p className="muted">{nextDue ? `The next card is due in ${Math.max(1, Math.round((nextDue - Date.now()) / DAY_MS))} day(s).` : "Open more chapters to add cards."}</p>}
      </div>
      </>
    );
  }

  if (!ref) {
    return (
      <>
      <LearnHead title="Review done">
        {phone && <button type="button" className="btn fill" onClick={() => setQueue(null)}>Back to the deck</button>}
      </LearnHead>
      <div className="lrn-body page-narrow fade-in">
        <div className="w-verdict good">You answered {tally.right} right and {tally.wrong} wrong.</div>
      </div>
      </>
    );
  }

  const q = ref.block;
  const answered = choice !== null;
  const correct = choice === q.answer;
  return (
    <>
    <LearnHead title={`Card ${pos + 1} of ${queue.length}`} sub={`Box ${deck[q.id]?.box ?? 1}`} />
    <div className="lrn-body page-narrow fade-in">
      <div className="quiz review-card" style={{ margin: "1rem 0" }}>
        <p className="quiz-q"><Inline text={q.question} /></p>
        <div className="quiz-opts">
          {optionOrder(q).map((i, pos) => (
            <button
              key={i} type="button" disabled={answered}
              className={`quiz-opt ${answered ? (i === q.answer ? "right" : i === choice ? "wrong" : "") : ""}`}
              onClick={() => {
                setChoice(i);
                answerReview(q.id, i === q.answer);
                setTally((t) => (i === q.answer ? { ...t, right: t.right + 1 } : { ...t, wrong: t.wrong + 1 }));
              }}
            >
              <span className="k">{String.fromCharCode(65 + pos)}</span><span><Inline text={q.options[i]} /></span>
            </button>
          ))}
        </div>
        {answered && (
          <div className={`w-verdict explain ${correct ? "good" : "bad"}`}>
            <strong>{correct ? "Right. " : "Not quite. "}</strong><Inline text={q.explain} />
            <div style={{ marginTop: "0.8rem" }} className="w-row">
              <button type="button" className="btn fill" autoFocus onClick={() => { setPos(pos + 1); setChoice(null); }}>{pos + 1 < queue.length ? "Next card" : "Finish"}</button>
              <Link className="btn ghost small" to={`/chapter/${ref.chapterId}#${ref.sectionId}`}>Re-read in {getChapter(ref.chapterId)?.title}</Link>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
