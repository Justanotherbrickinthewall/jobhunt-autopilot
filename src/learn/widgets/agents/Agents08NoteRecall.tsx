import { useEffect, useMemo, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents08NoteRecall.css";

// A small Store. Each user has a namespace, and each note has the text and the time it was saved.
type Note = { text: string; created: string };
type Notes = Record<string, Note[]>;

const SEED: Notes = {
  alice: [
    { text: "I use Python 3.9 at work", created: "2026-10-01T09:00:00Z" },
    { text: "I like the walrus operator", created: "2026-10-03T09:00:00Z" },
    { text: "My team prefers type hints", created: "2026-10-05T09:00:00Z" },
    { text: "I use Python 3.12 at home", created: "2026-10-08T09:00:00Z" },
  ],
  bob: [
    { text: "I only read Final PEPs", created: "2026-10-02T09:00:00Z" },
    { text: "I use Python 3.13 on my laptop", created: "2026-10-06T09:00:00Z" },
  ],
};

const USERS = ["alice", "bob"];
const PROMPT = "You are the PEP researcher.";
const LIMIT = 3;
const QUESTIONS = ["Which Python version do I use?", "What does the walrus operator do?", "Explain decorators"];
const MESSAGES = ["Remember that I prefer short answers", "please remember: I LIKE the walrus  operator"];
const REMEMBER = /^\s*(?:please\s+)?remember(?:\s+that)?[\s:,]+(.+?)\s*$/is;

// The same word splitter as the keyword search in course 1: lower case, then runs of letters and digits.
const tokenize = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
const collapse = (text: string) => text.split(/\s+/).filter(Boolean).join(" ");

type Scored = Note & { overlap: number };

// A mirror of recall: shared words first, then the newer note. Notes with no shared word are left out.
function recall(notes: Note[], query: string): Scored[] {
  const wanted = new Set(tokenize(query));
  return notes
    .map((n) => ({ ...n, overlap: new Set(tokenize(n.text).filter((w) => wanted.has(w))).size }))
    .filter((n) => n.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || (a.created < b.created ? 1 : a.created > b.created ? -1 : 0));
}

function Highlight({ text, query }: { text: string; query: string }) {
  const wanted = new Set(tokenize(query));
  return (
    <>
      {text.split(/([^\p{L}\p{N}]+)/u).map((part, i) => (wanted.has(part.toLowerCase()) ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>))}
    </>
  );
}

type Sent = { kind: "ignored" } | { kind: "saved" | "repeat"; text: string; key: string };

export default function Agents08NoteRecall({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [store, setStore] = useState<Notes>(SEED);
  const [user, setUser] = useState("alice");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<Sent | null>(null);
  const [switched, setSwitched] = useState(false);
  const [found, setFound] = useState({ recalled: false, apart: false, repeat: false });

  const mine = store[user];
  const ranked = useMemo(() => recall(mine, query), [mine, query]);
  const top = ranked.slice(0, LIMIT);
  const textsA = recall(store.alice, query).slice(0, LIMIT).map((n) => n.text).join("|");
  const textsB = recall(store.bob, query).slice(0, LIMIT).map((n) => n.text).join("|");

  const prompt = top.length > 0 ? `${PROMPT}\n\nNotes this user asked you to remember:\n- ${top.map((n) => n.text).join("\n- ")}` : PROMPT;

  useEffect(() => {
    setFound((f) => {
      const recalled = f.recalled || top.length > 0;
      const apart = f.apart || (switched && textsA !== "" && textsB !== "" && textsA !== textsB);
      return recalled === f.recalled && apart === f.apart ? f : { ...f, recalled, apart };
    });
  }, [top.length, textsA, textsB, switched]);

  useEffect(() => {
    if (found.recalled && found.apart && found.repeat) complete("Recalled a note, kept the users apart, and saw a repeat ignored");
  }, [found, complete]);

  const send = () => {
    const match = REMEMBER.exec(message);
    if (!match) {
      setSent({ kind: "ignored" });
      return;
    }
    const text = collapse(match[1]);
    const key = text.toLowerCase();
    if (mine.some((n) => n.text.toLowerCase() === key)) {
      setSent({ kind: "repeat", text, key });
      setFound((f) => ({ ...f, repeat: true }));
      return;
    }
    setStore((s) => ({ ...s, [user]: [...s[user], { text, created: new Date().toISOString() }] }));
    setSent({ kind: "saved", text, key });
  };

  const chooseUser = (u: string) => {
    setUser(u);
    setSent(null);
    if (u !== user) setSwitched(true);
  };

  const matched = new Set(ranked.map((r) => r.text));
  const ordered: Scored[] = [...ranked, ...mine.filter((n) => !matched.has(n.text)).map((n) => ({ ...n, overlap: 0 }))];

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel agents08-note-recall">
        <div className="w-row">
          <span className="w-label">Asking as</span>
          {USERS.map((u) => (
            <button key={u} type="button" className={`w-btn ghost small${user === u ? " is-on" : ""}`} aria-pressed={user === u} onClick={() => chooseUser(u)}>
              {u}
            </button>
          ))}
        </div>

        <div className="agents08-note-recall-block">
          <label className="w-label" htmlFor="agents08-note-recall-question">
            Question
          </label>
          <input id="agents08-note-recall-question" type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a question, or pick one" />
          <div className="w-row">
            {QUESTIONS.map((q) => (
              <button key={q} type="button" className="w-chip" onClick={() => setQuery(q)}>
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="agents08-note-recall-block">
          <span className="w-label">Notes in the namespace for {user}</span>
          <ul className="agents08-note-recall-list">
            {ordered.map((n) => {
              const rank = ranked.findIndex((r) => r.text === n.text);
              const inPrompt = rank >= 0 && rank < LIMIT;
              return (
                <motion.li key={n.text} layout className={`agents08-note-recall-note${inPrompt ? " in" : ""}${n.overlap === 0 ? " out" : ""}`}>
                  <span className="agents08-note-recall-text">
                    <Highlight text={n.text} query={query} />
                  </span>
                  <span className="agents08-note-recall-meta w-mono">{n.created.slice(0, 10)}</span>
                  {query.trim() !== "" && (
                    <span className={`w-chip ${inPrompt ? "good" : n.overlap > 0 ? "warn" : ""}`}>
                      {n.overlap === 0 ? "no shared word" : `${n.overlap} shared${inPrompt ? ", in the prompt" : ", past the limit"}`}
                    </span>
                  )}
                </motion.li>
              );
            })}
          </ul>
          <p className="agents08-note-recall-hint">Words such as I and the count as shared words, because recall has no stop-word list.</p>
        </div>

        <div className="agents08-note-recall-block">
          <span className="w-label">The researcher's system prompt for this call</span>
          <pre className="agents08-note-recall-prompt w-inset w-mono">{prompt}</pre>
        </div>

        <div className="agents08-note-recall-block">
          <label className="w-label" htmlFor="agents08-note-recall-message">
            Send a message as {user}
          </label>
          <input id="agents08-note-recall-message" type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Start with the word remember" />
          <div className="w-row">
            {MESSAGES.map((m) => (
              <button key={m} type="button" className="w-chip" onClick={() => setMessage(m)}>
                {m}
              </button>
            ))}
            <button type="button" className="w-btn small" onClick={send} disabled={message.trim() === ""}>
              Send
            </button>
          </div>
          {sent && (
            <motion.div className={`w-verdict${sent.kind === "ignored" ? "" : " good"}`} role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              {sent.kind === "ignored" && (
                <>
                  <strong>Not a note.</strong> The message does not start with remember, so triage saves nothing.
                </>
              )}
              {sent.kind === "saved" && (
                <>
                  <strong>Saved.</strong> The note is {JSON.stringify(sent.text)}, under the key hash of {JSON.stringify(sent.key)}.
                </>
              )}
              {sent.kind === "repeat" && (
                <>
                  <strong>Already saved.</strong> The key, a hash of {JSON.stringify(sent.key)}, matches an existing note. The write is skipped and the first copy stays.
                </>
              )}
            </motion.div>
          )}
        </div>

        <ul className="agents08-note-recall-goals" aria-label="Things to find">
          <li className={found.recalled ? "done" : ""}>{found.recalled ? "Done:" : "To do:"} ask a question and see a note come back.</li>
          <li className={found.apart ? "done" : ""}>{found.apart ? "Done:" : "To do:"} switch user on the same question and get different notes.</li>
          <li className={found.repeat ? "done" : ""}>{found.repeat ? "Done:" : "To do:"} send the same note twice, in other case or spacing, and see it ignored.</li>
        </ul>
      </div>
    </MotionConfig>
  );
}
