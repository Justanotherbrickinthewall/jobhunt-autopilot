import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents08-summary-cut": lazy(() => import("./Agents08SummaryCut")),
  "agents08-trim-window": lazy(() => import("./Agents08TrimWindow")),
  "agents08-note-recall": lazy(() => import("./Agents08NoteRecall")),
};
export default registry;
