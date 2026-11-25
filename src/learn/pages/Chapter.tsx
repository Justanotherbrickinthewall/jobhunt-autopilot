import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Check } from "lucide-react";
import { useCrumbs } from "../../components/crumbs.ts";
import { Splitter } from "../../components/Splitter.tsx";
import { LearnHead } from "../components/Head.tsx";
import { BlockView, sideLabel } from "../components/Blocks.tsx";
import { anchorId, ChapterMetaProvider, InPanel } from "../components/Bookmark.tsx";
import { learnScroller } from "../components/Shell.tsx";
import { CopyButton } from "../components/CopyButton.tsx";
import { PanelPractice } from "../components/interview/PanelPractice.tsx";
import { LabPanel } from "../components/Lab.tsx";
import { SideMarker, SidePanel, type SideItem } from "../components/SidePanel.tsx";
import { NarratedBlock, NarrationProvider } from "../components/Narration.tsx";
import { ListRow } from "../../components/ui.tsx";
import { LEARN_BASE } from "../engine/base.ts";
import { Pill } from "../components/Pill.tsx";
import { chaptersFor, getChapter, getCourse, getQuestion } from "../content/courses.ts";
import { getLastPosition, markOpened, markSectionRead, setCompleted, setLastPosition, useChapterProgress } from "../engine/progress.ts";
import { setHandsFree, unlockSpeech, useHandsFree } from "../engine/handsfree.ts";
import { useWakeLock } from "../../reading/wakeLock.ts";
import { useNarrState, useNarration } from "../components/Narration.tsx";
import { blockKey, buildUnits, goalKey, HEAD_KEY, isSideItem, OBJECTIVES_KEY, RECAP_KEY, titleKey } from "../engine/text.ts";

// The wiki line reads my-profile through src/data, which the phone build does not have. A lazy import keeps that module out of the phone bundle.
const ChapterWiki: ComponentType<{ chapterId: string }> = import.meta.env.VITE_PHONE === "1"
  ? () => null
  : lazy(() => import("../components/ChapterWiki.tsx").then((m) => ({ default: m.ChapterWiki })));

export default function ChapterPage() {
  const { chapterId = "" } = useParams();
  const chapter = getChapter(chapterId);
  if (!chapter) {
    return (
      <div className="lrn-empty fade-in">
        There is no chapter called "{chapterId}". <Link to="/">Back to Learn</Link>
      </div>
    );
  }
  return <ChapterView key={chapter.id} chapterId={chapter.id} />;
}

function ChapterView({ chapterId }: { chapterId: string }) {
  const chapter = getChapter(chapterId)!;
  const progress = useChapterProgress(chapterId);
  const units = useMemo(() => new Map(buildUnits(chapter).map((u) => [u.key, u])), [chapter]);
  const siblings = chaptersFor(chapter.course);
  const at = siblings.findIndex((c) => c.id === chapter.id);
  const prev = at > 0 ? siblings[at - 1] : undefined;
  const next = at >= 0 && at < siblings.length - 1 ? siblings[at + 1] : undefined;
  const [current, setCurrent] = useState(chapter.sections[0]?.id ?? "");
  const bar = useRef<HTMLElement>(null);
  const scope = useRef<HTMLDivElement>(null);
  const layout = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLElement>(null);
  const head = useRef<HTMLDetailsElement>(null);
  const phone = import.meta.env.VITE_PHONE === "1";
  const navigate = useNavigate();
  const course = getCourse(chapter.course);
  useCrumbs([
    { label: "Learn", go: () => navigate("/") },
    { label: course?.title ?? "Course", go: () => navigate(`/course/${chapter.course}`) },
    { label: `Chapter ${chapter.number}: ${chapter.title}` },
  ]);
  const [left, setLeft] = useState(chapter.minutes);
  const { hash } = useLocation();
  const [openId, setOpenId] = useState<string | null>(null);
  const questions = useMemo(() => (chapter.interviewIds ?? []).map((id) => getQuestion(id)).filter((q) => !!q), [chapter]);
  const items = useMemo<SideItem[]>(() => {
    const out: SideItem[] = [];
    for (const s of chapter.sections) {
      s.blocks.forEach((b, bi) => {
        if (!isSideItem(b)) return;
        out.push({
          id: anchorId(s.id, bi),
          ...sideLabel(b),
          render: () => <InPanel.Provider value><BlockView block={b} unit={undefined} chapterId={chapter.id} sectionId={s.id} blockIndex={bi} expanded /></InPanel.Provider>,
        });
      });
    }
    if (!phone && chapter.lab) {
      const lab = chapter.lab;
      out.push({ id: "lab", label: `Lab, about ${lab.minutes} minutes`, title: lab.title, render: () => <InPanel.Provider value><LabPanel lab={lab} chapterId={chapter.id} /></InPanel.Provider> });
    }
    for (const q of questions) {
      out.push({ id: `iq-${q!.id}`, label: "Interview question", title: q!.question, render: () => <InPanel.Provider value><PanelPractice q={q!} /></InPanel.Provider> });
    }
    return out;
  }, [chapter, phone, questions]);
  const labItem = items.find((i) => i.id === "lab");
  // Opening or closing the panel narrows or widens the story, so keep the clicked marker where it was on screen.
  const marker = useRef<HTMLElement | null>(null);
  const keepPlace = (el: HTMLElement | null | undefined, change: () => void) => {
    const before = el?.getBoundingClientRect().top;
    change();
    if (el && before !== undefined) requestAnimationFrame(() => learnScroller()?.scrollBy(0, el.getBoundingClientRect().top - before));
  };
  // From the section rail there is no marker to hold, so the section being read is the anchor and the reader keeps their place.
  const openSide = (id: string, el?: HTMLElement) => { const at = el ?? document.getElementById(current); marker.current = at; keepPlace(at, () => setOpenId(id)); };
  const closeSide = () => keepPlace(marker.current, () => setOpenId(null));

  useEffect(() => {
    markOpened(chapter.id);
    if (getLastPosition()?.chapterId !== chapter.id) setLastPosition(chapter.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter.id]);

  useEffect(() => {
    if (!hash) return;
    if (items.some((i) => i.id === hash.slice(1))) setOpenId(hash.slice(1));
    const el = document.getElementById(hash.slice(1));
    if (!el) return;
    el.querySelector("details")?.setAttribute("open", "");
    const t = setTimeout(() => {
      el.scrollIntoView({ block: "start" });
      if (el.classList.contains("bm-host")) {
        el.classList.add("bm-flash");
        setTimeout(() => el.classList.remove("bm-flash"), 2600);
      }
    }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  // Reading progress bar. Over 900px .learn scrolls, under 900px the window does.
  useEffect(() => {
    const el = bar.current;
    const box = learnScroller();
    if (!el || !box) return;
    const onScroll = () => {
      const inBox = box.scrollHeight > box.clientHeight + 1;
      const root = document.scrollingElement ?? document.documentElement;
      const top = inBox ? box.scrollTop : root.scrollTop;
      const h = inBox ? box.scrollHeight - box.clientHeight : root.scrollHeight - root.clientHeight;
      const fraction = h > 0 ? Math.min(1, top / h) : 0;
      el.style.width = `${fraction * 100}%`;
      if (phone) setLeft(Math.max(1, Math.ceil(chapter.minutes * (1 - fraction))));
    };
    onScroll();
    box.addEventListener("scroll", onScroll, { passive: true });
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      box.removeEventListener("scroll", onScroll);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Section tracking: current section for the rail, read when its end scrolls into view.
  useEffect(() => {
    const cur = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const id = (e.target as HTMLElement).dataset.section!;
            setCurrent(id);
          }
        }
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    const read = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) markSectionRead(chapter.id, (e.target as HTMLElement).dataset.end!);
    });
    // The saved position is the block under the top of the page, so a relaunch opens at the paragraph the candidate was reading.
    const where = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          setLastPosition(chapter.id, el.closest<HTMLElement>("[data-section]")?.dataset.section, el.id);
        }
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    document.querySelectorAll<HTMLElement>('.bm-host[id^="b-"]').forEach((el) => where.observe(el));
    document.querySelectorAll<HTMLElement>("[data-section]").forEach((el) => cur.observe(el));
    document.querySelectorAll<HTMLElement>("[data-end]").forEach((el) => read.observe(el));
    return () => {
      cur.disconnect();
      read.disconnect();
      where.disconnect();
    };
  }, [chapter.id]);


  return (
    <NarrationProvider chapter={chapter}>
      <ChapterMetaProvider value={chapter}>
      <div className="chapter-scope" ref={scope}>
      <LearnHead title={course?.title ?? chapter.title} sub={`Chapter ${chapter.number} of ${siblings.length}, ${chapter.minutes} min`}>
        {phone && <HandsFree nextId={next?.id} />}
      </LearnHead>
      <div className="read-progress" aria-hidden><i ref={bar} /></div>
      {(
        <details className="run-head" ref={head}>
          <summary><span>{chapter.sections.find((s) => s.id === current)?.title}</span><span>{left} min left</span></summary>
          <ol>
            {chapter.sections.map((s) => (
              <li key={s.id}><a href={`#${s.id}`} aria-current={current === s.id} onClick={() => head.current?.removeAttribute("open")}>{s.title}</a></li>
            ))}
          </ol>
        </details>
      )}
      <div className={`chapter-layout fade-in${openId ? " side-open" : ""}`} ref={layout}>
        <aside className="rail ld-list" aria-label="Sections" ref={rail}>
          {!phone && <Splitter name="contents" label="Resize the contents" varName="--pane-w" root={scope} pane={rail} min={220} max={400} grow="right" room={() => (layout.current?.clientWidth ?? 0) - 480} />}
          <div className="rail-in">
            <div className="ld-group">
              <div className="ld-group-head"><span className="cap">In this chapter</span><span className="num">{chapter.sections.length}</span></div>
              {chapter.sections.map((s, i) => (
                <button key={s.id} type="button" className={`ld-row${current === s.id ? " selected" : ""}`} aria-current={current === s.id ? "true" : undefined}
                  onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                  <ListRow lead={<span className="tile" aria-hidden="true">{progress.sectionsRead.includes(s.id) ? <Check size={14} /> : i + 1}</span>} name={s.title} />
                </button>
              ))}
              <button type="button" className="ld-row" onClick={() => document.getElementById("recap")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                <ListRow lead={<span className="tile" aria-hidden="true">{progress.completed ? <Check size={14} /> : "R"}</span>} name="Recap" />
              </button>
            </div>
            {!phone && chapter.lab && (
              <div className="ld-group">
                <div className="ld-group-head"><span className="cap">Lab</span><span className="num">1</span></div>
                <button type="button" className="ld-row" onClick={() => openSide("lab")}>
                  <ListRow lead={<span className="tile" aria-hidden="true">{progress.labDone.length === chapter.lab.steps.length ? <Check size={14} /> : "L"}</span>} name={chapter.lab.title} />
                </button>
              </div>
            )}
          </div>
        </aside>

        <article className="chapter-main">
          <NarratedBlock unit={units.get(HEAD_KEY)}>{(part) => (
            <header className="chapter-head">
              <h1>{part(0)}</h1>
              <p className="tagline">{part(1)}</p>
            </header>
          )}</NarratedBlock>
          <NarratedBlock unit={units.get(OBJECTIVES_KEY)} className="objectives w-panel">{(part) => (
            <>
              <div className="eyebrow">{part(0)}</div>
              <ul>{chapter.objectives.map((_, i) => <li key={i}>{part(i + 1)}</li>)}</ul>
            </>
          )}</NarratedBlock>
          {labItem && <SideMarker item={labItem} onOpen={openSide} anchor={false} />}

          {chapter.sections.map((s, si) => (
            <section key={s.id} id={s.id} data-section={s.id} className="section">
              <div className="section-title-row"><span className="n">{si + 1}</span><NarratedBlock unit={units.get(titleKey(s.id))}>{(part) => <h2>{units.has(titleKey(s.id)) ? part(0) : s.title}</h2>}</NarratedBlock></div>
              <NarratedBlock unit={units.get(goalKey(s.id))}>{(part) => <p className="section-goal">{part(0)}</p>}</NarratedBlock>
              {s.blocks.map((b, bi) => {
                const key = blockKey(s.id, bi);
                if (!isSideItem(b)) return <BlockView key={key} block={b} unit={units.get(key)} chapterId={chapter.id} sectionId={s.id} blockIndex={bi} />;
                const item = items.find((i) => i.id === anchorId(s.id, bi))!;
                const grouped = s.blocks[bi - 1] && isSideItem(s.blocks[bi - 1]);
                return <div key={key} className={grouped ? "side-group more" : "side-group"}><SideMarker item={item} onOpen={openSide} /></div>;
              })}
              <div data-end={s.id} style={{ height: 1 }} />
            </section>
          ))}

          {labItem && <SideMarker item={labItem} onOpen={openSide} />}

          <section id="recap" className="recap">
            <NarratedBlock unit={units.get(RECAP_KEY)}>{(part) => (
              <>
                <h2>{part(0)}</h2>
                <ul>{chapter.recap.map((_, i) => <li key={i}><span>{part(i + 1)}</span></li>)}</ul>
              </>
            )}</NarratedBlock>
          </section>

          <div className="reinforce">
            <div className="eyebrow">Paste this into your CLAUDE.md</div>
            <p>{chapter.reinforcement}</p>
            <CopyButton text={chapter.reinforcement} label="Copy paragraph" />
          </div>

          <Suspense fallback={null}><ChapterWiki chapterId={chapter.id} /></Suspense>

          {questions.length > 0 && (
            <div className="iq-list">
              <div className="eyebrow" style={{ marginBottom: 0 }}>Interview questions for this chapter</div>
              {questions.map((q) => <a key={q!.id} href={`${LEARN_BASE}/interview?q=${q!.id}`} onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); openSide(`iq-${q!.id}`, e.currentTarget); }}>{q!.question}</a>)}
            </div>
          )}

          <div className="complete-row">
            <button type="button" className={progress.completed ? "btn ghost" : "btn fill"} onClick={() => setCompleted(chapter.id, !progress.completed)}>
              {progress.completed ? "Marked complete. Undo" : "Mark chapter complete"}
            </button>
            {progress.completed && <span className="widget-done">Nice. Come back to the review deck in a day.</span>}
          </div>

          <nav className="pager" aria-label="Chapters">
            {prev && <Link to={`/chapter/${prev.id}`} className="prev"><small>Previous</small><strong>{prev.title}</strong></Link>}
            {next && <Link to={`/chapter/${next.id}`} className="next"><small>Next</small><strong>{next.title}</strong></Link>}
          </nav>
        </article>
        {openId && <div className="side-slot" aria-hidden="true" />}
      </div>
      <SidePanel items={items} openId={openId} onGo={setOpenId} onClose={closeSide} scope={scope} layout={layout} />
      <Pill />
      </div>
      </ChapterMetaProvider>
    </NarrationProvider>
  );
}

// Reads this chapter, then opens the next one of the course and keeps reading, until the course ends or the reader stops it.
function HandsFree({ nextId }: { nextId?: string }) {
  const ctrl = useNarration();
  const total = useNarrState().total;
  const on = useHandsFree();
  const navigate = useNavigate();
  const began = useRef(false);
  useWakeLock(on);
  useEffect(() => {
    if (!ctrl || !on) return;
    ctrl.onEnd = () => (nextId ? navigate(`/chapter/${nextId}`) : setHandsFree(false));
    return () => { ctrl.onEnd = null; };
  }, [ctrl, on, nextId, navigate]);
  // Units arrive after mount, so a chapter opened while Hands-free is on starts here.
  useEffect(() => {
    if (!ctrl || !on || total === 0 || began.current) return;
    began.current = true;
    ctrl.playFrom(HEAD_KEY);
  }, [ctrl, on, total]);
  const tap = () => {
    if (on) { setHandsFree(false); ctrl?.stop(); return; }
    unlockSpeech();
    setHandsFree(true);
    began.current = true;
    ctrl?.playFrom(HEAD_KEY);
  };
  return <button type="button" className="btn ghost" onClick={tap}>{on ? "Stop" : "Hands-free"}</button>;
}
