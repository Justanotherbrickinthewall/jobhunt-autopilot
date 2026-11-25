import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents06-loop-spotter": lazy(() => import("./Agents06LoopSpotter")),
  "agents06-budget-check": lazy(() => import("./Agents06BudgetCheck")),
  "agents06-limit-race": lazy(() => import("./Agents06LimitRace")),
};
export default registry;
