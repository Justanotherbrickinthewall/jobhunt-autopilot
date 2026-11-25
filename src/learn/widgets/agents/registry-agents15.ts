import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents15-latency-cost": lazy(() => import("./Agents15LatencyCost")),
  "agents15-safe-to-split": lazy(() => import("./Agents15SafeToSplit")),
};
export default registry;
