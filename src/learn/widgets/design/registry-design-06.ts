import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "design-batch-cost": lazy(() => import("./C06BatchCost")),
  "design-restart-plan": lazy(() => import("./C06RestartPlan")),
};

export default registry;
