import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "fde-craft-data-triage": lazy(() => import("./C08DataTriage")),
  "fde-craft-timebox-planner": lazy(() => import("./C08TimeboxPlanner")),
};
export default registry;
