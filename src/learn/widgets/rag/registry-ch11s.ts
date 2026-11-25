import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "c11s-store-recommender": lazy(() => import("./C11sStoreRecommender")),
  "c11s-switch-signals": lazy(() => import("./C11sSwitchSignals")),
  "c11s-framework-cost": lazy(() => import("./C11sFrameworkCost")),
};

export default registry;
