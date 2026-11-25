import { Suspense, useEffect } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell.tsx";
import Home from "./pages/Home.tsx";
import CoursePage from "./pages/Course.tsx";
import ChapterPage from "./pages/Chapter.tsx";
import ReviewPage from "./pages/Review.tsx";
import { go } from "../components/nav.ts";

// Learn has no Notebook page of its own. The bookmarks live in the hunt board's Notebook tab.
function ToNotebook() {
  useEffect(() => { go("/notebook", { replace: true }); }, []);
  return null;
}

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Home />} />
          <Route path="course/:courseId" element={<CoursePage />} />
          <Route path="chapter/:chapterId" element={<ChapterPage />} />
          <Route path="review" element={<ReviewPage />} />
          {import.meta.env.VITE_PHONE !== "1" && <Route path="notebook/*" element={<ToNotebook />} />}
          <Route path="*" element={<div className="lrn-empty">Nothing here. <Link to="/">Back to Learn</Link></div>} />
        </Route>
      </Routes>
    </Suspense>
  );
}
