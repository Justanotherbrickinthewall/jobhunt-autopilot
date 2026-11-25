import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents18-supervisor-or-handoff": lazy(() => import("./Agents18SupervisorOrHandoff")),
  "agents18-state-stepper": lazy(() => import("./Agents18StateStepper")),
  "agents18-guard-judge": lazy(() => import("./Agents18GuardJudge")),
};
export default registry;
