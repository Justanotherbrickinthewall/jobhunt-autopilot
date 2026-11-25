import { createContext, useContext, type ReactNode } from "react";
import { getCourse } from "../content/courses.ts";
import type { Block, Chapter } from "../content/types.ts";
import { BookmarkButton } from "../../reading/Bookmark.tsx";
import type { Source } from "../../reading/bookmarks.ts";

const ChapterCtx = createContext<Chapter | null>(null);
export const ChapterMetaProvider = ChapterCtx.Provider;
// The side panel repeats a block whose marker already holds the anchor id, so the copy in the panel drops it.
export const InPanel = createContext(false);

export const anchorId = (sectionId: string, blockIndex: number) => `b-${sectionId}-${blockIndex}`;

// The hunt board's Notebook keeps one {kind, crumb, link} shape. The link opens the block in Learn.
export function blockSource(chapter: Chapter, sectionId: string, blockIndex: number): Source {
  const course = getCourse(chapter.course)?.title ?? chapter.course;
  return { kind: "learn", crumb: `${course} > ${chapter.title}`, link: `/learn/chapter/${chapter.id}#${anchorId(sectionId, blockIndex)}` };
}

/** Plain-text snapshot of a block with the ** and backtick markers kept. */
export function blockText(b: Block): string {
  const fence = (lang: string, code: string) => "```" + lang + "\n" + code + "\n```";
  switch (b.kind) {
    case "p": return b.text;
    case "list": return b.items.map((x) => `- ${x}`).join("\n");
    case "callout": return `**${b.title}**\n${b.text}`;
    case "code": return [b.caption, fence(b.lang, b.code)].filter(Boolean).join("\n");
    case "fold": return `**${b.title}**\n${b.text}`;
    case "step": return [`**${b.title}**`, b.text, b.code ? fence(b.lang ?? "", b.code) : ""].filter(Boolean).join("\n");
    case "compare": return [b.caption, `| ${b.columns.join(" | ")} |`, ...b.rows.map((r) => `| ${r.join(" | ")} |`)].filter(Boolean).join("\n");
    case "quiz": return `**${b.question}**\nAnswer: ${b.options[b.answer]}\n${b.explain}`;
    default: return "";
  }
}

/** Wraps a block: adds the deep-link anchor id and the bookmark icon on its right edge. */
export function Bookmarkable({
  sectionId, index, kind, text, wide, what, children,
}: { sectionId: string; index: number; kind: Block["kind"]; text: string; wide?: boolean; what?: string; children: ReactNode }) {
  const chapter = useContext(ChapterCtx);
  const inPanel = useContext(InPanel);
  return (
    <div className={`bm-host ${wide ? "wide" : ""}`} id={inPanel ? undefined : anchorId(sectionId, index)}>
      {children}
      {import.meta.env.VITE_PHONE !== "1" && chapter && text && <BookmarkButton source={blockSource(chapter, sectionId, index)} text={text} what={what} />}
    </div>
  );
}

/** A bookmark icon for one list item or a revealed quiz explanation. Its parent must be a `.bm-host`. */
export function ItemBookmark({ sectionId, index, kind, text, what }: { sectionId: string; index: number; kind: Block["kind"]; text: string; what?: string }) {
  const chapter = useContext(ChapterCtx);
  if (import.meta.env.VITE_PHONE === "1" || !chapter || !text) return null;
  return <BookmarkButton source={blockSource(chapter, sectionId, index)} text={text} what={what} />;
}

type QLike = { id?: string; question: string; category?: string };

export function interviewSource(q: QLike, kind: "interview" | "grade"): Source {
  const courseId = q.id ? q.id.replace(/-q\d+$/, "") : "";
  const course = getCourse(courseId)?.title ?? courseId;
  const what = kind === "interview" ? "Interview bank" : "Graded answer";
  return { kind: "learn", crumb: [what, course, q.category ?? "Follow-up question"].filter(Boolean).join(" > "), link: q.id ? `/learn/interview?q=${q.id}` : "/learn/interview" };
}

export function InterviewBookmark({ q, kind, text, what }: { q: QLike; kind: "interview" | "grade"; text: string; what: string }) {
  if (import.meta.env.VITE_PHONE === "1") return null;
  return <BookmarkButton source={interviewSource(q, kind)} text={text} what={what} />;
}
