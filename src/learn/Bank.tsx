// The question bank: Browse, Random drill and Mock. It mounts inside the Interview prep tab, so it brings its own
// .learn wrapper and CSS and needs no router. initialQ opens one question, as /learn/interview?q= did.
import "./styles/base.css";
import "./styles/components.css";
import "./styles/layout.css";
import "./styles/interview.css";
import "./styles/bookmarks.css";
import "./styles/mobile.css";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { getCourse, interviewQuestions } from "./content/courses.ts";
import type { InterviewCategory, InterviewLevel, InterviewQuestion } from "./content/types.ts";
import { fetchAttempts, toPractice, DIMENSIONS, type Attempt, type GradeResult, type PracticeQuestion } from "./components/interview/api.ts";
import { Sparkline } from "./components/interview/Charts.tsx";
import { Practice } from "./components/interview/Practice.tsx";
import { PhonePractice, bankCardId } from "./components/interview/PhonePractice.tsx";
import { useDeck } from "./engine/useDeck.ts";
import { scrollLearnTop } from "./components/Shell.tsx";
import { ListDetail, ListRow } from "../components/ui.tsx";
import { useCrumbs, type Crumb } from "../components/crumbs.ts";

type Mode = "browse" | "drill" | "mock";
const LEVELS: InterviewLevel[] = ["core", "deep", "senior"];
const MOCK_SIZE = 5;

// The phone build has no server, so it grades nothing and has no mock. Each card is a reveal and a self-rating.
const PRACTICE = import.meta.env.VITE_PHONE === "1" ? PhonePractice : Practice;

const pick = <T,>(arr: T[], n: number): T[] => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

// Inside Interview prep the address holds the open question: the host passes selected, onSelect and the trail's first two crumbs.
export default function Bank({ initialQ, selected, onSelect, trail, embedded }: { embedded?: boolean; initialQ?: string; selected?: string | null; onSelect?: (id: string | null) => void; trail?: Crumb[] }) {
  const [mode, setMode] = useState<Mode>("browse");
  const [course, setCourse] = useState<string | "all">("all");
  const [cat, setCat] = useState<InterviewCategory | "all">("all");
  const [text, setText] = useState("");
  const [askedOnly, setAskedOnly] = useState(false);
  const [level, setLevel] = useState<InterviewLevel | "all">("all");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [localOpen, setLocalOpen] = useState<string | null>(initialQ ?? null);
  const openId = onSelect ? selected ?? null : localOpen;
  const setOpenId = (id: string | null) => { setLocalOpen(id); onSelect?.(id); };
  const [adhoc, setAdhoc] = useState<string[]>([]);
  const [drillId, setDrillId] = useState<string | null>(null);

  const deck = useDeck();
  // The open question is the last crumb, cut to its first line. CSS ellipsises the rest.
  const openQ = openId ? interviewQuestions.find((q) => q.id === openId) : undefined;
  useCrumbs(trail ? [...trail, ...(openQ ? [{ label: openQ.question.split("\n")[0] }] : [])] : []);
  useEffect(() => { if (import.meta.env.VITE_PHONE !== "1") void fetchAttempts().then(setAttempts); }, []);
  // A new question or mode starts at the top. A follow-up keeps the place, because it appears under the answer just given.
  useLayoutEffect(() => { scrollLearnTop(); }, [mode, openId, drillId]);
  const addAttempt = (a: Attempt) => setAttempts((x) => [...x, a]);

  const courseIds = useMemo(() => [...new Set(interviewQuestions.map((q) => q.course))], []);
  const inCourse = (id: string) => interviewQuestions.filter((q) => id === "all" || q.course === id);
  // Categories belong to a course, so they are listed only once a course is chosen.
  const categories = useMemo(() => (course === "all" ? [] : [...new Set(inCourse(course).map((q) => q.category))]), [course]);
  const filtered = interviewQuestions.filter(
    (q) =>
      (course === "all" || q.course === course) &&
      (cat === "all" || q.category === cat) &&
      (level === "all" || q.level === level) &&
      (!askedOnly || q.source === "asked") &&
      (!text.trim() || q.question.toLowerCase().includes(text.trim().toLowerCase())),
  );
  const askedCount = interviewQuestions.filter((q) => q.source === "asked").length;
  const pickCourse = (c: string) => { setCourse(c); setCat("all"); };
  const byQ = useMemo(() => {
    const m = new Map<string, Attempt[]>();
    for (const a of attempts) if (a.questionId) m.set(a.questionId, [...(m.get(a.questionId) ?? []), a]);
    return m;
  }, [attempts]);

  const drillQ = filtered.find((x) => x.id === drillId);
  useEffect(() => {
    if (mode === "drill" && !drillQ && filtered.length > 0) setDrillId(pick(filtered, 1)[0].id);
  }, [mode, drillQ, filtered]);

  if (interviewQuestions.length === 0) {
    return (
      <div className="learn">
        <div className="bank-read fade-in">
          <h1>The question bank is empty</h1>
          <div className="lrn-empty">No questions have been added yet. They appear here once a course has them.</div>
        </div>
      </div>
    );
  }

  const open = openId ? interviewQuestions.find((q) => q.id === openId) : undefined;
  const switchMode = (m: Mode) => { setMode(m); setOpenId(null); setAdhoc([]); setDrillId(null); };
  const current = filtered.find((q) => q.id === openId) ?? filtered[0];

  const followUp = (stack: string[]) => import.meta.env.VITE_PHONE !== "1" && stack.length > 0 && (
    <Practice key={stack[stack.length - 1]} q={{ question: stack[stack.length - 1], category: "ad hoc" }} attempts={attempts} onGraded={addAttempt} onFollowUp={(f) => setAdhoc([...stack, f])} />
  );

  const filters = (
    <div className="filters" role="group" aria-label="Filters">
      <input type="search" className="w-input" placeholder="Search questions" aria-label="Search questions" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="w-row" role="group" aria-label="Course">
        <button type="button" className="tag" aria-pressed={course === "all"} onClick={() => pickCourse("all")}>All courses</button>
        {courseIds.map((c) => (
          <button key={c} type="button" className="tag" aria-pressed={course === c} onClick={() => pickCourse(c)}>
            {getCourse(c)?.title ?? c} ({inCourse(c).length})
          </button>
        ))}
      </div>
      {course !== "all" && (
        <div className="w-row" role="group" aria-label="Category">
          <button type="button" className="tag" aria-pressed={cat === "all"} onClick={() => setCat("all")}>All topics</button>
          {categories.map((c) => <button key={c} type="button" className="tag" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
        </div>
      )}
      <div className="w-row">
        <button type="button" className="tag" aria-pressed={level === "all"} onClick={() => setLevel("all")}>All levels</button>
        {LEVELS.map((l) => <button key={l} type="button" className="tag" aria-pressed={level === l} onClick={() => setLevel(l)}>{l}</button>)}
        {askedCount > 0 && (
          <button type="button" className="tag" aria-pressed={askedOnly} onClick={() => setAskedOnly((v) => !v)}>
            Asked in a real interview ({askedCount})
          </button>
        )}
      </div>
    </div>
  );

  const modes = ((import.meta.env.VITE_PHONE === "1" ? ["browse", "drill"] : ["browse", "drill", "mock"]) as Mode[]);
  const head = (
    <>
      {!embedded && <h1>{interviewQuestions.length} questions from your courses</h1>}
      <div className="lrn-tabs" role="tablist">
        {modes.map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} className={`tab ${mode === m ? "on" : ""}`} onClick={() => switchMode(m)}>
            {m === "browse" ? "Browse" : m === "drill" ? "Random drill" : "Mock interview"}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className="learn">
    <div className={`bank-wrap fade-in interview bank ${mode}`}>
      {mode === "browse" ? (
        <>
          <div className="bank-top">{head}{filters}</div>
          <ListDetail
            label="Questions"
            wrap
            groups={[{ key: "q", head: "Questions", rows: filtered }]}
            id={(q) => q.id}
            selected={current?.id ?? null}
            onSelect={(q) => { setOpenId(q.id); setAdhoc([]); }}
            row={(q) => {
              const h = byQ.get(q.id) ?? [];
              const phone = import.meta.env.VITE_PHONE === "1";
              return (
                <ListRow
                  name={q.question}
                  meta={phone ? (deck[bankCardId(q.id)] ? `Box ${deck[bankCardId(q.id)].box} of 5` : "Not rated") : h.length ? <span className="bank-meta"><Sparkline values={h.slice(-8).map((a) => a.result.overall)} width={60} height={18} /><span>Last score {h[h.length - 1].result.overall.toFixed(1)}</span></span> : undefined}
                  foot={<>
                    {course === "all" && <span className="tag small">{getCourse(q.course)?.title ?? q.course}</span>}
                    <span className="tag small">{q.category}</span>
                    <span className="tag small">{q.level}</span>
                    {q.source === "asked" && <span className="tag small">Asked in a real interview</span>}
                  </>}
                />
              );
            }}
          >
            {current ? (
              <div>
                <PRACTICE key={current.id} q={toPractice(current)} attempts={attempts} onGraded={addAttempt} onFollowUp={(f) => setAdhoc([f])} />
                {adhoc.length > 0 && <div style={{ marginTop: "1.4rem" }}>{followUp(adhoc)}</div>}
              </div>
            ) : <div className="lrn-empty">No questions match these filters.</div>}
          </ListDetail>
        </>
      ) : (
        <div className="bank-read">
          {head}
          {mode === "drill" && (
            <>
              {filters}
              {!drillQ ? <div className="lrn-empty">{filtered.length === 0 ? "No questions match these filters." : "Picking a question."}</div> : (
                <div>
                  <PRACTICE key={drillQ.id} q={toPractice(drillQ)} attempts={attempts} onGraded={addAttempt} onFollowUp={(f) => setAdhoc([f])} />
                  {adhoc.length > 0 && <div style={{ marginTop: "1.4rem" }}>{followUp(adhoc)}</div>}
                  <div style={{ marginTop: "1rem" }}>
                    <button type="button" className="w-btn" onClick={() => { setAdhoc([]); setDrillId(pick(filtered.filter((x) => x.id !== drillQ.id), 1)[0]?.id ?? drillQ.id); }}>Another question</button>
                  </div>
                </div>
              )}
            </>
          )}
          {import.meta.env.VITE_PHONE !== "1" && mode === "mock" && <Mock pool={filtered} attempts={attempts} onGraded={addAttempt} filters={filters} />}
        </div>
      )}
    </div>
    </div>
  );
}

function Mock({ pool, attempts, onGraded, filters }: { pool: InterviewQuestion[]; attempts: Attempt[]; onGraded: (a: Attempt) => void; filters: React.ReactNode }) {
  const [qs, setQs] = useState<InterviewQuestion[] | null>(null);
  const [i, setI] = useState(0);
  const [results, setResults] = useState<(GradeResult | null)[]>([]);
  useLayoutEffect(() => { scrollLearnTop(); }, [qs, i]);

  if (!qs) {
    return (
      <>
        {filters}
        <div className="w-panel">
          <h3>Mock interview</h3>
          <p>{Math.min(MOCK_SIZE, pool.length)} random questions from the filtered set. A timer runs on each one, with a two-minute target. You get a summary at the end.</p>
          <button type="button" className="w-btn" disabled={pool.length === 0} onClick={() => { setQs(pick(pool, MOCK_SIZE)); setI(0); setResults([]); }}>Start the mock</button>
        </div>
      </>
    );
  }

  if (i >= qs.length) {
    const graded = results.filter((r): r is GradeResult => !!r);
    const avg = graded.length ? graded.reduce((a, r) => a + r.overall, 0) / graded.length : 0;
    const dimAvg = DIMENSIONS.map((d) => ({ d, v: graded.length ? graded.reduce((a, r) => a + r.scores[d].score, 0) / graded.length : 0 }));
    const weakest = [...dimAvg].sort((a, b) => a.v - b.v)[0];
    return (
      <div className="w-panel fade-in">
        <h2>{graded.length ? `You averaged ${avg.toFixed(1)} out of 10` : "No answers were graded"}</h2>
        {graded.length > 0 && weakest && <p>Your weakest dimension was <strong>{weakest.d}</strong> at {weakest.v.toFixed(1)}. Work on that first.</p>}
        <div className="lrn-q-list">
          {qs.map((q, k) => (
            <div key={q.id} className="q-card" style={{ cursor: "default" }}>
              <strong>{q.question}</strong>
              <span className="muted">{results[k] ? `Score ${results[k]!.overall.toFixed(1)}` : "Skipped"}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "1rem" }}><button type="button" className="w-btn" onClick={() => setQs(null)}>Run another mock</button></div>
      </div>
    );
  }

  const q = qs[i];
  const advance = (r: GradeResult | null) => { setResults((x) => { const n = [...x]; n[i] = r; return n; }); setI(i + 1); };
  return (
    <div>
      <div className="w-row between" style={{ marginBottom: "0.8rem" }}>
        <span className="muted" style={{ margin: 0 }}>Question {i + 1} of {qs.length}</span>
        <div className="progress-bar" style={{ width: 160 }}><i style={{ width: `${(i / qs.length) * 100}%` }} /></div>
      </div>
      <MockQuestion key={q.id} q={q} last={i === qs.length - 1} attempts={attempts} onGraded={onGraded} onDone={advance} />
    </div>
  );
}

function MockQuestion({ q, last, attempts, onGraded, onDone }: { q: InterviewQuestion; last: boolean; attempts: Attempt[]; onGraded: (a: Attempt) => void; onDone: (r: GradeResult | null) => void }) {
  const [res, setRes] = useState<GradeResult | null>(null);
  return (
    <Practice
      q={toPractice(q)} hideIdeal attempts={attempts} timer
      onGraded={(a) => { setRes(a.result); onGraded(a); }}
      onSkip={() => onDone(null)} onNext={() => onDone(res)} nextLabel={last ? "See summary" : "Next question"}
    />
  );
}
