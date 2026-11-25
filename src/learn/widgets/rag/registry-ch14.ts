import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "c14-eval-gate": lazy(() => import("./C14EvalGate")),
  "c14-trace-waterfall": lazy(() => import("./C14TraceWaterfall")),
};
export default registry;
