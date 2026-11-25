import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents17-brief-writer": lazy(() => import("./Agents17BriefWriter")),
  "agents17-count-calls": lazy(() => import("./Agents17CountCalls")),
  "agents17-pick-shape": lazy(() => import("./Agents17PickShape")),
};
export default registry;
