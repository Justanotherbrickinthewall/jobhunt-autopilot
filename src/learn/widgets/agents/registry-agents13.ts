import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents13-count-calls": lazy(() => import("./Agents13CountCalls")),
  "agents13-spot-the-break": lazy(() => import("./Agents13SpotTheBreak")),
};
export default registry;
