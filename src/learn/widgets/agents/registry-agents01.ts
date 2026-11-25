import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents01-loop-stepper": lazy(() => import("./Agents01LoopStepper")),
  "agents01-workflow-or-agent": lazy(() => import("./Agents01WorkflowOrAgent")),
};
export default registry;
