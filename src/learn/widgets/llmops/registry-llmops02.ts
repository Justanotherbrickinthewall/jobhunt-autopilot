import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "llmops02-leak-walk": lazy(() => import("./Llmops02LeakWalk")),
  "llmops02-redact-judge": lazy(() => import("./Llmops02RedactJudge")),
};

export default registry;
