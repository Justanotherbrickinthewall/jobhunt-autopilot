import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents03-state-reducer": lazy(() => import("./Agents03StateReducer")),
  "agents03-triage-router": lazy(() => import("./Agents03TriageRouter")),
};
export default registry;
