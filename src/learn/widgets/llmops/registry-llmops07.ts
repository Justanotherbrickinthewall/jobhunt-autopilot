import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "llmops07-change-point": lazy(() => import("./Llmops07ChangePoint")),
  "llmops07-incident-drill": lazy(() => import("./Llmops07IncidentDrill")),
  "llmops07-stack-budget": lazy(() => import("./Llmops07StackBudget")),
};
export default registry;
