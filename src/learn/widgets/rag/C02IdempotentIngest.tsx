import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { WidgetProps } from "../types";
import { useOnce } from "./c01-03-shared";
import "./C02IdempotentIngest.css";

type Strategy = {
  id: string;
  name: string;
  desc: string;
  records: number[]; // records in the index after run 1, 2, 3
  embeds: number[]; // embedding calls in each run
  answer: number; // records after run 3
  why: string;
};

const LIVE = [3, 3, 2]; // documents that really exist after each run

const STRATEGIES: Strategy[] = [
  { id: "uuid", name: "Random id per chunk", desc: "Every chunk gets a random id. Every run inserts everything it finds.", records: [3, 6, 8], embeds: [3, 3, 2], answer: 8, why: "Run two doubled the index, because nothing recognised the old records. Run three added the new versions beside the old ones, and the deleted file's records are still there. The same question now retrieves duplicate and contradictory text." },
  { id: "upsert", name: "Id from the file path", desc: "The id comes from the file path. Each run overwrites by id.", records: [3, 3, 3], embeds: [3, 3, 2], answer: 3, why: "Re-runs no longer duplicate. The edited file replaced its old self. But the deleted PEP is still searchable, an orphan, and every run still pays to embed every file." },
  { id: "hash", name: "Path id plus a stored content hash", desc: "The id comes from the path. A hash of the content decides whether to re-embed. A separate pass then deletes anything missing from the source.", records: [3, 3, 2], embeds: [3, 0, 1], answer: 2, why: "This is idempotent: running it again changes nothing. Run two did no embedding work at all. Run three embedded exactly the one edited file and removed the orphan." },
];

const OPTIONS = [2, 3, 5, 8];
const BAR_W = 56;

export default function C02IdempotentIngest({ onComplete }: WidgetProps) {
  const complete = useOnce(onComplete);
  const reduce = !!useReducedMotion();
  const [tab, setTab] = useState(0);
  const [guess, setGuess] = useState<Record<string, number>>({});
  const s = STRATEGIES[tab];
  const guessed = guess[s.id];
  const done = STRATEGIES.every((x) => guess[x.id] !== undefined);
  const right = STRATEGIES.filter((x) => guess[x.id] === x.answer).length;

  function pick(n: number) {
    if (guessed !== undefined) return;
    const next = { ...guess, [s.id]: n };
    setGuess(next);
    if (STRATEGIES.every((x) => next[x.id] !== undefined)) {
      const r = STRATEGIES.filter((x) => next[x.id] === x.answer).length;
      complete(`${r} of ${STRATEGIES.length} predictions right`);
    }
  }

  const maxRec = 8;
  const H = 110;
  const unit = H / maxRec;

  return (
    <div className="w-panel c02-idempotent-ingest">
      <p className="c02-idempotent-ingest-lede">Same three runs, three ways of building ids. Predict the record count before you see it.</p>
      <ol className="c02-idempotent-ingest-script">
        <li>Run one ingests pep-0008, pep-0020 and pep-0572.</li>
        <li>Run two happens again with nothing changed.</li>
        <li>Run three happens after pep-0008 is edited and pep-0020 is deleted from the source.</li>
      </ol>
      <div className="c02-idempotent-ingest-tabs" role="tablist" aria-label="Id strategy">
        {STRATEGIES.map((x, i) => (
          <button key={x.id} type="button" role="tab" aria-selected={tab === i} className={`w-btn${tab === i ? " primary" : ""}`} onClick={() => setTab(i)}>
            {i + 1}. {x.name.split(",")[0]}{guess[x.id] !== undefined ? (guess[x.id] === x.answer ? " (right)" : " (missed)") : ""}
          </button>
        ))}
      </div>
      <p className="c02-idempotent-ingest-desc"><b>{s.name}.</b> {s.desc}</p>
      <div className="c02-idempotent-ingest-q">After run three, how many records are in the index? Two documents really exist by then.</div>
      <div className="c02-idempotent-ingest-opts" role="group" aria-label="Your prediction">
        {OPTIONS.map((n) => (
          <button key={n} type="button" className={`w-btn${guessed === n ? " primary" : ""}`} disabled={guessed !== undefined} aria-pressed={guessed === n} onClick={() => pick(n)}>{n} records</button>
        ))}
      </div>

      <svg className="c02-idempotent-ingest-svg" viewBox="0 0 340 160" role="img" aria-label={`Records after each run for ${s.name}: ${guessed !== undefined ? s.records.join(", ") : "hidden until you predict"}`}>
        {[0, 1, 2].map((r) => {
          const x = 40 + r * 100;
          const total = guessed !== undefined ? s.records[r] : 0;
          const live = Math.min(total, LIVE[r]);
          const junk = total - live;
          return (
            <g key={r}>
              <motion.rect className="c02-idempotent-ingest-live" x={x} width={BAR_W} rx={3} initial={false}
                animate={{ y: 126 - live * unit, height: live * unit }} transition={reduce ? { duration: 0 } : { duration: 0.4, delay: r * 0.15 }} />
              <motion.rect className="c02-idempotent-ingest-junk" x={x} width={BAR_W} rx={3} initial={false}
                animate={{ y: 126 - total * unit, height: junk * unit }} transition={reduce ? { duration: 0 } : { duration: 0.4, delay: r * 0.15 }} />
              <text x={x + BAR_W / 2} y={142} className="c02-idempotent-ingest-axis">Run {r + 1}</text>
              {guessed !== undefined && <text x={x + BAR_W / 2} y={154} className="c02-idempotent-ingest-axis">{s.embeds[r]} embeds</text>}
              {guessed !== undefined && <text x={x + BAR_W / 2} y={120 - total * unit} className="c02-idempotent-ingest-num">{total}</text>}
            </g>
          );
        })}
        <line x1={30} x2={330} y1={126} y2={126} stroke="var(--line)" />
      </svg>
      <div className="c02-idempotent-ingest-legend"><span><i style={{ background: "var(--teal)" }} />live records</span><span><i style={{ background: "var(--rose)" }} />duplicates and orphans</span></div>

      {guessed !== undefined && (
        <div className={`w-verdict ${guessed === s.answer ? "good" : "bad"}`} role="status">
          <b>{guessed === s.answer ? "Right. " : `The index holds ${s.answer}, not ${guessed}. `}</b>{s.why}
        </div>
      )}
      {done && (
        <p className="c02-idempotent-ingest-note">{right} of {STRATEGIES.length} right. Rebuilding the whole index from scratch every time is also idempotent, and it is a fine choice for a small corpus. The third design is what you build when re-embedding everything gets slow or expensive.</p>
      )}
    </div>
  );
}
