import { Link } from "react-router-dom";
import { LearnHead } from "../components/Head.tsx";
import { useDueCount } from "../components/Shell.tsx";
import { chapters, chaptersFor, courses, getChapter, getCourse } from "../content/courses.ts";
import { chapterFraction, getChapterProgress, useLastPosition } from "../engine/progress.ts";
import { useStorageVersion } from "../engine/storage.ts";
import type { Chapter } from "../content/types.ts";

export function courseFraction(courseId: string): number {
  const chs = chaptersFor(courseId);
  if (!chs.length) return 0;
  return chs.reduce((a, c) => a + chapterFraction(getChapterProgress(c.id), c.sections.length), 0) / chs.length;
}

// Learning time is the reading time plus the lab, if the chapter has one.
function chapterMinutes(c: Chapter): number {
  return c.minutes + (import.meta.env.VITE_PHONE === "1" ? 0 : c.lab?.minutes ?? 0);
}

function totalMinutes(chs: Chapter[]): number {
  return chs.reduce((a, c) => a + chapterMinutes(c), 0);
}

// A part-read chapter counts for the share of its sections you have done.
function doneMinutes(chs: Chapter[]): number {
  return chs.reduce((a, c) => a + chapterFraction(getChapterProgress(c.id), c.sections.length) * chapterMinutes(c), 0);
}

// One decimal under ten hours, whole hours above it.
export function hours(min: number): string {
  const h = min / 60;
  return h >= 10 ? String(Math.round(h)) : String(Math.round(h * 10) / 10);
}

export default function Home() {
  useStorageVersion();
  const due = useDueCount();
  const last = useLastPosition();
  const lastChapter = last ? getChapter(last.chapterId) : undefined;
  const live = courses.filter((c) => c.status === "live");
  const soon = courses.filter((c) => c.status === "soon");
  const target = lastChapter ?? chapters[0];
  const anchor = lastChapter ? last?.blockId ?? last?.sectionId : undefined;
  const href = target ? `/chapter/${target.id}${anchor ? `#${anchor}` : ""}` : "";
  const place = lastChapter ? chaptersFor(lastChapter.course).findIndex((c) => c.id === lastChapter.id) + 1 : 0;
  const title = !target ? "No courses yet" : lastChapter ? `Chapter ${place || lastChapter.number} of ${getCourse(lastChapter.course)?.title ?? "your course"} is next` : "Pick a course to start";
  return (
    <>
      <LearnHead title={title} sub={lastChapter?.title}>
        {due > 0 && <Link className="btn ghost" to="/review">Review {due} {due === 1 ? "card" : "cards"}</Link>}
        {target && <Link className="btn fill" to={href}>{lastChapter ? "Continue" : "Start"}</Link>}
      </LearnHead>
      <div className="lrn-body flush fade-in">
      <div className="ld-group-head"><span className="cap">Courses</span><span className="num">{live.length}</span></div>
      <div className="cards lrn-pad">
        {live.map((c) => {
          const chs = chaptersFor(c.id);
          const n = chs.length;
          const h = hours(totalMinutes(chs));
          return (
            <Link key={c.id} to={`/course/${c.id}`} className="course-card">
              <div className="top">
                <div>
                  <h3>{c.title}</h3>
                </div>
                {courseFraction(c.id) > 0 && <span className="muted read-pct">{Math.round(courseFraction(c.id) * 100)}% read</span>}
              </div>
              <p>{c.tagline}</p>
              <div className="meta">{n ? `${n} ${n === 1 ? "chapter" : "chapters"}, ${h} ${h === "1" ? "hour" : "hours"}` : "Chapters on their way"}</div>
            </Link>
          );
        })}
      </div>

      {soon.length > 0 && (
        <>
        <div className="ld-group-head"><span className="cap">Coming later</span><span className="num">{soon.length}</span></div>
        <div className="cards lrn-pad">
          {soon.map((c) => (
            <div key={c.id} className="course-card soon">
              <h3>{c.title}</h3>
              <p>{c.tagline}</p>
              <div className="meta">Coming later</div>
            </div>
          ))}
        </div>
        </>
      )}
      </div>
    </>
  );
}
