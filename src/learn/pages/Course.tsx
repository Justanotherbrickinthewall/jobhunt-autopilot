import { Link, useNavigate, useParams } from "react-router-dom";
import { Check } from "lucide-react";
import { useCrumbs } from "../../components/crumbs.ts";
import { ListRow } from "../../components/ui.tsx";
import { LearnHead } from "../components/Head.tsx";
import { chaptersFor, getCourse } from "../content/courses.ts";
import { chapterFraction, getChapterProgress, useLastPosition } from "../engine/progress.ts";
import { useStorageVersion } from "../engine/storage.ts";
import { setHandsFree, unlockSpeech } from "../engine/handsfree.ts";
import { courseFraction, hours } from "./Home.tsx";

export default function CoursePage() {
  useStorageVersion();
  const { courseId = "" } = useParams();
  const course = getCourse(courseId);
  const last = useLastPosition();
  const navigate = useNavigate();
  useCrumbs(course ? [{ label: "Learn", go: () => navigate("/") }, { label: course.title }] : []);
  const phone = import.meta.env.VITE_PHONE === "1";
  if (!course) return <div className="lrn-empty">There is no course called "{courseId}". <Link to="/">Back to Learn</Link></div>;
  const chs = chaptersFor(course.id);
  const minutes = chs.reduce((a, c) => a + c.minutes, 0);
  const hrefFor = (id: string) => `/chapter/${id}${last?.chapterId === id && (last.blockId ?? last.sectionId) ? `#${last.blockId ?? last.sectionId}` : ""}`;
  // The chapter to read next: the one in progress, else the first not marked complete.
  const next = chs.find((c) => c.id === last?.chapterId && !getChapterProgress(c.id).completed) ?? chs.find((c) => !getChapterProgress(c.id).completed) ?? chs[0];
  const labMinutes = chs.reduce((a, c) => a + (c.lab?.minutes ?? 0), 0);
  const pct = Math.round(courseFraction(course.id) * 100);
  const sub = chs.length === 0 ? undefined
    : phone || labMinutes === 0 ? `${chs.length} chapters, ${hours(minutes)} hours, ${pct}% read`
    : `${chs.length} chapters, ${hours(minutes)} hours to read, ${hours(labMinutes)} hours of labs, ${pct}% read`;
  return (
    <>
      <LearnHead title={course.title} sub={sub}>
        {phone && next && course.status !== "soon" && <button type="button" className="btn ghost" onClick={() => { unlockSpeech(); setHandsFree(true); navigate(`/chapter/${next.id}`); }}>Hands-free</button>}
        {next && course.status !== "soon" && <Link className="btn fill" to={hrefFor(next.id)}>{getChapterProgress(next.id).opened ? "Continue" : "Start"}</Link>}
      </LearnHead>
      <div className="lrn-body flush fade-in">
        <p className="muted lrn-pad">{course.tagline}</p>
        {course.status === "soon" || chs.length === 0 ? (
          <div className="lrn-empty">{course.status === "soon" ? "This course is coming later." : "No chapters have been added yet."}</div>
        ) : (
          <>
            <div className="ld-group-head"><span className="cap">Chapters</span><span className="num">{chs.length}</span></div>
            <div className="chapter-list">
              {chs.map((c) => {
                const p = getChapterProgress(c.id);
                const read = p.completed;
                const f = chapterFraction(p, c.sections.length);
                const on = c.id === next?.id;
                return (
                  <Link key={c.id} to={hrefFor(c.id)} className={`ld-row${on ? " selected" : ""}`} aria-current={on ? "true" : undefined}>
                    <ListRow lead={<span className="tile" aria-hidden="true">{read ? <Check size={14} /> : String(c.number).padStart(2, "0")}</span>}
                      name={<span title={c.title}>{c.title}</span>} meta={<span className="ch-meta"><span>{c.minutes} min{!phone && c.lab ? ` + ${c.lab.minutes} min lab` : ""}</span><span className="progress-bar" style={{ width: 110 }}><i style={{ width: `${(read ? 1 : f) * 100}%` }} /></span><span>{read ? "Complete" : f > 0 ? `${Math.round(f * 100)}% read` : "Not started"}</span></span>} line={c.tagline}
                      preview={c.objectives.length > 0 ? <span className="ch-obj">{c.objectives.slice(0, 3).map((o, i) => <span key={i} title={o}>{o}</span>)}</span> : undefined} />
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
