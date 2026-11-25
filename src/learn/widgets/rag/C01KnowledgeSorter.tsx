import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { useOnce } from "./c01-03-shared";
import "./C01KnowledgeSorter.css";

type Bucket = "prompt" | "rag" | "finetune" | "tool" | "long";
const BUCKETS: { id: Bucket; label: string }[] = [
  { id: "prompt", label: "Prompt" },
  { id: "rag", label: "RAG" },
  { id: "finetune", label: "Fine-tune" },
  { id: "tool", label: "Tool call" },
  { id: "long", label: "Long context" },
];

type Item = { id: string; short: string; text: string; best: Bucket; why: string };
const ITEMS: Item[] = [
  { id: "i1", short: "Revised PEP 703", text: "What PEP 703 says today, after its latest revision.", best: "rag", why: "It is text in documents that changes. Search it at question time and cite it. Weights cannot be edited that cheaply." },
  { id: "i2", short: "Open issue count", text: "How many issues are open right now on CPython, the main Python interpreter's repository.", best: "tool", why: "A live number from a system of record. Call the issue tracker API. Indexing a snapshot makes it wrong by lunchtime." },
  { id: "i3", short: "Terse, no legal advice", text: "Answer tersely in British English, and refuse to give legal advice.", best: "prompt", why: "Behaviour rules fit in a system prompt. Reach for training only when a prompt cannot hold the behaviour." },
  { id: "i4", short: "One 30-page contract", text: "A user uploads one 30-page contract and asks three questions about it.", best: "long", why: "It fits in the window, it is one document and the volume is tiny. Paste it. An index would be more work than the task." },
  { id: "i5", short: "40 ticket labels", text: "Sort tickets into your 40 internal labels, fast, on a small model, with 20 thousand labelled examples.", best: "finetune", why: "This is behaviour learned from examples, at low latency. Fine-tuning is good at exactly this. It is poor at teaching facts." },
  { id: "i6", short: "Overdue invoices", text: "Which of this customer's invoices are overdue.", best: "tool", why: "Structured data with exact answers. Run a query. Embedding rows and hoping for the best is a classic mistake." },
  { id: "i7", short: "Giant live wiki", text: "A wiki of several million pages, edited daily, where each team sees only its own pages.", best: "rag", why: "Too big to paste, always changing, and permissions matter. Retrieval can filter by access before the model sees anything." },
  { id: "i8", short: "Reply as JSON", text: "Always reply with JSON that has the keys verdict and reason.", best: "prompt", why: "Output format is an instruction. Put it in the prompt, or use structured output features. No data or training is needed." },
];

export default function C01KnowledgeSorter({ onComplete }: WidgetProps) {
  const complete = useOnce(onComplete);
  const reduce = !!useReducedMotion();
  const [placed, setPlaced] = useState<Record<string, Bucket>>({});
  const [checked, setChecked] = useState(false);
  const next = ITEMS.find((i) => !placed[i.id]);
  const placedCount = Object.keys(placed).length;
  const score = ITEMS.filter((i) => placed[i.id] === i.best).length;

  function place(item: Item, b: Bucket) {
    setPlaced((p) => ({ ...p, [item.id]: b }));
  }
  function undo() {
    const last = [...ITEMS].reverse().find((i) => placed[i.id]);
    if (!last || checked) return;
    setPlaced(({ [last.id]: _gone, ...rest }) => rest);
  }
  function check() {
    setChecked(true);
    complete(`${score} of ${ITEMS.length} placed where an expert would put them`);
  }

  return (
    <div className="w-panel c01-knowledge-sorter">
      <p className="c01-knowledge-sorter-lede">Eight pieces of knowledge. Decide where each one should live. There is a best answer for every card.</p>
      <div className="c01-knowledge-sorter-bins">
        {BUCKETS.map((b) => (
          <div className="c01-knowledge-sorter-bin" key={b.id}>
            <h4>{b.label}</h4>
            <AnimatePresence>
              {ITEMS.filter((i) => placed[i.id] === b.id).map((i) => (
                <motion.div
                  key={i.id}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`c01-knowledge-sorter-chip${checked ? (b.id === i.best ? " is-right" : " is-wrong") : ""}`}
                >
                  {i.short}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {next && (
        <div className="c01-knowledge-sorter-card">
          <div className="c01-knowledge-sorter-count">Card {placedCount + 1} of {ITEMS.length}</div>
          <p>{next.text}</p>
          <div className="c01-knowledge-sorter-choices" role="group" aria-label="Where should this knowledge live?">
            {BUCKETS.map((b) => (
              <button key={b.id} type="button" className="w-btn" onClick={() => place(next, b.id)}>{b.label}</button>
            ))}
          </div>
        </div>
      )}

      <div className="c01-knowledge-sorter-actions">
        {placedCount > 0 && !checked && <button type="button" className="w-btn ghost" onClick={undo}>Undo last</button>}
        {!next && !checked && <button type="button" className="w-btn primary" onClick={check}>Check my sorting</button>}
      </div>

      {checked && (
        <>
          <div className={`w-verdict ${score >= 6 ? "good" : "bad"}`} role="status">
            {score} of {ITEMS.length} in the best bucket. {score >= 6 ? "You sort like someone who has shipped this." : "Read the misses below. The pattern is always the same: facts in documents go to RAG, live numbers go to tools, behaviour goes to prompts or training."}
          </div>
          <ul className="c01-knowledge-sorter-review">
            {ITEMS.map((i) => (
              <li key={i.id} className={placed[i.id] === i.best ? "is-right" : "is-wrong"}>
                <b>{i.short}.</b> {placed[i.id] === i.best ? "Right." : `You said ${BUCKETS.find((b) => b.id === placed[i.id])?.label}; best is ${BUCKETS.find((b) => b.id === i.best)?.label}.`} {i.why}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
