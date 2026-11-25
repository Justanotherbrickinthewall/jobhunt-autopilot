import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "cloud06-gate-grades": lazy(() => import("./Cloud06GateGrades")),
  "cloud06-pipeline-failures": lazy(() => import("./Cloud06PipelineFailures")),
};
export default registry;
