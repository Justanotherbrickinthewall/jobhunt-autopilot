import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents24-model-sees": lazy(() => import("./Agents24ModelSees")),
  "agents24-rebalance": lazy(() => import("./Agents24Rebalance")),
};
export default registry;
