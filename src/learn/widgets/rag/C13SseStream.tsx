import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import "./C13SseStream.css";

const TOKENS = ["PEP 8 ", "limits ", "lines ", "to 79 ", "characters ", "[1]. ", "Comments ", "get 72 ", "[1]."];
const ANSWER = TOKENS.join("").trim();
const CITATION = { n: 1, title: "PEP 8 > Code Lay-out > Maximum Line Length" };

const RAW =
  TOKENS.map((t) => `event: token\ndata: ${JSON.stringify({ text: t })}\n\n`).join("") +
  `event: done\ndata: ${JSON.stringify({ answer: ANSWER, citations: [CITATION], refused: false })}\n\n`;

const SIZES = [
  { label: "16 characters", value: 16 },
  { label: "48 characters", value: 48 },
  { label: "120 characters", value: 120 },
];

type Guess = "token" | "done" | null;

export default function C13SseStream({ onComplete }: WidgetProps) {
  const [guess, setGuess] = useState<Guess>(null);
  const [size, setSize] = useState(48);
  const [delivered, setDelivered] = useState(0);
  const [playing, setPlaying] = useState(false);
  const fired = useRef(false);

  const finished = delivered >= RAW.length;

  // The same logic as ask() in api.ts: split on a blank line, keep the last piece as the buffer.
  const view = useMemo(() => {
    const text = RAW.slice(0, delivered);
    const pieces = text.split("\n\n");
    const buffer = pieces.pop() ?? "";
    const frames = pieces.map((f) => {
      const event = /^event: (.*)$/m.exec(f)?.[1] ?? "";
      const data = JSON.parse(/^data: (.*)$/m.exec(f)?.[1] ?? "{}");
      return { event, data };
    });
    let answer = "";
    let done = false;
    for (const f of frames) {
      if (f.event === "token") answer += f.data.text;
      if (f.event === "done") {
        answer = f.data.answer;
        done = true;
      }
    }
    return { frames, buffer, answer, done };
  }, [delivered]);

  useEffect(() => {
    if (!playing) return;
    if (finished) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => setDelivered((d) => Math.min(RAW.length, d + size)), 520);
    return () => window.clearTimeout(id);
  }, [playing, delivered, finished, size]);

  useEffect(() => {
    if (finished && guess && !fired.current) {
      fired.current = true;
      onComplete?.(guess === "done" ? "Predicted correctly: chips wait for the done event" : "Predicted wrongly: chips wait for the done event");
    }
  }, [finished, guess, onComplete]);

  const reset = (nextSize = size) => {
    setPlaying(false);
    setDelivered(0);
    setSize(nextSize);
  };

  const parts = view.answer.split(/(\[\d+\])/);

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel c13-sse">
        <fieldset className="c13-sse-guess" disabled={delivered > 0}>
          <legend>Predict first. When does the [1] marker in the answer become a clickable chip?</legend>
          <div className="w-row">
            <button type="button" aria-pressed={guess === "token"} className={`w-chip c13-sse-opt${guess === "token" ? " on" : ""}`} onClick={() => setGuess("token")}>
              As soon as the token carrying it arrives
            </button>
            <button type="button" aria-pressed={guess === "done"} className={`w-chip c13-sse-opt${guess === "done" ? " on" : ""}`} onClick={() => setGuess("done")}>
              Only when the done event arrives
            </button>
          </div>
        </fieldset>

        <div className="w-row c13-sse-controls">
          <label>
            Network read size{" "}
            <select value={size} onChange={(e) => reset(Number(e.target.value))} aria-label="Network read size">
              {SIZES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
          <button type="button" className="w-btn" disabled={!guess || finished} onClick={() => setPlaying((p) => !p)}>
            {playing ? "Pause" : delivered === 0 ? "Start the stream" : "Resume"}
          </button>
          <button type="button" className="w-btn" disabled={!guess || finished || playing} onClick={() => setDelivered((d) => Math.min(RAW.length, d + size))}>
            Deliver one read
          </button>
          <button type="button" className="c13-sse-reset" onClick={() => reset()}>Reset</button>
        </div>

        <div className="c13-sse-grid">
          <section aria-label="Bytes on the wire">
            <h4>On the wire</h4>
            <pre className="c13-sse-wire">
              <span>{RAW.slice(0, delivered - view.buffer.length)}</span>
              <span className="c13-sse-buffer">{view.buffer}</span>
              {delivered === 0 && <span className="c13-sse-empty">Nothing has arrived.</span>}
            </pre>
            <p className="c13-sse-note">
              {view.buffer ? `Buffer holds ${view.buffer.length} characters of an unfinished frame. The parser waits for a blank line.` : "Buffer is empty. Every frame so far is complete."}
            </p>
          </section>

          <section aria-label="What the page shows">
            <h4>What the page shows</h4>
            <p className="c13-sse-answer" aria-live="polite">
              {view.answer === "" && <span className="c13-sse-empty">Searching the PEPs...</span>}
              {view.answer !== "" &&
                parts.map((part, i) => {
                  if (i % 2 === 0) return part;
                  const n = Number(part.slice(1, -1));
                  return view.done ? (
                    <motion.span key={i} className="c13-sse-chip" initial={{ scale: 0.6, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }}>
                      {n}
                    </motion.span>
                  ) : (
                    <span key={i} className="c13-sse-chip idle">{n}</span>
                  );
                })}
            </p>
            <AnimatePresence>
              {view.done && (
                <motion.p className="c13-sse-source" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  [{CITATION.n}] {CITATION.title}
                </motion.p>
              )}
            </AnimatePresence>
            <p className="c13-sse-note">{view.frames.length} complete frames parsed.</p>
          </section>
        </div>

        {finished && guess && (
          <div className={`w-verdict ${guess === "done" ? "good" : "bad"}`} role="status">
            {guess === "done" ? "Right. " : "Not quite. "}
            The token frames carry text only. The citations travel in the done frame, because the server can read them out of the finished answer only once the model stops. Until then the marker is grey. Try the 16 character read size: frames split mid-line, and the buffer is what stops the parser reading half a frame.
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
