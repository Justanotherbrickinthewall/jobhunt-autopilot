import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "llm-thinking-dial": lazy(() => import("./C07ThinkingDial")),
  "llm-reason-or-not": lazy(() => import("./C07ReasonOrNot")),
};
export default registry;
