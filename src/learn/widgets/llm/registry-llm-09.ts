import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "llm-batch-or-live": lazy(() => import("./C09BatchOrLive")),
  "llm-stream-parser": lazy(() => import("./C09StreamParser")),
};
export default registry;
