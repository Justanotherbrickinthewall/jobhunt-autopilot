import { Outlet, useLocation } from "react-router-dom";
import "../../styles/list-detail.css";  // the list pane and row styles; the phone build does not load it otherwise
import { useEffect, useLayoutEffect } from "react";
import { allQuizzes } from "../content/courses.ts";
import { getChapterProgress } from "../engine/progress.ts";
import { dueIds } from "../engine/review.ts";
import { useDeck } from "../engine/useDeck.ts";
import { useStorageVersion } from "../engine/storage.ts";

export function useDueCount(): number {
  useStorageVersion();
  const deck = useDeck();
  const opened = allQuizzes.filter((q) => getChapterProgress(q.chapterId).opened).map((q) => q.id);
  return dueIds(opened, deck).length;
}

// Over 900px .learn is the scroll container, because the hunt board keeps the window fixed. Under 900px the window scrolls and .learn grows with its content.
export function learnScroller(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".learn");
}

// Whichever of the two scrolls, both go to the top. The other one has nothing to scroll, so this is a no-op there.
export function scrollLearnTop(): void {
  learnScroller()?.scrollTo(0, 0);
  window.scrollTo(0, 0);
}

export function Shell() {
  const { pathname } = useLocation();
  // Every route change starts at the top, chapters included. A chapter link with a #b- anchor scrolls to it afterwards, from Chapter's own hash effect.
  useLayoutEffect(() => { scrollLearnTop(); }, [pathname]);
  return (
    <div className="lrn-app">
      <main className="lrn-main"><Outlet /></main>
    </div>
  );
}
