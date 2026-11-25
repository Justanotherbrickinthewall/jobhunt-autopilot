import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents11-loop-referee": lazy(() => import("./Agents11LoopReferee")),
  "agents11-budget-dial": lazy(() => import("./Agents11BudgetDial")),
};
export default registry;
