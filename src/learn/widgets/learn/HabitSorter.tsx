import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "./useComplete";
import "./HabitSorter.css";

type Side = "novice" | "expert";
type Card = { id: string; habit: string; side: Side; why: string; fix?: string };

const CARDS: Card[] = [
  { id: "highlight", habit: "Highlight the key lines, then reread the highlights the night before.", side: "novice", why: "Rereading makes text familiar, and familiar feels like known. Reviews of the research rate highlighting and rereading as low value.", fix: "Close the page and write what you remember. Then check it." },
  { id: "recall", habit: "Close the book and write down everything you remember, then check what you missed.", side: "expert", why: "Pulling from memory is the practice that builds memory. The check shows you the gaps." },
  { id: "massed", habit: "Study one topic in a single long session until it feels finished.", side: "novice", why: "Feeling finished is the fluency talking. Memory decays, and one session gives it a single starting point.", fix: "Split it into three short sessions across a week." },
  { id: "mix", habit: "Mix problem types in one session so you must choose the method each time.", side: "expert", why: "Choosing the method is half the skill. Blocked practice hides that choice from you." },
  { id: "tutorial", habit: "Watch the tutorial at one and a half speed and type along with the author.", side: "novice", why: "Typing along is copying. Your model never has to predict the next step.", fix: "Pause before each step and say what the author will do next." },
  { id: "predict", habit: "Predict what the code prints, then run it.", side: "expert", why: "A wrong prediction is a precise error signal. It tells you which rule your model lacks." },
  { id: "explain", habit: "Explain the idea aloud with no notes and mark where you stall.", side: "expert", why: "Stalls are the edge of your understanding, shown without any guessing." },
  { id: "solution", habit: "Read the finished solution, nod, and move on.", side: "novice", why: "Nodding is recognition. Recognition is far easier than producing the thing yourself.", fix: "Hide the solution. Build it yourself, then compare." },
];

export default function HabitSorter({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [placed, setPlaced] = useState<{ card: Card; choice: Side }[]>([]);
  const [feedback, setFeedback] = useState<{ ok: boolean; card: Card } | null>(null);
  const [worst, setWorst] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const card = CARDS[idx];
  const sortingDone = idx >= CARDS.length;
  const score = placed.filter((p) => p.card.side === p.choice).length;
  const novices = CARDS.filter((c) => c.side === "novice");

  function choose(choice: Side) {
    if (!card || feedback) return;
    const ok = card.side === choice;
    setPlaced((p) => [...p, { card, choice }]);
    setFeedback({ ok, card });
  }

  function advance() {
    setFeedback(null);
    setIdx((i) => i + 1);
  }

  function judge() {
    const pick = novices.find((c) => c.id === worst);
    if (!pick) return;
    const tone = score >= 7 ? "good" : "bad";
    const text =
      `${score} of ${CARDS.length} sorted correctly. ` +
      (score >= 7
        ? "You can spot the habits. Spotting them in yourself is harder, so act on the one you picked. "
        : "Several habits fooled you, and they fool most people because they feel productive. Treat that feeling as the warning. ") +
      `Your swap: ${pick.fix}`;
    setVerdict({ tone, text });
    complete(`${score}/${CARDS.length} sorted; worst habit: ${pick.id}`);
  }

  const noviceBin = placed.filter((p) => p.choice === "novice");
  const expertBin = placed.filter((p) => p.choice === "expert");

  return (
    <div className="w-panel habit-sorter">
      {!sortingDone && card && (
        <>
          <div className="habit-sorter-progress" aria-hidden="true">
            {CARDS.map((c, i) => (
              <span key={c.id} className={"habit-sorter-dot" + (i < idx ? " is-done" : i === idx ? " is-now" : "")} />
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={card.id}
              className="habit-sorter-card"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
            >
              <p className="habit-sorter-habit">{card.habit}</p>
            </motion.div>
          </AnimatePresence>
          {!feedback ? (
            <div className="habit-sorter-choices">
              <button type="button" className="w-btn habit-sorter-novice" onClick={() => choose("novice")}>Novice habit</button>
              <button type="button" className="w-btn habit-sorter-expert" onClick={() => choose("expert")}>Expert habit</button>
            </div>
          ) : (
            <motion.div
              className={"habit-sorter-fb " + (feedback.ok ? "is-right" : "is-wrong")}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              role="status"
            >
              <p>
                <strong>{feedback.ok ? "Right. " : "Not this one. "}</strong>
                It is an {feedback.card.side} habit. {feedback.card.why}
              </p>
              <button type="button" className="w-btn primary" onClick={advance}>
                {idx === CARDS.length - 1 ? "Finish sorting" : "Next card"}
              </button>
            </motion.div>
          )}
        </>
      )}

      <div className="habit-sorter-bins">
        <div className="habit-sorter-bin">
          <h4>Novice ({noviceBin.length})</h4>
          <ul>
            <AnimatePresence initial={false}>
              {noviceBin.map((p) => (
                <motion.li
                  key={p.card.id}
                  initial={reduce ? false : { opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={p.card.side === "novice" ? "is-right" : "is-wrong"}
                >
                  {p.card.habit}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
        <div className="habit-sorter-bin">
          <h4>Expert ({expertBin.length})</h4>
          <ul>
            <AnimatePresence initial={false}>
              {expertBin.map((p) => (
                <motion.li
                  key={p.card.id}
                  initial={reduce ? false : { opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={p.card.side === "expert" ? "is-right" : "is-wrong"}
                >
                  {p.card.habit}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      </div>

      {sortingDone && !verdict && (
        <div className="habit-sorter-pick">
          <p id="habit-sorter-pick-q"><strong>Be honest. Which novice habit do you actually use most?</strong></p>
          <div role="radiogroup" aria-labelledby="habit-sorter-pick-q" className="habit-sorter-radios">
            {novices.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={worst === c.id}
                className={"habit-sorter-radio" + (worst === c.id ? " is-picked" : "")}
                onClick={() => setWorst(c.id)}
              >
                {c.habit}
              </button>
            ))}
          </div>
          <button type="button" className="w-btn primary" disabled={!worst} onClick={judge}>Give me the verdict</button>
        </div>
      )}

      {verdict && <div className={"w-verdict " + verdict.tone} role="status">{verdict.text}</div>}
    </div>
  );
}
