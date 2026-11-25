import { useState, type ReactNode } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Architecture05CacheKey.css";

type Call = "hit" | "miss";

type Case = { id: string; text: string; answer: Call; stale?: boolean; why: string };

// Each case is one change to the world, followed by the same question asked again.
const CASES: Case[] = [
  {
    id: "k1",
    text: "Someone asks `What is PEP 8?` and the answer is stored. A minute later another person asks `what is  pep 8?` with a double space and no capitals. Nothing else has changed.",
    answer: "hit",
    why: "The key folds the case and collapses the white space before it hashes. Both spellings give one key.",
  },
  {
    id: "k2",
    text: "An ingest changes the text of one PEP. The PEP 8 document is untouched. Then someone asks `What is PEP 8?` again.",
    answer: "miss",
    why: "The corpus version fingerprints the whole corpus. One changed document gives a new version, so every question gets a new key.",
  },
  {
    id: "k3",
    text: "A deploy changes `top_k` from 6 to 8, so retrieval now returns more chunks. Someone asks `What is PEP 8?` again.",
    answer: "miss",
    why: "`top_k` is one of the 17 settings in the key. A new value is a new key, so the old answer isn't found.",
  },
  {
    id: "k4",
    text: "A deploy adds a guard stage to `guard_stages`. Someone asks `What is PEP 8?` again.",
    answer: "miss",
    why: "A hit skips the output guards. That is safe only because `guard_stages` is in the key, so an answer that never met the new guard is never served.",
  },
  {
    id: "k5",
    text: "You edit the system prompt so answers get shorter, and deploy it. Someone asks `What is PEP 8?` again. Assume the stored answers survived the deploy.",
    answer: "hit",
    stale: true,
    why: "No prompt version is in the key, so the old answer is found. It was written by the old prompt. This is the gap. Add a prompt version before the cache outlives a deploy.",
  },
  {
    id: "k6",
    text: "The server restarts. The cache is the in-memory cache. Someone asks `What is PEP 8?` again.",
    answer: "miss",
    why: "The entries live in the process, so a restart empties them. The same restart is why the prompt gap stays hidden today.",
  },
  {
    id: "k7",
    text: "Nothing changes for 90 minutes. The time limit is the default of 3600 seconds. Someone asks `What is PEP 8?` again.",
    answer: "miss",
    why: "The answer was stored 5400 seconds ago, which is over the 3600 second limit. The entry expired, and a hit never restarts its time.",
  },
  {
    id: "k8",
    text: "A user with the role `viewer` asked `What is PEP 8?` ten minutes ago. Now a user with the role `admin` asks it. AskPEP passes no scope.",
    answer: "hit",
    why: "The scope is empty for every caller, so they share one key. That is fine for public PEP text. It would leak a role's answers if the corpus held private documents.",
  },
];

// Wraps each backtick segment in a code element.
function ticks(text: string): ReactNode[] {
  return text.split("`").map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : <span key={i}>{part}</span>));
}

export default function Architecture05CacheKey({ onComplete }: WidgetProps) {
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState<Call | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const complete = useComplete(onComplete);

  const c = CASES[idx];
  const last = idx === CASES.length - 1;
  const right = pick !== null && pick === c.answer;

  const choose = (call: Call) => {
    if (pick !== null) return;
    setPick(call);
    if (call === c.answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (last) {
      setDone(true);
      complete(`${score} of ${CASES.length} predicted`);
      return;
    }
    setIdx((i) => i + 1);
    setPick(null);
  };

  const restart = () => {
    setIdx(0);
    setPick(null);
    setScore(0);
    setDone(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel architecture05-cache-key">
        <p className="architecture05-cache-key-note">Predict the next request. Illustrative figures.</p>
        {!done ? (
          <>
            <div className="w-row between">
              <span className="w-chip">
                Case {idx + 1} of {CASES.length}
              </span>
              <span className="architecture05-cache-key-score">
                {score} predicted so far
              </span>
            </div>
            <p className="architecture05-cache-key-text">{ticks(c.text)}</p>
            <div className="w-row" role="group" aria-label="Your prediction">
              {(["hit", "miss"] as Call[]).map((call) => (
                <button
                  key={call}
                  type="button"
                  className={`w-btn ghost architecture05-cache-key-btn${pick === call ? " picked" : ""}`}
                  aria-pressed={pick === call}
                  disabled={pick !== null}
                  onClick={() => choose(call)}
                >
                  {call === "hit" ? "A hit" : "A miss"}
                </button>
              ))}
            </div>
            {pick !== null && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`w-verdict ${right ? "good" : "bad"}`}
                role="status"
              >
                <strong>{right ? "Right. " : "Not quite. "}</strong>
                It is {c.answer === "hit" ? "a hit" : "a miss"}
                {c.stale ? ", and the answer is stale" : ""}. {ticks(c.why)}
              </motion.div>
            )}
            <div className="w-row">
              <button type="button" className="w-btn primary" disabled={pick === null} onClick={next}>
                {last ? "See my score" : "Next case"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={`w-verdict ${score >= 6 ? "good" : "bad"}`} role="status">
              You predicted {score} of {CASES.length}. A key must hold everything that can change an answer, and the key says nothing about a prompt edit. The cache returns a stale hit until the process restarts or the time limit passes.
            </div>
            <div className="w-row">
              <button type="button" className="w-btn ghost" onClick={restart}>
                Start again
              </button>
            </div>
          </>
        )}
      </div>
    </MotionConfig>
  );
}
