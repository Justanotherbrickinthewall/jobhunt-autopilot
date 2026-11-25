import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "cloud05-retry-clock": lazy(() => import("./Cloud05RetryClock")),
  "cloud05-slot-budget": lazy(() => import("./Cloud05SlotBudget")),
  "cloud05-region-fit": lazy(() => import("./Cloud05RegionFit")),
};

export default registry;
