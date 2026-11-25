import { motion } from "motion/react";
import { InterviewBookmark } from "../Bookmark.tsx";
import { CopyButton } from "../CopyButton.tsx";
import { FRAME_PARTS, type GradeResult } from "./api.ts";
import { DimensionBars, Radar, ScoreDial } from "./Charts.tsx";

export function ResultPanel({ result, onFollowUp, q }: { result: GradeResult; onFollowUp?: (q: string) => void; q?: { id?: string; question: string; category?: string } }) {
  const saveText = q
    ? [`**${q.question}**`, result.betterAnswer, result.followUps.length ? "**Follow-ups**" : "", ...result.followUps.map((f) => `- ${f.question} (${f.why})`)].filter(Boolean).join("\n")
    : "";
  return (
    <motion.div className="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="result-top">
        <ScoreDial value={result.overall} />
        <Radar scores={result.scores} />
      </div>
      <DimensionBars scores={result.scores} />

      {(result.keywordsHit.length > 0 || result.keywordsMissed.length > 0) && (
        <div>
          <div className="w-label">Keywords</div>
          <div className="chip-row">
            {result.keywordsHit.map((k) => <span key={`h${k}`} className="w-chip good">{k}</span>)}
            {result.keywordsMissed.map((k) => <span key={`m${k}`} className="w-chip bad">{k}</span>)}
          </div>
        </div>
      )}

      {result.frame?.applies && (
        <div>
          <div className="w-label">Answer frame</div>
          <div className="chip-row">
            {FRAME_PARTS.map((p) => {
              const hit = result.frame!.present.includes(p.id);
              return <span key={p.id} className={`w-chip ${hit ? "good" : "bad"}`}>{hit ? "Covered" : "Missing"}: {p.label}</span>;
            })}
          </div>
        </div>
      )}

      {result.overclaim && result.overclaim.length > 0 && (
        <div>
          <div className="w-label">Claims with nothing to back them</div>
          <ul className="plain-list bad">{result.overclaim.map((c, i) => <li key={i}>{`"${c}"`}</li>)}</ul>
          <p className="muted" style={{ fontSize: "var(--fs-sm)", margin: "0.3rem 0 0" }}>Name what you built, what your team built and what you would design. Add a detail the interviewer can check, or say it as a design.</p>
        </div>
      )}

      <div className="two-col">
        <div>
          <div className="w-label">What worked</div>
          <ul className="plain-list good">{result.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
        <div>
          <div className="w-label">What to fix</div>
          <ul className="plain-list bad">{result.gaps.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      </div>

      <div className="w-inset better bm-host inner">
        {q && <InterviewBookmark q={q} kind="grade" text={saveText} what="this better answer and its follow-ups" />}
        <div className="w-row between"><div className="w-label">A stronger answer</div><CopyButton text={result.betterAnswer} /></div>
        <p>{result.betterAnswer}</p>
      </div>

      {result.followUps.length > 0 && (
        <div>
          <div className="w-label">The interviewer might ask next</div>
          <div className="followups">
            {result.followUps.map((f, i) => (
              <button key={i} type="button" className="followup" onClick={() => onFollowUp?.(f.question)} disabled={!onFollowUp}>
                <strong>{f.question}</strong>
                <span className="muted">{f.why}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
