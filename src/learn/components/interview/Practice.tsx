import { useEffect, useRef, useState } from "react";
import { InterviewBookmark } from "../Bookmark.tsx";
import { ApiError, gradeAnswer, type Attempt, type GradeResult, type PracticeQuestion } from "./api.ts";
import { Sparkline } from "./Charts.tsx";
import { ResultPanel } from "./ResultPanel.tsx";
import { useSpeechRecognition } from "./useSpeech.ts";

const STAGES = [
  "Reading your answer",
  "Comparing it with the ideal answer",
  "Checking the keywords",
  "Scoring five dimensions and the answer frame",
  "Checking for unbacked claims",
  "Writing a stronger answer",
  "Thinking up follow-ups",
];

function fmt(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Grading() {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="grading" role="status" aria-live="polite">
      <span className="spinner" />
      <div>
        <strong>{STAGES[Math.min(STAGES.length - 1, Math.floor(t / 6))]}</strong>
        <div className="muted" style={{ fontSize: "var(--fs-sm)" }}>Grading usually takes 20 to 60 seconds. {t}s so far.</div>
        <div className="grading-bar"><i /></div>
      </div>
    </div>
  );
}

type Props = {
  q: PracticeQuestion;
  attempts: Attempt[];
  onGraded: (a: Attempt) => void;
  onFollowUp?: (question: string) => void;
  timer?: boolean;
  hideIdeal?: boolean;
  onSkip?: () => void;
  onNext?: () => void;
  nextLabel?: string;
};

export function Practice({ q, attempts, onGraded, onFollowUp, timer, hideIdeal, onSkip, onNext, nextLabel }: Props) {
  // sessionStorage, never localStorage: fde: keys are mirrored to my-notebook/progress.json and must not carry answer text.
  const draftKey = q.id ? `fde-draft:${q.id}` : null;
  const [answer, setAnswer] = useState(() => {
    try { return (draftKey && sessionStorage.getItem(draftKey)) || ""; } catch { return ""; }
  });
  const [revealed, setRevealed] = useState(false);
  const [status, setStatus] = useState<"idle" | "grading" | "done" | "error">("idle");
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [secs, setSecs] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);

  const speech = useSpeechRecognition((text) => setAnswer((a) => (a ? `${a.trimEnd()} ${text}` : text)));

  useEffect(() => {
    if (!draftKey) return;
    try { if (answer) sessionStorage.setItem(draftKey, answer); else sessionStorage.removeItem(draftKey); } catch { /* storage may be blocked */ }
  }, [draftKey, answer]);

  useEffect(() => {
    if (!timer || status === "grading" || status === "done") return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [timer, status]);

  useEffect(() => {
    if (status === "done") resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [status]);

  const history = q.id ? attempts.filter((a) => a.questionId === q.id) : [];
  const submit = async () => {
    if (speech.listening) speech.stop();
    setStatus("grading");
    setError(null);
    try {
      const r = await gradeAnswer(q, answer.trim());
      setResult(r);
      setStatus("done");
      if (draftKey) try { sessionStorage.removeItem(draftKey); } catch { /* storage may be blocked */ }
      onGraded({ ts: new Date().toISOString(), questionId: q.id ?? null, question: q.question, answer: answer.trim(), result: r });
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("error", String((e as Error).message)));
      setStatus("error");
    }
  };

  const grading = status === "grading";
  return (
    <div className="practice w-panel">
      <div className="w-row between">
        <div className="w-row">
          {q.category && <span className="w-chip">{q.category}</span>}
          {q.level && <span className={`w-chip ${q.level === "senior" ? "warn" : q.level === "deep" ? "is-on" : ""}`}>{q.level}</span>}
          {q.source === "asked" && <span className="w-chip good">Asked in a real interview</span>}
          {!q.id && <span className="w-chip">follow-up</span>}
        </div>
        {timer && <span className={`timer ${secs > 120 ? "over" : ""}`} aria-label="Time on this question">{fmt(secs)}<small> / 2:00 target</small></span>}
      </div>
      <h3 className="practice-q">{q.question}</h3>

      {q.idealAnswer && !hideIdeal && (
        <div>
          {revealed ? (
            <div className="w-inset ideal bm-host inner">
              <InterviewBookmark q={q} kind="interview" text={`**${q.question}**\n${q.idealAnswer}`} what="this ideal answer" />
              <div className="w-label">Ideal answer</div>
              <p>{q.idealAnswer}</p>
              {q.keywords && q.keywords.length > 0 && <div className="chip-row">{q.keywords.map((k) => <span key={k} className="w-chip">{k}</span>)}</div>}
            </div>
          ) : (
            <button type="button" className="btn ghost small" onClick={() => setRevealed(true)}>Reveal ideal answer</button>
          )}
        </div>
      )}

      <div className="answer-box">
        <label className="w-label" htmlFor="answer">Your answer</label>
        <textarea
          id="answer" className="textarea" value={answer} disabled={grading || status === "done"}
          onChange={(e) => setAnswer(e.target.value)} placeholder="Answer as you would in the interview. Lead with the answer, then the reasons."
        />
        {speech.listening && speech.interim && <div className="interim" aria-live="polite">{speech.interim}</div>}
        {speech.error && <div className="muted" style={{ color: "var(--rose)", fontSize: "var(--fs-sm)" }}>{speech.error}</div>}
        <div className="w-row">
          {speech.supported && status !== "done" && (
            <button type="button" className={`w-btn ghost ${speech.listening ? "rec" : ""}`} onClick={() => (speech.listening ? speech.stop() : speech.start())} disabled={grading}>
              <span className={`rec-dot ${speech.listening ? "on" : ""}`} aria-hidden /> {speech.listening ? "Stop recording" : "Record"}
            </button>
          )}
          {status !== "done" && (
            <button type="button" className="btn fill" disabled={grading || answer.trim().length < 3} onClick={submit}>
              {grading ? "Grading" : status === "error" ? "Send again" : "Send for grading"}
            </button>
          )}
          {onSkip && status !== "done" && !grading && <button type="button" className="btn ghost" onClick={onSkip}>Skip</button>}
          {status === "done" && onNext && <button type="button" className="btn fill" onClick={onNext}>{nextLabel ?? "Next"}</button>}
          <span className="muted" style={{ fontSize: "var(--fs-sm)" }}>{answer.trim() ? `${answer.trim().split(/\s+/).length} words` : ""}</span>
        </div>
      </div>

      {grading && <Grading />}
      {status === "error" && error && (
        <div className="w-verdict bad" role="alert">
          <strong>{error.code === "claude_missing" ? "claude is not installed" : error.code === "not_logged_in" ? "claude is not signed in" : error.code === "server_down" ? "Server is not running" : "Grading failed"}</strong>
          <p style={{ margin: "0.3rem 0 0" }}>{error.message}</p>
        </div>
      )}
      <div ref={resultRef}>{status === "done" && result && <ResultPanel result={result} onFollowUp={onFollowUp} q={q} />}</div>

      {history.length > 0 && (
        <div className="history">
          <div className="w-label">History</div>
          <div className="w-row">
            <Sparkline values={history.slice(-12).map((h) => h.result.overall)} />
            <span className="muted" style={{ fontSize: "var(--fs-sm)" }}>
              {history.length} {history.length === 1 ? "attempt" : "attempts"}, best {Math.max(...history.map((h) => h.result.overall)).toFixed(1)}, last {history[history.length - 1].result.overall.toFixed(1)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
